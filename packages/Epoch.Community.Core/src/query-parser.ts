import type { CommunityAuthorizationContext } from "./authorization";
import {
  createCommunityFieldRegistry,
  type CommunityFieldDefinition,
  type CommunityFieldOperator,
  type CommunityFieldRegistry,
} from "./fields";
import { validateObjectRef } from "./identity";
import {
  canonicalExpressionJson,
  stableQueryHash,
  type CommunityFieldScalar,
  type NormalizedCommunityQuery,
  type QueryDiagnostic,
  type SearchExpression,
  type SearchOrder,
  type SourceSpan,
} from "./search-expression";

export const QUERY_LANGUAGE_VERSION = 2;
export const QUERY_FIELD_REGISTRY_VERSION = 2;
export const MAX_QUERY_BYTES = 16_384;
export const MAX_QUERY_NODES = 256;
export const MAX_QUERY_DEPTH = 16;
const MAX_VALUE_LENGTH = 2_048;
const MIN_PREFIX_LENGTH = 2;

type FieldDescriptor = CommunityFieldDefinition;
type Operator = CommunityFieldOperator;
const DEFAULT_FIELD_REGISTRY = createCommunityFieldRegistry([], QUERY_FIELD_REGISTRY_VERSION);

export interface ParseCommunityQueryOptions {
  readonly version?: number;
  readonly actorId?: string;
  readonly now?: string | Date;
  readonly timezone?: string;
  readonly locale?: string;
  readonly fieldRegistryVersion?: number;
  readonly fieldRegistry?: CommunityFieldRegistry;
  readonly authorization?: CommunityAuthorizationContext;
  readonly maxBytes?: number;
  readonly maxNodes?: number;
  readonly maxDepth?: number;
}

type TokenType = "LPAREN" | "RPAREN" | "LBRACKET" | "RBRACKET" | "LBRACE" | "RBRACE" | "COLON" |
  "EQ" | "NE" | "LT" | "LTE" | "GT" | "GTE" | "NOT" | "AND" | "OR" | "TO" | "WORD" | "PHRASE" | "EOF";
interface Token { readonly type: TokenType; readonly value: string; readonly start: number; readonly end: number }
interface SortMarker { readonly kind: "sort-marker"; readonly order: SearchOrder; readonly canonical: string; readonly span: SourceSpan }
type ParsedNode = SearchExpression | SortMarker;

class QueryFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly span?: SourceSpan,
    readonly suggestions: readonly string[] = [],
  ) {
    super(message);
  }
}

export function parseCommunityQuery(input: string, options: ParseCommunityQueryOptions = {}): NormalizedCommunityQuery {
  const fieldRegistryVersion = options.fieldRegistryVersion ?? options.fieldRegistry?.version ?? QUERY_FIELD_REGISTRY_VERSION;
  let resolvedAt: string;
  try {
    resolvedAt = normalizeNow(options.now);
  } catch (error) {
    const failure = error instanceof QueryFailure ? error : new QueryFailure("QUERY_CONTEXT_INVALID", String(error));
    return invalid(failure, "1970-01-01T00:00:00.000Z", fieldRegistryVersion);
  }
  if (options.version !== undefined && options.version > QUERY_LANGUAGE_VERSION) {
    return invalid(new QueryFailure(
      "QUERY_VERSION_UNSUPPORTED",
      `Query language version ${options.version} is newer than supported version ${QUERY_LANGUAGE_VERSION}`,
    ), resolvedAt, fieldRegistryVersion);
  }
  if (new TextEncoder().encode(input).length > (options.maxBytes ?? MAX_QUERY_BYTES)) {
    return invalid(new QueryFailure("QUERY_TOO_LARGE", `Query exceeds the ${options.maxBytes ?? MAX_QUERY_BYTES} byte limit`), resolvedAt, fieldRegistryVersion);
  }
  try {
    const parser = new Parser(input, options, resolvedAt);
    const parsed = parser.parse();
    const separated = separateSort(parsed);
    const ast = separated.expression === null ? null : normalizeExpression(separated.expression);
    const canonical = [ast === null ? "" : serializeExpression(ast), ...separated.sorts.map((sort) => sort.canonical)]
      .filter(Boolean).join(" ");
    const sort = separated.sorts.map((value) => value.order);
    const canonicalJson = JSON.stringify({ expression: JSON.parse(canonicalExpressionJson(ast)) as unknown, sort });
    return {
      ast,
      canonical,
      canonicalJson,
      queryHash: stableQueryHash(`${fieldRegistryVersion}\n${canonicalJson}`),
      sort,
      version: QUERY_LANGUAGE_VERSION,
      fieldRegistryVersion,
      resolvedAt,
      diagnostics: [],
    };
  } catch (error) {
    const failure = error instanceof QueryFailure
      ? error
      : new QueryFailure("QUERY_SYNTAX", error instanceof Error ? error.message : String(error));
    return invalid(failure, resolvedAt, fieldRegistryVersion);
  }
}

