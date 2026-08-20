import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FileSystemWorkspaceProvider,
  MemoryObjectStore,
  MemoryWorkspaceProvider,
  applySyncV2Batch,
  createChunkManifest,
  createObjectPromise,
  createRiftLaunchSpec,
  fetchVerifiedRange,
  objectIdFor,
} from "@epoch/core";
import { createMirrorRule, MirrorCoordinator, validateMirrorRemote, decodeF3Archive, encodeF3Archive, encodeNip34, decodeNip34, encodeRadicle, decodeRadicle, type ForgeObject } from "@epoch/forge";
import { gitCommit, gitProtocolEnvironment, parseRemoteHelperCommand, proposalRef } from "@epoch/git-proxy";
import { AuthorityLedger, GuardedAiProvider, type PrincipalId } from "@epoch/identity-bridge";
import { SaveCodeNowClient } from "@epoch/software-heritage";

async function main(): Promise<void> {
  await workspacePathsRejectTraversalAndSymlinkEscape();
  refsHeadersAndShellBoundariesRejectInjection();
  await objectsChunksAndRangesAreBounded();
  await remoteAndArchiveBoundariesFailClosed();
  grantsBudgetsAndFederationRejectReplayOrWidening();
  await providerOutputIsNonAuthoritativeAndBounded();
  process.stdout.write(JSON.stringify({ suite: "change-graph-security", status: "passed" }) + "\n");
}

async function workspacePathsRejectTraversalAndSymlinkEscape(): Promise<void> {
  const memory = new MemoryWorkspaceProvider();
  for (const path of ["../escape", "/absolute", "a//b", "a/../../escape", "a\\..\\escape"]) {
    await assert.rejects(memory.write(path, Buffer.from("denied")), /path|traversal/u);
  }
  const sandbox = mkdtempSync(join(tmpdir(), "epoch-workspace-security-"));
  const root = join(sandbox, "root"); const outside = join(sandbox, "outside");
  try {
    writeFileSync(outside, "sentinel", "utf8");
    const provider = new FileSystemWorkspaceProvider(root);
    await provider.write("inside.txt", Buffer.from("inside"));
    symlinkSync(outside, join(root, "escape"));
    await assert.rejects(provider.write("escape", Buffer.from("overwritten")), /symbolic link|provider root|workspace path/u);
    assert.equal(readFileSync(outside, "utf8"), "sentinel");
  } finally { rmSync(sandbox, { recursive: true, force: true }); }
}

function refsHeadersAndShellBoundariesRejectInjection(): void {
  for (const ref of ["../escape", "bad/ref", "bad ref", "bad\nref", "--upload-pack=sh"]) assert.throws(() => proposalRef(ref), /Invalid/u);
  for (const command of [
    "push refs/heads/main:refs/heads/main;touch-pwned",
    "push refs/heads/main:refs/heads/../../escape",
    "fetch deadbeef refs/heads/main;echo-pwned",
    "option uploadpack sh -c bad",
  ]) assert.throws(() => parseRemoteHelperCommand(command), /Invalid|Unsupported|unsafe/u);
  for (const header of ["version=2\nGIT_CONFIG_COUNT=1", "version=2;sh", "version=2:agent=x\rbad"]) {
    assert.throws(() => gitProtocolEnvironment({ "git-protocol": header }), /Invalid/u);
  }
  for (const executable of ["rift;sh", "rift\nsh", "$(bad)"]) assert.throws(() => createRiftLaunchSpec({ enabled: true, executable }), /unsafe/u);
  const identity = { name: "Epoch", email: "epoch@example.test", timestamp: 1_700_000_000, timezone: "+0000" as const };
  assert.throws(() => gitCommit({ tree: "a".repeat(40), parents: [], author: identity, committer: identity, message: "safe", notes: { "Epoch-Change": "safe\nInjected: true" } }), /Invalid Git commit note/u);
}

