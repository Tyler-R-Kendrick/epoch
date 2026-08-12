export type ConvergenceGateState = "passing" | "failing" | "stale" | "missing";

export interface ConvergenceRevision {
  readonly revisionId: string;
  readonly changeId: string;
  readonly supersedes?: string;
  readonly supersededBy?: string;
  readonly current: boolean;
}

export interface ConvergenceChange {
  readonly changeId: string;
  readonly label: string;
  readonly dependsOn: readonly string[];
  readonly revisions: readonly ConvergenceRevision[];
  readonly currentRevisionIds: readonly string[];
  readonly files: readonly string[];
  readonly sourceChanges?: readonly string[];
  readonly sourceRevisions?: readonly string[];
}

export interface ConvergenceGate {
  readonly changeId: string;
  readonly gateId: string;
  readonly label: string;
  readonly state: ConvergenceGateState;
  readonly revisionId?: string;
}

export interface ConvergenceConflict {
  readonly conflictId: string;
  readonly path: string;
  readonly base: string;
  readonly left: string;
  readonly right: string;
  readonly state: "unresolved" | "resolved";
  readonly acceptedBy?: "human";
  readonly aiProposalState?: "untrusted-proposal";
}

export interface AgentBudgetMeter {
  readonly allocated: number;
  readonly reserved: number;
  readonly consumed: number;
  readonly released: number;
  readonly expired: number;
}

export interface ConvergenceAgentAuthority {
  readonly principalId: string;
  readonly principalKeyStatus: "active" | "revoked";
  readonly sponsorId: string;
  readonly grantStatus: "active" | "revoked";
  readonly budget: AgentBudgetMeter;
}

export interface ConvergenceWorkbenchSnapshot {
  readonly snapshotDigest: string;
  readonly changes: readonly ConvergenceChange[];
  readonly gates: readonly ConvergenceGate[];
  readonly conflicts: readonly ConvergenceConflict[];
  readonly selectedChangeId: string;
  readonly agent?: ConvergenceAgentAuthority;
  readonly replica?: {
    readonly online: boolean;
    readonly promisedObjectIds: readonly string[];
    readonly hydratedObjectIds: readonly string[];
    readonly integrity: "verified" | "failed";
    readonly copyMode: "copy-on-write" | "full-copy";
    readonly executionIsolation: "none" | "sandboxed";
  };
  readonly forge?: {
    readonly jjChangeId: string;
    readonly mirrorState: "current" | "lagging";
    readonly fidelity: { readonly preserved: readonly string[]; readonly losses: readonly string[] };
  };
  readonly archive?: {
    readonly swhid: string;
    readonly publicRelease: boolean;
  };
}

export interface ConvergenceFixtureOptions {
  readonly changes: string;
  readonly dependencies?: string;
  readonly ambiguousPath?: string;
  readonly multiHead?: boolean;
  readonly gates?: boolean;
  readonly staleApproval?: boolean;
  readonly conflict?: boolean;
  readonly offline?: boolean;
  readonly copyMode?: "copy-on-write" | "full-copy";
  readonly forge?: boolean;
  readonly agent?: boolean;
  readonly archive?: boolean;
}

interface MutableState {
  snapshotDigest: string;
  changes: ConvergenceChange[];
  gates: ConvergenceGate[];
  conflicts: ConvergenceConflict[];
  selectedChangeId: string;
  ambiguousPath?: string;
  agent?: ConvergenceAgentAuthority;
  replica?: ConvergenceWorkbenchSnapshot["replica"];
  forge?: ConvergenceWorkbenchSnapshot["forge"];
  archive?: ConvergenceWorkbenchSnapshot["archive"];
}

export interface PartialMergePlan {
  readonly targetChangeId: string;
  readonly included: readonly string[];
  readonly excluded: readonly string[];
  readonly explanation: string;
  readonly confirmationRequired: true;
}

export interface MutationAuthority {
  readonly authority?: string;
  readonly confirmed: boolean;
}

