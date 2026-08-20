import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { bytesToHex } from "@noble/hashes/utils";
import { schnorr } from "@noble/curves/secp256k1";
import {
  AgentRequestPolicy,
  buildBindingRecord,
  buildSignedProtocolProof,
  didDocumentForCommitKey,
  encodeProtocolProofSlice,
  decodeProtocolProofSlice,
  InMemoryBindingRecordStore,
  LocalHotNostrSigner,
  MockAtProofVerifier,
  parseBindingEvent,
  ProtocolAtProofVerifier,
  publishBindingEvent,
  publishOwnerAgentAttestation,
  randomBindingNonce,
  revokeBindingCeremony,
  runBindingCeremony,
  StaticDidResolver,
  verifyBinding,
  WitnessIndexStore,
  ingestBindingCandidate,
  pairKey,
} from "@epoch/identity-bridge";

type World = {
  signer?: LocalHotNostrSigner;
  did?: string;
  epochAuthor?: string;
  ceremony?: Awaited<ReturnType<typeof runBindingCeremony>>;
  revoke?: Awaited<ReturnType<typeof revokeBindingCeremony>>;
  verdict?: Awaited<ReturnType<typeof verifyBinding>>;
  store?: WitnessIndexStore;
  policy?: AgentRequestPolicy;
  attestation?: Awaited<ReturnType<typeof publishOwnerAgentAttestation>>;
  agent?: LocalHotNostrSigner;
  lastDecision?: { allow: boolean; reason?: string };
  protocolPub?: string;
};

const world: World = {};

Given("a Nostr key and AT DID controlled by the same Epoch author", function () {
  world.signer = new LocalHotNostrSigner();
  world.did = "did:plc:feature";
  world.epochAuthor = "feature-author";
  world.store = new WitnessIndexStore();
});

When("the owner completes the binding ceremony with affirmative confirmation", async function () {
  assert.ok(world.signer && world.did && world.epochAuthor);
  const didResolver = new StaticDidResolver([{ id: world.did }]);
  const atProof = new MockAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();
  world.ceremony = await runBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: {
        epochAuthor: world.epochAuthor,
        nostrPubkey: world.signer.publicKey,
        atDid: world.did,
      },
    },
    signer: world.signer,
    atDid: world.did,
    epochAuthor: world.epochAuthor,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  await ingestBindingCandidate({
    store: world.store!,
    nostrEvent: world.ceremony.nostrEvent,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
});

Then("pure verifyBinding returns valid", function () {
  assert.ok(world.ceremony);
  assert.equal(world.ceremony.verification.valid, true);
});

Then("the witness index stores the full proof bundle", function () {
  assert.ok(world.signer && world.did && world.store);
  const entry = world.store.get(pairKey(world.signer.publicKey, world.did));
  assert.ok(entry);
  assert.ok(entry.proof.nostrEvent);
  assert.ok(entry.proof.carSliceB64);
});

Given("a valid binding that was later revoked at the next seqno", async function () {
  world.signer = new LocalHotNostrSigner();
  world.did = "did:plc:rollback";
  world.epochAuthor = "rollback-author";
  const didResolver = new StaticDidResolver([{ id: world.did }]);
  const atProof = new MockAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();
  world.ceremony = await runBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: {
        epochAuthor: world.epochAuthor,
        nostrPubkey: world.signer.publicKey,
        atDid: world.did,
      },
    },
    signer: world.signer,
    atDid: world.did,
    epochAuthor: world.epochAuthor,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  world.revoke = await revokeBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: {
        epochAuthor: world.epochAuthor,
        nostrPubkey: world.signer.publicKey,
        atDid: world.did,
      },
    },
    signer: world.signer,
    atDid: world.did,
    epochAuthor: world.epochAuthor,
    bindingNonce: parseBindingEvent(world.ceremony.nostrEvent).bindingNonce,
    nextSeqno: 2,
    prevEventId: world.ceremony.nostrEvent.id!,
    atStore,
    didResolver,
    atProofVerifier: atProof,
    nostrChain: [world.ceremony.nostrEvent],
  });
});

When("an attacker re-presents the pre-revocation pair against a pinned head", async function () {
  assert.ok(world.ceremony && world.revoke && world.signer && world.did);
  const didResolver = new StaticDidResolver([{ id: world.did }]);
  const atProof = new MockAtProofVerifier();
  const fields = parseBindingEvent(world.ceremony.nostrEvent);
  const record = buildBindingRecord({
    epochAuthorId: world.epochAuthor!,
    nostrPubkey: world.signer.publicKey,
    bindingNonce: fields.bindingNonce,
    seqno: 1,
  });
  atProof.register(world.did, world.signer.publicKey, {
    record,
    carSliceB64: Buffer.from(JSON.stringify(record)).toString("base64"),
    recordCid: "bafy1",
    commitRev: "3l1",
    commitSigCheck: "passed",
  });
  world.verdict = await verifyBinding({
    nostrEvent: world.ceremony.nostrEvent,
    carSliceB64: Buffer.from(JSON.stringify(record)).toString("base64"),
    didResolver,
    atProofVerifier: atProof,
    pinnedHead: {
      seqno: 2,
      id: world.revoke.nostrEvent.id!,
    },
  });
});

Then("verifyBinding fails with chain-regression", function () {
  assert.ok(world.verdict);
  assert.equal(world.verdict.valid, false);
  if (!world.verdict.valid) {
    assert.equal(world.verdict.reason, "chain-regression");
  }
});

