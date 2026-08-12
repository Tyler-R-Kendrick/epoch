import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus, platform, arch, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import process from "node:process";

if (process.env.EPOCH_RUN_FRONTIER_BENCHMARKS !== "1") {
  process.stdout.write(JSON.stringify({ schemaVersion: 1, suite: "frontier-convergence", status: "skipped", reason: "set EPOCH_RUN_FRONTIER_BENCHMARKS=1" }) + "\n");
  process.exit(0);
}

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const { createChunkManifest, encodeChunkManifest } = require(join(root, "packages/Epoch.Core/dist/chunks.js"));
const { MemoryObjectStore, objectIdFor } = require(join(root, "packages/Epoch.Core/dist/object-store.js"));
const { fetchVerifiedRange } = require(join(root, "packages/Epoch.Core/dist/blob-storage.js"));
const { planSyncV2, SYNC_V2_PROTOCOL } = require(join(root, "packages/Epoch.Core/dist/sync-v2.js"));
const { MemoryWorkspaceProvider } = require(join(root, "packages/Epoch.Core/dist/workspace.js"));
const { OperationDag } = require(join(root, "packages/Epoch.Core/dist/convergence-transactions.js"));
const { acceptSplit, applyMergePlan, buildReviewBundle, createMergePlan, validateStack } = require(join(root, "packages/Epoch.Core/dist/convergence-changes.js"));
const { MirrorCoordinator, createMirrorRule } = require(join(root, "packages/Epoch.Forge/dist/mirror.js"));
const { AuthorityLedger } = require(join(root, "packages/Epoch.Identity.Bridge/dist/authority/index.js"));

