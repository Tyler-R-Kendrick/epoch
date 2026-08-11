import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  CommunityAuthorizationContext,
  CommentOnCommunityIssueInput,
  CommunityApiTransport,
  CommunityChangeProposal,
  CommunityComment,
  CommunityDiscussion,
  CommunityIssue,
  CommunityMessage,
  CommunityObjectKind,
  CommunityObjectRef,
  CommunityProposalStatus,
  CommunityRepository,
  CommunityReview,
  CommunityReviewInput,
  CommunityWorkflow,
  CreateCommunityRepositoryInput,
  OpenCommunityIssueInput,
  ProposeCommunityChangeInput,
  SavedProjection,
  SaveProjectionInput,
} from "@epoch/community-core";
import {
  createMessageGraph,
  createProjection,
  canReadCommunityResource,
  hasCommunityPermission,
  matchesNormalizedQuery,
  migrateNormalizedQuery,
  threadRelations,
  validateObjectRef,
  validateProjectionId,
} from "@epoch/community-core";

function newObjectRef(kind: CommunityObjectKind): CommunityObjectRef {
  return { objectId: randomUUID(), kind };
}

export interface CreateInMemoryCommunityApiOptions {
  readonly repositories?: readonly CreateCommunityRepositoryInput[];
  readonly messages?: readonly CommunityMessage[];
  readonly projections?: readonly SavedProjection[];
  readonly authorizeObject?: (message: CommunityMessage, authorization: CommunityAuthorizationContext) => boolean;
  /**
   * When set, load repository state from this JSON file on boot and rewrite it
   * after every mutating API call so local/dev servers survive process restarts.
   */
  readonly persistencePath?: string;
}

export interface CommunityApiPersistedState {
  readonly schemaVersion: 2;
  readonly repositories: readonly CommunityRepository[];
  readonly objects: readonly CommunityMessage[];
  readonly projections: readonly SavedProjection[];
}

interface LegacyCommunityApiPersistedState {
  readonly schemaVersion: 1;
  readonly repositories: readonly CommunityRepository[];
}

export interface CreateCommunityApiFetchHandlerOptions {
  readonly resolveAuthorization?: (request: Request) => CommunityAuthorizationContext | Promise<CommunityAuthorizationContext>;
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
  const objects = new Map<string, CommunityMessage>();
  const projections = new Map<string, SavedProjection>();
  const persistencePath = options.persistencePath;
  const authorizeObject = options.authorizeObject ?? defaultObjectAuthorization;

  if (persistencePath !== undefined && existsSync(persistencePath)) {
    loadPersistedState(persistencePath, repositories, objects, projections);
    persistCommunityState(persistencePath, repositories, objects, projections);
  } else {
    for (const input of options.repositories ?? []) {
      const repository = createCommunityRepository(input);
      repositories.set(repository.slug, repository);
    }
    for (const message of options.messages ?? []) {
      const ref = validateObjectRef(message.ref);
      if (objects.has(ref.objectId)) throw new Error(`Duplicate community object ID: ${ref.objectId}`);
      objects.set(ref.objectId, cloneMessage(message));
    }
    for (const projection of options.projections ?? []) {
      validateSavedProjection(projection);
      projections.set(projection.projectionId, cloneSavedProjection(projection));
    }
    if (persistencePath !== undefined) {
      persistCommunityState(persistencePath, repositories, objects, projections);
    }
  }

