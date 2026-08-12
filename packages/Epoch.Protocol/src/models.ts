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

export type StackEdgeKind = "requires" | "orders-after" | "conflicts" | "derived";
export interface StackEdge {
  readonly from: RevisionId;
  readonly to: RevisionId;
  readonly kind: StackEdgeKind;
}

export interface StackDefinition {
  readonly stackId: CanonicalId<"stack">;
  readonly revisionIds: readonly RevisionId[];
  readonly edges: readonly StackEdge[];
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
  readonly reviewId: CanonicalId<"review">;
  readonly revisionIds: readonly RevisionId[];
  readonly baseFrontier: readonly RevisionId[];
  readonly baseTreeDigest: Digest;
  readonly resultingTreeDigest: Digest;
  readonly overlaps: readonly { readonly left: CanonicalId<"fragment">; readonly right: CanonicalId<"fragment"> }[];
  readonly conflictIds: readonly CanonicalId<"conflict">[];
  readonly gateDigest: Digest;
}

export interface MergePlan {
  readonly mergePlanId: CanonicalId<"merge-plan">;
  readonly targetRevisionId: RevisionId;
  readonly revisionIds: readonly RevisionId[];
  readonly dependencyClosure: readonly RevisionId[];
  readonly reviewBundleRevisionId: RevisionId;
  readonly resolutionRevisionIds: readonly RevisionId[];
  readonly gateDigest: Digest;
  readonly mode: "merge" | "squash";
  readonly expectedResultDigest: Digest;
}

export interface DurableConflict {
  readonly conflictId: CanonicalId<"conflict">;
  readonly sideRevisionIds: readonly RevisionId[];
  readonly status: "unresolved" | "proposed" | "accepted" | "rejected";
  readonly resolutionRevisionIds: readonly RevisionId[];
}