const fixture = Object.freeze({ objects: 2_000, workspaceFiles: 250, fragments: 200, stackRevisions: 500, mirrorOperations: 1_000, budgetReservations: 500, blobBytes: 2_000_000 });
const sandbox = mkdtempSync(join(tmpdir(), "epoch-frontier-benchmark-"));
let operationRun = 0;
try {
  const metrics = {};
  metrics.calibration = await measure(async () => { createHash("sha256").update(Buffer.alloc(256 * 1024, 0x5a)).digest(); });
  metrics.metadataClone = await measure(async () => {
    const ids = Array.from({ length: fixture.objects }, (_, index) => createHash("sha256").update(`object-${index}`).digest("hex"));
    const plan = planSyncV2({ protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: ids.slice(0, 500) }, { protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: ids, cursor: "resume-1" });
    assert.equal(plan.wantChunks.length, 1_500); assert.equal(plan.resumeCursor, "resume-1");
  });
  metrics.filteredHydrate = await measure(async () => {
    const bytes = Buffer.alloc(fixture.blobBytes, 0x31); const manifest = createChunkManifest(bytes, "application/octet-stream"); const store = new MemoryObjectStore();
    for (const chunk of manifest.chunks) await store.put(chunk.sha256, bytes.subarray(chunk.offset, chunk.offset + chunk.length));
    const manifestBytes = encodeChunkManifest(manifest); const manifestId = objectIdFor(manifestBytes); await store.put(manifestId, manifestBytes);
    const result = await fetchVerifiedRange({ blobSha256: manifest.blobSha256, size: bytes.length, entityType: manifest.entityType, storage: { kind: "chunk-manifest", manifestSha256: manifestId } }, store, 400_000, 800_000);
    assert.equal(result.status, "ok");
  }, 3);
  metrics.chunkReuse = await measure(async () => {
    const first = createChunkManifest(Buffer.concat([Buffer.alloc(1_000_000, 0x41), Buffer.alloc(1_000_000, 0x42)]), "application/octet-stream");
    const second = createChunkManifest(Buffer.concat([Buffer.alloc(1_000_000, 0x41), Buffer.alloc(1_000_000, 0x43)]), "application/octet-stream");
    const prior = new Set(first.chunks.map((chunk) => chunk.sha256)); const reused = second.chunks.filter((chunk) => prior.has(chunk.sha256)); assert.ok(reused.length > 0);
  }, 3);
  metrics.workspaceCreateCapture = await measure(async () => {
    const workspace = new MemoryWorkspaceProvider("benchmark");
    for (let index = 0; index < fixture.workspaceFiles; index += 1) await workspace.write(`src/file-${index}.txt`, Buffer.from(`content-${index}`));
    for (let index = 0; index < fixture.workspaceFiles; index += 1) assert.ok((await workspace.read(`src/file-${index}.txt`)).length > 0);
  });
  metrics.splitWeaveMerge = await measure(async () => {
    const revisionIds = Array.from({ length: fixture.stackRevisions }, (_, index) => `revision-${index}`);
    const stack = { stackId: id("stack", "s"), revisionIds, edges: revisionIds.slice(1).map((revision, index) => ({ from: revision, to: revisionIds[index], kind: "requires" })) };
    const graph = validateStack(stack);
    assert.equal(graph.closure([revisionIds.at(-1)]).length, fixture.stackRevisions);
    const fragments = Array.from({ length: fixture.fragments }, (_, index) => fragment(index)); const source = revision(fragments);
    const groups = Array.from({ length: 10 }, (_, group) => fragments.filter((_, index) => index % 10 === group));
    const accepted = acceptSplit(source, { sourceRevisionId: "source", groups: groups.map((items) => ({ fragmentIds: items.map((item) => item.fragmentId), risk: "low", reason: "benchmark" })) }, groups);
    assert.equal(accepted.reconstructedFragments.length, fixture.fragments);
    const bundle = buildReviewBundle({ reviewId: id("review", "r"), revisionIds, baseFrontier: ["base"], baseTreeDigest: digest("a"), resultingTreeDigest: digest("b"), overlaps: [], conflicts: [], gateDigest: digest("c") });
    const plan = createMergePlan({ mergePlanId: id("merge-plan", "m"), targetRevisionId: "target", revisionIds, dependencyClosure: revisionIds, reviewBundleRevisionId: bundle.reviewId, resolutionRevisionIds: [], gateDigest: bundle.gateDigest, mode: "squash", expectedResultDigest: digest("b") }, { stack });
    assert.equal(applyMergePlan(plan, { currentTargetRevisionId: "target", availableRevisionIds: revisionIds, stack, reviewBundleRevisionId: bundle.reviewId, acceptedResolutionRevisionIds: [], gateDigest: bundle.gateDigest, unresolvedConflictIds: [], protectedTarget: true, resultDigest: digest("b") }).resultRevisionProvenance.length, fixture.stackRevisions);
  }, 3);
  metrics.manyRefMirror = await measure(async () => {
    const rule = createMirrorRule({ ruleId: "benchmark", direction: "import", authority: "git-primary", sourceRef: "refs/heads/main", destinationRef: "refs/heads/main", credentialRef: "credential", force: "deny", deletion: "deny" }); const coordinator = new MirrorCoordinator([rule]);
    for (let index = 0; index < fixture.mirrorOperations; index += 1) assert.equal(coordinator.reconcile({ operationId: `operation-${index}`, ruleId: rule.ruleId, sourceOid: index.toString(16).padStart(40, "0") }).outcome, "apply");
  });
  metrics.operationRestore = await measure(async () => {
    const operationRoot = join(sandbox, `operations-${operationRun++}`); const dag = new OperationDag(operationRoot); let parents = [];
    for (let index = 0; index < 250; index += 1) { const item = dag.record({ operationId: `operation-${index}`, parents, command: "capture", args: [`file-${index}`], timestamp: index }); parents = [item.operationId]; }
    assert.equal(dag.restore("operation-100", "restore-1", 300).restores, "operation-100"); rmSync(operationRoot, { recursive: true, force: true });
  }, 3);
  metrics.budgetContention = await measure(async () => {
    const ledger = new AuthorityLedger({ now: () => 1_000 }); const owner = "epoch:principal:owner"; const agent = "epoch:principal:agent";
    ledger.registerPrincipal({ principalId: owner, kind: "human", keys: [{ keyId: "owner-key", algorithm: "Ed25519", purpose: "root", state: "active" }] }); ledger.registerPrincipal({ principalId: agent, kind: "agent", keys: [{ keyId: "agent-key", algorithm: "Ed25519", purpose: "signing", state: "active" }] });
    ledger.issueGrant({ grantId: "budget", issuerId: owner, subjectId: agent, actions: ["model.call"], resources: ["model:test"], expiresAt: 5_000, budget: { unit: "model-call", limit: fixture.budgetReservations } });
    let version = 0; for (let index = 0; index < fixture.budgetReservations; index += 1) version = ledger.reserve({ reservationId: `reservation-${index}`, grantId: "budget", unit: "model-call", amount: 1, expectedVersion: version, leaseMs: 1_000 }).version;
    assert.equal(version, fixture.budgetReservations);
  }, 3);

  for (const metric of Object.values(metrics)) metric.relativeToCalibration = metric.medianMs / metrics.calibration.medianMs;
  const runner = { node: process.version, platform: platform(), arch: arch(), cpuModel: cpus()[0]?.model ?? "unknown", cpuCount: cpus().length };
  const output = { schemaVersion: 1, suite: "frontier-convergence", status: "passed", generatedAt: new Date().toISOString(), runner, fixture, guard: compareBaseline(process.env.EPOCH_FRONTIER_BASELINE, runner, metrics), metrics };
  const serialized = JSON.stringify(output, null, 2) + "\n";
  if (process.argv[2]) writeFileSync(resolve(process.argv[2]), serialized, "utf8");
  process.stdout.write(serialized);
} finally { rmSync(sandbox, { recursive: true, force: true }); }

