import { diffLines } from "./crdt";

const NEWLINE = "\n";
const NO_NEWLINE_MARKER = "\\ No newline at end of file";
const DevNull = "/dev/null";
const Utf8: BufferEncoding = "utf8";

/**
 * Heuristically decides whether a blob is textual. Mirrors Git's rule: a NUL byte or invalid
 * UTF-8 marks the content as binary, in which case we emit a "Binary files … differ" marker
 * instead of a line diff. The recorded `entity_type` is only a hint and is intentionally ignored
 * here so that mislabelled blobs still round-trip safely.
 */
export function isTextBlob(data: Buffer): boolean {
  if (data.length === 0) return true;
  if (data.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data);
    return true;
  } catch {
    return false;
  }
}

export interface UnifiedDiffInput {
  readonly path: string;
  readonly from?: Buffer;
  readonly to?: Buffer;
  readonly fromBlob?: string;
  readonly toBlob?: string;
  readonly contextLines?: number;
}

interface SplitText {
  readonly lines: string[];
  readonly trailingNewline: boolean;
}

interface DiffSegment {
  readonly oldStart: number;
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
}

function splitLines(text: string): SplitText {
  if (text === "") return { lines: [], trailingNewline: true };
  const trailingNewline = text.endsWith(NEWLINE);
  const body = trailingNewline ? text.slice(0, -NEWLINE.length) : text;
  return { lines: body.split(NEWLINE), trailingNewline };
}

function joinLines(lines: readonly string[], trailingNewline: boolean): string {
  if (lines.length === 0) return "";
  return lines.join(NEWLINE) + (trailingNewline ? NEWLINE : "");
}

/** Folds the LCS hunks into positioned change segments carrying both old and new line offsets. */
function toSegments(fromLines: readonly string[], toLines: readonly string[]): DiffSegment[] {
  const hunks = diffLines([...fromLines], [...toLines]);
  const segments: DiffSegment[] = [];
  let oldPos = 0;
  let newPos = 0;
  for (const hunk of hunks) {
    newPos += hunk.start - oldPos;
    segments.push({ oldStart: hunk.start, oldCount: hunk.end - hunk.start, newStart: newPos, newCount: hunk.lines.length });
    oldPos = hunk.end;
    newPos += hunk.lines.length;
  }
  return segments;
}

