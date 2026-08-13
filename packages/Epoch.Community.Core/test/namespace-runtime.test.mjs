import assert from "node:assert/strict";
import {
  InMemoryProjectionRuntime,
  ProjectionDeltaController,
  createNamespaceRuntime,
} from "../dist/namespace.js";

const target = (objectId, kind = "project") => ({ objectId, kind });
const complete = {
  status: "complete",
  sources: [],
  omittedSources: [],
  unsupportedPredicates: [],
};
const capabilities = { read: true, enter: true, expand: true, composeUnder: false, execute: false };
const entry = (projectionId, name, objectId, parentEntryId = "root", overrides = {}) => ({
  entryId: `${projectionId}:${parentEntryId}:${name}:${objectId}`,
  target: target(objectId),
  projectionId,
  projectionVersion: 1,
  parentEntryId,
  name,
  logicalPath: `/${name}`,
  kind: "entity",
  sortKey: [name, objectId],
  capabilities,
  freshness: complete,
  ...overrides,
});

const source = new Map([
  ["builtin:default", {
    "/": [entry("builtin:default", "projects", "builtin-projects", "root", { kind: "directory" }), entry("builtin:default", "shared", "builtin-shared")],
    "/projects": [entry("builtin:default", "alpha", "project-alpha", "builtin-projects", { logicalPath: "/projects/alpha" })],
  }],
  ["projection-community", { "/": [entry("projection-community", "shared", "community-shared"), entry("projection-community", "community", "community-only")] }],
  ["projection-user", { "/": [entry("projection-user", "shared", "user-shared"), entry("projection-user", "mine", "user-mine")] }],
  ["projection-session", { "/": [entry("projection-session", "session", "session-only")] }],
]);
const calls = { list: [], resolve: [], locate: [] };
const dataSource = {
  async list(projectionId, path, page) {
    calls.list.push(`${projectionId}:${path}`);
    const entries = source.get(projectionId)?.[path] ?? [];
    return { entries: entries.slice(0, page.first), pageInfo: { hasNextPage: entries.length > page.first }, freshness: complete };
  },
  async resolve(projectionId, path) {
    calls.resolve.push(`${projectionId}:${path}`);
    const parent = path.split("/").slice(0, -1).join("/") || "/";
    const name = path.split("/").at(-1);
    return source.get(projectionId)?.[parent]?.find((candidate) => candidate.name === name);
  },
  async locate(projectionId, object) {
    calls.locate.push(`${projectionId}:${object.objectId}`);
    return Object.values(source.get(projectionId) ?? {}).flat().filter((candidate) => candidate.target.objectId === object.objectId);
  },
};

const projections = new InMemoryProjectionRuntime(dataSource, ["projection-community", "projection-user", "projection-session"].map(definition));
const namespace = createNamespaceRuntime(projections, [
  mount("builtin", "builtin-root", "builtin:default", "replace", 0, false),
  mount("community", "community-root", "projection-community", "after", 0, false),
  mount("user", "user-root", "projection-user", "before", 0, true),
  mount("session", "session-root", "projection-session", "after", 0, false),
]);
const context = { authorizationFingerprint: "actor-a", snapshotId: "snapshot-a" };

assert.equal((await projections.compile({
  apiVersion: "epoch.dev/v1alpha1", projectionId: "compile-test", version: 1, label: "Compile", visibility: "private",
  root: { nodeId: "root", kind: "literal", segment: "root", children: [] },
  order: [{ field: "objectId", direction: "ascending", nulls: "last" }], updateMode: "live", consistency: "current",
}, { fields: ["kind", "objectId"], sortableFields: ["kind", "objectId"], limits: { maxDepth: 8, maxNodes: 20, maxFanout: 20, maxTemplateLength: 256, maxSegmentLength: 120 } })).nodeCount, 1);

const root = await namespace.list("/", { first: 20 }, context);
assert.deepEqual(root.entries.map((value) => value.name), [".epoch", "shared", "mine", "projects", "session", "community"]);
assert.equal(root.entries[1].target.objectId, "user-shared", "first visible name follows scope and before/replace/after precedence");
assert.deepEqual(root.shadowed.filter((value) => value.name === "shared").map((value) => value.entry.target.objectId), ["builtin-shared", "community-shared"]);
assert.deepEqual(calls.list.sort(), [
  "builtin:default:/", "projection-community:/", "projection-session:/", "projection-user:/",
]);
const firstPage = await namespace.list("/", { first: 2 }, context);
const cursorBytes = Uint8Array.from(globalThis.atob(firstPage.pageInfo.endCursor.replaceAll("-", "+").replaceAll("_", "/")), (character) => character.charCodeAt(0));
assert.doesNotMatch(String.fromCharCode(...cursorBytes), /shared|actor-a|snapshot-a/u);
const secondPage = await namespace.list("/", { first: 20, after: firstPage.pageInfo.endCursor }, context);
assert.equal(new Set([...firstPage.entries, ...secondPage.entries].map((value) => value.entryId)).size, root.entries.length);

const resolved = await namespace.resolve("/shared", context);
assert.equal(resolved?.target.objectId, "user-shared");
assert.equal(calls.resolve[0], "projection-user:/shared", "first-match lookup stops at the winning component");
const located = await namespace.locate(target("project-alpha"), context);
assert.equal(located[0]?.logicalPath, "/projects/alpha");

const recovery = await namespace.list("/.epoch", { first: 20 }, context);
assert.deepEqual(recovery.entries.map((value) => value.name), ["default", "canonical", "projections", "sources", "diagnostics"]);
assert.equal((await namespace.resolve("/.epoch/default", context))?.kind, "mount");
assert.throws(() => namespace.mount(mount("user", "bad", "projection-user", "replace", 0, false, "/.epoch")), (error) => error.code === "NAMESPACE_RECOVERY_PROTECTED");
assert.throws(() => namespace.unmount("recovery-default"), (error) => error.code === "NAMESPACE_RECOVERY_PROTECTED");

