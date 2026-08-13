import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { EpochRepository } from "@epoch/core";
import {
  buildExternalInvocation,
  discoverExtensions,
  readTrustPolicy,
  resolveSubcommand,
  shadowedExtensions,
  type DiscoveredExtension,
  type ExtensionFileSystem,
  type ExternalInvocation,
  type ExtensionTrustPolicy,
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

function policyFor(root: string): ExtensionTrustPolicy {
  try {
    const config = new EpochRepository(root).repositoryConfig();
    return readTrustPolicy(config.extensions as Record<string, unknown> | undefined);
  } catch {
    // A repository that cannot be read yields the closed default rather than
    // an open one.
    return readTrustPolicy(undefined);
  }
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
    // The decision has to change dispatch, not merely be recorded: writing the
    // allow list is what makes it effective. Trust stays local configuration
    // rather than a synced event, so consenting in one clone never grants
    // execution in another.
    updateAllowList(resolve(root), name, action === "trust");
    const repository = new EpochRepository(resolve(root));
    repository.appendOperation(`ext-${action}`, "succeeded", { extension: name });
    io.stdout.write(`${action === "trust" ? "trusted" : "untrusted"} extension '${name}' in .epoch/config.toml\n`);
    return;
  }

  throw new Error(CliText.extUsage);
}

const ALLOW_PATTERN = /^(\s*allow\s*=\s*)\[(.*)\]\s*$/u;

function renderAllowList(names: readonly string[]): string {
  return `allow = [${names.map((name) => `"${name}"`).join(", ")}]`;
}

/**
 * Add or remove an extension in the local `[extensions] allow` list.
 *
 * Written as a single-line array so the repository's own TOML config reader
 * can parse it back.
 */
function updateAllowList(root: string, name: string, allow: boolean): void {
  const configPath = join(root, ".epoch", "config.toml");
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const lines = existing.length === 0 ? [] : existing.split(/\r?\n/u);

  const sectionIndex = lines.findIndex((line) => line.trim() === "[extensions]");
  if (sectionIndex === -1) {
    if (lines.length > 0 && lines[lines.length - 1].trim().length > 0) lines.push("");
    lines.push("[extensions]", renderAllowList(allow ? [name] : []));
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${lines.join("\n").replace(/\n*$/u, "")}\n`, "utf8");
    return;
  }

  let allowIndex = -1;
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("[")) break;
    if (ALLOW_PATTERN.test(lines[index])) {
      allowIndex = index;
      break;
    }
  }

  const current = allowIndex === -1
    ? []
    : (ALLOW_PATTERN.exec(lines[allowIndex])?.[2] ?? "")
      .split(",")
      .map((entry) => entry.trim().replace(/^"|"$/gu, ""))
      .filter((entry) => entry.length > 0);

  const next = allow
    ? [...new Set([...current, name])].sort()
    : current.filter((entry) => entry !== name);

  if (allowIndex === -1) lines.splice(sectionIndex + 1, 0, renderAllowList(next));
  else lines[allowIndex] = renderAllowList(next);

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${lines.join("\n").replace(/\n*$/u, "")}\n`, "utf8");
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

  const invocation = buildExternalInvocation(resolution.extension, args, {
    repositoryRoot: resolve(root),
    workingDirectory: process.cwd(),
  });
  const spawn = dependencies.spawn ?? defaultSpawn;
  return { handled: true, exitCode: spawn(invocation) };
}