  const persist = (): void => {
    if (persistencePath !== undefined) {
      persistCommunityState(persistencePath, repositories, objects, projections);
    }
  };

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
      persist();
      return cloneRepository(repository);
    },
    async openIssue(slug: string, input: OpenCommunityIssueInput) {
      const current = repositoryBySlug(repositories, slug);
      const ref = newObjectRef("issue");
      const issue = {
        id: input.id ?? `ISSUE-${current.issues.length + 1}`,
        ref,
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
      objects.set(ref.objectId, repositoryIssueMessage(repository, issue));
      persist();
      return cloneRepository(repository);
    },
    async commentOnIssue(slug: string, issueId: string, input: CommentOnCommunityIssueInput) {
      const current = repositoryBySlug(repositories, slug);
      let found = false;
      const issues = current.issues.map((issue) => {
        if (issue.id !== issueId) {
          return issue;
        }
        found = true;
        const ref = newObjectRef("message");
        const comment = {
          id: input.id ?? `COMMENT-${randomUUID()}`,
          ref,
          author: input.author,
          body: input.body,
        };
        objects.set(ref.objectId, repositoryCommentMessage(current, issue, comment));
        return {
          ...issue,
          comments: [...issue.comments, comment],
        };
      });
      if (!found) {
        throw new Error(`Community issue not found: ${issueId}`);
      }
      const repository = replaceRepository(repositories, {
        ...current,
        issues,
      });
      persist();
      return cloneRepository(repository);
    },
    async proposeChange(slug: string, input: ProposeCommunityChangeInput) {
      const current = repositoryBySlug(repositories, slug);
      const ref = newObjectRef("change");
      const proposal: CommunityChangeProposal = {
        id: input.id ?? `CHANGE-${current.changeProposals.length + 1}`,
        ref,
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
      objects.set(ref.objectId, repositoryChangeMessage(repository, proposal));
      persist();
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
      const updatedProposal = changeProposals.find((proposal) => proposal.id === proposalId);
      if (updatedProposal?.ref !== undefined) {
        const currentObject = objects.get(updatedProposal.ref.objectId);
        if (currentObject !== undefined) objects.set(currentObject.ref.objectId, { ...currentObject, state: updatedProposal.status });
      }
      persist();
      return cloneRepository(repository);
    },
    async getObject(objectId: string, authorization: CommunityAuthorizationContext = {}) {
      return cloneMessage(authorizeMessage(objectById(objects, objectId), authorization, authorizeObject));
    },
    async updateObjectState(objectId: string, state: string, authorization: CommunityAuthorizationContext = {}) {
      if (state.trim().length === 0) throw new Error("Community object state cannot be empty");
      const current = authorizeMessage(objectById(objects, objectId), authorization, authorizeObject);
      if (!hasCommunityPermission(authorization, "object:state:write")) {
        throw new Error("Community object state permission denied");
      }
      const updated = { ...current, state };
      objects.set(objectId, updated);
      persist();
      return cloneMessage(updated);
    },
    async listThreadRelations(objectId: string, authorization: CommunityAuthorizationContext = {}) {
      const current = authorizeMessage(objectById(objects, objectId), authorization, authorizeObject);
      const visible = authorizedGraphMessages([...objects.values()], authorization, authorizeObject);
      return threadRelations(createMessageGraph(visible), current.ref);
    },
    async listProjections(authorization: CommunityAuthorizationContext = {}) {
      return [...projections.values()]
        .filter((projection) => canAccessProjection(projection, authorization))
        .map((projection) => projectionForViewer(projection, authorization));
    },
    async getProjection(projectionId: string, authorization: CommunityAuthorizationContext = {}) {
      const saved = projectionById(projections, projectionId, authorization);
      const messages = [...objects.values()].filter((message) =>
        authorizeObject(message, authorization) && (saved.query === undefined || matchesNormalizedQuery(message, saved.query)));
      return createProjection(projectionForViewer(saved, authorization), messages.map((message) => ({
        ref: message.ref,
        alias: message.aliases[0] ?? message.ref.objectId,
        aliasPath: `/views/${saved.projectionId}/${message.aliases[0] ?? message.ref.objectId}`,
        ...(message.inReplyTo === undefined ? {} : { parentRef: message.inReplyTo }),
        capabilities: capabilitiesFor(message),
      })));
    },
    async saveProjection(input: SaveProjectionInput, authorization: CommunityAuthorizationContext = {}) {
      requireOwner(input.ownerId, authorization);
      validateProjectionId(input.projection.projectionId);
      const existing = projections.get(input.projection.projectionId);
      if (existing !== undefined && existing.ownerId !== input.ownerId) throw new Error("Saved projection permission denied");
      const now = new Date().toISOString();
      const query = input.projection.query === undefined ? undefined : migrateNormalizedQuery(input.projection.query);
      if (query?.error !== undefined) throw new Error(`Invalid saved projection query: ${query.error}`);
      const saved: SavedProjection = {
        ...input.projection,
        ...(query === undefined ? {} : { query, queryLanguageVersion: query.version }),
        ownerId: input.ownerId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      validateSavedProjection(saved);
      projections.set(saved.projectionId, saved);
      persist();
      return cloneSavedProjection(saved);
    },
    async deleteProjection(projectionId: string, authorization: CommunityAuthorizationContext = {}) {
      const projection = projectionById(projections, projectionId, authorization);
      requireOwner(projection.ownerId, authorization);
      projections.delete(projectionId);
      persist();
    },
  };
}

function loadPersistedState(
  persistencePath: string,
  repositories: Map<string, CommunityRepository>,
  objects: Map<string, CommunityMessage>,
  projections: Map<string, SavedProjection>,
): void {
  let parsed: CommunityApiPersistedState | LegacyCommunityApiPersistedState;
  try {
    parsed = JSON.parse(readFileSync(persistencePath, "utf8")) as CommunityApiPersistedState | LegacyCommunityApiPersistedState;
  } catch (error) {
    throw new Error(`Invalid Community API persistence file ${persistencePath}; restore a valid export or remove the file to reset`, { cause: error });
  }
  if (![1, 2].includes(parsed.schemaVersion) || !Array.isArray(parsed.repositories)) {
    throw new Error(`Unsupported Community API persistence schema in ${persistencePath}; update Epoch or restore a compatible export`);
  }
  for (const repository of parsed.repositories) {
    const migrated = migrateRepository(repository);
    repositories.set(migrated.slug, migrated);
  }
  if (parsed.schemaVersion === 2) {
    if (!Array.isArray(parsed.objects) || !Array.isArray(parsed.projections)) {
      throw new Error(`Invalid Community API persistence collections in ${persistencePath}`);
    }
    for (const message of parsed.objects) {
      const ref = validateObjectRef(message.ref);
      if (objects.has(ref.objectId)) throw new Error(`Duplicate persisted community object: ${ref.objectId}`);
      objects.set(ref.objectId, cloneMessage(message));
    }
    for (const projection of parsed.projections) {
      const migrated = migrateSavedProjection(projection);
      if (projections.has(migrated.projectionId)) throw new Error(`Duplicate persisted projection: ${migrated.projectionId}`);
      projections.set(migrated.projectionId, migrated);
    }
  }
  for (const repository of repositories.values()) {
    for (const message of repositoryMessages(repository)) {
      if (!objects.has(message.ref.objectId)) objects.set(message.ref.objectId, message);
    }
  }
}

function persistCommunityState(
  persistencePath: string,
  repositories: ReadonlyMap<string, CommunityRepository>,
  objects: ReadonlyMap<string, CommunityMessage>,
  projections: ReadonlyMap<string, SavedProjection>,
): void {
  mkdirSync(path.dirname(persistencePath), { recursive: true });
  const body: CommunityApiPersistedState = {
    schemaVersion: 2,
    repositories: [...repositories.values()].map(cloneRepository),
    objects: [...objects.values()].map(cloneMessage),
    projections: [...projections.values()].map(cloneSavedProjection),
  };
  writeFileSync(persistencePath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

export function createCommunityApiFetchHandler(
  api: CommunityApiTransport,
  options: CreateCommunityApiFetchHandlerOptions = {},
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const authorization = await (options.resolveAuthorization?.(request) ?? {});

      if (request.method === "GET" && url.pathname === "/workflows") {
        return json(await api.listWorkflows());
      }

      if (request.method === "GET" && url.pathname === "/repositories") {
        return json(await api.listRepositories());
      }

      if (request.method === "POST" && url.pathname === "/repositories") {
        return json(await api.createRepository(await request.json() as CreateCommunityRepositoryInput), 201);
      }

      if (request.method === "GET" && url.pathname === "/projections") {
        return json(await api.listProjections(authorization));
      }

      if (request.method === "POST" && url.pathname === "/projections") {
        return json(await api.saveProjection(await request.json() as SaveProjectionInput, authorization), 201);
      }

      if (segments[0] === "projections" && segments[1] !== undefined && segments.length === 2) {
        if (request.method === "GET") return json(await api.getProjection(segments[1], authorization));
        if (request.method === "DELETE") {
          await api.deleteProjection(segments[1], authorization);
          return new Response(null, { status: 204 });
        }
      }

      if (segments[0] === "objects" && segments[1] !== undefined) {
        if (segments.length === 2 && request.method === "GET") return json(await api.getObject(segments[1], authorization));
        if (segments.length === 3 && segments[2] === "thread" && request.method === "GET") {
          return json(await api.listThreadRelations(segments[1], authorization));
        }
        if (segments.length === 3 && segments[2] === "state" && request.method === "PATCH") {
          const input = await request.json() as { readonly state?: unknown };
          if (typeof input.state !== "string") throw new Error("Community object state is required");
          return json(await api.updateObjectState(segments[1], input.state, authorization));
        }
      }

      if (segments[0] === "repositories" && segments[1] !== undefined && segments.length === 2 && request.method === "GET") {
        return json(await api.getRepository(segments[1]));
      }

      if (segments[0] === "repositories" && segments[1] !== undefined && segments[2] === "issues" && segments.length === 3 && request.method === "POST") {
        return json(await api.openIssue(segments[1], await request.json() as OpenCommunityIssueInput), 201);
      }

      if (
        segments[0] === "repositories"
        && segments[1] !== undefined
        && segments[2] === "issues"
        && segments[3] !== undefined
        && segments[4] === "comments"
        && segments.length === 5
        && request.method === "POST"
      ) {
        return json(
          await api.commentOnIssue(segments[1], segments[3], await request.json() as CommentOnCommunityIssueInput),
          201,
        );
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
    ref: newObjectRef("project"),
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

function objectById(objects: ReadonlyMap<string, CommunityMessage>, objectId: string): CommunityMessage {
  const message = objects.get(objectId);
  if (message === undefined) throw new Error(`Community object not found: ${objectId}`);
  return message;
}

function defaultObjectAuthorization(message: CommunityMessage, authorization: CommunityAuthorizationContext): boolean {
  return canReadCommunityResource({
    kind: message.context.kind === "dm" ? "dm" : message.ref.kind,
    resourceId: message.context.kind === "dm" ? message.context.objectId : message.ref.objectId,
    visibility: message.context.kind === "dm" ? "private" : "public",
    ...(message.context.kind === "dm" ? { participantIds: [message.authorId] } : {}),
  }, authorization);
}

function authorizeMessage(
  message: CommunityMessage,
  authorization: CommunityAuthorizationContext,
  authorize: (message: CommunityMessage, authorization: CommunityAuthorizationContext) => boolean,
): CommunityMessage {
  if (!authorize(message, authorization)) throw new Error(`Community object not found: ${message.ref.objectId}`);
  return message;
}

function authorizedGraphMessages(
  messages: readonly CommunityMessage[],
  authorization: CommunityAuthorizationContext,
  authorize: (message: CommunityMessage, authorization: CommunityAuthorizationContext) => boolean,
): readonly CommunityMessage[] {
  const byId = new Map(messages.map((message) => [message.ref.objectId, message]));
  const visible = messages.filter((message) => authorize(message, authorization));
  const visibleIds = new Set(visible.map((message) => message.ref.objectId));
  const unavailable = new Map<string, CommunityMessage>();
  for (const child of visible) {
    const parent = child.inReplyTo;
    const hidden = parent === undefined ? undefined : byId.get(parent.objectId);
    if (parent === undefined || hidden === undefined || visibleIds.has(parent.objectId) || unavailable.has(parent.objectId)) continue;
    unavailable.set(parent.objectId, {
      ref: { ...parent, kind: "tombstone" },
      context: child.context,
      authorId: "unavailable",
      body: "",
      publishedAt: hidden.publishedAt,
      threadRoot: child.threadRoot,
      relations: [],
      state: "unavailable",
      aliases: [],
      tombstone: { formerKind: parent.kind, reason: "unauthorized" },
    });
  }
  return [...visible, ...unavailable.values()];
}

function canAccessProjection(projection: SavedProjection, authorization: CommunityAuthorizationContext): boolean {
  return projection.visibility !== "private"
    || (authorization.actorId !== undefined && authorization.actorId === projection.ownerId);
}

function projectionForViewer(projection: SavedProjection, authorization: CommunityAuthorizationContext): SavedProjection {
  const cloned = cloneSavedProjection(projection);
  if (authorization.actorId === projection.ownerId || projection.query === undefined) return cloned;
  const { query: _privateQuery, ...publicMetadata } = cloned;
  return publicMetadata;
}

function projectionById(
  projections: ReadonlyMap<string, SavedProjection>,
  projectionId: string,
  authorization: CommunityAuthorizationContext,
): SavedProjection {
  const projection = projections.get(projectionId);
  if (projection === undefined || !canAccessProjection(projection, authorization)) {
    throw new Error(`Community projection not found: ${projectionId}`);
  }
  return projection;
}

function requireOwner(ownerId: string, authorization: CommunityAuthorizationContext): void {
  if (authorization.actorId === undefined || authorization.actorId !== ownerId) {
    throw new Error("Saved projection permission denied");
  }
}

function capabilitiesFor(message: CommunityMessage) {
  const tombstone = message.tombstone !== undefined || message.ref.kind === "tombstone";
  return {
    read: true,
    enter: true,
    expand: true,
    composeUnder: !tombstone,
    execute: false,
  };
}

function validateSavedProjection(projection: SavedProjection): void {
  validateProjectionId(projection.projectionId);
  validateObjectRef(projection.root);
  if (projection.ownerId.trim().length === 0) throw new Error("Saved projection owner is required");
  if (projection.kind !== "saved-query") throw new Error("Saved projections must use saved-query kind");
  if (projection.query !== undefined && projection.query.error !== undefined) {
    throw new Error(`Invalid saved projection query: ${projection.query.error}`);
  }
}

function migrateSavedProjection(projection: SavedProjection): SavedProjection {
  const query = projection.query === undefined ? undefined : migrateNormalizedQuery(projection.query);
  const migrated = {
    ...projection,
    ...(query === undefined ? {} : { query, queryLanguageVersion: query.version }),
  };
  validateSavedProjection(migrated);
  return cloneSavedProjection(migrated);
}

function migrateRepository(repository: CommunityRepository): CommunityRepository {
  return cloneRepository({
    ...repository,
    ref: repository.ref ?? newObjectRef("project"),
    issues: repository.issues.map((issue) => ({
      ...issue,
      ref: issue.ref ?? newObjectRef("issue"),
      comments: issue.comments.map((comment) => ({
        ...comment,
        id: comment.id ?? `COMMENT-${randomUUID()}`,
        ref: comment.ref ?? newObjectRef("message"),
      })),
    })),
    changeProposals: repository.changeProposals.map((proposal) => ({
      ...proposal,
      ref: proposal.ref ?? newObjectRef("change"),
    })),
    discussions: repository.discussions.map((discussion) => ({
      ...discussion,
      ref: discussion.ref ?? newObjectRef("thread"),
      comments: discussion.comments.map((comment) => ({
        ...comment,
        id: comment.id ?? `COMMENT-${randomUUID()}`,
        ref: comment.ref ?? newObjectRef("message"),
      })),
    })),
  });
}

function cloneMessage(message: CommunityMessage): CommunityMessage {
  return structuredClone(message);
}

function cloneSavedProjection(projection: SavedProjection): SavedProjection {
  return structuredClone(projection);
}

function repositoryMessages(repository: CommunityRepository): readonly CommunityMessage[] {
  return [
    ...repository.issues.flatMap((issue) => [
      repositoryIssueMessage(repository, issue),
      ...issue.comments.map((comment) => repositoryCommentMessage(repository, issue, comment)),
    ]),
    ...repository.changeProposals.map((proposal) => repositoryChangeMessage(repository, proposal)),
    ...repository.discussions.flatMap((discussion) => [
      repositoryDiscussionMessage(repository, discussion),
      ...discussion.comments.map((comment) => repositoryDiscussionCommentMessage(repository, discussion, comment)),
    ]),
  ];
}

function repositoryIssueMessage(repository: CommunityRepository, issue: CommunityIssue): CommunityMessage {
  const ref = requiredRef(issue.ref, `issue ${issue.id}`);
  return {
    ref,
    context: requiredRef(repository.ref, `repository ${repository.slug}`),
    authorId: issue.author,
    title: issue.title,
    body: issue.body,
    publishedAt: new Date().toISOString(),
    threadRoot: ref,
    relations: [],
    state: issue.status,
    aliases: [issue.id],
  };
}

function repositoryCommentMessage(
  repository: CommunityRepository,
  issue: CommunityIssue,
  comment: CommunityComment,
): CommunityMessage {
  const ref = requiredRef(comment.ref, `comment ${comment.id ?? "unknown"}`);
  const parent = requiredRef(issue.ref, `issue ${issue.id}`);
  return {
    ref,
    context: requiredRef(repository.ref, `repository ${repository.slug}`),
    authorId: comment.author,
    body: comment.body,
    publishedAt: new Date().toISOString(),
    inReplyTo: parent,
    threadRoot: parent,
    relations: [{ type: "reply", source: ref, target: parent }],
    state: "read",
    aliases: comment.id === undefined ? [] : [comment.id],
  };
}

function repositoryChangeMessage(repository: CommunityRepository, proposal: CommunityChangeProposal): CommunityMessage {
  const ref = requiredRef(proposal.ref, `change ${proposal.id}`);
  return {
    ref,
    context: requiredRef(repository.ref, `repository ${repository.slug}`),
    authorId: proposal.author,
    title: proposal.title,
    body: proposal.body,
    publishedAt: new Date().toISOString(),
    threadRoot: ref,
    relations: [],
    state: proposal.status,
    aliases: [proposal.id],
  };
}

function repositoryDiscussionMessage(repository: CommunityRepository, discussion: CommunityDiscussion): CommunityMessage {
  const ref = requiredRef(discussion.ref, `discussion ${discussion.id}`);
  return {
    ref,
    context: requiredRef(repository.ref, `repository ${repository.slug}`),
    authorId: discussion.author,
    title: discussion.title,
    body: "",
    publishedAt: new Date().toISOString(),
    threadRoot: ref,
    relations: [],
    state: "open",
    aliases: [discussion.id],
  };
}

function repositoryDiscussionCommentMessage(
  repository: CommunityRepository,
  discussion: CommunityDiscussion,
  comment: CommunityComment,
): CommunityMessage {
  const ref = requiredRef(comment.ref, `comment ${comment.id ?? "unknown"}`);
  const parent = requiredRef(discussion.ref, `discussion ${discussion.id}`);
  return {
    ref,
    context: requiredRef(repository.ref, `repository ${repository.slug}`),
    authorId: comment.author,
    body: comment.body,
    publishedAt: new Date().toISOString(),
    inReplyTo: parent,
    threadRoot: parent,
    relations: [{ type: "reply", source: ref, target: parent }],
    state: "read",
    aliases: comment.id === undefined ? [] : [comment.id],
  };
}

function requiredRef(ref: CommunityObjectRef | undefined, label: string): CommunityObjectRef {
  if (ref === undefined) throw new Error(`Community ${label} is missing its canonical object ID`);
  return validateObjectRef(ref);
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
  if (message.includes("permission denied")) return 403;
  return 400;
}
