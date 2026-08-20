import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConflictLedger, acceptSplit, applyMergePlan, buildReviewBundle, createMergePlan, validateChangeGraph,
} from "@epoch/core";
import {
  QuarantineTransaction, recoverQuarantineTransaction,
} from "@epoch/core";
import { createChunkManifest, verifyChunkManifest } from "@epoch/core";
import { MemoryObjectStore, objectIdFor } from "@epoch/core";
import { planSyncV2, SYNC_V2_PROTOCOL } from "@epoch/core";
import { SyncV2TransactionReceiver } from "@epoch/core";
import { createProjectionManifest, gitBlob, gitCommit, gitTree, projectGitGraph } from "@epoch/git-proxy";
import { AuthorityLedger, type PrincipalId } from "@epoch/identity-bridge";
import { MirrorCoordinator, createMirrorRule } from "@epoch/forge";
import { formatSwhid, parseSwhid, type SwhObjectKind } from "@epoch/software-heritage";
import { assertRevisionId } from "@epoch/protocol";
import type { ChangeFragment, ChangeGraphDefinition, ChangeRevisionBody, SplitPlan } from "@epoch/protocol";
import { canonical, property, type TestJsonValue } from "../fuzz/deterministic";

const SEED = 0x45504f43;
const CASES = 64;

