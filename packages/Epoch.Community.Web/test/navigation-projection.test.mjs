import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execPath, stdout } from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL, URLSearchParams } from "node:url";
import "../app/value-kind.js";

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
load("sitemap.js", window);
load("workbench.js", window);
load("graphql-engine.js", window);
assert.equal(globalThis.CW_VALUE.isFunction(window.CommunityGraphQL.createCommunityGraphQLSchema), true,
  "generated browser runtime exposes the portable Community GraphQL package");
assert.match(window.CommunityGraphQL.COMMUNITY_GRAPHQL_SDL, /input SearchExpressionInput @oneOf/,
  "generated GraphQL runtime retains typed oneOf search expressions");
assert.doesNotMatch(readFileSync(join(root, "graph.js"), "utf8"), /GraphQLEngine|buildSchema\(/,
  "Community Web is a host adapter for the portable schema, not a second GraphQL implementation");
load("graph.js", window);
load("action-registry.js", window);
load("actions.js", window);
load("navigation.js", window);
load("complete.js", window);

const { CW_DATA: data, CW_MAP: map, CW_QUERY: query } = window;

assert.equal(window.CW_ACTIONS.list().some((action) => action.actionId.startsWith("view.")), false,
  "normalized action language exposes search/projection/namespace rather than view aliases");
assert.ok(["search.open", "search.run", "projection.edit", "namespace.reset"]
  .every((id) => window.CW_ACTIONS.get(id)), "normalized workbench actions share one registry");

const workbenchState = {};
window.CW_WORKBENCH.openSearch(workbenchState, "sttae:needs-review");
await window.CW_WORKBENCH.runSearch(workbenchState);
assert.equal(workbenchState.searchWorkbench.tab, "query");
assert.equal(workbenchState.searchWorkbench.parsed.diagnostics[0].span.line, 1);
assert.match(workbenchState.searchWorkbench.error, /sttae/);
workbenchState.searchWorkbench.expression = "state:needs-review";
await window.CW_WORKBENCH.runSearch(workbenchState);
assert.equal(workbenchState.searchWorkbench.tab, "results");
assert.equal(workbenchState.searchWorkbench.result.completeness.status, "complete");
assert.ok(workbenchState.searchWorkbench.result.hits.length > 0);
assert.deepEqual(window.CW_WORKBENCH.history().map((entry) => entry.canonical), ["state:needs-review"]);
const searchProjection = window.CW_WORKBENCH.saveSearchProjection(workbenchState, "Needs review");
assert.match(searchProjection.projectionId, /^projection-search-/);
assert.equal(searchProjection.root.children[0].where.field, "state");
assert.deepEqual(window.CW_WORKBENCH.definitions().map((definition) => definition.projectionId),
  [searchProjection.projectionId], "saved searches persist canonical ProjectionDefinition JSON");
window.CW_WORKBENCH.openProjection(workbenchState, window.CW_CORE.builtinDefaultProjection);
window.CW_WORKBENCH.compileProjection(workbenchState);
assert.equal(workbenchState.searchWorkbench.compiled.definition.projectionId, "builtin:default");
assert.deepEqual(map.list("/.epoch").map((entry) => entry.name),
  ["default", "canonical", "projections", "sources", "diagnostics"]);

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
  map.list("/.agents").find((item) => item.name === "space-steward"),
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

// NAV-QUERY-001/002/004: validated, normalized, versioned Projection Definitions.
const invalid = query.parse("sttae:needs-review");
assert.match(invalid.error, /unknown.*sttae/);
assert.match(invalid.error, /state/);
window.CW_WORKBENCH.openSearch(workbenchState, " (( state:open ))   sort:new ");
await window.CW_WORKBENCH.runSearch(workbenchState);
const saved = window.CW_WORKBENCH.saveSearchProjection(workbenchState, "Review queue");
assert.match(saved.projectionId, /^projection-search-/);
assert.equal(saved.root.children[0].where.field, "state");
assert.equal(window.CW_WORKBENCH.definitions().find((definition) =>
  definition.projectionId === saved.projectionId).label, "Review queue");
const sharedDefinition = { ...saved, projectionId: "projection-shared-review", label: "Shared review",
  visibility: "shared", ownerId: "principal-alice" };
window.CW_WORKBENCH.openProjection(workbenchState, sharedDefinition);
window.CW_WORKBENCH.saveProjection(workbenchState);

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
assert.equal(map.projectionLocations("dm-s3").some((location) => location.projectionId === "search-global"), false,
  "NAV-QUERY-003 a private DM has no public-search projection location");

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

// The browser host exposes the portable typed GraphQL contract, not a second schema.
assert.equal(window.CW_GRAPH.SDL, window.CommunityGraphQL.COMMUNITY_GRAPHQL_SDL);
assert.match(window.CW_GRAPH.SDL, /input SearchExpressionInput @oneOf/);
assert.match(window.CW_GRAPH.SDL, /search\(where: SearchExpressionInput!/);
assert.doesNotMatch(window.CW_GRAPH.SDL, /type Post\b/);
assert.doesNotMatch(window.CW_GRAPH.SDL, /search\(text:/);
const graphResult = await window.CW_GRAPH.query(`{
  node(id: "p2") { id ref { objectId kind } fields visibility }
}`);
assert.equal(graphResult.errors, undefined);
assert.equal(graphResult.data.node.ref.objectId, "p2");
assert.equal(graphResult.data.node.ref.kind, "message");
assert.equal(graphResult.data.node.fields.parentId, "p1");
assert.equal(graphResult.data.node.visibility, "public");

function textSearch() {
  return `query($value: String!) {
    search(where: { text: { fields: ["body"], value: $value, mode: PHRASE } }, first: 20) {
      nodes { target { objectId kind } matchedFields }
      completeness { status omittedSources }
    }
  }`;
}
const privateGraphSearch = await window.CW_GRAPH.query(textSearch(privateNeedle), { value: privateNeedle });
assert.deepEqual(privateGraphSearch.data.search.nodes, [],
  "NAV-ID-004 GraphQL search authorizes before deterministic matching");
const livePrivateGraphSearch = await window.CW_GRAPH.query(textSearch(livePrivateNeedle), { value: livePrivateNeedle });
assert.deepEqual(livePrivateGraphSearch.data.search.nodes, [],
  "NAV-ID-004 live private DMs do not enter an anonymous search snapshot");
const authorizedGraphSearch = await window.CW_GRAPH.query(textSearch(privateNeedle), { value: privateNeedle },
  { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(authorizedGraphSearch.data.search.nodes.map((hit) => hit.target.objectId), ["dm-s3"]);
assert.equal(authorizedGraphSearch.data.search.completeness.status, "complete");
const unavailableScope = await window.CW_GRAPH.query(`{
  search(where: { all: { enabled: true } }, scope: { sourceIds: ["unknown"] }, first: 1) {
    nodes { target { objectId } }
  }
}`);
assert.equal(unavailableScope.errors[0].extensions.code, "QUERY_UNSUPPORTED_SOURCE",
  "structured source scopes fail closed when the host did not register that source");
const hiddenSharedProjection = await window.CW_GRAPH.query(`{
  projection(id: "${sharedDefinition.projectionId}") { id definition }
}`, undefined, { actorId: "principal-bob" });
assert.equal(hiddenSharedProjection.errors, undefined);
assert.equal(hiddenSharedProjection.data.projection, null,
  "a shared definition's private query is not observable without owner authorization");
const ownedSharedProjection = await window.CW_GRAPH.query(`{
  projection(id: "${sharedDefinition.projectionId}") { id label definition }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.equal(ownedSharedProjection.data.projection.id, sharedDefinition.projectionId);
assert.equal(ownedSharedProjection.data.projection.definition.root.children[0].where.field, "state");
const authorizedLiveGraphSearch = await window.CW_GRAPH.query(textSearch(livePrivateNeedle),
  { value: livePrivateNeedle }, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(authorizedLiveGraphSearch.data.search.nodes.map((hit) => hit.target.objectId), ["live-dm-private"]);

// NAV-ID-004/NAV-QUERY-003: namespace listings enforce the same DM boundary.
const anonymousDmListing = await window.CW_GRAPH.query(`{
  listPath(path: "/dms", first: 20) { nodes { name logicalPath } }
}`);
assert.deepEqual(anonymousDmListing.data.listPath.nodes, [],
  "NAV-ID-004 unauthenticated GraphQL listPath cannot enumerate DM threads");
const foreignDmListing = await window.CW_GRAPH.query(`{
  listPath(path: "/dms/scout", first: 20) { nodes { name logicalPath } }
}`, undefined, { actorId: "principal-bob", readableDmIds: [] });
assert.deepEqual(foreignDmListing.data.listPath.nodes, [],
  "NAV-QUERY-003 a foreign principal cannot enumerate another owner's messages");
const ownerDmListing = await window.CW_GRAPH.query(`{
  listPath(path: "/dms", first: 20) { nodes { name logicalPath target { objectId } } }
}`, undefined, { actorId: "principal-alice", readableDmIds: ["scout"] });
assert.deepEqual(ownerDmListing.data.listPath.nodes.map((entry) => entry.name), ["scout"],
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
const orphanResult = await window.CW_GRAPH.query(`{ node(id: "orphan-child") { fields } }`);
assert.equal(orphanResult.data.node.fields.parentId, "missing-parent");

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

// NAV-JUMP-003: Projection Definitions feed completion and destinations de-duplicate across groups.
const jumpSaved = saved;
const savedJumpCandidates = window.CW_COMPLETE.jumpCandidates("review queue", { cwd: "/" });
assert.equal(savedJumpCandidates.some((candidate) => candidate.projectionId === jumpSaved.projectionId &&
  candidate.group === "PROJECTIONS"), true);
const generalJumpCandidates = window.CW_COMPLETE.jumpCandidates("general", {
  cwd: "/projects/community/channels",
});
assert.equal(generalJumpCandidates.filter((candidate) =>
  candidate.path === "/projects/community/channels/general").length, 1,
"NAV-JUMP-003 one destination is not duplicated across CURRENT and GLOBAL groups");

// Projection definitions load from the current key only; older saved-view keys are ignored.
const schemaInputStorage = storage({
  "cw-saved-views-v1": JSON.stringify({
    views: [{ id: "view-stable", label: "Old review", query: " state:needs-review  sort:new " }],
  }),
});
const schemaInputWindow = { localStorage: schemaInputStorage };
load("community-core-runtime.js", schemaInputWindow);
load("data.js", schemaInputWindow);
load("query.js", schemaInputWindow);
load("workbench.js", schemaInputWindow);
assert.deepEqual(schemaInputWindow.CW_WORKBENCH.definitions(), []);

const currentStorage = storage({
  "cw-projection-definitions-v1": JSON.stringify([{
    projectionId: "view-current",
    label: "Current",
    version: 1,
    root: { nodeId: "root", kind: "literal", segment: "work", children: [] },
  }]),
});
const currentWindow = { localStorage: currentStorage };
load("community-core-runtime.js", currentWindow);
load("data.js", currentWindow);
load("query.js", currentWindow);
load("workbench.js", currentWindow);
assert.equal(currentWindow.CW_WORKBENCH.definitions()[0].projectionId, "view-current");

// Malformed current definition state remains exportable and write-blocked.
const badDefinitionsRaw = JSON.stringify({ views: "not-an-array" });
const badDefinitionsStorage = storage({ "cw-projection-definitions-v1": badDefinitionsRaw });
const badDefinitionsWindow = { localStorage: badDefinitionsStorage };
load("community-core-runtime.js", badDefinitionsWindow);
load("data.js", badDefinitionsWindow);
load("query.js", badDefinitionsWindow);
load("workbench.js", badDefinitionsWindow);
assert.equal(badDefinitionsWindow.CW_WORKBENCH.exportDefinitions(), badDefinitionsRaw);
assert.match(badDefinitionsWindow.CW_WORKBENCH.definitionStatus().message, /recovery required/i);

const unreadableWindow = { localStorage: {
  getItem() { throw new Error("storage denied"); },
  setItem() { throw new Error("storage denied"); },
  removeItem() { throw new Error("storage denied"); },
} };
load("community-core-runtime.js", unreadableWindow);
load("data.js", unreadableWindow);
load("query.js", unreadableWindow);
load("workbench.js", unreadableWindow);
assert.match(unreadableWindow.CW_WORKBENCH.definitionStatus().message, /storage denied/i);

const malformedRaw = "{broken-projection-definitions";
const malformedStorage = storage({ "cw-projection-definitions-v1": malformedRaw });
const malformedWindow = { localStorage: malformedStorage };
load("community-core-runtime.js", malformedWindow);
load("data.js", malformedWindow);
load("query.js", malformedWindow);
load("workbench.js", malformedWindow);
assert.equal(malformedWindow.CW_WORKBENCH.exportDefinitions(), malformedRaw);
assert.equal(malformedStorage.snapshot()["cw-projection-definitions-v1"], malformedRaw);
assert.equal(malformedWindow.CW_WORKBENCH.resetDefinitions(), true);
assert.equal(malformedWindow.CW_WORKBENCH.exportDefinitions(), "[]");

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
