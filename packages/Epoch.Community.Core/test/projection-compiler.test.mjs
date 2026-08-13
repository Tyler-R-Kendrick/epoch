import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import {
  assignProjectionCollisionNames,
  compileProjectionDefinition,
  createProjectionOccurrenceId,
  formatProjectionDefinition,
  renderSegmentTemplate,
} from "../dist/projection-compiler.js";
import { builtinDefaultProjection } from "../dist/builtin-projections.js";

const object = (objectId, kind = "message") => ({ objectId, kind });

const definition = {
  apiVersion: "epoch.dev/v1alpha1",
  projectionId: "projection-work",
  version: 1,
  label: "Work",
  visibility: "private",
  root: {
    nodeId: "root",
    kind: "literal",
    segment: "work",
    children: [{
      nodeId: "by-state",
      kind: "group",
      field: "state",
      segment: { template: "{slug(state)}" },
      missing: "unknown",
      order: "key-ascending",
      child: {
        nodeId: "items",
        kind: "select",
        objectKinds: ["issue", "change"],
        order: [
          { field: "updatedAt", direction: "descending", nulls: "last" },
          { field: "objectId", direction: "ascending", nulls: "last" },
        ],
        children: [{
          nodeId: "leaf",
          kind: "leaf",
          segment: { template: "{slug(title)}-{shortId(objectId)}" },
          representation: "default",
        }],
      },
    }],
  },
  order: [{ field: "updatedAt", direction: "descending", nulls: "last" }],
  updateMode: "live",
  consistency: "current",
};

const context = {
  fields: ["objectId", "kind", "title", "state", "updatedAt"],
  sortableFields: ["objectId", "kind", "updatedAt"],
  limits: { maxDepth: 12, maxNodes: 64, maxFanout: 128, maxTemplateLength: 256, maxSegmentLength: 120 },
};

assert.equal(compileProjectionDefinition(definition, context).diagnostics.length, 0);
const allNodes = {
  ...definition,
  projectionId: "projection-all-nodes",
  root: {
    nodeId: "all-root",
    kind: "union",
    children: [{
      nodeId: "exact",
      kind: "alias",
      target: object("issue-1", "issue"),
      segment: { template: "exact-{shortId(objectId)}" },
      children: [],
    }, {
      nodeId: "related",
      kind: "traverse",
      relation: "reply",
      direction: "out",
      maxDepth: 2,
      child: {
        nodeId: "reply-leaf",
        kind: "leaf",
        segment: { template: "reply-{shortId(objectId)}" },
        representation: "body.md",
      },
    }],
  },
};
assert.equal(compileProjectionDefinition(allNodes, context).nodeCount, 4);
assert.equal(renderSegmentTemplate(
  { template: "{upper(coalesce(title, objectId))}-{pad(shortId(objectId), 8, '0')}" },
  { title: "", objectId: "object-123456789" },
).segment, "OBJECT-123456789-23456789");

assert.throws(
  () => renderSegmentTemplate({ template: "{replace(title, '-', '/')}" }, { title: "private-test" }),
  /unsafe|reserved|segment/iu,
);
assert.throws(
  () => compileProjectionDefinition({ ...definition, root: { ...definition.root, segment: ".epoch" } }, context),
  /PROJECTION_INVALID/u,
);
const cyclic = { nodeId: "cycle", kind: "union", children: [] };
cyclic.children.push(cyclic);
assert.throws(
  () => compileProjectionDefinition({ ...definition, projectionId: "projection-cycle", root: cyclic }, context),
  (error) => error.diagnostics?.some((diagnostic) => diagnostic.code === "PROJECTION_CYCLE") === true,
);
assert.throws(
  () => compileProjectionDefinition({
    ...definition,
    projectionId: "projection-unstable",
    order: [],
    root: { nodeId: "root", kind: "select", objectKinds: ["issue"], children: [] },
  }, context),
  /order must be explicit/u,
);

const first = createProjectionOccurrenceId({
  projectionId: "projection-work",
  projectionVersion: 1,
  nodeId: "leaf",
  branchId: "root/by-state/items/leaf",
  parentEntryId: "entry-parent",
  target: object("message-1"),
  resolvedSegment: "same",
});
const second = createProjectionOccurrenceId({
  projectionId: "projection-work",
  projectionVersion: 1,
  nodeId: "other-leaf",
  branchId: "root/items/other-leaf",
  parentEntryId: "entry-parent",
  target: object("message-1"),
  resolvedSegment: "same",
});
assert.notEqual(first, second, "one target can occur twice with branch-stable occurrence identity");
assert.equal(first, createProjectionOccurrenceId({
  projectionId: "projection-work",
  projectionVersion: 1,
  nodeId: "leaf",
  branchId: "root/by-state/items/leaf",
  parentEntryId: "entry-parent",
  target: object("message-1"),
  resolvedSegment: "same",
}));

const collisions = [
  { target: object("z"), nodeId: "leaf-b", originalSegment: "Same", normalizedSegment: "same" },
  { target: object("a"), nodeId: "leaf-a", originalSegment: "same", normalizedSegment: "same" },
];
const forward = assignProjectionCollisionNames(collisions);
const reverse = assignProjectionCollisionNames([...collisions].reverse());
assert.deepEqual(
  new Map(forward.map((entry) => [`${entry.target.objectId}:${entry.nodeId}`, entry.finalName])),
  new Map(reverse.map((entry) => [`${entry.target.objectId}:${entry.nodeId}`, entry.finalName])),
  "collision suffixes cannot depend on source arrival order",
);
assert.ok(forward.every((entry) => /^same~[a-z0-9]{8}$/u.test(entry.finalName)));
assert.ok(assignProjectionCollisionNames([
  { target: object("long-a"), nodeId: "a", originalSegment: "x".repeat(120), normalizedSegment: "x".repeat(120) },
  { target: object("long-b"), nodeId: "b", originalSegment: "x".repeat(120), normalizedSegment: "x".repeat(120) },
]).every((entry) => entry.finalName.length <= 120));

const compiledBuiltin = compileProjectionDefinition(builtinDefaultProjection, {
  ...context,
});
assert.equal(compiledBuiltin.diagnostics.length, 0);
assert.deepEqual(
  builtinDefaultProjection.root.children.map((child) => child.kind === "literal" ? child.segment : ""),
  ["projects", "spaces", "dms", "notifications", ".agents", "members", "search", "views"],
);

assert.equal(formatProjectionDefinition(definition), formatProjectionDefinition(JSON.parse(JSON.stringify(definition))));

const schema = JSON.parse(await readFile(new URL("../schema/projection-definition.v1alpha1.schema.json", import.meta.url), "utf8"));
assert.equal(schema.$id, "https://epoch.dev/schema/community/projection-definition-v1alpha1.json");
assert.deepEqual(schema.$defs.projectionNode.discriminator.mapping.literal, "#/$defs/literalNode");
assert.equal(schema.additionalProperties, false);