class Parser {
  private readonly tokens: readonly Token[];
  private readonly fieldRegistry: CommunityFieldRegistry;
  private position = 0;
  private nodes = 0;
  private depth = 0;

  constructor(
    private readonly input: string,
    private readonly options: ParseCommunityQueryOptions,
    private readonly resolvedAt: string,
  ) {
    this.tokens = tokenize(input);
    this.fieldRegistry = options.fieldRegistry ?? DEFAULT_FIELD_REGISTRY;
  }

  parse(): ParsedNode | null {
    if (this.peek().type === "EOF") return null;
    const result = this.parseOr();
    if (this.peek().type !== "EOF") this.fail("QUERY_SYNTAX", `Unexpected trailing input: ${this.peek().value || this.peek().type}`, this.peek());
    return result;
  }

  private parseOr(inherited?: FieldDescriptor): ParsedNode {
    let left = this.parseAnd(inherited);
    while (this.take("OR") !== undefined) {
      const right = this.parseAnd(inherited);
      if (left.kind === "sort-marker" || right.kind === "sort-marker") {
        const marker = left.kind === "sort-marker" ? left : right as SortMarker;
        this.fail("QUERY_SORT_CONTEXT", "Sort clauses may only be combined with filters using AND", tokenOf(marker));
      }
      left = this.combine("or", left, right);
    }
    return left;
  }

  private parseAnd(inherited?: FieldDescriptor): ParsedNode {
    const terms: ParsedNode[] = [this.parseNot(inherited)];
    while (!["OR", "RPAREN", "EOF"].includes(this.peek().type)) {
      if (this.take("AND") !== undefined && ["OR", "RPAREN", "EOF"].includes(this.peek().type)) {
        this.fail("QUERY_SYNTAX", "Expected a query clause after AND", this.peek());
      }
      terms.push(this.parseNot(inherited));
    }
    if (terms.length === 1) return terms[0] as ParsedNode;
    const expressions = terms.filter((term): term is SearchExpression => term.kind !== "sort-marker");
    const markers = terms.filter((term): term is SortMarker => term.kind === "sort-marker");
    if (expressions.length === 0) return markers.length === 1 ? markers[0] as SortMarker : this.combineSorts(markers);
    const expression = expressions.length === 1 ? expressions[0] as SearchExpression : this.node({
      kind: "and",
      terms: expressions,
      span: mergeSpans(expressions[0]?.span, expressions.at(-1)?.span),
    });
    if (markers.length === 0) return expression;
    return this.node({ kind: "and", terms: [expression, ...markers as unknown as SearchExpression[]], span: mergeSpans(expression.span, markers.at(-1)?.span) }) as ParsedNode;
  }

  private combineSorts(markers: readonly SortMarker[]): ParsedNode {
    return this.node({ kind: "and", terms: markers as unknown as SearchExpression[], span: mergeSpans(markers[0]?.span, markers.at(-1)?.span) }) as ParsedNode;
  }

