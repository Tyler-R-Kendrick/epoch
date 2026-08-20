import type { CommunityMessage, CommunityThreadRelations } from "./graph";
import type { CommunityObjectRef } from "./identity";
import type { CommunityAuthorizationContext } from "./authorization";

export * from "./authorization";
export * from "./actions";
export * from "./convergence";
export * from "./entity";
export * from "./errors";
export * from "./fields";
export * from "./graph";
export * from "./identity";
export * from "./navigation";
export * from "./query";
export * from "./runtime-context";
export * from "./cursor";
export * from "./query-evaluator";
export * from "./search-backend";
export * from "./search-plan";
export * from "./search-service";
export * from "./snapshot";
export * from "./source";
export * from "./namespace";
export * from "./projection-definition";
export * from "./projection-compiler";
export * from "./projection-delta";
export * from "./projection-runtime";
export * from "./entity-projection-runtime";
export * from "./builtin-projections";
export * from "./channel";

export type CommunityWorkflowId =
  | "repository-browsing"
  | "issue-tracking"
  | "change-review"
  | "discussion-threads"
  | "maintainer-profiles"
  | "release-discovery"
  | "organization-spaces";

export type CommunityIssueStatus = "open" | "closed";
export type CommunityChangeStatus = "open" | "approved" | "changes-requested" | "closed";
export type CommunityReviewDecision = "approved" | "changes-requested" | "commented";

export interface CommunityWorkflow {
  readonly id: CommunityWorkflowId;
  readonly label: string;
  readonly purpose: string;
}

export interface CreateCommunityRepositoryInput {
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly visibility?: "public" | "private" | "unlisted";
  readonly defaultView?: string;
  readonly maintainers: readonly string[];
  readonly topics?: readonly string[];
}

export interface CommunityRepository {
  readonly ref?: CommunityObjectRef;
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly visibility: "public" | "private" | "unlisted";
  readonly defaultView: string;
  readonly maintainers: readonly string[];
  readonly topics: readonly string[];
  readonly issues: readonly CommunityIssue[];
  readonly changes: readonly CommunityChange[];
  readonly discussions: readonly CommunityDiscussion[];
}

/**
 * Native identity for a social record.
 *
 * A forge that only stores its own ids can describe repository truth but never
 * point at it. These fields carry the Epoch change and revision a record *is*:
 * `changeId` is the record's stable lineage, `revisionIds` its append-only
 * edits, and `baseRef` the ref the record was authored against. They are
 * optional because projections built before a record was bound predate them —
 * an absent binding must read as "not bound yet", never as "no history".
 */
export interface CommunityNativeBinding {
  readonly changeId?: string;
  readonly revisionIds?: readonly string[];
  readonly baseRef?: string;
  readonly edited?: boolean;
}

export interface OpenCommunityIssueInput {
  readonly id?: string;
  readonly title: string;
  readonly author: string;
  readonly body?: string;
  readonly labels?: readonly string[];
}

export interface CommunityIssue extends CommunityNativeBinding {
  readonly id: string;
  readonly ref?: CommunityObjectRef;
  readonly title: string;
  readonly author: string;
  readonly body: string;
  readonly labels: readonly string[];
  readonly status: CommunityIssueStatus;
  readonly comments: readonly CommunityComment[];
}

export interface CreateCommunityChangeInput {
  readonly id?: string;
  readonly title: string;
  readonly author: string;
  readonly body?: string;
  readonly sourceView: string;
  readonly targetView: string;
}

export interface CommunityChange extends CommunityNativeBinding {
  readonly id: string;
  readonly ref?: CommunityObjectRef;
  readonly title: string;
  readonly author: string;
  readonly body: string;
  readonly sourceView: string;
  readonly targetView: string;
  readonly status: CommunityChangeStatus;
  readonly reviews: readonly CommunityReview[];
}

export interface CommunityReviewInput {
  readonly reviewer: string;
  readonly decision: CommunityReviewDecision;
  readonly body?: string;
}

export interface CommunityReview extends CommunityNativeBinding {
  readonly reviewer: string;
  readonly decision: CommunityReviewDecision;
  readonly body: string;
}

export interface CommunityDiscussion {
  readonly id: string;
  readonly ref?: CommunityObjectRef;
  readonly title: string;
  readonly author: string;
  readonly comments: readonly CommunityComment[];
}

export interface CommunityComment extends CommunityNativeBinding {
  readonly id?: string;
  readonly ref?: CommunityObjectRef;
  readonly author: string;
  readonly body: string;
}

export interface CommentOnCommunityIssueInput {
  readonly id?: string;
  readonly author: string;
  readonly body: string;
}

