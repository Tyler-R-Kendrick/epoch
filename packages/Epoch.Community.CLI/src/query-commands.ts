import {
  CommunityError,
  normalizeQuery,
  type CommunityAuthorizationContext,
  type CommunityActionId,
  type SearchExplanation,
  type SearchExpression,
  type SearchOrder,
  type SearchPage,
} from "@epoch/community-core";

export interface CommunityCliCommandDescriptor {
  readonly command: string;
  readonly actionId: CommunityActionId;
  readonly usage: string;
}

export const QUERY_CLI_COMMANDS: readonly CommunityCliCommandDescriptor[] = Object.freeze([
  { command: "search", actionId: "search.run", usage: "search --query QUERY [--json] [--first N] [--after CURSOR]" },
  { command: "search explain", actionId: "search.explain", usage: "search explain --query QUERY [--json]" },
  { command: "search --graphql", actionId: "search.run", usage: "search --graphql FILE [--variables FILE] [--json]" },
]);

export function formatCommunityCliHelp(descriptors: readonly CommunityCliCommandDescriptor[]): string {
  const unique = new Map<string, CommunityCliCommandDescriptor>();
  for (const descriptor of descriptors) {
    if (unique.has(descriptor.usage)) throw invalidInput("CLI help contains a duplicate command usage");
    unique.set(descriptor.usage, descriptor);
  }
  return `Usage:\n${[...unique.values()].map((descriptor) => `  epoch-community ${descriptor.usage}`).join("\n")}\n`;
}

export const COMMUNITY_CLI_EXIT_CODES = Object.freeze({
  success: 0,
  internal: 1,
  invalidQuery: 2,
  unauthorized: 3,
  partialSource: 4,
  staleCursor: 5,
  unavailableBackend: 6,
  cancelled: 130,
} as const);

export interface CommunityCliCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface QueryCommandServices {
  readonly queryContext: {
    readonly now: string;
    readonly timezone: string;
    readonly locale: string;
    readonly actorId?: string;
    readonly authorization?: CommunityAuthorizationContext;
  };
  search(input: {
    readonly expression: SearchExpression;
    readonly order: readonly SearchOrder[];
    readonly first: number;
    readonly after?: string;
    readonly signal?: AbortSignal;
  }): Promise<SearchPage>;
  explain(input: {
    readonly expression: SearchExpression;
    readonly order: readonly SearchOrder[];
    readonly signal?: AbortSignal;
  }): Promise<SearchExplanation>;
  executeGraphql(input: {
    readonly document: string;
    readonly variables?: Readonly<Record<string, unknown>>;
    readonly signal?: AbortSignal;
  }): Promise<unknown>;
  readFile(path: string): Promise<string>;
}

export interface ParsedCliArguments {
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string | true>>;
}

export async function runQueryCommand(
  args: readonly string[],
  services: QueryCommandServices,
  execution: { readonly signal?: AbortSignal } = {},
): Promise<CommunityCliCommandResult> {
  try {
    assertNotCancelled(execution.signal);
    const parsed = parseCliArguments(args);
    assertAllowedOptions(parsed, ["query", "graphql", "variables", "first", "after", "json"]);
    const explain = parsed.positional[0] === "explain";
    if (parsed.positional.length > (explain ? 1 : 0)) throw invalidInput("Unexpected search argument");
    const json = parsed.options.json === true;
    if (parsed.options.query !== undefined && parsed.options.graphql !== undefined) throw invalidInput("Choose either --query or --graphql");
    if (parsed.options.variables !== undefined && parsed.options.graphql === undefined) throw invalidInput("--variables requires --graphql");
    if ((parsed.options.first !== undefined || parsed.options.after !== undefined) && (explain || parsed.options.graphql !== undefined)) throw invalidInput("Pagination options apply only to text search");
    if (parsed.options.graphql !== undefined) {
      if (explain) throw invalidInput("GraphQL execution cannot be combined with search explain");
      return success(await executeGraphql(parsed, services, execution.signal), json);
    }
    const query = stringOption(parsed, "query", true);
    const normalized = normalizeQuery(query, services.queryContext);
    if (normalized.ast === null || normalized.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      throw new CommunityError("QUERY_SYNTAX", normalized.error ?? "Search query is invalid");
    }
    if (explain) {
      const explanation = await services.explain({
        expression: normalized.ast,
        order: normalized.sort,
        ...(execution.signal === undefined ? {} : { signal: execution.signal }),
      });
      return success(json ? explanation : formatExplanation(explanation), json);
    }
    const first = integerOption(parsed, "first", 50, 1, 1000);
    const after = optionalString(parsed, "after");
    const page = await services.search({
      expression: normalized.ast,
      order: normalized.sort,
      first,
      ...(after === undefined ? {} : { after }),
      ...(execution.signal === undefined ? {} : { signal: execution.signal }),
    });
    const output = json ? searchEnvelope(page) : formatSearchPage(page);
    if (page.completeness.status === "partial") {
      return Object.freeze({
        exitCode: COMMUNITY_CLI_EXIT_CODES.partialSource,
        stdout: render(output, json),
        stderr: "Search completed with partial source coverage. Inspect completeness metadata for omitted sources.\n",
      });
    }
    return success(output, json);
  } catch (error) {
    return failure(error);
  }
}

