import {
  ConvergenceWorkbench,
  type ConvergenceChange,
  type ConvergenceWorkbenchSnapshot,
  type MutationAuthority,
  type PartialMergePlan,
} from "@epoch/community-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


export interface CommunityConvergenceApi {
  getSnapshot(): ConvergenceWorkbenchSnapshot;
  planPartialMerge(changeId: string): PartialMergePlan;
  squash(plan: PartialMergePlan, authority: MutationAuthority): ConvergenceChange;
}

export interface CommunityConvergenceRequestAuthorization {
  readonly principalId: string;
  readonly authorities: readonly string[];
}

export interface CommunityConvergenceFetchHandlerOptions {
  /** Resolves authenticated identity from a trusted host/session boundary. */
  readonly resolveAuthorization?: (
    request: Request,
  ) => CommunityConvergenceRequestAuthorization | Promise<CommunityConvergenceRequestAuthorization>;
}

export function createInMemoryCommunityConvergenceApi(snapshot: ConvergenceWorkbenchSnapshot): CommunityConvergenceApi {
  const workbench = new ConvergenceWorkbench(snapshot);
  return {
    getSnapshot: () => workbench.snapshot(),
    planPartialMerge: (changeId) => workbench.planPartialMerge(changeId),
    squash: (plan, authority) => workbench.squash(plan, authority),
  };
}

/** A small fetch adapter for static/local hosts; mutation authority stays in the domain service. */
export function createCommunityConvergenceFetchHandler(
  api: CommunityConvergenceApi,
  options: CommunityConvergenceFetchHandlerOptions = {},
): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/convergence") return json(api.getSnapshot());
    if (request.method === "POST" && url.pathname === "/convergence/merge-preview") {
      const body = await objectBody(request);
      return json(api.planPartialMerge(requiredString(body, "changeId")));
    }
    if (request.method === "POST" && url.pathname === "/convergence/squash") {
      const body = await objectBody(request);
      const authorization = await options.resolveAuthorization?.(request);
      if (authorization === undefined) {
        return json({ error: "Squash requires authenticated authority from trusted request context." }, 403);
      }
      if (!authorization.authorities.includes("maintainer.merge")) {
        return json({
          error: `${authorization.principalId} lacks required authority maintainer.merge.`,
          principalId: authorization.principalId,
        }, 403);
      }
      const preview = api.planPartialMerge(requiredString(body, "changeId"));
      return json(api.squash(preview, {
        authority: "maintainer.merge",
        confirmed: body.confirmed === true,
      }));
    }
    return json({ error: "Community convergence route not found" }, 404);
  };
}

async function objectBody(request: Request): Promise<Record<string, DictionaryValue>> {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const value = await request.json() as unknown;
  if (!__epochIsObject(value) || value === null || Array.isArray(value)) throw new Error("Request body must be an object.");
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return value as Record<string, DictionaryValue>;
}

function requiredString(value: Readonly<Record<string, DictionaryValue>>, field: string): string {
  const result = value[field];
  if (!__epochIsString(result) || result.trim() === "") throw new Error(`${field} must be a non-empty string.`);
  return result;
}

function json(value: BoundaryValue, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
