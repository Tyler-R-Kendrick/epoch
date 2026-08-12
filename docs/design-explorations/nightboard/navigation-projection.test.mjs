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

views.setPrincipal("principal-alice");

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
assert.equal(entry.kind, "message", "NAV-GRAPH-001 message is an enterable capability object");
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

// Object-bearing namespace entries use explicit canonical refs, never path/name artifacts.
const canonicalEntries = [
  map.list("/projects").find((item) => item.name === "community"),
  map.list("/projects/community/channels").find((item) => item.name === "general"),
  map.list("/members").find((item) => item.name === "maya"),
  map.list("/dms").find((item) => item.name === "scout"),
  map.list("/.agents").find((item) => item.name === "bo"),
];
assert.deepEqual(canonicalEntries.map((item) => item.ref.kind),
  ["project", "channel", "member", "dm", "agent"]);
assert.equal(new Set(canonicalEntries.map((item) => item.ref.objectId)).size, canonicalEntries.length);
assert.ok(canonicalEntries.every((item) => item.ref.kind !== "artifact"));
assert.equal(map.postAt("/projects/community/channels/general/p1/body.md").body, message.body);
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
assert.equal(views.get(saved.projectionId).ownerId, "principal-alice");

// NAV-QUERY-003: principal switches never list or open another owner's private view.
views.setPrincipal("principal-bob");
assert.equal(views.get(saved.projectionId), null);
assert.equal(views.list().some((view) => view.projectionId === saved.projectionId), false);
assert.match(views.open(saved.projectionId, data.posts).error, /unauthorized/);
views.setPrincipal("principal-alice");
assert.equal(views.get(saved.projectionId).projectionId, saved.projectionId);

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
const sharedSecretView = views.save({
  label: "Shared without raw query", query: "body:PRIVATE_QUERY_SENTINEL", visibility: "shared",
});
views.setPrincipal("principal-bob");
assert.equal(views.get(sharedSecretView.projectionId).query, undefined,
  "non-owner saved-view metadata redacts the raw query");
assert.equal(views.open(sharedSecretView.projectionId, data.posts).error, null,
  "redaction does not prevent authorized projection evaluation");
views.setPrincipal("principal-alice");

// NAV-ID-004/NAV-QUERY-003: DM content is authorized before search/query evaluation.
const privateNeedle = "Scoped to CI config only";
const livePrivateNeedle = "LIVE_DM_DO_NOT_LEAK_91c2";
window.NB_APP = { state: { merged: [{
  id: "live-dm-private", dm: "scout", who: "you", at: "now", state: "open",
  sig: "sig:live-private", body: livePrivateNeedle,
}] } };
assert.equal(query.searchBoard('"' + privateNeedle + '"').matched, 0,
  "NAV-ID-004 board search filters private DM corpus before query evaluation");
assert.equal(query.searchBoard("scout").hits.some((hit) => hit.path === "/dms/scout"), false,
  "NAV-ID-004 board search filters private DM paths before fuzzy path matching");
assert.equal(query.searchBoard('"' + privateNeedle + '"', {
  viewer: { actorId: "principal-alice", readableDmIds: ["scout"] },
}).matched, 1);

