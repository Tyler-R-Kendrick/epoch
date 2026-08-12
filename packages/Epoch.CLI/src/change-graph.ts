import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SignedChangeGraphStore } from "@epoch/core";
import { decodeF3Archive, encodeF3Archive, FORGE_CAPABILITIES } from "@epoch/forge";
import {
  createCanonicalId,
  evaluateRevset,
  parseRevset,
  type RandomSource,
  type RevisionId,
  type RevsetNode,
} from "@epoch/protocol";
import { parseSwhid, swhidForGitObject, swhKindForGitType } from "@epoch/software-heritage";

export type ChangeGraphCommandErrorCode =
  | "invalid-command" | "invalid-input" | "not-found" | "stale-revision"
  | "auth-denied" | "unsupported-capability" | "conflict" | "external-error";

export interface ChangeGraphCommandEnvelope {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly command: string;
  readonly code: "ok" | ChangeGraphCommandErrorCode;
  readonly data?: unknown;
  readonly error?: { readonly message: string; readonly details?: Readonly<Record<string, unknown>> };
}

export interface ChangeGraphCommandDependencies {
  readonly random?: RandomSource;
  readonly revisionId?: () => RevisionId;
}

const CHANGE_GRAPH_COMMANDS = new Set(["new", "change", "log", "op", "graph", "split", "bundle", "merge-plan",
  "conflict", "workspace", "clone", "fetch", "backfill", "mirror", "principal", "agent", "forge",
  "swhid", "archive", "interop"]);

export function isChangeGraphCommand(command: string | undefined): boolean { return command !== undefined && CHANGE_GRAPH_COMMANDS.has(command); }
export function isChangeGraphInvocation(command: string | undefined, args: readonly string[]): boolean {
  return isChangeGraphCommand(command) || command === "review" && args[0] === "record" ||
    command === "hydrate" && args.some((argument) => argument === "--filter" || argument.startsWith("--filter="));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function commandError(code: ChangeGraphCommandErrorCode, message: string, details?: Readonly<Record<string, unknown>>): Error & { code: ChangeGraphCommandErrorCode; details?: Readonly<Record<string, unknown>> } {
  return Object.assign(new Error(message), { code, ...(details === undefined ? {} : { details }) });
}

interface Parsed { readonly positionals: readonly string[]; readonly options: Readonly<Record<string, string | boolean>> }
function parse(args: readonly string[]): Parsed {
  const positionals: string[] = []; const options: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]!;
    if (!value.startsWith("--")) { positionals.push(value); continue; }
    const separator = value.indexOf("=");
    const name = value.slice(2, separator < 0 ? undefined : separator);
    if (!name) throw commandError("invalid-input", "empty option name");
    if (separator >= 0) options[name] = value.slice(separator + 1);
    else if (args[index + 1] !== undefined && !args[index + 1]!.startsWith("--")) options[name] = args[++index]!;
    else options[name] = true;
  }
  return { positionals, options };
}
function stringOption(parsed: Parsed, name: string): string | undefined {
  const value = parsed.options[name]; return typeof value === "string" ? value : undefined;
}
function required(value: string | undefined, label: string): string { if (!value) throw commandError("invalid-input", `${label} is required`); return value; }
function jsonOption(parsed: Parsed, name: string): unknown {
  const raw = required(stringOption(parsed, name), `--${name}`);
  try { return JSON.parse(raw); } catch { throw commandError("invalid-input", `--${name} must be valid JSON`); }
}

function revisionNodes(records: readonly { readonly id: string; readonly data: Readonly<Record<string, unknown>> }[]): readonly RevsetNode[] {
  return records.map((record) => {
    const strings = (name: string): readonly string[] => Array.isArray(record.data[name])
      ? (record.data[name] as unknown[]).filter((value): value is string => typeof value === "string") : [];
    const text = (name: string): string | undefined => typeof record.data[name] === "string" ? record.data[name] as string : undefined;
    return {
      revisionId: record.id,
      parentRevisionIds: strings("parentRevisionIds"),
      ...(text("changeId") ? { changeId: text("changeId") } : {}),
      ...(text("authorId") ? { authorId: text("authorId") } : {}),
      ...(strings("changeGraphIds").length > 0 ? { changeGraphIds: strings("changeGraphIds") } : {}),
      ...(typeof record.data.conflict === "boolean" ? { conflict: record.data.conflict } : {}),
      ...(record.data.reviewState === "pending" || record.data.reviewState === "approved" || record.data.reviewState === "rejected"
        ? { reviewState: record.data.reviewState } : {}),
      ...(typeof record.data.mergeable === "boolean" ? { mergeable: record.data.mergeable } : {}),
    };
  });
}

type GitObjectType = "blob" | "tree" | "commit" | "tag";
function gitObjectType(value: string | undefined): GitObjectType {
  if (value === "blob" || value === "tree" || value === "commit" || value === "tag") return value;
  throw commandError("invalid-input", "Git object type must be blob, tree, commit, or tag");
}

