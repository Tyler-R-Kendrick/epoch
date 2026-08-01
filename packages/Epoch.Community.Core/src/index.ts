export type CommunityWorkflowId =
  | "repository-browsing"
  | "issue-tracking"
  | "change-review"
  | "discussion-threads"
  | "maintainer-profiles"
  | "release-discovery"
  | "organization-spaces";

export type CommunityIssueStatus = "open" | "closed";
export type CommunityProposalStatus = "open" | "approved" | "changes-requested" | "closed";
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
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly visibility: "public" | "private" | "unlisted";
  readonly defaultView: string;
  readonly maintainers: readonly string[];
  readonly topics: readonly string[];
  readonly issues: readonly CommunityIssue[];
  readonly changeProposals: readonly CommunityChangeProposal[];
  readonly discussions: readonly CommunityDiscussion[];
}

export interface OpenCommunityIssueInput {
  readonly id?: string;
  readonly title: string;
  readonly author: string;
  readonly body?: string;
  readonly labels?: readonly string[];
}

export interface CommunityIssue {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly body: string;
  readonly labels: readonly string[];
  readonly status: CommunityIssueStatus;
  readonly comments: readonly CommunityComment[];
}

export interface ProposeCommunityChangeInput {
  readonly id?: string;
  readonly title: string;
  readonly author: string;
  readonly body?: string;
  readonly sourceView: string;
  readonly targetView: string;
}

export interface CommunityChangeProposal {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly body: string;
  readonly sourceView: string;
  readonly targetView: string;
  readonly status: CommunityProposalStatus;
  readonly reviews: readonly CommunityReview[];
}

export interface CommunityReviewInput {
  readonly reviewer: string;
  readonly decision: CommunityReviewDecision;
  readonly body?: string;
}

export interface CommunityReview {
  readonly reviewer: string;
  readonly decision: CommunityReviewDecision;
  readonly body: string;
}

export interface CommunityDiscussion {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly comments: readonly CommunityComment[];
}

export interface CommunityComment {
  readonly author: string;
  readonly body: string;
}

export interface CommentOnCommunityIssueInput {
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
  proposeChange(slug: string, input: ProposeCommunityChangeInput): Promise<CommunityRepository>;
  reviewChange(slug: string, proposalId: string, input: CommunityReviewInput): Promise<CommunityRepository>;
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
    proposeChange: (slug, input) => transport.proposeChange(slug, input),
    reviewChange: (slug, proposalId, input) => transport.reviewChange(slug, proposalId, input),
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
    proposeChange: (slug, input) => request("POST", `${repositoryPath(slug)}/changes`, input),
    reviewChange: (slug, proposalId, input) => request("POST", `${repositoryPath(slug)}/changes/${encodeURIComponent(proposalId)}/reviews`, input),
  });
}

function createCommunityHttpRequester(options: CreateHttpCommunityClientOptions) {
  const fetcher = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl.slice(0, -1) : options.baseUrl;

  return async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const parsed = text.length === 0 ? undefined : JSON.parse(text) as unknown;
    if (!response.ok) {
      const message = errorMessage(parsed) ?? response.statusText;
      throw new Error(`Community API request failed (${response.status}): ${message}`);
    }

    return parsed as T;
  };
}

function repositoryPath(slug: string): string {
  return `/repositories/${encodeURIComponent(slug)}`;
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = (value as { readonly error?: unknown }).error;
    return typeof error === "string" ? error : undefined;
  }

  return undefined;
}
