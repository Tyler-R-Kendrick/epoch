import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { EpochRepository } from "@epoch/core";
import {
  buildExternalInvocation,
  discoverExtensions,
  EMPTY_TRUST_STORE,
  grantTrust,
  nodeExtensionFileSystem,
  parseTrustStore,
  readTrustPolicy,
  resolveSubcommand,
  revokeTrust,
  serializeTrustStore,
  shadowedExtensions,
  withRecordedConsent,
  type DiscoveredExtension,
  type ExtensionFileSystem,
  type ExternalInvocation,
  isExtensionName,
  type ExtensionTrustPolicy,
  type TrustStore,
} from "@epoch/extensions";
import { BUILTIN_COMMANDS, CliText } from "./domain";

/**
 * CLI surface for the extension mechanism (ADR-0037).
 *
 * `epoch foo` falls through to `epoch-foo` only when the trust policy admits
 * it. Discovery without trust is reported, which is the deliberate departure
 * from Git's rule that any `git-foo` on `$PATH` simply runs.
 */

export interface ExtensionCliIO {
  stdout: { write(message: string): unknown };
  stderr: { write(message: string): unknown };
}

/** Process launch, injected so dispatch is testable without real binaries. */
export type ExtensionSpawn = (invocation: ExternalInvocation) => number;

const defaultSpawn: ExtensionSpawn = (invocation) => {
  const result = spawnSync(invocation.executable, [...invocation.args], {
    env: invocation.env,
    stdio: "inherit",
  });
  if (result.error !== undefined) throw result.error;
  return result.status ?? 1;
};

export interface ExtensionCliDependencies {
  readonly homeDirectory?: string;
  readonly pathEntries?: readonly string[];
  readonly spawn?: ExtensionSpawn;
  readonly fileSystem?: ExtensionFileSystem;
}

/** Where recorded consent lives. Machine-owned, never hand-edited. */
function trustStorePath(root: string): string {
  return join(root, ".epoch", "ext", "trust.json");
}

