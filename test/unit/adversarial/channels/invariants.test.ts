import assert from "node:assert/strict";
import { LiveLog } from "@epoch/live";
import { sanitizeChannelLivestreamEnvelope } from "@epoch/community-core";

export function runAdversarialChannelTests(): void {
  i1ForgedChannelRejected();
  i7PrivateEnvelopeDropped();
  concurrentLamportNoLaunder();
}

function i1ForgedChannelRejected(): void {
  const log = new LiveLog({ author: "maya" });
  const result = log.ingest([{
    id: "forged",
    kind: "op",
    entity: "channel:general",
    author: "attacker",
    lamport: 99,
    parents: [],
    payload: { type: "channel.message" },
    scheme: "sig:local-only",
    signature: "sig:local-only",
  }]);
  assert.equal(result.applied, 0);
  assert.equal(result.rejected, 1);
}

function i7PrivateEnvelopeDropped(): void {
  const dropped = sanitizeChannelLivestreamEnvelope({
    visibility: "private",
    channelId: "ch",
    messageId: "m",
    body: "secret",
  });
  assert.equal(dropped.kind, "drop");
}

function concurrentLamportNoLaunder(): void {
  const a = new LiveLog({ author: "maya" });
  const b = new LiveLog({ author: "jules" });
  const first = a.append("op", "channel:general", { n: 1 });
  const second = b.append("op", "channel:general", { n: 2 });
  a.ingest([second]);
  b.ingest([first]);
  assert.deepEqual(a.verify(), []);
  assert.deepEqual(b.verify(), []);
}
