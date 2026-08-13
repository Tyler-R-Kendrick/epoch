/**
 * `@epoch/semantic` — the browser-safe semantic content pipeline (ADR-0038).
 *
 * Diff, merge, conflict identity, and storage all read the same representation
 * ladder, and the level actually used is recorded as evidence rather than
 * assumed.
 */
export {
  indexDigest,
  indexTree,
  isAncestorPath,
  joinPath,
  node,
  parentPathOf,
  pathStep,
  type DigestFunction,
  type IndexedNode,
  type SemanticLevel,
  type SyntaxIndex,
  type SyntaxNode,
  type SyntaxProvider,
  type SyntaxTree,
} from "./syntax";

export {
  semanticDiff,
  type SemanticDiffOptions,
  type SemanticEdit,
  type SemanticEditKind,
  type SemanticPatch,
} from "./diff";

export {
  applySemanticPatch,
  formatSemanticPatch,
  SemanticPatchError,
  type SemanticPatchErrorCode,
} from "./patch";

export {
  semanticMerge,
  type SemanticMergeOptions,
  type SemanticMergeResult,
  type StructuralConflict,
  type StructuralConflictKind,
} from "./merge";

export {
  chunkBySyntax,
  dedupeSubtrees,
  deriveDictionary,
  encodeSemanticDelta,
  planCompression,
  planCompressionAcross,
  type CompressionGroup,
  type CompressionPlan,
  type DerivedDictionary,
  type DictionaryOptions,
  type SemanticChunk,
  type SemanticChunkOptions,
  type SemanticDelta,
  type SubtreeDedupOptions,
  type SubtreeDedupResult,
  type MixedCompressionPlan,
  type SubtreeEntry,
  type SyntaxProviderResolver,
  type UnplannedSource,
} from "./compression";

export { jsonSyntaxProvider } from "./providers/json";
export { tomlSyntaxProvider } from "./providers/toml";
export { markdownSyntaxProvider } from "./providers/markdown";
export { delimiterSyntaxProvider } from "./providers/delimiter";

import { delimiterSyntaxProvider } from "./providers/delimiter";
import { jsonSyntaxProvider } from "./providers/json";
import { markdownSyntaxProvider } from "./providers/markdown";
import { tomlSyntaxProvider } from "./providers/toml";
import type { SyntaxProvider } from "./syntax";

/**
 * Builtin providers, in deterministic registration order.
 *
 * Grammar-backed providers are expected to displace these through the
 * ADR-0037 capability registry; they implement the same interface, so a
 * replacement is a registration rather than a fork.
 */
export const BUILTIN_SYNTAX_PROVIDERS: readonly SyntaxProvider[] = [
  jsonSyntaxProvider,
  tomlSyntaxProvider,
  markdownSyntaxProvider,
  delimiterSyntaxProvider,
];

/**
 * Pick a builtin provider for a path or MIME type.
 *
 * Extension match wins over MIME match, and ties break on provider ID, so
 * selection is reproducible across clones (ADR-0037).
 */
export function selectBuiltinProvider(
  reference: { readonly path?: string; readonly mimeType?: string },
  providers: readonly SyntaxProvider[] = BUILTIN_SYNTAX_PROVIDERS,
): SyntaxProvider | undefined {
  const lowered = reference.path?.toLowerCase() ?? "";
  const candidates = [...providers].sort((left, right) => left.id.localeCompare(right.id));
  const byExtension = candidates.find((provider) => provider.extensions.some((extension) => lowered.endsWith(extension)));
  if (byExtension !== undefined) return byExtension;
  if (reference.mimeType === undefined) return undefined;
  return candidates.find((provider) => provider.mimeTypes.includes(reference.mimeType as string));
}
