import {
  ConvergenceWorkbench,
  type ConvergenceChange,
  type ConvergenceWorkbenchSnapshot,
  type MutationAuthority,
  type PartialMergePlan,
} from "@epoch/community-core";

export interface CommunityConvergenceApi {
  getSnapshot(): ConvergenceWorkbenchSnapshot;
  planPartialMerge(changeId: string): PartialMergePlan;
  squash(plan: PartialMergePlan, authority: MutationAuthority): ConvergenceChange;
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
export function createCommunityConvergenceFetchHandler(api: CommunityConvergenceApi): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/convergence") return json(api.getSnapshot());
    if (request.method === "POST" && url.pathname === "/convergence/merge-preview") {
      const body = await objectBody(request);
      return json(api.planPartialMerge(requiredString(body, "changeId")));
    }
    if (request.method === "POST" && url.pathname === "/convergence/squash") {
      const body = await objectBody(request);
      const preview = api.planPartialMerge(requiredString(body, "changeId"));
      return json(api.squash(preview, {
        authority: requiredString(body, "authority"),
        confirmed: body.confirmed === true,
      }));
    }
    return json({ error: "Community convergence route not found" }, 404);
  };
}

async function objectBody(request: Request): Promise<Record<string, unknown>> {
  const value = await request.json() as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Request body must be an object.");
  return value as Record<string, unknown>;
}

function requiredString(value: Readonly<Record<string, unknown>>, field: string): string {
  const result = value[field];
  if (typeof result !== "string" || result.trim() === "") throw new Error(`${field} must be a non-empty string.`);
  return result;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
