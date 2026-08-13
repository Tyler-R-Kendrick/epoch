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

const ENCODER = new TextEncoder();

/**
 * UTF-8 byte length.
 *
 * `String.prototype.length` counts UTF-16 code units, so it understates the
 * real size of non-ASCII content and would let chunks exceed their configured
 * limit while reporting savings that do not exist.
 */
function byteLength(value: string): number {
  return ENCODER.encode(value).length;
}

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

  /** Largest cut at or before `limit` bytes, measured in UTF-8. */
  const cutWithinBytes = (from: number, ceiling: number): number => {
    let cut = from;
    let used = 0;
    while (cut < source.length) {
      const next = byteLength(source[cut]);
      if (used + next > ceiling) break;
      used += next;
      cut += 1;
    }
    return Math.max(cut, from + 1);
  };

  for (let position = nodesPerChunk - 1; position < boundaries.length; position += nodesPerChunk) {
    const boundary = boundaries[position];
    while (byteLength(source.slice(start, boundary.offset)) > maxBytes) emit(cutWithinBytes(start, maxBytes), undefined);
    emit(boundary.offset, boundary.path);
  }
  while (byteLength(source.slice(start)) > maxBytes) emit(cutWithinBytes(start, maxBytes), undefined);
  emit(source.length, undefined);

  return chunks;
}

export interface SubtreeEntry {
  /**
   * Storage key: the content digest scoped by the provider that produced it.
   *
   * Two identical byte sequences parsed under different grammars are different
   * declarations, so they get different keys and are never falsely shared.
   * Sharing them is a real opportunity, but it belongs to the byte layer, not
   * to a table keyed by structural identity (ADR-0045).
   */
  readonly key: string;
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
  // Two levels, because a digest is not an identity. The outer key is the
  // provider-scoped digest; the inner map holds the distinct texts that share
  // it, so a collision produces two stored entries rather than one entry and a
  // silently overstated saving.
  const table = new Map<string, Map<string, { occurrences: number; paths: string[] }>>();
  let totalBytes = 0;

  for (const source of sources) {
    const index = indexTree(provider.parse(source.text), digest);
    // Only top-level declarations are counted, so a parent and its children are
    // never both charged for the same bytes.
    for (const child of index.childrenOf("")) {
      const text = child.node.text;
      const bytes = byteLength(text);
      if (bytes < minBytes) continue;
      totalBytes += bytes;
      const scoped = `${provider.id}:${child.digest}`;
      const variants = table.get(scoped) ?? new Map();
      table.set(scoped, variants);
      // The default digest is a non-cryptographic index hash, so equal digests
      // are compared by text before their storage is shared. Text that differs
      // is a different declaration and is kept, not dropped: dropping it left
      // its bytes in `totalBytes` and out of `storedBytes`, which reported a
      // saving for content that was never shared (ADR-0038).
      const existing = variants.get(text);
      if (existing === undefined) variants.set(text, { occurrences: 1, paths: [`${source.path}#${child.path}`] });
      else {
        existing.occurrences += 1;
        existing.paths.push(`${source.path}#${child.path}`);
      }
    }
  }

