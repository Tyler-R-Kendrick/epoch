import { PROJECTION_DEFINITION_API_VERSION, type ProjectionDefinition, type ProjectionNode } from "./projection-definition";

const branch = (
  nodeId: string,
  segment: string,
  objectKinds: readonly ("project" | "channel" | "dm" | "notification" | "agent" | "member" | "projection")[],
): ProjectionNode => ({
  nodeId,
  kind: "literal",
  segment,
  children: [{
    nodeId: `${nodeId}-select`,
    kind: "select",
    objectKinds,
    order: [
      { field: "updatedAt", direction: "descending", nulls: "last" },
      { field: "objectId", direction: "ascending", nulls: "last" },
    ],
    children: [{
      nodeId: `${nodeId}-leaf`,
      kind: "leaf",
      segment: { template: "{slug(coalesce(title, objectId))}" },
      representation: "default",
    }],
  }],
});

/** The recovery-mounted built-in root is data, compiled by the same runtime as user definitions. */
const defaultProjection: ProjectionDefinition = {
  apiVersion: PROJECTION_DEFINITION_API_VERSION,
  projectionId: "builtin:default",
  version: 1,
  label: "Epoch default",
  visibility: "public",
  root: {
    nodeId: "root",
    kind: "literal",
    segment: "",
    children: [
      branch("projects", "projects", ["project"]),
      branch("spaces", "spaces", ["channel"]),
      branch("dms", "dms", ["dm"]),
      branch("notifications", "notifications", ["notification"]),
      branch("agents", ".agents", ["agent"]),
      branch("members", "members", ["member"]),
      branch("search", "search", ["projection"]),
      branch("views", "views", ["projection"]),
    ],
  },
  order: [
    { field: "updatedAt", direction: "descending", nulls: "last" },
    { field: "objectId", direction: "ascending", nulls: "last" },
  ],
  updateMode: "live",
  consistency: "current",
};

export const builtinDefaultProjection: ProjectionDefinition = Object.freeze(defaultProjection);