export function executeChangeGraphCommand(root: string, argv: readonly string[], now = Date.now(), dependencies: ChangeGraphCommandDependencies = {}): ChangeGraphCommandEnvelope {
  const command = argv[0] ?? "";
  try {
    if (!isChangeGraphCommand(command) && command !== "review" && command !== "hydrate") {
      throw commandError("invalid-command", `unsupported change graph command: ${command || "empty"}`);
    }
    const result = execute(root, command, argv.slice(1), now, dependencies);
    return { schemaVersion: 1, ok: true, command: argv.join(" "), code: "ok", data: result };
  } catch (error) {
    const known = error as Error & { code?: ChangeGraphCommandErrorCode; details?: Readonly<Record<string, unknown>> };
    return { schemaVersion: 1, ok: false, command: argv.join(" "), code: known.code ?? "external-error",
      error: { message: known.message, ...(known.details === undefined ? {} : { details: known.details }) } };
  }
}

function execute(root: string, command: string, args: readonly string[], now: number, dependencies: ChangeGraphCommandDependencies): unknown {
  const parsed = parse(args); const action = parsed.positionals[0];
  const store = SignedChangeGraphStore.open(resolve(root), { random: dependencies.random, now });
  const expected = stringOption(parsed, "expected-revision");
  const expectRevision = (record: { readonly revision: number }): void => {
    if (expected !== undefined && record.revision !== Number(expected)) {
      throw commandError("stale-revision", "record revision changed", { expected: Number(expected), actual: record.revision });
    }
  };

  if (command === "new") return store.createRevision({ parentRevisionIds: parsed.positionals, message: stringOption(parsed, "message") ?? "" });
  if (command === "log") {
    const revisions = store.listRevisions(); const expression = stringOption(parsed, "revisions") ?? "heads()";
    try {
      const selected = new Set(evaluateRevset(parseRevset(expression), revisionNodes(revisions)));
      return { revisions: revisions.filter((revision) => selected.has(revision.id)), expression };
    } catch (error) {
      throw commandError("invalid-input", error instanceof Error ? error.message : "invalid revset", { expression });
    }
  }
  if (command === "change") {
    if (action === "create") return store.createChange({ title: required(parsed.positionals[1], "title"), parentRevisionIds: parsed.positionals.slice(2) });
    if (action === "revise") {
      const current = store.showChange(required(parsed.positionals[1], "change ID"));
      expectRevision(current);
      return store.reviseChange(current.id, { parentRevisionIds: parsed.positionals.slice(2), message: stringOption(parsed, "message") ?? "" });
    }
    if (action === "show") return store.showChange(required(parsed.positionals[1], "change ID"));
    if (action === "diff") return store.diffChanges(required(parsed.positionals[1], "from change"), required(parsed.positionals[2], "to change"));
  }
  if (command === "op") {
    if (action === "log") return store.operations();
    if (action === "undo" || action === "restore") return store.restoreOperation(required(parsed.positionals[1], "operation ID"));
  }
  if (command === "graph") {
    if (action === "create") return store.createGraph({ name: required(parsed.positionals[1], "change graph name"), memberRevisionIds: parsed.positionals.slice(2) });
    if (action === "show") return store.showGraph(required(parsed.positionals[1], "change graph ID"));
    if (["add", "remove", "order", "restack", "submit"].includes(action ?? "")) {
      return store.updateGraph(required(parsed.positionals[1], "change graph ID"), { action: action ?? "update", memberRevisionIds: parsed.positionals.slice(2) });
    }
  }
  if (command === "split") {
    if (action === "propose") {
      return store.rememberDraft("split", createCanonicalId("operation", dependencies.random), {
        sourceRevisionId: required(parsed.positionals[1], "source revision"), plan: jsonOption(parsed, "plan"), status: "proposed",
      });
    }
    if (action === "inspect") return store.readDraft("split", required(parsed.positionals[1], "split ID"));
    if (action === "accept" || action === "reject") {
      return store.updateDraft("split", required(parsed.positionals[1], "split ID"), { status: action });
    }
  }
  if (command === "bundle") {
    if (action === "create") return store.createReviewBundle({ name: required(parsed.positionals[1], "review bundle name"), selectedRevisionIds: parsed.positionals.slice(2) });
    if (action === "show" || action === "materialize") return store.showBundle(required(parsed.positionals[1], "review bundle ID"));
  }
  if (command === "review" && action === "record") {
    return store.recordReview({
      targetId: required(parsed.positionals[1], "review target"),
      state: stringOption(parsed, "state") ?? "comment",
      body: stringOption(parsed, "body") ?? "",
    });
  }
  if (command === "merge-plan") {
    if (action === "plan") {
      return store.createMergePlan({
        targetRevisionId: required(parsed.positionals[1], "target revision"),
        selectedRevisionIds: parsed.positionals.slice(2),
        mergeMode: stringOption(parsed, "mode") === "per-change-squash" ? "per-change-squash" : "change-graph-squash",
      });
    }
    if (action === "inspect") return store.showMergePlan(required(parsed.positionals[1], "merge plan ID"));
    if (action === "apply") return store.applyMergePlan(required(parsed.positionals[1], "merge plan ID"));
  }
  if (command === "conflict") {
    if (action === "list") return store.listConflicts();
    if (action === "show") return store.showConflict(required(parsed.positionals[1], "conflict ID"));
    if (action === "propose-ai") throw commandError("unsupported-capability", "no AI conflict-resolution adapter is configured",
      { capability: "ai-conflict-resolution" });
    if (action === "resolve" || action === "accept" || action === "reject") {
      throw commandError("not-found", `record not found: ${parsed.positionals[1] ?? "missing"}`);
    }
  }
  if (command === "workspace") {
    if (action === "create") {
      return store.rememberDraft("workspace", createCanonicalId("workspace", dependencies.random), {
        name: required(parsed.positionals[1], "workspace name"), provider: stringOption(parsed, "provider") ?? "filesystem", path: stringOption(parsed, "path") ?? "",
      });
    }
    if (action === "list") return store.listDrafts("workspace");
    if (action === "inspect") return store.readDraft("workspace", required(parsed.positionals[1], "workspace ID"));
    if (action === "capture") return store.updateDraft("workspace", required(parsed.positionals[1], "workspace ID"), { capturedAt: now });
    if (action === "remove") return store.updateDraft("workspace", required(parsed.positionals[1], "workspace ID"), { removed: true });
  }
  if (["clone", "fetch", "hydrate", "backfill"].includes(command)) {
    const filter = stringOption(parsed, "filter");
    if (filter) { try { JSON.parse(filter); } catch { throw commandError("invalid-input", "--filter must be valid JSON"); } }
    throw commandError("unsupported-capability", "no sync adapter is configured",
      { capability: `change-graph-${command}`, filter: filter ? JSON.parse(filter) : null });
  }
  if (command === "mirror") throw commandError("unsupported-capability", "mirror coordinator adapter is not configured",
    { capability: "forge-mirror-runtime", action: action ?? "missing", args: parsed.positionals.slice(1) });
  if (command === "principal" || command === "agent") {
    if (action === "capabilities") return { principal: parsed.positionals[1] ?? "current", capabilities: [] };
    if (action === "budget") throw commandError("unsupported-capability", "no budget adapter is configured",
      { principal: parsed.positionals[1] ?? "current", capability: "principal-budget" });
    if (action === "auth-explain") throw commandError("auth-denied", "no authority adapter is configured",
      { principal: parsed.positionals[1] ?? "current", authorized: false });
  }
  if (command === "forge") {
    if (action === "capabilities") return FORGE_CAPABILITIES;
    if (action === "export-f3" || action === "export") {
      const objects = jsonOption(parsed, "objects");
      if (!Array.isArray(objects)) throw commandError("invalid-input", "--objects must be a JSON array");
      return encodeF3Archive(objects as never);
    }
    if (action === "import-f3" || action === "import") {
      return decodeF3Archive(required(stringOption(parsed, "bytes"), "--bytes"));
    }
  }
  if (command === "swhid") {
    if (action === "inspect") {
      try { return parseSwhid(required(parsed.positionals[1], "SWHID")); }
      catch (error) { throw commandError("invalid-input", error instanceof Error ? error.message : "invalid SWHID"); }
    }
    if (action === "compute") {
      const type = gitObjectType(parsed.positionals[1]); const path = required(parsed.positionals[2], "object path");
      try { return { swhid: swhidForGitObject(swhKindForGitType(type), type, readFileSync(path)), type, path }; }
      catch (error) { throw commandError("invalid-input", error instanceof Error ? error.message : "unable to compute SWHID"); }
    }
    if (action === "verify") {
      const expectedSwhid = required(parsed.positionals[1], "SWHID"); const type = gitObjectType(parsed.positionals[2]);
      const path = required(parsed.positionals[3], "object path");
      try {
        parseSwhid(expectedSwhid);
        const actual = swhidForGitObject(swhKindForGitType(type), type, readFileSync(path));
        return { matches: actual === expectedSwhid, expected: expectedSwhid, actual, type, path };
      } catch (error) { throw commandError("invalid-input", error instanceof Error ? error.message : "unable to verify SWHID"); }
    }
  }
  if (command === "archive") throw commandError("unsupported-capability", "archive adapter is not configured", { capability: "archive" });
  if (command === "interop") throw commandError("unsupported-capability", "run through the Node interop doctor adapter", { capability: "interop-doctor" });
  throw commandError("invalid-command", `invalid ${command} action: ${action ?? "missing"}`);
}

export function formatChangeGraphCommandEnvelope(envelope: ChangeGraphCommandEnvelope, json: boolean): string {
  if (json) return stable(envelope);
  if (!envelope.ok) return `${envelope.code}: ${envelope.error?.message ?? "change graph command failed"}`;
  return stable(envelope.data);
}
