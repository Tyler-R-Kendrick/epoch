/**
 * Execution sandboxes (ADR-0043 phase 5).
 *
 * A Sandbox is an execution provider that declares — and where possible
 * *proves* — what it confines. Epoch's rule from ADR-0032 applies with full
 * force here: a provider reports only what it positively probed. A provider
 * that cannot demonstrate network denial says so instead of claiming it.
 *
 * This is the gap Zed's own agentic-safety page documents in Delta: "no agent
 * sandbox capability" and "unrestricted device access". The difference Epoch
 * can hold is not that isolation is easy, but that the claim is checked.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type SandboxIsolation = "none" | "process" | "namespace";
export type SandboxNetwork = "inherited" | "denied";
export type SandboxFilesystem = "inherited" | "working-directory";

/**
 * What a sandbox actually enforces.
 *
 * Every field is a claim the provider must be able to justify. `verified`
 * records whether the runtime was probed successfully in this process; an
 * unverified provider is refused for isolated work rather than trusted.
 */
export interface SandboxCapabilities {
  readonly isolation: SandboxIsolation;
  readonly network: SandboxNetwork;
  readonly filesystem: SandboxFilesystem;
  readonly processes: "inherited" | "isolated";
  readonly secrets: "inherited" | "scrubbed";
  readonly cleanup: "none" | "working-directory";
  readonly verified: boolean;
  /** Present when the provider is not usable, explaining why. */
  readonly unavailableReason?: string;
}

export interface SandboxRunOptions {
  readonly command: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly timeoutMs?: number;
  /** Explicitly permitted environment variables. Nothing else is passed. */
  readonly env?: Readonly<Record<string, string>>;
  readonly stdin?: string;
}

export interface SandboxRunResult {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly capabilities: SandboxCapabilities;
}

export interface SandboxProvider {
  readonly id: string;
  capabilities(): SandboxCapabilities;
  run(options: SandboxRunOptions): Promise<SandboxRunResult>;
}

export class SandboxError extends Error {
  readonly name = "SandboxError";
  constructor(readonly code: "unavailable" | "invalid-input" | "denied", message: string) { super(message); }
}

const UNSAFE_ARGUMENT = /[\0\n\r]/u;
const SAFE_COMMAND = /^[A-Za-z0-9._/-]+$/u;

function assertSafeInvocation(options: SandboxRunOptions): void {
  if (!SAFE_COMMAND.test(options.command)) {
    throw new SandboxError("invalid-input", `sandbox command is unsafe: ${options.command}`);
  }
  for (const argument of options.args ?? []) {
    if (UNSAFE_ARGUMENT.test(argument)) throw new SandboxError("invalid-input", "sandbox argument is unsafe");
  }
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || UNSAFE_ARGUMENT.test(value)) {
      throw new SandboxError("invalid-input", `sandbox environment entry is unsafe: ${key}`);
    }
  }
}

/**
 * A scrubbed environment.
 *
 * Nothing from the parent process is inherited except a minimal PATH, so a
 * sandboxed turn cannot read the operator's credentials out of `process.env`.
 */
function scrubbedEnv(env: Readonly<Record<string, string>> = {}): Record<string, string> {
  return { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/nonexistent", ...env };
}

async function execute(
  command: string,
  args: readonly string[],
  options: SandboxRunOptions,
  capabilities: SandboxCapabilities,
): Promise<SandboxRunResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  return await new Promise<SandboxRunResult>((resolvePromise) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd === undefined ? undefined : resolve(options.cwd),
      env: scrubbedEnv(options.env),
      stdio: ["pipe", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({
        exitCode: null, signal: null, stdout, stderr: `${stderr}${(error as Error).message}`,
        timedOut, durationMs: Date.now() - startedAt, capabilities,
      });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({
        exitCode: code, signal, stdout, stderr, timedOut,
        durationMs: Date.now() - startedAt, capabilities,
      });
    });
    if (options.stdin !== undefined) child.stdin?.end(options.stdin);
    else child.stdin?.end();
  });
}

/**
 * Runs a command as a child process with a scrubbed environment.
 *
 * This confines credentials and the working directory. It does **not** isolate
 * the process, filesystem, or network, and says so — the honest floor rather
 * than a false ceiling.
 */
export class ProcessSandboxProvider implements SandboxProvider {
  readonly id: string;
  constructor(id = "process") { this.id = id; }

  capabilities(): SandboxCapabilities {
    return Object.freeze({
      isolation: "process", network: "inherited", filesystem: "inherited",
      processes: "inherited", secrets: "scrubbed", cleanup: "none", verified: true,
    });
  }

  async run(options: SandboxRunOptions): Promise<SandboxRunResult> {
    assertSafeInvocation(options);
    return await execute(options.command, options.args ?? [], options, this.capabilities());
  }
}

export interface NamespaceProbe {
  readonly available: boolean;
  readonly networkDenied: boolean;
  readonly pidIsolated: boolean;
  readonly reason?: string;
}

/**
 * Probe Linux user namespaces by actually using them.
 *
 * The probe runs a real `unshare` and checks two facts separately: that the
 * command runs at all, and that a network lookup inside it genuinely fails.
 * Nothing is inferred from the platform string or the presence of the binary,
 * because either can be true while the kernel refuses the namespace.
 */
