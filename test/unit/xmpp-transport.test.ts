import assert from "node:assert/strict";
import {
  InMemoryXmppTransport,
  PrivatePublishError,
  XMPP_FIDELITY_STATEMENT,
  createXmppTransport,
  dialbackTrustLevel,
  principalFromJid,
} from "@epoch/xmpp";

export async function runXmppTransportTests(): Promise<void> {
  defaultOff();
  privatePublishDenied();
  await unknownServerDenied();
  jidNeverAuthors();
  dialbackIsReducedTrust();
  await bytesRoundTrip();
}

function defaultOff(): void {
  assert.equal(XMPP_FIDELITY_STATEMENT.defaultEnabled, false);
  assert.equal(XMPP_FIDELITY_STATEMENT.phrase, "Epoch-native with optional bridges");
}

function privatePublishDenied(): void {
  const transport = createXmppTransport({ enabled: true });
  assert.throws(() => transport.assertPublic("private"), (error: unknown) => error instanceof PrivatePublishError);
  assert.throws(() => transport.assertPublic("shared"), (error: unknown) => error instanceof PrivatePublishError);
}

async function unknownServerDenied(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"], closedRing: true });
  await assert.rejects(() => transport.send(new Uint8Array([1]), "b.example"), /denied/u);
}

function jidNeverAuthors(): void {
  assert.throws(() => principalFromJid("maya@a.example"), /admission only/u);
}

function dialbackIsReducedTrust(): void {
  assert.equal(dialbackTrustLevel("dialback"), "reduced");
  assert.equal(dialbackTrustLevel("sasl-external"), "full");
}

async function bytesRoundTrip(): Promise<void> {
  const transport = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"] });
  await transport.send(Uint8Array.from([9, 8, 7]), "a.example");
  const out: number[] = [];
  for await (const bytes of transport.receive()) out.push(...bytes);
  assert.deepEqual(out, [9, 8, 7]);
}
