// SAFETY: The module validates or constructs this value before applying the asserted contract.
// SAFETY: The module validates or constructs this value before applying the asserted contract.
export type RevsetFunction = "heads" | "roots" | "ancestors" | "descendants" | "change" | "graph" |
  "conflicts" | "pending" | "approved" | "mergeable" | "author";
export type RevsetExpression =
  | { readonly type: "call"; readonly name: RevsetFunction; readonly argument?: RevsetExpression | string }
  | { readonly type: "binary"; readonly operator: "union" | "intersection" | "difference"; readonly left: RevsetExpression; readonly right: RevsetExpression };

function __epochIsString<T>(value: T): value is T & string {
  return typeof value === "string";
}

export class RevsetParseError extends Error {
  readonly name = "RevsetParseError";
  readonly code = "invalid-revset";
  constructor(message: string, readonly offset: number) { super(`${message} at offset ${offset}`); }
}

interface Token { readonly type: "word" | "(" | ")" | "|" | "&" | "-" | "eof"; readonly value: string; readonly offset: number }
const functions = new Set<RevsetFunction>(["heads", "roots", "ancestors", "descendants", "change", "graph", "conflicts", "pending", "approved", "mergeable", "author"]);

function tokenize(input: string): readonly Token[] {
  if (input.length > 4096) throw new RevsetParseError("revset exceeds 4096 characters", 4096);
  const tokens: Token[] = [];
  for (let index = 0; index < input.length;) {
    const character = input[index]!;
    if (/\s/u.test(character)) { index += 1; continue; }
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    if (["(", ")", "|", "&", "-"].includes(character)) { tokens.push({ type: /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ character as Token["type"], value: character, offset: index++ }); continue; }
    const start = index;
    while (index < input.length && !/[\s()|&]/u.test(input[index]!)) index += 1;
    tokens.push({ type: "word", value: input.slice(start, index), offset: start });
  }
  tokens.push({ type: "eof", value: "", offset: input.length });
  return tokens;
}

export function parseRevset(input: string): RevsetExpression {
  const tokens = tokenize(input); let cursor = 0;
  const current = () => tokens[cursor]!;
  const take = (type: Token["type"]) => { const token = current(); if (token.type !== type) throw new RevsetParseError(`expected ${type}`, token.offset); cursor += 1; return token; };
  function primary(): RevsetExpression {
    if (current().type === "(") { take("("); const expression = union(); take(")"); return expression; }
    const nameToken = take("word");
    // SAFETY: Runtime checks or construction above establish RevsetFunction)) throw new RevsetParseError(`unknown revset function ${nameToken.value}`.
    if (!functions.has(nameToken.value as RevsetFunction)) throw new RevsetParseError(`unknown revset function ${nameToken.value}`, nameToken.offset);
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    const name = nameToken.value as RevsetFunction; take("(");
    if (current().type === ")") { take(")"); return { type: "call", name }; }
    const nested = current().type === "word" && tokens[cursor + 1]?.type !== "(" ? take("word").value : union();
    take(")"); return { type: "call", name, argument: nested };
  }
  function intersection(): RevsetExpression {
    let left = primary();
    while (current().type === "&" || current().type === "-") {
      const operator = take(current().type).type === "&" ? "intersection" : "difference";
      left = { type: "binary", operator, left, right: primary() };
    }
    return left;
  }
  function union(): RevsetExpression {
    let left = intersection();
    while (current().type === "|") { take("|"); left = { type: "binary", operator: "union", left, right: intersection() }; }
    return left;
  }
  if (!input.trim()) throw new RevsetParseError("revset is empty", 0);
  const expression = union();
  if (current().type !== "eof") throw new RevsetParseError("unexpected token", current().offset);
  return expression;
}

export interface RevsetNode {
  readonly revisionId: string;
  readonly parentRevisionIds: readonly string[];
  readonly changeId?: string;
  readonly changeGraphIds?: readonly string[];
  readonly authorId?: string;
  readonly conflict?: boolean;
  readonly reviewState?: "pending" | "approved" | "rejected";
  readonly mergeable?: boolean;
}

export function evaluateRevset(expression: RevsetExpression | string, nodes: readonly RevsetNode[]): readonly string[] {
  const ast = __epochIsString(expression) ? parseRevset(expression) : expression;
  const byId = new Map(nodes.map((node) => [node.revisionId, node]));
  const children = new Map<string, string[]>();
  for (const node of nodes) for (const parent of node.parentRevisionIds) children.set(parent, [...(children.get(parent) ?? []), node.revisionId]);
  const all = new Set(byId.keys());
  const result = visit(ast);
  return [...result].sort();

  function visit(value: RevsetExpression): Set<string> {
    if (value.type === "binary") {
      const left = visit(value.left); const right = visit(value.right);
      if (value.operator === "union") return new Set([...left, ...right]);
      if (value.operator === "intersection") return new Set([...left].filter((id) => right.has(id)));
      return new Set([...left].filter((id) => !right.has(id)));
    }
    const literal = __epochIsString(value.argument) ? value.argument : undefined;
    if (value.name === "heads") {
      const parents = new Set(nodes.flatMap((node) => [...node.parentRevisionIds])); return new Set([...all].filter((id) => !parents.has(id)));
    }
    if (value.name === "roots") return new Set(nodes.filter((node) => node.parentRevisionIds.length === 0).map((node) => node.revisionId));
    if (value.name === "change") return new Set(nodes.filter((node) => node.changeId === literal).map((node) => node.revisionId));
    if (value.name === "graph") return new Set(nodes.filter((node) => node.changeGraphIds?.includes(literal ?? "")).map((node) => node.revisionId));
    if (value.name === "author") return new Set(nodes.filter((node) => node.authorId === literal).map((node) => node.revisionId));
    if (value.name === "conflicts") return new Set(nodes.filter((node) => node.conflict).map((node) => node.revisionId));
    if (value.name === "pending" || value.name === "approved") return new Set(nodes.filter((node) => node.reviewState === value.name).map((node) => node.revisionId));
    if (value.name === "mergeable") return new Set(nodes.filter((node) => node.mergeable === true).map((node) => node.revisionId));
    const seed = __epochIsString(value.argument) ? new Set([value.argument]) : value.argument ? visit(value.argument) : new Set<string>();
    const output = new Set(seed); const queue = [...seed];
    while (queue.length) {
      const id = queue.shift()!;
      const next = value.name === "ancestors" ? byId.get(id)?.parentRevisionIds ?? [] : children.get(id) ?? [];
      for (const related of next) if (!output.has(related)) { output.add(related); queue.push(related); }
    }
    return output;
  }
}
