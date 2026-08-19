import assert from "node:assert/strict";
import { getIntrospectionQuery, graphql } from "graphql";
import { CommunityError, normalizeQuery } from "@epoch/community-core";
import {
  createCommunityGraphQLSchema,
  executeCommunityGraphQL,
  subscribeCommunityGraphQL,
  COMMUNITY_GRAPHQL_SDL,
  searchExpressionFromInput,
} from "../dist/index.js";

const calls = [];
const complete = { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] };
const snapshot = {
  snapshotId: "snapshot-1", createdAt: "2026-08-12T12:00:00.000Z", resolvedNow: "2026-08-12T12:00:00.000Z",
  timezone: "UTC", locale: "en-US", queryHash: "query", planHash: "plan", fieldRegistryVersion: 2,
  analyzerVersion: "epoch-tokenizer-v1", authorizationFingerprint: "fingerprint", sourceCheckpoints: [],
};
const projection = {
  apiVersion: "epoch.dev/v1alpha1", projectionId: "projection-one", version: 1, label: "One", visibility: "private",
  root: { nodeId: "root", kind: "literal", segment: "one", children: [] },
  order: [{ field: "objectId", direction: "ascending", nulls: "last" }], updateMode: "live", consistency: "current",
};
const mount = { mountId: "mount-one", scope: "user", mountPath: "/", projectionId: "projection-one", mode: "replace", order: 0, writable: false, createdAt: "2026-08-12T12:00:00.000Z", updatedAt: "2026-08-12T12:00:00.000Z" };
const services = {
  async node(id, authorization) {
    calls.push(["node", id, authorization.actorId]);
    return id === "visible-node" ? {
      ref: { objectId: id, kind: "message" },
      fields: { title: "Visible", participantIds: ["private-member"], dmId: "private-dm" },
      searchableText: { title: "Visible" }, relations: [], visibility: "public", participantIds: ["private-member"],
      createdAt: snapshot.createdAt, updatedAt: snapshot.createdAt,
      provenance: { sourceId: "canonical", nativeId: id, observedAt: snapshot.createdAt },
    } : undefined;
  },
  observableFields() { return { title: "Visible" }; },
  async search(input) { calls.push(["search", input]); return { hits: [], pageInfo: { hasNextPage: false }, snapshot, completeness: complete }; },
  parseSearch(expression, options) { calls.push(["parse", expression, options.authorization.actorId]); return normalizeQuery(expression, { ...options, now: snapshot.resolvedNow }); },
  async explainSearch(input) { calls.push(["explainSearch", input]); return { planHash: "plan", backendId: "reference", expression: input.where, sourcePlans: [], ordering: ["updatedAt:descending:last"], authorization: "pre-filtered" }; },
  async projections() { return [projection]; },
  async projection(id) { return id === projection.projectionId ? projection : undefined; },
  async saveProjection(input) { calls.push(["saveProjection", input]); return input; },
  async deleteProjection(id) { calls.push(["deleteProjection", id]); return true; },
  async projectionContext(authorization, snapshotId) { return { authorizationFingerprint: `fp-${authorization.actorId}`, snapshotId: snapshotId ?? "projection-snapshot" }; },
  async listPath(input) { calls.push(["listPath", input]); return { entries: [], pageInfo: { hasNextPage: false }, freshness: complete, shadowed: [], componentOrder: [] }; },
  async resolvePath() { return undefined; },
  async locate() { return []; },
  async explainPath(input) { return { projectionId: "namespace", path: input.path, componentOrder: [], shadowed: [], detail: "none" }; },
  async sourceCapabilities() { return [{ sourceId: "canonical", fullText: "lexical", pagination: "keyset", supportsWatch: true, supportsPointLookup: true, supportsRelations: true, maxPageSize: 100, fields: {} }]; },
  async namespaceMounts() { return [mount]; },
  async mountProjection(input) { calls.push(["mount", input]); return { ...input, createdAt: "2026-08-12T12:00:00.000Z", updatedAt: "2026-08-12T12:00:00.000Z" }; },
  async unmountProjection(id) { calls.push(["unmount", id]); return true; },
  async resetNamespace(scope) { calls.push(["reset", scope]); return { scope, removedMountIds: [], preservedProjectionIds: [projection.projectionId] }; },
  async *projectionDeltas(input) {
    calls.push(["watch", input.path]);
    try { yield { projectionId: projection.projectionId, projectionVersion: 1, sequence: 1, upserts: [], deletes: [], observedAt: "2026-08-12T12:00:00.000Z" }; }
    finally { calls.push(["watchClosed", input.path]); }
  },
};
const schema = createCommunityGraphQLSchema(services);
const context = { authorization: { actorId: "actor-a", permissions: [] }, signal: new globalThis.AbortController().signal };

