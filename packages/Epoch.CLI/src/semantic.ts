import { readFileSync } from "node:fs";
import {
  applySemanticPatch,
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

function providerFor(path: string): SyntaxProvider {
  const provider = selectBuiltinProvider({ path });
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