/** Coalesces segments whose gap is within twice the context window into a single unified hunk. */
function groupSegments(segments: readonly DiffSegment[], context: number): DiffSegment[][] {
  const groups: DiffSegment[][] = [];
  let current: DiffSegment[] = [];
  for (const segment of segments) {
    const last = current[current.length - 1];
    if (last === undefined || segment.oldStart - (last.oldStart + last.oldCount) <= context * 2) {
      current.push(segment);
    } else {
      groups.push(current);
      current = [segment];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function formatRange(start: number, count: number): string {
  const displayStart = count === 0 ? start : start + 1;
  return `${displayStart},${count}`;
}

function pushLine(body: string[], prefix: string, side: SplitText, index: number): void {
  body.push(`${prefix}${side.lines[index]}`);
  if (index === side.lines.length - 1 && !side.trailingNewline) body.push(NO_NEWLINE_MARKER);
}

function renderHunk(group: readonly DiffSegment[], from: SplitText, to: SplitText, context: number): string {
  const first = group[0];
  const last = group[group.length - 1];
  const oldStart = Math.max(0, first.oldStart - context);
  const oldEnd = Math.min(from.lines.length, last.oldStart + last.oldCount + context);
  const newStart = Math.max(0, first.newStart - context);
  const newEnd = Math.min(to.lines.length, last.newStart + last.newCount + context);

  const body: string[] = [];
  let oldPos = oldStart;
  let newPos = newStart;
  for (const segment of group) {
    while (oldPos < segment.oldStart) {
      pushLine(body, " ", from, oldPos);
      oldPos += 1;
      newPos += 1;
    }
    for (let removed = 0; removed < segment.oldCount; removed += 1) {
      pushLine(body, "-", from, oldPos);
      oldPos += 1;
    }
    for (let added = 0; added < segment.newCount; added += 1) {
      pushLine(body, "+", to, newPos);
      newPos += 1;
    }
  }
  while (oldPos < oldEnd) {
    pushLine(body, " ", from, oldPos);
    oldPos += 1;
    newPos += 1;
  }

  const header = `@@ -${formatRange(oldStart, oldEnd - oldStart)} +${formatRange(newStart, newEnd - newStart)} @@`;
  return `${header}${NEWLINE}${body.join(NEWLINE)}${NEWLINE}`;
}

function sideLabel(prefix: string, path: string, data: Buffer | undefined): string {
  return data === undefined ? DevNull : `${prefix}/${path}`;
}

function shortBlob(blob: string | undefined): string {
  return blob === undefined ? "0".repeat(40) : blob.slice(0, 40);
}

function diffHeader(input: UnifiedDiffInput): string {
  return [
    `diff --epoch a/${input.path} b/${input.path}`,
    `index ${shortBlob(input.fromBlob)}..${shortBlob(input.toBlob)}`,
    `--- ${sideLabel("a", input.path, input.from)}`,
    `+++ ${sideLabel("b", input.path, input.to)}`,
    "",
  ].join(NEWLINE);
}

/**
 * Renders a Git-style unified diff for a single file version transition. Text blobs produce
 * `@@` hunks with `contextLines` (default 3) of surrounding context; binary blobs produce a
 * `Binary files … differ` marker. `from`/`to` undefined represent an added/removed file.
 */
export function formatUnifiedDiff(input: UnifiedDiffInput): string {
  const context = input.contextLines ?? 3;
  const header = diffHeader(input);
  const fromBinary = input.from !== undefined && !isTextBlob(input.from);
  const toBinary = input.to !== undefined && !isTextBlob(input.to);
  if (fromBinary || toBinary) {
    return `${header}Binary files ${sideLabel("a", input.path, input.from)} and ${sideLabel("b", input.path, input.to)} differ${NEWLINE}`;
  }

  const from = splitLines(input.from === undefined ? "" : input.from.toString(Utf8));
  const to = splitLines(input.to === undefined ? "" : input.to.toString(Utf8));
  const segments = toSegments(from.lines, to.lines);
  if (segments.length === 0) return "";
  const hunks = groupSegments(segments, context).map((group) => renderHunk(group, from, to, context)).join("");
  return `${header}${hunks}`;
}

/**
 * Applies a single-file unified diff produced by {@link formatUnifiedDiff} to reconstruct the
 * target text. Kept off the checkout/hydrate correctness path (which reads blobs directly); used
 * for round-trip tests and as the seam for a future object-store delta encoder.
 */
export function applyUnifiedDiff(fromText: string, patch: string): string {
  const from = splitLines(fromText);
  const patchLines = patch.split(NEWLINE);
  const result: string[] = [];
  let cursor = 0;
  let trailingNewline = from.trailingNewline;
  let index = 0;
  const isHunkHeader = (line: string): boolean => line.startsWith("@@ ");

  while (index < patchLines.length) {
    if (!isHunkHeader(patchLines[index])) {
      index += 1;
      continue;
    }
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(patchLines[index]);
    index += 1;
    if (match === null) continue;
    const oldStart = Number(match[1]);
    const hunkOldStart = oldStart === 0 ? 0 : oldStart - 1;
    while (cursor < hunkOldStart) {
      result.push(from.lines[cursor]);
      cursor += 1;
    }
    while (index < patchLines.length && !isHunkHeader(patchLines[index])) {
      const body = patchLines[index];
      index += 1;
      if (body === NO_NEWLINE_MARKER) {
        trailingNewline = false;
        continue;
      }
      const prefix = body.charAt(0);
      if (prefix === " ") {
        result.push(from.lines[cursor]);
        cursor += 1;
        trailingNewline = from.trailingNewline;
      } else if (prefix === "-") {
        cursor += 1;
      } else if (prefix === "+") {
        result.push(body.slice(1));
        trailingNewline = true;
      }
    }
  }

  const hadTail = cursor < from.lines.length;
  while (cursor < from.lines.length) {
    result.push(from.lines[cursor]);
    cursor += 1;
  }
  if (hadTail) trailingNewline = from.trailingNewline;
  return joinLines(result, trailingNewline);
}
