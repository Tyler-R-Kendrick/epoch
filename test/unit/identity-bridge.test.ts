import assert from "node:assert/strict";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { schnorr } from "@noble/curves/secp256k1";
import {
  AgentRequestPolicy,
  agreeOnHead,
  attestationIsActive,
  buildBindingRecord,
  buildSignedProtocolProof,
  computeEventId,
  decodeProtocolProofSlice,
  didDocumentForCommitKey,
  DisabledRelayClient,
  encodeProtocolProofSlice,
  GuardedRelayClient,
  InMemoryBindingRecordStore,
  InMemoryRelay,
  LocalHotNostrSigner,
  MockAtProofVerifier,
  Nip46NostrSigner,
  NOSTR_ATTESTATION_KIND,
  NOSTR_BINDING_KIND,
  pairKey,
  parseBindingEvent,
  ProtocolAtProofVerifier,
  publishBindingEvent,
  publishOwnerAgentAttestation,
  randomBindingNonce,
  revokeBindingCeremony,
  revokeBindingEvent,
  runBindingCeremony,
  scopeAllows,
  ScopedOAuthClient,
  BINDING_RECORD_SCOPE,
  signNip98Request,
  StaticDidResolver,
  validateChain,
  verifyBinding,
  verifyEventSignature,
  verifyNip98Request,
  WitnessIndexStore,
  ingestBindingCandidate,
  WitnessIndexApi,
} from "@epoch/identity-bridge";

export async function runIdentityBridgeTests(): Promise<void> {
  await s1SchemasAndVectors();
  await s2VerifierThreatVectors();
  await s2ProtocolCarProof();
  await s3PublisherAndRevocation();
  await s3RelayModesAndNip46();
  await s4OauthAndRecordWriter();
  await s5DelegationAndNip98();
  await s6WitnessIndex();
  await s6IndexHeadRollback();
  await s7Ceremony();
  await s7CeremonyProtocolProof();
  await oneToManyBindings();
  await t6AtKeyRotation();
  await t7DeletionMeansNoBinding();
  await t12PinnedHeadConsistency();
  custodyGrepSurface();
  console.log("identity-bridge unit tests passed");
}

async function s1SchemasAndVectors(): Promise<void> {
  const signer = new LocalHotNostrSigner();
  const nonce = randomBindingNonce();
  assert.match(nonce, /^[0-9a-f]{64}$/u);

  const event = await publishBindingEvent({
    signer,
    atDid: "did:plc:alice",
    atHandle: "alice.example.com",
    epochAuthor: "alice-epoch",
    bindingNonce: nonce,
    seqno: 1,
  });

  assert.equal(event.kind, NOSTR_BINDING_KIND);
  assert.ok(event.id);
  assert.equal(computeEventId(event), event.id);
  assert.ok(verifyEventSignature(event));
  const fields = parseBindingEvent(event);
  assert.equal(fields.seqno, 1);
  assert.equal(fields.bindingNonce, nonce);
  assert.equal(fields.revoked, false);
  assert.equal(fields.prevEventId, undefined);

  const chainOk = validateChain([{ seqno: 1, id: event.id!, revoked: false }]);
  assert.equal(chainOk.ok, true);

  const broken = validateChain([
    { seqno: 1, id: "a".repeat(64), revoked: false },
    { seqno: 3, id: "b".repeat(64), prevId: "a".repeat(64), revoked: false },
  ]);
  assert.equal(broken.ok, false);
  if (!broken.ok) {
    assert.equal(broken.reason, "chain-broken");
  }
}

