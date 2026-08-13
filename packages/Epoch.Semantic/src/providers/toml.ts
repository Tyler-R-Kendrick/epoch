import { node, type SyntaxNode, type SyntaxProvider, type SyntaxTree } from "../syntax";

/**
 * TOML syntax provider covering the subset Epoch's own repository config uses.
 *
 * Both containers are commutative: tables may be reordered within a document
 * and entries within a table. This is the case structural merge exists for — a
 * dependency table gaining two different keys from two contributors is the
 * single most common false conflict in line-based merge.
 */
const SECTION_PATTERN = /^\[([A-Za-z0-9_.-]+)\]\s*$/u;
const ENTRY_PATTERN = /^([A-Za-z0-9_.-]+)\s*=/u;

interface LineSpan {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

function splitLineSpans(source: string): readonly LineSpan[] {
  const spans: LineSpan[] = [];
  let start = 0;
  for (let index = 0; index <= source.length; index += 1) {
    if (index === source.length || source[index] === "\n") {
      if (index > start || index < source.length) spans.push({ text: source.slice(start, index), start, end: index });
      start = index + 1;
    }
  }
  return spans;
}

function contentOf(line: string): string {
  return line.split("#")[0].trim();
}

export const tomlSyntaxProvider: SyntaxProvider = {
  id: "epoch.syntax.toml",
  language: "toml",
  extensions: [".toml"],
  mimeTypes: ["application/toml"],
  fidelity: "heuristic",
  parse(source: string): SyntaxTree {
    const lines = splitLineSpans(source);
    const tables: SyntaxNode[] = [];
    let currentName: string | undefined;
    let currentStart = 0;
    let currentEnd = 0;
    let entries: SyntaxNode[] = [];

    const flush = (): void => {
      if (currentName === undefined && entries.length === 0) return;
      tables.push(node("table", source, currentStart, currentEnd, {
        name: currentName ?? "",
        children: entries,
        commutative: true,
        separator: "\n",
      }));
      entries = [];
    };

    for (const line of lines) {
      const content = contentOf(line.text);
      if (content.length === 0) {
        currentEnd = Math.max(currentEnd, line.end);
        continue;
      }
      const section = SECTION_PATTERN.exec(content);
      if (section !== null) {
        flush();
        currentName = section[1];
        currentStart = line.start;
        currentEnd = line.end;
        continue;
      }
      const entry = ENTRY_PATTERN.exec(content);
      if (entry !== null) {
        entries.push(node("entry", source, line.start, line.end, { name: entry[1] }));
      }
      currentEnd = Math.max(currentEnd, line.end);
    }
    flush();

    return {
      providerId: "epoch.syntax.toml",
      language: "toml",
      source,
      root: node("document", source, 0, source.length, { children: tables, commutative: true, separator: "\n\n" }),
    };
  },
};
