import { node, type SyntaxNode, type SyntaxProvider, type SyntaxTree } from "../syntax";

/**
 * Markdown syntax provider building the heading tree.
 *
 * Sections are named by heading text, so moving a section within a document is
 * a `move` rather than a large delete plus insert, and two contributors editing
 * different sections never interact.
 */
const HEADING_PATTERN = /^(#{1,6})\s+(.*?)\s*$/u;

interface Heading {
  readonly level: number;
  readonly title: string;
  readonly start: number;
}

function collectHeadings(source: string): readonly Heading[] {
  const headings: Heading[] = [];
  let offset = 0;
  let fenced = false;
  for (const line of source.split("\n")) {
    if (line.trim().startsWith("```")) fenced = !fenced;
    const match = fenced ? null : HEADING_PATTERN.exec(line);
    if (match !== null) headings.push({ level: match[1].length, title: match[2], start: offset });
    offset += line.length + 1;
  }
  return headings;
}

export const markdownSyntaxProvider: SyntaxProvider = {
  id: "epoch.syntax.markdown",
  language: "markdown",
  extensions: [".md", ".markdown"],
  mimeTypes: ["text/markdown"],
  fidelity: "heuristic",
  parse(source: string): SyntaxTree {
    const headings = collectHeadings(source);

    /**
     * Build the sections in `headings[from, until)`, nesting any heading
     * deeper than the one that opened it. Each section spans from its own
     * heading to the next heading at the same or shallower level.
     */
    const build = (from: number, until: number): SyntaxNode[] => {
      const nodes: SyntaxNode[] = [];
      let cursor = from;
      while (cursor < until) {
        const heading = headings[cursor];
        let next = cursor + 1;
        while (next < until && headings[next].level > heading.level) next += 1;
        const end = next < headings.length ? headings[next].start : source.length;
        nodes.push(node("section", source, heading.start, end, {
          name: `h${heading.level} ${heading.title}`,
          children: build(cursor + 1, next),
        }));
        cursor = next;
      }
      return nodes;
    };

    return {
      providerId: "epoch.syntax.markdown",
      language: "markdown",
      source,
      root: node("document", source, 0, source.length, { children: build(0, headings.length), separator: "\n\n" }),
    };
  },
};
