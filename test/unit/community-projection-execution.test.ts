import assert from "node:assert/strict";
import {
  EntityProjectionRuntime,
  type CommunityEntity,
  type CommunityObjectRef,
  type CommunityRelation,
  type ProjectionDefinition,
} from "@epoch/community-core";

const context = { authorizationFingerprint: "actor-public", snapshotId: "snapshot-1" } as const;
const complete = { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] } as const;

export async function runCommunityProjectionExecutionTests(): Promise<void> {
  let relationReads = 0;
  const beta = entity("issue-beta", "Beta", "closed");
  const alpha = entity("issue-alpha", "Same", "open", () => {
    relationReads += 1;
    return [{ type: "reply", source: ref("issue-alpha"), target: ref("issue-beta") }];
  });
  const gamma = entity("issue-gamma", "Same", "open");
  const runtime = projectionRuntime([gamma, beta, alpha]);

  assert.deepEqual((await runtime.list("projection-main", "/", { first: 20 }, context)).entries.map((entry) => entry.name), [
    "by-state", "collisions", "replies", "pinned", "duplicates",
  ]);
  assert.equal(relationReads, 0, "listing the root must not traverse unrelated relation branches");

  assert.deepEqual((await runtime.list("projection-main", "/by-state", { first: 20 }, context)).entries.map((entry) => entry.name), ["open"]);
  assert.equal(relationReads, 0, "listing a selected/grouped branch must not materialize a traverse sibling");
  assert.equal((await runtime.list("projection-main", "/by-state/open", { first: 20 }, context)).entries.length, 2);

  const collisionPage = await runtime.list("projection-main", "/collisions", { first: 1 }, context);
  assert.equal(collisionPage.entries.length, 1);
  assert.equal(collisionPage.pageInfo.hasNextPage, true);
  assert.match(collisionPage.entries[0]!.name, /^same~/u);
  const collisionNext = await runtime.list("projection-main", "/collisions", { first: 2, after: collisionPage.pageInfo.endCursor }, context);
  assert.equal(collisionNext.entries.length, 1);
  assert.notEqual(collisionNext.entries[0]!.entryId, collisionPage.entries[0]!.entryId);
  assert.match((await runtime.explain("projection-main", collisionNext.entries[0]!.logicalPath, context)).detail, /collision set/u);

  assert.deepEqual((await runtime.list("projection-main", "/replies", { first: 20 }, context)).entries.map((entry) => entry.target.objectId), ["issue-beta"]);
  assert.ok(relationReads > 0);
  const aliasChildren = await runtime.list("projection-main", "/pinned", { first: 20 }, context);
  assert.deepEqual(aliasChildren.entries.map((entry) => [entry.name, entry.kind, entry.target.objectId]), [["metadata.json", "representation", "issue-alpha"]]);

  const repeated = await runtime.list("projection-main", "/duplicates", { first: 20 }, context);
  assert.equal(repeated.entries.length, 2);
  assert.equal(new Set(repeated.entries.map((entry) => entry.target.objectId)).size, 1);
  assert.equal(new Set(repeated.entries.map((entry) => entry.entryId)).size, 2);

  const locations = await runtime.locate("projection-main", ref("issue-alpha"), context);
  assert.ok(locations.length >= 5);
  assert.ok(locations.every((entry) => entry.target.objectId === "issue-alpha"));

  const reversed = projectionRuntime([alpha, beta, gamma]);
  const names = (await runtime.list("projection-main", "/collisions", { first: 20 }, context)).entries.map((entry) => [entry.target.objectId, entry.name]);
  const reversedNames = (await reversed.list("projection-main", "/collisions", { first: 20 }, context)).entries.map((entry) => [entry.target.objectId, entry.name]);
  assert.deepEqual(reversedNames, names, "collision names and ordering must not depend on entity arrival order");
}

function projectionRuntime(entities: readonly CommunityEntity[]): EntityProjectionRuntime {
  return new EntityProjectionRuntime({
    entities,
    completeness: complete,
    cursorKey: new Uint8Array(32).fill(9),
    compileContext: {
      fields: ["kind", "objectId", "title", "state", "updatedAt"],
      sortableFields: ["kind", "objectId", "title", "state", "updatedAt"],
      limits: { maxDepth: 20, maxNodes: 100, maxFanout: 100, maxTemplateLength: 256, maxSegmentLength: 120, maxRelationDepth: 4 },
    },
  }, [definition]);
}