  private parseNot(inherited?: FieldDescriptor): ParsedNode {
    const negation = this.take("NOT");
    if (negation === undefined) return this.parsePrimary(inherited);
    const term = this.parseNot(inherited);
    if (term.kind === "sort-marker") this.fail("QUERY_SORT_CONTEXT", "A sort clause cannot be negated", negation);
    return this.node({ kind: "not", term, span: spanBetween(this.input, negation.start, term.span?.end ?? negation.end) });
  }

  private parsePrimary(inherited?: FieldDescriptor): ParsedNode {
    const open = this.take("LPAREN");
    if (open !== undefined) {
      this.depth += 1;
      if (this.depth > (this.options.maxDepth ?? MAX_QUERY_DEPTH)) this.fail("QUERY_DEPTH_LIMIT", "Query nesting is too deep", open);
      const expression = this.parseOr(inherited);
      const close = this.expect("RPAREN");
      this.depth -= 1;
      if (expression.kind === "sort-marker") return { ...expression, span: spanBetween(this.input, open.start, close.end) };
      return { ...expression, span: spanBetween(this.input, open.start, close.end) };
    }
    const phrase = this.take("PHRASE");
    if (phrase !== undefined) return this.text(inherited, phrase.value, "phrase", phrase);
    const word = this.take("WORD");
    if (word === undefined) this.fail("QUERY_SYNTAX", `Unexpected token: ${this.peek().value || this.peek().type}`, this.peek());

    if (this.take("COLON") === undefined) {
      if (inherited !== undefined) return this.fieldValue(inherited, "eq", word.value, false, word);
      return this.text(undefined, word.value, word.value.endsWith("*") ? "prefix" : "term", word);
    }
    if (word.value.toLowerCase() === "sort") return this.sort(word);
    if (word.value.toLowerCase().startsWith("related.")) return this.related(word);
    const field = this.resolveField(word);
    const fieldGroup = this.take("LPAREN");
    if (fieldGroup !== undefined) {
      this.depth += 1;
      if (this.depth > (this.options.maxDepth ?? MAX_QUERY_DEPTH)) this.fail("QUERY_DEPTH_LIMIT", "Query nesting is too deep", fieldGroup);
      const expression = this.parseOr(field);
      const close = this.expect("RPAREN");
      this.depth -= 1;
      if (expression.kind === "sort-marker") this.fail("QUERY_SORT_CONTEXT", "Sort is not valid inside a field group", word);
      return { ...expression, span: spanBetween(this.input, word.start, close.end) };
    }
    const operator = this.readOperator();
    const rangeOpen = this.take("LBRACKET") ?? this.take("LBRACE");
    if (rangeOpen !== undefined) return this.range(field, rangeOpen, word.start);
    const phraseValue = this.take("PHRASE");
    if (phraseValue !== undefined) return this.fieldValue(field, operator, phraseValue.value, true, spanToken(word.start, phraseValue.end));
    const valueToken = this.readValueToken();
    if (valueToken.value === "*" && operator === "eq") {
      this.requireOperator(field, "exists", word);
      return this.node({ kind: "exists", field: field.name, span: spanBetween(this.input, word.start, valueToken.end) });
    }
    return this.fieldValue(field, operator, valueToken.value, false, spanToken(word.start, valueToken.end));
  }

  private sort(fieldToken: Token): SortMarker {
    const value = this.readValueToken().value;
    const parts = value.split(":");
    let order: SearchOrder;
    let canonical: string;
    if (["new", "hot", "top", "best"].includes(value.toLowerCase())) {
      const shortcut = value.toLowerCase();
      order = { field: shortcut === "new" ? "updatedAt" : "score", direction: "descending", nulls: "last" };
      canonical = `sort:${shortcut}`;
    } else {
      const descriptor = this.resolveField({ ...fieldToken, value: parts[0] ?? "" });
      const direction = (parts[1] ?? "ascending").toLowerCase();
      const nulls = (parts[2] ?? "last").toLowerCase().replace(/^nulls/u, "");
      if (!["asc", "ascending", "desc", "descending"].includes(direction)) {
        this.fail("QUERY_INVALID_SORT", `Invalid sort direction: ${direction}`, fieldToken, ["ascending", "descending"]);
      }
      if (!["first", "last"].includes(nulls)) this.fail("QUERY_INVALID_SORT", `Invalid null ordering: ${nulls}`, fieldToken, ["first", "last"]);
      order = {
        field: descriptor.name,
        direction: direction.startsWith("desc") ? "descending" : "ascending",
        nulls: nulls as "first" | "last",
      };
      canonical = `sort:${order.field}:${order.direction === "ascending" ? "asc" : "desc"}:nulls${order.nulls}`;
    }
    return { kind: "sort-marker", order, canonical, span: spanBetween(this.input, fieldToken.start, this.previous().end) };
  }

