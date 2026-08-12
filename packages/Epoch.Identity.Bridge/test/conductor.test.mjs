import assert from "node:assert/strict";
import test from "node:test";
import { createEvidenceEnvelope, verifyEvidenceEnvelope } from "../dist/conductor/evidence.js";
import { EntireCheckpointSession, OpaqueCheckpointSession } from "../dist/conductor/session.js";
import { DisabledAiProvider, GuardedAiProvider } from "../dist/conductor/provider.js";
import { LocalEd25519AuthoritySigner } from "../dist/authority/signers.js";

test("evidence envelope binds statement digest and optional transparency references", async () => {
  const signer = new LocalEd25519AuthoritySigner(new Uint8Array(32).fill(9), "did:key:evidence#sign");
  const envelope = await createEvidenceEnvelope({
    statement: { _type: "https://in-toto.io/Statement/v1", subject: [{ name: "change-1", digest: { sha256: "ab".repeat(32) } }], predicateType: "https://epoch.dev/evidence/v1", predicate: { outcome: "passed" } },
    signer,
    sigstoreBundleRef: "sha256:" + "cd".repeat(32), scittReceiptRef: "urn:ietf:params:scitt:receipt:fixture",
  });
  assert.equal(envelope.schemaVersion, 1);
  assert.match(envelope.statementDigest, /^[0-9a-f]{64}$/u);
  assert.equal(await verifyEvidenceEnvelope(envelope), true);
  assert.equal(await verifyEvidenceEnvelope({ ...envelope, statement: { ...envelope.statement, predicate: { outcome: "failed" } } }), false);
  assert.equal(await verifyEvidenceEnvelope({ ...envelope, signature: { ...envelope.signature, value: "00".repeat(64) } }), false);
});

test("private session boundary supports Entire checkpoints and opaque fallback without content", async () => {
  const entire = new EntireCheckpointSession({ checkpoint: async (request) => ({ checkpointId: "entire:42", digest: request.digest }) });
  assert.deepEqual(await entire.checkpoint({ sessionId: "session-1", digest: "ab".repeat(32), byteLength: 12 }),
    { kind: "entire", checkpointId: "entire:42", digest: "ab".repeat(32) });
  const opaque = new OpaqueCheckpointSession();
  const result = await opaque.checkpoint({ sessionId: "session-secret", digest: "cd".repeat(32), byteLength: 99 });
  assert.equal(result.kind, "opaque");
  assert.equal(JSON.stringify(result).includes("session-secret"), false);
});

test("AI providers are disabled by default and require grant, budget, disclosure, schema, and bounded output", async () => {
  await assert.rejects(() => new DisabledAiProvider().generate({ promptDigest: "ab".repeat(32), promptByteLength: 20 }), /disabled/u);
  const telemetry = [];
  const provider = new GuardedAiProvider({ providerId: "fixture", modelId: "fixture-v1", maxOutputBytes: 200,
    invoke: async () => ({ output: { summary: "safe" }, usage: { inputTokens: 4, outputTokens: 2 } }),
    telemetry: (event) => telemetry.push(event) });
  const result = await provider.generate({ promptDigest: "ab".repeat(32), promptByteLength: 20,
    grant: { allow: true }, budgetReservationId: "reserve-1", disclosureAccepted: true,
    outputSchema: { type: "object", required: ["summary"], properties: { summary: { type: "string" } } } });
  assert.equal(result.authoritativeMutation, false);
  assert.equal(result.byteLength > 0, true);
  assert.match(result.digest, /^[0-9a-f]{64}$/u);
  assert.equal(JSON.stringify(telemetry).includes("safe"), false);
  await assert.rejects(() => provider.generate({ promptDigest: "ab".repeat(32), promptByteLength: 20,
    grant: { allow: false, reason: "denied" }, budgetReservationId: "reserve-1", disclosureAccepted: true }), /grant/u);
  await assert.rejects(() => provider.generate({ promptDigest: "ab".repeat(32), promptByteLength: 20,
    grant: { allow: true }, budgetReservationId: "", disclosureAccepted: true }), /budget/u);
  await assert.rejects(() => provider.generate({ promptDigest: "ab".repeat(32), promptByteLength: 20,
    grant: { allow: true }, budgetReservationId: "reserve-1", disclosureAccepted: false }), /disclosure/u);
});