assert.deepEqual(
  Object.keys(schema.getQueryType().getFields()).sort(),
  ["explainPath", "explainSearch", "listPath", "locate", "namespaceMounts", "node", "parseSearch", "projection", "projections", "resolvePath", "search", "sourceCapabilities"].sort(),
);
assert.deepEqual(
  Object.keys(schema.getMutationType().getFields()).sort(),
  ["deleteProjection", "mountProjection", "resetNamespace", "saveProjection", "unmountProjection"].sort(),
);
assert.deepEqual(Object.keys(schema.getSubscriptionType().getFields()), ["projectionDeltas"]);

assert.match(COMMUNITY_GRAPHQL_SDL, /input SearchExpressionInput @oneOf/u);
const introspection = await graphql({ schema, source: getIntrospectionQuery({ oneOf: true }) });
const expressionType = introspection.data.__schema.types.find((type) => type.name === "SearchExpressionInput");
assert.equal(expressionType.isOneOf, true);
assert.equal(introspection.data.__schema.types.find((type) => type.name === "CommunityNode").fields.some((field) => field.name === "participantIds"), false);

const visibleNode = await executeCommunityGraphQL({ schema, source: `{ node(id: "visible-node") { fields } }`, context });
assert.deepEqual(visibleNode.data.node.fields, { title: "Visible" }, "generic fields do not bypass sensitive-field authorization");

const structured = await executeCommunityGraphQL({
  schema,
  source: `query Search($where: SearchExpressionInput!) {
    search(where: $where, orderBy: [{ field: "updatedAt", direction: DESCENDING, nulls: LAST }], first: 10, after: "cursor_1", snapshot: "snapshot-1") {
      nodes { target { objectId kind } matchedFields }
      pageInfo { hasNextPage endCursor }
      snapshot { snapshotId planHash }
      completeness { status omittedSources unsupportedPredicates }
    }
  }`,
  variableValues: { where: { compare: { field: "state", operator: "EQ", value: { scalar: { string: "needs-review" } } } } },
  context,
});
assert.equal(structured.errors, undefined);
const structuredCall = calls.findLast((call) => call[0] === "search")[1];
assert.deepEqual(structuredCall.where, { kind: "compare", field: "state", operator: "eq", value: "needs-review" });
assert.equal(structuredCall.authorization.actorId, "actor-a");
assert.equal(structuredCall.after, "cursor_1");
assert.equal(structuredCall.snapshot, "snapshot-1");

const parsed = await executeCommunityGraphQL({ schema, source: `{ parseSearch(expression: "state:needs-review") { canonical canonicalJson queryHash diagnostics { code message } } }`, context });
assert.equal(parsed.errors, undefined);
assert.deepEqual(JSON.parse(parsed.data.parseSearch.canonicalJson).expression, structuredCall.where);

const explained = await executeCommunityGraphQL({
  schema,
  source: `{ explainSearch(where: { exists: { field: "state" } }) { backendId parsedExpression normalizedExpression sourcePlans { sourceId pushdown residual } authorization omissions } }`,
  context,
});
assert.equal(explained.errors, undefined);
assert.deepEqual(explained.data.explainSearch.normalizedExpression, { kind: "exists", field: "state" });
assert.deepEqual(explained.data.explainSearch.omissions, []);

const invalidOneOf = await executeCommunityGraphQL({
  schema,
  source: `query($where: SearchExpressionInput!) { search(where: $where, first: 1) { nodes { target { objectId } } } }`,
  variableValues: { where: { all: { enabled: true }, exists: { field: "state" } } },
  context,
});
assert.match(invalidOneOf.errors[0].message, /exactly one field/u);
assert.equal(invalidOneOf.errors[0].extensions.code, "QUERY_SYNTAX");
assert.throws(
  () => searchExpressionFromInput({ text: { fields: ["title"], value: "epoch", mode: "REGEX" } }),
  (error) => error.code === "QUERY_INVALID_OPERATOR",
);
assert.throws(
  () => searchExpressionFromInput({ range: { field: "score", includeLower: true, includeUpper: true } }),
  (error) => error.code === "QUERY_SYNTAX",
);