  private related(fieldToken: Token): SearchExpression {
    const relation = fieldToken.value.slice("related.".length).toLowerCase();
    const allowed = ["reply", "quote", "mention", "provenance", "promotion", "replacement", "moderation", "attachment", "backlink"] as const;
    if (!(allowed as readonly string[]).includes(relation)) {
      this.fail("QUERY_UNKNOWN_RELATION", `Unknown relation: ${relation}`, fieldToken, nearest(relation, allowed));
    }
    const value = this.readValueToken();
    const slash = value.value.indexOf("/");
    const kind = slash < 0 ? "message" : value.value.slice(0, slash);
    const objectId = slash < 0 ? value.value : value.value.slice(slash + 1);
    let target;
    try {
      target = validateObjectRef({ objectId, kind });
    } catch {
      this.fail("QUERY_INVALID_VALUE", `Invalid related object reference: ${value.value}`, value);
    }
    return this.node({
      kind: "related",
      relation: relation as (typeof allowed)[number],
      target,
      direction: "out",
      maxDepth: 1,
      span: spanBetween(this.input, fieldToken.start, value.end),
    });
  }

  private range(field: FieldDescriptor, open: Token, start: number): SearchExpression {
    this.requireOperator(field, "in", open);
    const lowerToken = this.readValueToken();
    this.expect("TO");
    const upperToken = this.readValueToken();
    const close = this.take("RBRACKET") ?? this.take("RBRACE");
    if (close === undefined) this.fail("QUERY_SYNTAX", "Expected ] or } to close range", this.peek());
    const lower = lowerToken.value === "*" ? undefined : this.convert(field, lowerToken.value, lowerToken);
    const upper = upperToken.value === "*" ? undefined : this.convert(field, upperToken.value, upperToken);
    if (lower === undefined && upper === undefined) this.fail("QUERY_INVALID_RANGE", "A range must have at least one bound", open);
    return this.node({
      kind: "range",
      field: field.name,
      ...(lower === undefined ? {} : { lower }),
      ...(upper === undefined ? {} : { upper }),
      includeLower: open.type === "LBRACKET",
      includeUpper: close.type === "RBRACKET",
      span: spanBetween(this.input, start, close.end),
    });
  }

  private fieldValue(field: FieldDescriptor, operator: CompareOperator, raw: string, phrase: boolean, token: Token): SearchExpression {
    if (raw.length > MAX_VALUE_LENGTH) this.fail("QUERY_VALUE_TOO_LARGE", `Query value exceeds ${MAX_VALUE_LENGTH} characters`, token);
    if (/^\/.*\/$/u.test(raw) || /[~?^]/u.test(raw)) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
    const prefix = !phrase && raw.endsWith("*");
    if (prefix) {
      this.requireOperator(field, "prefix", token);
      const value = raw.slice(0, -1);
      if (value.length < MIN_PREFIX_LENGTH) this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
      if (value.includes("*")) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
      return this.node({ kind: "text", fields: [field.name], value: value.normalize("NFC"), mode: "prefix", span: tokenSpan(this.input, token) });
    }
    if (raw.includes("*")) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
    const mapped = compareOperator(operator);
    this.requireOperator(field, field.type === "text" && operator === "eq" ? (phrase ? "phrase" : "term") : mapped, token);
    if (field.type === "datetime" && operator === "eq" && ["today", "yesterday"].includes(raw.toLowerCase())) {
      const bounds = contextualDay(raw.toLowerCase(), this.resolvedAt, this.options.timezone ?? "UTC", tokenSpan(this.input, token));
      return this.node({
        kind: "range",
        field: field.name,
        lower: bounds.lower,
        upper: bounds.upper,
        includeLower: true,
        includeUpper: false,
        span: tokenSpan(this.input, token),
      });
    }
    const contextual = raw.toLowerCase() === "me" && ["author", "owner"].includes(field.name);
    if (contextual && this.options.actorId === undefined) this.fail("QUERY_CONTEXT_REQUIRED", `Field ${field.name} requires an authenticated actor to resolve "me"`, token);
    const value = this.convert(field, contextual ? this.options.actorId as string : raw, token);
    if (field.type === "text" && operator === "eq") {
      return this.node({ kind: "text", fields: field.name === "text" ? ["title", "body"] : [field.name], value: String(value), mode: phrase ? "phrase" : "term", span: tokenSpan(this.input, token) });
    }
    return this.node({ kind: "compare", field: field.name, operator, value, span: tokenSpan(this.input, token) });
  }

