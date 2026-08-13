import { semanticDiff, type SemanticEdit, type SemanticPatch } from "./diff";
import { applySemanticPatch, SemanticPatchError } from "./patch";
import {
  indexDigest,
  indexTree,
  isAncestorPath,
  type DigestFunction,
  type SemanticLevel,
  type SyntaxProvider,
} from "./syntax";

export type StructuralConflictKind = "edit-edit" | "edit-delete" | "ancestor-descendant" | "unapplicable";

/**
 * A conflict scoped to a structural path rather than a line range.
 *
 * Path scoping is what makes ADR-0031's durable conflicts durable: the
 * conflict still identifies the same construct after the file is reformatted
 * or the surrounding code is rebased.
 */
export interface StructuralConflict {
  readonly path: string;
  readonly kind: StructuralConflictKind;
  readonly base?: string;
  readonly left?: string;
  readonly right?: string;
  /**
   * Formatting-insensitive key for reusable resolutions. Two conflicts that
   * differ only in whitespace share a signature, so a recorded resolution
   * still matches after a reformat.
   */
  readonly signature: string;
}

export interface SemanticMergeResult {
  readonly merged: string;
  readonly conflicts: readonly StructuralConflict[];
  readonly level: SemanticLevel;
  readonly providerId: string;
  /** True when every edit from both sides was incorporated. */
  readonly clean: boolean;
}

export interface SemanticMergeOptions {
  readonly digest?: DigestFunction;
  readonly path?: string;
}

function normalizeForSignature(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim();
}

function editText(source: string, path: string, provider: SyntaxProvider): string | undefined {
  try {
    return indexTree(provider.parse(source)).byPath.get(path)?.node.text;
  } catch {
    return undefined;
  }
}

/**
 * The full payload identity of an edit.
 *
 * Every field an edit can carry must participate. A `reorder` carries its
 * payload in `order` rather than `text`, so comparing only kind/path/text
 * would treat two different permutations of the same container as agreement
 * and silently pick one side — precisely the wrong merge ADR-0031 forbids.
 */
function editKey(edit: SemanticEdit): string {
  return [
    edit.kind,
    edit.path,
    edit.toPath ?? "",
    edit.parentPath ?? "",
    edit.anchorPath ?? "",
    edit.text ?? "",
    (edit.order ?? []).join(","),
  ].join("\u0000");
}

/** Two edits agree when they would produce the same result at the same path. */
function equivalent(left: SemanticEdit, right: SemanticEdit): boolean {
  return editKey(left) === editKey(right);
}

function patchOf(edits: readonly SemanticEdit[], template: SemanticPatch): SemanticPatch {
  return { ...template, edits };
}

/**
 * Three-way structural merge.
 *
 * Edits in disjoint subtrees merge regardless of how close they are in the
 * file, so adjacent-line collisions stop being conflicts. Where the two sides
 * genuinely touch the same construct, the result is a conflict rather than a
 * guess (ADR-0031).
 */
export function semanticMerge(
  base: string,
  left: string,
  right: string,
  provider: SyntaxProvider,
  options: SemanticMergeOptions = {},
): SemanticMergeResult {
  const digest = options.digest ?? indexDigest;
  const baseTree = provider.parse(base);
  const leftPatch = semanticDiff(baseTree, provider.parse(left), { digest, path: options.path });
  const rightPatch = semanticDiff(baseTree, provider.parse(right), { digest, path: options.path });

  const conflicts: StructuralConflict[] = [];
  const conflicted = new Set<string>();

  const recordConflict = (path: string, kind: StructuralConflictKind): void => {
    if (conflicted.has(path)) return;
    conflicted.add(path);
    const baseText = editText(base, path, provider);
    const leftText = editText(left, path, provider);
    const rightText = editText(right, path, provider);
    conflicts.push({
      path,
      kind,
      base: baseText,
      left: leftText,
      right: rightText,
      signature: digest([
        path,
        normalizeForSignature(baseText),
        normalizeForSignature(leftText),
        normalizeForSignature(rightText),
      ].join("|")),
    });
  };

  for (const leftEdit of leftPatch.edits) {
    for (const rightEdit of rightPatch.edits) {
      if (equivalent(leftEdit, rightEdit)) continue;
      if (leftEdit.path === rightEdit.path) {
        const deletion = leftEdit.kind === "delete" || rightEdit.kind === "delete";
        recordConflict(leftEdit.path, deletion ? "edit-delete" : "edit-edit");
        continue;
      }
      if (isAncestorPath(leftEdit.path, rightEdit.path) && leftEdit.path.length > 0) {
        recordConflict(leftEdit.path, "ancestor-descendant");
      } else if (isAncestorPath(rightEdit.path, leftEdit.path) && rightEdit.path.length > 0) {
        recordConflict(rightEdit.path, "ancestor-descendant");
      }
    }
  }

  const blocked = (edit: SemanticEdit): boolean =>
    [...conflicted].some((path) => isAncestorPath(path, edit.path));

  const applicableLeft = leftPatch.edits.filter((edit) => !blocked(edit));
  const seen = new Set(applicableLeft.map(editKey));
  const applicableRight = rightPatch.edits.filter((edit) => !blocked(edit) && !seen.has(editKey(edit)));

  const canonical = { canonicalCommutativeOrder: true };
  let merged = applySemanticPatch(base, patchOf(applicableLeft, leftPatch), provider, canonical);

  // Right-hand edits re-resolve against the left-merged tree. Structural paths
  // are stable across unrelated edits, so this is a re-resolution rather than
  // a rebase. A path that no longer resolves is reported, never guessed at.
  for (const edit of applicableRight) {
    try {
      merged = applySemanticPatch(merged, patchOf([edit], rightPatch), provider, canonical);
    } catch (error) {
      // A provider that cannot reparse the intermediate text is a failed edit,
      // not a reason to discard every conflict already collected.
      if (!(error instanceof SemanticPatchError) && !(error instanceof SyntaxError)) throw error;
      recordConflict(edit.path, "unapplicable");
    }
  }

  return {
    merged,
    conflicts,
    level: "syntax",
    providerId: provider.id,
    clean: conflicts.length === 0,
  };
}