export function communityCliExitCode(error: unknown): number {
  if (error instanceof DOMException && error.name === "AbortError") return COMMUNITY_CLI_EXIT_CODES.cancelled;
  if (!(error instanceof CommunityError)) return COMMUNITY_CLI_EXIT_CODES.internal;
  switch (error.code) {
    case "AUTHORIZATION_DENIED": return COMMUNITY_CLI_EXIT_CODES.unauthorized;
    case "CURSOR_STALE": case "CURSOR_INVALID": return COMMUNITY_CLI_EXIT_CODES.staleCursor;
    case "SOURCE_PARTIAL": return COMMUNITY_CLI_EXIT_CODES.partialSource;
    case "SOURCE_UNAVAILABLE": case "QUERY_UNSUPPORTED_SOURCE": case "INDEX_STALE": case "INDEX_LOCKED": case "INDEX_QUOTA":
      return COMMUNITY_CLI_EXIT_CODES.unavailableBackend;
    case "QUERY_SYNTAX": case "QUERY_UNKNOWN_FIELD": case "QUERY_INVALID_OPERATOR": case "QUERY_COST_LIMIT":
    case "PROJECTION_INVALID": case "PROJECTION_CYCLE": case "PROJECTION_COLLISION":
    case "NAMESPACE_MOUNT_CONFLICT": case "NAMESPACE_RECOVERY_PROTECTED": case "INVALID_FIELD": case "INVALID_ENTITY":
      return COMMUNITY_CLI_EXIT_CODES.invalidQuery;
    default: return COMMUNITY_CLI_EXIT_CODES.internal;
  }
}

export function parseCliArguments(args: readonly string[]): ParsedCliArguments {
  const positional: string[] = [];
  const options: Record<string, string | true> = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]!;
    if (!value.startsWith("--")) { positional.push(value); continue; }
    const key = value.slice(2);
    if (!/^[a-z][a-z0-9-]*$/u.test(key) || Object.hasOwn(options, key)) throw invalidInput("CLI option is invalid or repeated");
    if (key === "json") { options[key] = true; continue; }
    const optionValue = args[index + 1];
    if (optionValue === undefined || optionValue.startsWith("--")) throw invalidInput(`Option --${key} requires a value`);
    options[key] = optionValue;
    index += 1;
  }
  return Object.freeze({ positional: Object.freeze(positional), options: Object.freeze(options) });
}

export function stableJson(value: unknown, indent?: number): string {
  return JSON.stringify(sortJson(value), undefined, indent);
}

export function success(value: unknown, json: boolean): CommunityCliCommandResult {
  return Object.freeze({ exitCode: 0, stdout: render(value, json), stderr: "" });
}