async function measure(run, samples = 5) {
  await run(); const durations = [];
  for (let index = 0; index < samples; index += 1) { const start = performance.now(); await run(); durations.push(performance.now() - start); }
  durations.sort((left, right) => left - right); return { unit: "ms", samples, medianMs: durations[Math.floor(durations.length / 2)], p95Ms: durations[Math.ceil(durations.length * 0.95) - 1], relativeToCalibration: 0 };
}
function compareBaseline(path, runner, metrics) {
  if (!path) return { applied: false, maxMedianRatio: 4, reason: "no baseline requested" };
  const baseline = JSON.parse(readFileSync(resolve(path), "utf8")); const sameMachine = baseline.runner?.platform === runner.platform && baseline.runner?.arch === runner.arch && baseline.runner?.cpuModel === runner.cpuModel && String(baseline.runner?.node).split(".")[0] === runner.node.split(".")[0];
  if (!sameMachine) return { applied: false, maxMedianRatio: 4, reason: "runner fingerprint differs" };
  const ratios = Object.fromEntries(Object.entries(metrics).map(([metricName, metric]) => [metricName, metric.medianMs / baseline.metrics[metricName].medianMs]));
  const worst = Math.max(...Object.values(ratios)); if (worst > 4) throw new Error(`frontier benchmark regression ${worst.toFixed(2)}x exceeds 4x same-machine guard`);
  return { applied: true, maxMedianRatio: 4, ratios };
}
function id(kind, token) { return `epoch:${kind}:${token.repeat(52)}`; }
function digest(token) { return token.repeat(64); }
function fragment(index) { const token = `${"z".repeat(46)}${index.toString().padStart(6, "0")}`; const digestToken = "abcdefghijklmnopqrstuvwxyz234567"[index % 32]; return { fragmentId: `epoch:fragment:${token}`, kind: "text", path: `src/file-${index}.txt`, precondition: { kind: "absent" }, resultDigest: digest(digestToken), contentRef: `sha256:${digest(digestToken)}`, order: index, dependencies: [], provenance: { principalId: id("principal", "p") }, mergeStrategy: "text" }; }
function revision(fragments) { return { changeId: id("change", "c"), baseFrontier: ["base"], baseTreeDigest: digest("a"), parentRevisionIds: [], fragments, resultingTreeDigest: digest("b"), authorPrincipalId: id("principal", "p") }; }