namespace.mount(mount("user", "replace-root", "projection-user", "replace", 5, true));
assert.deepEqual((await namespace.list("/", { first: 20 }, context)).entries.map((value) => value.name), [".epoch", "shared", "mine", "session"]);
const reset = namespace.reset("user");
assert.deepEqual([...reset.removedMountIds].sort(), ["replace-root", "user-root"]);
assert.ok(namespace.definitions().includes("projection-user"), "reset preserves projection definitions for recovery/export");
assert.equal((await namespace.resolve("/.epoch/default", context))?.projectionId, "builtin:default");

source.set("projection-bad", {});
const brokenSource = { ...dataSource, async list(projectionId, path, page) {
  if (projectionId === "projection-bad") throw new Error("malformed projection");
  return dataSource.list(projectionId, path, page);
} };
const broken = createNamespaceRuntime(new InMemoryProjectionRuntime(brokenSource, [definition("projection-bad")]), [mount("user", "broken-root", "projection-bad", "replace", 0, false)]);
assert.equal((await broken.resolve("/.epoch/default", context))?.projectionId, "builtin:default", "malformed user projections cannot strand recovery");

const writable = createNamespaceRuntime(projections, [
  mount("builtin", "builtin-root", "builtin:default", "replace", 0, false),
  mount("user", "writable", "projection-user", "before", 0, true, "/projects"),
]);
assert.ok((await writable.list("/", { first: 20 }, context)).entries.some((value) => value.name === "projects" && value.kind === "directory"));
assert.equal(writable.writableMountFor("/projects/new", context).mountId, "writable");
writable.mount(mount("workspace", "also-writable", "projection-community", "after", 0, true, "/projects"));
assert.throws(() => writable.writableMountFor("/projects/new", context), (error) => error.code === "NAMESPACE_MOUNT_CONFLICT");
assert.throws(() => writable.writableMountFor("/unknown/new", context), /read-only/u);

const stale = await namespace.list("/", { first: 1, after: "cursor-for-another-snapshot" }, context).catch((error) => error);
assert.ok(["CURSOR_STALE", "CURSOR_INVALID"].includes(stale.code));

const deltas = new ProjectionDeltaController();
const live = deltas.track("live", [entry("projection-user", "one", "one")], { focusedEntryId: "focus", targetId: "one", readingAnchor: { objectId: "one", pixelOffset: 40 } });
const applied = live.ingest({ projectionId: "projection-user", projectionVersion: 1, sequence: 1, upserts: [entry("projection-user", "two", "two")], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" });
assert.equal(applied.applied, true);
assert.deepEqual(applied.anchor.readingAnchor, { objectId: "one", pixelOffset: 40 });

const queued = deltas.track("queued", [entry("projection-user", "one", "one")], { targetId: "one" });
assert.equal(queued.ingest({ projectionId: "projection-user", projectionVersion: 1, sequence: 1, upserts: [entry("projection-user", "two", "two")], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" }).queuedCount, 1);
assert.equal(queued.entries().length, 1);
assert.equal(queued.applyQueued().entries.length, 2);

const frozen = deltas.track("snapshot", [entry("projection-user", "one", "one")], { targetId: "one" });
assert.equal(frozen.ingest({ projectionId: "projection-user", projectionVersion: 1, sequence: 1, upserts: [entry("projection-user", "two", "two")], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" }).queuedCount, 0);
assert.equal(frozen.entries().length, 1);
const versioned = deltas.track("live", [entry("projection-user", "one", "one")], { targetId: "one" });
versioned.ingest({ projectionId: "projection-user", projectionVersion: 1, sequence: 1, upserts: [], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" });
assert.throws(() => versioned.ingest({ projectionId: "projection-user", projectionVersion: 2, sequence: 2, upserts: [], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" }), /changed projection identity/u);

async function* changes() {
  yield { projectionId: "projection-user", projectionVersion: 1, sequence: 1, upserts: [], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" };
}
const watched = [];
for await (const delta of projections.watch("projection-user", "/", { ...context, signal: new globalThis.AbortController().signal, changes: changes() })) watched.push(delta.sequence);
assert.deepEqual(watched, [1]);

const canonical = await namespace.resolve("/.epoch/canonical/project/project-alpha", context);
assert.equal(canonical?.target.objectId, "project-alpha");
const projectionDefinitions = await namespace.list("/.epoch/projections", { first: 20 }, context);
assert.ok(projectionDefinitions.entries.some((value) => value.name === "builtin:default"));

const malicious = new InMemoryProjectionRuntime({
  ...dataSource,
  async list() { return { entries: [entry("wrong-projection", "../escape", "bad")], pageInfo: { hasNextPage: false }, freshness: complete }; },
});
await assert.rejects(() => malicious.list("projection-user", "/", { first: 1 }, context), (error) => error.code === "PROJECTION_INVALID");

function mount(scope, mountId, projectionId, mode, order, writable, mountPath = "/") {
  return { mountId, scope, mountPath, projectionId, mode, order, writable, createdAt: "2026-08-12T12:00:00.000Z", updatedAt: "2026-08-12T12:00:00.000Z" };
}

function definition(projectionId) {
  return { apiVersion: "epoch.dev/v1alpha1", projectionId, version: 1, label: projectionId, visibility: "private", root: { nodeId: "root", kind: "literal", segment: "root", children: [] }, order: [{ field: "objectId", direction: "ascending", nulls: "last" }], updateMode: "live", consistency: "current" };
}
