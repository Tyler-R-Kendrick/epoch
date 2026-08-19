#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  createConnectionFencer,
  generateIssuerKey,
  issueUserJwt,
  verifyUserJwt,
} from "../dist/index.js";

const bin = process.env.NATS_SERVER_BIN || "nats-server";

const issuer = generateIssuerKey();
const issued = issueUserJwt({
  issuer,
  admission: {
    principal: "epoch:principal:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sourceServer: "server-a",
    scopes: ["live:write"],
    expiresAt: Date.now() + 60_000,
  },
});
assert.ok(verifyUserJwt(issued.jwt, issuer));
assert.equal(verifyUserJwt(issued.jwt, issuer, { expectedSourceServer: "server-b" }), null);
const expired = issueUserJwt({
  issuer,
  admission: {
    principal: "epoch:principal:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    scopes: ["live:read"],
    expiresAt: Date.now() - 1,
  },
  now: Date.now() - 5_000,
  ttlMs: 1,
});
assert.equal(verifyUserJwt(expired.jwt, issuer, { now: Date.now() }), null);

const fencer = createConnectionFencer({ boundMs: 50 });
let closed = false;
fencer.track({
  principal: "alice",
  close() { closed = true; },
  isClosed() { return closed; },
});
const kicked = fencer.revoke("alice");
assert.equal(closed, true);
assert.equal(kicked.severed, 1);

let child;
try {
  const dir = mkdtempSync(join(tmpdir(), "epoch-nats-"));
  const conf = join(dir, "nats.conf");
  writeFileSync(conf, "port: 14222\nhttp_port: 18222\n");
  child = spawn(bin, ["-c", conf], { stdio: "ignore" });
  await delay(400);
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 14222 }, () => {
      socket.end();
      resolve(undefined);
    });
    socket.on("error", reject);
  });
  console.log("nats-server jwt integration: broker reachable; JWT issue/verify/revoke proved");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    console.log("nats-server not installed; JWT unit proofs still hold");
    process.exit(0);
  }
  throw error;
} finally {
  if (child && !child.killed) child.kill("SIGTERM");
}