const definition: ProjectionDefinition = {
  apiVersion: "epoch.dev/v1alpha1",
  projectionId: "projection-main",
  version: 1,
  label: "Projection execution",
  visibility: "public",
  root: {
    nodeId: "root", kind: "literal", segment: "", children: [{
      nodeId: "root-union", kind: "union", children: [
        {
          nodeId: "by-state", kind: "literal", segment: "by-state", children: [{
            nodeId: "open-select", kind: "select", objectKinds: ["issue"],
            where: { kind: "compare", field: "state", operator: "eq", value: "open" },
            order: [{ field: "objectId", direction: "ascending", nulls: "last" }], children: [{
              nodeId: "state-group", kind: "group", field: "state", segment: { template: "{state}" }, missing: "unknown", order: "key-ascending",
              child: { nodeId: "state-leaf", kind: "leaf", segment: { template: "{slug(title)}" }, representation: "default" },
            }],
          }],
        },
        {
          nodeId: "collisions", kind: "literal", segment: "collisions", children: [{
            nodeId: "collision-select", kind: "select", objectKinds: ["issue"],
            where: { kind: "compare", field: "state", operator: "eq", value: "open" },
            order: [{ field: "objectId", direction: "ascending", nulls: "last" }],
            children: [{ nodeId: "collision-leaf", kind: "leaf", segment: { template: "{slug(title)}" }, representation: "default" }],
          }],
        },
        {
          nodeId: "replies", kind: "literal", segment: "replies", children: [{
            nodeId: "alpha-select", kind: "select", objectKinds: ["issue"],
            where: { kind: "compare", field: "objectId", operator: "eq", value: "issue-alpha" },
            order: [{ field: "objectId", direction: "ascending", nulls: "last" }], children: [{
              nodeId: "reply-traverse", kind: "traverse", relation: "reply", direction: "out", maxDepth: 1,
              child: { nodeId: "reply-leaf", kind: "leaf", segment: { template: "{slug(title)}" }, representation: "default" },
            }],
          }],
        },
        {
          nodeId: "pinned", kind: "alias", target: ref("issue-alpha"), segment: { template: "pinned" }, children: [
            { nodeId: "metadata", kind: "leaf", segment: { template: "metadata.json" }, representation: "metadata.json" },
          ],
        },
        {
          nodeId: "duplicates", kind: "literal", segment: "duplicates", children: [{
            nodeId: "duplicate-union", kind: "union", children: ["a", "b"].map((suffix) => ({
              nodeId: `duplicate-select-${suffix}`, kind: "select" as const, objectKinds: ["issue" as const],
              where: { kind: "compare" as const, field: "objectId", operator: "eq" as const, value: "issue-alpha" },
              order: [{ field: "objectId", direction: "ascending" as const, nulls: "last" as const }],
              children: [{ nodeId: `duplicate-leaf-${suffix}`, kind: "leaf" as const, segment: { template: "same" }, representation: "default" as const }],
            })),
          }],
        },
      ],
    }],
  },
  order: [{ field: "objectId", direction: "ascending", nulls: "last" }],
  updateMode: "live",
  consistency: "current",
};

function ref(objectId: string): CommunityObjectRef { return { objectId, kind: "issue" }; }

function entity(objectId: string, title: string, state: string, relations?: () => readonly CommunityRelation[]): CommunityEntity {
  const value: CommunityEntity = {
    ref: ref(objectId),
    fields: { objectId, kind: "issue", title, state, updatedAt: "2026-08-12T00:00:00.000Z" },
    searchableText: { title },
    get relations() { return relations?.() ?? []; },
    visibility: "public",
    participantIds: [],
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    provenance: { sourceId: "fixture", nativeId: objectId, observedAt: "2026-08-12T00:00:00.000Z" },
  };
  return value;
}

if (process.argv[1]?.endsWith("community-projection-execution.test.js")) {
  runCommunityProjectionExecutionTests().then(() => console.log("community projection execution tests passed"), (error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