  private text(field: FieldDescriptor | undefined, raw: string, mode: "term" | "phrase" | "prefix", token: Token): SearchExpression {
    if (/[~?^]/u.test(raw) || /^\/.*\/$/u.test(raw)) this.fail("QUERY_UNSUPPORTED_SYNTAX", "Regex, fuzzy, boost, and wildcard query syntax is not supported", token);
    const value = mode === "prefix" ? raw.slice(0, -1) : raw;
    if (mode === "prefix" && value.length < MIN_PREFIX_LENGTH) this.fail("QUERY_PREFIX_TOO_SHORT", `Prefix queries require at least ${MIN_PREFIX_LENGTH} characters`, token);
    if (raw.includes("*") && mode !== "prefix") this.fail("QUERY_UNSUPPORTED_SYNTAX", "Only one trailing prefix wildcard is supported", token);
    if (field !== undefined) return this.fieldValue(field, "eq", raw, mode === "phrase", token);
    return this.node({ kind: "text", fields: ["title", "body"], value: value.normalize("NFC"), mode, span: tokenSpan(this.input, token) });
  }

  private convert(field: FieldDescriptor, raw: string, token: Token): CommunityFieldScalar {
    const value = raw.normalize("NFC");
    switch (field.type) {
      case "number": {
        if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) this.fail("QUERY_INVALID_VALUE", `${field.name} requires a finite number`, token);
        const number = Number(value);
        if (!Number.isFinite(number) || !Number.isSafeInteger(number) && !value.includes(".")) this.fail("QUERY_INVALID_VALUE", `${field.name} requires a safe finite number`, token);
        return number;
      }
      case "boolean":
        if (!/^(?:true|false)$/iu.test(value)) this.fail("QUERY_INVALID_VALUE", `${field.name} requires true or false`, token, ["true", "false"]);
        return value.toLowerCase() === "true";
      case "datetime": return normalizeDatetime(value, tokenSpan(this.input, token));
      case "uri": {
        try { return new URL(value).toString(); } catch { return this.fail("QUERY_INVALID_VALUE", `${field.name} requires an absolute URI`, token); }
      }
      default:
        if (field.enumValues !== undefined && !field.enumValues.includes(value.toLowerCase())) {
          this.fail("QUERY_INVALID_VALUE", `Unknown ${field.name} value: ${value}`, token, nearest(value, field.enumValues));
        }
        return field.enumValues === undefined ? value : value.toLowerCase();
    }
  }

  private readOperator(): CompareOperator {
    const token = this.peek();
    const mapping: Partial<Record<TokenType, CompareOperator>> = { EQ: "eq", NE: "ne", LT: "lt", LTE: "lte", GT: "gt", GTE: "gte" };
    const operator = mapping[token.type];
    if (operator === undefined) return "eq";
    this.position += 1;
    return operator;
  }

  private readValueToken(): Token {
    const first = this.take("WORD") ?? this.take("PHRASE");
    if (first === undefined) this.fail("QUERY_SYNTAX", "Expected a query value", this.peek());
    let value = first.value;
    let end = first.end;
    while (this.take("COLON") !== undefined) {
      const next = this.expect("WORD");
      value += `:${next.value}`;
      end = next.end;
    }
    return { type: first.type, value, start: first.start, end };
  }

  private resolveField(token: Token): FieldDescriptor {
    const field = this.fieldRegistry.resolve(token.value);
    const visible = field !== undefined && this.fieldRegistry.list(this.options.authorization ?? {}).includes(field);
    if (field !== undefined && visible) return field;
    const suggestions = this.fieldRegistry.suggest(token.value, this.options.authorization);
    this.fail("QUERY_UNKNOWN_FIELD", `Unknown query field "${token.value}"${suggestions[0] === undefined ? "" : `; did you mean ${suggestions[0]}?`}`, token, suggestions);
  }

  private requireOperator(field: FieldDescriptor, operator: Operator, token: Token): void {
    if (!field.operators.includes(operator)) this.fail("QUERY_INVALID_OPERATOR", `${operator} is not supported for ${field.name}`, token, field.operators);
  }

  private combine(kind: "and" | "or", left: SearchExpression, right: SearchExpression): SearchExpression {
    const terms = [left, right].flatMap((term) => term.kind === kind ? term.terms : [term]);
    return this.node({ kind, terms, span: mergeSpans(left.span, right.span) });
  }

  private node<T extends SearchExpression>(node: T): T {
    this.nodes += 1;
    if (this.nodes > (this.options.maxNodes ?? MAX_QUERY_NODES)) this.fail("QUERY_NODE_LIMIT", "Query has too many clauses", node.span);
    return node;
  }

  private peek(): Token { return this.tokens[this.position] ?? this.tokens.at(-1) as Token; }
  private previous(): Token { return this.tokens[Math.max(0, this.position - 1)] as Token; }
  private take(type: TokenType): Token | undefined {
    if (this.peek().type !== type) return undefined;
    const token = this.peek();
    this.position += 1;
    return token;
  }
  private expect(type: TokenType): Token {
    const token = this.take(type);
    if (token === undefined) this.fail("QUERY_SYNTAX", `Expected ${type} near ${this.peek().value || "end"}`, this.peek());
    return token;
  }
  private fail(code: string, message: string, value?: Token | SourceSpan, suggestions: readonly string[] = []): never {
    const span = value === undefined ? undefined : "type" in value ? tokenSpan(this.input, value) : value;
    throw new QueryFailure(code, message, span, suggestions);
  }
}

type CompareOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte";

function tokenize(input: string): readonly Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const push = (type: TokenType, start: number, end = start + 1, value = input.slice(start, end)): void => {
    tokens.push({ type, value, start, end });
  };
  while (index < input.length) {
    const character = input[index] ?? "";
    if (/\s/u.test(character)) { index += 1; continue; }
    const two = input.slice(index, index + 2);
    const compound: Partial<Record<string, TokenType>> = { ">=": "GTE", "<=": "LTE", "!=": "NE" };
    if (compound[two] !== undefined) { push(compound[two] as TokenType, index, index + 2); index += 2; continue; }
    const punctuation: Partial<Record<string, TokenType>> = {
      "(": "LPAREN", ")": "RPAREN", "[": "LBRACKET", "]": "RBRACKET", "{": "LBRACE", "}": "RBRACE",
      ":": "COLON", "=": "EQ", "<": "LT", ">": "GT",
    };
    if (punctuation[character] !== undefined) { push(punctuation[character] as TokenType, index); index += 1; continue; }
    if (character === "-" && !/\d/u.test(input[index + 1] ?? "")) { push("NOT", index); index += 1; continue; }
    if (character === "\"") {
      const start = index;
      index += 1;
      while (index < input.length && input[index] !== "\"") {
        if (input[index] === "\\") index += 1;
        index += 1;
      }
      if (input[index] !== "\"") throw new QueryFailure("QUERY_SYNTAX", "unterminated quoted phrase", spanBetween(input, start, input.length));
      index += 1;
      let phrase: unknown;
      try { phrase = JSON.parse(input.slice(start, index)); } catch { throw new QueryFailure("QUERY_SYNTAX", "invalid quoted phrase escape", spanBetween(input, start, index)); }
      if (typeof phrase !== "string") throw new QueryFailure("QUERY_SYNTAX", "invalid quoted phrase", spanBetween(input, start, index));
      push("PHRASE", start, index, phrase.normalize("NFC"));
      continue;
    }
    const start = index;
    while (index < input.length && !/[\s():[\]{}"=<>]/u.test(input[index] ?? "")) index += 1;
    const raw = input.slice(start, index).normalize("NFC");
    const upper = raw.toUpperCase();
    const type = upper === "AND" || upper === "OR" || upper === "NOT" || upper === "TO" ? upper as TokenType : "WORD";
    push(type, start, index, raw);
  }
  tokens.push({ type: "EOF", value: "", start: input.length, end: input.length });
  return tokens;
}

function separateSort(node: ParsedNode | null): { readonly expression: SearchExpression | null; readonly sorts: readonly SortMarker[] } {
  if (node === null) return { expression: null, sorts: [] };
  if (node.kind === "sort-marker") return { expression: null, sorts: [node] };
  if (node.kind !== "and") return { expression: node, sorts: [] };
  const sorts = node.terms.filter((term) => (term as unknown as ParsedNode).kind === "sort-marker") as unknown as SortMarker[];
  const expressions = node.terms.filter((term) => (term as unknown as ParsedNode).kind !== "sort-marker");
  const seen = new Set<string>();
  for (const sort of sorts) {
    if (seen.has(sort.order.field)) throw new QueryFailure("QUERY_DUPLICATE_SORT", `Duplicate sort field: ${sort.order.field}`, sort.span);
    seen.add(sort.order.field);
  }
  return {
    expression: expressions.length === 0 ? null : expressions.length === 1 ? expressions[0] as SearchExpression : { ...node, terms: expressions },
    sorts,
  };
}

function normalizeExpression(expression: SearchExpression): SearchExpression {
  if (expression.kind === "and" || expression.kind === "or") {
    const terms = expression.terms.flatMap((term) => {
      const normalized = normalizeExpression(term);
      if (normalized.kind === "all" && expression.kind === "and") return [];
      return normalized.kind === expression.kind ? normalized.terms : [normalized];
    });
    if (terms.length === 0) return { kind: "all", ...(expression.span === undefined ? {} : { span: expression.span }) };
    if (terms.length === 1) return terms[0] as SearchExpression;
    return { ...expression, terms };
  }
  if (expression.kind === "not") return { ...expression, term: normalizeExpression(expression.term) };
  return expression;
}

export function serializeExpression(expression: SearchExpression, parentPrecedence = 0): string {
  const precedence = expression.kind === "or" ? 1 : expression.kind === "and" ? 2 : expression.kind === "not" ? 3 : 4;
  let value: string;
  switch (expression.kind) {
    case "all": value = "*"; break;
    case "and": case "or": value = expression.terms.map((term) => serializeExpression(term, precedence)).join(` ${expression.kind.toUpperCase()} `); break;
    case "not": value = `NOT ${serializeExpression(expression.term, precedence)}`; break;
    case "text": {
      const raw = expression.mode === "phrase" ? JSON.stringify(expression.value) : `${escapeValue(expression.value)}${expression.mode === "prefix" ? "*" : ""}`;
      value = expression.fields.length === 2 && expression.fields[0] === "title" && expression.fields[1] === "body" ? raw : `${expression.fields[0]}:${raw}`;
      break;
    }
    case "compare": value = `${expression.field}:${operatorText(expression.operator)}${serializeScalar(expression.value)}`; break;
    case "range": value = `${expression.field}:${expression.includeLower ? "[" : "{"}${expression.lower === undefined ? "*" : serializeScalar(expression.lower)} TO ${expression.upper === undefined ? "*" : serializeScalar(expression.upper)}${expression.includeUpper ? "]" : "}"}`; break;
    case "exists": value = `${expression.field}:*`; break;
    case "related": value = `related.${expression.relation}:${expression.target.kind}/${escapeValue(expression.target.objectId)}`; break;
  }
  return precedence < parentPrecedence ? `(${value})` : value;
}

function operatorText(operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in"): string {
  return ({ eq: "", ne: "!=", lt: "<", lte: "<=", gt: ">", gte: ">=", in: "=" } as const)[operator];
}

function serializeScalar(value: unknown): string {
  if (typeof value === "string") return escapeValue(value);
  if (Array.isArray(value)) return `(${value.map(serializeScalar).join(" OR ")})`;
  return String(value);
}

function escapeValue(value: string): string {
  return /^[^\s():[\]{}"=<>]+$/u.test(value) ? value : JSON.stringify(value);
}

function normalizeNow(value: string | Date | undefined): string {
  if (value === undefined) return "1970-01-01T00:00:00.000Z";
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new QueryFailure("QUERY_CONTEXT_INVALID", "Invalid query clock value");
  return date.toISOString();
}

function normalizeDatetime(value: string, span?: SourceSpan): string {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) throw new QueryFailure("QUERY_INVALID_VALUE", "Datetime values require an explicit timezone", span);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new QueryFailure("QUERY_INVALID_VALUE", `Invalid datetime: ${value}`, span);
  return date.toISOString();
}

function contextualDay(value: string, resolvedAt: string, timezone: string, span?: SourceSpan): { readonly lower: string; readonly upper: string } {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new QueryFailure("QUERY_CONTEXT_INVALID", `Invalid timezone: ${timezone}`, span);
  }
  const parts = formatter.formatToParts(new Date(resolvedAt));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const offset = value === "yesterday" ? -1 : 0;
  const lower = zonedMidnight(year, month, day + offset, formatter);
  const upper = zonedMidnight(year, month, day + offset + 1, formatter);
  return { lower: lower.toISOString(), upper: upper.toISOString() };
}

