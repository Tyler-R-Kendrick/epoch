import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

function load(name, window) {
  new Function("window", readFileSync(join(root, name), "utf8"))(window);
}

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
}

const localStorage = storage();
const window = { localStorage };
load("community-core-runtime.js", window);
load("data.js", window);
load("query.js", window);
load("saved-views.js", window);
load("sitemap.js", window);
load("graphql-engine.js", window);
load("graph.js", window);

const { NB_DATA: data, NB_MAP: map, NB_QUERY: query, NB_SAVED_VIEWS: views } = window;

// NAV-ID-001/002/003: fixture identity is explicit and alias/order independent.
const message = data.posts.find((post) => post.id === "p1");
assert.equal(map.objectRef(message).objectId, "p1");
assert.equal(map.postName(message, 0), "p1");
assert.equal(map.postName({ ...message, subject: "changed", body: "changed" }, 99), "p1");

// NAV-ID-005: canonical, contextual, and exact links identify one object distinctly.
const canonicalLink = window.NB_CORE.objectUrl(map.objectRef(message));
const contextualLink = window.NB_CORE.objectUrl(map.objectRef(message), { projectionId: "channel-general" });
const exactLink = window.NB_CORE.objectUrl(map.objectRef(message), { revision: "cid-2" });
assert.notEqual(canonicalLink, contextualLink);
assert.notEqual(canonicalLink, exactLink);
assert.deepEqual(window.NB_CORE.parseObjectUrl(contextualLink), {
  objectId: "p1", projectionId: "channel-general",
});

// NAV-GRAPH-001: a message is an enterable capability object with representations.
const feed = map.feedEntriesAt("/projects/community/channels/general");
const entry = feed.find((item) => item.post.id === "p1");
assert.equal(entry.kind, "message");
assert.deepEqual(entry.capabilities, {
  read: true,
  enter: true,
  expand: true,
  composeUnder: true,
  execute: false,
});
assert.deepEqual(
  map.list("/projects/community/channels/general/p1").map((item) => item.name),
  ["body.md", "metadata.json", "replies", "backlinks", "receipts"],
);
assert.deepEqual(
  map.list("/projects/community/channels/general/p1/replies").map((item) => item.objectId),
  ["p2"],
);

// NAV-QUERY-001/002/004: validated, normalized, versioned saved projections.
const invalid = query.parse("sttae:needs-review");
assert.match(invalid.error, /unknown.*sttae/);
assert.match(invalid.error, /state/);
const saved = views.save({
  label: "Review queue",
  query: " (( channel:general ))   sort:new ",
  visibility: "private",
});
assert.match(saved.projectionId, /^view-/);
assert.equal(saved.queryLanguageVersion, query.VERSION);
assert.equal(saved.query, "channel:general sort:new");
assert.deepEqual(views.get(saved.projectionId).ast, saved.ast);
assert.deepEqual(views.list({ includePrivate: false }), []);
assert.equal(views.rename(saved.projectionId, "Needs review").projectionId, saved.projectionId);

// NAV-PROJ-001/NAV-ID-003: mounted occurrences retain identity and context.
const channelOccurrence = map.list("/projects/community/channels/general")
  .find((item) => item.objectId === "p1");
const savedOccurrence = map.list(`/views/${saved.projectionId}`)
  .find((item) => item.objectId === "p1");
assert.equal(channelOccurrence.objectId, savedOccurrence.objectId);
assert.notEqual(channelOccurrence.projectionId, savedOccurrence.projectionId);
assert.equal(map.objectAtPath(savedOccurrence.aliasPath).objectId, "p1");
assert.equal(map.pathForProjection(saved.projectionId), `/views/${saved.projectionId}`);
assert.equal(map.pathForObject("p1", saved.projectionId), `/views/${saved.projectionId}/p1`);
const mounted = map.projectionLocations("p2");
assert.ok(["channel-general", saved.projectionId, "activity-subscribed", "search-global"]
  .every((projectionId) => mounted.some((location) => location.projectionId === projectionId)));
assert.equal(map.objectAtPath("/notifications/subscribed/n6").objectId, "p2");

// NAV-PROJ-002: a saved view retains the canonical backing object.
savedOccurrence.post.state = "read";
assert.equal(map.feedEntriesAt("/projects/community/channels/general")
  .find((item) => item.objectId === "p1").post.state, "read");
savedOccurrence.post.state = "open";

