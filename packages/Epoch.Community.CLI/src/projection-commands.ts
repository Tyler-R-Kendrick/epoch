import {
  CommunityError,
  PROJECTION_DEFINITION_API_VERSION,
  type CompiledProjection,
  type CommunityActionId,
  type ProjectionDefinition,
  type ProjectionExplanation,
  type VfsPage,
} from "@epoch/community-core";
import {
  failure,
  assertAllowedOptions,
  integerOption,
  invalidInput,
  optionalString,
  parseCliArguments,
  stableJson,
  success,
  type CommunityCliCommandResult,
} from "./query-commands";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


export const PROJECTION_CLI_COMMANDS: readonly {
  readonly command: string;
  readonly actionId: CommunityActionId;
  readonly usage: string;
}[] = Object.freeze([
  { command: "projections list", actionId: "projection.list", usage: "projections list [--json]" },
  { command: "projections show", actionId: "projection.open", usage: "projections show ID [--json]" },
  { command: "projections validate", actionId: "projection.validate", usage: "projections validate FILE [--json]" },
  { command: "projections preview", actionId: "projection.preview", usage: "projections preview FILE [--path PATH] [--json]" },
  { command: "projections save", actionId: "projection.save", usage: "projections save FILE [--json]" },
  { command: "projections delete", actionId: "projection.delete", usage: "projections delete ID [--json]" },
  { command: "projections clone", actionId: "projection.clone", usage: "projections clone SOURCE NEW_ID [--json]" },
  { command: "projections export", actionId: "projection.open", usage: "projections export ID [--output FILE]" },
  { command: "projections explain", actionId: "projection.explain", usage: "projections explain ID [--path PATH] [--json]" },
]);

export interface ProjectionCommandServices {
  readFile(path: string): Promise<string>;
  writeFile?(path: string, contents: string): Promise<void>;
  list(): Promise<readonly ProjectionDefinition[]>;
  get(projectionId: string): Promise<ProjectionDefinition | undefined>;
  validate(definition: ProjectionDefinition): Promise<CompiledProjection>;
  preview(input: { readonly definition: ProjectionDefinition; readonly path: string; readonly first: number; readonly after?: string; readonly signal?: AbortSignal }): Promise<VfsPage>;
  explain?(input: { readonly projectionId: string; readonly path: string; readonly signal?: AbortSignal }): Promise<ProjectionExplanation>;
  save(definition: ProjectionDefinition): Promise<ProjectionDefinition>;
  delete(projectionId: string): Promise<boolean>;
}

export async function runProjectionCommand(
  args: readonly string[],
  services: ProjectionCommandServices,
  execution: { readonly signal?: AbortSignal } = {},
): Promise<CommunityCliCommandResult> {
  try {
    if (execution.signal?.aborted === true) throw new DOMException("Command cancelled", "AbortError");
    const parsed = parseCliArguments(args);
    const [command, ...positional] = parsed.positional;
    const json = parsed.options.json === true;
    switch (command) {
      case "list": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 0, "projections list");
        const definitions = [...await services.list()].sort((left, right) => compare(left.projectionId, right.projectionId));
        return success(json ? { schema: "epoch.community.cli.projections.v1", projections: definitions } : formatList(definitions), json);
      }
      case "show": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 1, "projections show ID");
        const definition = await requireDefinition(services, positional[0]!);
        return success(json ? definition : `${stableJson(definition, 2)}\n`, json);
      }
      case "validate": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 1, "projections validate FILE");
        const definition = await loadDefinition(services, positional[0]!);
        const compiled = await services.validate(definition);
        return success(json ? validationEnvelope(compiled) : formatValidation(compiled), json);
      }
      case "preview": {
        assertAllowedOptions(parsed, ["json", "path", "first", "after"]);
        requirePositionals(positional, 1, "projections preview FILE");
        const definition = await loadDefinition(services, positional[0]!);
        const compiled = await services.validate(definition);
        rejectCompileErrors(compiled);
        const path = optionalString(parsed, "path") ?? "/";
        const after = optionalString(parsed, "after");
        const first = integerOption(parsed, "first", 50, 1, 1000);
        const page = await services.preview({ definition, path, first, ...(!(after === undefined) && { after }), ...(!(execution.signal === undefined) && { signal: execution.signal }) });
        return success(json ? { schema: "epoch.community.cli.projection-preview.v1", projectionId: definition.projectionId, path, page } : formatPreview(page), json);
      }
      case "save": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 1, "projections save FILE");
        const definition = await loadDefinition(services, positional[0]!);
        rejectCompileErrors(await services.validate(definition));
        return success(await services.save(definition), json);
      }
      case "delete": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 1, "projections delete ID");
        const deleted = await services.delete(positional[0]!);
        return success(json ? { schema: "epoch.community.cli.projection-delete.v1", projectionId: positional[0], deleted } : `${positional[0]}\t${deleted ? "deleted" : "not-found"}\n`, json);
      }
      case "clone": {
        assertAllowedOptions(parsed, ["json"]);
        requirePositionals(positional, 2, "projections clone SOURCE NEW_ID");
        const source = await requireDefinition(services, positional[0]!);
        const clone = cloneDefinition(source, positional[1]!);
        rejectCompileErrors(await services.validate(clone));
        return success(await services.save(clone), json);
      }
      case "export": {
        assertAllowedOptions(parsed, ["json", "output"]);
        requirePositionals(positional, 1, "projections export ID");
        const definition = await requireDefinition(services, positional[0]!);
        const contents = `${stableJson(definition, 2)}\n`;
        const output = optionalString(parsed, "output");
        if (output !== undefined) {
          if (services.writeFile === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Projection export is unavailable in this CLI host");
          await services.writeFile(output, contents);
          return success(json ? { schema: "epoch.community.cli.projection-export.v1", projectionId: definition.projectionId, output } : `${definition.projectionId}\t${output}\n`, json);
        }
        return success(contents, false);
      }
      case "explain": {
        assertAllowedOptions(parsed, ["json", "path"]);
        requirePositionals(positional, 1, "projections explain ID");
        if (services.explain === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Projection explanation is unavailable in this CLI host");
        const path = optionalString(parsed, "path") ?? "/";
        const explanation = await services.explain({ projectionId: positional[0]!, path, ...(!(execution.signal === undefined) && { signal: execution.signal }) });
        return success(json ? explanation : `${explanation.projectionId}\t${explanation.path}\t${explanation.detail}\n`, json);
      }
      default: throw invalidInput("Unknown projections command");
    }
  } catch (error) {
    // SAFETY: catch binds unknown; failure accepts any thrown runtime value.
    return failure(error as BoundaryValue);
  }
}

