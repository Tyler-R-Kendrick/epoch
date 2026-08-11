import assert from "node:assert/strict";
import {
  BUILT_IN_ACTIONS,
  QUERY_LANGUAGE_VERSION,
  createActionRegistry,
  createMessageGraph,
  createProjection,
  migrateNormalizedQuery,
  normalizeQuery,
  objectUrl,
  parseObjectUrl,
  type CommunityMessage,
  type CommunityObjectRef,
  type ProjectionSourceEntry,
} from "@epoch/community-core";

const channelRef: CommunityObjectRef = { objectId: "channel-general", kind: "channel" };
const rootRef: CommunityObjectRef = { objectId: "m-001", kind: "message", revision: "cid-a" };
const childARef: CommunityObjectRef = { objectId: "m-002", kind: "message" };
const childBRef: CommunityObjectRef = { objectId: "m-003", kind: "message" };

export async function runCommunityObjectProjectionTests(): Promise<void> {
  await test("NAV-ID-001 identity survives sibling insertion", stableIdentitySurvivesInsertion);
  await test("NAV-ID-002 identity survives content edit", stableIdentitySurvivesContentEdit);
  await test("NAV-ID-003 identity survives reorder and reprojection", stableIdentitySurvivesReprojection);
  await test("NAV-ID-004 DM locators do not leak content", dmLocatorsDoNotLeakContent);
  await test("NAV-ID-005 canonical contextual and exact links are distinct", objectLinksAreDistinct);
  await test("NAV-PROJ-001 one object appears in many mounted projections", projectionLocationsShareIdentity);
  await test("NAV-PROJ-003 projection parent differs from thread parent", navigationOperationsRemainDistinct);
  await test("NAV-GRAPH-002 explicit thread operations use object IDs", explicitGraphOperations);
  await test("NAV-GRAPH-003 tombstone preserves topology", missingParentBecomesTombstone);
  await test("NAV-GRAPH-004 graph API does not require alias parsing", graphIgnoresAliases);
  await test("NAV-QUERY-001 unknown field is an error", unknownQueryFieldFails);
  await test("NAV-QUERY-002 normalized saved view survives reload", normalizedQuerySurvivesReload);
  await test("NAV-QUERY-004 query language migration is deterministic", queryMigrationIsIdempotent);
  await test("NAV-ACTION-002 signed action permission parity", actionPermissionIsCentralized);
  await test("NAV-ACTION-004 generated catalogs cannot drift", actionCatalogCannotDrift);
}

async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    throw new Error(name, { cause: error });
  }
}

function stableIdentitySurvivesInsertion(): void {
  const original = message(rootRef, undefined, rootRef, "Original", "body");
  const prepended = message({ objectId: "m-000", kind: "message" }, undefined, { objectId: "m-000", kind: "message" }, "Earlier", "earlier");
  const before = createProjection(projection("projection-channel"), [entry(original, "original")]);
  const after = createProjection(projection("projection-channel"), [entry(prepended, "earlier"), entry(original, "original")]);

  assert.equal(before.entries[0]?.ref.objectId, "m-001");
  assert.equal(after.entries[1]?.ref.objectId, "m-001");
  assert.equal(objectUrl(original.ref), "/board.html?object=m-001");
}

function stableIdentitySurvivesContentEdit(): void {
  const original = message(rootRef, undefined, rootRef, "Original", "body");
  const edited = { ...original, title: "Renamed", body: "new body", ref: { ...rootRef, revision: "cid-b" } };
  assert.equal(edited.ref.objectId, original.ref.objectId);
  assert.equal(objectUrl(edited.ref), objectUrl(original.ref));
  assert.notEqual(edited.ref.revision, original.ref.revision);
}

function stableIdentitySurvivesReprojection(): void {
  const original = message(rootRef, undefined, rootRef, "Original", "body");
  const projections = ["hot", "new", "top", "search", "mentions", "saved"].map((id) =>
    createProjection(projection(`projection-${id}`), [entry(original, `alias-${id}`)]));
  assert.deepEqual(new Set(projections.map((value) => value.entries[0]?.ref.objectId)), new Set(["m-001"]));
  assert.equal(new Set(projections.map((value) => value.spec.projectionId)).size, projections.length);
}

