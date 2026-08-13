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
  isExtensionName,
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
    // The name is written verbatim into a TOML string in the policy file, so an
    // unchecked one could close that string and open another key: `greet", "evil`
    // would allow two extensions, and one carrying a newline could append a whole
    // `trust = "any"` line. The extension-name grammar admits no quote, newline,
    // `#`, or bracket, which is what makes `renderList` safe rather than lucky.
    if (!isExtensionName(name)) {
      throw new Error(`invalid extension name '${name}'; names are lowercase letters, digits, and hyphens`);
    }
    // The decision has to change dispatch, not merely be recorded. `untrust`
    // therefore writes `block` as well as clearing `allow`: `block` wins in
    // every mode, so revocation holds under `trust = "any"` and under a signed
    // publisher, which removal from `allow` alone would not. Trust stays local
    // configuration rather than synced state, so consenting in one clone never
    // grants execution in another.
    updateTrustLists(resolve(root), name, action === "trust");
    // Recorded only once the edit has landed. `succeeded` has to mean it
    // succeeded: an editor that refuses a config shape it cannot rewrite is a
    // routine outcome, not a crash, so recording first would stamp a refusal as
    // a completed grant on every such refusal.
    const repository = new EpochRepository(resolve(root));
    repository.appendOperation(`ext-${action}`, "succeeded", { extension: name });
    io.stdout.write(`${action === "trust" ? "trusted" : "untrusted"} extension '${name}' in .epoch/config.toml\n`);
    return;
  }

  throw new Error(CliText.extUsage);
}

/** Strip a trailing `#` comment, ignoring `#` inside quoted values. */
function withoutComment(line: string): string {
  let quote: string | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote !== undefined) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "\"" || character === "'") quote = character;
    else if (character === "#") return line.slice(0, index);
  }
  return line;
}

/**
 * Classify a line as a header for the `extensions` table.
 *
 * A TOML table header is a key, and keys may be bare or quoted, so
 * `[extensions]`, `["extensions"]`, and `['extensions']` all name one table.
 * Only the bare form is rewritable here; the others are recognized precisely so
 * they can be refused rather than mistaken for an absent table.
 */
function extensionsHeaderKind(content: string): "table" | "array" | "quoted" | undefined {
  const array = /^\[\[\s*(.+?)\s*\]\]$/u.exec(content);
  const table = array === null ? /^\[\s*(.+?)\s*\]$/u.exec(content) : null;
  const raw = array?.[1] ?? table?.[1];
  if (raw === undefined) return undefined;

  const quoted = /^(?:"([^"]*)"|'([^']*)')$/u.exec(raw);
  const key = quoted === null ? raw : quoted[1] ?? quoted[2];
  if (key !== "extensions") return undefined;
  if (array !== null) return "array";
  return quoted === null ? "table" : "quoted";
}

function renderList(key: string, names: readonly string[]): string {
  return `${key} = [${names.map((name) => `"${name}"`).join(", ")}]`;
}

/** A single-line flat array of double-quoted strings, or `undefined`. */
function parseSimpleList(value: string): readonly string[] | undefined {
  const body = /^\[([^[\]]*)\]$/u.exec(value.trim())?.[1];
  if (body === undefined) return undefined;
  const entries = body.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  const names: string[] = [];
  for (const entry of entries) {
    const quoted = /^"([^"\\]*)"$/u.exec(entry);
    if (quoted === null) return undefined;
    names.push(quoted[1]);
  }
  return names;
}

class ConfigEditError extends Error {
  constructor(detail: string) {
    super(`refusing to edit .epoch/config.toml: ${detail}; edit the [extensions] table by hand`);
    this.name = "ConfigEditError";
  }
}

/**
 * Add or remove an extension in the local `[extensions]` `allow` and `block`
 * lists.
 *
 * This is a line editor, not a TOML writer, so it recognizes exactly the shape
 * it can rewrite safely — one `[extensions]` table holding single-line arrays
 * of quoted names — and refuses anything else. The alternative is worse than
 * refusing: appending a second `[extensions]` header or a duplicate key
 * corrupts the very file that decides whether an external process runs.
 */
function updateTrustLists(root: string, name: string, trusted: boolean): void {
  const configPath = join(root, ".epoch", "config.toml");
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const lines = existing.length === 0 ? [] : existing.split(/\r?\n/u);

  // A header carrying a trailing comment is still the same table. Matching on
  // the raw line would miss it and append a duplicate section.
  const headers: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const kind = extensionsHeaderKind(withoutComment(lines[index]).trim());
    if (kind === "array") {
      // TOML forbids a regular table at a path already used as an array of
      // tables, so appending `[extensions]` below this would produce a file no
      // reader accepts — and an unreadable policy is an unenforced one.
      throw new ConfigEditError("it declares [extensions] as an array of tables");
    }
    if (kind === "quoted") {
      // TOML table headers are keys, and keys may be quoted, so `["extensions"]`
      // names the same table as `[extensions]`. Appending the bare form would
      // define it twice. Epoch's own reader accepts neither, so the edit would
      // otherwise report success while changing nothing that takes effect.
      throw new ConfigEditError("it declares [extensions] with a quoted key");
    }
    if (kind === "table") headers.push(index);
  }
  if (headers.length > 1) throw new ConfigEditError("it declares [extensions] more than once");

  const persist = (): void => {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${lines.join("\n").replace(/\n*$/u, "")}\n`, "utf8");
  };

  if (headers.length === 0) {
    if (lines.length > 0 && lines[lines.length - 1].trim().length > 0) lines.push("");
    lines.push("[extensions]", renderList("allow", trusted ? [name] : []), renderList("block", trusted ? [] : [name]));
    persist();
    return;
  }

  const sectionIndex = headers[0];
  let sectionEnd = lines.length;
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    if (withoutComment(lines[index]).trim().startsWith("[")) {
      sectionEnd = index;
      break;
    }
  }

  const found = new Map<string, { readonly line: number; readonly names: readonly string[]; readonly comment: string }>();
  for (let index = sectionIndex + 1; index < sectionEnd; index += 1) {
    const code = withoutComment(lines[index]);
    const assignment = /^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/u.exec(code.trim());
    if (assignment === null) continue;
    const key = assignment[1];
    if (key !== "allow" && key !== "block") continue;
    if (found.has(key)) throw new ConfigEditError(`[extensions] declares '${key}' more than once`);
    const names = parseSimpleList(assignment[2]);
    if (names === undefined) {
      throw new ConfigEditError(`[extensions] '${key}' is not a single-line array of quoted names`);
    }
    // A trailing comment on the line is the operator's note about their own
    // policy; rewriting the array must not silently delete it. The gap before
    // it is carried too, so the line comes back looking the way it was written.
    found.set(key, { line: index, names, comment: lines[index].slice(code.replace(/\s+$/u, "").length) });
  }

  const update = (key: "allow" | "block", include: boolean): void => {
    const entry = found.get(key);
    const current = entry?.names ?? [];
    const next = include ? [...new Set([...current, name])].sort() : current.filter((value) => value !== name);
    if (entry === undefined) {
      if (!include) return;
      lines.splice(sectionIndex + 1, 0, renderList(key, next));
      for (const [otherKey, other] of found) {
        if (other.line >= sectionIndex + 1) found.set(otherKey, { ...other, line: other.line + 1 });
      }
      return;
    }
    const indent = /^\s*/u.exec(lines[entry.line])?.[0] ?? "";
    lines[entry.line] = `${indent}${renderList(key, next)}${entry.comment}`;
  };

  update("allow", trusted);
  update("block", !trusted);
  persist();
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
