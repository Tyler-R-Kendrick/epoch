import assert from "node:assert/strict";
import {
  BUILT_IN_ACTIONS,
  QUERY_LANGUAGE_VERSION,
  canReadCommunityResource,
  createActionRegistry,
  createCommunityFieldRegistry,
  createMessageGraph,
  createProjectionOccurrenceId,
  matchesNormalizedQuery,
  migrateNormalizedQuery,
  normalizeQuery,
  parseCommunityQuery,
  objectUrl,
  parseObjectUrl,
  validateObjectRef,
  validateProjectionId,
  type CommunityMessage,
  type CommunityObjectRef,
} from "@epoch/community-core";
import type { TestJsonObject, TestJsonValue } from "../helpers/json-types";

const channelRef: CommunityObjectRef = { objectId: "channel-general", kind: "channel" };
const rootRef: CommunityObjectRef = { objectId: "m-001", kind: "message", revision: "cid-a" };
const childARef: CommunityObjectRef = { objectId: "m-002", kind: "message" };
const childBRef: CommunityObjectRef = { objectId: "m-003", kind: "message" };

export async function runCommunityObjectProjectionTests(): Promise<void> {
  await test("NAV-ID-001 occurrence identity survives sibling insertion", stableIdentitySurvivesInsertion);
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
  await test("quoted query phrases round-trip escaped content", escapedQueryPhrasesRoundTrip);
  await test("NAV-QUERY-004 query language migration is deterministic", queryMigrationIsIdempotent);
  await test("typed query operators normalize without losing semantics", typedQueryOperatorsNormalize);
  await test("query diagnostics identify exact source spans", queryDiagnosticsHaveSourceSpans);
  await test("contextual query values resolve once from injected context", contextualValuesAreDeterministic);
  await test("query limits and unsupported syntax fail closed", queryLimitsFailClosed);
  await test("query canonicalization is stable across representative fuzz input", queryCanonicalizationFuzz);
  await test("query parsing uses the authorized canonical field registry", queryUsesCanonicalFieldRegistry);
  await test("NAV-QUERY-002 reaction queries use canonical reaction state", reactionQueriesUseCanonicalState);
  await test("NAV-ACTION-002 signed action permission parity", actionPermissionIsCentralized);
  await test("NAV-ACTION-004 generated catalogs cannot drift", actionCatalogCannotDrift);
  await test("query and namespace actions share one collision-free registry", searchProjectionActionsAreCentralized);
  await test("canonical references and projections reject malformed identity and topology", validationFailsClosed);
  await test("canonical projection objects use normalized nomenclature", projectionKindIsCanonical);
  await test("resource visibility is explicit and fails closed", resourceVisibilityFailsClosed);
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
  const occurrence = () => createProjectionOccurrenceId({
    projectionId: "projection-channel", projectionVersion: 1, nodeId: "messages-leaf",
    branchId: "messages", parentEntryId: "channel-general", target: original.ref,
    resolvedSegment: "original",
  });
  assert.equal(occurrence(), occurrence());
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
  const projections = ["hot", "new", "top", "search", "mentions", "saved"].map((id) => ({
    target: original.ref,
    occurrenceId: createProjectionOccurrenceId({ projectionId: `projection-${id}`, projectionVersion: 1,
      nodeId: "leaf", branchId: id, parentEntryId: "root", target: original.ref, resolvedSegment: `alias-${id}` }),
  }));
  assert.deepEqual(new Set(projections.map((value) => value.target.objectId)), new Set(["m-001"]));
  assert.equal(new Set(projections.map((value) => value.occurrenceId)).size, projections.length);
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
  const channel = { target: original.ref, logicalPath: "/channels/general/original" };
  const mentions = { target: original.ref, logicalPath: "/activity/mentions/original" };
  assert.equal(channel.target.objectId, mentions.target.objectId);
  assert.notEqual(channel.logicalPath, mentions.logicalPath);
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
  const first = normalizeQuery("( state:needs-review )   sort:new", { now: "2026-08-12T10:00:00Z" });
  const second = normalizeQuery(first.canonical, { version: first.version });
  assert.equal(first.error, undefined);
  assert.deepEqual(
    stripSpans(
      // SAFETY: Search AST fixtures JSON-round-trip before span stripping comparison.
      JSON.parse(JSON.stringify(second.ast)) as TestJsonValue,
    ),
    stripSpans(
      // SAFETY: Search AST fixtures JSON-round-trip before span stripping comparison.
      JSON.parse(JSON.stringify(first.ast)) as TestJsonValue,
    ),
  );
  assert.equal(second.canonical, "state:needs-review sort:new");
  assert.deepEqual(second.sort, [{ field: "updatedAt", direction: "descending", nulls: "last" }]);
  assert.match(first.queryHash, /^[a-f0-9]{16}$/u);
  assert.equal(second.version, QUERY_LANGUAGE_VERSION);
}

