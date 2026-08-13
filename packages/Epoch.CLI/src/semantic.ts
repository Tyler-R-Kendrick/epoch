import { readFileSync } from "node:fs";
import { CapabilityRegistry } from "@epoch/extensions";
import {
  applySemanticPatch,
  BUILTIN_SYNTAX_PROVIDERS,
  formatSemanticPatch,
  planCompression,
  selectBuiltinProvider,
  semanticDiff,
  semanticMerge,
  type SyntaxProvider,
} from "@epoch/semantic";
import { CliText } from "./domain";

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

function providerFor(path: string, registry: CapabilityRegistry = createSyntaxRegistry()): SyntaxProvider {
  // Builtin selection resolves the language from the path; the registry then
  // decides which provider owns that language, so an extension can win.
  const builtin = selectBuiltinProvider({ path });
  if (builtin === undefined) {
    throw new Error(`no syntax provider matches '${path}'; semantic operations need a matching provider`);
  }
  const resolved = registry.resolve<SyntaxProvider>("syntax", {
    language: builtin.language,
    path,
    forSignedState: true,
  });
  return resolved?.value ?? builtin;
}

function jsonRequested(args: readonly string[]): boolean {
  return args.includes("--json");
}

function positionals(args: readonly string[]): readonly string[] {
  return args.filter((argument) => !argument.startsWith("--"));
}

/** `epoch semantic <action> ...`. */
export function runSemanticCommand(args: readonly string[], io: SemanticCliIO): void {
  const action = args[0];
  const rest = args.slice(1);
  const files = positionals(rest);
  const json = jsonRequested(rest);

  if (action === "diff") {
    if (files.length !== 2) throw new Error(CliText.semanticUsage);
    const provider = providerFor(files[1]);
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
    const provider = providerFor(files[0]);
    const patch = JSON.parse(readText(files[1])) as ReturnType<typeof semanticDiff>;
    io.stdout.write(applySemanticPatch(readText(files[0]), patch, provider));
    return;
  }

  if (action === "merge") {
    if (files.length !== 3) throw new Error(CliText.semanticUsage);
    const provider = providerFor(files[0]);
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
    const provider = providerFor(files[0]);
    // Every input is parsed with one provider, so mixed languages would parse
    // TOML as JSON and report a plan for content that was never understood.
    const mismatched = files.find((path) => providerFor(path).id !== provider.id);
    if (mismatched !== undefined) {
      throw new Error(`semantic plan needs one syntax provider; '${mismatched}' does not use ${provider.id}`);
    }
    const plan = planCompression(files.map((path) => ({ path, text: readText(path) })), provider);
    if (json) {
      io.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      return;
    }
    io.stdout.write([
      `provider ${plan.providerId}`,
      `chunks ${plan.chunks}`,
      `plain ${plan.plainBytes} bytes`,
      `after subtree dedup ${plan.plannedBytes} bytes (saved ${plan.dedup.savedBytes})`,
      `dictionary ${plan.dictionary.entries.length} entries digest ${plan.dictionary.digest}`,
    ].join("\n") + "\n");
    return;
  }

  throw new Error(CliText.semanticUsage);
}