export function parseProjectionDefinition(raw: string): ProjectionDefinition {
  if (new TextEncoder().encode(raw).length > 1_000_000) throw new CommunityError("PROJECTION_INVALID", "Projection definition exceeds 1 MB");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new CommunityError("PROJECTION_INVALID", "Projection definition is not valid JSON"); }
  if (!__epochIsObject(value) || value === null || Array.isArray(value)) throw new CommunityError("PROJECTION_INVALID", "Projection definition must be a JSON object");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const candidate = value as Partial<ProjectionDefinition>;
  if (candidate.apiVersion !== PROJECTION_DEFINITION_API_VERSION || !__epochIsString(candidate.projectionId)
    || !Number.isSafeInteger(candidate.version) || !__epochIsString(candidate.label) || candidate.root === undefined
    || !Array.isArray(candidate.order) || !["private", "shared", "public"].includes(candidate.visibility ?? "")
    || !["live", "queued", "snapshot"].includes(candidate.updateMode ?? "")
    || !["current", "session-snapshot", "fixed-snapshot"].includes(candidate.consistency ?? "")) {
    throw new CommunityError("PROJECTION_INVALID", "Projection definition is missing required versioned fields");
  }
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return value as ProjectionDefinition;
}

async function loadDefinition(services: ProjectionCommandServices, path: string): Promise<ProjectionDefinition> {
  return parseProjectionDefinition(await services.readFile(path));
}

async function requireDefinition(services: ProjectionCommandServices, projectionId: string): Promise<ProjectionDefinition> {
  const definition = await services.get(projectionId);
  if (definition === undefined) throw new CommunityError("PROJECTION_INVALID", "Projection does not exist");
  return definition;
}

function cloneDefinition(source: ProjectionDefinition, projectionId: string): ProjectionDefinition {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,127}$/u.test(projectionId)) throw new CommunityError("PROJECTION_INVALID", "Projection ID must be opaque and URL-safe");
  return Object.freeze({ ...source, projectionId, version: 1, label: projectionId, visibility: "private" as const, ownerId: undefined });
}

function validationEnvelope(compiled: CompiledProjection): BoundaryValue {
  return { schema: "epoch.community.cli.projection-validation.v1", projectionId: compiled.definition.projectionId, diagnostics: compiled.diagnostics, nodeCount: compiled.nodeCount, maximumDepth: compiled.maximumDepth, estimatedFanout: compiled.estimatedFanout, valid: !compiled.diagnostics.some((diagnostic) => diagnostic.severity === "error") };
}

function rejectCompileErrors(compiled: CompiledProjection): void {
  const error = compiled.diagnostics.find((diagnostic) => diagnostic.severity === "error");
  if (error !== undefined) throw new CommunityError(error.code === "PROJECTION_CYCLE" ? "PROJECTION_CYCLE" : "PROJECTION_INVALID", error.message, { pointer: error.pointer });
}

function formatList(definitions: readonly ProjectionDefinition[]): string {
  return `${definitions.map((definition) => `${definition.projectionId}\tv${definition.version}\t${definition.visibility}\t${definition.label}`).join("\n")}\n`;
}

function formatValidation(compiled: CompiledProjection): string {
  const diagnostics = compiled.diagnostics.map((diagnostic) => `${diagnostic.severity}\t${diagnostic.code}\t${diagnostic.pointer}\t${diagnostic.message}`);
  return `${compiled.definition.projectionId}\t${diagnostics.length === 0 ? "valid" : "invalid"}\n${diagnostics.join("\n")}${diagnostics.length === 0 ? "" : "\n"}`;
}

function formatPreview(page: VfsPage): string {
  return `${page.entries.map((entry) => `${entry.logicalPath}\t${entry.kind}\t${entry.target.objectId}`).join("\n")}\n`;
}

function requirePositionals(values: readonly string[], expected: number, usage: string): void {
  if (values.length !== expected) throw invalidInput(`Usage: epoch-community ${usage}`);
}

function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
