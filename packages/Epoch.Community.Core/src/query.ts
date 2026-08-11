import type { CommunityMessage } from "./graph";

export const QUERY_LANGUAGE_VERSION = 1;
export const COMMUNITY_QUERY_FIELDS = [
  "who", "author", "handle", "state", "channel", "dm", "project", "space", "subject", "body",
  "text", "q", "id", "re", "parent", "kind", "has", "react", "reaction", "score", "sort",
] as const;

export type CommunityQueryField = typeof COMMUNITY_QUERY_FIELDS[number];
export type CommunityQuerySort = "hot" | "new" | "top" | "best";

export type CommunityQueryNode =
  | { readonly op: "term"; readonly value: string; readonly phrase: boolean }
  | { readonly op: "field"; readonly field: CommunityQueryField; readonly value: string; readonly phrase: boolean }
  | { readonly op: "field_group"; readonly field: CommunityQueryField; readonly node: CommunityQueryNode }
  | { readonly op: "not"; readonly node: CommunityQueryNode }
  | { readonly op: "and" | "or"; readonly left: CommunityQueryNode; readonly right: CommunityQueryNode };

export interface NormalizedCommunityQuery {
  readonly ast: CommunityQueryNode | null;
  readonly canonical: string;
  readonly sort: CommunityQuerySort | null;
  readonly version: number;
  readonly error?: string;
}

export interface LegacySavedQuery {
  readonly query?: string;
  readonly canonical?: string;
  readonly queryLanguageVersion?: number;
  readonly version?: number;
  readonly sort?: string | null;
  readonly ast?: CommunityQueryNode | null;
  readonly error?: string;
}

type TokenType = "LPAREN" | "RPAREN" | "COLON" | "NOT" | "AND" | "OR" | "WORD" | "PHRASE" | "EOF";
interface Token { readonly type: TokenType; readonly value: string }

export function normalizeQuery(input: string, options: { readonly version?: number } = {}): NormalizedCommunityQuery {
  if (options.version !== undefined && options.version > QUERY_LANGUAGE_VERSION) {
    return invalid(`Query language version ${options.version} is newer than supported version ${QUERY_LANGUAGE_VERSION}`);
  }
  const tokens = tokenize(input);
  let position = 0;
  const peek = (): Token => tokens[position] ?? { type: "EOF", value: "" };
  const take = (type: TokenType): Token | undefined => {
    if (peek().type !== type) return undefined;
    const token = peek();
    position += 1;
    return token;
  };
  const expect = (type: TokenType): Token => {
    const token = take(type);
    if (token === undefined) throw new Error(`expected ${type} near ${peek().value || "end"}`);
    return token;
  };
  const parsePrimary = (): CommunityQueryNode => {
    if (take("LPAREN") !== undefined) {
      const node = parseOr();
      expect("RPAREN");
      return node;
    }
    const word = take("WORD");
    if (word !== undefined) {
      if (take("COLON") === undefined) return { op: "term", value: word.value, phrase: false };
      const field = validateField(word.value);
      if (take("LPAREN") !== undefined) {
        const node = parseOr();
        expect("RPAREN");
        return { op: "field_group", field, node };
      }
      const phrase = take("PHRASE");
      if (phrase !== undefined) return { op: "field", field, value: phrase.value, phrase: true };
      const value = take("WORD");
      return { op: "field", field, value: value?.value ?? "*", phrase: false };
    }
    const phrase = take("PHRASE");
    if (phrase !== undefined) return { op: "term", value: phrase.value, phrase: true };
    throw new Error(`unexpected token: ${peek().value || peek().type}`);
  };
  const parseNot = (): CommunityQueryNode => take("NOT") === undefined ? parsePrimary() : { op: "not", node: parseNot() };
  const parseAnd = (): CommunityQueryNode => {
    let left = parseNot();
    while (!["OR", "RPAREN", "EOF"].includes(peek().type)) {
      take("AND");
      if (["RPAREN", "EOF"].includes(peek().type)) break;
      left = { op: "and", left, right: parseNot() };
    }
    return left;
  };
  function parseOr(): CommunityQueryNode {
    let left = parseAnd();
    while (take("OR") !== undefined) left = { op: "or", left, right: parseAnd() };
    return left;
  }

  if (peek().type === "EOF") return { ast: null, canonical: "", sort: null, version: QUERY_LANGUAGE_VERSION };
  try {
    const parsed = parseOr();
    if (peek().type !== "EOF") throw new Error(`unexpected trailing input: ${peek().value}`);
    const extracted = extractSort(parsed);
    const canonicalFilter = extracted.ast === null ? "" : serialize(extracted.ast);
    const canonical = [canonicalFilter, extracted.sort === null ? "" : `sort:${extracted.sort}`].filter(Boolean).join(" ");
    return { ast: extracted.ast, canonical, sort: extracted.sort, version: QUERY_LANGUAGE_VERSION };
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error));
  }
}

