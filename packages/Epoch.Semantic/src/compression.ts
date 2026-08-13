import { semanticDiff, type SemanticPatch } from "./diff";
import {
  indexDigest,
  indexTree,
  type DigestFunction,
  type SyntaxProvider,
} from "./syntax";

/**
 * Semantic compression (ADR-0038).
 *
 * Everything here is a storage-layer concern and never changes object
 * identity: `blobSha256` stays SHA-256 over whole plaintext content and
 * `verify()` continues to re-hash whole content. These functions decide how
 * bytes are *stored*, not what an object *is*.
 *
 * This module stays browser-safe and therefore performs no byte-level
 * entropy coding. It produces the chunk boundaries, dedup table, dictionary,
 * and delta that a host codec then encodes.
 */

export interface SemanticChunk {
  readonly start: number;
  readonly end: number;
  readonly digest: string;
  /** Structural path of the node this chunk closes on, when it closed on one. */
  readonly path?: string;
}

export interface SemanticChunkOptions {
  readonly digest?: DigestFunction;
  /**
   * How many top-level nodes each chunk covers. Grouping is by node count, not
   * by byte threshold: a size threshold would make boundaries depend on
   * formatting again, which is the exact failure being designed out.
   */
  readonly nodesPerChunk?: number;
  /** Safety split for a single node larger than this. */
  readonly maxBytes?: number;
}

const DEFAULT_NODES_PER_CHUNK = 1;
const DEFAULT_MAX_BYTES = 65536;

/**
 * Cut chunk boundaries at syntax node edges instead of at a rolling hash over
 * bytes.
 *
 * FastCDC picks boundaries from byte content, so changing indentation
 * reshuffles every subsequent boundary and invalidates chunk-level dedup.
 * Snapping to node edges makes chunk identity track structure, which is what
 * ADR-0015 and ADR-0016 need in order to keep partial residency stable across
 * reformatting.
 */
export function chunkBySyntax(
  source: string,
  provider: SyntaxProvider,
  options: SemanticChunkOptions = {},
): readonly SemanticChunk[] {
  const digest = options.digest ?? indexDigest;
  const nodesPerChunk = Math.max(1, options.nodesPerChunk ?? DEFAULT_NODES_PER_CHUNK);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const index = indexTree(provider.parse(source), digest);

  const boundaries = index
    .childrenOf("")
    .map((child) => ({ offset: child.node.end, path: child.path }))
    .sort((left, right) => left.offset - right.offset);

  const chunks: SemanticChunk[] = [];
  let start = 0;

  const emit = (end: number, path: string | undefined): void => {
    if (end <= start) return;
    chunks.push({ start, end, digest: digest(source.slice(start, end)), path });
    start = end;
  };

  for (let position = nodesPerChunk - 1; position < boundaries.length; position += nodesPerChunk) {
    const boundary = boundaries[position];
    while (boundary.offset - start > maxBytes) emit(start + maxBytes, undefined);
    emit(boundary.offset, boundary.path);
  }
  while (source.length - start > maxBytes) emit(start + maxBytes, undefined);
  emit(source.length, undefined);

  return chunks;
}

export interface SubtreeEntry {
  readonly digest: string;
  readonly text: string;
  readonly bytes: number;
  readonly occurrences: number;
  readonly paths: readonly string[];
}

export interface SubtreeDedupResult {
  readonly entries: readonly SubtreeEntry[];
  readonly totalBytes: number;
  readonly storedBytes: number;
  readonly savedBytes: number;
}

export interface SubtreeDedupOptions {
  readonly digest?: DigestFunction;
  /** Ignore subtrees smaller than this; tiny nodes cost more to index than to store. */
  readonly minBytes?: number;
}

/**
 * Content-address syntax subtrees, not just whole blobs.
 *
 * A declaration that appears in two files, or moves between revisions, is
 * stored once. This is Git's tree-level sharing pushed down to declaration
 * granularity.
 */
export function dedupeSubtrees(
  sources: readonly { readonly path: string; readonly text: string }[],
  provider: SyntaxProvider,
  options: SubtreeDedupOptions = {},
): SubtreeDedupResult {
  const digest = options.digest ?? indexDigest;
  const minBytes = options.minBytes ?? 64;
  const table = new Map<string, { text: string; occurrences: number; paths: string[] }>();
  let totalBytes = 0;

  for (const source of sources) {
    const index = indexTree(provider.parse(source.text), digest);
    // Only top-level declarations are counted, so a parent and its children are
    // never both charged for the same bytes.
    for (const child of index.childrenOf("")) {
      const text = child.node.text;
      if (text.length < minBytes) continue;
      totalBytes += text.length;
      const existing = table.get(child.digest);
      if (existing === undefined) {
        table.set(child.digest, { text, occurrences: 1, paths: [`${source.path}#${child.path}`] });
        continue;
      }
      existing.occurrences += 1;
      existing.paths.push(`${source.path}#${child.path}`);
    }
  }

  const entries = [...table.entries()]
    .map(([entryDigest, value]) => ({
      digest: entryDigest,
      text: value.text,
      bytes: value.text.length,
      occurrences: value.occurrences,
      paths: value.paths,
    }))
    .sort((left, right) => right.bytes * right.occurrences - left.bytes * left.occurrences || left.digest.localeCompare(right.digest));

  const storedBytes = entries.reduce((total, entry) => total + entry.bytes, 0);
  return { entries, totalBytes, storedBytes, savedBytes: totalBytes - storedBytes };
}

