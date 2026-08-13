import type { CommunityRelation } from "./graph";
import type { CommunityObjectKind, CommunityObjectRef } from "./identity";
import type { SearchExpression, SearchOrder } from "./search-expression";

export const PROJECTION_DEFINITION_API_VERSION = "epoch.dev/v1alpha1" as const;

export interface ProjectionLimits {
  readonly maxDepth?: number;
  readonly maxEntriesPerDirectory?: number;
  readonly maxTotalEntries?: number;
  readonly maxRelationDepth?: number;
}

export interface ProjectionEntryCapabilities {
  readonly read: boolean;
  readonly enter: boolean;
  readonly expand: boolean;
  readonly composeUnder: boolean;
  readonly execute: boolean;
}

export interface SegmentTemplate {
  readonly template: string;
}

export interface ProjectionDefinition {
  readonly apiVersion: typeof PROJECTION_DEFINITION_API_VERSION;
  readonly projectionId: string;
  readonly version: number;
  readonly label: string;
  readonly ownerId?: string;
  readonly visibility: "private" | "shared" | "public";
  readonly root: ProjectionNode;
  readonly order: readonly SearchOrder[];
  readonly updateMode: "live" | "queued" | "snapshot";
  readonly consistency: "current" | "session-snapshot" | "fixed-snapshot";
  readonly limits?: ProjectionLimits;
}

export type ProjectionNode =
  | {
      readonly nodeId: string;
      readonly kind: "literal";
      readonly segment: string;
      readonly children: readonly ProjectionNode[];
    }
  | {
      readonly nodeId: string;
      readonly kind: "select";
      readonly objectKinds: readonly CommunityObjectKind[];
      readonly where?: SearchExpression;
      readonly order?: readonly SearchOrder[];
      readonly limit?: number;
      readonly children: readonly ProjectionNode[];
    }
  | {
      readonly nodeId: string;
      readonly kind: "group";
      readonly field: string;
      readonly segment: SegmentTemplate;
      readonly missing: string;
      readonly order: "key-ascending" | "key-descending" | "count-ascending" | "count-descending";
      readonly child: ProjectionNode;
    }
  | {
      readonly nodeId: string;
      readonly kind: "traverse";
      readonly relation: CommunityRelation["type"];
      readonly direction: "in" | "out";
      readonly maxDepth: number;
      readonly child: ProjectionNode;
    }
  | {
      readonly nodeId: string;
      readonly kind: "union";
      readonly children: readonly ProjectionNode[];
    }
  | {
      readonly nodeId: string;
      readonly kind: "alias";
      readonly target: CommunityObjectRef;
      readonly segment: SegmentTemplate;
      readonly children: readonly ProjectionNode[];
    }
  | {
      readonly nodeId: string;
      readonly kind: "leaf";
      readonly segment: SegmentTemplate;
      readonly representation: "default" | "body.md" | "metadata.json";
    };

export interface ProjectionCompileLimits {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxFanout: number;
  readonly maxTemplateLength: number;
  readonly maxSegmentLength: number;
  readonly maxRelationDepth?: number;
}

export interface ProjectionCompileContext {
  readonly fields: readonly string[];
  readonly sortableFields: readonly string[];
  readonly limits: ProjectionCompileLimits;
}

export interface ProjectionDiagnostic {
  readonly code:
    | "PROJECTION_INVALID"
    | "PROJECTION_CYCLE"
    | "PROJECTION_COLLISION"
    | "PROJECTION_LIMIT"
    | "PROJECTION_UNKNOWN_FIELD"
    | "PROJECTION_UNSTABLE_ORDER";
  readonly message: string;
  readonly severity: "error" | "warning";
  readonly pointer: string;
}

export interface CompiledProjection {
  readonly definition: ProjectionDefinition;
  readonly canonicalJson: string;
  readonly diagnostics: readonly ProjectionDiagnostic[];
  readonly nodeCount: number;
  readonly maximumDepth: number;
  readonly estimatedFanout: number;
  readonly effectiveOrder: readonly SearchOrder[];
}

export interface ProjectionOccurrenceIdentity {
  readonly projectionId: string;
  readonly projectionVersion: number;
  readonly nodeId: string;
  readonly branchId: string;
  readonly parentEntryId: string;
  readonly target: CommunityObjectRef;
  readonly resolvedSegment: string;
}

export interface ProjectionCollisionCandidate {
  readonly target: CommunityObjectRef;
  readonly nodeId: string;
  readonly branchId?: string;
  readonly originalSegment: string;
  readonly normalizedSegment: string;
}

export interface ResolvedProjectionCollision extends ProjectionCollisionCandidate {
  readonly finalName: string;
  readonly collided: boolean;
  readonly collisionSet: readonly string[];
}

export interface RenderedSegment {
  readonly original: string;
  readonly segment: string;
  readonly fields: readonly string[];
}
