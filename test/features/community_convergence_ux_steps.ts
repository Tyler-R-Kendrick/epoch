import assert from "node:assert/strict";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page } from "playwright";
import {
  ConvergenceWorkbench,
  createConvergenceFixture,
  type ConvergenceWorkbenchSnapshot,
} from "@epoch/community-core";
import { renderConvergenceWorkbench } from "@epoch/community-web";
import {
  createRedactedConvergenceSupportBundle,
  renderConvergenceOperationsPanel,
  type CommunityConvergenceOperations,
} from "@epoch/community-operations-web";
import { chromiumLaunchOptions } from "./playwright-options";

interface ConvergenceWorld {
  workbench?: ConvergenceWorkbench;
  snapshot?: ConvergenceWorkbenchSnapshot;
  operations?: CommunityConvergenceOperations;
  browser?: Browser;
  page?: Page;
  result?: unknown;
  beforeDigest?: string;
  supportBundle?: string;
}

let convergence: ConvergenceWorld = {};

After(async function () {
  await convergence.browser?.close();
  convergence = {};
});

Given("a convergence workbench with changes {string} and dependencies {string}", function (changes: string, dependencies: string) {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes, dependencies }));
});

When("I split {string} into {string} at unambiguous file boundaries", function (changeId: string, parts: string) {
  convergence.beforeDigest = requiredWorkbench().snapshot().snapshotDigest;
  convergence.result = requiredWorkbench().splitChange(changeId, parts.split(","), ["schema.ts", "runtime.ts"]);
});

Then("the change graph contains both atomic changes in dependency order", function () {
  const ids = requiredWorkbench().snapshot().changes.map((change) => change.changeId);
  assert.deepEqual(ids.slice(1, 3), ["api-schema", "api-runtime"]);
});

Then("reconstructing the change graph produces the original snapshot digest", function () {
  assert.equal(requiredWorkbench().reconstructDigest(), convergence.beforeDigest);
});

Given("a convergence workbench with an inseparable edit in {string}", function (path: string) {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "shared", ambiguousPath: path }));
  convergence.beforeDigest = requiredWorkbench().snapshot().snapshotDigest;
});

When("I try to split the edit into {string}", function (parts: string) {
  convergence.result = requiredWorkbench().splitChange("shared", parts.split(","), ["shared.ts", "shared.ts"]);
});

Then("the split is rejected without changing the change graph", function () {
  assert.equal((convergence.result as { ok: boolean }).ok, false);
  assert.equal(requiredWorkbench().snapshot().snapshotDigest, convergence.beforeDigest);
});

Then("the workbench explains the ambiguous hunk that needs a human boundary", function () {
  assert.match((convergence.result as { explanation: string }).explanation, /shared\.ts.*human boundary/iu);
});

Given("a change with two concurrent revision heads", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", multiHead: true }));
});

When("I open its revision history", function () {
  convergence.result = requiredWorkbench().revisionHistory("change");
});

Then("both heads retain stable revision identities", function () {
  const history = convergence.result as { heads: readonly string[] };
  assert.deepEqual(history.heads, ["rev-change-a", "rev-change-b"]);
});

Then("the superseded revision remains visible without becoming current", function () {
  const history = convergence.result as { revisions: readonly { revisionId: string; current: boolean; supersededBy?: string }[] };
  assert.ok(history.revisions.some((revision) => revision.revisionId === "rev-change-0" && !revision.current && revision.supersededBy));
});

Given("a review bundle for a three-change graph", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api", gates: true }));
});

When("I traverse cumulative and per-change review by keyboard", async function () {
  const page = await openWorkbench();
  await page.locator('[role="treeitem"]').first().focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  convergence.snapshot = await page.evaluate(() => {
    const selected = document.querySelector('[role="treeitem"][aria-selected="true"]');
    const detail = document.querySelector('[data-review-detail]');
    return { selected: selected?.getAttribute("data-change-id"), detail: detail?.getAttribute("data-change-id") } as never;
  });
});

Then("the selected change remains synchronized with the review detail", function () {
  assert.equal((convergence.snapshot as unknown as { selected: string }).selected, "api");
  assert.equal((convergence.snapshot as unknown as { detail: string }).detail, "api");
});

Then("the gate matrix distinguishes current passing stale and missing evidence", async function () {
  const text = await requiredPage().locator('[aria-label="Gate matrix"]').innerText();
  assert.match(text, /passing/iu);
  assert.match(text, /stale/iu);
  assert.match(text, /missing/iu);
});

Given("a change graph where {string} depends on {string} and {string} depends on {string}", function (_child: string, _parent: string, _middle: string, _root: string) {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "base,api,ui", dependencies: "api>base,ui>api" }));
});

