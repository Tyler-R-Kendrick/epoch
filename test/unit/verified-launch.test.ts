import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";
import { descriptorPath, launchVerificationFor, planLaunch, type ExternalInvocation } from "@epoch/extensions";
import { dispatchExternalSubcommand, runExtensionCommand } from "@epoch/cli";

/**
 * The launch contract (ADR-0040).
 *
 * The plan is a pure function of the platform precisely so the Windows half is
 * covered by the Linux CI this repository runs. A quoting routine that only
 * executes on a platform the tests never reach is a quoting routine nobody has
 * checked.
 */
export function runVerifiedLaunchTests(): void {
  descriptorExecutionIsPlatformSpecificAndSaysSo();
  batchExtensionsLaunchThroughAQuotedInterpreter();
  argumentsThatCannotSurviveAreRefused();
  aRealExtensionRunsFromTheDescriptorItWasHashedThrough();
}

function invocation(executable: string, args: readonly string[] = []): ExternalInvocation {
  return { executable, args, env: { EPOCH_EXTENSION_NAME: "greet" } };
}

function descriptorExecutionIsPlatformSpecificAndSaysSo(): void {
  assert.equal(descriptorPath("linux"), "/proc/self/fd/3");
  assert.equal(descriptorPath("darwin"), "/dev/fd/3");
  assert.equal(descriptorPath("freebsd"), "/dev/fd/3");
  assert.equal(descriptorPath("win32"), undefined);
  assert.equal(launchVerificationFor("linux"), "descriptor");
  assert.equal(launchVerificationFor("win32"), "path");

  const linux = planLaunch(invocation("/x/epoch-greet", ["a"]), { platform: "linux", descriptorAvailable: true });
  assert.deepEqual(linux, {
    kind: "launch",
    executable: "/proc/self/fd/3",
    args: ["a"],
    verification: "descriptor",
    descriptorSlot: 3,
  });

  // No descriptor, no claim: the plan falls back to the path and reports that
  // the guarantee is the weaker, timing-based one rather than pretending.
  const withoutDescriptor = planLaunch(invocation("/x/epoch-greet", ["a"]), { platform: "linux" });
  assert.equal(withoutDescriptor.kind === "launch" && withoutDescriptor.verification, "path");
  assert.equal(withoutDescriptor.kind === "launch" && withoutDescriptor.executable, "/x/epoch-greet");

  const windows = planLaunch(invocation("C:\\x\\epoch-greet.exe", ["a"]), { platform: "win32" });
  assert.equal(windows.kind === "launch" && windows.verification, "path");
  assert.equal(windows.kind === "launch" && windows.executable, "C:\\x\\epoch-greet.exe");
}

/**
 * `.cmd` shims are how most Windows CLIs present themselves, and Node refuses
 * to spawn them without a shell. Handing the line to `shell: true` instead
 * would let a path with a space or an `&` stop meaning what it says.
 */
function batchExtensionsLaunchThroughAQuotedInterpreter(): void {
  const plan = planLaunch(
    invocation("C:\\Program Files\\ext\\epoch-greet.cmd", ["a b", "x&y", "say \"hi\"", "(paren)", "a|b"]),
    { platform: "win32" },
  );
  assert.ok(plan.kind === "launch");
  assert.equal(plan.executable, "cmd.exe");
  assert.equal(plan.verbatimArguments, true);
  assert.equal(plan.verification, "path", "Windows has no descriptor exec, and the plan says so");
  assert.deepEqual(plan.args.slice(0, 3), ["/d", "/s", "/c"]);
  assert.equal(
    plan.args[3],
    '""C:\\Program Files\\ext\\epoch-greet.cmd" "a b" "x&y" "say ""hi""" "(paren)" "a|b""',
  );

  // A `.bat` is the same case, and the match is case-insensitive because
  // Windows paths are.
  const bat = planLaunch(invocation("C:\\x\\epoch-greet.BAT", []), { platform: "win32" });
  assert.equal(bat.kind === "launch" && bat.via, "cmd");

  // On a platform where a batch file is not special, it is not special.
  const posix = planLaunch(invocation("/x/epoch-greet.cmd", []), { platform: "linux" });
  assert.equal(posix.kind === "launch" && posix.executable, "/x/epoch-greet.cmd");
}

/**
 * Refusal, not best effort. `%` is expanded after every escaping mechanism the
 * caller has, so quoting it and hoping is how argument-injection bugs get
 * written.
 */
function argumentsThatCannotSurviveAreRefused(): void {
  for (const argument of ["%PATH%", "50%", "a!b", "line\nbreak", "nul\0byte"]) {
    const plan = planLaunch(invocation("C:\\x\\epoch-greet.cmd", [argument]), { platform: "win32" });
    assert.equal(plan.kind, "refused", `'${argument}' must be refused rather than quoted`);
    assert.match(plan.kind === "refused" ? plan.reason : "", /cannot pass argument/u);
  }

  // The same arguments are ordinary everywhere else: this is a CMD limitation
  // being reported, not a rule Epoch invents.
  const posix = planLaunch(invocation("/x/epoch-greet", ["%PATH%", "a!b"]), { platform: "linux" });
  assert.deepEqual(posix.kind === "launch" && posix.args, ["%PATH%", "a!b"]);
}

/**
 * End to end on this platform: a `#!` script launched through the descriptor it
 * was hashed through. The kernel resolves the interpreter from the same
 * descriptor, which is the case a naive `fexecve` substitute would break.
 */
function aRealExtensionRunsFromTheDescriptorItWasHashedThrough(): void {
  if (descriptorPath(process.platform) === undefined) return;

  const root = mkdtempSync(join(tmpdir(), "epoch-launch-"));
  try {
    new EpochRepository(root).init("alice");
    const bin = join(root, ".epoch", "ext", "bin");
    mkdirSync(bin, { recursive: true });
    const executable = join(bin, "epoch-greet");
    writeFileSync(executable, `#!/bin/sh\ntouch "$EPOCH_ROOT/ran"\nexit 7\n`, "utf8");
    chmodSync(executable, 0o755);
    writeFileSync(
      join(bin, "epoch-greet.toml"),
      [`name = "greet"`, "api = 1", `version = "1.0.0"`, `capabilities = ["command"]`].join("\n"),
      "utf8",
    );

    const io = { stdout: { write: () => true }, stderr: { write: () => true } };
    runExtensionCommand(root, ["trust", "greet"], io, { pathEntries: [] });

    const result = dispatchExternalSubcommand(root, "greet", [], io, {
      pathEntries: [],
      homeDirectory: join(root, "absent-home"),
    });
    assert.equal(result.handled, true);
    assert.equal(result.exitCode, 7, "the child's exit status is the command's exit status");
    assert.ok(existsSync(join(root, "ran")), "the script actually executed through the descriptor");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
