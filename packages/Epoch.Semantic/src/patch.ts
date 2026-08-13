import type { SemanticEdit, SemanticPatch } from "./diff";
import { indexTree, type IndexedNode, type SyntaxIndex, type SyntaxProvider } from "./syntax";

export type SemanticPatchErrorCode = "missing-path" | "overlapping-edits" | "unsupported-edit";

export class SemanticPatchError extends Error {
  constructor(readonly code: SemanticPatchErrorCode, readonly path: string, message: string) {
    super(message);
    this.name = "SemanticPatchError";
  }
}

interface Splice {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface ApplySemanticPatchOptions {
  /**
   * Place insertions into commutative containers in canonical path order
   * instead of at the recorded anchor.
   *
   * Merge sets this so that merging (left, right) and (right, left) produce
   * byte-identical output. ADR-0031 only permits claiming commutation when
   * both orders yield the identical canonical result, and this is what makes
   * that true. Plain patch application leaves it off so author-chosen
   * placement round-trips exactly.
   */
  readonly canonicalCommutativeOrder?: boolean;
}

/**
 * Infer the separator a container uses between its children.
 *
 * An observed gap always wins so real formatting is preserved. The provider's
 * declared separator covers containers with fewer than two children, where
 * there is no gap to observe — without it, inserting a second member into a
 * one-member JSON object would omit the comma.
 */
function separatorFor(index: SyntaxIndex, parentPath: string): string {
  const children = index.childrenOf(parentPath);
  for (let position = 0; position + 1 < children.length; position += 1) {
    const gap = index.tree.source.slice(children[position].node.end, children[position + 1].node.start);
    if (gap.length > 0) return gap;
  }

  const parent = parentPath.length === 0 ? index.tree.root : index.byPath.get(parentPath)?.node;
  const declared = parent?.separator ?? "\n";
  if (parent === undefined || children.length === 0) return declared;

  // A separator that is only whitespace already *is* the layout the provider
  // asked for, so substituting observed spacing would shrink it — a declared
  // "\n\n" between TOML tables would collapse to "\n" and join them.
  const punctuation = declared.replace(/\s/gu, "");
  if (punctuation.length === 0) return declared;

  // With a single child there is no gap to observe, but the whitespace before
  // that child shows how the container lays its members out. Combining the
  // declared punctuation with that spacing keeps an inserted member aligned
  // with the one already there, on one line or many.
  const prefix = index.tree.source.slice(parent.start, children[0].node.start);
  const trivia = /\s*$/u.exec(prefix)?.[0] ?? "";
  return `${punctuation}${trivia}`;
}

/** Last path step, honouring escaped separators. */
function lastStep(path: string): string {
  let index = path.length - 1;
  while (index >= 0) {
    if (path[index] === "/" && (index === 0 || path[index - 1] !== "\\")) return path.slice(index + 1);
    index -= 1;
  }
  return path;
}

function requireNode(index: SyntaxIndex, path: string): IndexedNode {
  const found = index.byPath.get(path);
  if (found === undefined) {
    throw new SemanticPatchError("missing-path", path, `structural path not present in target: ${path}`);
  }
  return found;
}

/** Removal span for a node, absorbing one adjacent separator when present. */
function removalSpan(index: SyntaxIndex, target: IndexedNode): Splice {
  const siblings = index.childrenOf(target.parentPath);
  const position = siblings.findIndex((sibling) => sibling.path === target.path);
  const next = siblings[position + 1];
  if (next !== undefined) return { start: target.node.start, end: next.node.start, text: "" };
  const previous = siblings[position - 1];
  if (previous !== undefined) return { start: previous.node.end, end: target.node.end, text: "" };
  return { start: target.node.start, end: target.node.end, text: "" };
}

/** Insertion point inside a container, after `anchorPath` when it resolves. */
function insertionSplice(index: SyntaxIndex, edit: SemanticEdit, canonical: boolean): Splice {
  const parentPath = edit.parentPath ?? "";
  const separator = separatorFor(index, parentPath);
  const text = edit.text ?? "";
  const children = index.childrenOf(parentPath);

  const parentNode = parentPath.length === 0 ? index.tree.root : index.byPath.get(parentPath)?.node;
  if (canonical && parentNode?.commutative === true && children.length > 0) {
    const step = lastStep(edit.path);
    const preceding = children.filter((child) => lastStep(child.path).localeCompare(step) < 0);
    if (preceding.length === 0) {
      const first = children[0].node;
      return { start: first.start, end: first.start, text: `${text}${separator}` };
    }
    const previous = preceding[preceding.length - 1].node;
    return { start: previous.end, end: previous.end, text: `${separator}${text}` };
  }

  const anchor = edit.anchorPath === undefined ? undefined : index.byPath.get(edit.anchorPath);
  if (anchor !== undefined) {
    return { start: anchor.node.end, end: anchor.node.end, text: `${separator}${text}` };
  }

  if (children.length > 0) {
    const first = children[0].node;
    return { start: first.start, end: first.start, text: `${text}${separator}` };
  }

  if (parentPath.length === 0) {
    const source = index.tree.source;
    return { start: source.length, end: source.length, text: source.endsWith("\n") ? text : `\n${text}` };
  }

  const parent = requireNode(index, parentPath).node;
  const closing = parent.text.trimEnd().slice(-1);
  const insertAt = "}])".includes(closing) ? parent.end - (parent.text.length - parent.text.trimEnd().length) - 1 : parent.end;
  return { start: insertAt, end: insertAt, text };
}

function reorderSplice(index: SyntaxIndex, edit: SemanticEdit): Splice | undefined {
  const order = edit.order ?? [];
  if (order.length === 0) return undefined;
  const parentPath = edit.parentPath ?? edit.path;
  const children = index.childrenOf(parentPath);
  // The splice rewrites the container's whole child region, so an order that
  // is not a permutation of the children would silently delete the ones it
  // omits or duplicate the ones it repeats. Validate before any early return,
  // or a reorder naming children the target does not have would be dropped
  // instead of rejected.
  const expected = new Set(children.map((child) => child.path));
  const listed = new Set(order);
  if (order.length !== children.length || listed.size !== order.length
    || [...listed].some((path) => !expected.has(path))) {
    throw new SemanticPatchError(
      "unsupported-edit",
      edit.path,
      `reorder of ${parentPath} must list each of its ${children.length} children exactly once`,
    );
  }
  const separator = separatorFor(index, parentPath);
  const texts = order.map((path) => requireNode(index, path).node.text);
  return {
    start: children[0].node.start,
    end: children[children.length - 1].node.end,
    text: texts.join(separator),
  };
}

function splicesFor(index: SyntaxIndex, edit: SemanticEdit, canonical: boolean): readonly Splice[] {
  switch (edit.kind) {
    case "delete":
      return [removalSpan(index, requireNode(index, edit.path))];
    case "update": {
      const target = requireNode(index, edit.path);
      return [{ start: target.node.start, end: target.node.end, text: edit.text ?? "" }];
    }
    case "rename": {
      if (edit.text === undefined) return [];
      const target = requireNode(index, edit.path);
      return [{ start: target.node.start, end: target.node.end, text: edit.text }];
    }
    case "insert":
      return [insertionSplice(index, edit, canonical)];
    case "move":
      return [removalSpan(index, requireNode(index, edit.path)), insertionSplice(index, edit, canonical)];
    case "reorder": {
      const splice = reorderSplice(index, edit);
      return splice === undefined ? [] : [splice];
    }
    default:
      throw new SemanticPatchError("unsupported-edit", edit.path, `unsupported semantic edit kind: ${String(edit.kind)}`);
  }
}

/**
 * Apply a structural patch to `source`.
 *
 * Edits resolve against a fresh parse of the target, so a patch produced
 * against differently formatted text still applies as long as the structural
 * paths it names are present.
 */
export function applySemanticPatch(
  source: string,
  patch: SemanticPatch,
  provider: SyntaxProvider,
  options: ApplySemanticPatchOptions = {},
): string {
  const index = indexTree(provider.parse(source));
  const canonical = options.canonicalCommutativeOrder === true;
  const splices = patch.edits.flatMap((edit) => splicesFor(index, edit, canonical));

  const ordered = [...splices].sort((left, right) => right.start - left.start || right.end - left.end);
  for (let position = 0; position + 1 < ordered.length; position += 1) {
    const later = ordered[position];
    const earlier = ordered[position + 1];
    if (earlier.end > later.start) {
      throw new SemanticPatchError("overlapping-edits", patch.path ?? "", `semantic edits overlap at offset ${later.start}`);
    }
  }

  let result = source;
  for (const splice of ordered) {
    result = result.slice(0, splice.start) + splice.text + result.slice(splice.end);
  }
  return result;
}

/** Render a patch as a stable, reviewable summary. */
export function formatSemanticPatch(patch: SemanticPatch): string {
  const header = [
    `diff --epoch-semantic ${patch.path ?? "<content>"}`,
    `level ${patch.level} provider ${patch.providerId} language ${patch.language}`,
    `base ${patch.baseDigest} result ${patch.resultDigest}`,
  ];
  const body = patch.edits.map((edit) => {
    const destination = edit.toPath !== undefined && edit.toPath !== edit.path ? ` -> ${edit.toPath}` : "";
    const order = edit.order === undefined ? "" : ` [${edit.order.join(", ")}]`;
    return `${edit.kind} ${edit.path}${destination}${order}`;
  });
  return [...header, ...body].join("\n");
}