When("I request a partial merge through {string}", function (changeId: string) {
  convergence.result = requiredWorkbench().planPartialMerge(changeId);
});

Then("the merge preview includes {string} and excludes {string}", function (included: string, excluded: string) {
  const result = convergence.result as { included: readonly string[] };
  assert.deepEqual(result.included, included.split(","));
  assert.ok(!result.included.includes(excluded));
});

Then("the merge control explains dependency closure before confirmation", function () {
  const result = convergence.result as { explanation: string; confirmationRequired: boolean };
  assert.equal(result.confirmationRequired, true);
  assert.match(result.explanation, /dependency-closed/iu);
});

Given("a dependency-closed merge preview for {string}", function (changes: string) {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: `${changes},ui`, dependencies: "api>base,ui>api" }));
  convergence.result = requiredWorkbench().planPartialMerge(changes.split(",").at(-1) ?? "api");
});

When("I confirm a squash with maintainer authority", function () {
  convergence.result = requiredWorkbench().squash(convergence.result as never, { authority: "maintainer.merge", confirmed: true });
});

Then("the squash records both source changes and their revisions", function () {
  const result = convergence.result as { sourceChanges: readonly string[]; sourceRevisions: readonly string[] };
  assert.deepEqual(result.sourceChanges, ["base", "api"]);
  assert.equal(result.sourceRevisions.length, 2);
});

Then("the resulting change has a new stable identity", function () {
  assert.match((convergence.result as { changeId: string }).changeId, /^squash-/u);
});

Given("an approved review for an older revision", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", staleApproval: true }));
});

When("a new revision supersedes the approved revision", function () {
  convergence.result = requiredWorkbench().mergeAuthority("change");
});

Then("merge remains blocked with an unmistakable stale approval explanation", function () {
  const result = convergence.result as { allowed: boolean; explanation: string };
  assert.equal(result.allowed, false);
  assert.match(result.explanation, /STALE.*revision/iu);
});

Given("a durable unresolved conflict with base left and right identities", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", conflict: true }));
});

When("deterministic resolution cannot resolve it", function () {
  convergence.result = requiredWorkbench().resolveConflict("conflict-1", { strategy: "deterministic" });
});

Then("the conflict remains first-class and actionable", function () {
  const result = convergence.result as { state: string; base: string; left: string; right: string };
  assert.equal(result.state, "unresolved");
  assert.ok(result.base && result.left && result.right);
});

When("an AI resolution proposal arrives and I later confirm a human resolution", function () {
  const proposal = requiredWorkbench().resolveConflict("conflict-1", { strategy: "ai-proposal" });
  assert.equal(proposal.trust, "untrusted-proposal");
  convergence.result = requiredWorkbench().resolveConflict("conflict-1", { strategy: "human", authority: "maintainer.resolve", confirmed: true });
});

Then("the AI proposal remains untrusted and the human resolution closes the conflict", function () {
  const conflict = convergence.result as { state: string; acceptedBy: string; aiProposalState: string };
  assert.equal(conflict.state, "resolved");
  assert.equal(conflict.acceptedBy, "human");
  assert.equal(conflict.aiProposalState, "untrusted-proposal");
});

Given("an offline browser replica with promised objects and a copy-on-write workspace", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", offline: true, copyMode: "copy-on-write" }));
});

When("I reconnect and hydrate the selected object", function () {
  convergence.result = requiredWorkbench().hydrate("object-1");
});

Then("availability changes without changing integrity", function () {
  const result = convergence.result as { availability: string; integrity: string };
  assert.equal(result.availability, "available");
  assert.equal(result.integrity, "verified");
});

Then("the workspace reports copy-on-write storage separately from execution isolation", function () {
  const result = convergence.result as { copyMode: string; executionIsolation: string };
  assert.equal(result.copyMode, "copy-on-write");
  assert.equal(result.executionIsolation, "none");
});

Given("a change mapped to jj and a continuous mirror with an F3 escape archive", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", forge: true }));
});

When("the mirror synchronizes the latest revision", function () {
  convergence.result = requiredWorkbench().synchronizeMirror();
});

Then("the jj change identity remains stable across revisions", function () {
  assert.equal((convergence.result as { jjChangeId: string }).jjChangeId, "jj-change-1");
});

Then("the forge fidelity report names preserved and lossy fields without exporting private content", function () {
  const result = convergence.result as { fidelity: { preserved: readonly string[]; losses: readonly string[] }; exportPayload: string };
  assert.ok(result.fidelity.preserved.includes("change.identity"));
  assert.ok(result.fidelity.losses.includes("review.threading"));
  assert.doesNotMatch(result.exportPayload, /PRIVATE_SESSION/iu);
});