Given("a Nostr binding event for pair A and an AT record for pair B", async function () {
  world.signer = new LocalHotNostrSigner();
  world.did = "did:plc:mix";
  const event = await runBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: {
        epochAuthor: "mix",
        nostrPubkey: world.signer.publicKey,
        atDid: world.did,
      },
    },
    signer: world.signer,
    atDid: world.did,
    epochAuthor: "mix",
    atStore: new InMemoryBindingRecordStore(),
    didResolver: new StaticDidResolver([{ id: world.did }]),
    atProofVerifier: new MockAtProofVerifier(),
  });
  // Overwrite verdict path: force mismatched AT record
  const didResolver = new StaticDidResolver([{ id: world.did }]);
  const atProof = new MockAtProofVerifier();
  const mismatched = buildBindingRecord({
    epochAuthorId: "mix",
    nostrPubkey: world.signer.publicKey,
    bindingNonce: randomBindingNonce(),
    seqno: 1,
  });
  atProof.register(world.did, world.signer.publicKey, {
    record: mismatched,
    carSliceB64: Buffer.from(JSON.stringify(mismatched)).toString("base64"),
    recordCid: "bafy2",
    commitRev: "3l2",
    commitSigCheck: "passed",
  });
  world.ceremony = event;
  world.verdict = await verifyBinding({
    nostrEvent: event.nostrEvent,
    carSliceB64: Buffer.from(JSON.stringify(mismatched)).toString("base64"),
    didResolver,
    atProofVerifier: atProof,
  });
});

When("verifyBinding runs", function () {
  assert.ok(world.verdict);
});

Then("the result is invalid with mismatch-fields", function () {
  assert.ok(world.verdict);
  assert.equal(world.verdict.valid, false);
  if (!world.verdict.valid) {
    assert.equal(world.verdict.reason, "mismatch-fields");
  }
});

Given("an owner→agent {int} attestation with limited scope", async function (_kind: number) {
  world.signer = new LocalHotNostrSigner();
  world.agent = new LocalHotNostrSigner();
  world.attestation = await publishOwnerAgentAttestation({
    ownerSigner: world.signer,
    agentPubkey: world.agent.publicKey,
    epochAuthor: "owner",
    scope: "buzz:rooms:read",
    expires: Math.floor(Date.now() / 1000) + 600,
  });
  world.policy = new AgentRequestPolicy({ maxPerWindow: 1, windowMs: 60_000 });
  world.policy.evaluate({
    attestation: world.attestation.fields,
    requiredScope: "buzz:rooms:read",
    agentPubkey: world.agent.publicKey,
  });
});

When("the agent exceeds the request policy window", function () {
  assert.ok(world.policy && world.attestation && world.agent);
  world.verdict = undefined;
  const decision = world.policy.evaluate({
    attestation: world.attestation.fields,
    requiredScope: "buzz:rooms:read",
    agentPubkey: world.agent.publicKey,
  });
  // SAFETY: Runtime checks or construction above establish { lastDecision?: { allow: boolean } }).lastDecision = decision.
  world.lastDecision = decision;
});

Then("further requests are denied without touching rotation keys", function () {
  // SAFETY: Runtime checks or construction above establish { lastDecision?: { allow: boolean.
  const decision = world.lastDecision;
  assert.ok(decision);
  assert.equal(decision.allow, false);
});

Given("a signed protocol AT proof for a mutual binding", async function () {
  world.signer = new LocalHotNostrSigner();
  world.did = "did:plc:feature-protocol";
  world.epochAuthor = "feature-protocol";
  const nonce = randomBindingNonce();
  const commitPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const event = await publishBindingEvent({
    signer: world.signer,
    atDid: world.did,
    epochAuthor: world.epochAuthor,
    bindingNonce: nonce,
    seqno: 1,
  });
  const record = buildBindingRecord({
    epochAuthorId: world.epochAuthor,
    nostrPubkey: world.signer.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const built = buildSignedProtocolProof({
    did: world.did,
    record,
    commitPrivateKeyHex: commitPriv,
  });
  world.ceremony = {
    nostrEvent: event,
    atRecordUri: `at://${world.did}/org.epoch.identity.binding/${world.signer.publicKey}`,
    carSliceB64: built.carSliceB64,
    verification: { valid: true, status: "valid", head: { seqno: 1, nostrEventId: event.id ?? "", pairKey: "" } },
  };
  // SAFETY: Runtime checks or construction above establish { protocolPub?: string }).protocolPub = built.publicKeyHex.
  world.protocolPub = built.publicKeyHex;
});

When("the proof slice is tampered", async function () {
  assert.ok(world.ceremony && world.signer && world.did);
  // SAFETY: Runtime checks or construction above establish { protocolPub?: string }).protocolPub.
  const pub = world.protocolPub;
  assert.ok(pub);
  const slice = decodeProtocolProofSlice(world.ceremony.carSliceB64);
  const tampered = encodeProtocolProofSlice({
    ...slice,
    record: { ...slice.record, epochAuthorId: "tampered" },
  });
  world.verdict = await verifyBinding({
    nostrEvent: world.ceremony.nostrEvent,
    carSliceB64: tampered,
    didResolver: new StaticDidResolver([didDocumentForCommitKey(world.did, pub)]),
    atProofVerifier: new ProtocolAtProofVerifier(),
  });
});

Then("verifyBinding fails closed with proof-invalid", function () {
  assert.ok(world.verdict);
  assert.equal(world.verdict.valid, false);
  if (!world.verdict.valid) {
    assert.equal(world.verdict.reason, "proof-invalid");
  }
});
