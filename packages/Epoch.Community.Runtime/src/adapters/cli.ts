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
  "  epoch live create --space SPACE [--view REF] [--visibility private|community|unlisted|public]",
  "                    [--path GLOB]... [--action ID]... [--delay MS]",
  "  epoch live show SESSION",
  "  epoch live list",
  "  epoch live preflight SESSION",
  "  epoch live consent SESSION --scope SCOPE...",
  "  epoch live lobby SESSION",
  "  epoch live start SESSION --confirm",
  "  epoch live pause SESSION",
  "  epoch live resume SESSION",
  "  epoch live end SESSION --confirm",
  "  epoch live seal SESSION [--completeness complete|semantic-only|media-missing|partial] --confirm",
  "  epoch live publish SESSION --action ID [--path PATH] [--args JSON]",
  "  epoch live status SESSION",
  "  epoch live checkpoint SESSION",
  "  epoch live join SESSION",
  "  epoch live request-grant SESSION --capability CAPABILITY",
  "  epoch live grant SESSION --principal ID --role cohost|collaborator|agent|observer --confirm",
  "  epoch live revoke SESSION --principal ID --confirm",
  "  epoch live lock SESSION on|off",
  "  epoch live bookmark SESSION --checkpoint ID",
  "  epoch live annotate SESSION --checkpoint ID --body TEXT [--path PATH]",
  "  epoch live fork SESSION --checkpoint ID",
  "  epoch live report SESSION --reason TEXT",
  "",
  "Add --json to print the command receipt verbatim.",
  "Live commands need a configured Community remote; without one they report",
  "that the deployment has no Live Space port rather than pretending to work.",
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
  return group === "ui" || group === "view" || group === "live";
}

/** One command's parsed argument dictionary. */
type ParsedInput = Readonly<Record<string, DictionaryValue>>;

interface ParsedRequest {
  readonly kind: string;
  readonly input: ParsedInput;
}

