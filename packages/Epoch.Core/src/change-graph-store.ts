import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DefaultAuthor } from "./domain";
import { EpochRepository, MemoryEpochTransport, type MemoryEpochTransportSnapshot, type SyncResult } from "./core";
import { OperationDag } from "./convergence-transactions";
import { acceptSplit } from "./convergence-changes";
import { GitMappingEventType, ingestGitToEpoch } from "./git-projection";
import type { EventPayload } from "./domain";
import { isRecord } from "./json";
import {
  assertProtocolEvent,
  assertRevisionId,
  createCanonicalId,
  describeChangePublish,
  gerritChangeIdTrailer,
  parseCanonicalId,
  type CanonicalId,
  type ChangePublishOptions,
  type RandomSource,
  type RevisionId,
} from "@epoch/protocol";
import type { ChangeFragment, ChangeGraphDefinition, ChangeRevisionBody, MergePlan, ReviewBundle } from "@epoch/protocol";

export interface ChangeGraphRecord {
  readonly id: string;
  readonly kind: string;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly data: Readonly<EventPayload>;
}

export interface SignedChangeGraphStoreOptions {
  readonly author?: string;
  readonly random?: RandomSource;
  readonly now?: number;
}

interface OperationSummary {
  readonly operationId: string;
  readonly command: string;
  readonly targetId?: string;
  readonly timestamp: number;
  readonly restores?: string;
}

type AppendBody = ChangeGraphDefinition | ChangeRevisionBody | MergePlan | ReviewBundle | EventPayload;

const emptyDigest = sha256Hex("");

export class SignedChangeGraphStore {
  readonly #repository: EpochRepository;
  readonly #operations: OperationDag;
  readonly #random: RandomSource | undefined;
  readonly #author: string;
  #now: number;
  #noteSeq = 0;
  #principalId?: CanonicalId<"principal">;
  #repositoryId?: CanonicalId<"repo">;

  private constructor(repository: EpochRepository, options: SignedChangeGraphStoreOptions) {
    this.#repository = repository;
    this.#operations = new OperationDag(repository.root);
    this.#noteSeq = this.#operations.list().length;
    this.#random = options.random;
    this.#author = options.author ?? repository.identity();
    this.#now = options.now ?? Date.now();
  }

  static open(root: string, options: SignedChangeGraphStoreOptions = {}): SignedChangeGraphStore {
    const repository = EpochRepository.openOrCreate(root, { author: options.author ?? DefaultAuthor });
    const store = new SignedChangeGraphStore(repository, options);
    store.ensureIdentity();
    return store;
  }