const saved = await executeCommunityGraphQL({
  schema,
  source: `mutation($definition: JSON!) { saveProjection(input: { definition: $definition }) { id version label } }`,
  variableValues: { definition: projection }, context,
});
assert.equal(saved.data.saveProjection.id, "projection-one");

const sources = await executeCommunityGraphQL({ schema, source: `{ sourceCapabilities { sourceId fullText pagination } namespaceMounts { id scope path mode } }`, context });
assert.equal(sources.data.sourceCapabilities[0].sourceId, "canonical");
assert.equal(sources.data.namespaceMounts[0].id, "mount-one");

const protectedReset = await executeCommunityGraphQL({ schema, source: `mutation { resetNamespace(scope: BUILTIN) { scope } }`, context });
assert.equal(protectedReset.errors[0].extensions.code, "NAMESPACE_RECOVERY_PROTECTED");

const deniedSchema = createCommunityGraphQLSchema({ ...services, async search() { throw new CommunityError("AUTHORIZATION_DENIED", "Denied without revealing an object", { hiddenObjectId: "private-object" }); } });
const denied = await executeCommunityGraphQL({ denied: true, schema: deniedSchema, source: `{ search(where: { all: { enabled: true } }, first: 1) { nodes { target { objectId } } } }`, context });
assert.equal(denied.errors[0].extensions.code, "AUTHORIZATION_DENIED");
assert.equal(denied.errors[0].extensions.httpStatus, 403);
assert.equal(denied.errors[0].extensions.details, undefined);

const malformedSchema = createCommunityGraphQLSchema({ ...services, async search() { return { hits: null, pageInfo: { hasNextPage: false }, snapshot, completeness: complete }; } });
const malformed = await executeCommunityGraphQL({ schema: malformedSchema, source: `{ search(where: { all: { enabled: true } }, first: 1) { nodes { target { objectId } } } }`, context });
assert.equal(malformed.errors[0].message, "Internal Community GraphQL failure");
assert.equal(malformed.errors[0].extensions.code, "INTERNAL");

const tooDeep = await executeCommunityGraphQL({ schema, source: `{ projections { definition } }`, context, limits: { maxDepth: 1, maxComplexity: 20 } });
assert.equal(tooDeep.errors[0].extensions.code, "QUERY_COST_LIMIT");

const subscription = await subscribeCommunityGraphQL({
  schema,
  source: `subscription { projectionDeltas(path: "/") { projectionId projectionVersion sequence observedAt deletes } }`,
  context,
});
assert.ok(Symbol.asyncIterator in subscription);
const iterator = subscription[Symbol.asyncIterator]();
const event = await iterator.next();
assert.equal(event.value.data.projectionDeltas.sequence, 1);
await iterator.return?.();
assert.deepEqual(calls.findLast((call) => call[0] === "watchClosed"), ["watchClosed", "/"]);

assert.throws(() => searchExpressionFromInput({}), /exactly one variant/);
assert.throws(() => searchExpressionFromInput({ all: { enabled: false } }), /all.enabled must be true/);
assert.deepEqual(searchExpressionFromInput({ all: { enabled: true } }), { kind: "all" });
assert.deepEqual(searchExpressionFromInput({ and: { terms: [{ exists: { field: "a" } }] } }).kind, "and");
assert.deepEqual(searchExpressionFromInput({ or: { terms: [{ exists: { field: "a" } }] } }).kind, "or");
assert.deepEqual(searchExpressionFromInput({ not: { term: { exists: { field: "a" } } } }).kind, "not");
assert.deepEqual(searchExpressionFromInput({ text: { fields: ["title"], value: "epoch", mode: "PHRASE" } }).mode, "phrase");
assert.deepEqual(searchExpressionFromInput({
  compare: { field: "n", operator: "IN", value: { values: [{ number: 1 }, { boolean: true }, { nullValue: true }] } },
}).value, [1, true, null]);
assert.deepEqual(searchExpressionFromInput({
  range: { field: "score", lower: { number: 1 }, upper: { number: 9 }, includeLower: true, includeUpper: false },
}).kind, "range");
assert.equal(searchExpressionFromInput({
  related: { relation: "REPLY", target: { objectId: "m1", kind: "message" }, direction: "OUT", maxDepth: 2 },
}).kind, "related");
assert.throws(() => searchExpressionFromInput({ and: { terms: [] } }), /1 and 64 terms/);
assert.throws(() => searchExpressionFromInput({ related: { relation: "REPLY", target: { objectId: "m1", kind: "message" }, direction: "OUT", maxDepth: 0 } }), /depth/);
assert.throws(() => searchExpressionFromInput({ compare: { field: "n", operator: "EQ", value: {} } }), /scalar or a bounded/);
assert.throws(() => searchExpressionFromInput({ compare: { field: "n", operator: "EQ", value: { scalar: {} } } }), /exactly one value/);