function escapedQueryPhrasesRoundTrip(): void {
  const first = normalizeQuery(String.raw`body:"say \"hello\" from C:\\temp"`);
  assert.equal(first.error, undefined);
  assert.deepEqual(first.ast, {
    kind: "text",
    fields: ["body"],
    value: "say \"hello\" from C:\\temp",
    mode: "phrase",
    span: { start: 0, end: 34, line: 1, column: 1 },
  });
  const second = normalizeQuery(first.canonical);
  assert.equal(second.error, undefined);
  assert.equal(second.canonicalJson, first.canonicalJson);
  assert.equal(second.queryHash, first.queryHash);
}

function queryMigrationIsIdempotent(): void {
  const previous = { query: "state:needs-review   sort:new", queryLanguageVersion: 0, sort: "new" } as const;
  const first = migrateNormalizedQuery(previous);
  const second = migrateNormalizedQuery(first);
  assert.deepEqual(second, first);
  assert.equal(first.version, QUERY_LANGUAGE_VERSION);
}

function reactionQueriesUseCanonicalState(): void {
  const reacted = {
    ...message(rootRef, undefined, rootRef, "Reacted", "body"),
    reactions: { "+1": 2, eyes: 0 },
  };
  assert.equal(matchesNormalizedQuery(reacted, normalizeQuery("has:reactions")), true);
  assert.equal(matchesNormalizedQuery(reacted, normalizeQuery("react:+1")), true);
  assert.equal(matchesNormalizedQuery(reacted, normalizeQuery("react:eyes")), false);
  assert.equal(matchesNormalizedQuery(
    message(childARef, rootRef, rootRef, "Reply without reactions", "body"),
    normalizeQuery("has:reactions"),
  ), false, "reply topology is not reaction state");
}

function typedQueryOperatorsNormalize(): void {
  const query = normalizeQuery(
    "score:[10 TO 100] updatedAt:>=2026-08-01T00:00:00Z title:proj* body:* related.reply:m-001 NOT visibility:private",
    { now: "2026-08-12T12:00:00Z" },
  );
  assert.equal(query.error, undefined, query.error);
  assert.match(query.canonical, /score:\[10 TO 100\]/u);
  assert.match(query.canonical, /updatedAt:>="2026-08-01T00:00:00.000Z"/u);
  assert.match(query.canonical, /title:proj\*/u);
  assert.match(query.canonical, /related\.reply:message\/m-001/u);
  assert.ok(query.ast && JSON.stringify(query.ast).includes('"kind":"range"'));
  assert.ok(query.ast && JSON.stringify(query.ast).includes('"kind":"related"'));
  assert.equal(normalizeQuery(query.canonical).canonicalJson, query.canonicalJson);
}

function queryDiagnosticsHaveSourceSpans(): void {
  const query = normalizeQuery("state:open\nsttae:closed");
  assert.equal(query.error, query.diagnostics[0]?.message);
  assert.deepEqual(query.diagnostics[0]?.span, { start: 11, end: 16, line: 2, column: 1 });
  assert.equal(query.diagnostics[0]?.code, "QUERY_UNKNOWN_FIELD");
  assert.equal(query.diagnostics[0]?.suggestions[0], "state");
  assert.equal(query.ast, null);
}

function contextualValuesAreDeterministic(): void {
  const first = normalizeQuery("author:me updatedAt:today", {
    actorId: "member-alice",
    now: "2026-08-12T15:30:00Z",
    timezone: "UTC",
  });
  const second = normalizeQuery("author:me updatedAt:today", {
    actorId: "member-alice",
    now: "2026-08-12T23:59:59Z",
    timezone: "UTC",
  });
  assert.equal(first.error, undefined, first.error);
  assert.equal(first.canonical, 'author:member-alice AND updatedAt:["2026-08-12T00:00:00.000Z" TO "2026-08-13T00:00:00.000Z"}');
  assert.equal(first.canonical, second.canonical);
  assert.equal(first.resolvedAt, "2026-08-12T15:30:00.000Z");
  assert.equal(normalizeQuery("author:me").diagnostics[0]?.code, "QUERY_CONTEXT_REQUIRED");
}