  get repository(): EpochRepository { return this.#repository; }

  createChange(input: { readonly title: string; readonly parentRevisionIds?: readonly string[] }): ChangeGraphRecord {
    const changeId = createCanonicalId("change", this.#random);
    if (this.#repository.events().some((event) => event.payload.changeId === changeId)) {
      throw Object.assign(new Error(`record ID already exists: ${changeId}`), { code: "conflict" as const });
    }
    const parents = this.requireExistingRevisions(input.parentRevisionIds ?? []);
    const body = this.revisionBody(changeId, parents, input.title);
    const event = this.append("change.created", body);
    this.note("change.create", [changeId, input.title, event.id]);
    return this.changeRecord(changeId, 1, {
      title: input.title,
      parentRevisionIds: body.parentRevisionIds,
      revisionId: event.id,
      message: input.title,
      changeIdTrailer: gerritChangeIdTrailer(changeId),
    });
  }

  reviseChange(changeId: string, input: { readonly message?: string; readonly parentRevisionIds?: readonly string[] } = {}): ChangeGraphRecord {
    parseCanonicalId(changeId, "change");
    const current = this.showChange(changeId);
    const prior = String(current.data.revisionId);
    const parents = this.requireExistingRevisions(input.parentRevisionIds ?? [prior]);
    const body = this.revisionBody(changeId, parents, String(input.message ?? current.data.title ?? ""), prior);
    const event = this.append("change.revised", body);
    this.note("change.revise", [changeId, event.id]);
    return this.changeRecord(changeId, current.revision + 1, {
      title: current.data.title,
      parentRevisionIds: body.parentRevisionIds,
      revisionId: event.id,
      message: input.message ?? "",
      changeIdTrailer: gerritChangeIdTrailer(changeId),
    });
  }

  showChange(changeId: string): ChangeGraphRecord {
    try { parseCanonicalId(changeId, "change"); } catch { throw missing(`record not found: ${changeId}`); }
    const events = this.#repository.events().filter((event) =>
      (event.type === "change.created" || event.type === "change.revised") && event.payload.changeId === changeId);
    if (events.length === 0) throw missing(`record not found: ${changeId}`);
    const latest = events[events.length - 1]!;
    const created = events.find((event) => event.type === "change.created") ?? latest;
    return this.changeRecord(changeId, events.length, {
      title: titleFromBody(created.payload),
      parentRevisionIds: latest.payload.parentRevisionIds,
      revisionId: latest.id,
      message: titleFromBody(latest.payload),
      changeIdTrailer: gerritChangeIdTrailer(changeId),
      ...this.publishedFields(changeId),
    });
  }

  publishChange(changeId: string, input: ChangePublishOptions = {}): ChangeGraphRecord {
    const current = this.showChange(changeId);
    const published = describeChangePublish({
      changeId,
      revisionId: String(current.data.revisionId),
      target: input.target ?? "main",
      topic: input.topic,
      hashtags: input.hashtags,
      wip: input.wip,
    });
    this.note("change.publish", [changeId, published.reviewRef, published.changeIdTrailer, published.pushSpec]);
    return this.changeRecord(changeId, current.revision, {
      ...current.data,
      ...published,
    });
  }

  diffChanges(fromId: string, toId: string) {
    return { from: this.showChange(fromId), to: this.showChange(toId) };
  }

  createRevision(input: { readonly parentRevisionIds: readonly string[]; readonly message: string }): ChangeGraphRecord {
    const created = this.createChange({ title: input.message || "revision", parentRevisionIds: input.parentRevisionIds });
    this.note("revision.create", [String(created.data.revisionId), ...input.parentRevisionIds]);
    return {
      id: String(created.data.revisionId),
      kind: "revision",
      revision: 1,
      createdAt: this.#now,
      updatedAt: this.#now,
      data: { parentRevisionIds: input.parentRevisionIds, message: input.message, changeId: created.id },
    };
  }

  listRevisions(): readonly ChangeGraphRecord[] {
    return this.#repository.events()
      .filter((event) => event.type === "change.created" || event.type === "change.revised")
      .map((event) => ({
        id: event.id,
        kind: "revision",
        revision: 1,
        createdAt: event.timestamp * 1000,
        updatedAt: event.timestamp * 1000,
        data: {
          parentRevisionIds: event.payload.parentRevisionIds,
          message: titleFromBody(event.payload),
          changeId: event.payload.changeId,
        },
      }));
  }

  createGraph(input: { readonly name: string; readonly memberRevisionIds: readonly string[] }): ChangeGraphRecord {
    const changeGraphId = createCanonicalId("change-graph", this.#random);
    const members = this.requireExistingRevisions(input.memberRevisionIds);
    const body: ChangeGraphDefinition = { changeGraphId, memberRevisionIds: members, edges: [] };
    const event = this.append("change-graph.defined", body);
    this.note("graph.create", [changeGraphId, input.name, event.id]);
    return this.namedRecord(changeGraphId, "graph", 1, { name: input.name, memberRevisionIds: members, eventId: event.id });
  }

  showGraph(graphId: string): ChangeGraphRecord {
    try { parseCanonicalId(graphId, "change-graph"); } catch { throw missing(`record not found: ${graphId}`); }
    const event = [...this.#repository.events()].reverse().find((item) =>
      (item.type === "change-graph.defined" || item.type === "change-graph.revised") && item.payload.changeGraphId === graphId);
    if (event === undefined) throw missing(`record not found: ${graphId}`);
    const name = this.namedValue(graphId, "graph.create") ?? graphId;
    return this.namedRecord(graphId, "graph", 1, { name, memberRevisionIds: event.payload.memberRevisionIds, eventId: event.id });
  }

  updateGraph(graphId: string, input: { readonly action: string; readonly memberRevisionIds: readonly string[] }): ChangeGraphRecord {
    const current = this.showGraph(graphId);
    const members = input.memberRevisionIds.length > 0
      ? this.requireExistingRevisions(input.memberRevisionIds)
      : this.requireExistingRevisions(stringArray(current.data.memberRevisionIds));
    const body: ChangeGraphDefinition = {
      // SAFETY: showGraph above validates graphId as a canonical change-graph ID.
      changeGraphId: graphId as ChangeGraphDefinition["changeGraphId"],
      memberRevisionIds: members,
      edges: [],
    };
    const event = this.append("change-graph.revised", body);
    this.note(`graph.${input.action}`, [graphId, event.id]);
    return this.namedRecord(graphId, "graph", current.revision + 1, { name: current.data.name, memberRevisionIds: members, action: input.action, eventId: event.id });
  }

  createReviewBundle(input: { readonly name: string; readonly selectedRevisionIds: readonly string[] }): ChangeGraphRecord {
    const reviewBundleId = createCanonicalId("review-bundle", this.#random);
    const selected = this.requireExistingRevisions(input.selectedRevisionIds);
    if (selected.length === 0) throw Object.assign(new Error("review bundle requires at least one existing revision"), { code: "invalid-input" as const });
    const digest = this.revisionSetDigest(selected);
    const body: ReviewBundle = {
      reviewBundleId,
      selectedRevisionIds: selected,
      baseFrontier: [selected[0]!],
      baseTreeDigest: digest,
      combinedTreeDigest: digest,
      overlaps: [],
      conflictIds: [],
      gateDefinitionDigest: digest,
    };
    const event = this.append("review.bundle.created", body);
    this.note("bundle.create", [reviewBundleId, input.name, event.id]);
    return this.namedRecord(reviewBundleId, "bundle", 1, { name: input.name, selectedRevisionIds: selected, eventId: event.id });
  }

  showBundle(bundleId: string): ChangeGraphRecord {
    try { parseCanonicalId(bundleId, "review-bundle"); } catch { throw missing(`record not found: ${bundleId}`); }
    const event = [...this.#repository.events()].reverse().find((item) =>
      (item.type === "review.bundle.created" || item.type === "review.bundle.revised") && item.payload.reviewBundleId === bundleId);
    if (event === undefined) throw missing(`record not found: ${bundleId}`);
    return this.namedRecord(bundleId, "bundle", 1, {
      name: this.namedValue(bundleId, "bundle.create") ?? bundleId,
      selectedRevisionIds: event.payload.selectedRevisionIds,
      eventId: event.id,
    });
  }

  recordReview(input: { readonly targetId: string; readonly state: string; readonly body: string }): ChangeGraphRecord {
    const bundle = this.bundleForTarget(input.targetId);
    const verdict = input.state === "approved" || input.state === "changes-requested" ? input.state : "commented";
    const event = this.append("review.recorded", {
      reviewBundleId: bundle.id,
      bundleRevisionId: String(bundle.data.eventId),
      reviewerPrincipalId: this.principalId(),
      verdict,
    });
    this.note("review.record", [event.id, input.targetId, verdict]);
    return { id: event.id, kind: "review", revision: 1, createdAt: this.#now, updatedAt: this.#now, data: { targetId: input.targetId, state: verdict, body: input.body } };
  }

  createMergePlan(input: { readonly targetRevisionId: string; readonly selectedRevisionIds: readonly string[]; readonly mergeMode?: MergePlan["mergeMode"] }): ChangeGraphRecord {
    const mergePlanId = createCanonicalId("merge-plan", this.#random);
    const targetRevisionId = this.requireExistingRevisions([input.targetRevisionId])[0]!;
    const selected = this.requireExistingRevisions(input.selectedRevisionIds.length > 0 ? input.selectedRevisionIds : [targetRevisionId]);
    const digest = this.revisionSetDigest(selected);
    const bundle = this.createReviewBundle({ name: `merge-${mergePlanId.slice(-8)}`, selectedRevisionIds: selected });
    const body: MergePlan = {
      mergePlanId,
      targetRevisionId,
      selectedRevisionIds: selected,
      hardDependencyClosure: selected,
      reviewBundleRevisionId: assertRevisionId(String(bundle.data.eventId)),
      conflictResolutionRevisionIds: [],
      gateDefinitionDigest: digest,
      mergeMode: input.mergeMode ?? "change-graph-squash",
      resultingTreeDigest: digest,
    };
    const event = this.append("merge.plan.created", body);
    this.note("merge-plan.create", [mergePlanId, event.id]);
    return this.namedRecord(mergePlanId, "merge-plan", 1, { ...body, status: "planned", eventId: event.id });
  }

  showMergePlan(mergePlanId: string): ChangeGraphRecord {
    try { parseCanonicalId(mergePlanId, "merge-plan"); } catch { throw missing(`record not found: ${mergePlanId}`); }
    const created = this.#repository.events().find((event) => event.type === "merge.plan.created" && event.payload.mergePlanId === mergePlanId);
    if (created === undefined) throw missing(`record not found: ${mergePlanId}`);
    const applied = this.#repository.events().some((event) => event.type === "merge.plan.applied" && event.payload.mergePlanId === mergePlanId);
    return this.namedRecord(mergePlanId, "merge-plan", applied ? 2 : 1, { ...created.payload, status: applied ? "applied" : "planned", eventId: created.id });
  }

  applyMergePlan(mergePlanId: string): ChangeGraphRecord {
    const plan = this.showMergePlan(mergePlanId);
    const selected = this.requireExistingRevisions(stringArray(plan.data.selectedRevisionIds));
    this.requireExistingRevisions([String(plan.data.targetRevisionId)]);
    const digest = this.revisionSetDigest(selected);
    if (digest !== plan.data.resultingTreeDigest || digest !== plan.data.gateDefinitionDigest) {
      throw Object.assign(new Error("merge plan digest no longer matches the selected revisions"), { code: "stale-revision" as const });
    }
    if (this.listConflicts().some((conflict) => conflict.data.status !== "accepted")) {
      throw Object.assign(new Error("unresolved conflict blocks merge apply"), { code: "conflict" as const });
    }
    const event = this.append("merge.plan.applied", {
      mergePlanId,
      targetRevisionId: plan.data.targetRevisionId,
      resultRevisionId: plan.data.targetRevisionId,
      resultTreeDigest: plan.data.resultingTreeDigest,
      mergeMode: plan.data.mergeMode,
      sourceRevisionIds: plan.data.selectedRevisionIds,
    });
    this.note("merge-plan.apply", [mergePlanId, event.id]);
    return this.namedRecord(mergePlanId, "merge-plan", plan.revision + 1, { ...plan.data, status: "applied", resultEventId: event.id });
  }

  listConflicts(): readonly ChangeGraphRecord[] {
    const latest = new Map<string, ChangeGraphRecord>();
    for (const event of this.#repository.events()) {
      if (event.type === "conflict.recorded") {
        latest.set(String(event.payload.conflictId), this.namedRecord(String(event.payload.conflictId), "conflict", 1, event.payload));
        continue;
      }
      if (event.type !== "conflict.resolution.proposed" && event.type !== "conflict.resolution.accepted" && event.type !== "conflict.resolution.rejected") continue;
      const id = String(event.payload.conflictId);
      const current = latest.get(id);
      const status = event.type.endsWith("accepted") ? "accepted" : event.type.endsWith("rejected") ? "rejected" : "proposed";
      latest.set(id, this.namedRecord(id, "conflict", (current?.revision ?? 0) + 1, {
        ...(current?.data ?? {}),
        status,
        resolutionRevisionId: event.payload.resolutionRevisionId,
        eventId: event.id,
      }));
    }
    return [...latest.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  decideConflict(conflictId: string, decision: "accepted" | "rejected"): ChangeGraphRecord {
    const conflict = this.showConflict(conflictId);
    const resolutionRevisionId = String(
      conflict.data.resolutionRevisionId ??
      (Array.isArray(conflict.data.resolutionRevisionIds) ? conflict.data.resolutionRevisionIds[0] : undefined) ??
      (Array.isArray(conflict.data.sideRevisionIds) ? conflict.data.sideRevisionIds[0] : ""),
    );
    if (!/^[a-f0-9]{64}$/u.test(resolutionRevisionId)) {
      throw Object.assign(new Error("conflict has no resolution revision"), { code: "invalid-input" as const });
    }
    const event = this.append(decision === "accepted" ? "conflict.resolution.accepted" : "conflict.resolution.rejected", {
      conflictId,
      resolutionRevisionId,
      principalId: this.principalId(),
    });
    this.note(`conflict.${decision}`, [conflictId, event.id]);
    return this.showConflict(conflictId);
  }

  showConflict(conflictId: string): ChangeGraphRecord {
    try { parseCanonicalId(conflictId, "conflict"); } catch { throw missing(`record not found: ${conflictId}`); }
    const found = this.listConflicts().find((item) => item.id === conflictId);
    if (found === undefined) throw missing(`record not found: ${conflictId}`);
    return found;
  }

  operations(): readonly OperationSummary[] {
    return this.#operations.list().map((operation) => {
      const summary = {
        operationId: operation.operationId,
        command: operation.command,
        timestamp: operation.timestamp,
      };
      if (operation.args[0] && operation.restores) {
        return { ...summary, targetId: operation.args[0], restores: operation.restores };
      }
      if (operation.args[0]) return { ...summary, targetId: operation.args[0] };
      if (operation.restores) return { ...summary, restores: operation.restores };
      return summary;
    }).sort((left, right) => left.operationId.localeCompare(right.operationId));
  }

  restoreOperation(targetId: string) {
    if (this.#operations.get(targetId) === undefined) throw missing(`operation not found: ${targetId}`);
    const recorded = this.#operations.restore(targetId, createCanonicalId("operation", this.#random), this.#now);
    return { operationId: recorded.operationId, command: recorded.command, restores: targetId };
  }

  rememberDraft(kind: string, id: string, data: Readonly<EventPayload>): ChangeGraphRecord {
    this.note(`draft.${kind}`, [id, JSON.stringify(data)]);
    return this.namedRecord(id, kind, 1, data);
  }

  updateDraft(kind: string, id: string, data: Readonly<EventPayload>): ChangeGraphRecord {
    const current = this.readDraft(kind, id);
    const next = { ...current.data, ...data };
    this.note(`draft.${kind}`, [id, JSON.stringify(next)]);
    return this.namedRecord(id, kind, current.revision + 1, next);
  }

  readDraft(kind: string, id: string): ChangeGraphRecord {
    const matches = this.#operations.list().flatMap((operation) =>
      operation.command === `draft.${kind}` && operation.args[0] === id
        ? [{
            operation,
            // SAFETY: Draft writes serialize EventPayload objects, and namedRecord owns this parsed contract.
            parsed: JSON.parse(operation.args[1] ?? "{}") as EventPayload,
          }]
        : []);
    if (matches.length === 0) throw missing(`record not found: ${id}`);
    return this.namedRecord(id, kind, matches.length, matches[matches.length - 1]!.parsed);
  }

  listDrafts(kind: string): readonly ChangeGraphRecord[] {
    const latest = new Map<string, ChangeGraphRecord>();
    for (const operation of this.#operations.list()) {
      if (operation.command !== `draft.${kind}` || operation.args[0] === undefined) continue;
      const id = operation.args[0];
      const current = latest.get(id);
      // SAFETY: Draft writes serialize EventPayload objects, and namedRecord owns this parsed contract.
      const parsed = JSON.parse(operation.args[1] ?? "{}") as EventPayload;
      latest.set(id, this.namedRecord(id, kind, (current?.revision ?? 0) + 1, parsed));
    }
    return [...latest.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  syncFromLocal(peerRoot: string) {
    const peer = resolve(peerRoot);
    if (!existsSync(peer) || !new EpochRepository(peer).isInitialized()) {
      throw Object.assign(new Error(`local Epoch replica not found: ${peerRoot}`), { code: "not-found" as const });
    }
    const result = this.#repository.syncFrom(peer);
    this.note("replica.sync", [peer, String(result.eventsCopied), String(result.blobsCopied)]);
    return { ...result, peer };
  }

  hydratePaths(paths?: readonly string[]) {
    const hydrated = this.#repository.hydrate(paths);
    this.note("replica.hydrate", hydrated);
    return { hydrated };
  }

  backfill() {
    const promised = this.#repository.events().filter((event) => event.type === "object.promise.recorded").length;
    this.note("replica.backfill", [String(promised)]);
    return { fetched: [], promised };
  }

  addMirror(input: { readonly remoteRef: string }): ChangeGraphRecord {
    const mirrorId = createCanonicalId("mirror", this.#random);
    const event = this.append("mirror.defined", {
      mirrorId,
      repositoryId: this.repositoryId(),
      remoteRef: input.remoteRef,
      frontier: this.#repository.heads(),
    });
    this.note("mirror.add", [mirrorId, input.remoteRef, event.id]);
    return this.namedRecord(mirrorId, "mirror", 1, { remoteRef: input.remoteRef, eventId: event.id, frontier: this.#repository.heads() });
  }

  listMirrors(): readonly ChangeGraphRecord[] {
    return this.#repository.events()
      .filter((event) => event.type === "mirror.defined")
      .map((event) => this.namedRecord(String(event.payload.mirrorId), "mirror", 1, {
        remoteRef: event.payload.remoteRef,
        frontier: event.payload.frontier,
        eventId: event.id,
      }));
  }

  showMirror(mirrorId: string): ChangeGraphRecord {
    try { parseCanonicalId(mirrorId, "mirror"); } catch { throw missing(`record not found: ${mirrorId}`); }
    const found = this.listMirrors().find((item) => item.id === mirrorId);
    if (found === undefined) throw missing(`record not found: ${mirrorId}`);
    return found;
  }

  runMirror(mirrorId: string): ChangeGraphRecord {
    const mirror = this.showMirror(mirrorId);
    const event = this.append("mirror.run", {
      mirrorId,
      repositoryId: this.repositoryId(),
      remoteRef: String(mirror.data.remoteRef),
      frontier: this.#repository.heads(),
    });
    this.note("mirror.run", [mirrorId, event.id]);
    return this.namedRecord(mirrorId, "mirror", mirror.revision + 1, { ...mirror.data, lastRunEventId: event.id, status: "recorded" });
  }

  allocateBudget(input: { readonly principal?: string; readonly units: number }): ChangeGraphRecord {
    if (!Number.isSafeInteger(input.units) || input.units < 0) {
      throw Object.assign(new Error("budget units must be a nonnegative integer"), { code: "invalid-input" as const });
    }
    const budgetId = createCanonicalId("budget", this.#random);
    const principalId = this.namedPrincipal(input.principal);
    const event = this.append("agent.budget.allocated", { budgetId, principalId, units: input.units });
    this.note("budget.allocate", [budgetId, principalId, String(input.units)]);
    return this.namedRecord(budgetId, "budget", 1, { principalId, units: input.units, consumed: 0, eventId: event.id });
  }

  budgetStatus(principal?: string) {
    const principalId = this.namedPrincipal(principal);
    const events = this.#repository.events().filter((event) =>
      event.type.startsWith("agent.budget.") && event.payload.principalId === principalId);
    const allocated = sumUnits(events.filter((event) => event.type === "agent.budget.allocated"));
    const consumed = sumUnits(events.filter((event) => event.type === "agent.budget.consumed"));
    return { principalId, allocated, consumed, remaining: Math.max(0, allocated - consumed) };
  }

  authExplain(input: { readonly principal?: string; readonly action?: string }): never {
    const principalId = this.namedPrincipal(input.principal);
    throw Object.assign(new Error(`no grant authorizes ${input.action ?? "action"} for ${principalId}`), {
      code: "auth-denied" as const,
      details: { principal: principalId, authorized: false, action: input.action ?? "unspecified" },
    });
  }

  assertPublicArchive(visibility?: string): void {
    if (visibility !== undefined && visibility !== "public") {
      throw Object.assign(new Error("private or shared origins cannot be archived"), { code: "auth-denied" as const });
    }
  }

  recordHeritageMapping(swhId: string): ChangeGraphRecord {
    const event = this.append("software-heritage.mapping", {
      repositoryId: this.repositoryId(),
      swhId,
      frontier: this.#repository.heads(),
    });
    this.note("archive.map", [swhId, event.id]);
    return this.namedRecord(this.repositoryId(), "archive-mapping", 1, { swhId, eventId: event.id, frontier: this.#repository.heads() });
  }

  applySnapshot(snapshot: MemoryEpochTransportSnapshot): SyncResult {
    const result = this.#repository.syncWithTransport(new MemoryEpochTransport(snapshot));
    this.note("replica.snapshot", [String(result.eventsCopied), String(result.blobsCopied)]);
    return result;
  }

  exportSnapshot(): MemoryEpochTransportSnapshot {
    return this.#repository.exportToMemoryTransport().exportSnapshot();
  }

  ingestGit(gitRoot: string, remote: string) {
    const result = ingestGitToEpoch(this.#repository, { gitRoot, remote, mappingType: GitMappingEventType.commitImport });
    this.note("replica.git-ingest", [remote, result.commitOid]);
    return { commitOid: result.commitOid, recorded: result.recorded.length, remote };
  }

  recordArchiveRequest(input: { readonly origin: string; readonly status: "requested" | "pending" | "succeeded" | "failed" | "cancelled"; readonly requestId: string }): ChangeGraphRecord {
    const versionId = createCanonicalId("version", this.#random);
    const event = this.append("software-heritage.archive-requested", {
      repositoryId: this.repositoryId(),
      versionId,
      requestId: input.requestId,
      status: input.status,
    });
    this.note("archive.request", [input.origin, input.status, event.id]);
    return this.namedRecord(input.requestId, "archive-request", 1, { origin: input.origin, status: input.status, eventId: event.id, versionId });
  }

  proposeAiConflict(label?: string): ChangeGraphRecord {
    const revisions = this.listRevisions().map((item) => item.id);
    if (revisions.length < 2) {
      const base = revisions[0] ?? String(this.createChange({ title: "conflict-base" }).data.revisionId);
      this.createRevision({ parentRevisionIds: [String(base)], message: "conflict-side" });
    }
    const sides = this.listRevisions().map((item) => item.id).slice(-2);
    const conflictId = label !== undefined && label.startsWith("epoch:conflict:")
      ? label
      : createCanonicalId("conflict", this.#random);
    if (this.#repository.events().every((event) => event.type !== "conflict.recorded" || event.payload.conflictId !== conflictId)) {
      this.append("conflict.recorded", {
        conflictId,
        sideRevisionIds: sides,
        status: "proposed",
        resolutionRevisionIds: [],
      });
    }
    const proposal = this.createChange({
      title: `untrusted-ai-resolution:${conflictId}`,
      parentRevisionIds: [sides[0]!],
    });
    const event = this.append("conflict.resolution.proposed", {
      conflictId,
      resolutionRevisionId: String(proposal.data.revisionId),
      principalId: this.principalId(),
    });
    this.note("conflict.propose-ai", [conflictId, event.id]);
    return this.namedRecord(conflictId, "conflict", 1, {
      status: "proposed",
      trusted: false,
      provider: "epoch.deterministic-proposal.v1",
      resolutionRevisionId: proposal.data.revisionId,
      eventId: event.id,
      explanation: "Deterministic untrusted proposal: keep the first side until a principal accepts.",
    });
  }

  acceptSplit(splitId: string): ChangeGraphRecord {
    const draft = this.readDraft("split", splitId);
    const sourceRevisionId = String(draft.data.sourceRevisionId ?? "");
    const sourceEvent = this.#repository.events().find((event) => event.id === sourceRevisionId);
    if (sourceEvent === undefined || (sourceEvent.type !== "change.created" && sourceEvent.type !== "change.revised")) {
      throw Object.assign(new Error("split source revision is not a signed change revision"), { code: "invalid-input" as const });
    }
    const sourcePayload: unknown = sourceEvent.payload;
    // SAFETY: The event-type check above restricts sourceEvent to change revision writers.
    const source = sourcePayload as import("@epoch/protocol").ChangeRevisionBody;
    const planned = draft.data.plan && isObject(draft.data.plan)
      // SAFETY: Split drafts store this declared plan structure; optional fields are normalized below.
      ? (/* SAFETY: Assertion is justified by surrounding validation or construction. */ draft.data.plan as { groups?: readonly { fragmentIds?: readonly string[]; risk?: string; reason?: string }[] }).groups ?? []
      : [];
    // SAFETY: Planned fragment IDs are checked against source fragments before acceptSplit consumes them.
    const groups = planned.length > 0
      ? planned.map((group) => ({
          fragmentIds: (group.fragmentIds ?? []) as import("@epoch/protocol").SplitGroup["fragmentIds"],
          risk: splitRisk(group.risk),
          reason: group.reason ?? "declared group",
        }))
      : source.fragments.map((fragment) => ({ fragmentIds: [fragment.fragmentId], risk: "low" as const, reason: "one group per fragment" }));
    const fragmentGroups = groups.map((group) => group.fragmentIds.map((id) => source.fragments.find((fragment) => fragment.fragmentId === id)!));
    const accepted = acceptSplit(source, { sourceRevisionId: assertRevisionId(sourceRevisionId), groups }, fragmentGroups);
    const resulting = groups.map((group, index) => this.createChange({
      title: `split-${index + 1}`,
      parentRevisionIds: source.parentRevisionIds,
    }));
    const reconstructionDigest = sha256Hex(accepted.reconstructedFragments.map((fragment) => fragment.fragmentId).join(","));
    const event = this.append("split.accepted", {
      sourceRevisionId,
      groups,
      resultingRevisionIds: resulting.map((item) => String(item.data.revisionId)),
      reconstructionDigest,
    });
    this.note("split.accept", [splitId, event.id]);
    return this.updateDraft("split", splitId, { status: "accepted", eventId: event.id, reconstructionDigest });
  }

  private namedPrincipal(name?: string): CanonicalId<"principal"> {
    if (name === undefined || name === "current" || name === this.#author) return this.principalId();
    return createCanonicalId("principal", () => sha256Bytes(`principal:${name}`));
  }

  private ensureIdentity(): void {
    if (this.#repository.events().some((event) => event.type === "repository.identity")) return;
    this.append("repository.identity", { repositoryId: this.repositoryId(), principalId: this.principalId() });
  }

  private revisionBody(changeId: string, parentRevisionIds: readonly string[], title: string, priorRevisionId?: string): ChangeRevisionBody {
    const fragment = this.titleFragment(title, priorRevisionId);
    return {
      // SAFETY: Callers create or parse the change ID before constructing a revision body.
      changeId: changeId as ChangeRevisionBody["changeId"],
      baseFrontier: priorRevisionId === undefined ? [] : [assertRevisionId(priorRevisionId)],
      baseTreeDigest: emptyDigest,
      parentRevisionIds: parentRevisionIds.map((id) => assertRevisionId(id)),
      fragments: [fragment],
      resultingTreeDigest: fragment.resultDigest,
      authorPrincipalId: this.principalId(),
    };
  }

  private titleFragment(title: string, sourceRevisionId?: string): ChangeFragment {
    const digest = sha256Hex(title);
    const principalId = this.principalId();
    const provenance = sourceRevisionId === undefined
      ? { principalId }
      : { principalId, sourceRevisionId: assertRevisionId(sourceRevisionId) };
    return {
      fragmentId: createCanonicalId("fragment", this.#random),
      kind: "structured",
      path: `.epoch/change-title/${encodeURIComponent(title)}`,
      precondition: sourceRevisionId === undefined ? { kind: "absent" } : { kind: "digest", digest: emptyDigest },
      resultDigest: digest,
      contentRef: `sha256:${digest}`,
      order: 0,
      dependencies: [],
      provenance,
      mergeStrategy: "structured",
    };
  }

  private bundleForTarget(targetId: string): ChangeGraphRecord {
    try {
      if (targetId.startsWith("epoch:review-bundle:")) return this.showBundle(targetId);
    } catch { /* fall through and create */ }
    try {
      return this.createReviewBundle({
        name: `review-${targetId.slice(-8)}`,
        selectedRevisionIds: [String(this.showChange(targetId).data.revisionId)],
      });
    } catch {
      throw Object.assign(new Error(`review target is not an existing change or bundle: ${targetId}`), { code: "not-found" as const });
    }
  }

  private append(type: string, body: AppendBody) {
    const payload = Object.fromEntries(Object.entries(body));
    assertProtocolEvent({ schemaVersion: 1, type, eventId: "pending-event", revisionId: "pending-event", body: payload });
    const transactionId = `${createCanonicalId("operation", this.#random)}:${this.#repository.events().length}`;
    const parents = this.#repository.heads();
    return this.#repository.appendWithParents(type, payload, {
      author: this.#author,
      parents,
      expectedHeads: parents,
      transactionId,
    });
  }

  private note(command: string, args: readonly string[]): void {
    this.#noteSeq += 1;
    this.#operations.record({
      operationId: `local-op-${this.#noteSeq.toString(16).padStart(8, "0")}`,
      parents: this.#operations.heads(),
      command,
      args,
      timestamp: this.#now,
    });
  }

  private principalId(): CanonicalId<"principal"> {
    this.#principalId ??= createCanonicalId("principal", () => sha256Bytes(this.#repository.identityDocument().publicKey));
    return this.#principalId;
  }

  private repositoryId(): CanonicalId<"repo"> {
    if (this.#repositoryId !== undefined) return this.#repositoryId;
    const identity = this.#repository.events().find((event) => event.type === "repository.identity");
    if (isString(identity?.payload.repositoryId)) {
      // SAFETY: Canonical repository IDs are written by ensureIdentity and the string is read from that event.
      this.#repositoryId = identity.payload.repositoryId as CanonicalId<"repo">;
      return this.#repositoryId;
    }
    this.#repositoryId = createCanonicalId("repo", () => sha256Bytes(this.#repository.identityDocument().publicKey));
    return this.#repositoryId;
  }

  private requireExistingRevisions(ids: readonly string[]): readonly RevisionId[] {
    return ids.map((id) => {
      if (!/^[a-f0-9]{64}$/u.test(id)) {
        throw Object.assign(new Error(`RevisionId must be an existing signed EventId: ${id}`), { code: "invalid-input" as const });
      }
      const event = this.#repository.events().find((item) => item.id === id);
      if (event === undefined) throw Object.assign(new Error(`revision event not found: ${id}`), { code: "not-found" as const });
      return assertRevisionId(event.id);
    });
  }

  private revisionSetDigest(revisionIds: readonly string[]): string {
    const material = revisionIds.map((id) => {
      const event = this.#repository.events().find((item) => item.id === id);
      const result = event && isString(event.payload.resultingTreeDigest) ? event.payload.resultingTreeDigest : id;
      return `${id}:${result}`;
    }).sort();
    return sha256Hex(material.join("\n"));
  }

  private namedValue(id: string, command: string): string | undefined {
    const match = this.#operations.list().find((operation) => operation.command === command && operation.args[0] === id);
    return match?.args[1];
  }

  private publishedFields(changeId: string): Readonly<EventPayload> {
    const match = [...this.#operations.list()].reverse().find((operation) =>
      operation.command === "change.publish" && operation.args[0] === changeId);
    if (!match) return {};
    return {
      reviewRef: match.args[1],
      changeIdTrailer: match.args[2],
      pushSpec: match.args[3],
    };
  }

  private changeRecord(id: string, revision: number, data: Readonly<EventPayload>): ChangeGraphRecord {
    return { id, kind: "change", revision, createdAt: this.#now, updatedAt: this.#now, data };
  }

  private namedRecord(id: string, kind: string, revision: number, data: Readonly<EventPayload>): ChangeGraphRecord {
    return { id, kind, revision, createdAt: this.#now, updatedAt: this.#now, data };
  }
}

function titleFromBody(payload: Readonly<EventPayload>): string {
  const fragments = payload.fragments;
  if (!Array.isArray(fragments) || !isRecord(fragments[0])) return "";
  const path = fragments[0].path;
  if (!isString(path)) return "";
  const prefix = ".epoch/change-title/";
  return path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : path;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Bytes(value: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(value).digest());
}

function missing(message: string): Error & { code: "not-found" } {
  return Object.assign(new Error(message), { code: "not-found" as const });
}

function sumUnits(events: readonly { readonly payload: Readonly<EventPayload> }[]): number {
  return events.reduce((total, event) => total + (isNumber(event.payload.units) ? event.payload.units : 0), 0);
}

function stringArray<Value>(value: Value): readonly string[] {
  return Array.isArray(value) && value.every(isString) ? value : [];
}

function isString<Value>(value: Value): value is Value & string {
  return typeof value === "string";
}

function isNumber<Value>(value: Value): value is Value & number {
  return typeof value === "number";
}

function isObject<Value>(value: Value): value is Value & object {
  return typeof value === "object" && value !== null;
}

function splitRisk(value: string | undefined): import("@epoch/protocol").SplitGroup["risk"] {
  return value === "medium" || value === "high" || value === "ambiguous" ? value : "low";
}
