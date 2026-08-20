import { CommunityError, normalizeVirtualPath } from "@epoch/community-core";
import {
  GraphQLError,
  GraphQLScalarType,
  Kind,
  assertValidSchema,
  buildSchema,
  execute,
  getOperationAST,
  parse,
  subscribe,
  validate,
  valueFromASTUntyped,
  type DocumentNode,
  type ExecutionResult,
  type FragmentDefinitionNode,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from "graphql";
import { createRootResolvers, type CommunityGraphQLContext, type CommunityGraphQLServices } from "./resolvers";
import { COMMUNITY_GRAPHQL_SDL } from "./schema";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsNumber<T>(value: T): value is T & number { return typeof value === "number"; }


export { COMMUNITY_GRAPHQL_SDL } from "./schema";
export * from "./resolvers";
export * from "./subscriptions";

const ROOTS = new WeakMap<GraphQLSchema, Readonly<Record<string, DictionaryValue>>>();
const MAX_DOCUMENT_BYTES = 65_536;

export interface CommunityGraphQLLimits {
  readonly maxDepth?: number;
  readonly maxComplexity?: number;
  readonly maxDocumentBytes?: number;
}

export interface CommunityGraphQLExecutionInput {
  readonly schema: GraphQLSchema;
  readonly source: string;
  readonly variableValues?: Readonly<Record<string, DictionaryValue>>;
  readonly operationName?: string;
  readonly context: CommunityGraphQLContext;
  readonly limits?: CommunityGraphQLLimits;
  /** Extra host metadata is ignored rather than becoming resolver authority. */
  readonly [hostMetadata: string]: DictionaryValue;
}

export function createCommunityGraphQLSchema(services: CommunityGraphQLServices): GraphQLSchema {
  const schema = buildSchema(COMMUNITY_GRAPHQL_SDL);
  configureScalars(schema);
  assertValidSchema(schema);
  ROOTS.set(schema, createRootResolvers(services));
  return schema;
}

export async function executeCommunityGraphQL(input: CommunityGraphQLExecutionInput): Promise<ExecutionResult> {
  const prepared = prepare(input);
  if (prepared instanceof GraphQLError) return { errors: [prepared] };
  return normalizeExecutionResult(await execute({
    schema: input.schema,
    document: prepared,
    rootValue: requiredRoot(input.schema),
    contextValue: input.context,
    ...(!(input.variableValues === undefined) && { variableValues: input.variableValues }),
    ...(!(input.operationName === undefined) && { operationName: input.operationName }),
  }));
}

export async function subscribeCommunityGraphQL(
  input: CommunityGraphQLExecutionInput,
): Promise<AsyncIterable<ExecutionResult> | ExecutionResult> {
  const prepared = prepare(input);
  if (prepared instanceof GraphQLError) return { errors: [prepared] };
  const result = await subscribe({
    schema: input.schema,
    document: prepared,
    rootValue: requiredRoot(input.schema),
    contextValue: input.context,
    ...(!(input.variableValues === undefined) && { variableValues: input.variableValues }),
    ...(!(input.operationName === undefined) && { operationName: input.operationName }),
  });
  return Symbol.asyncIterator in result ? normalizedResults(result) : normalizeExecutionResult(result);
}

async function* normalizedResults(results: AsyncIterable<ExecutionResult>): AsyncIterable<ExecutionResult> {
  for await (const result of results) yield normalizeExecutionResult(result);
}

function normalizeExecutionResult(result: ExecutionResult): ExecutionResult {
  if (result.errors === undefined) return result;
  return {
    ...result,
    errors: result.errors.map((error) => {
      if (__epochIsString(error.extensions.code)) return error;
      if (error.path === undefined) return withCode(error, "QUERY_SYNTAX", 400);
      return new GraphQLError("Internal Community GraphQL failure", { path: error.path, extensions: { code: "INTERNAL", httpStatus: 500 } });
    }),
  };
}

function prepare(input: CommunityGraphQLExecutionInput): DocumentNode | GraphQLError {
  if (!__epochIsString(input.source) || new TextEncoder().encode(input.source).length > (input.limits?.maxDocumentBytes ?? MAX_DOCUMENT_BYTES)) return boundedError("GraphQL document exceeds its byte limit");
  let document: DocumentNode;
  try { document = parse(input.source, { maxTokens: 10_000 }); }
  catch (error) { return error instanceof GraphQLError ? withCode(error, "QUERY_SYNTAX", 400) : boundedError("GraphQL document could not be parsed", "QUERY_SYNTAX", 400); }
  const errors = validate(input.schema, document, undefined, { maxErrors: 20 });
  if (errors[0] !== undefined) return withCode(errors[0], "QUERY_SYNTAX", 400);
  try {
    enforceComplexity(document, input.operationName, input.variableValues, input.limits);
    return document;
  } catch (error) {
    return error instanceof GraphQLError ? error : boundedError("GraphQL query exceeds execution limits");
  }
}

function enforceComplexity(
  document: DocumentNode,
  operationName: string | undefined,
  variables: Readonly<Record<string, DictionaryValue>> | undefined,
  limits: CommunityGraphQLLimits | undefined,
): void {
  const operation = getOperationAST(document, operationName);
  if (operation === null) throw boundedError("GraphQL document must select exactly one operation", "QUERY_SYNTAX", 400);
  const fragments = new Map(document.definitions.filter((definition): definition is FragmentDefinitionNode => definition.kind === Kind.FRAGMENT_DEFINITION).map((fragment) => [fragment.name.value, fragment]));
  const maximumDepth = limits?.maxDepth ?? 16;
  const maximumComplexity = limits?.maxComplexity ?? 10_000;
  let complexity = 0;
  const walk = (selectionSet: SelectionSetNode, depth: number, multiplier: number, active: ReadonlySet<string>): void => {
    if (depth > maximumDepth) throw boundedError(`GraphQL query exceeds depth ${maximumDepth}`);
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const first = selection.arguments?.find((argument) => argument.name.value === "first");
        const factor = first === undefined ? 1 : boundedListFactor(valueFromASTUntyped(first.value, variables));
        complexity += multiplier * factor;
        if (complexity > maximumComplexity) throw boundedError(`GraphQL query exceeds complexity ${maximumComplexity}`);
        if (selection.selectionSet !== undefined) walk(selection.selectionSet, depth + 1, Math.min(1000, multiplier * factor), active);
      } else if (selection.kind === Kind.INLINE_FRAGMENT) walk(selection.selectionSet, depth + 1, multiplier, active);
      else {
        if (active.has(selection.name.value)) throw boundedError("GraphQL fragment cycle exceeds execution limits");
        const fragment = fragments.get(selection.name.value);
        if (fragment !== undefined) walk(fragment.selectionSet, depth + 1, multiplier, new Set(active).add(selection.name.value));
      }
    }
  };
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  walk((operation as OperationDefinitionNode).selectionSet, 1, 1, new Set());
}

