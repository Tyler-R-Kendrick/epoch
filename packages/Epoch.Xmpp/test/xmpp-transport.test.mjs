import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InMemoryXmppTransport,
  PrivatePublishError,
  XMPP_FIDELITY_STATEMENT,
  createXmppTransport,
  dialbackTrustLevel,
  principalFromJid,
} from "../dist/index.js";

test("xmpp: default off and private publish fails closed", async () => {
  const transport = createXmppTransport();
  assert.equal(XMPP_FIDELITY_STATEMENT.defaultEnabled, false);
  assert.equal(XMPP_FIDELITY_STATEMENT.phrase, "Epoch-native with optional bridges");
  await assert.rejects(() => transport.send(new Uint8Array([1]), "a.example"), /off/u);
  assert.throws(() => transport.assertPublic("private"), (error) => error instanceof PrivatePublishError);
  assert.throws(() => principalFromJid("user@a.example"), /admission only/u);
  assert.equal(dialbackTrustLevel("dialback"), "reduced");
  assert.equal(dialbackTrustLevel("sasl-external"), "full");
});

test("xmpp: unknown server denied; allowlisted bytes pass", async () => {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"], closedRing: true });
  await assert.rejects(() => transport.send(new Uint8Array([9]), "b.example"), /denied/u);
  await transport.send(Uint8Array.from([1, 2, 3]), "a.example");
  const received = [];
  for await (const bytes of transport.receive()) received.push(...bytes);
  assert.deepEqual(received, [1, 2, 3]);
});
