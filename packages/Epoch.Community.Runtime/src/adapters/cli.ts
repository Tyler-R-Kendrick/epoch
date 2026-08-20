import { EpochCommandError, type EpochCommandReceipt } from "../receipts";
import type { CommunityRuntime } from "../runtime";
import { isDynamicUiManifest } from "../ui";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * CLI adapter.
 *
 * The CLI is a formatter, not a second implementation. Every invocation becomes
 * one command request and prints the receipt the runtime returned, so
 * `epoch ui merge --json` and the merge button in the browser can be compared
 * field by field — same commandId, same event ids, same policy decision.
 *
 * `--confirm` is the CLI's user interaction. Without it a consequential command
 * comes back as `confirm` and changes nothing, which is the same answer an agent
 * gets from WebMCP.
 */
export interface CommunityCliResult {
  readonly ok: boolean;
  readonly output: string;
  readonly receipt?: EpochCommandReceipt;
}

export const communityRuntimeUsage = [
  "Usage:",
  "  epoch ui status",
  "  epoch ui verify",
  "  epoch ui views",
  "  epoch ui log [VIEW]",
  "  epoch ui show VIEW REVISION",
  "  epoch ui propose VIEW --manifest JSON [--prompt TEXT] [--model ID] [--retain-prompt]",
  "  epoch ui preview [VIEW]",
  "  epoch ui diff FROM [--into VIEW]",
  "  epoch ui validate VIEW",
  "  epoch ui merge FROM [--into VIEW] --confirm",
  "  epoch ui rollback VIEW --revision N --confirm",
  "  epoch ui restore --confirm",
  "  epoch ui safe-mode on|off [--confirm]",
  "  epoch ui export [--out FILE]",
  "  epoch ui import FILE --confirm",
  "  epoch view create NAME [--from VIEW] [--scope personal|project|session]",
  "  epoch view list",
  "  epoch view switch VIEW",
  "",
  "Add --json to print the command receipt verbatim.",
].join("\n");