export interface CommunityApiTransport {
  listWorkflows(): Promise<readonly CommunityWorkflow[]>;
  listRepositories(): Promise<readonly CommunityRepository[]>;
  getRepository(slug: string): Promise<CommunityRepository>;
  createRepository(input: CreateCommunityRepositoryInput): Promise<CommunityRepository>;
  openIssue(slug: string, input: OpenCommunityIssueInput): Promise<CommunityRepository>;
  commentOnIssue(slug: string, issueId: string, input: CommentOnCommunityIssueInput): Promise<CommunityRepository>;
  createChange(slug: string, input: CreateCommunityChangeInput): Promise<CommunityRepository>;
  reviewChange(slug: string, changeId: string, input: CommunityReviewInput): Promise<CommunityRepository>;
  getObject(objectId: string, authorization?: CommunityAuthorizationContext): Promise<CommunityMessage>;
  updateObjectState(objectId: string, state: string, authorization?: CommunityAuthorizationContext): Promise<CommunityMessage>;
  listThreadRelations(objectId: string, authorization?: CommunityAuthorizationContext): Promise<CommunityThreadRelations>;
}

export type CommunityClient = CommunityApiTransport;

export interface CreateHttpCommunityClientOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
}

export function createCommunityClient(transport: CommunityApiTransport): CommunityClient {
  return {
    listWorkflows: () => transport.listWorkflows(),
    listRepositories: () => transport.listRepositories(),
    getRepository: (slug) => transport.getRepository(slug),
    createRepository: (input) => transport.createRepository(input),
    openIssue: (slug, input) => transport.openIssue(slug, input),
    commentOnIssue: (slug, issueId, input) => transport.commentOnIssue(slug, issueId, input),
    createChange: (slug, input) => transport.createChange(slug, input),
    reviewChange: (slug, changeId, input) => transport.reviewChange(slug, changeId, input),
    getObject: (objectId, authorization) => transport.getObject(objectId, authorization),
    updateObjectState: (objectId, state, authorization) => transport.updateObjectState(objectId, state, authorization),
    listThreadRelations: (objectId, authorization) => transport.listThreadRelations(objectId, authorization),
  };
}

export function createHttpCommunityClient(options: CreateHttpCommunityClientOptions): CommunityClient {
  const request = createCommunityHttpRequester(options);

  return createCommunityClient({
    listWorkflows: () => request("GET", "/workflows"),
    listRepositories: () => request("GET", "/repositories"),
    getRepository: (slug) => request("GET", repositoryPath(slug)),
    createRepository: (input) => request("POST", "/repositories", input),
    openIssue: (slug, input) => request("POST", `${repositoryPath(slug)}/issues`, input),
    commentOnIssue: (slug, issueId, input) => request("POST", `${repositoryPath(slug)}/issues/${encodeURIComponent(issueId)}/comments`, input),
    createChange: (slug, input) => request("POST", `${repositoryPath(slug)}/changes`, input),
    reviewChange: (slug, changeId, input) => request("POST", `${repositoryPath(slug)}/changes/${encodeURIComponent(changeId)}/reviews`, input),
    getObject: (objectId) => request("GET", `/objects/${encodeURIComponent(objectId)}`),
    updateObjectState: (objectId, state) => request("PATCH", `/objects/${encodeURIComponent(objectId)}/state`, { state }),
    listThreadRelations: (objectId) => request("GET", `/objects/${encodeURIComponent(objectId)}/thread`),
  });
}

function createCommunityHttpRequester(options: CreateHttpCommunityClientOptions) {
  const fetcher = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl.slice(0, -1) : options.baseUrl;

  return async function request<T, Body = never>(method: string, path: string, body?: Body): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const response = await fetcher(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    // SAFETY: Community HTTP responses are required to contain JSON values.
    const parsed = text.length === 0 ? undefined : JSON.parse(text) as JsonValue;
    if (!response.ok) {
      const message = errorMessage(parsed) ?? response.statusText;
      throw new Error(`Community API request failed (${response.status}): ${message}`);
    }

    // SAFETY: The surrounding validation and domain contract establish the asserted type.
    return parsed as T;
  };
}

function repositoryPath(slug: string): string {
  return `/repositories/${encodeURIComponent(slug)}`;
}

type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];
interface JsonObject { readonly [key: string]: JsonValue }

function errorMessage(value: JsonValue | undefined): string | undefined {
  if (!isJsonObject(value)) return undefined;
  const error = value.error;
  return isString(error) ? error : undefined;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: JsonValue | undefined): value is string {
  return typeof value === "string";
}