// NAV-MIGRATE-003/NAV-GRAPH-004: frozen legacy aliases resolve without defining topology.
assert.equal(
  map.postAt("/projects/community/channels/general/001-lea-every-cold-install-her").id,
  "p1",
  "NAV-MIGRATE-003 legacy locators resolve to stable objects",
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
    context { objectId kind canonicalUrl }
    inReplyTo { ref { objectId } }
    threadRoot { ref { objectId } }
    locations { projectionId aliasPath }
  }
}`);
assert.equal(graphResult.errors, undefined);
assert.equal(graphResult.data.object.ref.objectId, "p2");
assert.equal(graphResult.data.object.context.objectId, "channel-general");
assert.equal(graphResult.data.object.context.kind, "channel");
assert.equal(graphResult.data.object.inReplyTo.ref.objectId, "p1");
assert.equal(graphResult.data.object.threadRoot.ref.objectId, "p1");
assert.ok(graphResult.data.object.locations.length >= 2);
const privateGraphSearch = await window.NB_GRAPH.query(`{
  search(text: "${privateNeedle}") { id body dm }
}`);
assert.deepEqual(privateGraphSearch.data.search, [],
  "NAV-ID-004 GraphQL search filters private DM corpus before resolver matching");
const livePrivateGraphSearch = await window.NB_GRAPH.query(`{
  search(text: "${livePrivateNeedle}") { id body dm }
  posts { id body dm }
}`);
assert.deepEqual(livePrivateGraphSearch.data.search, [],
  "NAV-ID-004 GraphQL search filters live private DMs before resolver matching");
assert.equal(livePrivateGraphSearch.data.posts.some((post) => post.id === "live-dm-private"), false,
  "NAV-ID-004 GraphQL posts cannot expose a live private DM through the public corpus");
const authorizedGraphSearch = await window.NB_GRAPH.query(`{
  search(text: "${privateNeedle}") { id body dm }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(authorizedGraphSearch.data.search.map((post) => post.id), ["dm-s3"]);
const sharedProjectionGraph = await window.NB_GRAPH.query(`{
  projection(projectionId: "${sharedSecretView.projectionId}") { projectionId query }
}`, undefined, { actorId: "principal-bob" });
assert.equal(sharedProjectionGraph.errors, undefined);
assert.equal(sharedProjectionGraph.data.projection.projectionId, sharedSecretView.projectionId);
assert.equal(sharedProjectionGraph.data.projection.query, null,
  "GraphQL applies the same non-owner query redaction as the Community API");
const authorizedLiveGraphSearch = await window.NB_GRAPH.query(`{
  search(text: "${livePrivateNeedle}") { id }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(authorizedLiveGraphSearch.data.search.map((post) => post.id), ["live-dm-private"]);

// NAV-ID-004/NAV-QUERY-003: namespace listings enforce the same DM boundary.
const anonymousDmListing = await window.NB_GRAPH.query(`{
  listPath(path: "/dms") { name path }
}`);
assert.deepEqual(anonymousDmListing.data.listPath, [],
  "NAV-ID-004 unauthenticated GraphQL listPath cannot enumerate DM threads");
const foreignDmListing = await window.NB_GRAPH.query(`{
  listPath(path: "/dms/scout") { name path }
}`, undefined, { actorId: "principal-bob", readableDmIds: [] });
assert.deepEqual(foreignDmListing.data.listPath, [],
  "NAV-QUERY-003 a foreign principal cannot enumerate another owner's messages");
const ownerDmListing = await window.NB_GRAPH.query(`{
  listPath(path: "/dms") { name path }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(ownerDmListing.data.listPath.map((entry) => entry.name), ["scout"],
  "NAV-QUERY-003 an authorized participant sees only their readable DM thread");

// board_search uses the same pre-query authorization boundary as direct search.
const tools = {};
window.NB_MCP = {
  registerTool(tool) { tools[tool.name] = tool; },
  list() { return Object.values(tools); },
  text(text) { return { text, ok: true }; },
  fail(text) { return { text, ok: false }; },
};
window.NB_THEMES = [];
load("tools.js", window);
let boardSearchViewer = {};
window.NB_TOOLS.install({
  state: { path: "/", merged: [], votes: {}, reactions: {} },
  viewerContext() { return boardSearchViewer; },
  runSearch(search) {
    const result = query.searchBoard(search, { viewer: boardSearchViewer });
    const formatted = query.formatSearchResults(result);
    return { ...formatted, result };
  },
});
const boardSearch = await tools.board_search.execute({ query: '"' + privateNeedle + '"' });
assert.match(boardSearch.text, /no matches/);
assert.doesNotMatch(boardSearch.text, /dm-s3/);
boardSearchViewer = { actorId: "principal-alice", readableDmIds: ["scout"] };
const authorizedBoardSearch = await tools.board_search.execute({ query: '"' + privateNeedle + '"' });
assert.match(authorizedBoardSearch.text, /dm-s3|Scoped to CI config only/,
  "NAV-QUERY-003 board_search uses the authorized viewer corpus");
boardSearchViewer = {};
const anonymousBoardList = await tools.board_list.execute({ path: "/dms" });
assert.equal(anonymousBoardList.text, "",
  "NAV-ID-004 board_list cannot enumerate DMs without a viewer");
boardSearchViewer = { actorId: "principal-bob", readableDmIds: [] };
const foreignBoardList = await tools.board_list.execute({ path: "/dms/scout" });
assert.equal(foreignBoardList.text, "",
  "NAV-QUERY-003 board_list hides another principal's DM messages");
boardSearchViewer = { actorId: "principal-alice", readableDmIds: ["scout"] };
const ownerBoardList = await tools.board_list.execute({ path: "/dms" });
assert.match(ownerBoardList.text, /scout/,
  "NAV-QUERY-003 board_list retains authorized DM navigation");
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
assert.equal(graph.nextUnreadOf("p2-sibling").objectId, "p2");

// Live nested replies derive their root through Core graph traversal.
const liveRoot = { id: "live-root", channel: "general", who: "lea", at: "12:40", state: "open", body: "root" };
const liveChild = { id: "live-child", channel: "general", who: "nora", at: "12:41", state: "open", body: "child", re: "live-root" };
const liveGrandchild = { id: "live-grandchild", channel: "general", who: "scout", at: "12:42", state: "open", body: "nested", re: "live-child" };
const liveGraph = map.messageGraph([liveRoot, liveChild, liveGrandchild]);
assert.equal(liveGraph.messageOf("live-grandchild").threadRoot.objectId, "live-root");

// The formal replies namespace remains traversable beyond its direct listing.
assert.deepEqual(
  map.list("/projects/community/channels/general/p1/replies/p2").map((item) => item.name),
  ["body.md", "metadata.json", "replies", "backlinks", "receipts"],
);

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
legacyWindow.NB_SAVED_VIEWS.setPrincipal("legacy-owner");
assert.equal(legacyWindow.NB_SAVED_VIEWS.get("view-stable").query, "state:needs-review sort:new");
const migratedOnce = legacyStorage.snapshot()["nb-saved-views-v2"];
load("saved-views.js", legacyWindow);
assert.equal(legacyStorage.snapshot()["nb-saved-views-v2"], migratedOnce);

// Schema-v2 queries migrate through Core, while malformed state remains exportable and write-blocked.
const v2Storage = storage({
  "nb-saved-views-v2": JSON.stringify({
    schemaVersion: 2,
    views: [{ projectionId: "view-v2", label: "V2", visibility: "private", ownerId: "owner",
      query: " state:open  sort:new ", queryLanguageVersion: 0, order: "new", version: 1 }],
  }),
});
const v2Window = { localStorage: v2Storage };
load("community-core-runtime.js", v2Window);
load("data.js", v2Window);
load("query.js", v2Window);
load("saved-views.js", v2Window);
v2Window.NB_SAVED_VIEWS.setPrincipal("owner");
assert.equal(v2Window.NB_SAVED_VIEWS.get("view-v2").query, "state:open sort:new");
assert.equal(v2Window.NB_SAVED_VIEWS.get("view-v2").queryLanguageVersion, query.VERSION);

const malformedRaw = "{broken-saved-views";
const malformedStorage = storage({ "nb-saved-views-v2": malformedRaw });
const malformedWindow = { localStorage: malformedStorage };
load("community-core-runtime.js", malformedWindow);
load("data.js", malformedWindow);
load("query.js", malformedWindow);
load("saved-views.js", malformedWindow);
malformedWindow.NB_SAVED_VIEWS.setPrincipal("owner");
assert.equal(malformedWindow.NB_SAVED_VIEWS.exportState(), malformedRaw);
assert.throws(() => malformedWindow.NB_SAVED_VIEWS.save({ label: "must not overwrite", query: "" }),
  /export.*reset/i);
assert.equal(malformedStorage.snapshot()["nb-saved-views-v2"], malformedRaw);
assert.equal(malformedWindow.NB_SAVED_VIEWS.resetState(), true);
assert.equal(malformedWindow.NB_SAVED_VIEWS.exportState(), null);

stdout.write("nightboard navigation/projection focused tests passed\n");
