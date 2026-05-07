import type {
  CommunityApiTransport,
  CommunityChangeProposal,
  CommunityProposalStatus,
  CommunityRepository,
  CommunityReview,
  CommunityReviewInput,
  CommunityWorkflow,
  CreateCommunityRepositoryInput,
  OpenCommunityIssueInput,
  ProposeCommunityChangeInput,
} from "@epoch/community-core";

export interface CreateInMemoryCommunityApiOptions {
  readonly repositories?: readonly CreateCommunityRepositoryInput[];
}

const workflowCatalog: readonly CommunityWorkflow[] = [
  {
    id: "repository-browsing",
    label: "Repositories",
    purpose: "Browse Epoch repositories, views, versions, and signed activity.",
  },
  {
    id: "issue-tracking",
    label: "Issues",
    purpose: "Discuss bugs, tasks, and product work in repository-owned threads.",
  },
  {
    id: "change-review",
    label: "Change Reviews",
    purpose: "Review Epoch intents and view proposals with maintainer decisions.",
  },
  {
    id: "discussion-threads",
    label: "Discussions",
    purpose: "Host durable community conversations separate from deployment operations.",
  },
  {
    id: "maintainer-profiles",
    label: "Profiles",
    purpose: "Represent contributors and maintainers with community-facing identity.",
  },
  {
    id: "release-discovery",
    label: "Releases",
    purpose: "Surface signed Epoch versions for people who want to consume projects.",
  },
  {
    id: "organization-spaces",
    label: "Organizations",
    purpose: "Group repositories, contributors, and community policy under shared spaces.",
  },
];

export function createInMemoryCommunityApi(
  options: CreateInMemoryCommunityApiOptions = {},
): CommunityApiTransport {
  const repositories = new Map<string, CommunityRepository>();
  for (const input of options.repositories ?? []) {
    const repository = createCommunityRepository(input);
    repositories.set(repository.slug, repository);
  }

  return {
    async listWorkflows() {
      return communityWorkflowCatalog();
    },
    async listRepositories() {
      return [...repositories.values()].map(cloneRepository);
    },
    async getRepository(slug: string) {
      return cloneRepository(repositoryBySlug(repositories, slug));
    },
    async createRepository(input: CreateCommunityRepositoryInput) {
      if (repositories.has(input.slug)) {
        throw new Error(`Community repository already exists: ${input.slug}`);
      }

      const repository = createCommunityRepository(input);
      repositories.set(repository.slug, repository);
      return cloneRepository(repository);
    },
    async openIssue(slug: string, input: OpenCommunityIssueInput) {
      const current = repositoryBySlug(repositories, slug);
      const issue = {
        id: input.id ?? `ISSUE-${current.issues.length + 1}`,
        title: input.title,
        author: input.author,
        body: input.body ?? "",
        labels: [...(input.labels ?? [])],
        status: "open" as const,
        comments: [],
      };
      const repository = replaceRepository(repositories, {
        ...current,
        issues: [...current.issues, issue],
      });
      return cloneRepository(repository);
    },
    async proposeChange(slug: string, input: ProposeCommunityChangeInput) {
      const current = repositoryBySlug(repositories, slug);
      const proposal: CommunityChangeProposal = {
        id: input.id ?? `CHANGE-${current.changeProposals.length + 1}`,
        title: input.title,
        author: input.author,
        body: input.body ?? "",
        sourceView: input.sourceView,
        targetView: input.targetView,
        status: "open",
        reviews: [],
      };
      const repository = replaceRepository(repositories, {
        ...current,
        changeProposals: [...current.changeProposals, proposal],
      });
      return cloneRepository(repository);
    },
    async reviewChange(slug: string, proposalId: string, input: CommunityReviewInput) {
      const current = repositoryBySlug(repositories, slug);
      let found = false;
      const changeProposals = current.changeProposals.map((proposal) => {
        if (proposal.id !== proposalId) {
          return proposal;
        }

        found = true;
        const reviews = [...proposal.reviews, {
          reviewer: input.reviewer,
          decision: input.decision,
          body: input.body ?? "",
        }];

        return {
          ...proposal,
          status: proposalStatusForReviews(reviews),
          reviews,
        };
      });

      if (!found) {
        throw new Error(`Community change proposal not found: ${proposalId}`);
      }

      const repository = replaceRepository(repositories, {
        ...current,
        changeProposals,
      });
      return cloneRepository(repository);
    },
  };
}

