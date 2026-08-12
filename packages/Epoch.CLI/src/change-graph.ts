import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EpochRepository, parseSnapshot, SignedChangeGraphStore } from "@epoch/core";
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

function isLocalEpochReplica(value: string): boolean {
  try { return new EpochRepository(resolve(value)).isInitialized(); } catch { return false; }
}

function remotesPath(root: string): string { return join(resolve(root), ".epoch", "remotes-v1.json"); }
function readRemotes(root: string): Record<string, string> {
  const path = remotesPath(root);
  if (!existsSync(path)) return {};
  const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
function writeRemote(root: string, name: string, url: string): void {
  const remotes = { ...readRemotes(root), [name]: url };
  mkdirSync(join(resolve(root), ".epoch"), { recursive: true });
  writeFileSync(remotesPath(root), `${JSON.stringify(remotes)}\n`);
}

function classifyLocator(value: string): { readonly kind: "epoch-local" | "http" | "git"; readonly url: string } {
  if (isLocalEpochReplica(value)) return { kind: "epoch-local", url: resolve(value) };
  if (/^https?:\/\//iu.test(value)) return { kind: "http", url: value };
  if (/^git@/u.test(value)) {
    const matched = /^git@([^:]+):(.+)$/u.exec(value);
    if (matched) return { kind: "git", url: `https://${matched[1]}/${matched[2]}` };
  }
  if (/^ssh:\/\//iu.test(value) || value.startsWith("file:") || value.endsWith(".git")) return { kind: "git", url: value };
  return { kind: "git", url: value };
}

async function syncFromLocator(store: SignedChangeGraphStore, locator: string): Promise<unknown> {
  const configured = readRemotes(store.repository.root)[locator];
  const resolved = classifyLocator(configured ?? locator);
  if (resolved.kind === "epoch-local") return store.syncFromLocal(resolved.url);
  if (resolved.kind === "http") {
    const snapshot = store.exportSnapshot();
    const remote = await requestJson("POST", gossipUrl(resolved.url), snapshot);
    if (remote.status < 200 || remote.status >= 300) {
      throw commandError("external-error", `gossip peer request failed (${remote.status})`, { remote: resolved.url });
    }
    const result = store.applySnapshot(parseSnapshot(remote.body));
    writeRemote(store.repository.root, locator === configured ? locator : "origin", resolved.url);
    return { ...result, remote: resolved.url };
  }
  const checkout = mkdtempSync(join(tmpdir(), "epoch-git-clone-"));
  try {
    execFileSync("git", ["clone", "--depth", "1", resolved.url, checkout], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_SSH_COMMAND: "ssh -o BatchMode=yes -o ConnectTimeout=3" },
    });
    const ingested = store.ingestGit(checkout, resolved.url);
    writeRemote(store.repository.root, locator === configured ? locator : "origin", resolved.url);
    return ingested;
  } catch (error) {
    throw commandError("external-error", error instanceof Error ? error.message : "git clone failed", { remote: resolved.url });
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}

function gossipUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/u, "");
  return trimmed.endsWith("/epoch/gossip") || trimmed.endsWith("/gossip") ? trimmed : `${trimmed}/epoch/gossip`;
}

async function requestJson(method: string, url: string, body?: unknown): Promise<{ readonly status: number; readonly body: unknown }> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined
        ? { accept: "application/json", connection: "close" }
        : { "content-type": "application/json", accept: "application/json", connection: "close" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep text */ }
    return { status: response.status, body: parsed };
  } catch (error) {
    throw commandError("external-error", error instanceof Error ? error.message : "remote request failed", { url });
  }
}

function assertPublicHttpsOrigin(origin: string): void {
  let url: URL;
  try { url = new URL(origin); } catch { throw commandError("invalid-input", "invalid archive origin"); }
  if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.)/u.test(url.hostname)) {
    throw commandError("auth-denied", "local or non-HTTPS archive origin denied");
  }
}

async function requestSoftwareHeritage(origin: string): Promise<{ readonly state: "succeeded" | "pending" | "failed"; readonly requestId: string }> {
  assertPublicHttpsOrigin(origin);
  const endpoint = process.env.EPOCH_SWH_SAVE_URL ?? "https://archive.softwareheritage.org/api/1/origin/save/";
  const response = await requestJson("POST", endpoint, { origin_url: origin });
  const body = response.body && typeof response.body === "object" ? response.body as Record<string, unknown> : {};
  const requestId = typeof body.id === "string" ? body.id : `swh-save-${shaLike(origin)}`;
  if (response.status >= 200 && response.status < 300 && body.save_task_status === "succeeded" && body.visit_status === "full") {
    return { state: "succeeded", requestId };
  }
  if (response.status < 500 && body.save_task_status === "pending") return { state: "pending", requestId };
  return { state: "failed", requestId };
}

function shaLike(value: string): string {
  return Buffer.from(value).toString("hex").slice(0, 16);
}

