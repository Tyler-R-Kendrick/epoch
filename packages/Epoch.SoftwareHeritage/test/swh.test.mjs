import assert from "node:assert/strict";
import test from "node:test";
import { SaveCodeNowClient, SWH_CAPABILITIES, formatSwhid, gitObjectId, parseSwhid, swhidForGitObject, swhKindForGitType } from "../dist/index.js";
import { inspectSwhid } from "../../Epoch.Protocol/dist/index.js";

test("SWHID v1.2 parses and canonically formats all core object kinds and qualifiers", () => {
  for (const kind of ["cnt", "dir", "rev", "rel", "snp"]) {
    const value = `swh:1:${kind}:${"ab".repeat(20)};origin=https%3A%2F%2Fexample.test%2Frepo;visit=swh%3A1%3Asnp%3A${"cd".repeat(20)};path=%2Fsrc%2Fmain.ts;lines=1-2`;
    assert.equal(formatSwhid(parseSwhid(value)), value);
  }
  assert.throws(() => parseSwhid(`swh:2:cnt:${"ab".repeat(20)}`), /version/u);
  assert.throws(() => parseSwhid("swh:1:cnt:abc"), /digest/u);
  const qualified = `swh:1:rev:${"ab".repeat(20)};path=%2Fsrc%2Fmain.ts;lines=1-2`;
  assert.deepEqual(parseSwhid(qualified).qualifiers, inspectSwhid(qualified).qualifiers);
  for (const malformed of [
    `swh:1:ori:${"ab".repeat(20)}`,
    `swh:1:rev:${"ab".repeat(20)}:ignored`,
    `swh:1:rev:${"ab".repeat(20)};unknown=value`,
    `swh:1:rev:${"ab".repeat(20)};path=%zz`,
  ]) {
    assert.throws(() => parseSwhid(malformed));
    assert.throws(() => inspectSwhid(malformed));
  }
});

test("Git-compatible object serialization matches official empty blob golden vector", () => {
  const empty = new Uint8Array();
  assert.equal(gitObjectId("blob", empty, "sha1"), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  assert.equal(swhidForGitObject("cnt", "blob", empty), "swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  assert.equal(gitObjectId("tree", empty, "sha1"), "4b825dc642cb6eb9a060e54bf8d69288fbee4904");
  assert.deepEqual(["blob", "tree", "commit", "tag"].map(swhKindForGitType), ["cnt", "dir", "rev", "rel"]);
});

test("Save Code Now uses injected transport, bounded retry, and remote confirmation", async () => {
  let calls = 0;
  const client = new SaveCodeNowClient({
    transport: async () => { calls += 1; return calls === 1 ? { status: 503, body: {} } : { status: 200, body: { save_task_status: "succeeded", visit_status: "full", origin_url: "https://example.test/repo" } }; },
    maxAttempts: 2,
  });
  const result = await client.save({ origin: "https://example.test/repo", visibility: "public" });
  assert.equal(result.confirmed, true);
  assert.equal(calls, 2);
});

test("archive client denies private/local origins and never promotes pending responses", async () => {
  const client = new SaveCodeNowClient({ transport: async () => ({ status: 200, body: { save_task_status: "pending" } }), maxAttempts: 1 });
  await assert.rejects(() => client.save({ origin: "https://example.test/private", visibility: "private" }), /private/u);
  await assert.rejects(() => client.save({ origin: "file:///workspace/repo", visibility: "public" }), /local/u);
  assert.deepEqual(await client.save({ origin: "https://example.test/repo", visibility: "public" }), { confirmed: false, state: "pending", attempts: 1 });
});

test("capability manifest pins SWHID v1.2 without claiming live transport", () => {
  assert.equal(SWH_CAPABILITIES.specVersion, "1.2");
  assert.equal(SWH_CAPABILITIES.specDate, "2026-03-04");
  assert.equal(SWH_CAPABILITIES.accessedAt, "2026-08-11");
  assert.equal(SWH_CAPABILITIES.transport, "injected");
});
