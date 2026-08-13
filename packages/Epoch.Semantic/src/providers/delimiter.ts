import { node, type SyntaxNode, type SyntaxProvider, type SyntaxTree } from "../syntax";

/**
 * Generic balanced-delimiter provider for brace-delimited languages
 * (TypeScript, JavaScript, C, C++, C#, Java, Rust, Go, Swift).
 *
 * This recovers block structure; it is not a grammar, and ADR-0038 requires it
 * be described that way. It is a better-than-lines default that gives
 * declaration-level granularity for diff, merge, and dedup, and it is expected
 * to be displaced by grammar-backed providers registered as extensions.
 */
const DECLARATION_NAME_PATTERNS: readonly RegExp[] = [
  /(?:class|struct|interface|enum|trait|impl|namespace|module|record)\s+([A-Za-z_$][\w$]*)/u,
  /(?:function|fn|func|def|sub|method)\s+\*?\s*([A-Za-z_$][\w$]*)/u,
  /([A-Za-z_$][\w$]*)\s*(?:<[^<>()]*>)?\s*\([^()]*\)\s*(?::[^{;]*)?$/u,
  /(?:const|let|var|val|static|public|private|protected|export|default)\s+([A-Za-z_$][\w$]*)\s*[:=]/u,
  /([A-Za-z_$][\w$]*)\s*[:=]\s*$/u,
];

const IMPORT_PATTERN = /^\s*(?:import\b|from\s|use\s|#include\b|require\s*\(|using\s)/u;
const IMPORT_TARGET_PATTERN = /["'<]([^"'>]+)["'>]/u;

/** Advance past a string, template, or comment. Returns `index` when at code. */
function skipNonCode(source: string, index: number, limit: number): number {
  const character = source[index];
  const next = source[index + 1];
  if (character === "/" && next === "/") {
    let cursor = index + 2;
    while (cursor < limit && source[cursor] !== "\n") cursor += 1;
    return cursor;
  }
  if (character === "/" && next === "*") {
    let cursor = index + 2;
    while (cursor < limit && !(source[cursor] === "*" && source[cursor + 1] === "/")) cursor += 1;
    return Math.min(cursor + 2, limit);
  }
  if (character === "\"" || character === "'" || character === "`") {
    // Only backticks span lines. A Rust lifetime (`&'a str`) or an unbalanced
    // apostrophe would otherwise consume the rest of the file, hiding every
    // brace after it and erasing all following declarations from the tree.
    const multiline = character === "`";
    let cursor = index + 1;
    while (cursor < limit) {
      if (source[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (source[cursor] === character) return cursor + 1;
      if (!multiline && source[cursor] === "\n") return index;
      cursor += 1;
    }
    return multiline ? limit : index;
  }
  return index;
}

function declarationName(header: string): string | undefined {
  const condensed = header.replace(/\s+/gu, " ").trim();
  for (const pattern of DECLARATION_NAME_PATTERNS) {
    const match = pattern.exec(condensed);
    if (match !== null && match[1] !== undefined) return match[1];
  }
  const identifiers = condensed.match(/[A-Za-z_$][\w$]*/gu);
  return identifiers === null ? undefined : identifiers[identifiers.length - 1];
}

interface BlockSpan {
  readonly start: number;
  readonly open: number;
  readonly close: number;
}

/** Locate the top-level `{ … }` blocks in `[from, to)`, ignoring non-code. */
function findBlocks(source: string, from: number, to: number): readonly BlockSpan[] {
  const blocks: BlockSpan[] = [];
  let index = from;
  let depth = 0;
  let open = -1;
  let start = -1;
  let cursor = from;
  while (index < to) {
    const skipped = skipNonCode(source, index, to);
    if (skipped > index) {
      index = skipped;
      continue;
    }
    const character = source[index];
    if (character === "{") {
      if (depth === 0) {
        open = index;
        start = cursor;
        while (start < open && /\s/u.test(source[start])) start += 1;
      }
      depth += 1;
    } else if (character === "}") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0) {
          blocks.push({ start, open, close: index });
          cursor = index + 1;
        }
      }
    } else if (character === ";" && depth === 0) {
      cursor = index + 1;
    }
    index += 1;
  }
  return blocks;
}

/**
 * Group the leading run of import-like lines into one commutative container.
 *
 * Two contributors adding different imports is the second most common false
 * conflict in line merge; treating the run as a commutative set removes it.
 */
function importContainer(source: string): SyntaxNode | undefined {
  const imports: SyntaxNode[] = [];
  let offset = 0;
  let end = 0;
  for (const line of source.split("\n")) {
    const lineEnd = offset + line.length;
    if (line.trim().length === 0) {
      offset = lineEnd + 1;
      continue;
    }
    if (!IMPORT_PATTERN.test(line)) break;
    const target = IMPORT_TARGET_PATTERN.exec(line);
    imports.push(node("import", source, offset, lineEnd, { name: target?.[1] ?? line.trim() }));
    end = lineEnd;
    offset = lineEnd + 1;
  }
  if (imports.length === 0) return undefined;
  return node("imports", source, imports[0].start, end, { children: imports, commutative: true, separator: "\n" });
}

function buildDeclarations(source: string, from: number, to: number): SyntaxNode[] {
  return findBlocks(source, from, to).map((block) => {
    const header = source.slice(block.start, block.open);
    return node("declaration", source, block.start, block.close + 1, {
      name: declarationName(header),
      children: buildDeclarations(source, block.open + 1, block.close),
    });
  });
}

export const delimiterSyntaxProvider: SyntaxProvider = {
  id: "epoch.syntax.delimiter",
  language: "brace-delimited",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".java", ".rs", ".go", ".swift", ".kt", ".scala"],
  mimeTypes: ["text/x-typescript", "text/javascript", "text/x-c", "text/x-java", "text/x-rust", "text/x-go"],
  fidelity: "heuristic",
  parse(source: string): SyntaxTree {
    const container = importContainer(source);
    const declarationsFrom = container === undefined ? 0 : container.end;
    const children = container === undefined
      ? buildDeclarations(source, 0, source.length)
      : [container, ...buildDeclarations(source, declarationsFrom, source.length)];
    return {
      providerId: "epoch.syntax.delimiter",
      language: "brace-delimited",
      source,
      root: node("document", source, 0, source.length, { children, separator: "\n\n" }),
    };
  },
};
