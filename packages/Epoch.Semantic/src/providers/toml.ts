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

/** Strip a trailing comment, ignoring `#` inside quoted values. */
function contentOf(line: string): string {
  let quote: string | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote !== undefined) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "\"" || character === "'") quote = character;
    else if (character === "#") return line.slice(0, index).trim();
  }
  return line.trim();
}

/** Net unclosed `[` and `{` in a line, ignoring bracket characters in strings. */
function openDepth(content: string): number {
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quote !== undefined) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "\"" || character === "'") quote = character;
    else if (character === "[" || character === "{") depth += 1;
    else if (character === "]" || character === "}") depth -= 1;
  }
  return depth;
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

    for (let position = 0; position < lines.length; position += 1) {
      const line = lines[position];
      const content = contentOf(line.text);
      if (content.length === 0) {
        currentEnd = Math.max(currentEnd, line.end);
        continue;
      }
      if (content.startsWith("[[")) {
        // Arrays of tables are not modelled. Ignoring the header would attach
        // their entries to the preceding table and corrupt later patches, so
        // the provider refuses the document instead.
        throw new SyntaxError("epoch.syntax.toml does not support [[array.of.tables]] headers");
      }
      const section = SECTION_PATTERN.exec(content);
      if (section !== null) {
        flush();
        currentName = section[1];
        currentStart = line.start;
        currentEnd = line.end;
        continue;
      }
      if (content.includes("\"\"\"") || content.includes("'''")) {
        // Multi-line basic and literal strings are not modelled. `openDepth`
        // tracks brackets, not string state, so a `"""` block containing a `#`
        // or a `[` would split one entry into several nodes and corrupt every
        // later patch. The provider refuses the document instead.
        throw new SyntaxError("epoch.syntax.toml does not support multi-line strings");
      }
      const entry = ENTRY_PATTERN.exec(content);
      if (entry !== null) {
        // Extend the entry across continuation lines. A node covering only the
        // first line of a multi-line array would leave its remaining lines
        // behind on update and delete, producing invalid TOML.
        let depth = openDepth(content);
        let end = line.end;
        while (depth > 0 && position + 1 < lines.length) {
          position += 1;
          const continuation = lines[position];
          depth += openDepth(contentOf(continuation.text));
          end = continuation.end;
        }
        if (depth > 0) throw new SyntaxError("unterminated TOML value");
        entries.push(node("entry", source, line.start, end, { name: entry[1] }));
        currentEnd = Math.max(currentEnd, end);
        continue;
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
