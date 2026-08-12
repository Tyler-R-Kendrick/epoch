import type { CanonicalId, RevisionId } from "./ids";

export type Digest = string;
export type ContentRef = `sha256:${string}` | `swh:${string}` | `promise:${string}`;

export interface FragmentEndpoint {
  readonly path: string;
  readonly digest?: Digest;
}

export interface FragmentPrecondition {
  readonly kind: "absent" | "digest";
  readonly digest?: Digest;
}

export interface ChangeFragment {
  readonly fragmentId: CanonicalId<"fragment">;
  readonly kind: "add" | "delete" | "move" | "copy" | "text" | "structured" | "binary";
  readonly path: string;
  readonly from?: FragmentEndpoint;
  readonly precondition: FragmentPrecondition;
  readonly resultDigest: Digest;
  readonly contentRef?: ContentRef;
  readonly order: number;
  readonly dependencies: readonly CanonicalId<"fragment">[];
  readonly provenance: {
    readonly principalId: CanonicalId<"principal">;
    readonly sourceRevisionId?: RevisionId;
  };
  readonly mergeStrategy: "exact" | "text" | "structured" | "binary-replace";
}

export interface ChangeRevisionBody {
  readonly changeId: CanonicalId<"change">;
  readonly baseFrontier: readonly RevisionId[];
  readonly baseTreeDigest: Digest;
  readonly parentRevisionIds: readonly RevisionId[];
  readonly fragments: readonly ChangeFragment[];
  readonly resultingTreeDigest: Digest;
  readonly authorPrincipalId: CanonicalId<"principal">;
}

export type ChangeGraphEdgeKind = "requires" | "orders-after" | "conflicts-with" | "derived-from";
export interface ChangeGraphEdge {
  readonly from: RevisionId;
  readonly to: RevisionId;
  readonly kind: ChangeGraphEdgeKind;
}

export interface ChangeGraphDefinition {
  readonly changeGraphId: CanonicalId<"change-graph">;
  readonly memberRevisionIds: readonly RevisionId[];
  readonly edges: readonly ChangeGraphEdge[];
}

export interface SplitGroup {
  readonly fragmentIds: readonly CanonicalId<"fragment">[];
  readonly risk: "low" | "medium" | "high" | "ambiguous";
  readonly reason: string;
}

export interface SplitPlan {
  readonly sourceRevisionId: RevisionId;
  readonly groups: readonly SplitGroup[];
}

export interface ReviewBundle {
  readonly reviewBundleId: CanonicalId<"review-bundle">;
  readonly selectedRevisionIds: readonly RevisionId[];
  readonly baseFrontier: readonly RevisionId[];
  readonly baseTreeDigest: Digest;
  readonly combinedTreeDigest: Digest;
  readonly overlaps: readonly { readonly left: CanonicalId<"fragment">; readonly right: CanonicalId<"fragment"> }[];
  readonly conflictIds: readonly CanonicalId<"conflict">[];
  readonly gateDefinitionDigest: Digest;
}

export interface MergePlan {
  readonly mergePlanId: CanonicalId<"merge-plan">;
  readonly targetRevisionId: RevisionId;
  readonly selectedRevisionIds: readonly RevisionId[];
  readonly hardDependencyClosure: readonly RevisionId[];
  readonly reviewBundleRevisionId: RevisionId;
  readonly conflictResolutionRevisionIds: readonly RevisionId[];
  readonly gateDefinitionDigest: Digest;
  readonly mergeMode: "per-change-squash" | "change-graph-squash";
  readonly resultingTreeDigest: Digest;
}

export interface DurableConflict {
  readonly conflictId: CanonicalId<"conflict">;
  readonly sideRevisionIds: readonly RevisionId[];
  readonly status: "unresolved" | "proposed" | "accepted" | "rejected";
  readonly resolutionRevisionIds: readonly RevisionId[];
}