/** Read recorded consent, or `undefined` when the store cannot be trusted. */
function readTrustStore(root: string): TrustStore | undefined {
  const path = trustStorePath(root);
  if (!existsSync(path)) return EMPTY_TRUST_STORE;
  try {
    return parseTrustStore(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Resolve the effective policy: hand-authored configuration plus recorded
 * consent.
 *
 * Every failure path here yields the closed default rather than an open one. A
 * corrupt store in particular must not degrade to "no entries", because that
 * would silently drop its `block` list — damage to the file would widen the
 * policy instead of narrowing it.
 */
function policyFor(root: string): ExtensionTrustPolicy {
  const store = readTrustStore(root);
  if (store === undefined) return readTrustPolicy(undefined);
  try {
    const config = new EpochRepository(root).repositoryConfig();
    return withRecordedConsent(readTrustPolicy(config.extensions as Record<string, unknown> | undefined), store);
  } catch {
    // A repository whose configuration cannot be read still honours consent
    // already recorded, but adopts no hand-authored policy.
    return withRecordedConsent(readTrustPolicy(undefined), store);
  }
}

/** Replace the store atomically, so a crash cannot leave it half-written. */
function writeTrustStore(root: string, store: TrustStore): void {
  const path = trustStorePath(root);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, serializeTrustStore(store), "utf8");
  renameSync(temporary, path);
}

function discover(root: string, dependencies: ExtensionCliDependencies): readonly DiscoveredExtension[] {
  return discoverExtensions({
    repositoryRoot: resolve(root),
    homeDirectory: dependencies.homeDirectory ?? homedir(),
    pathEntries: dependencies.pathEntries,
    fileSystem: dependencies.fileSystem,
  });
}

function describe(extension: DiscoveredExtension, policy: ExtensionTrustPolicy, builtins: readonly string[]): string {
  const resolution = resolveSubcommand(extension.name, { builtins, extensions: [extension], policy });
  const state = resolution.kind === "builtin"
    ? "shadowed by builtin"
    : resolution.kind === "extension"
      ? "trusted"
      : `untrusted (${resolution.kind === "untrusted" ? resolution.trust.reason : "unknown"})`;
  const capabilities = extension.manifest?.capabilities.join(",") ?? "-";
  const version = extension.manifest?.version ?? "-";
  return `${extension.name}\t${state}\t${extension.source}\t${version}\t${capabilities}\t${extension.executable}`;
}

/** `epoch ext <list|show|trust|untrust>`. */
export function runExtensionCommand(
  root: string,
  args: readonly string[],
  io: ExtensionCliIO,
  dependencies: ExtensionCliDependencies = {},
): void {
  const action = args[0] ?? "list";
  const policy = policyFor(root);
  const extensions = discover(root, dependencies);

  if (action === "list") {
    if (extensions.length === 0) {
      io.stdout.write("no extensions discovered\n");
      return;
    }
    io.stdout.write("name\tstate\tsource\tversion\tcapabilities\texecutable\n");
    for (const extension of extensions) {
      io.stdout.write(`${describe(extension, policy, BUILTIN_COMMANDS)}\n`);
    }
    const shadowed = shadowedExtensions(BUILTIN_COMMANDS, extensions);
    for (const extension of shadowed) {
      // Reported rather than hidden: a native capability preempting an
      // extension must be visible (ADR-0039).
      io.stdout.write(`note: builtin '${extension.name}' shadows ${extension.executable}\n`);
    }
    return;
  }

  if (action === "show") {
    const name = args[1];
    if (name === undefined) throw new Error(CliText.extUsage);
    const extension = extensions.find((candidate) => candidate.name === name);
    if (extension === undefined) throw new Error(`no extension named '${name}' is installed`);
    const resolution = resolveSubcommand(name, { builtins: BUILTIN_COMMANDS, extensions, policy });
    io.stdout.write(`${JSON.stringify({
      name: extension.name,
      source: extension.source,
      executable: extension.executable,
      manifest: extension.manifest ?? null,
      manifestError: extension.manifestError ?? null,
      resolution: resolution.kind,
      trust: resolution.kind === "extension" || resolution.kind === "untrusted" ? resolution.trust : null,
    }, null, 2)}\n`);
    return;
  }

  if (action === "trust" || action === "untrust") {
    const name = args[1];
    if (name === undefined) throw new Error(CliText.extUsage);
    // The name reaches a file path and an audit record, so it is validated
    // before either. The store itself is JSON and needs no escaping, but a name
    // outside the grammar could never match a discovered extension anyway.
    if (!isExtensionName(name)) {
      throw new Error(`invalid extension name '${name}'; names are lowercase letters, digits, and hyphens`);
    }
    const absolute = resolve(root);
    const store = readTrustStore(absolute);
    if (store === undefined) {
      throw new Error(
        `refusing to edit ${trustStorePath(absolute)}: it is not a readable trust store; remove it to start over`,
      );
    }

    // Consent binds to the binary, not just the name. Trusting `greet` grants
    // *this* `epoch-greet`; a different one at the same path has not been
    // consented to and is refused until the operator says so again.
    const digest = action === "trust"
      ? discover(absolute, dependencies).find((extension) => extension.name === name)?.executableSha256
      : undefined;
    writeTrustStore(absolute, action === "trust" ? grantTrust(store, name, digest) : revokeTrust(store, name));

    // Recorded only once the write has landed. `succeeded` has to mean it
    // succeeded, or a refusal is stamped into history as a completed grant.
    new EpochRepository(absolute).appendOperation(`ext-${action}`, "succeeded", { extension: name });
    const bound = action === "trust" && digest !== undefined ? ` (${digest.slice(0, 12)}…)` : "";
    io.stdout.write(`${action === "trust" ? "trusted" : "untrusted"} extension '${name}'${bound}\n`);
    return;
  }

  throw new Error(CliText.extUsage);
}


export interface ExternalDispatchResult {
  readonly handled: boolean;
  readonly exitCode: number;
}

/**
 * Dispatch an unknown subcommand to `epoch-<name>` when policy allows.
 *
 * Returns `handled: false` for a name no extension provides, so the caller
 * still reports an unknown command rather than a confusing trust message.
 */
export function dispatchExternalSubcommand(
  root: string,
  command: string,
  args: readonly string[],
  io: ExtensionCliIO,
  dependencies: ExtensionCliDependencies = {},
): ExternalDispatchResult {
  const policy = policyFor(root);
  const extensions = discover(root, dependencies);
  const resolution = resolveSubcommand(command, { builtins: BUILTIN_COMMANDS, extensions, policy });

  if (resolution.kind === "unknown" || resolution.kind === "builtin") {
    return { handled: false, exitCode: 1 };
  }

  if (resolution.kind === "untrusted") {
    io.stderr.write(`${resolution.trust.detail}\n`);
    io.stderr.write(`extension executable: ${resolution.extension.executable}\n`);
    return { handled: true, exitCode: 1 };
  }

  // The digest that earned trust was read during discovery, and the binary is
  // launched some milliseconds later. Re-reading it here does not close that
  // window — only exec-by-descriptor would, which Node does not offer — but it
  // shrinks the race to the syscall boundary instead of the whole command, and
  // a swap that loses the race is refused rather than run.
  const digest = (dependencies.fileSystem ?? nodeExtensionFileSystem).fileDigest?.(resolution.extension.executable);
  if (digest !== resolution.extension.executableSha256) {
    io.stderr.write(`extension '${command}' changed on disk while it was being checked; refusing to run it\n`);
    return { handled: true, exitCode: 1 };
  }

  const invocation = buildExternalInvocation(resolution.extension, args, {
    repositoryRoot: resolve(root),
    workingDirectory: process.cwd(),
  });
  const spawn = dependencies.spawn ?? defaultSpawn;
  return { handled: true, exitCode: spawn(invocation) };
}
