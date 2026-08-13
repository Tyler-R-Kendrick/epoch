import type { SearchExplanation } from "@epoch/community-core";

export interface ExplainRow {
  readonly label: string;
  readonly value: string;
}

/** Converts bounded explanation metadata to display rows without source content or authorization claims. */
export function searchExplanationRows(explanation: SearchExplanation): readonly ExplainRow[] {
  return Object.freeze([
    { label: "plan", value: explanation.planHash },
    { label: "backend", value: explanation.backendId },
    { label: "authorization", value: explanation.authorization },
    { label: "ordering", value: explanation.ordering.join(", ") || "canonical identity" },
    ...explanation.sourcePlans.map((source) => ({
      label: `source ${source.sourceId}`,
      value: `pushdown ${stable(source.pushdown)} · residual ${stable(source.residual)}`,
    })),
  ]);
}

export function projectionExplanationRows(explanation: {
  readonly projectionId: string;
  readonly path: string;
  readonly detail: string;
  readonly componentOrder: readonly string[];
  readonly shadowed: readonly unknown[];
}): readonly ExplainRow[] {
  return Object.freeze([
    { label: "projection", value: explanation.projectionId },
    { label: "path", value: explanation.path },
    { label: "resolution", value: explanation.detail },
    { label: "mount order", value: explanation.componentOrder.join(" → ") || "none" },
    { label: "shadowed", value: String(explanation.shadowed.length) },
  ]);
}

function stable(value: unknown): string {
  if (value === undefined) return "none";
  return JSON.stringify(value, (_key, current: unknown) => current, 0).slice(0, 2_048);
}