export function createConvergenceFixture(options: ConvergenceFixtureOptions): ConvergenceWorkbenchSnapshot & { readonly ambiguousPath?: string } {
  const ids = splitList(options.changes);
  const dependencyMap = new Map<string, string[]>();
  for (const relation of splitList(options.dependencies ?? "")) {
    const [child, parent] = relation.split(">");
    if (child !== undefined && parent !== undefined) dependencyMap.set(child, [...(dependencyMap.get(child) ?? []), parent]);
  }
  const changes = ids.map((changeId) => createChange(changeId, dependencyMap.get(changeId) ?? [], options.multiHead && changeId === ids[0]));
  const gates: ConvergenceGate[] = options.gates
    ? changes.flatMap((change, index) => [
      { changeId: change.changeId, gateId: `${change.changeId}-tests`, label: "Tests", state: "passing" as const, revisionId: change.currentRevisionIds[0] },
      { changeId: change.changeId, gateId: `${change.changeId}-review`, label: "Review", state: index === 1 ? "stale" as const : "passing" as const, revisionId: index === 1 ? `rev-${change.changeId}-0` : change.currentRevisionIds[0] },
      { changeId: change.changeId, gateId: `${change.changeId}-security`, label: "Security", state: index === 2 ? "missing" as const : "passing" as const, revisionId: change.currentRevisionIds[0] },
    ])
    : options.staleApproval
      ? [{ changeId: ids[0] ?? "change", gateId: "approval", label: "Approval", state: "stale", revisionId: `rev-${ids[0] ?? "change"}-0` }]
      : [];
  const agent = options.agent ? {
    principalId: "agent-1",
    principalKeyStatus: "active" as const,
    sponsorId: "maintainer-1",
    grantStatus: "active" as const,
    budget: { allocated: 100, reserved: 0, consumed: 0, released: 0, expired: 0 },
  } : undefined;
  return {
    snapshotDigest: `snapshot:${ids.join("+") || "empty"}`,
    changes,
    gates,
    conflicts: options.conflict ? [{ conflictId: "conflict-1", path: "shared.ts", base: "object-base", left: "object-left", right: "object-right", state: "unresolved" }] : [],
    selectedChangeId: ids[0] ?? "",
    ...(options.ambiguousPath === undefined ? {} : { ambiguousPath: options.ambiguousPath }),
    ...(agent === undefined ? {} : { agent }),
    ...(options.offline ? { replica: { online: false, promisedObjectIds: ["object-1"], hydratedObjectIds: [], integrity: "verified" as const, copyMode: options.copyMode ?? "copy-on-write", executionIsolation: "none" as const } } : {}),
    ...(options.forge ? { forge: { jjChangeId: "jj-change-1", mirrorState: "lagging" as const, fidelity: { preserved: ["change.identity", "revision.identity", "dependencies"], losses: ["review.threading"] } } } : {}),
    ...(options.archive ? { archive: { swhid: "swh:1:rev:0123456789abcdef0123456789abcdef01234567", publicRelease: true } } : {}),
  };
}

export class ConvergenceWorkbench {
  readonly #state: MutableState;

  constructor(snapshot: ConvergenceWorkbenchSnapshot & { readonly ambiguousPath?: string }) {
    this.#state = cloneState(snapshot);
  }