const missingAuth = await executeCommunityGraphQL({ schema, source: `{ node(id: "visible-node") { fields } }`, context: { authorization: null } });
assert.equal(missingAuth.errors[0].extensions.code, "AUTHORIZATION_DENIED");

const badParse = await executeCommunityGraphQL({ schema, source: "{", context });
assert.equal(badParse.errors[0].extensions.code, "QUERY_SYNTAX");

const tooBig = await executeCommunityGraphQL({ schema, source: `{ node(id: "visible-node") { fields } }`, context, limits: { maxDocumentBytes: 8 } });
assert.equal(tooBig.errors[0].extensions.code, "QUERY_COST_LIMIT");

const twoOps = await executeCommunityGraphQL({
  schema,
  source: `query A { node(id: "visible-node") { fields } } query B { node(id: "visible-node") { fields } }`,
  context,
});
assert.equal(twoOps.errors[0].extensions.code, "QUERY_SYNTAX");

const named = await executeCommunityGraphQL({
  schema,
  source: `query A { node(id: "visible-node") { fields } } query B { node(id: "missing") { fields } }`,
  operationName: "A",
  context,
});
assert.equal(named.data.node.fields.title, "Visible");

const firstTooLarge = await executeCommunityGraphQL({
  schema,
  source: `{ search(where: { all: { enabled: true } }, first: 1001) { nodes { target { objectId } } } }`,
  context,
});
assert.equal(firstTooLarge.errors[0].extensions.code, "QUERY_COST_LIMIT");

const cancelled = await executeCommunityGraphQL({
  schema: createCommunityGraphQLSchema({
    ...services,
    async search() { const error = new Error("stopped"); error.name = "AbortError"; throw error; },
  }),
  source: `{ search(where: { all: { enabled: true } }, first: 1) { nodes { target { objectId } } } }`,
  context,
});
assert.equal(cancelled.errors[0].extensions.code, "CANCELLED");

const badCursor = await executeCommunityGraphQL({
  schema,
  source: `{ search(where: { all: { enabled: true } }, first: 1, after: "bad cursor") { nodes { target { objectId } } } }`,
  context,
});
assert.equal(badCursor.errors[0].extensions.code, "QUERY_SYNTAX");

const fragmentCycle = await executeCommunityGraphQL({
  schema,
  source: `query { ...A } fragment A on Query { ...B } fragment B on Query { ...A }`,
  context,
});
assert.equal(fragmentCycle.errors[0].extensions.code, "QUERY_SYNTAX");

const listed = await executeCommunityGraphQL({
  schema,
  source: `{ listPath(path: "/", first: 5, namespace: "user") { nodes { name } pageInfo { hasNextPage } componentOrder } locate(objectId: "visible-node") { name } resolvePath(path: "/") { name } explainPath(path: "/") { detail } projections { id } projection(id: "missing") { id } }`,
  context,
});
assert.equal(listed.errors, undefined);
assert.equal(listed.data.projection, null);

const mounted = await executeCommunityGraphQL({
  schema,
  source: `mutation { mountProjection(input: { mountId: "m2", projectionId: "projection-one", path: "/extra", mode: AFTER, scope: USER, order: 1, writable: false }) { id path } deleteProjection(id: "projection-one") unmountProjection(id: "mount-one") }`,
  context,
});
assert.equal(mounted.errors, undefined);

const parseLocale = await executeCommunityGraphQL({
  schema,
  source: `{ parseSearch(expression: "state:needs-review", timezone: "UTC", locale: "en-US") { canonical } }`,
  context,
});
assert.equal(parseLocale.errors, undefined);

const noLegacy = schema.getQueryType().getFields();
assert.equal(noLegacy.savedViews, undefined);
assert.equal(noLegacy.communitySearch, undefined);