// NAV-QUERY-003: public projections exclude private DM objects by default.
const publicView = views.save({ label: "Public all", query: "", visibility: "public" });
assert.equal(views.open(publicView.projectionId, data.dmMessages).posts.length, 0);

// NAV-MIGRATE-003/NAV-GRAPH-004: frozen legacy aliases resolve without defining topology.
assert.equal(
  map.postAt("/projects/community/channels/general/001-lea-every-cold-install-her").id,
  "p1",
);
assert.equal(map.postAt("/projects/community/channels/general/p1").id, "p1");

// NAV-GRAPH-003: a missing parent is materialized without reparenting its child.
data.posts.push({
  id: "orphan-child", channel: "general", who: "lea", at: "12:30", state: "open",
  sig: "sig:orphan", body: "child remains below missing parent", re: "missing-parent",
});
const missingParent = map.list("/projects/community/channels/general")
  .find((item) => item.objectId === "missing-parent");
assert.equal(missingParent.kind, "tombstone");
assert.equal(missingParent.capabilities.composeUnder, false);
assert.deepEqual(
  map.list("/projects/community/channels/general/missing-parent/replies")
    .map((item) => item.objectId),
  ["orphan-child"],
);

// GraphQL/API surface is object/projection/graph based, not path identity.
assert.match(window.NB_GRAPH.SDL, /type ObjectRef/);
assert.match(window.NB_GRAPH.SDL, /inReplyTo: Message/);
assert.match(window.NB_GRAPH.SDL, /threadRoot: Message!/);
assert.match(window.NB_GRAPH.SDL, /type Projection/);
assert.match(window.NB_GRAPH.SDL, /capabilities: EntryCapabilities!/);
const graphResult = await window.NB_GRAPH.query(`{
  object(objectId: "p2") {
    ref { objectId canonicalUrl }
    inReplyTo { ref { objectId } }
    threadRoot { ref { objectId } }
    locations { projectionId aliasPath }
  }
}`);
assert.equal(graphResult.errors, undefined);
assert.equal(graphResult.data.object.ref.objectId, "p2");
assert.equal(graphResult.data.object.inReplyTo.ref.objectId, "p1");
assert.equal(graphResult.data.object.threadRoot.ref.objectId, "p1");
assert.ok(graphResult.data.object.locations.length >= 2);
const orphanResult = await window.NB_GRAPH.query(`{
  object(objectId: "orphan-child") {
    inReplyTo { ref { objectId } tombstone { reason } }
    threadRoot { ref { objectId } }
  }
}`);
assert.equal(orphanResult.data.object.inReplyTo.ref.objectId, "missing-parent");
assert.equal(orphanResult.data.object.inReplyTo.tombstone.reason, "missing");
assert.equal(orphanResult.data.object.threadRoot.ref.objectId, "missing-parent");

// NAV-GRAPH-002/NAV-GRAPH-004: explicit ID operations survive ordering/alias changes.
const branch = { ...data.posts.find((post) => post.id === "p2"), id: "p2-sibling", re: "p1" };
const graph = map.messageGraph([branch, ...data.posts.slice().reverse()]);
assert.equal(graph.parentOf("p2").objectId, "p1");
assert.equal(graph.rootOf("p3").objectId, "p1");
assert.equal(graph.firstChildOf("p1").objectId, "p2-sibling");
assert.equal(graph.nextSiblingOf("p2-sibling").objectId, "p2");
assert.equal(graph.previousSiblingOf("p2").objectId, "p2-sibling");

// NAV-QUERY-004: previous query versions migrate once without reinterpretation.
const legacyStorage = storage({
  "nb-saved-views-v1": JSON.stringify({
    views: [{ id: "view-stable", label: "Old review", query: " state:needs-review  sort:new " }],
  }),
});
const legacyWindow = { localStorage: legacyStorage };
load("community-core-runtime.js", legacyWindow);
load("data.js", legacyWindow);
load("query.js", legacyWindow);
load("saved-views.js", legacyWindow);
assert.equal(legacyWindow.NB_SAVED_VIEWS.get("view-stable").query, "state:needs-review sort:new");
const migratedOnce = legacyStorage.snapshot()["nb-saved-views-v2"];
load("saved-views.js", legacyWindow);
assert.equal(legacyStorage.snapshot()["nb-saved-views-v2"], migratedOnce);

stdout.write("nightboard navigation/projection focused tests passed\n");