Given("an agent principal with its own key sponsored by a maintainer grant", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "change", agent: true }));
});

When("the agent reserves and consumes part of its finite budget", function () {
  requiredWorkbench().reserveAgentBudget(30);
  convergence.result = requiredWorkbench().consumeAgentBudget(20);
});

Then("allocated reserved consumed released and expired amounts are distinguishable", function () {
  assert.deepEqual(convergence.result, { allocated: 100, reserved: 10, consumed: 20, released: 0, expired: 0 });
});

When("the sponsor revokes the grant", function () {
  requiredWorkbench().revokeAgentGrant();
  convergence.result = requiredWorkbench().authorizeAgentWork();
});

Then("new agent work is denied with the principal sponsor grant and budget reason", function () {
  const result = convergence.result as { allowed: boolean; explanation: string };
  assert.equal(result.allowed, false);
  assert.match(result.explanation, /agent-1.*maintainer-1.*revoked.*budget/iu);
});

Given("a public release with an SWHID and a private raw session", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "release", archive: true }));
});

When("I confirm the public archive request with release authority", function () {
  convergence.result = requiredWorkbench().archiveRelease({ visibility: "public", authority: "release.archive", confirmed: true });
});

Then("archive status is remote-confirmed for the public release", function () {
  assert.equal((convergence.result as { status: string }).status, "remote-confirmed");
});

Then("the private archive request is denied without exposing the raw session", function () {
  const denied = requiredWorkbench().archiveRelease({ visibility: "private", authority: "release.archive", confirmed: true });
  assert.equal(denied.status, "denied-private");
  assert.doesNotMatch(JSON.stringify(denied), /PRIVATE_RAW_SESSION/iu);
});

Given("an accessible convergence workbench for a branching change graph", function () {
  convergence.workbench = new ConvergenceWorkbench(createConvergenceFixture({ changes: "base,left,right", dependencies: "left>base,right>base", gates: true }));
});

When("I navigate the change graph and review list entirely by keyboard", async function () {
  const page = await openWorkbench();
  await page.setViewportSize({ width: 320, height: 640 });
  await page.locator('[role="treeitem"]').first().focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
});

Then("tree and list focus identify the same selected change and revision", async function () {
  const page = requiredPage();
  const treeId = await page.locator('[role="treeitem"][aria-selected="true"]').getAttribute("data-change-id");
  const detailId = await page.locator('[data-review-detail]').getAttribute("data-change-id");
  assert.equal(treeId, detailId);
  assert.equal(await page.locator('[role="treeitem"][tabindex="0"]').count(), 1);
});

Then("at 200 percent zoom the workbench has no horizontal page overflow", async function () {
  const page = requiredPage();
  await page.evaluate(() => { globalThis.document.documentElement.style.fontSize = "200%"; });
  assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true);
});

Given("the convergence operations console has a partial promisor and quarantined mirror", function () {
  convergence.operations = operationsFixture({ promisor: "partial", mirror: "quarantined" });
});

When("I inspect repository convergence health", function () {
  convergence.result = renderConvergenceOperationsPanel(requiredOperations());
});

Then("promised missing objects are reported as availability gaps not corruption", function () {
  assert.match(String(convergence.result), /availability gap.*integrity verified/iu);
});

Then("quarantine recovery names the signed checkpoint and explicit retry", function () {
  assert.match(String(convergence.result), /checkpoint-42.*Retry mirror/iu);
});

Given("the convergence operations console negotiated Git protocol v2 with blob filtering", function () {
  convergence.operations = operationsFixture({ gitProtocol: "v2", objectFilter: "blob:none" });
});

When("a protected ref rejects an unauthorized push", function () {
  convergence.operations = { ...requiredOperations(), rejectedPush: { ref: "refs/heads/main", reason: "grant does not allow force or protected-ref update" } };
  convergence.result = renderConvergenceOperationsPanel(requiredOperations());
});

Then("the operator sees the negotiated partial-clone capability and rejection reason", function () {
  assert.match(String(convergence.result), /Git protocol.*v2.*blob:none.*grant does not allow/isu);
});

Then("no rejected object is reported as mirrored or archived", function () {
  assert.doesNotMatch(String(convergence.result), /rejected-object.*(?:mirrored|archived)/iu);
});

Given("the convergence operations console has mirror lag and a finite sponsored agent", function () {
  convergence.operations = operationsFixture({ mirror: "lagging", agent: true });
});

When("I inspect the convergence audit surface", function () {
  convergence.result = renderConvergenceOperationsPanel(requiredOperations());
});

