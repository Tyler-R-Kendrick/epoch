import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CapabilityRegistry, type ProviderModuleReader } from "@epoch/extensions";
import {
  applySemanticPatch,
  BUILTIN_SYNTAX_PROVIDERS,
  formatSemanticPatch,
  planCompressionAcross,
  selectBuiltinProvider,
  semanticDiff,
  semanticMerge,
  type SyntaxProvider,
} from "@epoch/semantic";
import { CliText } from "./domain";
import { trustedExtensionProviders } from "./extensions";

/**
 * `epoch semantic <diff|apply|merge|plan>` (ADR-0038).
 *
 * These are native capabilities rather than extensions because they change
 * repository content and evidence (ADR-0039). Grammar-backed providers still
 * arrive as extensions and displace the builtins through the registry.
 */

export interface SemanticCliIO {
  stdout: { write(message: string): unknown };
  stderr: { write(message: string): unknown };
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * The registry of `syntax` providers available to the CLI.
 *
 * Builtins register here rather than being consulted directly, so a
 * grammar-backed provider supplied by a trusted extension can displace one by
 * registering against the same capability (ADR-0037).
 */
export function createSyntaxRegistry(
  extensionProviders: readonly SyntaxProvider[] = [],
): CapabilityRegistry {
  const registry = new CapabilityRegistry();
  for (const provider of BUILTIN_SYNTAX_PROVIDERS) {
    registry.register({
      id: provider.id,
      capability: "syntax",
      version: "0.1.0",
      source: "builtin",
      determinism: "deterministic",
      match: { language: provider.language },
      value: provider,
    });
  }
  for (const provider of extensionProviders) {
    registry.register({
      id: provider.id,
      capability: "syntax",
      version: "0.1.0",
      source: "extension",
      determinism: "deterministic",
      match: { language: provider.language },
      value: provider,
    });
  }
  return registry;
}

/**
 * Resolve the provider for a path, or nothing.
 *
 * `undefined` is a real answer for a lockfile or an image, and planning treats
 * it as one. Commands that must parse a specific file use `providerFor`, which
 * turns the same absence into an error.
 */
function resolveProvider(path: string, registry: CapabilityRegistry): SyntaxProvider | undefined {
  // Builtin selection resolves the language from the path; the registry then
  // decides which provider owns that language, so an extension can win.
  const builtin = selectBuiltinProvider({ path });
  if (builtin === undefined) return undefined;
  const resolved = registry.resolve<SyntaxProvider>("syntax", {
    language: builtin.language,
    path,
    forSignedState: true,
  });
  return resolved?.value ?? builtin;
}

function providerFor(path: string, registry: CapabilityRegistry = createSyntaxRegistry()): SyntaxProvider {
  const provider = resolveProvider(path, registry);
  if (provider === undefined) {
    throw new Error(`no syntax provider matches '${path}'; semantic operations need a matching provider`);
  }
  return provider;
}

function jsonRequested(args: readonly string[]): boolean {
  return args.includes("--json");
}

function positionals(args: readonly string[]): readonly string[] {
  return args.filter((argument) => !argument.startsWith("--"));
}

/**
 * Reading provider modules from disk.
 *
 * Its own value so the loader can be exercised without a filesystem, and so the
 * digest used to admit a module is computed here, over the same bytes that are
 * instantiated — not read from a second stat of the path.
 */
export const nodeProviderModuleReader: ProviderModuleReader = {
  readModule: (path) => {
    try {
      return new Uint8Array(readFileSync(path));
    } catch {
      return undefined;
    }
  },
  digest: (bytes) => createHash("sha256").update(bytes).digest("hex"),
  resolve: (directory, name) => join(directory, name),
};

/**
 * The registry for a repository, including providers trusted extensions ship.
 *
 * This is what makes ADR-0037's claim that an extension can displace a builtin
 * true rather than merely designed: a WASM `syntax` provider whose module
 * matches the digest its manifest binds is registered alongside the builtins
 * and ranked by the same rules. Anything that fails to load is reported, since
 * a provider that silently does not load produces a different diff on one
 * machine than another.
 */
export function repositorySyntaxRegistry(
  root: string,
  io?: SemanticCliIO,
): CapabilityRegistry {
  const loaded = trustedExtensionProviders(root, { reader: nodeProviderModuleReader });
  for (const failure of loaded.failures) {
    io?.stderr.write(`warning: provider ${failure.module} from '${failure.extension}' was not loaded: ${failure.reason}\n`);
  }
  return createSyntaxRegistry(loaded.providers.map((entry) => entry.provider));
}

/** `epoch semantic <action> ...`. */
export function runSemanticCommand(args: readonly string[], io: SemanticCliIO, root = "."): void {
  const action = args[0];
  const rest = args.slice(1);
  const files = positionals(rest);
  const json = jsonRequested(rest);

  if (action === "diff") {
    if (files.length !== 2) throw new Error(CliText.semanticUsage);
    const provider = providerFor(files[1], repositorySyntaxRegistry(root, io));
    const patch = semanticDiff(
      provider.parse(readText(files[0])),
      provider.parse(readText(files[1])),
      { path: files[1] },
    );
    io.stdout.write(`${json ? JSON.stringify(patch, null, 2) : formatSemanticPatch(patch)}\n`);
    return;
  }

  if (action === "apply") {
    if (files.length !== 2) throw new Error(CliText.semanticUsage);
    const provider = providerFor(files[0], repositorySyntaxRegistry(root, io));
    const patch = JSON.parse(readText(files[1])) as ReturnType<typeof semanticDiff>;
    io.stdout.write(applySemanticPatch(readText(files[0]), patch, provider));
    return;
  }

  if (action === "merge") {
    if (files.length !== 3) throw new Error(CliText.semanticUsage);
    const provider = providerFor(files[0], repositorySyntaxRegistry(root, io));
    const result = semanticMerge(
      readText(files[0]),
      readText(files[1]),
      readText(files[2]),
      provider,
      { path: files[0] },
    );
    if (json) {
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      io.stdout.write(result.merged);
      for (const conflict of result.conflicts) {
        // Conflicts name a construct, not a line range, so they stay
        // meaningful after the file is reformatted (ADR-0031, ADR-0038).
        io.stderr.write(`conflict ${conflict.kind} at ${conflict.path} signature=${conflict.signature}\n`);
      }
    }
    if (!result.clean) throw new Error(`semantic merge left ${result.conflicts.length} conflict(s) unresolved`);
    return;
  }

  if (action === "plan") {
    if (files.length === 0) throw new Error(CliText.semanticUsage);
    // Mixed input is the normal case: real repositories hold TypeScript, JSON,
    // TOML, and Markdown in every directory, and subtree dedup and dictionary
    // derivation both improve with corpus size — so the old single-language
    // restriction suppressed the effect the command exists to measure
    // (ADR-0043). Each group is still parsed only by the provider that
    // understands it.
    const registry = repositorySyntaxRegistry(root, io);
    const plan = planCompressionAcross(
      files.map((path) => ({ path, text: readText(path) })),
      (source) => resolveProvider(source.path, registry),
    );
    if (json) {
      io.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      return;
    }
    const lines = plan.groups.map((group) =>
      `provider ${group.providerId}  files ${group.files}  chunks ${group.chunks}  saved ${group.dedup.savedBytes}`);
    for (const source of plan.unplanned) {
      // Reported rather than dropped: a storage estimate that quietly ignores
      // the lockfile is the estimate that misleads someone.
      lines.push(`unplanned ${source.path}  (${source.reason})`);
    }
    lines.push(
      `dictionary ${plan.dictionary.entries.length} entries digest ${plan.dictionary.digest}`
      + ` (derived across all ${files.length} files)`,
      `plain ${plan.plainBytes} bytes  after subtree dedup ${plan.plannedBytes} bytes`
      + ` (saved ${plan.plainBytes - plan.plannedBytes})`,
    );
    io.stdout.write(`${lines.join("\n")}\n`);
    return;
  }

  throw new Error(CliText.semanticUsage);
}