function queryLimitsFailClosed(): void {
  assert.equal(normalizeQuery("a".repeat(16_385)).diagnostics[0]?.code, "QUERY_TOO_LARGE");
  assert.equal(normalizeQuery("title:/proj.*/").diagnostics[0]?.code, "QUERY_UNSUPPORTED_SYNTAX");
  assert.equal(normalizeQuery("title:p*").diagnostics[0]?.code, "QUERY_PREFIX_TOO_SHORT");
  assert.equal(normalizeQuery("score:proj*").diagnostics[0]?.code, "QUERY_INVALID_OPERATOR");
  assert.equal(normalizeQuery("state:open^2").diagnostics[0]?.code, "QUERY_UNSUPPORTED_SYNTAX");
}

function queryCanonicalizationFuzz(): void {
  let seed = 0x5eed1234;
  const next = (): number => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed;
  };
  const atoms = ["state:open", "author:maya", "has:reactions", '"projection engine"', "score:>=10"];
  for (let index = 0; index < 128; index += 1) {
    const left = atoms[next() % atoms.length] ?? "state:open";
    const right = atoms[next() % atoms.length] ?? "state:open";
    const source = `${next() % 2 === 0 ? "(" : ""}${left} ${next() % 3 === 0 ? "OR" : "AND"} ${right}${next() % 2 === 0 ? ")" : ""}`;
    const first = parseCommunityQuery(source);
    if (first.error !== undefined) continue;
    const second = parseCommunityQuery(first.canonical);
    assert.equal(second.error, undefined, `${source}: ${second.error}`);
    assert.equal(second.canonicalJson, first.canonicalJson, source);
  }
}

function queryUsesCanonicalFieldRegistry(): void {
  const registry = createCommunityFieldRegistry([], 7);
  const hidden = normalizeQuery("dm:private-thread", { fieldRegistry: registry });
  assert.equal(hidden.diagnostics[0]?.code, "QUERY_UNKNOWN_FIELD");
  assert.equal(hidden.diagnostics[0]?.suggestions.includes("dmId"), false);

  const visible = normalizeQuery("dm:private-thread", {
    fieldRegistry: registry,
    authorization: { actorId: "maya", permissions: ["field:sensitive:read"] },
  });
  assert.equal(visible.error, undefined, visible.error);
  assert.equal(visible.canonical, "dmId:private-thread");
  assert.equal(visible.fieldRegistryVersion, 7);
  assert.equal(normalizeQuery("channel:general").canonical, "channelId:general");
  assert.equal(normalizeQuery("react:+1").canonical, "reactions:+1");
}

function stripSpans(value: TestJsonValue): TestJsonValue {
  if (Array.isArray(value)) return value.map(stripSpans);
  if (isTestJsonObject(value)) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "span").map(([key, item]) => [key, stripSpans(item)]));
  }
  return value;
}