Then("mirror drift retry principal key grant and budget states remain independently labeled", function () {
  const html = String(convergence.result);
  for (const label of ["Mirror lag", "Drift", "Retry", "Principal", "Key", "Grant", "Allocated", "Reserved", "Consumed", "Released", "Expired"]) assert.match(html, new RegExp(label, "iu"));
});

Then("workspace provider object residency F3 fidelity SWHID and archive status are visible", function () {
  const html = String(convergence.result);
  for (const label of ["Workspace provider", "Object residency", "F3 v4.0", "SWHID", "Archive status"]) assert.match(html, new RegExp(label, "iu"));
});

Given("the convergence operations console contains private session and credential sentinels", function () {
  const unsafe = operationsFixture({});
  convergence.operations = {
    ...unsafe,
    supportBundle: createRedactedConvergenceSupportBundle(unsafe, {
      rawSession: "PRIVATE_SESSION",
      credential: "SECRET_CREDENTIAL",
    }),
  };
});

When("I prepare a support bundle and inspect merge force grant budget and public archive controls", function () {
  convergence.supportBundle = requiredOperations().supportBundle;
  convergence.result = renderConvergenceOperationsPanel(requiredOperations());
});

Then("the support bundle contains diagnostics without either sentinel", function () {
  assert.match(convergence.supportBundle ?? "", /promisor|mirror/iu);
  assert.doesNotMatch(convergence.supportBundle ?? "", /PRIVATE_SESSION|SECRET_CREDENTIAL/iu);
});

Then("every mutating control names required authority and requires confirmation", function () {
  const html = String(convergence.result);
  for (const action of ["merge", "force", "grant", "budget", "public-archive"]) {
    assert.match(html, new RegExp(`data-mutation="${action}"[^>]+data-confirmation-required="true"[^>]+data-authority=`, "iu"));
  }
});

function requiredWorkbench(): ConvergenceWorkbench {
  assert.ok(convergence.workbench);
  return convergence.workbench;
}

function requiredOperations(): CommunityConvergenceOperations {
  assert.ok(convergence.operations);
  return convergence.operations;
}

function requiredPage(): Page {
  assert.ok(convergence.page);
  return convergence.page;
}

async function openWorkbench(): Promise<Page> {
  convergence.browser = await chromium.launch(chromiumLaunchOptions());
  convergence.page = await convergence.browser.newPage();
  await convergence.page.setContent(renderConvergenceWorkbench(requiredWorkbench().snapshot()));
  return convergence.page;
}

function operationsFixture(overrides: Record<string, unknown>): CommunityConvergenceOperations {
  const base: CommunityConvergenceOperations = {
    promisor: { health: "degraded", missingPromised: 3, integrity: "verified" },
    workspace: { provider: "browser-opfs", copyMode: "copy-on-write", executionIsolation: "none" },
    mirror: { state: "lagging", lagSeconds: 90, drift: 2, checkpoint: "checkpoint-42", retryAction: "Retry mirror" },
    forge: { protocol: "F3 v4.0", fidelity: "loss-aware", transport: "local" },
    archive: { swhid: "swh:1:rev:0123456789abcdef0123456789abcdef01234567", status: "pending" },
    identity: { principal: "agent-1", key: "active", sponsor: "maintainer-1", grant: "active", budget: { allocated: 100, reserved: 10, consumed: 20, released: 5, expired: 0 } },
    git: { protocol: "v2", objectFilter: "blob:none" },
    sync: { bundle: "bundle-9", checkpoint: "checkpoint-42", quarantine: "recoverable" },
    objectResidency: "promised-remote",
    supportBundle: JSON.stringify({ promisor: "degraded", mirror: "lagging", redacted: true }),
    mutationAuthorities: {
      merge: "maintainer.merge", force: "maintainer.force", grant: "identity.grant", budget: "budget.allocate", "public-archive": "release.archive",
    },
  };
  return {
    ...base,
    ...(overrides.promisor === "partial" ? { promisor: { ...base.promisor, missingPromised: 3 } } : {}),
    ...(overrides.mirror === "quarantined" ? { mirror: { ...base.mirror, state: "quarantined" as const } } : {}),
    ...(overrides.mirror === "lagging" ? { mirror: { ...base.mirror, state: "lagging" as const } } : {}),
    ...(overrides.gitProtocol === undefined ? {} : { git: { ...base.git, protocol: String(overrides.gitProtocol) } }),
    ...(overrides.objectFilter === undefined ? {} : { git: { ...base.git, objectFilter: String(overrides.objectFilter), ...(overrides.gitProtocol === undefined ? {} : { protocol: String(overrides.gitProtocol) }) } }),
  };
}