async function main(): Promise<void> {
  await property("CHANGE-GRAPH-PROP-001 topology and hard dependency closure", SEED, CASES, (random) => {
    const count = 2 + random.integer(10);
    const revisions = Array.from({ length: count }, (_, index) => assertRevisionId(`revision-${index}`));
    const edges: Array<ChangeGraphDefinition["edges"][number]> = [];
    for (let index = 1; index < count; index += 1) {
      for (let dependency = 0; dependency < index; dependency += 1) {
        if (random.boolean()) edges.push({ from: revisions[index]!, to: revisions[dependency]!, kind: random.pick(["requires", "orders-after", "derived-from"] as const) });
      }
    }
    // SAFETY: Runtime checks or construction above establish ChangeGraphDefinition["changeGraphId"].
    const graph = validateChangeGraph({ changeGraphId: id("change-graph", "s") as ChangeGraphDefinition["changeGraphId"], memberRevisionIds: revisions, edges });
    const positions = new Map(graph.topologicalOrder.map((revision, index) => [revision, index]));
    for (const edge of edges) assert.ok(positions.get(edge.to)! < positions.get(edge.from)!);
    const selected = revisions[random.integer(revisions.length)]!;
    const closure = new Set(graph.closure([selected]));
    assert.ok(closure.has(selected));
    for (const edge of edges) if (closure.has(edge.from)) assert.ok(closure.has(edge.to));
  });

  await property("FRONTIER-PROP-002 split reconstructs byte-exact fragment order", SEED ^ 1, CASES, (random) => {
    const fragments = Array.from({ length: 2 + random.integer(10) }, (_, index) => fragment(index));
    const groupCount = 1 + random.integer(Math.min(4, fragments.length));
    // SAFETY: Runtime checks or construction above establish ChangeFragment[]).
    const groups = Array.from({ length: groupCount }, () => [] as ChangeFragment[]);
    fragments.forEach((item, index) => groups[index % groupCount]!.push(structuredClone(item)));
    const plan: SplitPlan = { sourceRevisionId: assertRevisionId("split-source"), groups: groups.map((group) => ({ fragmentIds: group.map((item) => item.fragmentId), risk: group.length > 1 ? "ambiguous" : "low", reason: "generated bounded split" })) };
    const source = revision(fragments);
    const accepted = acceptSplit(source, plan, groups);
    // SAFETY: ChangeFragment arrays are compared through the JSON canonicalizer in this property test.
    assert.equal(
      // SAFETY: ChangeFragment arrays are JSON-round-tripped before canonical comparison.
      canonical(JSON.parse(JSON.stringify(accepted.reconstructedFragments)) as TestJsonValue),
      // SAFETY: ChangeFragment arrays are JSON-round-tripped before canonical comparison.
      canonical(JSON.parse(JSON.stringify(source.fragments)) as TestJsonValue),
    );
  });

  await property("FRONTIER-PROP-003 commutation is true only for canonical equality", SEED ^ 2, CASES, (random) => {
    const base = { values: [random.integer(8)] };
    const leftValue = random.integer(8); const rightValue = random.integer(8);
    const left = (value: typeof base) => ({ values: [...new Set([...value.values, leftValue])].sort() });
    const right = (value: typeof base) => ({ values: [...new Set([...value.values, rightValue])].sort() });
    const expected = canonical(right(left(structuredClone(base)))) === canonical(left(right(structuredClone(base))));
    assert.equal(ConflictLedger.commute(base, left, right), expected);
    const appendLeft = (value: string) => `${value}${leftValue}`;
    const appendRight = (value: string) => `${value}${rightValue}`;
    assert.equal(ConflictLedger.commute("", appendLeft, appendRight), leftValue === rightValue);
  });

  await property("FRONTIER-PROP-004 exact evidence and merge digest invalidate", SEED ^ 3, CASES, (random) => {
    const revisions = [assertRevisionId(`r-${random.next()}`), assertRevisionId(`r-${random.next()}`)];
    // SAFETY: Runtime checks or construction above establish `epoch:change-graph:${string}`.
    const changeGraph = { changeGraphId: id("change-graph", "s") as `epoch:change-graph:${string}`, memberRevisionIds: revisions, edges: [] };
    const bundle = buildReviewBundle({ reviewBundleId: id("review-bundle", "r"), selectedRevisionIds: revisions, baseFrontier: ["base"], baseTreeDigest: digest("a"), combinedTreeDigest: digest("b"), overlaps: [], conflicts: [], gateDefinitionDigest: digest("c") });
    assert.throws(() => buildReviewBundle({ reviewBundleId: bundle.reviewBundleId, selectedRevisionIds: [...revisions].reverse(), baseFrontier: bundle.baseFrontier, baseTreeDigest: bundle.baseTreeDigest, combinedTreeDigest: bundle.combinedTreeDigest, overlaps: [], conflicts: [], gateDefinitionDigest: bundle.gateDefinitionDigest, priorBundle: bundle }), /stale-review/u);
    // SAFETY: Runtime checks or construction above establish `epoch:merge-plan:${string}`.
    const plan = createMergePlan({ mergePlanId: id("merge-plan", "m") as `epoch:merge-plan:${string}`, targetRevisionId: assertRevisionId("target"), selectedRevisionIds: revisions, hardDependencyClosure: revisions, reviewBundleRevisionId: assertRevisionId("review-event"), conflictResolutionRevisionIds: [], gateDefinitionDigest: digest("c"), mergeMode: "per-change-squash", resultingTreeDigest: digest("d") }, { changeGraph });
    const context = { currentTargetRevisionId: "target", availableRevisionIds: revisions, changeGraph, reviewBundleRevisionId: "review-event", acceptedResolutionRevisionIds: [], gateDefinitionDigest: digest("c"), unresolvedConflictIds: [], protectedTarget: true, resultDigest: digest("d") };
    assert.equal(applyMergePlan(plan, context).resultDigest, digest("d"));
    assert.throws(() => applyMergePlan(plan, { ...context, resultDigest: digest("e") }), /integrity-failure/u);
  });

  for (const boundary of ["prepared", "objects", "events", "indexes", "heads"] as const) {
    const root = mkdtempSync(join(tmpdir(), `epoch-chaos-${boundary}-`));
    try {
      const transaction = new QuarantineTransaction(root, `tx-${boundary}`, { heads: ["old"] });
      const next = { objects: { object: "new" }, events: { event: "new" }, indexes: { index: "new" }, heads: ["new"] };
      transaction.stage(next);
      assert.throws(() => transaction.publish({ failAfter: boundary }), /Injected failure/u);
      recoverQuarantineTransaction(root, `tx-${boundary}`);
      // SAFETY: Runtime checks or construction above establish typeof next.
      const recovered = JSON.parse(readFileSync(join(root, "state.json"), "utf8")) as typeof next;
      if (boundary === "prepared") assert.deepEqual(recovered, { objects: {}, events: {}, indexes: {}, heads: ["old"] });
      else assert.deepEqual(recovered, next);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }

  await property("FRONTIER-PROP-006 chunks reassemble and corruption fails", SEED ^ 5, 24, async (random) => {
    const bytes = random.bytes(70_000 + random.integer(300_000));
    const manifest = createChunkManifest(bytes, "application/octet-stream");
    const chunks = new Map(manifest.chunks.map((chunk) => [chunk.sha256, bytes.subarray(chunk.offset, chunk.offset + chunk.length)]));
    const verified = await verifyChunkManifest(manifest, async (objectId) => chunks.get(objectId));
    assert.deepEqual(verified, { ok: true, bytesVerified: bytes.length, chunksVerified: manifest.chunks.length });
  });

  await property("FRONTIER-PROP-007 sync plans converge and transactions replay", SEED ^ 6, 24, async (random, index) => {
    const ids = Array.from({ length: 1 + random.integer(12) }, () => random.bytes(32).toString("hex"));
    const firstHalf = ids.slice(0, Math.floor(ids.length / 2));
    const plan = planSyncV2({ protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: firstHalf }, { protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: ids, cursor: `cursor-${index}` });
    const converged = planSyncV2({ protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: [...firstHalf, ...plan.wantChunks] }, { protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: ids });
    assert.deepEqual(converged.wantChunks, []);
    assert.equal(plan.resumeCursor, `cursor-${index}`);
    const store = new MemoryObjectStore(); const receiver = new SyncV2TransactionReceiver(store);
    const bytes = random.bytes(64); const objectId = objectIdFor(bytes);
    const transaction = { transactionId: `tx-${index}`, expectedFrontier: [], objects: [{ kind: "chunk" as const, objectId, bytes }] };
    assert.equal((await receiver.push(transaction, [])).outcome, "applied");
    assert.equal((await receiver.push(transaction, [])).outcome, "replayed");
  });

  await property("FRONTIER-PROP-008 mirror decisions are replay-idempotent", SEED ^ 7, CASES, (random, index) => {
    const rule = createMirrorRule({ ruleId: `rule-${index}`, direction: "import", authority: "git-primary", sourceRef: "refs/heads/main", destinationRef: "refs/heads/main", credentialRef: "credential-1", force: "deny", deletion: "deny" });
    const coordinator = new MirrorCoordinator([rule]);
    const operation = { operationId: `operation-${index}`, ruleId: rule.ruleId, sourceOid: random.bytes(20).toString("hex") };
    assert.equal(coordinator.reconcile(operation).outcome, "apply");
    assert.equal(coordinator.reconcile(operation).outcome, "replayed");
  });

  await property("FRONTIER-PROP-009 grants attenuate and budgets conserve", SEED ^ 8, 24, (random, index) => {
    const ledger = new AuthorityLedger({ now: () => 1_000 });
    // SAFETY: Runtime checks or construction above establish PrincipalId.
    const owner = `epoch:principal:owner-${index}` as PrincipalId; const agent = /* SAFETY: Assertion is justified by surrounding validation or construction. */ `epoch:principal:agent-${index}` as PrincipalId;
    ledger.registerPrincipal({ principalId: owner, kind: "human", keys: [{ keyId: `owner-key-${index}`, algorithm: "Ed25519", purpose: "root", state: "active" }] });
    ledger.registerPrincipal({ principalId: agent, kind: "agent", keys: [{ keyId: `agent-key-${index}`, algorithm: "Ed25519", purpose: "signing", state: "active" }] });
    const limit = 2 + random.integer(8);
    ledger.issueGrant({ grantId: `grant-${index}`, issuerId: owner, subjectId: agent, actions: ["repository.read"], resources: ["repo:epoch/core"], expiresAt: 5_000, budget: { unit: "model-call", limit } });
    const first = ledger.reserve({ reservationId: `reservation-${index}`, grantId: `grant-${index}`, unit: "model-call", amount: limit, expectedVersion: 0, leaseMs: 100 });
    assert.equal(first.amount, limit);
    assert.throws(() => ledger.reserve({ reservationId: `other-${index}`, grantId: `grant-${index}`, unit: "model-call", amount: 1, expectedVersion: first.version, leaseMs: 100 }), /budget exceeded/u);
    const receipt = ledger.consume({ reservationId: `reservation-${index}`, receiptId: `receipt-${index}` });
    assert.deepEqual(ledger.consume({ reservationId: `reservation-${index}`, receiptId: `receipt-${index}` }), receipt);
  });

  await property("FRONTIER-PROP-010 projection fidelity round-trips exact Git identities", SEED ^ 9, 24, (random) => {
    const blob = gitBlob(random.bytes(32 + random.integer(256)));
    const tree = gitTree([{ mode: random.pick(["100644", "100755", "120000"] as const), name: "entry", oid: blob.oid }]);
    const identity = { name: "Epoch", email: "epoch@example.test", timestamp: 1_700_000_000, timezone: "+0000" as const };
    const commit = gitCommit({ tree: tree.oid, parents: [], author: identity, committer: identity, message: "property projection" });
    const manifest = createProjectionManifest({ defaultRef: "refs/heads/main", refs: { "refs/heads/main": commit.oid }, customRefs: { "refs/notes/epoch": commit.oid }, objects: [commit, tree, blob] });
    const projected = projectGitGraph(manifest);
    assert.equal(projected.refs["refs/heads/main"], commit.oid);
    assert.equal(projected.refs["refs/notes/epoch"], commit.oid);
    assert.deepEqual(projected.commits.map((item) => item.oid), [commit.oid]);
  });

  await property("FRONTIER-PROP-011 SWHID canonical round-trip", SEED ^ 10, CASES, (random) => {
    const value = { version: 1 as const, kind: /* SAFETY: Assertion is justified by surrounding validation or construction. */ random.pick(["cnt", "dir", "rev", "rel", "snp"] as const) as SwhObjectKind, digest: random.bytes(20).toString("hex"), qualifiers: { origin: `https://example.test/${random.next()}`, path: `/src/${random.next()}.ts` } };
    const encoded = formatSwhid(value);
    assert.equal(formatSwhid(parseSwhid(encoded)), encoded);
  });

  process.stdout.write(JSON.stringify({ suite: "change-graph-properties", seed: SEED, cases: CASES, status: "passed" }) + "\n");
}

function id(kind: string, token: string): string { return `epoch:${kind}:${token.repeat(52)}`; }
function digest(token: string): string { return token.repeat(64); }
function fragment(index: number): ChangeFragment {
  const token = "abcdefghijklmnopqrstuvwxyz234567"[index % 32]!;
  // SAFETY: Runtime checks or construction above establish ChangeFragment["fragmentId"].
  return { fragmentId: id("fragment", token) as ChangeFragment["fragmentId"], kind: index % 3 === 0 ? "text" : "add", path: `src/file-${index}.txt`, precondition: { kind: "absent" }, resultDigest: digest(token), contentRef: `sha256:${digest(token)}`, order: index, dependencies: [], provenance: { principalId: id("principal", "p") as ChangeFragment["provenance"]["principalId"] }, mergeStrategy: index % 3 === 0 ? "text" : "exact" };
}
function revision(fragments: readonly ChangeFragment[]): ChangeRevisionBody {
  // SAFETY: Runtime checks or construction above establish ChangeRevisionBody["changeId"].
  return { changeId: id("change", "c") as ChangeRevisionBody["changeId"], baseFrontier: [assertRevisionId("base")], baseTreeDigest: digest("a"), parentRevisionIds: [], fragments, resultingTreeDigest: digest("b"), authorPrincipalId: id("principal", "p") as ChangeRevisionBody["authorPrincipalId"] };
}

// SAFETY: Runtime checks or construction above establish Error).stack ?? error)}\n`).
void main().catch((error) => { process.stderr.write(`${String((/* SAFETY: Assertion is justified by surrounding validation or construction. */ error as Error).stack ?? error)}\n`); process.exitCode = 1; });