export async function executeCommunityRuntimeCommand(
  runtime: CommunityRuntime,
  argv: readonly string[],
): Promise<CommunityCliResult> {
  const json = argv.includes("--json");
  const confirmed = argv.includes("--confirm");
  const args = argv.filter((argument) => argument !== "--json" && argument !== "--confirm");

  try {
    const request = parse(args, runtime);
    const receipt = await runtime.commands.execute({ ...request, source: "cli", confirmed });
    return {
      ok: receipt.policy.decision === "allow",
      output: json ? JSON.stringify(receipt) : format(receipt),
      receipt,
    };
  } catch (error) {
    if (error instanceof EpochCommandError) return { ok: false, output: `${error.code}: ${error.message}` };
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

export function isCommunityRuntimeInvocation(argv: readonly string[]): boolean {
  const group = argv[0];
  return group === "ui" || group === "view";
}

interface ParsedRequest {
  readonly kind: string;
  readonly input: Readonly<Record<string, DictionaryValue>>;
}

function parse(args: readonly string[], runtime: CommunityRuntime): ParsedRequest {
  const [group, command, ...rest] = args;
  if (group === "view") return parseViewGroup(command, rest);
  if (group !== "ui") throw new EpochCommandError("invalid-command", communityRuntimeUsage);

  switch (command) {
    case "status":
      return { kind: "workspace.status", input: {} };
    case "verify":
      return { kind: "workspace.verify", input: {} };
    case "views":
      return { kind: "view.list", input: {} };
    case "log":
      return { kind: "history.list", input: positionalString(rest, 0, "view") };
    case "show":
      return {
        kind: "change.show",
        input: {
          view: requirePositional(rest, 0, "VIEW"),
          revision: Number(requirePositional(rest, 1, "REVISION")),
        },
      };
    case "preview":
      return { kind: "ui.getManifest", input: positionalString(rest, 0, "view") };
    case "diff":
      return {
        kind: "ui.semanticDiff",
        input: { from: requirePositional(rest, 0, "FROM"), ...optionValue(rest, "into", "into") },
      };
    case "validate":
      return { kind: "ui.validate", input: { view: requirePositional(rest, 0, "VIEW") } };
    case "propose":
      return parsePropose(rest, runtime);
    case "merge":
      return {
        kind: "change.merge",
        input: { from: requirePositional(rest, 0, "FROM"), ...optionValue(rest, "into", "into") },
      };
    case "rollback":
      return {
        kind: "change.revert",
        input: {
          view: requirePositional(rest, 0, "VIEW"),
          revision: Number(requireOption(rest, "revision")),
        },
      };
    case "restore":
      return { kind: "ui.restoreLastKnownGood", input: {} };
    case "export":
      return { kind: "workspace.export", input: {} };
    case "import":
      return {
        kind: "workspace.import",
        // SAFETY: readBundle JSON is validated during workspace import.
        input: { bundle: readBundle(requirePositional(rest, 0, "FILE")) as DictionaryValue },
      };
    case "safe-mode":
      return {
        kind: requirePositional(rest, 0, "on|off") === "on" ? "ui.enterSafeMode" : "ui.leaveSafeMode",
        input: {},
      };
    default:
      throw new EpochCommandError("invalid-command", communityRuntimeUsage);
  }
}

function parseViewGroup(command: string | undefined, rest: readonly string[]): ParsedRequest {
  switch (command) {
    case "create":
      return {
        kind: "view.create",
        input: {
          name: requirePositional(rest, 0, "NAME"),
          ...optionValue(rest, "from", "from"),
          ...optionValue(rest, "scope", "scope"),
        },
      };
    case "list":
      return { kind: "view.list", input: {} };
    case "switch":
      return { kind: "view.switch", input: { view: requirePositional(rest, 0, "VIEW") } };
    default:
      throw new EpochCommandError("invalid-command", communityRuntimeUsage);
  }
}

function parsePropose(rest: readonly string[], runtime: CommunityRuntime): ParsedRequest {
  const view = requirePositional(rest, 0, "VIEW");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const manifest = JSON.parse(requireOption(rest, "manifest")) as BoundaryValue;
  if (!isDynamicUiManifest(manifest)) {
    throw new EpochCommandError("invalid-input", "--manifest must be a dynamic UI manifest for harness ABI "
      + `${runtime.harness.abiVersion}: { abiVersion, scope, placements, theme }.`);
  }

  return {
    kind: "ui.propose",
    input: {
      view,
      // SAFETY: isDynamicUiManifest validates the manifest before this request is built.
      manifest: JSON.parse(JSON.stringify(manifest)) as DictionaryValue,
      ...optionValue(rest, "prompt", "prompt"),
      ...optionValue(rest, "model", "model"),
      ...(rest.includes("--retain-prompt") && { retainPrompt: true }),
    },
  };
}

/**
 * Read a bundle from disk.
 *
 * Injected rather than imported so the adapter stays browser-safe: the CLI host
 * supplies the reader, and nothing in this package reaches for `node:fs`.
 */
let bundleReader: ((path: string) => BoundaryValue) | undefined;

export function setCliBundleReader(reader: (path: string) => BoundaryValue): void {
  bundleReader = reader;
}

function readBundle(path: string): BoundaryValue {
  if (bundleReader === undefined) {
    throw new EpochCommandError("invalid-input", "This host cannot read bundle files.");
  }

  return bundleReader(path);
}

function format(receipt: EpochCommandReceipt): string {
  const lines = [
    `${receipt.kind}\t${receipt.commandId}\t${receipt.policy.decision}`,
  ];

  if (receipt.policy.decision === "confirm") {
    lines.push(`confirmation required — re-run with --confirm (${receipt.policy.reason ?? ""})`);
  } else if (receipt.policy.decision === "deny") {
    lines.push(`refused — ${receipt.policy.reason ?? "policy denied this command"}`);
  }

  if (receipt.baseRef !== undefined) lines.push(`base\t${receipt.baseRef}`);
  if (receipt.proposalRef !== undefined) lines.push(`proposal\t${receipt.proposalRef}`);
  if (receipt.eventIds.length > 0) lines.push(`events\t${receipt.eventIds.join(",")}`);
  if (receipt.validation.state !== "skipped") {
    lines.push(`validation\t${receipt.validation.state}${receipt.validation.errors.length === 0 ? "" : `\t${receipt.validation.errors.join("; ")}`}`);
  }

  lines.push(JSON.stringify(receipt.data));
  return lines.join("\n");
}

function requirePositional(args: readonly string[], index: number, label: string): string {
  const value = args.filter((argument) => !argument.startsWith("--"))[index];
  if (value === undefined) throw new EpochCommandError("invalid-input", `Missing ${label}.`);
  return value;
}

function positionalString(args: readonly string[], index: number, key: string): Readonly<Record<string, DictionaryValue>> {
  const value = args.filter((argument) => !argument.startsWith("--"))[index];
  return value === undefined ? {} : { [key]: value };
}

function requireOption(args: readonly string[], name: string): string {
  const value = readOption(args, name);
  if (value === undefined) throw new EpochCommandError("invalid-input", `Missing required option --${name}.`);
  return value;
}

function optionValue(args: readonly string[], name: string, key: string): Readonly<Record<string, DictionaryValue>> {
  const value = readOption(args, name);
  return value === undefined ? {} : { [key]: value };
}

function readOption(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new EpochCommandError("invalid-input", `Option --${name} requires a value.`);
  }

  return value;
}