async function objectsChunksAndRangesAreBounded(): Promise<void> {
  const bytes = Buffer.from("bounded-object"); const objectId = objectIdFor(bytes);
  await assert.rejects(applySyncV2Batch(new MemoryObjectStore(), [
    { kind: "chunk", objectId, bytes }, { kind: "chunk", objectId, bytes },
  ], { maxObjects: 1 }), /object limit/u);
  await assert.rejects(applySyncV2Batch(new MemoryObjectStore(), [{ kind: "chunk", objectId, bytes }], { maxBytes: bytes.length - 1 }), /byte limit/u);
  const store = new MemoryObjectStore(); await store.put(objectId, bytes);
  const reference = { blobSha256: objectId, size: bytes.length, entityType: "application/octet-stream" };
  for (const [start, end] of [[-1, 1], [2, 1], [0, Number.MAX_SAFE_INTEGER], [0.5, 1]]) {
    assert.equal((await fetchVerifiedRange(reference, store, start, end)).status, "rejected");
  }
  const manifest = createChunkManifest(Buffer.from("chunked".repeat(20_000)), "application/octet-stream");
  assert.ok(manifest.chunks.every((chunk) => chunk.length > 0 && chunk.offset + chunk.length <= manifest.size));
}

async function remoteAndArchiveBoundariesFailClosed(): Promise<void> {
  for (const remote of ["http://example.test/repo", "https://user:secret@example.test/repo", "https://127.0.0.1/repo", "https://localhost/repo", "file:///etc/passwd"]) {
    await assert.rejects(validateMirrorRemote(remote), /HTTPS|credentials|private|loopback/u);
  }
  await assert.rejects(validateMirrorRemote("https://mirror.example.test/repo", async () => ["169.254.169.254"]), /private/u);
  for (const remote of ["https://127.0.0.1/object", "https://localhost/object", "https://169.254.169.254/meta"]) {
    assert.throws(() => createObjectPromise({ objectId: "a".repeat(64), size: 1, sources: [{ kind: "https", url: remote }] }), /private|loopback|object promise URL/u);
  }
  const rule = createMirrorRule({ ruleId: "safe", direction: "import", authority: "git-primary", sourceRef: "refs/heads/main", destinationRef: "refs/heads/main", credentialRef: "credential-1", force: "deny", deletion: "deny" });
  const coordinator = new MirrorCoordinator([rule]);
  assert.equal(coordinator.reconcile({ operationId: "force", ruleId: "safe", sourceOid: "a".repeat(40), force: true }).outcome, "rejected");
  assert.equal(coordinator.reconcile({ operationId: "delete", ruleId: "safe", sourceOid: "a".repeat(40), delete: true }).outcome, "rejected");
  assert.throws(() => encodeF3Archive([{ ...publicForgeObject(), visibility: "private" }]), /private/u);
  assert.throws(() => decodeF3Archive("../archive-entry"), /malformed/u);
  const archival = new SaveCodeNowClient({ transport: async () => ({ status: 200, body: { save_task_status: "succeeded", visit_status: "full" } }) });
  await assert.rejects(archival.save({ origin: "https://private.example.test/repo", visibility: "private" }), /private/u);
}