  const entries = [...table.entries()]
    .flatMap(([scoped, variants]) => {
      // Collision keys are ordered by text so the suffix a variant receives is
      // the same on every machine, whatever order the sources arrived in.
      const texts = [...variants.keys()].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
      return texts.map((text, index) => {
        const value = variants.get(text)!;
        return {
          key: texts.length === 1 ? scoped : `${scoped}#${index}`,
          digest: scoped.slice(provider.id.length + 1),
          text,
          bytes: byteLength(text),
          occurrences: value.occurrences,
          paths: value.paths,
        };
      });
    })
    .sort((left, right) => right.bytes * right.occurrences - left.bytes * left.occurrences || left.key.localeCompare(right.key));

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
    if (byteLength(content) + byteLength(token) + 1 > maxBytes) break;
    content += `${token}\n`;
    entries.push({ token, occurrences });
    coveredBytes += byteLength(token) * occurrences;
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
    encodedBytes: byteLength(JSON.stringify(patch)),
    plainBytes: byteLength(target),
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
  const plainBytes = sources.reduce((total, source) => total + byteLength(source.text), 0);
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

export interface CompressionGroup {
  readonly providerId: string;
  readonly files: number;
  readonly chunks: number;
  readonly dedup: SubtreeDedupResult;
  readonly plainBytes: number;
  readonly plannedBytes: number;
}

/** A source no provider claimed, kept in the report rather than dropped. */
export interface UnplannedSource {
  readonly path: string;
  readonly reason: string;
}

export interface MixedCompressionPlan {
  /** Ordered by provider ID, so the plan is identical across clones. */
  readonly groups: readonly CompressionGroup[];
  readonly unplanned: readonly UnplannedSource[];
  /** Derived across every planned *and* unplanned source; see below. */
  readonly dictionary: DerivedDictionary;
  readonly plainBytes: number;
  readonly plannedBytes: number;
}

/**
 * Resolve the provider that understands a source, or nothing.
 *
 * Returning `undefined` is a first-class answer: a repository contains
 * lockfiles and images, and a plan that pretends otherwise is a plan that
 * overstates its own coverage.
 */
export type SyntaxProviderResolver = (
  source: { readonly path: string; readonly text: string },
) => SyntaxProvider | undefined;

/**
 * Plan compression across a mixed-language corpus (ADR-0045).
 *
 * The single-provider `planCompression` is the degenerate case of one group.
 * The restriction was never in the operations — chunking is per source, dedup
 * content-addresses declarations, and dictionary derivation runs over raw text
 * — only in a signature written when there was one language to plan.
 *
 * Three properties make this more than a loop over providers:
 *
 * - dedup keys are scoped by provider, so identical text under two grammars is
 *   two entries rather than a false share;
 * - the dictionary spans every group, including sources no provider claimed,
 *   because cross-language repetition — an import path, a licence header, a URL
 *   — is exactly the redundancy a derived dictionary exists to capture, and
 *   deriving per group would discard it;
 * - sources no provider matches are reported, not dropped.
 */
export function planCompressionAcross(
  sources: readonly { readonly path: string; readonly text: string }[],
  resolve: SyntaxProviderResolver,
  options: { readonly digest?: DigestFunction } = {},
): MixedCompressionPlan {
  const digest = options.digest ?? indexDigest;
  const byProvider = new Map<string, { provider: SyntaxProvider; sources: { path: string; text: string }[] }>();
  const unplanned: UnplannedSource[] = [];

  for (const source of sources) {
    const provider = resolve(source);
    if (provider === undefined) {
      unplanned.push({ path: source.path, reason: `no syntax provider matches '${source.path}'` });
      continue;
    }
    const group = byProvider.get(provider.id);
    if (group === undefined) {
      byProvider.set(provider.id, { provider, sources: [{ ...source }] });
      continue;
    }
    group.sources.push({ ...source });
  }

  const groups = [...byProvider.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([providerId, group]) => {
      // Sorted within the group too, so a shell's glob order cannot change the
      // plan two clones produce from the same corpus.
      const ordered = [...group.sources].sort((left, right) => left.path.localeCompare(right.path));
      const dedup = dedupeSubtrees(ordered, group.provider, { digest });
      const plainBytes = ordered.reduce((total, source) => total + byteLength(source.text), 0);
      return {
        providerId,
        files: ordered.length,
        chunks: ordered.reduce(
          (total, source) => total + chunkBySyntax(source.text, group.provider, { digest }).length,
          0,
        ),
        dedup,
        plainBytes,
        plannedBytes: plainBytes - dedup.savedBytes,
      };
    });

  // Unplanned sources contribute to the dictionary and to `plainBytes` but not
  // to savings: their bytes are real, and a total that omitted them would
  // overstate how much of the corpus the plan covers.
  const dictionary = deriveDictionary(sources.map((source) => source.text), { digest });
  const plainBytes = sources.reduce((total, source) => total + byteLength(source.text), 0);
  const saved = groups.reduce((total, group) => total + group.dedup.savedBytes, 0);
  // Sorted for the same reason the groups are: the plan must not depend on the
  // order a shell happened to expand a glob in.
  const ordered = [...unplanned].sort((left, right) =>
    left.path.localeCompare(right.path) || left.reason.localeCompare(right.reason));

  return { groups, unplanned: ordered, dictionary, plainBytes, plannedBytes: plainBytes - saved };
}