export function failure(error: unknown): CommunityCliCommandResult {
  const exitCode = communityCliExitCode(error);
  const code = error instanceof CommunityError ? error.code : error instanceof DOMException && error.name === "AbortError" ? "CANCELLED" : "INTERNAL";
  const message = error instanceof CommunityError ? error.message : error instanceof DOMException && error.name === "AbortError" ? "Command cancelled" : "Community CLI command failed";
  return Object.freeze({ exitCode, stdout: "", stderr: `${code}: ${boundedMessage(message)}\n` });
}

export function stringOption(parsed: ParsedCliArguments, key: string, required = false): string {
  const value = parsed.options[key];
  if (typeof value === "string") return value;
  if (required) throw invalidInput(`Missing required option --${key}`);
  return "";
}

export function optionalString(parsed: ParsedCliArguments, key: string): string | undefined {
  const value = parsed.options[key];
  return typeof value === "string" ? value : undefined;
}

export function integerOption(parsed: ParsedCliArguments, key: string, fallback: number, minimum: number, maximum: number): number {
  const value = optionalString(parsed, key);
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw invalidInput(`Option --${key} must be an integer`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw invalidInput(`Option --${key} must be between ${minimum} and ${maximum}`);
  return number;
}

export function invalidInput(message: string): CommunityError {
  return new CommunityError("QUERY_SYNTAX", message);
}

export function assertAllowedOptions(parsed: ParsedCliArguments, allowed: readonly string[]): void {
  const names = new Set(allowed);
  const unknown = Object.keys(parsed.options).find((name) => !names.has(name));
  if (unknown !== undefined) throw invalidInput(`Unknown option --${unknown}`);
}

async function executeGraphql(parsed: ParsedCliArguments, services: QueryCommandServices, signal?: AbortSignal): Promise<unknown> {
  const documentPath = stringOption(parsed, "graphql", true);
  const document = await services.readFile(documentPath);
  if (document.length > 65_536) throw new CommunityError("QUERY_COST_LIMIT", "GraphQL document exceeds 65536 characters");
  const variablesPath = optionalString(parsed, "variables");
  let variables: Readonly<Record<string, unknown>> | undefined;
  if (variablesPath !== undefined) {
    const raw = await services.readFile(variablesPath);
    if (new TextEncoder().encode(raw).length > 1_000_000) throw new CommunityError("QUERY_COST_LIMIT", "GraphQL variables exceed 1 MB");
    try {
      const parsedVariables: unknown = JSON.parse(raw);
      if (typeof parsedVariables !== "object" || parsedVariables === null || Array.isArray(parsedVariables)) throw invalidInput("GraphQL variables must be a JSON object");
      variables = parsedVariables as Readonly<Record<string, unknown>>;
    } catch (error) {
      if (error instanceof CommunityError) throw error;
      throw invalidInput("GraphQL variables file is not valid JSON");
    }
  }
  return services.executeGraphql({ document, ...(variables === undefined ? {} : { variables }), ...(signal === undefined ? {} : { signal }) });
}

function searchEnvelope(page: SearchPage): unknown {
  return { schema: "epoch.community.cli.search.v1", hits: page.hits, pageInfo: page.pageInfo, snapshot: page.snapshot, completeness: page.completeness };
}

function formatSearchPage(page: SearchPage): string {
  const lines = page.hits.map((hit) => `${hit.target.objectId}\t${hit.target.kind}\t${hit.matchedFields.join(",") || "-"}\t${hit.provenance.sourceId}`);
  lines.push(`completeness\t${page.completeness.status}`);
  if (page.pageInfo.endCursor !== undefined) lines.push(`cursor\t${page.pageInfo.endCursor}`);
  return `${lines.join("\n")}\n`;
}

function formatExplanation(explanation: SearchExplanation): string {
  return `backend\t${explanation.backendId}\nplan\t${explanation.planHash}\nauthorization\t${explanation.authorization}\n`;
}

function render(value: unknown, json: boolean): string {
  if (typeof value === "string" && !json) return value.endsWith("\n") ? value : `${value}\n`;
  return `${stableJson(value)}\n`;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, item]) => [key, sortJson(item)]));
}

function boundedMessage(value: string): string {
  return value.replace(/[\r\n\t\0]/gu, " ").slice(0, 512);
}

function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw new DOMException("Command cancelled", "AbortError");
}