export function migrateNormalizedQuery(saved: LegacySavedQuery): NormalizedCommunityQuery {
  const version = saved.queryLanguageVersion ?? saved.version ?? 0;
  if (version > QUERY_LANGUAGE_VERSION) return invalid(`Saved query version ${version} is not supported; update Epoch to open this view`);
  const source = saved.canonical ?? saved.query;
  if (source !== undefined) return normalizeQuery(source, { version });
  if (saved.ast !== undefined) {
    const serialized = saved.ast === null ? "" : serialize(saved.ast);
    return normalizeQuery([serialized, saved.sort === null || saved.sort === undefined ? "" : `sort:${saved.sort}`].filter(Boolean).join(" "), { version });
  }
  return invalid("Saved query has no canonical query or normalized AST");
}

export function matchesNormalizedQuery(message: CommunityMessage, query: NormalizedCommunityQuery): boolean {
  if (query.error !== undefined) return false;
  const field = (name: CommunityQueryField, value: string): boolean => {
    const needle = value.toLowerCase();
    const contains = (candidate: string | undefined): boolean => (candidate ?? "").toLowerCase().includes(needle === "*" ? "" : needle);
    switch (name) {
      case "who": case "author": case "handle": return contains(message.authorId);
      case "state": return contains(message.state);
      case "subject": return contains(message.title);
      case "body": return contains(message.body);
      case "text": case "q": return contains(`${message.title ?? ""} ${message.body}`);
      case "id": return contains(message.ref.objectId);
      case "re": case "parent": return contains(message.inReplyTo?.objectId);
      case "channel": case "dm": case "project": case "space": return contains(message.context.objectId);
      case "kind": return message.ref.kind === needle;
      case "has":
        if (needle === "subject") return Boolean(message.title);
        if (["re", "reply", "parent"].includes(needle)) return message.inReplyTo !== undefined;
        return message.relations.some((relation) => relation.type === needle || (needle === "reactions" && relation.type === "reply"));
      case "react": case "reaction": return message.relations.some((relation) => relation.type === "reply" && contains(relation.target.objectId));
      case "score": return false;
      case "sort": return true;
    }
  };
  const evaluate = (node: CommunityQueryNode, inheritedField?: CommunityQueryField): boolean => {
    switch (node.op) {
      case "and": return evaluate(node.left, inheritedField) && evaluate(node.right, inheritedField);
      case "or": return evaluate(node.left, inheritedField) || evaluate(node.right, inheritedField);
      case "not": return !evaluate(node.node, inheritedField);
      case "field_group": return evaluate(node.node, node.field);
      case "field": return field(inheritedField ?? node.field, node.value);
      case "term": return inheritedField === undefined
        ? `${message.title ?? ""} ${message.body} ${message.authorId} ${message.context.objectId}`.toLowerCase().includes(node.value.toLowerCase())
        : field(inheritedField, node.value);
    }
  };
  return query.ast === null || evaluate(query.ast);
}