function zonedMidnight(year: number, month: number, day: number, formatter: Intl.DateTimeFormat): Date {
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  // Two passes handle offset changes around daylight-saving boundaries.
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((value) => value.type === type)?.value);
    const represented = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    instant += target - represented;
  }
  return new Date(instant);
}

function compareOperator(operator: CompareOperator): Operator { return operator; }

function invalid(error: QueryFailure, resolvedAt: string, fieldRegistryVersion: number): NormalizedCommunityQuery {
  const diagnostic: QueryDiagnostic = {
    code: error.code,
    message: error.message,
    severity: "error",
    ...(error.span === undefined ? {} : { span: error.span }),
    suggestions: error.suggestions,
  };
  const canonicalJson = JSON.stringify({ expression: null, sort: [] });
  return {
    ast: null,
    canonical: "",
    canonicalJson,
    queryHash: stableQueryHash(`${fieldRegistryVersion}\n${canonicalJson}`),
    sort: [],
    version: QUERY_LANGUAGE_VERSION,
    fieldRegistryVersion,
    resolvedAt,
    diagnostics: [diagnostic],
    error: diagnostic.message,
  };
}

function spanToken(start: number, end: number): Token { return { type: "WORD", value: "", start, end }; }
function tokenOf(marker: SortMarker): SourceSpan { return marker.span; }
function tokenSpan(input: string, token: Token): SourceSpan { return spanBetween(input, token.start, token.end); }
function spanBetween(input: string, start: number, end: number): SourceSpan {
  const before = input.slice(0, start);
  const lines = before.split("\n");
  return { start, end, line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}
function mergeSpans(left: SourceSpan | undefined, right: SourceSpan | undefined): SourceSpan | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return { start: left.start, end: right.end, line: left.line, column: left.column };
}

function nearest(value: string, candidates: readonly string[]): readonly string[] {
  const normalized = value.toLowerCase();
  return [...new Set(candidates)].sort((left, right) => distance(normalized, left.toLowerCase()) - distance(normalized, right.toLowerCase()) || left.localeCompare(right)).slice(0, 1);
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