export interface DerivedDictionary {
  readonly content: string;
  readonly digest: string;
  readonly entries: readonly { readonly token: string; readonly occurrences: number }[];
  /** Corpus bytes covered by dictionary entries. */
  readonly coveredBytes: number;
}

export interface DictionaryOptions {
  readonly digest?: DigestFunction;
  readonly maxBytes?: number;
  readonly minTokenLength?: number;
  readonly minOccurrences?: number;
}

const TOKEN_PATTERN = /[A-Za-z_$][\w$]*(?:[.:][A-Za-z_$][\w$]*)*|[{}()[\];,]+/gu;

/**
 * Derive a preset compression dictionary from the repository's own corpus.
 *
 * Deflate performs badly on many small source objects because each one starts
 * with an empty window. A shared dictionary of the corpus's frequent token
 * sequences fixes that. Derivation is deterministic and the dictionary is
 * itself content-addressed, so decompression is reproducible from repository
 * state alone.
 */
export function deriveDictionary(
  corpus: readonly string[],
  options: DictionaryOptions = {},
): DerivedDictionary {
  const digest = options.digest ?? indexDigest;
  const maxBytes = options.maxBytes ?? 16384;
  const minTokenLength = options.minTokenLength ?? 4;
  const minOccurrences = options.minOccurrences ?? 3;

  const counts = new Map<string, number>();
  for (const text of corpus) {
    for (const match of text.matchAll(TOKEN_PATTERN)) {
      const token = match[0];
      if (token.length < minTokenLength) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  // Rank by bytes saved, then lexicographically so the dictionary is identical
  // on every machine that sees the same corpus.
  const ranked = [...counts.entries()]
    .filter(([, occurrences]) => occurrences >= minOccurrences)
    .sort((left, right) => {
      const leftValue = left[0].length * (left[1] - 1);
      const rightValue = right[0].length * (right[1] - 1);
      return rightValue - leftValue || left[0].localeCompare(right[0]);
    });

  const entries: { token: string; occurrences: number }[] = [];
  let content = "";
  let coveredBytes = 0;
  for (const [token, occurrences] of ranked) {
    if (content.length + token.length + 1 > maxBytes) break;
    content += `${token}\n`;
    entries.push({ token, occurrences });
    coveredBytes += token.length * occurrences;
  }

  return { content, digest: digest(content), entries, coveredBytes };
}

export interface SemanticDelta {
  readonly kind: "semantic-delta";
  readonly baseDigest: string;
  readonly patch: SemanticPatch;
  readonly encodedBytes: number;
  readonly plainBytes: number;
}

/**
 * Encode content as a structural patch against a base rather than a byte delta.
 *
 * The stored delta is then proportional to semantic change instead of to
 * formatting churn: reindenting a file produces a near-empty delta where a
 * byte delta would rewrite every line.
 */
export function encodeSemanticDelta(
  base: string,
  target: string,
  provider: SyntaxProvider,
  options: { readonly digest?: DigestFunction; readonly path?: string } = {},
): SemanticDelta {
  const digest = options.digest ?? indexDigest;
  const patch = semanticDiff(provider.parse(base), provider.parse(target), { digest, path: options.path });
  return {
    kind: "semantic-delta",
    baseDigest: digest(base),
    patch,
    encodedBytes: JSON.stringify(patch).length,
    plainBytes: target.length,
  };
}

export interface CompressionPlan {
  readonly providerId: string;
  readonly chunks: number;
  readonly dedup: SubtreeDedupResult;
  readonly dictionary: DerivedDictionary;
  readonly plainBytes: number;
  /** Bytes after subtree dedup. Entropy coding is applied by the host codec. */
  readonly plannedBytes: number;
}

/**
 * Report what semantic compression would do to a corpus without encoding it.
 *
 * This is the surface `epoch object plan` reports and the one tests assert
 * against, so savings claims stay measured rather than asserted.
 */
export function planCompression(
  sources: readonly { readonly path: string; readonly text: string }[],
  provider: SyntaxProvider,
  options: { readonly digest?: DigestFunction } = {},
): CompressionPlan {
  const digest = options.digest ?? indexDigest;
  const dedup = dedupeSubtrees(sources, provider, { digest });
  const dictionary = deriveDictionary(sources.map((source) => source.text), { digest });
  const plainBytes = sources.reduce((total, source) => total + source.text.length, 0);
  const chunks = sources.reduce((total, source) => total + chunkBySyntax(source.text, provider, { digest }).length, 0);
  return {
    providerId: provider.id,
    chunks,
    dedup,
    dictionary,
    plainBytes,
    plannedBytes: plainBytes - dedup.savedBytes,
  };
}
