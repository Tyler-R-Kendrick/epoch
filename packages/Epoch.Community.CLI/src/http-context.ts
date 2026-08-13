import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  CommunityError,
  compileProjectionDefinition,
  createCommunityFieldRegistry,
  createHttpCommunityClient,
  type CommunityErrorCode,
} from "@epoch/community-core";
import type { CommunityCliContext } from "./index";

export interface HttpCommunityCliContextOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
  readonly authorizationToken?: string;
  readonly now?: string;
  readonly timezone?: string;
  readonly locale?: string;
  readonly readFile?: (path: string) => Promise<string>;
  readonly writeFile?: (path: string, contents: string) => Promise<void>;
}

export function createHttpCommunityCliContext(options: HttpCommunityCliContextOptions): CommunityCliContext {
  const fetcher = options.fetch ?? globalThis.fetch;
  const authenticatedFetch = createRequester(fetcher, options.authorizationToken);
  const registry = createCommunityFieldRegistry();
  const load = options.readFile ?? ((path: string) => readFile(path, "utf8"));
  const save = options.writeFile ?? ((path: string, contents: string) => writeFile(path, contents, "utf8"));
  return {
    client: createHttpCommunityClient({ baseUrl: options.baseUrl, fetch: authenticatedFetch }),
    search: {
      queryContext: {
        now: options.now ?? new Date().toISOString(),
        timezone: options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: options.locale ?? "en-US",
      },
      search: ({ expression, order, first, after, signal }) => request("POST", "/search", { where: expression, orderBy: order, first, ...(after === undefined ? {} : { after }) }, signal),
      explain: ({ expression, order, signal }) => request("POST", "/search/explain", { where: expression, orderBy: order, first: 100 }, signal),
      executeGraphql: ({ document, variables, signal }) => request("POST", "/graphql", { query: document, ...(variables === undefined ? {} : { variables }) }, signal),
      readFile: load,
    },
    projections: {
      readFile: load,
      writeFile: save,
      list: () => request("GET", "/projections"),
      get: (projectionId) => requestOptional("GET", `/projections/${encodeURIComponent(projectionId)}`),
      validate: async (definition) => compileProjectionDefinition(definition, {
        fields: registry.list({}).map((field) => field.name),
        sortableFields: registry.list({}).filter((field) => field.sortable).map((field) => field.name),
        limits: { maxDepth: 16, maxNodes: 256, maxFanout: 10_000, maxTemplateLength: 1024, maxSegmentLength: 255 },
      }),
      preview: ({ definition, path, first, after, signal }) => request("POST", "/projections/preview", { definition, path, first, ...(after === undefined ? {} : { after }) }, signal),
      explain: ({ projectionId, path, signal }) => request("GET", `/projections/${encodeURIComponent(projectionId)}/explain?path=${encodeURIComponent(path)}`, undefined, signal),
      save: (definition) => request("POST", "/projections", definition),
      delete: async (projectionId) => (await requestResponse("DELETE", `/projections/${encodeURIComponent(projectionId)}`)).status === 204,
    },
    namespace: {
      mounts: () => request("GET", "/namespace/mounts"),
      mount: (input) => request("POST", "/namespace/mounts", { ...input, mountId: `mount:${randomUUID()}`, order: 0, writable: false }),
      unmount: async (mountId) => (await request<{ readonly removed: boolean }>("DELETE", `/namespace/mounts/${encodeURIComponent(mountId)}`)).removed,
      reset: (scope) => request("POST", "/namespace/reset", { scope }),
      list: ({ path, first, after, signal }) => request("GET", `/namespace/list?path=${encodeURIComponent(path)}&first=${first}${after === undefined ? "" : `&after=${encodeURIComponent(after)}`}`, undefined, signal),
      explain: ({ path, signal }) => request("GET", `/namespace/explain?path=${encodeURIComponent(path)}`, undefined, signal),
    },
  };

  async function requestOptional<T>(method: string, path: string): Promise<T | undefined> {
    const response = await requestResponse(method, path);
    if (response.status === 404) return undefined;
    return parseResponse<T>(response);
  }

  async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return parseResponse<T>(await requestResponse(method, path, body, signal));
  }

  async function requestResponse(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<Response> {
    return fetcher(`${trimSlash(options.baseUrl)}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.authorizationToken === undefined ? {} : { Authorization: `Bearer ${options.authorizationToken}` }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal === undefined ? {} : { signal }),
    });
  }
}

function createRequester(fetcher: typeof fetch, authorizationToken?: string): typeof fetch {
  return (input, init) => fetcher(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(authorizationToken === undefined ? {} : { Authorization: `Bearer ${authorizationToken}` }),
    },
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const value: unknown = text.length === 0 ? undefined : JSON.parse(text);
  if (response.ok) return value as T;
  const body = record(record(value)?.error);
  const code = communityErrorCode(body?.code);
  throw new CommunityError(code, typeof body?.message === "string" ? body.message : "Community API request failed");
}

function communityErrorCode(value: unknown): CommunityErrorCode {
  const known: readonly CommunityErrorCode[] = [
    "QUERY_SYNTAX", "QUERY_UNKNOWN_FIELD", "QUERY_INVALID_OPERATOR", "QUERY_COST_LIMIT", "QUERY_UNSUPPORTED_SOURCE",
    "CURSOR_INVALID", "CURSOR_STALE", "PROJECTION_INVALID", "PROJECTION_CYCLE", "PROJECTION_COLLISION",
    "NAMESPACE_MOUNT_CONFLICT", "NAMESPACE_RECOVERY_PROTECTED", "SOURCE_PARTIAL", "SOURCE_UNAVAILABLE", "INDEX_STALE",
    "INDEX_LOCKED", "INDEX_QUOTA", "AUTHORIZATION_DENIED", "PERSISTENCE_MIGRATION", "INVALID_ENTITY", "INVALID_FIELD",
    "CRYPTO_UNAVAILABLE", "INTERNAL",
  ];
  return typeof value === "string" && known.includes(value as CommunityErrorCode) ? value as CommunityErrorCode : "INTERNAL";
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}

function trimSlash(value: string): string { return value.endsWith("/") ? value.slice(0, -1) : value; }