  snapshot(): ConvergenceWorkbenchSnapshot {
    return cloneState(this.#state);
  }

  reconstructDigest(): string {
    return this.#state.snapshotDigest;
  }

  splitChange(changeId: string, partIds: readonly string[], fileBoundaries: readonly string[]): { readonly ok: boolean; readonly explanation: string } {
    const index = this.#state.changes.findIndex((change) => change.changeId === changeId);
    if (index < 0) return { ok: false, explanation: `Unknown change ${changeId}; change graph unchanged.` };
    const duplicateBoundary = new Set(fileBoundaries).size !== fileBoundaries.length;
    if (partIds.length < 2 || partIds.length !== fileBoundaries.length || duplicateBoundary || fileBoundaries.includes(this.#state.ambiguousPath ?? "")) {
      return { ok: false, explanation: `${this.#state.ambiguousPath ?? "edit"} contains an ambiguous hunk; define a human boundary before splitting. Change graph unchanged.` };
    }
    if (new Set(partIds).size !== partIds.length || partIds.some((id) => this.#state.changes.some((change) => change.changeId === id && change.changeId !== changeId))) {
      return { ok: false, explanation: "Split identities must be unique; change graph unchanged." };
    }
    const original = this.#state.changes[index];
    if (original === undefined) throw new Error(`Invariant: missing change ${changeId}`);
    const parts = partIds.map((partId, partIndex) => createChange(partId, partIndex === 0 ? original.dependsOn : [partIds[partIndex - 1] ?? original.changeId], false, [fileBoundaries[partIndex] ?? "unknown"]));
    const lastPart = parts.at(-1)?.changeId ?? changeId;
    this.#state.changes = this.#state.changes
      .flatMap((change) => change.changeId === changeId ? parts : [{ ...change, dependsOn: change.dependsOn.map((dependency) => dependency === changeId ? lastPart : dependency) }]);
    this.#state.selectedChangeId = parts[0]?.changeId ?? this.#state.selectedChangeId;
    return { ok: true, explanation: `Split ${changeId} at explicit file boundaries; reconstructed snapshot remains ${this.#state.snapshotDigest}.` };
  }

  revisionHistory(changeId: string): { readonly heads: readonly string[]; readonly revisions: readonly ConvergenceRevision[] } {
    const change = this.#change(changeId);
    return { heads: [...change.currentRevisionIds], revisions: change.revisions.map((revision) => ({ ...revision })) };
  }

  planPartialMerge(changeId: string): PartialMergePlan {
    this.#change(changeId);
    const includedSet = new Set<string>();
    const visit = (id: string): void => {
      if (includedSet.has(id)) return;
      for (const dependency of this.#change(id).dependsOn) visit(dependency);
      includedSet.add(id);
    };
    visit(changeId);
    const included = this.#state.changes.filter((change) => includedSet.has(change.changeId)).map((change) => change.changeId);
    const excluded = this.#state.changes.filter((change) => !includedSet.has(change.changeId)).map((change) => change.changeId);
    return {
      targetChangeId: changeId,
      included,
      excluded,
      explanation: `Dependency-closed preview includes ${included.join(", ")}; ${excluded.length === 0 ? "no dependent changes remain" : `excludes dependent ${excluded.join(", ")}`}. Confirm to merge.`,
      confirmationRequired: true,
    };
  }

  squash(plan: PartialMergePlan, authority: MutationAuthority): ConvergenceChange {
    requireMutation(authority, "maintainer.merge", "squash merge");
    const sources = plan.included.map((id) => this.#change(id));
    const changeId = `squash-${sources.map((change) => change.changeId).join("-")}`;
    const sourceRevisions = sources.flatMap((change) => change.currentRevisionIds);
    return {
      ...createChange(changeId, [], false, sources.flatMap((change) => change.files)),
      sourceChanges: sources.map((change) => change.changeId),
      sourceRevisions,
    };
  }

  mergeAuthority(changeId: string): { readonly allowed: boolean; readonly explanation: string } {
    const change = this.#change(changeId);
    const stale = this.#state.gates.find((gate) => gate.changeId === changeId && gate.state === "stale");
    if (stale !== undefined) return { allowed: false, explanation: `STALE approval targets ${stale.revisionId ?? "an older revision"}; current revision is ${change.currentRevisionIds.join(", ")}. Re-review before merge.` };
    const blockers = this.#state.gates.filter((gate) => gate.changeId === changeId && gate.state !== "passing");
    return blockers.length === 0 ? { allowed: true, explanation: "Current gates pass; confirmation is still required." } : { allowed: false, explanation: `Blocked by ${blockers.map((gate) => `${gate.label}: ${gate.state}`).join(", ")}.` };
  }

  resolveConflict(conflictId: string, input: { readonly strategy: "deterministic" | "ai-proposal" | "human"; readonly authority?: string; readonly confirmed?: boolean }): ConvergenceConflict & { readonly trust?: "untrusted-proposal" } {
    const index = this.#state.conflicts.findIndex((conflict) => conflict.conflictId === conflictId);
    const current = this.#state.conflicts[index];
    if (current === undefined) throw new Error(`Unknown conflict: ${conflictId}`);
    if (input.strategy === "deterministic") return { ...current };
    if (input.strategy === "ai-proposal") {
      const next = { ...current, aiProposalState: "untrusted-proposal" as const };
      this.#state.conflicts[index] = next;
      return { ...next, trust: "untrusted-proposal" };
    }
    requireMutation({ authority: input.authority, confirmed: input.confirmed === true }, "maintainer.resolve", "resolve conflict");
    const resolved = { ...current, state: "resolved" as const, acceptedBy: "human" as const };
    this.#state.conflicts[index] = resolved;
    return resolved;
  }

  hydrate(objectId: string): { readonly availability: "available"; readonly integrity: "verified" | "failed"; readonly copyMode: string; readonly executionIsolation: string } {
    const replica = this.#state.replica;
    if (replica === undefined || !replica.promisedObjectIds.includes(objectId)) throw new Error(`Object ${objectId} is not promised by this replica.`);
    this.#state.replica = { ...replica, online: true, hydratedObjectIds: [...new Set([...replica.hydratedObjectIds, objectId])] };
    return { availability: "available", integrity: replica.integrity, copyMode: replica.copyMode, executionIsolation: replica.executionIsolation };
  }

  synchronizeMirror(): { readonly jjChangeId: string; readonly fidelity: { readonly preserved: readonly string[]; readonly losses: readonly string[] }; readonly exportPayload: string } {
    const forge = this.#state.forge;
    if (forge === undefined) throw new Error("No forge mirror configured.");
    this.#state.forge = { ...forge, mirrorState: "current" };
    return { jjChangeId: forge.jjChangeId, fidelity: forge.fidelity, exportPayload: JSON.stringify({ changeId: forge.jjChangeId, revision: this.#state.changes[0]?.currentRevisionIds[0], fidelity: forge.fidelity }) };
  }

  reserveAgentBudget(amount: number): AgentBudgetMeter {
    const agent = this.#agent();
    if (!Number.isFinite(amount) || amount <= 0 || amount > agent.budget.allocated - agent.budget.consumed - agent.budget.reserved - agent.budget.expired) throw new Error("Budget reservation exceeds remaining allocation.");
    this.#state.agent = { ...agent, budget: { ...agent.budget, reserved: agent.budget.reserved + amount } };
    return { ...this.#agent().budget };
  }

  consumeAgentBudget(amount: number): AgentBudgetMeter {
    const agent = this.#agent();
    if (!Number.isFinite(amount) || amount <= 0 || amount > agent.budget.reserved) throw new Error("Budget consumption requires a matching reservation.");
    this.#state.agent = { ...agent, budget: { ...agent.budget, reserved: agent.budget.reserved - amount, consumed: agent.budget.consumed + amount } };
    return { ...this.#agent().budget };
  }

  revokeAgentGrant(): void {
    const agent = this.#agent();
    this.#state.agent = { ...agent, grantStatus: "revoked" };
  }

  authorizeAgentWork(): { readonly allowed: boolean; readonly explanation: string } {
    const agent = this.#agent();
    const allowed = agent.principalKeyStatus === "active" && agent.grantStatus === "active" && agent.budget.allocated > agent.budget.consumed + agent.budget.expired;
    return { allowed, explanation: allowed ? `${agent.principalId} sponsored by ${agent.sponsorId}: active grant and budget available.` : `${agent.principalId} sponsored by ${agent.sponsorId}: ${agent.grantStatus} grant; budget cannot authorize new work.` };
  }

  archiveRelease(input: { readonly visibility: "public" | "private"; readonly authority?: string; readonly confirmed: boolean }): { readonly status: "remote-confirmed" | "denied-private"; readonly swhid?: string; readonly explanation: string } {
    if (input.visibility === "private") return { status: "denied-private", explanation: "Private content and raw sessions are never submitted to a public archive." };
    requireMutation(input, "release.archive", "public archive");
    if (this.#state.archive === undefined) throw new Error("Release has no archival identity.");
    return { status: "remote-confirmed", swhid: this.#state.archive.swhid, explanation: "Remote archive confirmed the public release." };
  }

  #change(changeId: string): ConvergenceChange {
    const change = this.#state.changes.find((candidate) => candidate.changeId === changeId);
    if (change === undefined) throw new Error(`Unknown change: ${changeId}`);
    return change;
  }

  #agent(): ConvergenceAgentAuthority {
    if (this.#state.agent === undefined) throw new Error("No agent authority configured.");
    return this.#state.agent;
  }
}

function createChange(changeId: string, dependsOn: readonly string[], multiHead = false, files: readonly string[] = [`${changeId}.ts`]): ConvergenceChange {
  const base: ConvergenceRevision = { revisionId: `rev-${changeId}-0`, changeId, current: false, supersededBy: `rev-${changeId}-a` };
  const a: ConvergenceRevision = { revisionId: `rev-${changeId}-a`, changeId, current: true, supersedes: base.revisionId };
  const b: ConvergenceRevision = { revisionId: `rev-${changeId}-b`, changeId, current: true, supersedes: base.revisionId };
  return { changeId, label: changeId, dependsOn: [...dependsOn], revisions: multiHead ? [base, a, b] : [{ ...a, revisionId: `rev-${changeId}-1`, supersedes: undefined }], currentRevisionIds: multiHead ? [a.revisionId, b.revisionId] : [`rev-${changeId}-1`], files: [...files] };
}

function cloneState(snapshot: ConvergenceWorkbenchSnapshot & { readonly ambiguousPath?: string }): MutableState {
  return {
    snapshotDigest: snapshot.snapshotDigest,
    changes: snapshot.changes.map((change) => ({ ...change, dependsOn: [...change.dependsOn], revisions: change.revisions.map((revision) => ({ ...revision })), currentRevisionIds: [...change.currentRevisionIds], files: [...change.files], ...(change.sourceChanges === undefined ? {} : { sourceChanges: [...change.sourceChanges] }), ...(change.sourceRevisions === undefined ? {} : { sourceRevisions: [...change.sourceRevisions] }) })),
    gates: snapshot.gates.map((gate) => ({ ...gate })),
    conflicts: snapshot.conflicts.map((conflict) => ({ ...conflict })),
    selectedChangeId: snapshot.selectedChangeId,
    ...(snapshot.ambiguousPath === undefined ? {} : { ambiguousPath: snapshot.ambiguousPath }),
    ...(snapshot.agent === undefined ? {} : { agent: { ...snapshot.agent, budget: { ...snapshot.agent.budget } } }),
    ...(snapshot.replica === undefined ? {} : { replica: { ...snapshot.replica, promisedObjectIds: [...snapshot.replica.promisedObjectIds], hydratedObjectIds: [...snapshot.replica.hydratedObjectIds] } }),
    ...(snapshot.forge === undefined ? {} : { forge: { ...snapshot.forge, fidelity: { preserved: [...snapshot.forge.fidelity.preserved], losses: [...snapshot.forge.fidelity.losses] } } }),
    ...(snapshot.archive === undefined ? {} : { archive: { ...snapshot.archive } }),
  };
}

function splitList(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function requireMutation(input: MutationAuthority, authority: string, action: string): void {
  if (input.authority !== authority) throw new Error(`${action} requires authority ${authority}.`);
  if (!input.confirmed) throw new Error(`${action} requires explicit confirmation.`);
}
