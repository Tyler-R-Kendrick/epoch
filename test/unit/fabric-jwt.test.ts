import assert from "node:assert/strict";
import {
  createConnectionFencer,
  createJwtFabricValidator,
  generateIssuerKey,
  issueUserJwt,
  permissionsForScopes,
  verifyUserJwt,
} from "@epoch/nats";

export function runFabricJwtTests(): void {
  mintedJwtVerifies();
  forgedAndExpiredDenied();
  sourceServerScopesAcl();
  revokeSeversConnection();
}

function mintedJwtVerifies(): void {
  const issuer = generateIssuerKey();
  const issued = issueUserJwt({
    issuer,
    admission: {
      principal: "maya",
      scopes: ["live:write"],
      expiresAt: Date.now() + 60_000,
    },
  });
  const admission = verifyUserJwt(issued.jwt, issuer);
  assert.ok(admission);
  assert.equal(admission?.principal, "maya");
  assert.ok(createJwtFabricValidator(issuer).verify(issued.jwt));
}

function forgedAndExpiredDenied(): void {
  const issuer = generateIssuerKey();
  const other = generateIssuerKey();
  const issued = issueUserJwt({
    issuer,
    admission: { principal: "maya", scopes: ["live:read"], expiresAt: Date.now() + 60_000 },
  });
  assert.equal(verifyUserJwt(issued.jwt, other), null);
  const parts = issued.jwt.split(".");
  parts[2] = "AAAA";
  assert.equal(verifyUserJwt(parts.join("."), issuer), null);
  const expired = issueUserJwt({
    issuer,
    admission: { principal: "maya", scopes: ["live:read"], expiresAt: Date.now() - 10 },
    now: Date.now() - 1_000,
    ttlMs: 1,
  });
  assert.equal(verifyUserJwt(expired.jwt, issuer, { now: Date.now() }), null);
}

function sourceServerScopesAcl(): void {
  const a = permissionsForScopes(["live:write"], "api-token", { sourceServer: "server-a" });
  const b = permissionsForScopes(["live:write"], "api-token", { sourceServer: "server-b" });
  assert.ok(a.publish.includes("epoch.live.server-a.>"));
  assert.equal(a.publish.includes("epoch.live.server-b.>"), false);
  assert.ok(b.publish.includes("epoch.live.server-b.>"));
  const issuer = generateIssuerKey();
  const jwt = issueUserJwt({
    issuer,
    admission: {
      principal: "maya",
      sourceServer: "server-a",
      scopes: ["live:write"],
      expiresAt: Date.now() + 60_000,
    },
  });
  assert.equal(verifyUserJwt(jwt.jwt, issuer, { expectedSourceServer: "server-b" }), null);
}

function revokeSeversConnection(): void {
  const fencer = createConnectionFencer({ boundMs: 25 });
  let closed = false;
  fencer.track({
    principal: "maya",
    close() { closed = true; },
    isClosed() { return closed; },
  });
  const result = fencer.revoke("maya");
  assert.equal(closed, true);
  assert.equal(result.severed, 1);
  assert.ok(result.boundMs <= 25 || result.boundMs === 25);
}
