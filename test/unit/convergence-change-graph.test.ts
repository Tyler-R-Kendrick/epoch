import assert from "node:assert/strict";
import {
  ChangeGraph,
  ConflictLedger,
  acceptSplit,
  applyMergePlan,
  buildReviewBundle,
  createMergePlan,
  validateStack,
} from "../../packages/Epoch.Core/src/convergence-changes";
import type { ChangeFragment, ChangeRevisionBody, DurableConflict, SplitPlan, StackDefinition } from "../../packages/Epoch.Protocol/src/index";

export function runConvergenceChangeGraphTests(): void {
  test("CONV-CHANGE-001 stable ChangeId supports multi-parent revisions", stableLineage);
  test("CONV-STACK-001 stack graph closes and topologically sorts exact revisions", stackClosure);
  test("CONV-SPLIT-001 split acceptance reconstructs without dropping ambiguous fragments", splitReconstruction);
  test("CONV-REVIEW-001 review evidence invalidates when exact weave changes", reviewEvidence);
  test("CONV-MERGE-001 stale target nonclosed gates and conflicts fail closed", mergePreconditions);
  test("CONV-MERGE-002 squash preserves exact source revision provenance", squashProvenance);
  test("CONV-CONFLICT-001 multi-side conflicts carry in drafts and block protected merge", multiSideConflicts);
  test("CONV-CONFLICT-002 commutation requires both orders and canonical equality", conservativeCommutation);
  test("CONV-CONFLICT-003 untrusted provider output cannot mutate or auto-accept", providerDenial);
}

function test(name: string, run: () => void): void { try { run(); } catch (error) { throw new Error(name, { cause: error }); } }

function stableLineage(): void {
  const changeId = id("change", "a");
  const graph = new ChangeGraph();
  graph.add("rev-1", revision(changeId, [], [fragment("a", "a.txt", "add", "a")]));
  graph.add("rev-2", revision(changeId, ["rev-1"], [fragment("b", "b.txt", "add", "b")]));
  graph.add("rev-3", revision(changeId, ["rev-1"], [fragment("c", "c.txt", "add", "c")]));
  graph.add("rev-4", revision(changeId, ["rev-2", "rev-3"], [fragment("d", "d.txt", "add", "d")]));
  assert.equal(graph.changeIdOf("rev-4"), changeId);
  assert.deepEqual(graph.ancestors("rev-4"), ["rev-1", "rev-2", "rev-3"]);
  assert.throws(() => graph.add("rev-cycle", revision(changeId, ["rev-cycle"], [fragment("e", "e.txt", "add", "e")])), /cycle/u);
}

function stackClosure(): void {
  const stack: StackDefinition = {
    stackId: id("stack", "a") as StackDefinition["stackId"],
    revisionIds: ["r1", "r2", "r3"],
    edges: [
      { from: "r2", to: "r1", kind: "requires" },
      { from: "r3", to: "r2", kind: "derived" },
      { from: "r3", to: "r1", kind: "orders-after" },
    ],
  };
  const graph = validateStack(stack);
  assert.deepEqual(graph.topologicalOrder, ["r1", "r2", "r3"]);
  assert.deepEqual(graph.closure(["r3"]), ["r1", "r2", "r3"]);
  assert.deepEqual(graph.downwardMergeSet("r2"), ["r1", "r2"]);
  assert.throws(() => validateStack({ ...stack, edges: [...stack.edges, { from: "r1", to: "r3", kind: "requires" }] }), /cycle/u);
}

function splitReconstruction(): void {
  const source = revision(id("change", "a"), [], [
    fragment("a", "a.txt", "add", "a"), fragment("b", "b.txt", "text", "b"), fragment("c", "c.bin", "binary", "c"),
  ]);
  const plan: SplitPlan = {
    sourceRevisionId: "source-rev",
    groups: [
      { fragmentIds: [source.fragments[0]!.fragmentId], risk: "low", reason: "independent add" },
      { fragmentIds: [source.fragments[1]!.fragmentId, source.fragments[2]!.fragmentId], risk: "ambiguous", reason: "binary/text coupling unknown" },
    ],
  };
  const accepted = acceptSplit(source, plan, [[source.fragments[0]!], [source.fragments[1]!, source.fragments[2]!]]);
  assert.deepEqual(accepted.reconstructedFragments, source.fragments);
  assert.throws(() => acceptSplit(source, plan, [[source.fragments[0]!], [source.fragments[1]!]]), /drop|reconstruct/u);
}

function reviewEvidence(): void {
  const bundle = buildReviewBundle({ reviewId: id("review", "a"), revisionIds: ["r1", "r2"], baseFrontier: ["base"], baseTreeDigest: digest("a"), resultingTreeDigest: digest("b"), overlaps: [], conflicts: [], gateDigest: digest("c") });
  assert.equal(bundle.revisionIds[0], "r1");
  assert.throws(() => buildReviewBundle({
    reviewId: bundle.reviewId, revisionIds: ["r2", "r1"], baseFrontier: bundle.baseFrontier,
    baseTreeDigest: bundle.baseTreeDigest, resultingTreeDigest: bundle.resultingTreeDigest,
    overlaps: bundle.overlaps, conflicts: bundle.conflictIds, gateDigest: bundle.gateDigest, priorBundle: bundle,
  }), /stale-review/u);
}