function isTestJsonObject(value: TestJsonValue): value is TestJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function actionPermissionIsCentralized(): Promise<void> {
  const registry = createActionRegistry(BUILT_IN_ACTIONS, {
    "projection.delete": () => "deleted",
  });
  const context = {
    origin: "cli" as const,
    // SAFETY: Runtime checks or construction above establish readonly string[].
    permissions: [] as readonly string[],
  };
  await assert.rejects(() => registry.execute("projection.delete", undefined, context), /permission/u);
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

function searchProjectionActionsAreCentralized(): void {
  const required = [
    "search.open", "search.run", "search.cancel", "search.explain", "search.saveAsProjection",
    "search.history", "search.favorite", "search.localFilter", "projection.list", "projection.open",
    "projection.create", "projection.clone", "projection.edit", "projection.preview", "projection.diff",
    "projection.validate", "projection.save", "projection.delete", "projection.explain", "namespace.mount",
    "namespace.unmount", "namespace.list", "namespace.reset", "namespace.use", "namespace.explain",
    "snapshot.freeze", "snapshot.refresh", "snapshot.applyQueued",
  ];
  assert.deepEqual(required.filter((actionId) => !BUILT_IN_ACTIONS.some((action) => action.actionId === actionId)), []);
  const keyBindings = BUILT_IN_ACTIONS.flatMap((action) => (action.keyBindings ?? []).map((binding) => `${binding.key}\0${[...(binding.contexts ?? action.contexts)].sort().join(",")}`));
  assert.equal(new Set(keyBindings).size, keyBindings.length, "key bindings must be resolved centrally without context collisions");
  assert.doesNotThrow(() => createActionRegistry(BUILT_IN_ACTIONS, {}));
}

function validationFailsClosed(): void {
  for (const invalid of [null, {}, { objectId: "bad/id", kind: "message" }, { objectId: "ok", kind: "unknown" },
    { objectId: "ok", kind: "message", atUri: "@mutable-handle" },
    { objectId: "ok", kind: "message", atUri: 7 },
    { objectId: "ok", kind: "message", revision: 7 },
    { objectId: "ok", kind: "message", revision: "" }]) {
    assert.throws(() => validateObjectRef(invalid));
  }
  assert.throws(() => validateProjectionId("unsafe/projection"));
  // SAFETY: Runtime checks or construction above establish unknown as string)).
  // @ts-expect-error validateProjectionId rejects non-string projection ids.
  assert.throws(() => validateProjectionId(7));
  assert.equal(parseObjectUrl("not a url"), undefined);
  assert.equal(parseObjectUrl("/elsewhere?object=m-001"), undefined);
  assert.equal(parseObjectUrl("/board.html?object=bad%2Fid"), undefined);
  assert.equal(parseObjectUrl("/board.html?projection=bad%2Fid&focus=m-001"), undefined);
  assert.throws(() => objectUrl(rootRef, { revision: "" }), /revision/u);
  // SAFETY: Runtime checks or construction above establish unknown as string }).
  // @ts-expect-error objectUrl rejects non-string revision values.
  assert.throws(() => objectUrl(rootRef, { revision: 7 }), /revision/u);
  assert.throws(() => objectUrl(rootRef, { revision: "r".repeat(513) }), /revision/u);
  assert.equal(parseObjectUrl(`/board.html?object=m-001&revision=${"r".repeat(513)}`), undefined);

}

function projectionKindIsCanonical(): void {
  assert.deepEqual(validateObjectRef({ objectId: "projection-one", kind: "projection" }), {
    objectId: "projection-one",
    kind: "projection",
  });
  assert.throws(() => validateObjectRef({ objectId: "projection-one", kind: "saved-view" }), /unsupported/iu);
}

function resourceVisibilityFailsClosed(): void {
  const target = { kind: "project" as const, resourceId: "project-1" };
  assert.equal(canReadCommunityResource({ ...target, visibility: "public" }, {}), true);
  assert.equal(canReadCommunityResource({ ...target, visibility: "shared", ownerId: "alice",
    participantIds: ["bob"] }, {}), false);
  assert.equal(canReadCommunityResource({ ...target, visibility: "shared", ownerId: "alice",
    participantIds: ["bob"] }, { actorId: "alice" }), true);
  assert.equal(canReadCommunityResource({ ...target, visibility: "shared", ownerId: "alice",
    participantIds: ["bob"] }, { actorId: "bob" }), true);
  assert.equal(canReadCommunityResource({ ...target, visibility: "shared", ownerId: "alice",
    participantIds: ["bob"] }, { actorId: "mallory" }), false);
  assert.equal(canReadCommunityResource({ ...target, visibility: "private", ownerId: "alice" }, { actorId: "alice" }), true);
  assert.equal(canReadCommunityResource({ ...target, visibility: "private", ownerId: "alice" }, { actorId: "mallory" }), false);
  assert.equal(canReadCommunityResource(target, {}), false);
  // SAFETY: Runtime checks or construction above establish "public" }.
  assert.equal(canReadCommunityResource({ ...target, visibility: "invalid" as "public" }, {}), false);
}

function message(
  ref: CommunityObjectRef,
  inReplyTo: CommunityObjectRef | undefined,
  threadRoot: CommunityObjectRef,
  title: string,
  body: string,
  state = "read",
): CommunityMessage {
  const message = {
    ref,
    context: channelRef,
    authorId: "member-alice",
    title,
    body,
    publishedAt: "2026-08-11T00:00:00.000Z",
    threadRoot,
    relations: [],
    state,
    aliases: [title],
  };
  return inReplyTo === undefined ? message : { ...message, inReplyTo };
}
