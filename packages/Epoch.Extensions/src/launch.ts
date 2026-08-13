import type { ExternalInvocation } from "./dispatch";

/**
 * Verified launch and the platform execution contract (ADR-0040).
 *
 * Two gaps sit between "this digest was consented to" and "this process
 * started": the file can change between the check and the exec, and Windows
 * discovers `.cmd`/`.bat` extensions that Node then refuses to spawn.
 *
 * Both are answered by building the launch as a value. The plan — interpreter,
 * argument vector, verification mode, refusals — is a pure function of the
 * platform, so Windows quoting is covered by the Linux CI this repository
 * actually runs, and only the final `spawnSync` is platform-dependent.
 */

/** The slot the verified descriptor occupies in the child's file table. */
export const LAUNCH_DESCRIPTOR_SLOT = 3;

/**
 * How closely the bytes that run match the bytes that were digested.
 *
 * `descriptor` means by construction: the file was opened once, hashed through
 * that descriptor, and executed through the same descriptor. `path` means by
 * timing: the digest was re-read immediately before the exec, which narrows the
 * window to the syscall boundary without closing it.
 */
export type LaunchVerification = "descriptor" | "path";

export interface LaunchOptions {
  /** `process.platform`, injected so the contract is testable off-platform. */
  readonly platform: string;
  /** True when the host managed to open and hash the executable by descriptor. */
  readonly descriptorAvailable?: boolean;
  readonly descriptorSlot?: number;
}

export type LaunchPlan =
  | {
    readonly kind: "launch";
    readonly executable: string;
    readonly args: readonly string[];
    readonly verification: LaunchVerification;
    /** Set when the executable path names a descriptor the child must inherit. */
    readonly descriptorSlot?: number;
    /** `cmd.exe` is handed one pre-quoted command line, not an argv. */
    readonly verbatimArguments?: boolean;
    readonly via?: "cmd";
  }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * The path through which a platform can name an open file descriptor.
 *
 * Windows has no equivalent, which is why its launches stay path-verified and
 * say so rather than claiming a guarantee they do not have.
 */
export function descriptorPath(platform: string, slot: number = LAUNCH_DESCRIPTOR_SLOT): string | undefined {
  if (platform === "linux" || platform === "android") return `/proc/self/fd/${slot}`;
  if (platform === "darwin" || platform === "freebsd" || platform === "openbsd" || platform === "netbsd") {
    return `/dev/fd/${slot}`;
  }
  return undefined;
}

/** What `epoch ext show` reports for this platform, before any launch happens. */
export function launchVerificationFor(platform: string): LaunchVerification {
  return descriptorPath(platform) === undefined ? "path" : "descriptor";
}

function isBatchFile(executable: string): boolean {
  const lower = executable.toLowerCase();
  return lower.endsWith(".cmd") || lower.endsWith(".bat");
}

/**
 * Arguments a batch file cannot be given safely, whatever the quoting.
 *
 * `%` is expanded while the batch file is parsed, after every escaping
 * mechanism available to the caller has been consumed; `!` is expanded the same
 * way when delayed expansion is on, which a machine-wide registry setting can
 * enable without this process knowing. Newlines and NUL end the command line
 * outright. There is no sequence that reliably passes any of them through, so
 * each is refused by name instead of quoted and hoped for.
 */
function batchRefusal(argument: string): string | undefined {
  if (argument.includes("%")) return "'%' is expanded by the batch parser and cannot be escaped";
  if (argument.includes("!")) return "'!' is expanded when delayed expansion is enabled and cannot be escaped";
  if (/[\n\r]/u.test(argument)) return "a line break would end the command line";
  if (argument.includes("\0")) return "a NUL would truncate the command line";
  return undefined;
}

/**
 * Quote one token for `cmd.exe /d /s /c`.
 *
 * Every token is quoted unconditionally, including ones that need no quoting.
 * Inside quotes CMD treats `&`, `|`, `<`, `>`, `(`, and `)` as ordinary
 * characters, so blanket quoting removes the escaping question rather than
 * answering it per character — and the two characters quotes do *not* protect
 * are refused above rather than escaped here.
 */
function quoteForCmd(token: string): string {
  return `"${token.replaceAll("\"", "\"\"")}"`;
}

/**
 * Build the launch for a trusted external subcommand.
 *
 * Returns a refusal rather than a best effort: an argument that cannot be
 * passed through faithfully is a wrong invocation, and running a wrong
 * invocation is worse than declining to run one.
 */
export function planLaunch(invocation: ExternalInvocation, options: LaunchOptions): LaunchPlan {
  const slot = options.descriptorSlot ?? LAUNCH_DESCRIPTOR_SLOT;

  if (options.platform === "win32" && isBatchFile(invocation.executable)) {
    for (const argument of invocation.args) {
      const refusal = batchRefusal(argument);
      if (refusal !== undefined) {
        return { kind: "refused", reason: `cannot pass argument '${argument}' to a batch extension: ${refusal}` };
      }
    }
    // `/d` skips AutoRun so a machine-wide command cannot run first, and `/s`
    // fixes CMD's outer-quote rule so the quoting below is the one it applies.
    const line = [invocation.executable, ...invocation.args].map(quoteForCmd).join(" ");
    return {
      kind: "launch",
      executable: "cmd.exe",
      args: ["/d", "/s", "/c", `"${line}"`],
      verification: "path",
      verbatimArguments: true,
      via: "cmd",
    };
  }

  const path = options.descriptorAvailable === true ? descriptorPath(options.platform, slot) : undefined;
  if (path !== undefined) {
    return {
      kind: "launch",
      executable: path,
      args: [...invocation.args],
      verification: "descriptor",
      descriptorSlot: slot,
    };
  }

  return {
    kind: "launch",
    executable: invocation.executable,
    args: [...invocation.args],
    verification: "path",
  };
}