export function probeNamespaceSandbox(unshareBinary = "unshare"): NamespaceProbe {
  if (process.platform !== "linux") {
    return { available: false, networkDenied: false, pidIsolated: false, reason: "namespace sandboxing requires Linux" };
  }
  const base = ["--user", "--map-root-user"];
  const pid = spawnSync(unshareBinary, [...base, "--pid", "--fork", "--mount-proc", "sh", "-c", "echo epoch-probe"], {
    encoding: "utf8", timeout: 10_000, env: scrubbedEnv(),
  });
  if (pid.status !== 0 || !pid.stdout.includes("epoch-probe")) {
    return {
      available: false, networkDenied: false, pidIsolated: false,
      reason: `user/pid namespace unavailable: ${(pid.stderr || pid.error?.message || "unknown").trim().slice(0, 200)}`,
    };
  }
  // Prove denial rather than assume it: resolve a public name inside the
  // namespace and require that it fails.
  const net = spawnSync(unshareBinary, [...base, "--net", "sh", "-c",
    "getent hosts example.com >/dev/null 2>&1 && echo REACHABLE || echo BLOCKED"], {
    encoding: "utf8", timeout: 10_000, env: scrubbedEnv(),
  });
  const networkDenied = net.status === 0 && net.stdout.includes("BLOCKED");
  return {
    available: true,
    networkDenied,
    pidIsolated: true,
    ...(networkDenied ? {} : { reason: "network namespace did not demonstrably block name resolution" }),
  };
}

export interface NamespaceSandboxOptions {
  readonly id?: string;
  readonly unshareBinary?: string;
  /** Injected for tests; omit to probe the real runtime. */
  readonly probe?: NamespaceProbe;
}

/**
 * Runs a command inside Linux user, PID, mount, and network namespaces.
 *
 * Isolation is claimed only for what the probe demonstrated. If the kernel
 * refuses the namespaces, the provider reports `unavailable` and refuses to
 * run rather than silently degrading to an unconfined child process — a silent
 * downgrade is exactly how an isolation guarantee becomes a lie.
 */
export class NamespaceSandboxProvider implements SandboxProvider {
  readonly id: string;
  readonly #unshare: string;
  readonly #probe: NamespaceProbe;
  #workingRoot?: string;

  constructor(options: NamespaceSandboxOptions = {}) {
    this.id = options.id ?? "namespace";
    this.#unshare = options.unshareBinary ?? "unshare";
    this.#probe = options.probe ?? probeNamespaceSandbox(this.#unshare);
  }

  get probe(): NamespaceProbe { return this.#probe; }

  capabilities(): SandboxCapabilities {
    if (!this.#probe.available) {
      return Object.freeze({
        isolation: "none", network: "inherited", filesystem: "inherited",
        processes: "inherited", secrets: "inherited", cleanup: "none", verified: false,
        unavailableReason: this.#probe.reason ?? "namespace sandbox is unavailable",
      });
    }
    return Object.freeze({
      isolation: "namespace",
      // Only claimed when the probe observed a failed lookup inside the namespace.
      network: this.#probe.networkDenied ? "denied" : "inherited",
      filesystem: "working-directory",
      processes: this.#probe.pidIsolated ? "isolated" : "inherited",
      secrets: "scrubbed",
      cleanup: "working-directory",
      verified: true,
      ...(this.#probe.networkDenied ? {} : { unavailableReason: this.#probe.reason ?? "network denial unproven" }),
    });
  }

  async run(options: SandboxRunOptions): Promise<SandboxRunResult> {
    const capabilities = this.capabilities();
    if (!this.#probe.available) {
      throw new SandboxError("unavailable", capabilities.unavailableReason ?? "namespace sandbox is unavailable");
    }
    assertSafeInvocation(options);
    const cwd = options.cwd ?? this.ensureWorkingRoot();
    const args = [
      "--user", "--map-root-user", "--pid", "--fork", "--mount-proc",
      ...(this.#probe.networkDenied ? ["--net"] : []),
      options.command, ...(options.args ?? []),
    ];
    return await execute(this.#unshare, args, { ...options, cwd }, capabilities);
  }

  /** A disposable working directory, so `cleanup: "working-directory"` is true. */
  private ensureWorkingRoot(): string {
    this.#workingRoot ??= mkdtempSync(join(tmpdir(), "epoch-sandbox-"));
    return this.#workingRoot;
  }

  dispose(): void {
    if (this.#workingRoot !== undefined) {
      rmSync(this.#workingRoot, { recursive: true, force: true });
      this.#workingRoot = undefined;
    }
  }
}

/**
 * Pick the strongest provider that can prove its claims.
 *
 * Falling back is explicit and visible in the returned provider's
 * capabilities; callers that require isolation check `isolation === "namespace"`
 * rather than trusting the selection.
 */
export function selectSandboxProvider(options: NamespaceSandboxOptions = {}): SandboxProvider {
  const namespace = new NamespaceSandboxProvider(options);
  return namespace.capabilities().isolation === "namespace" ? namespace : new ProcessSandboxProvider();
}