function configureScalars(schema: GraphQLSchema): void {
  configureScalar(schema, "JSON", {
    serialize: boundedJson,
    parseValue: boundedJson,
    parseLiteral: (node, variables) => boundedJson(valueFromASTUntyped(node, variables)),
  });
  configureScalar(schema, "VPath", {
    serialize: pathScalar,
    parseValue: pathScalar,
    parseLiteral: (node) => node.kind === Kind.STRING ? pathScalar(node.value) : undefined,
  });
  configureScalar(schema, "Cursor", {
    serialize: cursorScalar,
    parseValue: cursorScalar,
    parseLiteral: (node) => node.kind === Kind.STRING ? cursorScalar(node.value) : undefined,
  });
}

function configureScalar(schema: GraphQLSchema, name: string, behavior: Pick<GraphQLScalarType, "serialize" | "parseValue" | "parseLiteral">): void {
  const scalar = schema.getType(name);
  if (!(scalar instanceof GraphQLScalarType)) throw new Error(`GraphQL scalar is missing: ${name}`);
  scalar.serialize = behavior.serialize;
  scalar.parseValue = behavior.parseValue;
  scalar.parseLiteral = behavior.parseLiteral;
}

function boundedJson(value: BoundaryValue): BoundaryValue {
  let encoded: string | undefined;
  try { encoded = JSON.stringify(value); } catch { throw new GraphQLError("JSON value must be serializable", { extensions: { code: "QUERY_SYNTAX", httpStatus: 400 } }); }
  if (encoded === undefined || encoded.length > 1_000_000) throw new GraphQLError("JSON value exceeds its size limit", { extensions: { code: "QUERY_COST_LIMIT", httpStatus: 413 } });
  return value;
}

function pathScalar(value: BoundaryValue): string {
  if (!__epochIsString(value)) throw new GraphQLError("VPath must be a string", { extensions: { code: "PROJECTION_INVALID", httpStatus: 400 } });
  return normalizeVirtualPath(value);
}

function cursorScalar(value: BoundaryValue): string {
  if (!__epochIsString(value) || value.length < 1 || value.length > 4096 || !/^[A-Za-z0-9_-]+$/u.test(value)) throw new GraphQLError("Cursor is malformed", { extensions: { code: "CURSOR_INVALID", httpStatus: 400 } });
  return value;
}

function boundedListFactor(value: BoundaryValue): number {
  return __epochIsNumber(value) && Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 10;
}

function requiredRoot(schema: GraphQLSchema): Readonly<Record<string, DictionaryValue>> {
  const root = ROOTS.get(schema);
  if (root === undefined) throw new CommunityError("INTERNAL", "GraphQL schema was not created by createCommunityGraphQLSchema");
  return root;
}

function boundedError(message: string, code = "QUERY_COST_LIMIT", httpStatus = 413): GraphQLError {
  return new GraphQLError(message, { extensions: { code, httpStatus } });
}

function withCode(error: GraphQLError, code: string, httpStatus: number): GraphQLError {
  return new GraphQLError(error.message, { nodes: error.nodes, source: error.source, positions: error.positions, path: error.path, originalError: error.originalError, extensions: { ...error.extensions, code, httpStatus } });
}