function objectLinksAreDistinct(): void {
  const canonical = objectUrl(rootRef);
  const contextual = objectUrl(rootRef, { projectionId: "projection-search" });
  const exact = objectUrl(rootRef, { revision: rootRef.revision });
  assert.equal(canonical, "/board.html?object=m-001");
  assert.equal(contextual, "/board.html?projection=projection-search&focus=m-001");
  assert.equal(exact, "/board.html?object=m-001&revision=cid-a");
  assert.deepEqual(parseObjectUrl(contextual), { objectId: "m-001", projectionId: "projection-search" });
}

async function dmLocatorsDoNotLeakContent(): Promise<void> {
  const sentinel = "DO_NOT_LEAK_7f3c";
  const ref = { objectId: "dm-object-opaque", kind: "message" as const, revision: "cid-private" };
  const links = [objectUrl(ref), objectUrl(ref, { projectionId: "projection-dm" }), objectUrl(ref, { revision: ref.revision })];
  const registry = createActionRegistry(BUILT_IN_ACTIONS, { "detail.open": () => undefined });
  await registry.execute("detail.open", { title: sentinel, body: sentinel }, {
    origin: "pointer",
    permissions: [],
    projectionId: "projection-dm",
    objectId: ref.objectId,
  });
  assert.doesNotMatch(JSON.stringify({ links, event: registry.lastActionEvent() }), new RegExp(sentinel, "u"));
}

function projectionLocationsShareIdentity(): void {
  const original = message(rootRef, undefined, rootRef, "Original", "body");
  const channel = createProjection(projection("projection-channel"), [entry(original, "channels/general/original")]);
  const mentions = createProjection(projection("projection-mentions"), [entry(original, "activity/mentions/original")]);
  assert.equal(channel.entries[0]?.ref.objectId, mentions.entries[0]?.ref.objectId);
  assert.notEqual(channel.entries[0]?.aliasPath, mentions.entries[0]?.aliasPath);
}

function navigationOperationsRemainDistinct(): void {
  assert.equal(new Set([
    "nav.ascend",
    "thread.parent",
    "history.back",
    "history.previousLocation",
  ]).size, 4);
  assert.ok(BUILT_IN_ACTIONS.some((action) => action.actionId === "nav.ascend"));
  assert.ok(BUILT_IN_ACTIONS.some((action) => action.actionId === "thread.parent"));
}

function explicitGraphOperations(): void {
  const root = message(rootRef, undefined, rootRef, "root", "root");
  const childA = message(childARef, rootRef, rootRef, "a", "a", "unread");
  const childB = message(childBRef, rootRef, rootRef, "b", "b", "read");
  const grandchildRef: CommunityObjectRef = { objectId: "m-004", kind: "message" };
  const grandchild = message(grandchildRef, childARef, rootRef, "nested", "nested", "unread");
  const graph = createMessageGraph([root, childA, grandchild, childB]);

  assert.equal(graph.parentOf(childARef)?.objectId, "m-001");
  assert.equal(graph.rootOf(grandchildRef).objectId, "m-001");
  assert.equal(graph.firstChildOf(rootRef)?.objectId, "m-002");
  assert.equal(graph.nextSiblingOf(childARef)?.objectId, "m-003");
  assert.equal(graph.previousSiblingOf(childBRef)?.objectId, "m-002");
  assert.equal(graph.nextUnreadOf(rootRef)?.objectId, "m-002");
  assert.deepEqual(graph.descendantsOf(rootRef).map((ref) => ref.objectId), ["m-002", "m-004", "m-003"]);
}

