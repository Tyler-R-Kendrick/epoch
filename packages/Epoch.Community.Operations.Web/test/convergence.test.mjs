import assert from "node:assert/strict";
import test from "node:test";
import { createRedactedConvergenceSupportBundle, renderConvergenceOperationsPanel } from "../dist/index.js";

const status = {
  promisor: { health: "degraded", missingPromised: 3, integrity: "verified" },
  workspace: { provider: "browser-opfs", copyMode: "copy-on-write", executionIsolation: "none" },
  mirror: { state: "quarantined", lagSeconds: 90, drift: 2, checkpoint: "checkpoint-42", retryAction: "Retry mirror" },
  forge: { protocol: "F3 v4.0", fidelity: "loss-aware", transport: "local" },
  archive: { swhid: "swh:1:rev:0123456789abcdef0123456789abcdef01234567", status: "pending" },
  identity: { principal: "agent-1", key: "active", sponsor: "maintainer-1", grant: "active", budget: { allocated: 100, reserved: 10, consumed: 20, released: 5, expired: 0 } },
  git: { protocol: "v2", objectFilter: "blob:none" },
  sync: { bundle: "bundle-9", checkpoint: "checkpoint-42", quarantine: "recoverable" },
  objectResidency: "promised-remote",
  supportBundle: "{\"redacted\":true}",
  mutationAuthorities: { merge: "maintainer.merge", force: "maintainer.force", grant: "identity.grant", budget: "budget.allocate", "public-archive": "release.archive" },
};

test("operations view separates availability integrity copy mode authority and confirmation", () => {
  const html = renderConvergenceOperationsPanel(status);
  assert.match(html, /availability gap · integrity verified/iu);
  assert.match(html, /Actual copy mode: copy-on-write; execution isolation: none/iu);
  assert.match(html, /checkpoint-42.*Retry mirror/isu);
  assert.match(html, /F3 v4\.0/iu);
  assert.equal((html.match(/data-confirmation-required="true"/gu) ?? []).length, 5);
  assert.doesNotMatch(html, /private session|credential value/iu);
});

test("support bundle uses an allowlist and drops private sessions and credentials", () => {
  const bundle = createRedactedConvergenceSupportBundle(status, {
    rawSession: "PRIVATE_SESSION_SENTINEL",
    credential: "SECRET_CREDENTIAL_SENTINEL",
  });
  assert.match(bundle, /"promisor".*"mirror".*"redacted":true/isu);
  assert.doesNotMatch(bundle, /PRIVATE_SESSION_SENTINEL|SECRET_CREDENTIAL_SENTINEL/iu);
});
