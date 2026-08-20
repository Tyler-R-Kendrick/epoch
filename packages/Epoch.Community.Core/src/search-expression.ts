import type { CommunityFieldScalar, CommunityFieldValue } from "./entity";
import type { CommunityObjectRef } from "./identity";

export type { CommunityFieldScalar, CommunityFieldValue } from "./entity";

export interface SourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
}

export type SearchExpression =
  | { readonly kind: "all"; readonly span?: SourceSpan }
  | { readonly kind: "and" | "or"; readonly terms: readonly SearchExpression[]; readonly span?: SourceSpan }
  | { readonly kind: "not"; readonly term: SearchExpression; readonly span?: SourceSpan }
  | {
      readonly kind: "text";
      readonly fields: readonly string[];
      readonly value: string;
      readonly mode: "term" | "phrase" | "prefix";
      readonly span?: SourceSpan;
    }
  | {
      readonly kind: "compare";
      readonly field: string;
      readonly operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in";
      readonly value: CommunityFieldValue;
      readonly span?: SourceSpan;
    }
  | {
      readonly kind: "range";
      readonly field: string;
      readonly lower?: CommunityFieldScalar;
      readonly upper?: CommunityFieldScalar;
      readonly includeLower: boolean;
      readonly includeUpper: boolean;
      readonly span?: SourceSpan;
    }
  | { readonly kind: "exists"; readonly field: string; readonly span?: SourceSpan }
  | {
      readonly kind: "related";
      readonly relation: "reply" | "quote" | "mention" | "provenance" | "promotion" | "replacement" |
        "moderation" | "attachment" | "backlink";
      readonly target: CommunityObjectRef;
      readonly direction: "in" | "out";
      readonly maxDepth: number;
      readonly span?: SourceSpan;
    };

export interface SearchOrder {
  readonly field: string;
  readonly direction: "ascending" | "descending";
  readonly nulls: "first" | "last";
}

export interface QueryDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
  readonly span?: SourceSpan;
  readonly suggestions: readonly string[];
}

export interface NormalizedCommunityQuery {
  readonly ast: SearchExpression | null;
  readonly canonical: string;
  readonly canonicalJson: string;
  readonly queryHash: string;
  readonly sort: readonly SearchOrder[];
  readonly version: number;
  readonly fieldRegistryVersion: number;
  readonly resolvedAt: string;
  readonly diagnostics: readonly QueryDiagnostic[];
  readonly error?: string;
}

export type SemanticValue = string | number | boolean | null | SemanticObject | readonly SemanticValue[];
export interface SemanticObject { readonly [key: string]: SemanticValue }

export function semanticExpression(expression: SearchExpression | null): SemanticValue {
  if (expression === null) return null;
  switch (expression.kind) {
    case "all": return { kind: expression.kind };
    case "and": case "or": return { kind: expression.kind, terms: expression.terms.map(semanticExpression) };
    case "not": return { kind: expression.kind, term: semanticExpression(expression.term) };
    case "text": return { kind: expression.kind, fields: expression.fields, value: expression.value, mode: expression.mode };
    case "compare": return { kind: expression.kind, field: expression.field, operator: expression.operator, value: expression.value };
    case "range": {
      const semantic: SemanticObject = {
        kind: expression.kind,
        field: expression.field,
        includeLower: expression.includeLower,
        includeUpper: expression.includeUpper,
      };
      if (expression.lower !== undefined) Object.assign(semantic, { lower: expression.lower });
      if (expression.upper !== undefined) Object.assign(semantic, { upper: expression.upper });
      return semantic;
    }
    case "exists": return { kind: expression.kind, field: expression.field };
    case "related": {
      const target: SemanticObject = {
        objectId: expression.target.objectId,
        kind: expression.target.kind,
      };
      if (expression.target.atUri !== undefined) Object.assign(target, { atUri: expression.target.atUri });
      if (expression.target.revision !== undefined) Object.assign(target, { revision: expression.target.revision });
      return {
        kind: expression.kind,
        relation: expression.relation,
        target,
        direction: expression.direction,
        maxDepth: expression.maxDepth,
      };
    }
  }
}

export function canonicalExpressionJson(expression: SearchExpression | null): string {
  return JSON.stringify(semanticExpression(expression));
}

/** Portable deterministic cache key; trust-boundary cursors are signed separately. */
export function stableQueryHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