export function createCommunityApiFetchHandler(
  api: CommunityApiTransport,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

      if (request.method === "GET" && url.pathname === "/workflows") {
        return json(await api.listWorkflows());
      }

      if (request.method === "GET" && url.pathname === "/repositories") {
        return json(await api.listRepositories());
      }

      if (request.method === "POST" && url.pathname === "/repositories") {
        return json(await api.createRepository(await request.json() as CreateCommunityRepositoryInput), 201);
      }

      if (segments[0] === "repositories" && segments[1] !== undefined && segments.length === 2 && request.method === "GET") {
        return json(await api.getRepository(segments[1]));
      }

      if (segments[0] === "repositories" && segments[1] !== undefined && segments[2] === "issues" && segments.length === 3 && request.method === "POST") {
        return json(await api.openIssue(segments[1], await request.json() as OpenCommunityIssueInput), 201);
      }

      if (segments[0] === "repositories" && segments[1] !== undefined && segments[2] === "changes" && segments.length === 3 && request.method === "POST") {
        return json(await api.proposeChange(segments[1], await request.json() as ProposeCommunityChangeInput), 201);
      }

      if (
        segments[0] === "repositories"
        && segments[1] !== undefined
        && segments[2] === "changes"
        && segments[3] !== undefined
        && segments[4] === "reviews"
        && segments.length === 5
        && request.method === "POST"
      ) {
        return json(await api.reviewChange(segments[1], segments[3], await request.json() as CommunityReviewInput), 201);
      }

      return json({ error: "not found" }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, statusForError(error));
    }
  };
}

export function communityWorkflowCatalog(): readonly CommunityWorkflow[] {
  return workflowCatalog.map((workflow) => ({ ...workflow }));
}

export function createCommunityRepository(input: CreateCommunityRepositoryInput): CommunityRepository {
  if (input.maintainers.length === 0) {
    throw new Error("Community repositories require at least one maintainer");
  }

  return {
    slug: input.slug,
    displayName: input.displayName,
    description: input.description,
    visibility: input.visibility ?? "public",
    defaultView: input.defaultView ?? "main",
    maintainers: [...input.maintainers],
    topics: [...(input.topics ?? [])],
    issues: [],
    changeProposals: [],
    discussions: [],
  };
}

function repositoryBySlug(
  repositories: ReadonlyMap<string, CommunityRepository>,
  slug: string,
): CommunityRepository {
  const repository = repositories.get(slug);
  if (repository === undefined) {
    throw new Error(`Community repository not found: ${slug}`);
  }

  return repository;
}

function replaceRepository(
  repositories: Map<string, CommunityRepository>,
  repository: CommunityRepository,
): CommunityRepository {
  repositories.set(repository.slug, repository);
  return repository;
}

function cloneRepository(repository: CommunityRepository): CommunityRepository {
  return {
    ...repository,
    maintainers: [...repository.maintainers],
    topics: [...repository.topics],
    issues: repository.issues.map((issue) => ({
      ...issue,
      labels: [...issue.labels],
      comments: issue.comments.map((comment) => ({ ...comment })),
    })),
    changeProposals: repository.changeProposals.map((proposal) => ({
      ...proposal,
      reviews: proposal.reviews.map((review) => ({ ...review })),
    })),
    discussions: repository.discussions.map((discussion) => ({
      ...discussion,
      comments: discussion.comments.map((comment) => ({ ...comment })),
    })),
  };
}

function proposalStatusForReviews(reviews: readonly CommunityReview[]): CommunityProposalStatus {
  if (reviews.some((review) => review.decision === "changes-requested")) {
    return "changes-requested";
  }

  if (reviews.some((review) => review.decision === "approved")) {
    return "approved";
  }

  return "open";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("already exists")) return 409;
  if (message.includes("not found")) return 404;
  return 400;
}