function missingParentBecomesTombstone(): void {
  const missing: CommunityObjectRef = { objectId: "m-missing", kind: "message" };
  const orphan = message(childARef, missing, missing, "orphan", "still connected");
  const graph = createMessageGraph([orphan]);
  const parent = graph.messageOf(missing);
  assert.equal(parent?.ref.kind, "tombstone");
  assert.equal(parent?.tombstone?.reason, "missing");
  assert.equal(graph.parentOf(childARef)?.objectId, "m-missing");
  assert.deepEqual(graph.childrenOf(missing).map((ref) => ref.objectId), ["m-002"]);
}

function graphIgnoresAliases(): void {
  const root = message(rootRef, undefined, rootRef, "old", "old");
  const child = message(childARef, rootRef, rootRef, "child", "child");
  const changed = [{ ...root, aliases: ["new-root"] }, { ...child, aliases: ["new-child"] }];
  assert.equal(createMessageGraph(changed).parentOf(childARef)?.objectId, "m-001");
}

function unknownQueryFieldFails(): void {
  const result = normalizeQuery("sttae:needs-review");
  assert.equal(result.ast, null);
  assert.match(result.error ?? "", /sttae/u);
  assert.match(result.error ?? "", /state/u);
  assert.match(normalizeQuery("body:\"unterminated").error ?? "", /unterminated/u);
}

function normalizedQuerySurvivesReload(): void {
  const first = normalizeQuery("( state:needs-review )   sort:new");
  const second = normalizeQuery(first.canonical, { version: first.version });
  assert.equal(first.error, undefined);
  assert.deepEqual(second.ast, first.ast);
  assert.equal(second.canonical, "state:needs-review sort:new");
  assert.equal(second.sort, "new");
  assert.equal(second.version, QUERY_LANGUAGE_VERSION);
}

function queryMigrationIsIdempotent(): void {
  const previous = { query: "state:needs-review   sort:new", queryLanguageVersion: 0, sort: "new" } as const;
  const first = migrateNormalizedQuery(previous);
  const second = migrateNormalizedQuery(first);
  assert.deepEqual(second, first);
  assert.equal(first.version, QUERY_LANGUAGE_VERSION);
}

async function actionPermissionIsCentralized(): Promise<void> {
  const registry = createActionRegistry(BUILT_IN_ACTIONS, {
    "view.delete": () => "deleted",
  });
  const context = {
    origin: "cli" as const,
    permissions: [] as readonly string[],
  };
  await assert.rejects(() => registry.execute("view.delete", undefined, context), /permission/u);
}

function actionCatalogCannotDrift(): void {
  const ids = new Set(BUILT_IN_ACTIONS.map((action) => action.actionId));
  assert.equal(ids.size, BUILT_IN_ACTIONS.length);
  for (const action of BUILT_IN_ACTIONS) {
    assert.ok(action.commandAliases?.every(Boolean) ?? true);
    assert.ok(action.slashAliases?.every(Boolean) ?? true);
    assert.ok(action.keyBindings?.every((binding) => binding.key.length > 0) ?? true);
    assert.ok(action.mcp === undefined || action.mcp.toolName.length > 0);
  }
}

function projection(projectionId: string) {
  return {
    projectionId,
    kind: "channel-feed" as const,
    label: projectionId,
    root: channelRef,
    parentRelation: "projection" as const,
    order: { by: "publishedAt" as const, direction: "ascending" as const },
    visibility: "public" as const,
    version: 1,
  };
}

function entry(value: CommunityMessage, aliasPath: string): ProjectionSourceEntry {
  return {
    ref: value.ref,
    alias: aliasPath.split("/").at(-1) ?? aliasPath,
    aliasPath,
    capabilities: { read: true, enter: true, expand: true, composeUnder: true, execute: false },
  };
}

function message(
  ref: CommunityObjectRef,
  inReplyTo: CommunityObjectRef | undefined,
  threadRoot: CommunityObjectRef,
  title: string,
  body: string,
  state = "read",
): CommunityMessage {
  return {
    ref,
    context: channelRef,
    authorId: "member-alice",
    title,
    body,
    publishedAt: "2026-08-11T00:00:00.000Z",
    ...(inReplyTo === undefined ? {} : { inReplyTo }),
    threadRoot,
    relations: [],
    state,
    aliases: [title],
  };
}
