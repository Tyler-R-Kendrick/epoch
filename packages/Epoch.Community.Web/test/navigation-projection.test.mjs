import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execPath, stdout } from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL, URLSearchParams } from "node:url";

// The suite lives in test/; the app it exercises is the sibling app/ directory.
const root = fileURLToPath(new URL("../app/", import.meta.url));

function load(name, window) {
  new Function("window", readFileSync(join(root, name), "utf8"))(window);
}

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  let reads = 0;
  return {
    getItem: (key) => { reads += 1; return values.get(key) ?? null; },
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
    readCount: () => reads,
  };
}

const localStorage = storage();
const window = {
  localStorage,
  location: { origin: "http://localhost" },
  URL,
  URLSearchParams,
};
load("community-core-runtime.js", window);
load("data.js", window);
load("query.js", window);
load("saved-views.js", window);
load("sitemap.js", window);
load("graphql-engine.js", window);
load("graph.js", window);
load("action-registry.js", window);
load("actions.js", window);
load("navigation.js", window);
load("complete.js", window);

const { CW_DATA: data, CW_MAP: map, CW_QUERY: query, CW_SAVED_VIEWS: views } = window;

views.setPrincipal("principal-alice");

// NAV-ID-001/002/003: fixture identity is explicit and alias/order independent.
const message = data.posts.find((post) => post.id === "p1");
assert.equal(map.objectRef(message).objectId, "p1");
assert.equal(map.postName(message, 0), "p1");
assert.equal(map.postName({ ...message, subject: "changed", body: "changed" }, 99), "p1");
assert.equal(new Set(Object.values(data.legacyPostAliases)).size,
  Object.values(data.legacyPostAliases).length,
  "legacy aliases remain unambiguous compatibility locators");
assert.equal(map.postAt("/projects/civic-community-kit/channels/issues/" +
  "001-sam-composer-loses-the-dra").id, "k-i1",
"the former colliding alias remains a path-scoped compatibility locator");

