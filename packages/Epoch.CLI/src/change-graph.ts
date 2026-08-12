import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  assertRevisionId,
  createCanonicalId,
  evaluateRevset,
  parseRevset,
  type CanonicalIdKind,
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

interface RecordValue { readonly id: string; readonly kind: string; readonly revision: number; readonly createdAt: number; readonly updatedAt: number; readonly data: Readonly<Record<string, unknown>> }
interface Operation { readonly operationId: string; readonly command: string; readonly targetId?: string; readonly timestamp: number; readonly restores?: string }
interface ChangeGraphCommandState { readonly schemaVersion: 1; readonly sequence: number; readonly records: Readonly<Record<string, RecordValue>>; readonly operations: readonly Operation[] }

export interface ChangeGraphCommandDependencies {
  readonly random?: RandomSource;
  readonly revisionId?: () => RevisionId;
}

const initialState = (): ChangeGraphCommandState => ({ schemaVersion: 1, sequence: 0, records: {}, operations: [] });
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

function statePath(root: string): string { return join(resolve(root), ".epoch", "change-graph-v1.json"); }
function readState(root: string): ChangeGraphCommandState {
  const path = statePath(root);
  if (!existsSync(path)) return initialState();
  const value = JSON.parse(readFileSync(path, "utf8")) as Partial<ChangeGraphCommandState>;
  if (value.schemaVersion !== 1 || !Number.isSafeInteger(value.sequence) || typeof value.records !== "object" || !Array.isArray(value.operations)) {
    throw commandError("invalid-input", "change graph command state is malformed");
  }
  return value as ChangeGraphCommandState;
}
function writeState(root: string, state: ChangeGraphCommandState): void {
  const path = statePath(root); mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`; writeFileSync(temporary, `${stable(state)}\n`, "utf8"); renameSync(temporary, path);
}
const recordIdKinds: Readonly<Record<string, CanonicalIdKind>> = Object.freeze({
  change: "change", graph: "change-graph", split: "operation", bundle: "review-bundle",
  "merge-plan": "merge-plan", conflict: "conflict", workspace: "workspace",
});

function canonicalRecordId(kind: string, dependencies: ChangeGraphCommandDependencies): string {
  const canonicalKind = recordIdKinds[kind];
  if (canonicalKind === undefined) throw commandError("invalid-input", `record kind has no canonical ID contract: ${kind}`);
  return createCanonicalId(canonicalKind, dependencies.random);
}

function exactRevisionId(dependencies: ChangeGraphCommandDependencies): RevisionId {
  if (dependencies.revisionId !== undefined) return assertRevisionId(dependencies.revisionId());
  const token = createCanonicalId("operation", dependencies.random).split(":")[2]!;
  return assertRevisionId(`event-${token}`);
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

function revisionNodes(records: readonly RecordValue[]): readonly RevsetNode[] {
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

function createRecord(state: ChangeGraphCommandState, kind: string, data: Readonly<Record<string, unknown>>, now: number, dependencies: ChangeGraphCommandDependencies): [ChangeGraphCommandState, RecordValue] {
  const sequence = state.sequence + 1;
  const recordId = kind === "revision" || kind === "review" ? exactRevisionId(dependencies) : canonicalRecordId(kind, dependencies);
  if (state.records[recordId] !== undefined) throw commandError("conflict", `record ID already exists: ${recordId}`);
  const record = Object.freeze({ id: recordId, kind, revision: 1, createdAt: now, updatedAt: now, data: structuredClone(data) });
  return [{ ...state, sequence, records: { ...state.records, [recordId]: record } }, record];
}
function updateRecord(state: ChangeGraphCommandState, recordId: string, data: Readonly<Record<string, unknown>>, now: number, expected?: number): [ChangeGraphCommandState, RecordValue] {
  const current = state.records[recordId]; if (!current) throw commandError("not-found", `record not found: ${recordId}`);
  if (expected !== undefined && current.revision !== expected) throw commandError("stale-revision", "record revision changed", { expected, actual: current.revision });
  const record = Object.freeze({ ...current, revision: current.revision + 1, updatedAt: now, data: { ...current.data, ...structuredClone(data) } });
  return [{ ...state, sequence: state.sequence + 1, records: { ...state.records, [recordId]: record } }, record];
}
function recordOperation(state: ChangeGraphCommandState, command: string, now: number, dependencies: ChangeGraphCommandDependencies, targetId?: string, restores?: string): ChangeGraphCommandState {
  const operationId = createCanonicalId("operation", dependencies.random);
  if (state.operations.some((operation) => operation.operationId === operationId)) throw commandError("conflict", `operation ID already exists: ${operationId}`);
  return { ...state, sequence: state.sequence + 1, operations: [...state.operations,
    { operationId, command, timestamp: now, ...(targetId ? { targetId } : {}), ...(restores ? { restores } : {}) }] };
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
  let state = readState(root); const parsed = parse(args); const action = parsed.positionals[0];
  const persist = <T>(next: ChangeGraphCommandState, value: T): T => { writeState(root, next); return value; };
  const create = (kind: string, data: Record<string, unknown>) => { const [next, value] = createRecord(state, kind, data, now, dependencies); return persist(recordOperation(next, command, now, dependencies, value.id), value); };
  const update = (recordId: string, data: Record<string, unknown>) => { const expected = stringOption(parsed, "expected-revision"); const [next, value] = updateRecord(state, recordId, data, now, expected ? Number(expected) : undefined); return persist(recordOperation(next, command, now, dependencies, value.id), value); };
  const get = (recordId: string, kind?: string) => { const value = state.records[recordId]; if (!value || kind && value.kind !== kind) throw commandError("not-found", `record not found: ${recordId}`); return value; };
  const list = (kind?: string) => Object.values(state.records).filter((value) => kind === undefined || value.kind === kind).sort((a, b) => a.id.localeCompare(b.id));

  if (command === "new") return create("revision", { parentRevisionIds: parsed.positionals, message: stringOption(parsed, "message") ?? "" });
  if (command === "log") {
    const revisions = list("revision"); const expression = stringOption(parsed, "revisions") ?? "heads()";
    try {
      const selected = new Set(evaluateRevset(parseRevset(expression), revisionNodes(revisions)));
      return { revisions: revisions.filter((revision) => selected.has(revision.id)), expression };
    } catch (error) {
      throw commandError("invalid-input", error instanceof Error ? error.message : "invalid revset", { expression });
    }
  }
  if (command === "change") {
    if (action === "create") return create("change", { title: required(parsed.positionals[1], "title"), parentRevisionIds: parsed.positionals.slice(2) });
    if (action === "revise") return update(required(parsed.positionals[1], "change ID"), { parentRevisionIds: parsed.positionals.slice(2), message: stringOption(parsed, "message") ?? "" });
    if (action === "show") return get(required(parsed.positionals[1], "change ID"), "change");
    if (action === "diff") return { from: get(required(parsed.positionals[1], "from change"), "change"), to: get(required(parsed.positionals[2], "to change"), "change") };
  }
  if (command === "op") {
    if (action === "log") return [...state.operations].sort((a, b) => a.operationId.localeCompare(b.operationId));
    if (action === "undo" || action === "restore") {
      const target = required(parsed.positionals[1], "operation ID");
      if (!state.operations.some((operation) => operation.operationId === target)) throw commandError("not-found", `operation not found: ${target}`);
      state = recordOperation(state, action, now, dependencies, undefined, target); writeState(root, state); return state.operations.at(-1);
    }
  }
  if (command === "graph") {
    if (action === "create") return create("graph", { name: required(parsed.positionals[1], "change graph name"), memberRevisionIds: parsed.positionals.slice(2) });
    if (action === "show") return get(required(parsed.positionals[1], "change graph ID"), "graph");
    if (["add", "remove", "order", "restack", "submit"].includes(action ?? "")) return update(required(parsed.positionals[1], "change graph ID"), { action, memberRevisionIds: parsed.positionals.slice(2) });
  }
  if (command === "split") {
    if (action === "propose") return create("split", { sourceRevisionId: required(parsed.positionals[1], "source revision"), plan: jsonOption(parsed, "plan"), status: "proposed" });
    if (action === "inspect") return get(required(parsed.positionals[1], "split ID"), "split");
    if (action === "accept" || action === "reject") return update(required(parsed.positionals[1], "split ID"), { status: action });
  }
  if (command === "bundle") {
    if (action === "create") return create("bundle", { name: required(parsed.positionals[1], "review bundle name"), selectedRevisionIds: parsed.positionals.slice(2) });
    if (action === "show" || action === "materialize") return get(required(parsed.positionals[1], "review bundle ID"), "bundle");
  }
  if (command === "review" && action === "record") return create("review", { targetId: required(parsed.positionals[1], "review target"), state: stringOption(parsed, "state") ?? "comment", body: stringOption(parsed, "body") ?? "" });
  if (command === "merge-plan") {
    if (action === "plan") return create("merge-plan", { targetRevisionId: required(parsed.positionals[1], "target revision"), selectedRevisionIds: parsed.positionals.slice(2), mergeMode: stringOption(parsed, "mode") ?? "change-graph-squash", status: "planned" });
    if (action === "inspect") return get(required(parsed.positionals[1], "merge plan ID"), "merge-plan");
    if (action === "apply") return update(required(parsed.positionals[1], "merge plan ID"), { status: "applied" });
  }
  if (command === "conflict") {
    if (action === "list") return list("conflict");
    if (action === "show") return get(required(parsed.positionals[1], "conflict ID"), "conflict");
    if (action === "resolve") return update(required(parsed.positionals[1], "conflict ID"), { status: "accepted", resolution: jsonOption(parsed, "resolution") });
    if (action === "propose-ai") throw commandError("unsupported-capability", "no AI conflict-resolution adapter is configured",
      { capability: "ai-conflict-resolution" });
    if (action === "accept" || action === "reject") return update(required(parsed.positionals[1], "conflict ID"), { status: action === "accept" ? "accepted" : "rejected" });
  }
  if (command === "workspace") {
    if (action === "create") return create("workspace", { name: required(parsed.positionals[1], "workspace name"), provider: stringOption(parsed, "provider") ?? "filesystem", path: stringOption(parsed, "path") ?? "" });
    if (action === "list") return list("workspace");
    if (action === "inspect") return get(required(parsed.positionals[1], "workspace ID"), "workspace");
    if (action === "capture") return update(required(parsed.positionals[1], "workspace ID"), { capturedAt: now });
    if (action === "remove") return update(required(parsed.positionals[1], "workspace ID"), { removed: true });
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
    if (action === "capabilities") throw commandError("unsupported-capability", "no forge codec adapter is configured",
      { capability: "forge-codec", adapters: [] });
    if (action === "import" || action === "export") throw commandError("unsupported-capability", "no forge adapter is configured",
      { capability: `forge-${action}` });
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
      const expected = required(parsed.positionals[1], "SWHID"); const type = gitObjectType(parsed.positionals[2]);
      const path = required(parsed.positionals[3], "object path");
      try {
        parseSwhid(expected);
        const actual = swhidForGitObject(swhKindForGitType(type), type, readFileSync(path));
        return { matches: actual === expected, expected, actual, type, path };
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
