#!/usr/bin/env node
/**
 * Prosody s2s harness. If Prosody cannot prove E01 floors, the adapter stays
 * off and E01 remains rejected. This file never claims XMPP-compatible chat.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  InMemoryXmppTransport,
  PrivatePublishError,
  XMPP_FIDELITY_STATEMENT,
  createXmppTransport,
} from "../dist/index.js";

assert.equal(XMPP_FIDELITY_STATEMENT.defaultEnabled, false);
assert.equal(XMPP_FIDELITY_STATEMENT.phrase, "Epoch-native with optional bridges");

const transport = createXmppTransport({ enabled: false });
assert.throws(() => transport.assertPublic("private"), (error) => error instanceof PrivatePublishError);

const enabled = new InMemoryXmppTransport({ enabled: true, allowlist: ["a.example"], closedRing: true });
await enabled.send(new Uint8Array([7, 7]), "a.example");
const received = [];
for await (const bytes of enabled.receive()) received.push(...bytes);
assert.deepEqual(received, [7, 7]);

const which = spawnSync("which", ["prosody"], { encoding: "utf8" });
if (which.status !== 0) {
  console.log("prosody not installed; in-process double proved; E01 remains rejected");
  process.exit(0);
}

// Presence of Prosody is not E01 throughput proof. Record honest skip.
console.log("prosody present; E01/E02 floors not measured — adapter stays off");