function interopReportSync(): unknown {
  const exec = (command: string, args: readonly string[]): string =>
    execFileSync(command, [...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
    }).trim();
  const probe = (id: string, command: string, args: readonly string[]) => {
    try { return { id, status: "supported", version: exec(command, args).split(/\r?\n/u)[0]!.slice(0, 160) }; }
    catch { return { id, status: "unsupported", reason: `${id} executable was not found` }; }
  };
  return {
    schemaVersion: 1,
    git: probe("git", "git", ["--version"]),
    optionalTools: [probe("jj", "jj", ["--version"]), probe("hg", "hg", ["--version", "--quiet"]), probe("rift", "rift", ["--version"])],
    copyOnWrite: { id: "copy-on-write", status: "supported", mode: "probe-deferred" },
    adapters: [{ id: "forge-f3", status: "supported", mode: "codec-only" }],
    swhid: { id: "swhid", status: "supported", version: "1.2" },
    credentialsRedacted: true,
  };
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

export async function executeChangeGraphCommand(root: string, argv: readonly string[], now = Date.now(), dependencies: ChangeGraphCommandDependencies = {}): Promise<ChangeGraphCommandEnvelope> {
  const command = argv[0] ?? "";
  try {
    if (!isChangeGraphCommand(command) && command !== "review" && command !== "hydrate") {
      throw commandError("invalid-command", `unsupported change graph command: ${command || "empty"}`);
    }
    const result = await execute(root, command, argv.slice(1), now, dependencies);
    return { schemaVersion: 1, ok: true, command: argv.join(" "), code: "ok", data: result };
  } catch (error) {
    const known = error as Error & { code?: ChangeGraphCommandErrorCode; details?: Readonly<Record<string, unknown>> };
    return { schemaVersion: 1, ok: false, command: argv.join(" "), code: known.code ?? "external-error",
      error: { message: known.message, ...(known.details === undefined ? {} : { details: known.details }) } };
  }
}

async function execute(root: string, command: string, args: readonly string[], now: number, dependencies: ChangeGraphCommandDependencies): Promise<unknown> {
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
    if (action === "accept") return store.acceptSplit(required(parsed.positionals[1], "split ID"));
    if (action === "reject") return store.updateDraft("split", required(parsed.positionals[1], "split ID"), { status: action });
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
    if (action === "propose-ai") return store.proposeAiConflict(parsed.positionals[1]);
    if (action === "resolve" || action === "accept") return store.decideConflict(required(parsed.positionals[1], "conflict ID"), "accepted");
    if (action === "reject") return store.decideConflict(required(parsed.positionals[1], "conflict ID"), "rejected");
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
    const parsedFilter = filter === undefined ? undefined : (() => {
      try { return JSON.parse(filter) as { readonly paths?: readonly string[] }; }
      catch { throw commandError("invalid-input", "--filter must be valid JSON"); }
    })();
    const target = parsed.positionals[0];
    if (command === "hydrate") return store.hydratePaths(parsedFilter?.paths);
    if (command === "backfill") return store.backfill();
    if (command === "clone" || command === "fetch") {
      return await syncFromLocator(store, required(target, `${command} locator`));
    }
  }
  if (command === "mirror") {
    if (action === "add") return store.addMirror({ remoteRef: required(stringOption(parsed, "remote") ?? parsed.positionals[1], "remote ref") });
    if (action === "list" || action === "status") return store.listMirrors();
    if (action === "inspect") return store.showMirror(required(parsed.positionals[1], "mirror ID"));
    if (action === "run" || action === "reconcile") return store.runMirror(required(parsed.positionals[1], "mirror ID"));
    throw commandError("invalid-command", `invalid mirror action: ${action ?? "missing"}`);
  }
  if (command === "principal" || command === "agent") {
    if (action === "capabilities") return { principal: parsed.positionals[1] ?? "current", capabilities: [] };
    if (action === "budget") {
      if (parsed.positionals[1] === "allocate") {
        return store.allocateBudget({ principal: parsed.positionals[2], units: Number(required(stringOption(parsed, "units") ?? parsed.positionals[3], "units")) });
      }
      return store.budgetStatus(parsed.positionals[1] === "status" ? parsed.positionals[2] : parsed.positionals[1]);
    }
    if (action === "auth-explain") return store.authExplain({ principal: parsed.positionals[1], action: stringOption(parsed, "action") });
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
  if (command === "archive") {
    if (action === "software-heritage" && parsed.positionals[1] === "map") {
      return store.recordHeritageMapping(required(parsed.positionals[2], "SWHID"));
    }
    if (action === "software-heritage" && parsed.positionals[1] === "request") {
      store.assertPublicArchive(stringOption(parsed, "visibility"));
      const origin = required(parsed.positionals[2], "origin");
      const result = await requestSoftwareHeritage(origin);
      return store.recordArchiveRequest({ origin, status: result.state === "succeeded" ? "succeeded" : result.state === "pending" ? "pending" : "failed", requestId: result.requestId });
    }
    if (action === "create") {
      store.assertPublicArchive("public");
      const origin = required(stringOption(parsed, "origin") ?? parsed.positionals[1], "origin");
      const result = await requestSoftwareHeritage(origin);
      return store.recordArchiveRequest({ origin, status: result.state === "succeeded" ? "succeeded" : result.state === "pending" ? "pending" : "failed", requestId: result.requestId });
    }
    throw commandError("invalid-command", `invalid archive action: ${action ?? "missing"}`);
  }
  if (command === "interop") return interopReportSync();
  throw commandError("invalid-command", `invalid ${command} action: ${action ?? "missing"}`);
}

export function formatChangeGraphCommandEnvelope(envelope: ChangeGraphCommandEnvelope, json: boolean): string {
  if (json) return stable(envelope);
  if (!envelope.ok) return `${envelope.code}: ${envelope.error?.message ?? "change graph command failed"}`;
  return stable(envelope.data);
}