function mergePreconditions(): void {
  const plan = createMergePlan({ mergePlanId: id("merge-plan", "a") as `epoch:merge-plan:${string}`, targetRevisionId: "target", revisionIds: ["r1"], dependencyClosure: ["r1"], reviewBundleRevisionId: "review-event", resolutionRevisionIds: [], gateDigest: digest("a"), mode: "merge", expectedResultDigest: digest("b") });
  const base = { currentTargetRevisionId: "target", availableRevisionIds: ["r1"], gateDigest: digest("a"), unresolvedConflictIds: [], protectedTarget: true, resultDigest: digest("b") };
  assert.equal(applyMergePlan(plan, base).resultRevisionProvenance.length, 1);
  assert.throws(() => applyMergePlan(plan, { ...base, currentTargetRevisionId: "moved" }), /stale-head/u);
  assert.throws(() => applyMergePlan({ ...plan, dependencyClosure: ["r1", "r2"] }, base), /missing-dependency/u);
  assert.throws(() => applyMergePlan(plan, { ...base, gateDigest: digest("c") }), /stale-gate/u);
  assert.throws(() => applyMergePlan(plan, { ...base, unresolvedConflictIds: [id("conflict", "a")] }), /unresolved-conflict/u);
}

function squashProvenance(): void {
  const plan = createMergePlan({ mergePlanId: id("merge-plan", "a") as `epoch:merge-plan:${string}`, targetRevisionId: "target", revisionIds: ["r1", "r2"], dependencyClosure: ["r1", "r2"], reviewBundleRevisionId: "review-event", resolutionRevisionIds: [], gateDigest: digest("a"), mode: "squash", expectedResultDigest: digest("b") });
  const result = applyMergePlan(plan, { currentTargetRevisionId: "target", availableRevisionIds: ["r1", "r2"], gateDigest: digest("a"), unresolvedConflictIds: [], protectedTarget: true, resultDigest: digest("b") });
  assert.deepEqual(result.resultRevisionProvenance, ["r1", "r2"]);
  assert.equal(result.mode, "squash");
}

function multiSideConflicts(): void {
  const conflict: DurableConflict = { conflictId: id("conflict", "a") as DurableConflict["conflictId"], sideRevisionIds: ["r1", "r2", "r3"], status: "unresolved", resolutionRevisionIds: [] };
  const ledger = new ConflictLedger([conflict]);
  assert.deepEqual(ledger.draftState([conflict.conflictId]).carriedConflictIds, [conflict.conflictId]);
  assert.throws(() => ledger.assertMergeable([conflict.conflictId], true), /unresolved-conflict/u);
  ledger.propose(conflict.conflictId, "resolution-1", "alice");
  assert.equal(ledger.get(conflict.conflictId)?.status, "proposed");
  ledger.accept(conflict.conflictId, "resolution-1", "maintainer");
  assert.doesNotThrow(() => ledger.assertMergeable([conflict.conflictId], true));
}

function conservativeCommutation(): void {
  const appendA = (value: string) => `${value}A`;
  const appendB = (value: string) => `${value}B`;
  assert.equal(ConflictLedger.commute("", appendA, appendB), false);
  const addA = (value: string) => [...new Set([...value, "A"])].sort().join("");
  const addB = (value: string) => [...new Set([...value, "B"])].sort().join("");
  assert.equal(ConflictLedger.commute("", addA, addB), true);
  assert.equal(ConflictLedger.commute("", () => { throw new Error("bad"); }, addB), false);
}

function providerDenial(): void {
  const conflict: DurableConflict = { conflictId: id("conflict", "a") as DurableConflict["conflictId"], sideRevisionIds: ["r1", "r2"], status: "unresolved", resolutionRevisionIds: [] };
  const ledger = new ConflictLedger([conflict]);
  const proposal = ledger.requestProviderProposal(conflict.conflictId, { propose: () => ({ content: "resolved", confidence: 1, autoAccept: true } as never) });
  assert.equal(proposal.trusted, false);
  assert.equal(ledger.get(conflict.conflictId)?.status, "unresolved");
}

function revision(changeId: string, parents: readonly string[], fragments: readonly ChangeFragment[]): ChangeRevisionBody {
  return { changeId: changeId as ChangeRevisionBody["changeId"], baseFrontier: ["base"], baseTreeDigest: digest("0"), parentRevisionIds: parents, fragments, resultingTreeDigest: digest("f"), authorPrincipalId: id("principal", "a") as ChangeRevisionBody["authorPrincipalId"] };
}
function fragment(token: string, path: string, kind: ChangeFragment["kind"], digestToken: string): ChangeFragment {
  return { fragmentId: id("fragment", token) as ChangeFragment["fragmentId"], kind, path, precondition: { kind: "absent" }, resultDigest: digest(digestToken), contentRef: `sha256:${digest(digestToken)}`, order: 0, dependencies: [], provenance: { principalId: id("principal", "a") as ChangeFragment["provenance"]["principalId"] }, mergeStrategy: kind === "binary" ? "binary-replace" : kind === "text" ? "text" : "exact" };
}
function id(kind: string, token: string): string { return `epoch:${kind}:${token.repeat(52)}`; }
function digest(token: string): string { return token.repeat(64); }