function tokenize(input: string): readonly Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const push = (type: TokenType, value: string): void => { tokens.push({ type, value }); };
  while (index < input.length) {
    const character = input[index] ?? "";
    if (/\s/u.test(character)) { index += 1; continue; }
    if (character === "(") { push("LPAREN", character); index += 1; continue; }
    if (character === ")") { push("RPAREN", character); index += 1; continue; }
    if (character === ":") { push("COLON", character); index += 1; continue; }
    if (character === "-" && !/\s|\)/u.test(input[index + 1] ?? "")) { push("NOT", character); index += 1; continue; }
    if (character === "\"") {
      index += 1;
      let phrase = "";
      while (index < input.length && input[index] !== "\"") { phrase += input[index]; index += 1; }
      if (input[index] !== "\"") throw new Error("unterminated quoted phrase");
      index += 1;
      push("PHRASE", phrase);
      continue;
    }
    const start = index;
    while (index < input.length && !/[\s():"]/u.test(input[index] ?? "")) index += 1;
    const raw = input.slice(start, index);
    const upper = raw.toUpperCase();
    push(upper === "AND" || upper === "OR" || upper === "NOT" ? upper : "WORD", raw);
  }
  push("EOF", "");
  return tokens;
}

function validateField(value: string): CommunityQueryField {
  const field = value.toLowerCase();
  if ((COMMUNITY_QUERY_FIELDS as readonly string[]).includes(field)) return field as CommunityQueryField;
  const suggestion = [...COMMUNITY_QUERY_FIELDS].sort((left, right) => distance(field, left) - distance(field, right))[0];
  throw new Error(`unknown query field "${field}"; valid fields include ${suggestion}`);
}

function extractSort(node: CommunityQueryNode): { readonly ast: CommunityQueryNode | null; readonly sort: CommunityQuerySort | null } {
  if (node.op === "field" && node.field === "sort") {
    if (!["hot", "new", "top", "best"].includes(node.value.toLowerCase())) throw new Error(`unsupported sort: ${node.value}`);
    return { ast: null, sort: node.value.toLowerCase() as CommunityQuerySort };
  }
  if (node.op === "and" || node.op === "or") {
    const left = extractSort(node.left);
    const right = extractSort(node.right);
    const sort = left.sort ?? right.sort;
    if (left.ast === null) return { ast: right.ast, sort };
    if (right.ast === null) return { ast: left.ast, sort };
    return { ast: { op: node.op, left: left.ast, right: right.ast }, sort };
  }
  if (node.op === "not") {
    const inner = extractSort(node.node);
    return { ast: inner.ast === null ? null : { op: "not", node: inner.ast }, sort: inner.sort };
  }
  if (node.op === "field_group") {
    const inner = extractSort(node.node);
    return { ast: inner.ast === null ? null : { op: "field_group", field: node.field, node: inner.ast }, sort: inner.sort };
  }
  return { ast: node, sort: null };
}

function serialize(node: CommunityQueryNode, parentPrecedence = 0): string {
  const precedence = node.op === "or" ? 1 : node.op === "and" ? 2 : node.op === "not" ? 3 : 4;
  let value: string;
  switch (node.op) {
    case "or": case "and": value = `${serialize(node.left, precedence)} ${node.op.toUpperCase()} ${serialize(node.right, precedence)}`; break;
    case "not": value = `NOT ${serialize(node.node, precedence)}`; break;
    case "field_group": value = `${node.field}:(${serialize(node.node)})`; break;
    case "field": value = `${node.field}:${node.phrase ? JSON.stringify(node.value) : node.value}`; break;
    case "term": value = node.phrase ? JSON.stringify(node.value) : node.value; break;
  }
  return precedence < parentPrecedence ? `(${value})` : value;
}

function invalid(error: string): NormalizedCommunityQuery {
  return { ast: null, canonical: "", sort: null, version: QUERY_LANGUAGE_VERSION, error };
}

function distance(left: string, right: string): number {
  const row = [...Array(right.length + 1).keys()];
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j] ?? 0;
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[right.length] ?? Number.MAX_SAFE_INTEGER;
}