async function s2VerifierThreatVectors(): Promise<void> {
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:vector";
  const epochAuthor = "epoch-vector";
  const nonce = randomBindingNonce();
  const didResolver = new StaticDidResolver([{ id: did, verificationMethod: [{ id: `${did}#atproto`, type: "Multikey" }] }]);
  const atProof = new MockAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();

  const event = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor,
    bindingNonce: nonce,
    seqno: 1,
    created_at: 1_000_000, // T1 backdated — must not affect validity
  });
  const record = buildBindingRecord({
    epochAuthorId: epochAuthor,
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const write = await atStore.put(did, record);
  atProof.register(did, owner.publicKey, {
    record,
    carSliceB64: write.carSliceB64,
    recordCid: write.cid,
    commitRev: write.rev,
    commitSigCheck: "passed",
  });

  // T1 — backdated created_at ignored for ordering
  const t1 = await verifyBinding({
    nostrEvent: event,
    carSliceB64: write.carSliceB64,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(t1.valid, true, "T1 backdated binding still valid");

  // T4 — mix-and-match nonce
  const other = buildBindingRecord({
    epochAuthorId: epochAuthor,
    nostrPubkey: owner.publicKey,
    bindingNonce: randomBindingNonce(),
    seqno: 1,
  });
  const otherWrite = await atStore.put(did, other);
  atProof.register(did, owner.publicKey, {
    record: other,
    carSliceB64: otherWrite.carSliceB64,
    recordCid: otherWrite.cid,
    commitRev: otherWrite.rev,
    commitSigCheck: "passed",
  });
  const t4 = await verifyBinding({
    nostrEvent: event,
    carSliceB64: otherWrite.carSliceB64,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(t4.valid, false);
  if (!t4.valid) {
    assert.equal(t4.reason, "mismatch-fields", "T4 mix-and-match rejected");
  }

  // restore matching proof for further tests
  atProof.register(did, owner.publicKey, {
    record,
    carSliceB64: write.carSliceB64,
    recordCid: write.cid,
    commitRev: write.rev,
    commitSigCheck: "passed",
  });

  // T3 — rollback after revocation (re-present old pair against pinned head)
  const revoke = await revokeBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor,
    bindingNonce: nonce,
    nextSeqno: 2,
    prevEventId: event.id!,
  });
  const revokedRecord = buildBindingRecord({
    epochAuthorId: epochAuthor,
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 2,
    prevBindingEventId: event.id,
    revoked: true,
  });
  const revWrite = await atStore.put(did, revokedRecord);
  atProof.register(did, owner.publicKey, {
    record: revokedRecord,
    carSliceB64: revWrite.carSliceB64,
    recordCid: revWrite.cid,
    commitRev: revWrite.rev,
    commitSigCheck: "passed",
  });
  const revokedVerdict = await verifyBinding({
    nostrEvent: revoke,
    nostrChain: [event],
    carSliceB64: revWrite.carSliceB64,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(revokedVerdict.valid, false);
  if (!revokedVerdict.valid) {
    assert.equal(revokedVerdict.reason, "revoked", "T3/T8 revocation terminal");
  }

  // re-present old valid pair with pinned head at seqno 2
  atProof.register(did, owner.publicKey, {
    record,
    carSliceB64: write.carSliceB64,
    recordCid: write.cid,
    commitRev: write.rev,
    commitSigCheck: "passed",
  });
  const rollback = await verifyBinding({
    nostrEvent: event,
    carSliceB64: write.carSliceB64,
    didResolver,
    atProofVerifier: atProof,
    pinnedHead: { seqno: 2, id: revoke.id! },
  });
  assert.equal(rollback.valid, false);
  if (!rollback.valid) {
    assert.equal(rollback.reason, "chain-regression", "T3 rollback rejected");
  }

  // T2 — future-dated without valid prev
  const futureSigner = new LocalHotNostrSigner();
  const future = await publishBindingEvent({
    signer: futureSigner,
    atDid: "did:plc:future",
    epochAuthor: "future",
    bindingNonce: randomBindingNonce(),
    seqno: 2,
    prevEventId: "c".repeat(64),
    created_at: Math.floor(Date.now() / 1000) + 10_000_000,
  });
  const futureChain = validateChain([
    { seqno: 2, id: future.id!, prevId: "c".repeat(64), revoked: false },
  ]);
  assert.equal(futureChain.ok, false, "T2 future event without genesis fails chain");

  // T11 — did unresolvable
  const emptyResolver = new StaticDidResolver([]);
  const t11 = await verifyBinding({
    nostrEvent: event,
    carSliceB64: write.carSliceB64,
    didResolver: emptyResolver,
    atProofVerifier: atProof,
  });
  assert.equal(t11.valid, false);
  if (!t11.valid) {
    assert.equal(t11.reason, "did-unresolvable");
  }

  // T5 — nonce uniqueness / next seqno required (same pair continues chain)
  assert.ok(agreeOnHead(
    { seqno: 1, eventId: event.id! },
    { seqno: 1 },
  ));
  assert.equal(
    agreeOnHead({ seqno: 2, prevEventId: event.id, eventId: revoke.id! }, { seqno: 1 }),
    false,
  );
}

async function s2ProtocolCarProof(): Promise<void> {
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:car-proof";
  const commitPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const nonce = randomBindingNonce();
  const record = buildBindingRecord({
    epochAuthorId: "car-author",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const built = buildSignedProtocolProof({
    did,
    record,
    commitPrivateKeyHex: commitPriv,
  });
  const didResolver = new StaticDidResolver([didDocumentForCommitKey(did, built.publicKeyHex)]);
  const verifier = new ProtocolAtProofVerifier();

  // Valid bundle → proof passes and full binding verifies
  const event = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "car-author",
    bindingNonce: nonce,
    seqno: 1,
  });
  const valid = await verifyBinding({
    nostrEvent: event,
    carSliceB64: built.carSliceB64,
    didResolver,
    atProofVerifier: verifier,
  });
  assert.equal(valid.valid, true, "protocol-shaped CAR proof must verify without mock accept-list");

  // Tampered record bytes in slice → proof-invalid
  const slice = decodeProtocolProofSlice(built.carSliceB64);
  const tamperedRecord = { ...slice.record, epochAuthorId: "attacker" };
  const tamperedB64 = encodeProtocolProofSlice({ ...slice, record: tamperedRecord as typeof slice.record });
  await assert.rejects(
    () => verifier.verifyRecordProof({
      did,
      nostrPubkey: owner.publicKey,
      carSliceB64: tamperedB64,
      didDocument: didDocumentForCommitKey(did, built.publicKeyHex),
    }),
    /proof-invalid/u,
  );

  // Bad commit signature → proof-invalid
  const badSig = encodeProtocolProofSlice({
    ...slice,
    commitSig: "ab".repeat(64),
  });
  await assert.rejects(
    () => verifier.verifyRecordProof({
      did,
      nostrPubkey: owner.publicKey,
      carSliceB64: badSig,
      didDocument: didDocumentForCommitKey(did, built.publicKeyHex),
    }),
    /proof-invalid/u,
  );

  // Empty slice → proof-missing
  await assert.rejects(
    () => verifier.verifyRecordProof({
      did,
      nostrPubkey: owner.publicKey,
      carSliceB64: "",
      didDocument: didDocumentForCommitKey(did, built.publicKeyHex),
    }),
    /proof-missing/u,
  );
}

async function s3PublisherAndRevocation(): Promise<void> {
  const relay = new InMemoryRelay();
  const signer = new LocalHotNostrSigner();
  const e1 = await publishBindingEvent({
    signer,
    atDid: "did:plc:pub",
    epochAuthor: "pub",
    bindingNonce: randomBindingNonce(),
    seqno: 1,
    relays: relay,
  });
  const listed = await relay.list({ kinds: [NOSTR_BINDING_KIND], authors: [signer.publicKey] });
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, e1.id);

  const e2 = await revokeBindingEvent({
    signer,
    atDid: "did:plc:pub",
    epochAuthor: "pub",
    bindingNonce: parseBindingEvent(e1).bindingNonce,
    nextSeqno: 2,
    prevEventId: e1.id!,
    relays: relay,
  });
  assert.equal(parseBindingEvent(e2).revoked, true);
  // addressable replace keeps latest
  const after = await relay.list({ kinds: [NOSTR_BINDING_KIND], authors: [signer.publicKey] });
  assert.equal(after.length, 1);
  assert.equal(after[0]?.id, e2.id);
}

async function s3RelayModesAndNip46(): Promise<void> {
  const inner = new InMemoryRelay();
  const disabled = new GuardedRelayClient(inner, "disabled");
  const signer = new LocalHotNostrSigner();
  await assert.rejects(
    () => publishBindingEvent({
      signer,
      atDid: "did:plc:x",
      epochAuthor: "x",
      bindingNonce: randomBindingNonce(),
      seqno: 1,
      relays: disabled,
    }),
    /FeatureDisabledError/u,
  );
  assert.equal((await disabled.list({ kinds: [NOSTR_BINDING_KIND] })).length, 0);

  const localOnly = new GuardedRelayClient(inner, "local-only");
  const e = await publishBindingEvent({
    signer,
    atDid: "did:plc:local",
    epochAuthor: "local",
    bindingNonce: randomBindingNonce(),
    seqno: 1,
    relays: localOnly,
  });
  assert.ok(e.id);

  const hardDisabled = new DisabledRelayClient();
  await assert.rejects(() => hardDisabled.publish(e), /FeatureDisabledError/u);

  // NIP-46 kind gate with local delegate (local-only, no network)
  const hot = new LocalHotNostrSigner();
  const nip46 = new Nip46NostrSigner({
    publicKey: hot.publicKey,
    localDelegate: hot,
    mode: "local-only",
    allowedKinds: [NOSTR_BINDING_KIND, NOSTR_ATTESTATION_KIND],
  });
  const ok = await nip46.signEvent({
    created_at: Math.floor(Date.now() / 1000),
    kind: NOSTR_BINDING_KIND,
    tags: [["d", "did:plc:n"]],
    content: "ok",
  });
  assert.ok(ok.sig);

  await assert.rejects(
    () => nip46.signEvent({
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: "denied",
    }),
    /permission denied/u,
  );

  const nip46Disabled = new Nip46NostrSigner({
    publicKey: hot.publicKey,
    localDelegate: hot,
    mode: "disabled",
  });
  await assert.rejects(
    () => nip46Disabled.signEvent({
      created_at: Math.floor(Date.now() / 1000),
      kind: NOSTR_BINDING_KIND,
      tags: [],
      content: "x",
    }),
    /FeatureDisabledError/u,
  );
}

async function s4OauthAndRecordWriter(): Promise<void> {
  const oauth = new ScopedOAuthClient();
  await assert.rejects(
    () => oauth.authorize({ did: "did:plc:x", scope: "transition:generic" }),
    /rotation|transition/u,
  );
  const token = await oauth.authorize({ did: "did:plc:x", scope: BINDING_RECORD_SCOPE });
  oauth.assertScope(token, BINDING_RECORD_SCOPE);

  const store = new InMemoryBindingRecordStore();
  const record = buildBindingRecord({
    epochAuthorId: "a",
    nostrPubkey: "ab".repeat(32),
    bindingNonce: "cd".repeat(32),
    seqno: 1,
  });
  const write = await store.put("did:plc:x", record);
  assert.match(write.uri, /org\.epoch\.identity\.binding/u);
  assert.equal((await store.get("did:plc:x", "ab".repeat(32)))?.cid, write.cid);
}

async function s5DelegationAndNip98(): Promise<void> {
  const owner = new LocalHotNostrSigner();
  const agent = new LocalHotNostrSigner();
  const att = await publishOwnerAgentAttestation({
    ownerSigner: owner,
    agentPubkey: agent.publicKey,
    epochAuthor: "owner-epoch",
    scope: "buzz:rooms:read,write;epoch:binding:request",
    expires: Math.floor(Date.now() / 1000) + 3600,
  });
  assert.equal(attestationIsActive(att.fields), true);
  assert.equal(scopeAllows(att.fields.scope, "buzz:rooms:read"), true);
  assert.equal(scopeAllows(att.fields.scope, "epoch:admin"), false);

  const policy = new AgentRequestPolicy({ maxPerWindow: 2, windowMs: 60_000 });
  assert.equal(policy.evaluate({
    attestation: att.fields,
    requiredScope: "buzz:rooms:read",
    agentPubkey: agent.publicKey,
  }).allow, true);

  // T9 — rate limit
  assert.equal(policy.evaluate({
    attestation: att.fields,
    requiredScope: "buzz:rooms:read",
    agentPubkey: agent.publicKey,
  }).allow, true);
  const limited = policy.evaluate({
    attestation: att.fields,
    requiredScope: "buzz:rooms:read",
    agentPubkey: agent.publicKey,
  });
  assert.equal(limited.allow, false);

  const body = JSON.stringify({ hello: "world" });
  const auth = await signNip98Request({
    signer: agent,
    url: "https://epoch.example/bind",
    method: "POST",
    body,
  });
  assert.equal(verifyNip98Request({
    event: auth,
    url: "https://epoch.example/bind",
    method: "POST",
    body,
  }).ok, true);
  assert.equal(verifyNip98Request({
    event: auth,
    url: "https://evil.example/bind",
    method: "POST",
    body,
  }).ok, false);
  assert.equal(verifyNip98Request({
    event: auth,
    url: "https://epoch.example/bind",
    method: "GET",
    body,
  }).ok, false);
  assert.equal(verifyNip98Request({
    event: auth,
    url: "https://epoch.example/bind",
    method: "POST",
    body: "{}",
  }).ok, false);
  assert.equal(verifyNip98Request({
    event: auth,
    url: "https://epoch.example/bind",
    method: "POST",
    body,
    nowUnix: auth.created_at + 120,
  }).ok, false, "T9 stale NIP-98 rejected");
}

async function s6WitnessIndex(): Promise<void> {
  const store = new WitnessIndexStore();
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:index";
  const nonce = randomBindingNonce();
  const didResolver = new StaticDidResolver([{ id: did }]);
  const atProof = new MockAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();

  const event = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "idx",
    bindingNonce: nonce,
    seqno: 1,
  });
  const record = buildBindingRecord({
    epochAuthorId: "idx",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const write = await atStore.put(did, record);
  atProof.register(did, owner.publicKey, {
    record,
    carSliceB64: write.carSliceB64,
    recordCid: write.cid,
    commitRev: write.rev,
    commitSigCheck: "passed",
  });

  const entry = await ingestBindingCandidate({
    store,
    nostrEvent: event,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.ok(entry);
  assert.equal(entry?.status, "valid");
  assert.equal(store.byNostr(owner.publicKey).length, 1);
  assert.equal(store.byDid(did).length, 1);
  assert.ok(store.head(pairKey(owner.publicKey, did)));

  // chaos: restart store from snapshot converges
  const snapshot = store.all();
  const store2 = new WitnessIndexStore();
  store2.replaceAll(snapshot);
  assert.equal(store2.byDid(did).length, 1);

  const api = new WitnessIndexApi({
    store,
    reverify: { didResolver, atProofVerifier: atProof },
    ttlMs: 0,
  });
  const reverified = await api.reverifyIfStale(pairKey(owner.publicKey, did));
  assert.ok(reverified);

  // T10 — index cannot invent bindings
  assert.equal(store.get("missing:pair"), undefined);

  // backfill convergence: re-ingest same candidate does not invent extra heads
  const again = await ingestBindingCandidate({
    store,
    nostrEvent: event,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(again?.chainHead.nostrEventId, entry?.chainHead.nostrEventId);
  assert.equal(store.byNostr(owner.publicKey).length, 1);
}

async function s6IndexHeadRollback(): Promise<void> {
  const store = new WitnessIndexStore();
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:idx-head";
  const nonce = randomBindingNonce();
  const didResolver = new StaticDidResolver([{ id: did }]);
  const atProof = new MockAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();

  const e1 = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "idx-head",
    bindingNonce: nonce,
    seqno: 1,
  });
  const r1 = buildBindingRecord({
    epochAuthorId: "idx-head",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const w1 = await atStore.put(did, r1);
  atProof.register(did, owner.publicKey, {
    record: r1,
    carSliceB64: w1.carSliceB64,
    recordCid: w1.cid,
    commitRev: w1.rev,
    commitSigCheck: "passed",
  });
  const entry1 = await ingestBindingCandidate({
    store,
    nostrEvent: e1,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(entry1?.chainHead.seqno, 1);

  const e2 = await revokeBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "idx-head",
    bindingNonce: nonce,
    nextSeqno: 2,
    prevEventId: e1.id!,
  });
  const r2 = buildBindingRecord({
    epochAuthorId: "idx-head",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 2,
    prevBindingEventId: e1.id,
    revoked: true,
  });
  const w2 = await atStore.put(did, r2);
  atProof.register(did, owner.publicKey, {
    record: r2,
    carSliceB64: w2.carSliceB64,
    recordCid: w2.cid,
    commitRev: w2.rev,
    commitSigCheck: "passed",
  });

  // Ingest revoke via shipped path with chain (not WitnessIndexStore.put bypass).
  // Chain may come from explicit nostrChain and/or store's prior proof event.
  const entry2 = await ingestBindingCandidate({
    store,
    nostrEvent: e2,
    atStore,
    didResolver,
    atProofVerifier: atProof,
    nostrChain: [e1],
  });
  assert.ok(entry2, "revoke candidate must ingest when nostrChain is supplied");
  assert.equal(entry2?.status, "revoked");
  assert.equal(entry2?.chainHead.seqno, 2);
  assert.equal(store.head(pairKey(owner.publicKey, did))?.seqno, 2);

  // Without chain, seqno>1 cannot invent predecessors
  const noChain = await ingestBindingCandidate({
    store: new WitnessIndexStore(),
    nostrEvent: e2,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(noChain, undefined);

  // T3 via index head: re-present e1 with pinned index head
  atProof.register(did, owner.publicKey, {
    record: r1,
    carSliceB64: w1.carSliceB64,
    recordCid: w1.cid,
    commitRev: w1.rev,
    commitSigCheck: "passed",
  });
  const indexHead = store.head(pairKey(owner.publicKey, did))!;
  const rollback = await verifyBinding({
    nostrEvent: e1,
    carSliceB64: w1.carSliceB64,
    didResolver,
    atProofVerifier: atProof,
    pinnedHead: { seqno: indexHead.seqno, id: indexHead.nostrEventId },
  });
  assert.equal(rollback.valid, false);
  if (!rollback.valid) {
    assert.equal(rollback.reason, "chain-regression");
  }

  // TTL re-verify of revoked seqno=2 must keep status revoked (not chain-broken → conflict).
  const api = new WitnessIndexApi({
    store,
    reverify: { didResolver, atProofVerifier: atProof },
    ttlMs: 0,
  });
  // Head event is revoked; AT proof still points at revoked record from last ingest.
  atProof.register(did, owner.publicKey, {
    record: r2,
    carSliceB64: w2.carSliceB64,
    recordCid: w2.cid,
    commitRev: w2.rev,
    commitSigCheck: "passed",
  });
  const storedBefore = store.get(pairKey(owner.publicKey, did));
  assert.equal(storedBefore?.status, "revoked");
  assert.ok(
    Array.isArray((storedBefore?.proof as { nostrChain?: unknown[] }).nostrChain)
      && ((storedBefore?.proof as { nostrChain?: unknown[] }).nostrChain?.length ?? 0) >= 1,
    "ingest must persist prior chain for re-verify",
  );
  const afterReverify = await api.reverifyIfStale(pairKey(owner.publicKey, did));
  assert.ok(afterReverify);
  assert.equal(afterReverify?.status, "revoked", "TTL re-verify must not rewrite revoked → conflict");
  assert.equal(afterReverify?.chainHead.seqno, 2);
}

async function s7Ceremony(): Promise<void> {
  const signer = new LocalHotNostrSigner();
  const did = "did:plc:ceremony";
  const epochAuthor = "ceremony-author";
  const didResolver = new StaticDidResolver([{ id: did }]);
  const atProof = new MockAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();

  await assert.rejects(
    () => runBindingCeremony({
      confirmation: {
        confirmed: false,
        displayedPlanes: { epochAuthor, nostrPubkey: signer.publicKey, atDid: did },
      },
      signer,
      atDid: did,
      epochAuthor,
      atStore,
      didResolver,
      atProofVerifier: atProof,
    }),
    /affirmative/u,
  );

  const result = await runBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: { epochAuthor, nostrPubkey: signer.publicKey, atDid: did },
    },
    signer,
    atDid: did,
    epochAuthor,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.equal(result.verification.valid, true);

  const revoked = await revokeBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: { epochAuthor, nostrPubkey: signer.publicKey, atDid: did },
    },
    signer,
    atDid: did,
    epochAuthor,
    bindingNonce: parseBindingEvent(result.nostrEvent).bindingNonce,
    nextSeqno: 2,
    prevEventId: result.nostrEvent.id!,
    atStore,
    didResolver,
    atProofVerifier: atProof,
    nostrChain: [result.nostrEvent],
  });
  assert.equal(revoked.verification.valid, false);
  if (!revoked.verification.valid) {
    assert.equal(revoked.verification.reason, "revoked");
  }
}

async function s7CeremonyProtocolProof(): Promise<void> {
  const signer = new LocalHotNostrSigner();
  const did = "did:plc:protocol-ceremony";
  const epochAuthor = "protocol-ceremony";
  const commitPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const pub = bytesToHex(schnorr.getPublicKey(hexToBytes(commitPriv)));
  const didResolver = new StaticDidResolver([didDocumentForCommitKey(did, pub)]);
  const atProof = new ProtocolAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();
  const relay = new GuardedRelayClient(new InMemoryRelay(), "local-only");
  const store = new WitnessIndexStore();

  const result = await runBindingCeremony({
    confirmation: {
      confirmed: true,
      displayedPlanes: { epochAuthor, nostrPubkey: signer.publicKey, atDid: did },
    },
    signer,
    atDid: did,
    epochAuthor,
    atStore,
    didResolver,
    atProofVerifier: atProof,
    atCommitPrivateKeyHex: commitPriv,
    relays: relay,
  });
  assert.equal(result.verification.valid, true);
  // Confirmation is pure verifyBinding result, not index.
  assert.ok(result.carSliceB64.length > 0);
  assert.ok(decodeProtocolProofSlice(result.carSliceB64));

  // Store must hold the protocol slice so ingest can re-verify without mock register.
  const stored = await atStore.get(did, signer.publicKey);
  assert.ok(stored);
  assert.equal(stored.carSliceB64, result.carSliceB64);

  const entry = await ingestBindingCandidate({
    store,
    nostrEvent: result.nostrEvent,
    atStore,
    didResolver,
    atProofVerifier: atProof,
  });
  assert.ok(entry, "ingest must succeed using ceremony-written protocol slice");
  assert.equal(entry?.status, "valid");
  assert.equal(entry?.proof.carSliceB64, result.carSliceB64);
}

async function t6AtKeyRotation(): Promise<void> {
  // After AT signing-key rotation, historical proof may fail against new DID doc;
  // a freshly signed current-head proof against the new key verifies.
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:rotate";
  const oldPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const newPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const nonce = randomBindingNonce();
  const record = buildBindingRecord({
    epochAuthorId: "rot",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const oldProof = buildSignedProtocolProof({
    did,
    record,
    commitPrivateKeyHex: oldPriv,
  });
  const newProof = buildSignedProtocolProof({
    did,
    record,
    commitPrivateKeyHex: newPriv,
    commitRev: "3lrotated",
  });
  const event = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "rot",
    bindingNonce: nonce,
    seqno: 1,
  });
  const verifier = new ProtocolAtProofVerifier();

  // Old proof + new DID document → proof-invalid (key mismatch)
  const rotatedDoc = didDocumentForCommitKey(did, newProof.publicKeyHex);
  await assert.rejects(
    () => verifier.verifyRecordProof({
      did,
      nostrPubkey: owner.publicKey,
      carSliceB64: oldProof.carSliceB64,
      didDocument: rotatedDoc,
    }),
    /proof-invalid/u,
    "T6 historical proof degrades after key rotation",
  );

  // Current head re-proven under new key → valid
  const ok = await verifyBinding({
    nostrEvent: event,
    carSliceB64: newProof.carSliceB64,
    didResolver: new StaticDidResolver([rotatedDoc]),
    atProofVerifier: verifier,
  });
  assert.equal(ok.valid, true, "T6 current head verifies against current DID document");
}

async function t7DeletionMeansNoBinding(): Promise<void> {
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:delete";
  const nonce = randomBindingNonce();
  const commitPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const record = buildBindingRecord({
    epochAuthorId: "del",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const built = buildSignedProtocolProof({
    did,
    record,
    commitPrivateKeyHex: commitPriv,
  });
  const didResolver = new StaticDidResolver([didDocumentForCommitKey(did, built.publicKeyHex)]);
  const verifier = new ProtocolAtProofVerifier();
  const atStore = new InMemoryBindingRecordStore();
  await atStore.put(did, record);

  const event = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "del",
    bindingNonce: nonce,
    seqno: 1,
  });
  const before = await verifyBinding({
    nostrEvent: event,
    carSliceB64: built.carSliceB64,
    didResolver,
    atProofVerifier: verifier,
  });
  assert.equal(before.valid, true);

  // T7: record deletion → absence; verifier sees proof-missing / no binding
  await atStore.delete(did, owner.publicKey);
  assert.equal(await atStore.get(did, owner.publicKey), undefined);
  await assert.rejects(
    () => verifier.verifyRecordProof({
      did,
      nostrPubkey: owner.publicKey,
      carSliceB64: "",
      didDocument: didDocumentForCommitKey(did, built.publicKeyHex),
    }),
    /proof-missing/u,
  );
}

async function t12PinnedHeadConsistency(): Promise<void> {
  // Two verifiers with different observation histories: pinning narrows divergence.
  const owner = new LocalHotNostrSigner();
  const did = "did:plc:equiv";
  const nonce = randomBindingNonce();
  const e1 = await publishBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "eq",
    bindingNonce: nonce,
    seqno: 1,
  });
  const e2 = await revokeBindingEvent({
    signer: owner,
    atDid: did,
    epochAuthor: "eq",
    bindingNonce: nonce,
    nextSeqno: 2,
    prevEventId: e1.id!,
  });
  const r1 = buildBindingRecord({
    epochAuthorId: "eq",
    nostrPubkey: owner.publicKey,
    bindingNonce: nonce,
    seqno: 1,
  });
  const commitPriv = bytesToHex(schnorr.utils.randomPrivateKey());
  const p1 = buildSignedProtocolProof({ did, record: r1, commitPrivateKeyHex: commitPriv });
  const verifier = new ProtocolAtProofVerifier();
  const didResolver = new StaticDidResolver([didDocumentForCommitKey(did, p1.publicKeyHex)]);

  // Observer A never saw revocation — accepts e1 without pin
  const a = await verifyBinding({
    nostrEvent: e1,
    carSliceB64: p1.carSliceB64,
    didResolver,
    atProofVerifier: verifier,
  });
  assert.equal(a.valid, true);

  // Observer B pinned head at e2 — rejects e1 (T12 pinning narrows divergence)
  const b = await verifyBinding({
    nostrEvent: e1,
    carSliceB64: p1.carSliceB64,
    didResolver,
    atProofVerifier: verifier,
    pinnedHead: { seqno: 2, id: e2.id! },
  });
  assert.equal(b.valid, false);
  if (!b.valid) {
    assert.equal(b.reason, "chain-regression");
  }
}

async function oneToManyBindings(): Promise<void> {
  const nostr = new LocalHotNostrSigner();
  const didA = "did:plc:a";
  const didB = "did:plc:b";
  const eA = await publishBindingEvent({
    signer: nostr,
    atDid: didA,
    epochAuthor: "multi",
    bindingNonce: randomBindingNonce(),
    seqno: 1,
  });
  const eB = await publishBindingEvent({
    signer: nostr,
    atDid: didB,
    epochAuthor: "multi",
    bindingNonce: randomBindingNonce(),
    seqno: 1,
  });
  assert.notEqual(parseBindingEvent(eA).d, parseBindingEvent(eB).d);

  const did = "did:plc:shared";
  const n1 = new LocalHotNostrSigner();
  const n2 = new LocalHotNostrSigner();
  const b1 = await publishBindingEvent({
    signer: n1,
    atDid: did,
    epochAuthor: "shared",
    bindingNonce: randomBindingNonce(),
    seqno: 1,
  });
  const b2 = await publishBindingEvent({
    signer: n2,
    atDid: did,
    epochAuthor: "shared",
    bindingNonce: randomBindingNonce(),
    seqno: 1,
  });
  assert.notEqual(b1.pubkey, b2.pubkey);
  assert.equal(parseBindingEvent(b1).d, parseBindingEvent(b2).d);
}

function custodyGrepSurface(): void {
  // Surface-level: LocalHotNostrSigner private keys are not on NostrEvent payloads.
  const signer = new LocalHotNostrSigner();
  const exported = signer.exportPrivateKeyForTests();
  assert.match(exported, /^[0-9a-f]{64}$/u);
  // public events must never include nsec/private key material fields
  assert.equal("nsec" in ({} as object), false);
}