function grantsBudgetsAndFederationRejectReplayOrWidening(): void {
  const now = 1_000; const ledger = new AuthorityLedger({ now: () => now });
  // SAFETY: Runtime checks or construction above establish PrincipalId.
  const owner = "epoch:principal:owner" as PrincipalId; const agent = /* SAFETY: Assertion is justified by surrounding validation or construction. */ "epoch:principal:agent" as PrincipalId; const worker = /* SAFETY: Assertion is justified by surrounding validation or construction. */ "epoch:principal:worker" as PrincipalId;
  for (const [principalId, kind] of [[owner, "human"], [agent, "agent"], [worker, "agent"]] as const) ledger.registerPrincipal({ principalId, kind, keys: [{ keyId: `${kind}-${principalId}`, algorithm: "Ed25519", purpose: "signing", state: "active" }] });
  ledger.issueGrant({ grantId: "parent", issuerId: owner, subjectId: agent, actions: ["repository.read"], resources: ["repo:epoch/core"], paths: ["src/*"], expiresAt: 5_000, maxDelegationDepth: 1, budget: { unit: "model-call", limit: 2 } });
  assert.throws(() => ledger.issueGrant({ grantId: "widened", parentGrantId: "parent", issuerId: agent, subjectId: worker, actions: ["repository.read", "repository.write"], resources: ["repo:epoch/*"], paths: ["*"], expiresAt: 5_000, budget: { unit: "model-call", limit: 3 } }), /attenuate/u);
  ledger.issueGrant({ grantId: "child", parentGrantId: "parent", issuerId: agent, subjectId: worker, actions: ["repository.read"], resources: ["repo:epoch/core"], paths: ["src/lib/*"], expiresAt: 4_000, budget: { unit: "model-call", limit: 1 } });
  ledger.revokeGrant("parent", "compromised");
  assert.equal(ledger.authorize({ principalId: worker, grantId: "child", action: "repository.read", resource: "repo:epoch/core", path: "src/lib/a.ts" }).allow, false);
  const forge = publicForgeObject(); const event = encodeNip34(forge, { eventId: "event-1", pubkey: "pubkey", createdAt: 100, expiresAt: 2_000, audience: ["maintainers"] }).event; const seen = new Set<string>();
  const signatureEvidence = { verified: true as const, eventId: event.id, pubkey: event.pubkey, verifier: "security-fixture" };
  decodeNip34(event, { now, audience: "maintainers", seen, signatureEvidence });
  assert.throws(() => decodeNip34(event, { now, audience: "maintainers", seen, signatureEvidence }), /replay/u);
  const record = encodeRadicle(forge, { radicleId: "rad:zsafe", signedRef: "refs/rad/sigrefs/safe", sequence: 2 }).record;
  const signedRefEvidence = { verified: true as const, radicleId: record.radicleId, signedRef: record.signedRef, sequence: record.sequence, revision: record.revision, verifier: "security-fixture" };
  assert.throws(() => decodeRadicle(record, { lastSequence: 2, signedRefEvidence }), /stale/u);
}

async function providerOutputIsNonAuthoritativeAndBounded(): Promise<void> {
  const malformed = new GuardedAiProvider({ providerId: "test", modelId: "test", maxOutputBytes: 128, invoke: async () => ({ output: { approved: "yes", secret: "must-not-mutate" }, usage: { inputTokens: 1, outputTokens: 1 } }) });
  const input = { promptDigest: "a".repeat(64), promptByteLength: 1, grant: { allow: true }, budgetReservationId: "reservation", disclosureAccepted: true, outputSchema: { type: "object" as const, required: ["approved"], properties: { approved: { type: "boolean" as const } } } };
  await assert.rejects(malformed.generate(input), /schema/u);
  const valid = new GuardedAiProvider({ providerId: "test", modelId: "test", maxOutputBytes: 128, invoke: async () => ({ output: { approved: false }, usage: { inputTokens: 1, outputTokens: 1 } }) });
  assert.equal((await valid.generate(input)).authoritativeMutation, false);
  await assert.rejects(valid.generate({ ...input, grant: { allow: false, reason: "revoked" } }), /grant denied/u);
  await assert.rejects(valid.generate({ ...input, disclosureAccepted: false }), /disclosure/u);
}

function publicForgeObject(): ForgeObject { return { kind: "issue", objectId: "issue-1", repositoryId: "repo-1", title: "Issue", body: "body", state: "open", authorId: "alice", createdAt: 1, updatedAt: 2, visibility: "public", revision: "revision-1" }; }

// SAFETY: Runtime checks or construction above establish Error).stack ?? error)}\n`).
void main().catch((error) => { process.stderr.write(`${String((/* SAFETY: Assertion is justified by surrounding validation or construction. */ error as Error).stack ?? error)}\n`); process.exitCode = 1; });
