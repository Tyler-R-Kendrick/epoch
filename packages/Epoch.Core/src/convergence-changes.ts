import { ProtocolError, assertRevisionId } from "@epoch/protocol";
import type {
  ChangeFragment,
  ChangeGraphDefinition,
  ChangeRevisionBody,
  DurableConflict,
  MergePlan,
  ReviewBundle,
  SplitPlan,
} from "@epoch/protocol";
import { canonicalJson, type JsonValue } from "./json";

export class ChangeGraph {
  readonly #revisions = new Map<string, ChangeRevisionBody>();

  add(revisionId: string, body: ChangeRevisionBody): void {
    const validatedRevisionId = assertRevisionId(revisionId);
    if (this.#revisions.has(validatedRevisionId) || body.parentRevisionIds.includes(validatedRevisionId)) throw fail("stale-revision", "Change revision cycle or duplicate");
    for (const parentId of body.parentRevisionIds) {
      const parent = this.#revisions.get(parentId);
      if (parent === undefined) throw fail("missing-dependency", `Missing change parent: ${parentId}`);
      if (parent.changeId !== body.changeId) throw fail("invalid-ref", "Parent revision belongs to different ChangeId");
    }
    this.#revisions.set(validatedRevisionId, structuredClone(body));
  }

  changeIdOf(revisionId: string): string {
    const body = this.#revisions.get(revisionId);
    if (body === undefined) throw fail("missing-object", `Missing change revision: ${revisionId}`);
    return body.changeId;
  }

  ancestors(revisionId: string): readonly string[] {
    if (!this.#revisions.has(revisionId)) throw fail("missing-object", `Missing change revision: ${revisionId}`);
    const result = new Set<string>();
    const visit = (id: string): void => {
      for (const parent of this.#revisions.get(id)?.parentRevisionIds ?? []) {
        if (!result.has(parent)) { result.add(parent); visit(parent); }
      }
    };
    visit(revisionId);
    return [...result].sort((left, right) => this.depth(left) - this.depth(right) || left.localeCompare(right));
  }

  private depth(revisionId: string): number {
    const parents = this.#revisions.get(revisionId)?.parentRevisionIds ?? [];
    return parents.length === 0 ? 0 : Math.max(...parents.map((parent) => this.depth(parent))) + 1;
  }

  reconstruct(revisionId: string): readonly ChangeFragment[] {
    const body = this.#revisions.get(revisionId);
    if (body === undefined) throw fail("missing-object", `Missing change revision: ${revisionId}`);
    const ordered = [...this.ancestors(revisionId), revisionId];
    const fragments = new Map<string, ChangeFragment>();
    for (const id of ordered) for (const fragment of this.#revisions.get(id)!.fragments) fragments.set(fragment.fragmentId, structuredClone(fragment));
    return [...fragments.values()].sort((left, right) => left.order - right.order || left.fragmentId.localeCompare(right.fragmentId));
  }
}

export interface ValidatedChangeGraph {
  readonly topologicalOrder: readonly string[];
  closure(revisionIds: readonly string[]): readonly string[];
  downwardMergeSet(revisionId: string): readonly string[];
}

export function validateChangeGraph(changeGraph: ChangeGraphDefinition): ValidatedChangeGraph {
  const members = new Set(changeGraph.memberRevisionIds);
  if (members.size !== changeGraph.memberRevisionIds.length) throw fail("invalid-schema", "Duplicate change graph revision");
  const dependencies = new Map<string, Set<string>>(changeGraph.memberRevisionIds.map((revisionId) => [revisionId, new Set()]));
  for (const edge of changeGraph.edges) {
    if (!members.has(edge.from) || !members.has(edge.to)) throw fail("invalid-ref", "Change graph edge references nonmember revision");
    if (edge.from === edge.to) throw fail("invalid-schema", "Change graph cycle: self edge");
    if (["requires", "orders-after", "derived-from"].includes(edge.kind)) dependencies.get(edge.from)!.add(edge.to);
  }
  const order: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (revisionId: string): void => {
    if (visiting.has(revisionId)) throw fail("invalid-schema", `Change graph cycle at ${revisionId}`);
    if (visited.has(revisionId)) return;
    visiting.add(revisionId);
    for (const dependency of [...dependencies.get(revisionId)!].sort()) visit(dependency);
    visiting.delete(revisionId); visited.add(revisionId); order.push(revisionId);
  };
  for (const revisionId of changeGraph.memberRevisionIds) visit(revisionId);
  const closure = (revisionIds: readonly string[]): readonly string[] => {
    const selected = new Set<string>();
    const select = (revisionId: string): void => {
      if (!members.has(assertRevisionId(revisionId))) throw fail("missing-dependency", `Revision is not in change graph: ${revisionId}`);
      if (selected.has(revisionId)) return;
      selected.add(revisionId);
      for (const dependency of dependencies.get(revisionId)!) select(dependency);
    };
    revisionIds.forEach(select);
    return order.filter((revisionId) => selected.has(revisionId));
  };
  return Object.freeze({ topologicalOrder: order, closure, downwardMergeSet: (revisionId: string) => closure([revisionId]) });
}

export interface AcceptedSplit {
  readonly sourceRevisionId: string;
  readonly groups: readonly (readonly ChangeFragment[])[];
  readonly reconstructedFragments: readonly ChangeFragment[];
}

export function acceptSplit(
  source: ChangeRevisionBody,
  plan: SplitPlan,
  groups: readonly (readonly ChangeFragment[])[],
): AcceptedSplit {
  if (groups.length !== plan.groups.length) throw fail("integrity-failure", "Split reconstruction group mismatch");
  const sourceIds = source.fragments.map((fragment) => fragment.fragmentId);
  const acceptedIds = groups.flatMap((group) => group.map((fragment) => fragment.fragmentId));
  if (new Set(acceptedIds).size !== acceptedIds.length || sourceIds.length !== acceptedIds.length
    || sourceIds.some((fragmentId) => !acceptedIds.includes(fragmentId))) {
    throw fail("integrity-failure", "Split acceptance would drop or duplicate fragments");
  }
  for (let index = 0; index < groups.length; index += 1) {
    const planned = new Set(plan.groups[index]!.fragmentIds);
    if (groups[index]!.some((fragment) => !planned.has(fragment.fragmentId)) || planned.size !== groups[index]!.length) {
      throw fail("integrity-failure", "Accepted split differs from proposal grouping");
    }
  }
  const byId = new Map(groups.flatMap((group) => [...group]).map((fragment) => [fragment.fragmentId, fragment]));
  const reconstructedFragments = source.fragments.map((fragment) => byId.get(fragment.fragmentId)!);
  if (canonical(reconstructedFragments) !== canonical(source.fragments)) throw fail("integrity-failure", "Split does not reconstruct byte-for-byte fragment sequence");
  return Object.freeze({ sourceRevisionId: plan.sourceRevisionId, groups: structuredClone(groups), reconstructedFragments });
}

export function buildReviewBundle(input: {
  readonly reviewBundleId: string;
  readonly selectedRevisionIds: readonly string[];
  readonly baseFrontier: readonly string[];
  readonly baseTreeDigest: string;
  readonly combinedTreeDigest: string;
  readonly overlaps: ReviewBundle["overlaps"];
  readonly conflicts: ReviewBundle["conflictIds"];
  readonly gateDefinitionDigest: string;
  readonly priorBundle?: ReviewBundle;
}): ReviewBundle {
  const bundle: ReviewBundle = deepFreeze({
    // SAFETY: Runtime checks or construction above establish ReviewBundle["reviewBundleId"].
    reviewBundleId: input.reviewBundleId as ReviewBundle["reviewBundleId"], selectedRevisionIds: input.selectedRevisionIds.map(assertRevisionId), baseFrontier: input.baseFrontier.map(assertRevisionId),
    baseTreeDigest: input.baseTreeDigest, combinedTreeDigest: input.combinedTreeDigest, overlaps: structuredClone(input.overlaps),
    conflictIds: [...input.conflicts], gateDefinitionDigest: input.gateDefinitionDigest,
  });
  if (input.priorBundle !== undefined && canonical({ ...bundle, reviewBundleId: undefined }) !== canonical({ ...input.priorBundle, reviewBundleId: undefined })) {
    throw fail("stale-review", "Review bundle evidence changed; create a new bundle revision");
  }
  return bundle;
}

export interface MergePlanningContext { readonly changeGraph: ChangeGraphDefinition }

export function createMergePlan(input: MergePlan, context: MergePlanningContext): MergePlan {
  if (new Set(input.selectedRevisionIds).size !== input.selectedRevisionIds.length || new Set(input.hardDependencyClosure).size !== input.hardDependencyClosure.length) throw fail("invalid-schema", "Merge plan contains duplicate revisions");
  assertDependencyClosure(input, context.changeGraph);
  return Object.freeze(structuredClone(input));
}

export interface MergeApplicationContext {
  readonly currentTargetRevisionId: string;
  readonly availableRevisionIds: readonly string[];
  readonly changeGraph: ChangeGraphDefinition;
  readonly reviewBundleRevisionId: string;
  readonly acceptedResolutionRevisionIds: readonly string[];
  readonly gateDefinitionDigest: string;
  readonly unresolvedConflictIds: readonly string[];
  readonly protectedTarget: boolean;
  readonly resultDigest: string;
}

export interface AppliedMerge { readonly mergeMode: MergePlan["mergeMode"]; readonly resultRevisionProvenance: readonly string[]; readonly resultDigest: string }

export function applyMergePlan(plan: MergePlan, context: MergeApplicationContext): AppliedMerge {
  if (context.currentTargetRevisionId !== plan.targetRevisionId) throw fail("stale-head", "Merge target moved");
  assertDependencyClosure(plan, context.changeGraph);
  if (plan.hardDependencyClosure.some((revisionId) => !context.availableRevisionIds.includes(revisionId))) throw fail("missing-dependency", "Merge plan hard dependency closure is unavailable");
  if (context.reviewBundleRevisionId !== plan.reviewBundleRevisionId) throw fail("stale-review", "Merge review evidence changed");
  if (!sameValues(context.acceptedResolutionRevisionIds, plan.conflictResolutionRevisionIds)) throw fail("stale-revision", "Merge conflict resolution evidence changed");
  if (context.gateDefinitionDigest !== plan.gateDefinitionDigest) throw fail("stale-gate", "Merge gate evidence changed");
  if (context.protectedTarget && context.unresolvedConflictIds.length > 0) throw fail("unresolved-conflict", "Protected merge has unresolved conflicts");
  if (context.resultDigest !== plan.resultingTreeDigest) throw fail("integrity-failure", "Merge result digest does not match plan");
  return Object.freeze({ mergeMode: plan.mergeMode, resultRevisionProvenance: [...plan.selectedRevisionIds], resultDigest: context.resultDigest });
}

function assertDependencyClosure(plan: MergePlan, changeGraph: ChangeGraphDefinition): void {
  const authoritative = validateChangeGraph(changeGraph).closure(plan.selectedRevisionIds);
  if (!sameValues(authoritative, plan.hardDependencyClosure)) throw fail("missing-dependency", "Merge plan does not contain the authoritative hard dependency closure");
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export interface ConflictResolutionProvider {
  propose(conflict: DurableConflict): { readonly content: JsonValue; readonly confidence?: number };
}

export class ConflictLedger {
  readonly #conflicts = new Map<string, DurableConflict>();
  constructor(conflicts: readonly DurableConflict[] = []) { for (const conflict of conflicts) this.#conflicts.set(conflict.conflictId, structuredClone(conflict)); }
  get(conflictId: string): DurableConflict | undefined { const value = this.#conflicts.get(conflictId); return value === undefined ? undefined : structuredClone(value); }
  draftState(conflictIds: readonly string[]) { return Object.freeze({ carriedConflictIds: conflictIds.filter((id) => this.#conflicts.get(id)?.status !== "accepted") }); }
  assertMergeable(conflictIds: readonly string[], protectedTarget: boolean): void {
    if (protectedTarget && conflictIds.some((id) => this.#conflicts.get(id)?.status !== "accepted")) throw fail("unresolved-conflict", "Protected merge has unresolved conflict");
  }
  propose(conflictId: string, resolutionRevisionId: string, _principalId: string): void { this.transition(conflictId, "proposed", resolutionRevisionId); }
  accept(conflictId: string, resolutionRevisionId: string, _principalId: string): void {
    const conflict = this.required(conflictId);
    if (conflict.status !== "proposed" || !conflict.resolutionRevisionIds.includes(assertRevisionId(resolutionRevisionId))) throw fail("stale-revision", "Resolution was not proposed for this conflict");
    this.#conflicts.set(conflictId, Object.freeze({ ...conflict, status: "accepted" }));
  }
  reject(conflictId: string, resolutionRevisionId: string, _principalId: string): void { this.transition(conflictId, "rejected", resolutionRevisionId); }
  requestProviderProposal(conflictId: string, provider: ConflictResolutionProvider) {
    const conflict = this.required(conflictId);
    const output = structuredClone(provider.propose(structuredClone(conflict)));
    return Object.freeze({ trusted: false as const, conflictId, output });
  }
  static commute<T>(base: T, left: (value: T) => T, right: (value: T) => T): boolean {
    try { return canonical(right(left(structuredClone(base)))) === canonical(left(right(structuredClone(base)))); } catch { return false; }
  }
  private transition(conflictId: string, status: "proposed" | "rejected", resolutionRevisionId: string): void {
    const conflict = this.required(conflictId);
    const revisionId = assertRevisionId(resolutionRevisionId);
    this.#conflicts.set(conflictId, Object.freeze({ ...conflict, status, resolutionRevisionIds: [...new Set([...conflict.resolutionRevisionIds, revisionId])] }));
  }
  private required(conflictId: string): DurableConflict { const conflict = this.#conflicts.get(conflictId); if (conflict === undefined) throw fail("missing-object", `Missing conflict: ${conflictId}`); return conflict; }
}

function canonical<Value>(value: Value): string { return canonicalJson(value); }
function deepFreeze<T>(value: T): T {
  if (isObject(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function isObject<Value>(value: Value): value is Value & object { return typeof value === "object" && value !== null; }
function fail(code: ConstructorParameters<typeof ProtocolError>[0], message: string): ProtocolError { return new ProtocolError(code, `${code}: ${message}`); }