function parse(args: readonly string[], runtime: CommunityRuntime): ParsedRequest {
  const [group, command, ...rest] = args;
  if (group === "view") return parseViewGroup(command, rest);
  if (group === "live") return parseLiveGroup(command, rest);
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

/**
 * `epoch live …` is a spelling of the same commands the browser and WebMCP
 * call. It never carries provider credentials and never reaches a media
 * endpoint: `live.media.*` has no CLI spelling at all, because a terminal is
 * not where a short-lived transport credential should be printed.
 */
function parseLiveGroup(command: string | undefined, rest: readonly string[]): ParsedRequest {
  const lifecycleKind = command === undefined ? undefined : liveLifecycleKind(command);
  if (lifecycleKind !== undefined) {
    return { kind: lifecycleKind, input: { sessionId: requirePositional(rest, 0, "SESSION") } };
  }

  switch (command) {
    case "create":
      return {
        kind: "live.session.create",
        input: {
          spaceId: requireOption(rest, "space"),
          policy: {
            ...optionValue(rest, "view", "presentationViewRef"),
            ...optionValue(rest, "visibility", "visibility"),
            ...optionValue(rest, "security-mode", "securityMode"),
            allowedPathPatterns: repeatedOption(rest, "path"),
            allowedActionIds: repeatedOption(rest, "action"),
            ...numberOption(rest, "delay", "publicationDelayMs"),
          },
        },
      };
    case "show":
      return { kind: "live.session.show", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
    case "list":
      return { kind: "live.session.list", input: {} };
    case "preflight":
      return { kind: "live.session.preflight", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
    case "consent":
      return {
        kind: "live.session.consent",
        input: { sessionId: requirePositional(rest, 0, "SESSION"), scopes: repeatedOption(rest, "scope") },
      };
    case "seal":
      return {
        kind: "live.session.seal",
        input: {
          sessionId: requirePositional(rest, 0, "SESSION"),
          ...optionValue(rest, "completeness", "completeness"),
        },
      };
    case "publish":
      return {
        kind: "live.presentation.publish",
        input: {
          sessionId: requirePositional(rest, 0, "SESSION"),
          actionId: requireOption(rest, "action"),
          args: jsonOption(rest, "args"),
          ...optionValue(rest, "path", "path"),
        },
      };
    case "status":
      return { kind: "live.presentation.status", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
    case "checkpoint":
      return { kind: "live.presentation.checkpoint", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
    case "join":
      return { kind: "live.participant.join", input: { sessionId: requirePositional(rest, 0, "SESSION") } };
    case "request-grant":
      return {
        kind: "live.participant.requestGrant",
        input: { sessionId: requirePositional(rest, 0, "SESSION"), capability: requireOption(rest, "capability") },
      };
    case "grant":
      return {
        kind: "live.participant.grant",
        input: {
          sessionId: requirePositional(rest, 0, "SESSION"),
          principalId: requireOption(rest, "principal"),
          role: requireOption(rest, "role"),
        },
      };
    case "revoke":
      return {
        kind: "live.participant.revoke",
        input: { sessionId: requirePositional(rest, 0, "SESSION"), principalId: requireOption(rest, "principal") },
      };
    case "lock":
      return {
        kind: "live.participant.lockJoins",
        input: {
          sessionId: requirePositional(rest, 0, "SESSION"),
          locked: requirePositional(rest, 1, "on|off") === "on",
        },
      };
    case "bookmark":
      return {
        kind: "live.presentation.bookmark",
        input: { sessionId: requirePositional(rest, 0, "SESSION"), checkpointId: requireOption(rest, "checkpoint") },
      };
    case "annotate":
      return {
        kind: "live.presentation.annotate",
        input: {
          sessionId: requirePositional(rest, 0, "SESSION"),
          checkpointId: requireOption(rest, "checkpoint"),
          body: requireOption(rest, "body"),
          ...optionValue(rest, "path", "path"),
        },
      };
    case "fork":
      return {
        kind: "live.presentation.forkAt",
        input: { sessionId: requirePositional(rest, 0, "SESSION"), checkpointId: requireOption(rest, "checkpoint") },
      };
    case "report":
      return {
        kind: "live.moderation.report",
        input: { sessionId: requirePositional(rest, 0, "SESSION"), reason: requireOption(rest, "reason") },
      };
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

function positionalString(args: readonly string[], index: number, key: string): ParsedInput {
  const value = args.filter((argument) => !argument.startsWith("--"))[index];
  return value === undefined ? {} : { [key]: value };
}

function requireOption(args: readonly string[], name: string): string {
  const value = readOption(args, name);
  if (value === undefined) throw new EpochCommandError("invalid-input", `Missing required option --${name}.`);
  return value;
}

function optionValue(args: readonly string[], name: string, key: string): ParsedInput {
  const value = readOption(args, name);
  return value === undefined ? {} : { [key]: value };
}

/** Repeated flags accumulate, so an allow-list is built one entry at a time. */
function repeatedOption(args: readonly string[], name: string): readonly string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== `--${name}`) continue;
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new EpochCommandError("invalid-input", `Option --${name} requires a value.`);
    }
    values.push(value);
  }
  return values;
}

const LIVE_LIFECYCLE_VERBS = {
  lobby: "live.session.openLobby",
  start: "live.session.start",
  pause: "live.session.pause",
  resume: "live.session.resume",
  end: "live.session.end",
} satisfies Readonly<Record<string, string>>;

function liveLifecycleKind(verb: string): string | undefined {
  return Object.hasOwn(LIVE_LIFECYCLE_VERBS, verb) && isLifecycleVerb(verb) ? LIVE_LIFECYCLE_VERBS[verb] : undefined;
}

function isLifecycleVerb(verb: string): verb is keyof typeof LIVE_LIFECYCLE_VERBS {
  return Object.hasOwn(LIVE_LIFECYCLE_VERBS, verb);
}

/** Inference keeps the numeric evidence the parsed option actually carries. */
function numberOption(args: readonly string[], name: string, key: string) {
  const value = readOption(args, name);
  if (value === undefined) return {};
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new EpochCommandError("invalid-input", `Option --${name} must be an integer.`);
  return { [key]: parsed };
}

function jsonOption(args: readonly string[], name: string): ParsedInput {
  const value = readOption(args, name);
  if (value === undefined) return {};
  let parsed: DictionaryValue;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new EpochCommandError("invalid-input", `Option --${name} must be valid JSON.`);
  }
  if (!isJsonDictionary(parsed)) {
    throw new EpochCommandError("invalid-input", `Option --${name} must be a JSON object.`);
  }
  return parsed;
}

function isJsonDictionary(value: DictionaryValue): value is { readonly [key: string]: DictionaryValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