// NAV-ID-005: canonical, contextual, and exact links identify one object distinctly.
const canonicalLink = window.CW_CORE.objectUrl(map.objectRef(message));
const contextualLink = window.CW_CORE.objectUrl(map.objectRef(message), { projectionId: "channel-general" });
const exactLink = window.CW_CORE.objectUrl(map.objectRef(message), { revision: "cid-2" });
assert.notEqual(canonicalLink, contextualLink);
assert.notEqual(canonicalLink, exactLink);
assert.deepEqual(window.CW_CORE.parseObjectUrl(contextualLink), {
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

// NAV-QUERY-003: even a private saved view applies object authorization by default.
const privateDmView = views.save({ label: "Readable DMs", query: "", visibility: "private" });
assert.deepEqual(views.open(privateDmView.projectionId, data.dmMessages, {
  viewer: { actorId: "principal-alice", readableDmIds: ["scout"] },
}).posts.map((post) => post.dm).filter((dm, index, all) => all.indexOf(dm) === index), ["scout"]);
assert.deepEqual(views.open(privateDmView.projectionId, data.dmMessages).posts, [],
  "NAV-QUERY-003 private projection ownership does not imply access to every DM");

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
assert.equal(map.objectAtPath("/notifications/subscribed/n6").objectId, "notification-n6");
assert.equal(new Set(data.notifications.map((notification) => notification.ref.objectId)).size,
  data.notifications.length, "notifications have independent canonical identities");
assert.equal(data.notifications.find((notification) => notification.id === "n6").targetRef, "p2");
const notificationEntry = map.list("/notifications/subscribed").find((item) => item.name === "n6");
assert.equal(notificationEntry.ref.objectId, "notification-n6");
assert.equal(notificationEntry.targetRef.objectId, "p2");
data.notifications.push({ ...data.notifications.find((notification) => notification.id === "n6"),
  id: "n6-duplicate", ref: { objectId: "notification-n6-duplicate", kind: "notification" } });
assert.doesNotThrow(() => map.list("/notifications/subscribed"),
  "multiple notifications may point at one canonical message");
data.notifications.pop();

// NAV-PROJ-002: a saved view retains the canonical backing object.
savedOccurrence.post.state = "read";
assert.equal(map.feedEntriesAt("/projects/community/channels/general")
  .find((item) => item.objectId === "p1").post.state, "read");
savedOccurrence.post.state = "open";

// NAV-QUERY-003: public projections exclude private DM objects by default.
const publicView = views.save({ label: "Public all", query: "", visibility: "public" });
assert.equal(views.open(publicView.projectionId, data.dmMessages).posts.length, 0);
assert.equal(map.projectionLocations("dm-s3").some((location) => location.projectionId === "search-global"), false,
  "NAV-QUERY-003 a private DM has no public-search projection location");
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
window.CW_APP = { state: { merged: [{
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
assert.match(window.CW_GRAPH.SDL, /type ObjectRef/);
assert.match(window.CW_GRAPH.SDL, /inReplyTo: Message/);
assert.match(window.CW_GRAPH.SDL, /threadRoot: Message!/);
assert.match(window.CW_GRAPH.SDL, /type Projection/);
assert.match(window.CW_GRAPH.SDL, /capabilities: EntryCapabilities!/);
const createGraph = map.messageGraph;
let graphBuilds = 0;
map.messageGraph = (...args) => {
  graphBuilds += 1;
  return createGraph(...args);
};
const graphResult = await window.CW_GRAPH.query(`{
  object(objectId: "p2") {
    ref { objectId canonicalUrl }
    context { objectId kind canonicalUrl }
    inReplyTo { ref { objectId } }
    threadRoot { ref { objectId } }
    locations { projectionId aliasPath }
  }
}`);
map.messageGraph = createGraph;
assert.equal(graphResult.errors, undefined);
assert.equal(graphBuilds, 1, "one GraphQL query builds one canonical message graph");
assert.equal(graphResult.data.object.ref.objectId, "p2");
assert.equal(graphResult.data.object.context.objectId, "channel-general");
assert.equal(graphResult.data.object.context.kind, "channel");
assert.equal(graphResult.data.object.inReplyTo.ref.objectId, "p1");
assert.equal(graphResult.data.object.threadRoot.ref.objectId, "p1");
assert.ok(graphResult.data.object.locations.length >= 2);
const privateGraphSearch = await window.CW_GRAPH.query(`{
  search(text: "${privateNeedle}") { id body dm }
}`);
assert.deepEqual(privateGraphSearch.data.search, [],
  "NAV-ID-004 GraphQL search filters private DM corpus before resolver matching");
const livePrivateGraphSearch = await window.CW_GRAPH.query(`{
  search(text: "${livePrivateNeedle}") { id body dm }
  posts { id body dm }
}`);
assert.deepEqual(livePrivateGraphSearch.data.search, [],
  "NAV-ID-004 GraphQL search filters live private DMs before resolver matching");
assert.equal(livePrivateGraphSearch.data.posts.some((post) => post.id === "live-dm-private"), false,
  "NAV-ID-004 GraphQL posts cannot expose a live private DM through the public corpus");
const authorizedGraphSearch = await window.CW_GRAPH.query(`{
  search(text: "${privateNeedle}") { id body dm }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(authorizedGraphSearch.data.search.map((post) => post.id), ["dm-s3"]);
const sharedProjectionGraph = await window.CW_GRAPH.query(`{
  projection(projectionId: "${sharedSecretView.projectionId}") { projectionId query }
}`, undefined, { actorId: "principal-bob" });
assert.equal(sharedProjectionGraph.errors, undefined);
assert.equal(sharedProjectionGraph.data.projection.projectionId, sharedSecretView.projectionId);
assert.equal(sharedProjectionGraph.data.projection.query, null,
  "GraphQL applies the same non-owner query redaction as the Community API");
const originalList = map.list;
const privateProjectionPost = data.dmMessages.find((post) => post.id === "dm-s3");
map.list = (path, ...args) => path === `/views/${sharedSecretView.projectionId}`
  ? [{ name: privateProjectionPost.id, post: privateProjectionPost }]
  : originalList(path, ...args);
const deniedProjectionEntries = await window.CW_GRAPH.query(`{
  projection(projectionId: "${sharedSecretView.projectionId}") {
    entries { edges { node { ref { objectId } } } }
  }
}`, undefined, { actorId: "principal-bob", readableDmIds: [] });
assert.deepEqual(deniedProjectionEntries.data.projection.entries.edges, [],
  "NAV-QUERY-003 projection entries filter private objects at the GraphQL boundary");
const allowedProjectionEntries = await window.CW_GRAPH.query(`{
  projection(projectionId: "${sharedSecretView.projectionId}") {
    entries { edges { node { ref { objectId } } } }
  }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(allowedProjectionEntries.data.projection.entries.edges
  .map((edge) => edge.node.ref.objectId), ["dm-s3"]);
map.list = originalList;
const authorizedLiveGraphSearch = await window.CW_GRAPH.query(`{
  search(text: "${livePrivateNeedle}") { id }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(authorizedLiveGraphSearch.data.search.map((post) => post.id), ["live-dm-private"]);

// NAV-ID-004/NAV-QUERY-003: namespace listings enforce the same DM boundary.
const anonymousDmListing = await window.CW_GRAPH.query(`{
  listPath(path: "/dms") { name path }
}`);
assert.deepEqual(anonymousDmListing.data.listPath, [],
  "NAV-ID-004 unauthenticated GraphQL listPath cannot enumerate DM threads");
const foreignDmListing = await window.CW_GRAPH.query(`{
  listPath(path: "/dms/scout") { name path }
}`, undefined, { actorId: "principal-bob", readableDmIds: [] });
assert.deepEqual(foreignDmListing.data.listPath, [],
  "NAV-QUERY-003 a foreign principal cannot enumerate another owner's messages");
const ownerDmListing = await window.CW_GRAPH.query(`{
  listPath(path: "/dms") { name path }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(ownerDmListing.data.listPath.map((entry) => entry.name), ["scout"],
  "NAV-QUERY-003 an authorized participant sees only their readable DM thread");

// board_search uses the same pre-query authorization boundary as direct search.
const tools = {};
window.CW_MCP = {
  registerTool(tool) { tools[tool.name] = tool; },
  list() { return Object.values(tools); },
  text(text) { return { text, ok: true }; },
  fail(text) { return { text, ok: false }; },
};
window.CW_THEMES = [];
load("tools.js", window);
let boardSearchViewer = {};
window.CW_TOOLS.install({
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
const orphanResult = await window.CW_GRAPH.query(`{
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
const liveFeed = map.feedEntriesAt("/projects/community/channels/general", [liveRoot, liveChild, liveGrandchild]);
assert.equal(liveFeed.find((item) => item.objectId === "live-root").capabilities.expand, true,
  "NAV-GRAPH-001 live reply children are reflected in projection capabilities");

// The formal replies namespace remains traversable beyond its direct listing.
assert.deepEqual(
  map.list("/projects/community/channels/general/p1/replies/p2").map((item) => item.name),
  ["body.md", "metadata.json", "replies", "backlinks", "receipts"],
);
assert.deepEqual(
  map.list("/projects/community/channels/general/live-root/replies/live-child/replies/live-grandchild",
    [liveRoot, liveChild, liveGrandchild]).map((item) => item.name),
  ["body.md", "metadata.json", "replies", "backlinks", "receipts"],
  "NAV-GRAPH-001 nested live reply namespaces remain traversable",
);

// NAV-JUMP-003: current saved projections feed completion and destinations de-duplicate across groups.
const jumpSaved = views.save({ label: "Jump review", query: "state:open", visibility: "private" });
const savedJumpCandidates = window.CW_COMPLETE.jumpCandidates("jump review", { cwd: "/" });
assert.equal(savedJumpCandidates.some((candidate) => candidate.projectionId === jumpSaved.projectionId &&
  candidate.group === "SAVED VIEWS"), true);
const readsBeforeStatus = localStorage.readCount();
views.status();
views.status();
assert.equal(localStorage.readCount(), readsBeforeStatus,
  "saved-view status reuses the parsed state until a write or principal change");
const generalJumpCandidates = window.CW_COMPLETE.jumpCandidates("general", {
  cwd: "/projects/community/channels",
});
assert.equal(generalJumpCandidates.filter((candidate) =>
  candidate.path === "/projects/community/channels/general").length, 1,
"NAV-JUMP-003 one destination is not duplicated across CURRENT and GLOBAL groups");

// NAV-QUERY-004: previous query versions migrate once without reinterpretation.
const legacyStorage = storage({
  "cw-saved-views-v1": JSON.stringify({
    views: [{ id: "view-stable", label: "Old review", query: " state:needs-review  sort:new " }],
  }),
});
const legacyWindow = { localStorage: legacyStorage };
load("community-core-runtime.js", legacyWindow);
load("data.js", legacyWindow);
load("query.js", legacyWindow);
load("saved-views.js", legacyWindow);
legacyWindow.CW_SAVED_VIEWS.setPrincipal("legacy-owner");
assert.equal(legacyWindow.CW_SAVED_VIEWS.get("view-stable").query, "state:needs-review sort:new");
const migratedOnce = legacyStorage.snapshot()["cw-saved-views-v2"];
load("saved-views.js", legacyWindow);
assert.equal(legacyStorage.snapshot()["cw-saved-views-v2"], migratedOnce);

// Schema-v2 queries migrate through Core, while malformed state remains exportable and write-blocked.
const v2Storage = storage({
  "cw-saved-views-v2": JSON.stringify({
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
v2Window.CW_SAVED_VIEWS.setPrincipal("owner");
assert.equal(v2Window.CW_SAVED_VIEWS.get("view-v2").query, "state:open sort:new");
assert.equal(v2Window.CW_SAVED_VIEWS.get("view-v2").queryLanguageVersion, query.VERSION);

// Ownerless versioned views are not claimed by whichever principal initializes first.
const ownerlessRaw = JSON.stringify({
  schemaVersion: 2,
  views: [{ projectionId: "view-ownerless", label: "Ownerless", visibility: "private",
    query: "state:open", queryLanguageVersion: 0, order: "new", version: 1 }],
});
const ownerlessStorage = storage({ "cw-saved-views-v2": ownerlessRaw });
const ownerlessWindow = { localStorage: ownerlessStorage };
load("community-core-runtime.js", ownerlessWindow);
load("data.js", ownerlessWindow);
load("query.js", ownerlessWindow);
load("saved-views.js", ownerlessWindow);
ownerlessWindow.CW_SAVED_VIEWS.setPrincipal("first-principal");
assert.equal(ownerlessWindow.CW_SAVED_VIEWS.get("view-ownerless"), null);
assert.equal(ownerlessWindow.CW_SAVED_VIEWS.exportState(), ownerlessRaw);
assert.match(ownerlessWindow.CW_SAVED_VIEWS.status().message, /owner|export.*reset/i);
assert.throws(() => ownerlessWindow.CW_SAVED_VIEWS.save({ label: "must not claim", query: "" }),
  /owner|export.*reset/i);

// Malformed legacy and unreadable storage enter the same explicit recovery/write-block state.
const badLegacyRaw = JSON.stringify({ views: "not-an-array" });
const badLegacyStorage = storage({ "cw-saved-views-v1": badLegacyRaw });
const badLegacyWindow = { localStorage: badLegacyStorage };
load("community-core-runtime.js", badLegacyWindow);
load("data.js", badLegacyWindow);
load("query.js", badLegacyWindow);
load("saved-views.js", badLegacyWindow);
badLegacyWindow.CW_SAVED_VIEWS.setPrincipal("owner");
assert.equal(badLegacyWindow.CW_SAVED_VIEWS.exportState(), badLegacyRaw);
assert.deepEqual(badLegacyWindow.CW_SAVED_VIEWS.status().actions, ["export", "reset"]);
assert.throws(() => badLegacyWindow.CW_SAVED_VIEWS.save({ label: "blocked", query: "" }),
  /export.*reset/i);

const unreadableWindow = { localStorage: {
  getItem() { throw new Error("storage denied"); },
  setItem() { throw new Error("storage denied"); },
  removeItem() { throw new Error("storage denied"); },
} };
load("community-core-runtime.js", unreadableWindow);
load("data.js", unreadableWindow);
load("query.js", unreadableWindow);
load("saved-views.js", unreadableWindow);
unreadableWindow.CW_SAVED_VIEWS.setPrincipal("owner");
assert.match(unreadableWindow.CW_SAVED_VIEWS.status().message, /storage denied|export.*reset/i);
assert.throws(() => unreadableWindow.CW_SAVED_VIEWS.save({ label: "blocked", query: "" }),
  /storage denied|export.*reset/i);

const malformedRaw = "{broken-saved-views";
const malformedStorage = storage({ "cw-saved-views-v2": malformedRaw });
const malformedWindow = { localStorage: malformedStorage };
load("community-core-runtime.js", malformedWindow);
load("data.js", malformedWindow);
load("query.js", malformedWindow);
load("saved-views.js", malformedWindow);
malformedWindow.CW_SAVED_VIEWS.setPrincipal("owner");
assert.equal(malformedWindow.CW_SAVED_VIEWS.exportState(), malformedRaw);
assert.throws(() => malformedWindow.CW_SAVED_VIEWS.save({ label: "must not overwrite", query: "" }),
  /export.*reset/i);
assert.equal(malformedStorage.snapshot()["cw-saved-views-v2"], malformedRaw);
assert.equal(malformedWindow.CW_SAVED_VIEWS.resetState(), true);
assert.equal(malformedWindow.CW_SAVED_VIEWS.exportState(), null);

// Generated runtime checks resolve both source and output from the repository argument.
const outsideCwd = mkdtempSync(join(tmpdir(), "epoch-community-web-build-"));
try {
  const repository = join(root, "..", "..", "..");
  const buildCheck = spawnSync(execPath,
    [join(root, "..", "scripts", "build-core-runtime.mjs"), "--check", repository],
    { cwd: outsideCwd, encoding: "utf8" });
  assert.equal(buildCheck.status, 0, buildCheck.stderr || buildCheck.stdout);
} finally {
  rmSync(outsideCwd, { recursive: true, force: true });
}

stdout.write("Community Web app navigation/projection focused tests passed\n");
