import { ProtocolError } from "../../Epoch.Protocol/src/errors";
import type {
  ChangeFragment,
  ChangeRevisionBody,
  DurableConflict,
  MergePlan,
  ReviewBundle,
  SplitPlan,
  StackDefinition,
} from "../../Epoch.Protocol/src/index";

export class ChangeGraph {
  readonly #revisions = new Map<string, ChangeRevisionBody>();

  add(revisionId: string, body: ChangeRevisionBody): void {
    if (this.#revisions.has(revisionId) || body.parentRevisionIds.includes(revisionId)) throw fail("stale-revision", "Change revision cycle or duplicate");
    for (const parentId of body.parentRevisionIds) {
      const parent = this.#revisions.get(parentId);
      if (parent === undefined) throw fail("missing-dependency", `Missing change parent: ${parentId}`);
      if (parent.changeId !== body.changeId) throw fail("invalid-ref", "Parent revision belongs to different ChangeId");
    }
    this.#revisions.set(revisionId, structuredClone(body));
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
}

export interface StackGraph {
  readonly topologicalOrder: readonly string[];
  closure(revisionIds: readonly string[]): readonly string[];
  downwardMergeSet(revisionId: string): readonly string[];
}

export function validateStack(stack: StackDefinition): StackGraph {
  const members = new Set(stack.revisionIds);
  if (members.size !== stack.revisionIds.length) throw fail("invalid-schema", "Duplicate stack revision");
  const dependencies = new Map<string, Set<string>>(stack.revisionIds.map((revisionId) => [revisionId, new Set()]));
  for (const edge of stack.edges) {
    if (!members.has(edge.from) || !members.has(edge.to)) throw fail("invalid-ref", "Stack edge references nonmember revision");
    if (edge.from === edge.to) throw fail("invalid-schema", "Stack cycle: self edge");
    if (["requires", "orders-after", "derived"].includes(edge.kind)) dependencies.get(edge.from)!.add(edge.to);
  }
  const order: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (revisionId: string): void => {
    if (visiting.has(revisionId)) throw fail("invalid-schema", `Stack cycle at ${revisionId}`);
    if (visited.has(revisionId)) return;
    visiting.add(revisionId);
    for (const dependency of [...dependencies.get(revisionId)!].sort()) visit(dependency);
    visiting.delete(revisionId); visited.add(revisionId); order.push(revisionId);
  };
  for (const revisionId of stack.revisionIds) visit(revisionId);
  const closure = (revisionIds: readonly string[]): readonly string[] => {
    const selected = new Set<string>();
    const select = (revisionId: string): void => {
      if (!members.has(revisionId)) throw fail("missing-dependency", `Revision is not in stack: ${revisionId}`);
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
  readonly reviewId: string;
  readonly revisionIds: readonly string[];
  readonly baseFrontier: readonly string[];
  readonly baseTreeDigest: string;
  readonly resultingTreeDigest: string;
  readonly overlaps: ReviewBundle["overlaps"];
  readonly conflicts: ReviewBundle["conflictIds"];
  readonly gateDigest: string;
  readonly priorBundle?: ReviewBundle;
}): ReviewBundle {
  const bundle: ReviewBundle = Object.freeze({
    reviewId: input.reviewId as ReviewBundle["reviewId"], revisionIds: [...input.revisionIds], baseFrontier: [...input.baseFrontier],
    baseTreeDigest: input.baseTreeDigest, resultingTreeDigest: input.resultingTreeDigest, overlaps: structuredClone(input.overlaps),
    conflictIds: [...input.conflicts], gateDigest: input.gateDigest,
  });
  if (input.priorBundle !== undefined && canonical({ ...bundle, reviewId: undefined }) !== canonical({ ...input.priorBundle, reviewId: undefined })) {
    throw fail("stale-review", "Review weave evidence changed; create a new bundle revision");
  }
  return bundle;
}

export function createMergePlan(input: MergePlan): MergePlan {
  if (new Set(input.revisionIds).size !== input.revisionIds.length || new Set(input.dependencyClosure).size !== input.dependencyClosure.length) throw fail("invalid-schema", "Merge plan contains duplicate revisions");
  return Object.freeze(structuredClone(input));
}

export interface MergeApplicationContext {
  readonly currentTargetRevisionId: string;
  readonly availableRevisionIds: readonly string[];
  readonly gateDigest: string;
  readonly unresolvedConflictIds: readonly string[];
  readonly protectedTarget: boolean;
  readonly resultDigest: string;
}

export interface AppliedMerge { readonly mode: MergePlan["mode"]; readonly resultRevisionProvenance: readonly string[]; readonly resultDigest: string }

export function applyMergePlan(plan: MergePlan, context: MergeApplicationContext): AppliedMerge {
  if (context.currentTargetRevisionId !== plan.targetRevisionId) throw fail("stale-head", "Merge target moved");
  const selected = new Set(plan.revisionIds);
  if (plan.dependencyClosure.some((revisionId) => !selected.has(revisionId) || !context.availableRevisionIds.includes(revisionId))) throw fail("missing-dependency", "Merge plan dependency closure is unavailable or nonclosed");
  if (context.gateDigest !== plan.gateDigest) throw fail("stale-gate", "Merge gate evidence changed");
  if (context.protectedTarget && context.unresolvedConflictIds.length > 0) throw fail("unresolved-conflict", "Protected merge has unresolved conflicts");
  if (context.resultDigest !== plan.expectedResultDigest) throw fail("integrity-failure", "Merge result digest does not match plan");
  return Object.freeze({ mode: plan.mode, resultRevisionProvenance: [...plan.revisionIds], resultDigest: context.resultDigest });
}

export interface ConflictResolutionProvider {
  propose(conflict: DurableConflict): { readonly content: unknown; readonly confidence?: number };
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
    if (conflict.status !== "proposed" || !conflict.resolutionRevisionIds.includes(resolutionRevisionId)) throw fail("stale-revision", "Resolution was not proposed for this conflict");
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
    this.#conflicts.set(conflictId, Object.freeze({ ...conflict, status, resolutionRevisionIds: [...new Set([...conflict.resolutionRevisionIds, resolutionRevisionId])] }));
  }
  private required(conflictId: string): DurableConflict { const conflict = this.#conflicts.get(conflictId); if (conflict === undefined) throw fail("missing-object", `Missing conflict: ${conflictId}`); return conflict; }
}

function canonical(value: unknown): string { return JSON.stringify(sortValue(value)); }
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, sortValue(item)]));
  return value;
}
function fail(code: ConstructorParameters<typeof ProtocolError>[0], message: string): ProtocolError { return new ProtocolError(code, `${code}: ${message}`); }
