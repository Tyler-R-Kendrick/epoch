import { randomUUID } from "node:crypto";
import {
  CommunityError,
  canReadCommunityResource,
  communityEntityToMessage,
  communityMessageToEntity,
  createCommunityRuntimeContext,
  createMessageGraph,
  hasCommunityPermission,
  isCommunityError,
  threadRelations,
  validateCommunityEntity,
  validateObjectRef,
  type Clock,
  type CommentOnCommunityIssueInput,
  type CommunityApiTransport,
  type CommunityAuthorizationContext,
  type CommunityChange,
  type CommunityComment,
  type CommunityEntity,
  type CommunityIssue,
  type CommunityMessage,
  type CommunityObjectKind,
  type CommunityObjectRef,
  type CommunityRepository,
  type CommunityReview,
  type CommunityReviewInput,
  type CommunityRuntimeContext,
  type CommunityWorkflow,
  type CreateCommunityRepositoryInput,
  type IdGenerator,
  type OpenCommunityIssueInput,
  type ProjectionDefinition,
  type CreateCommunityChangeInput,
} from "@epoch/community-core";
import {
  createCommunityGraphQLSchema,
  executeCommunityGraphQL,
  type CommunityGraphQLContext,
  type CommunityGraphQLServices,
} from "@epoch/community-graphql";
import { createJsonCommunityStateStore } from "./persistence";
import { migrateCommunityState } from "./migrations";
import { createCommunityServiceApis, type CommunityServiceApis } from "./service-host";
import { createMemoryCommunityStateStore, type CommunityStateSnapshot, type CommunityStateStore } from "./store";
import type { CommunityStateV3 } from "./state-schema";
import type { CommunityNamespaceApi } from "./namespace-api";
import type { CommunitySearchRequest } from "./search-api";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsNumber<T>(value: T): value is T & number { return typeof value === "number"; }


export * from "./community-source";
export * from "./live/media-provider";
export * from "./live/live-session-service";
export * from "./live/live-routes";
export * from "./convergence";
export * from "./migrations";
export * from "./namespace-api";
export * from "./persistence";
export * from "./projection-api";
export * from "./search-api";
export * from "./service-host";
export * from "./state-schema";
export * from "./store";

export interface CreateInMemoryCommunityApiOptions {
  readonly repositories?: readonly CreateCommunityRepositoryInput[];
  readonly messages?: readonly CommunityMessage[];
  readonly authorizeObject?: (message: CommunityMessage, authorization: CommunityAuthorizationContext) => boolean;
  readonly persistencePath?: string;
  readonly runtime?: CommunityRuntimeContext;
  readonly store?: CommunityStateStore;
}

export type CommunityApiPersistedState = CommunityStateV3;

export interface CreateCommunityApiFetchHandlerOptions {
  readonly resolveAuthorization?: (request: Request) => CommunityAuthorizationContext | Promise<CommunityAuthorizationContext>;
  readonly graphqlServices?: CommunityGraphQLServices;
  readonly services?: CommunityServiceApis;
}

export interface CreateCommunityApiHostOptions extends CreateInMemoryCommunityApiOptions {
  readonly cursorKey?: Uint8Array;
  readonly resolveAuthorization?: CreateCommunityApiFetchHandlerOptions["resolveAuthorization"];
}

export function createCommunityApiHost(options: CreateCommunityApiHostOptions = {}): {
  readonly api: CommunityApiTransport;
  readonly store: CommunityStateStore;
  readonly services: CommunityServiceApis;
  readonly handler: (request: Request) => Promise<Response>;
} {
  const runtime = options.runtime ?? defaultRuntime();
  if (options.store !== undefined && (options.persistencePath !== undefined || options.repositories !== undefined || options.messages !== undefined)) {
    throw new CommunityError("PERSISTENCE_MIGRATION", "An injected CommunityStateStore cannot be combined with seed or persistence options");
  }
  const initial = initialState(options, runtime);
  const migrationContext = { clock: runtime.clock, idGenerator: runtime.idGenerator, timezone: runtime.timezone, locale: runtime.locale };
  const store = options.store ?? (options.persistencePath === undefined
    ? createMemoryCommunityStateStore(initial, { clock: runtime.clock })
    : createJsonCommunityStateStore(options.persistencePath, initial, { migrationContext, clock: runtime.clock, persistInitial: true }));
  const api = createInMemoryCommunityApi({ store, runtime, ...(!(options.authorizeObject === undefined) && { authorizeObject: options.authorizeObject }) });
  const services = createCommunityServiceApis({
    store,
    runtime,
    ...(!(options.cursorKey === undefined) && { cursorKey: options.cursorKey }),
  });
  return Object.freeze({
    api,
    store,
    services,
    handler: createCommunityApiFetchHandler(api, {
      services,
      ...(!(options.resolveAuthorization === undefined) && { resolveAuthorization: options.resolveAuthorization }),
    }),
  });
}

export function createCommunityGraphQLServices(input: CommunityServiceApis): CommunityGraphQLServices {
  const authorizations = new Map<string, CommunityAuthorizationContext>();
  const rejectNamespace = (namespace: string | undefined): void => {
    if (namespace !== undefined && namespace !== "default") throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", `Unknown namespace: ${namespace}`);
  };
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const services: CommunityGraphQLServices = {
    async node(id, authorization) {
      return input.store.read((state) => {
        const entity = state.entity(id);
        return entity !== undefined && canReadEntity(entity, authorization, () => true, (objectId) => state.entity(objectId)) ? entity : undefined;
      });
    },
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    observableFields(entity, authorization) { return /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ input.search.observableFields(entity.fields, authorization) as CommunityEntity["fields"]; },
    async search(request) {
      if ((request.scope?.sourceIds?.length ?? 0) > 0 || (request.scope?.objectKinds?.length ?? 0) > 0) {
        throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Scoped GraphQL search requires a source-aware planner");
      }
      return input.search.search({ where: request.where, orderBy: request.orderBy, first: request.first, ...(!(request.after === undefined) && { after: request.after }), ...(!(request.snapshot === undefined) && { snapshot: request.snapshot }) }, request.authorization, request.signal);
    },
    parseSearch(expression, options) { return input.search.parseSearch(expression, options); },
    async explainSearch(request) {
      if ((request.scope?.sourceIds?.length ?? 0) > 0 || (request.scope?.objectKinds?.length ?? 0) > 0) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Scoped GraphQL explain requires a source-aware planner");
      return input.search.explain({ where: request.where, orderBy: request.orderBy, first: 100 }, request.authorization);
    },
    projections: (authorization) => input.projections.list(authorization),
    projection: (id, authorization) => input.projections.get(id, authorization),
    saveProjection: (definition, authorization) => input.projections.save(definition, authorization),
    deleteProjection: (id, authorization) => input.projections.delete(id, authorization),
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    // SAFETY: The module validates or constructs this value before applying the asserted contract.
    async projectionContext(authorization, snapshot) { const context = await input.namespace.context(authorization, snapshot); authorizations.set(context.authorizationFingerprint, authorization); while (authorizations.size > 1024) authorizations.delete(/* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ authorizations.keys().next().value as string); return context; },
    async listPath(request) { rejectNamespace(request.namespace); return input.namespace.list(request.path, { first: request.first, ...(!(request.after === undefined) && { after: request.after }) }, authorizationFor(request.context.authorizationFingerprint), request.context.snapshotId); },
    async resolvePath(request) { rejectNamespace(request.namespace); return input.namespace.resolve(request.path, authorizationFor(request.context.authorizationFingerprint), request.context.snapshotId); },
    async locate(request) {
      rejectNamespace(request.namespace);
      const entity = await input.store.read((state) => state.entity(request.objectId));
      if (entity === undefined) return [];
      return input.namespace.locate(entity.ref, authorizationFor(request.context.authorizationFingerprint), request.context.snapshotId);
    },
    async explainPath(request) { rejectNamespace(request.namespace); return input.namespace.explain(request.path, authorizationFor(request.context.authorizationFingerprint), request.context.snapshotId); },
    sourceCapabilities: (authorization) => input.search.listSourceCapabilities(authorization),
    namespaceMounts: (authorization) => input.namespace.mounts(authorization),
    mountProjection: (mount, authorization) => input.namespace.mount({ mountId: mount.mountId, projectionId: mount.projectionId, mountPath: mount.mountPath, mode: mount.mode, scope: mount.scope, order: mount.order, writable: mount.writable }, authorization),
    unmountProjection: (id, authorization) => input.namespace.unmount(id, authorization),
    resetNamespace: (scope, authorization) => input.namespace.reset(scope, authorization),
    async *projectionDeltas(request) { rejectNamespace(request.namespace); yield* input.namespace.watch(request.path, authorizationFor(request.context.authorizationFingerprint), request.signal, request.context.snapshotId); },
  };
  return Object.freeze(services);

  function authorizationFor(fingerprint: string): CommunityAuthorizationContext {
    const authorization = authorizations.get(fingerprint);
    if (authorization === undefined) throw new CommunityError("AUTHORIZATION_DENIED", "Projection authorization context is unavailable or expired");
    return authorization;
  }
}

const workflowCatalog: readonly CommunityWorkflow[] = Object.freeze([
  { id: "repository-browsing", label: "Repositories", purpose: "Browse Epoch repositories, views, versions, and signed activity." },
  { id: "issue-tracking", label: "Issues", purpose: "Discuss bugs, tasks, and product work in repository-owned threads." },
  { id: "change-review", label: "Change Reviews", purpose: "Review Epoch Changes and their exact maintainer decisions." },
  { id: "discussion-threads", label: "Discussions", purpose: "Host durable community conversations separate from deployment operations." },
  { id: "maintainer-profiles", label: "Profiles", purpose: "Represent contributors and maintainers with community-facing identity." },
  { id: "release-discovery", label: "Releases", purpose: "Surface signed Epoch versions for people who want to consume projects." },
  { id: "organization-spaces", label: "Organizations", purpose: "Group repositories, contributors, and community policy under shared spaces." },
]);
const objectStates = new Set(["read", "unread", "open", "closed", "needs-review", "promoted", "signed", "approved", "changes-requested", "unavailable"]);

export function createInMemoryCommunityApi(options: CreateInMemoryCommunityApiOptions = {}): CommunityApiTransport {
  const runtime = options.runtime ?? defaultRuntime();
  if (options.store !== undefined && (options.persistencePath !== undefined || options.repositories !== undefined || options.messages !== undefined)) {
    throw new CommunityError("PERSISTENCE_MIGRATION", "An injected CommunityStateStore cannot be combined with seed or persistence options");
  }
  const initial = initialState(options, runtime);
  const migrationContext = { clock: runtime.clock, idGenerator: runtime.idGenerator, timezone: runtime.timezone, locale: runtime.locale };
  const store = options.store ?? (options.persistencePath === undefined
    ? createMemoryCommunityStateStore(initial, { clock: runtime.clock })
    : createJsonCommunityStateStore(options.persistencePath, initial, { migrationContext, clock: runtime.clock, persistInitial: true }));
  const configuredAuthorization = options.authorizeObject ?? (() => true);

  const api: CommunityApiTransport = {
    async listWorkflows() { return communityWorkflowCatalog(); },
    async listRepositories() { return store.read((state) => repositoriesFromState(state)); },
    async getRepository(slug) { return store.read((state) => repositoryBySlug(repositoriesFromState(state), slug)); },
    async createRepository(input) {
      validateRepositoryInput(input);
      const now = runtime.now();
      const repository = createCommunityRepository(input, runtime);
      await store.write((transaction) => {
        if (repositoriesFromState(transaction).some((value) => value.slug === repository.slug)) conflict(`Community repository already exists: ${repository.slug}`);
        transaction.putEntity(repositoryEntity(repository, now));
      });
      return clone(repository);
    },
    async openIssue(slug, input) {
      return store.write((transaction) => {
        const repository = repositoryBySlug(repositoriesFromState(transaction), slug);
        const ref = nextRef(runtime, "issue");
        const id = input.id ?? `ISSUE-${repository.issues.length + 1}`;
        if (repository.issues.some((issue) => issue.id === id)) conflict(`Community issue already exists: ${id}`);
        const message: CommunityMessage = { ref, context: requiredRef(repository.ref), authorId: input.author, title: input.title, body: input.body ?? "", publishedAt: runtime.now(), threadRoot: ref, relations: [], state: "open", aliases: [id] };
        transaction.putEntity(enrich(messageEntity(message, repository), { repositorySlug: slug, issueId: id, labels: [...(input.labels ?? [])] }));
        return repositoryBySlug(repositoriesFromState(transaction), slug);
      });
    },
    async commentOnIssue(slug, issueId, input) {
      return store.write((transaction) => {
        const repository = repositoryBySlug(repositoriesFromState(transaction), slug);
        const issue = repository.issues.find((candidate) => candidate.id === issueId);
        if (issue?.ref === undefined) notFound(`Community issue not found: ${issueId}`);
        const ref = nextRef(runtime, "message");
        const id = input.id ?? `COMMENT-${runtime.nextId("comment")}`;
        const message: CommunityMessage = { ref, context: requiredRef(repository.ref), authorId: input.author, body: input.body, publishedAt: runtime.now(), inReplyTo: issue.ref, threadRoot: issue.ref, relations: [{ type: "reply", source: ref, target: issue.ref }], state: "read", aliases: [id] };
        transaction.putEntity(enrich(messageEntity(message, repository), { repositorySlug: slug, issueId, commentId: id }));
        return repositoryBySlug(repositoriesFromState(transaction), slug);
      });
    },
    async createChange(slug, input) {
      return store.write((transaction) => {
        const repository = repositoryBySlug(repositoriesFromState(transaction), slug);
        const id = input.id ?? `CHANGE-${repository.changes.length + 1}`;
        if (repository.changes.some((change) => change.id === id)) conflict(`Community change already exists: ${id}`);
        const ref = nextRef(runtime, "change");
        const message: CommunityMessage = { ref, context: requiredRef(repository.ref), authorId: input.author, title: input.title, body: input.body ?? "", publishedAt: runtime.now(), threadRoot: ref, relations: [], state: "open", aliases: [id] };
        transaction.putEntity(enrich(messageEntity(message, repository), { repositorySlug: slug, changeId: id, sourceView: input.sourceView, targetView: input.targetView, reviewers: [], reviewDecisions: [], reviewBodies: [] }));
        return repositoryBySlug(repositoriesFromState(transaction), slug);
      });
    },
    async reviewChange(slug, changeId, input) {
      return store.write((transaction) => {
        const repository = repositoryBySlug(repositoriesFromState(transaction), slug);
        const change = repository.changes.find((candidate) => candidate.id === changeId);
        if (change?.ref === undefined) notFound(`Community change not found: ${changeId}`);
        const entity = transaction.entity(change.ref.objectId);
        if (entity === undefined) notFound(`Community change not found: ${changeId}`);
        const reviews = [...change.reviews, { reviewer: input.reviewer, decision: input.decision, body: input.body ?? "" }];
        const message = communityEntityToMessage(entity);
        const updated = { ...message, state: changeStatusForReviews(reviews), updatedAt: runtime.now() };
        transaction.putEntity(enrich(reprojectMessage(entity, updated), { reviewers: reviews.map((review) => review.reviewer), reviewDecisions: reviews.map((review) => review.decision), reviewBodies: reviews.map((review) => review.body) }));
        return repositoryBySlug(repositoriesFromState(transaction), slug);
      });
    },
    async getObject(objectId, authorization = {}) {
      return store.read((state) => cloneMessage(authorizeEntity(messageEntityById(state, objectId), authorization, configuredAuthorization, (id) => state.entity(id))));
    },
    async updateObjectState(objectId, stateValue, authorization = {}) {
      if (!hasCommunityPermission(authorization, "object:state:write")) denied("Community object state permission denied");
      validateObjectState(stateValue);
      return store.write((transaction) => {
        const entity = messageEntityById(transaction, objectId);
        authorizeEntity(entity, authorization, configuredAuthorization, (id) => transaction.entity(id));
        const message = { ...communityEntityToMessage(entity), state: stateValue, updatedAt: runtime.now() };
        transaction.putEntity(reprojectMessage(entity, message));
        return cloneMessage(message);
      });
    },
    async listThreadRelations(objectId, authorization = {}) {
      return store.read((state) => {
        const current = authorizeEntity(messageEntityById(state, objectId), authorization, configuredAuthorization, (id) => state.entity(id));
        const visible = state.entities.filter((entity) => isMessageEntity(entity) && canReadEntity(entity, authorization, configuredAuthorization, (id) => state.entity(id))).map(communityEntityToMessage);
        return threadRelations(createMessageGraph(visible), current.ref);
      });
    },
  };
  return Object.freeze(api);
}

export function createCommunityApiFetchHandler(api: CommunityApiTransport, options: CreateCommunityApiFetchHandlerOptions = {}): (request: Request) => Promise<Response> {
  const graphqlServices = options.graphqlServices ?? (options.services === undefined ? undefined : createCommunityGraphQLServices(options.services));
  const graphqlSchema = graphqlServices === undefined ? undefined : createCommunityGraphQLSchema(graphqlServices);
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  return async (request) => {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const authorization = await (options.resolveAuthorization?.(request) ?? {});
      if (request.method === "POST" && url.pathname === "/graphql") {
        if (graphqlSchema === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "GraphQL services are not configured");
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const body = await boundedJson(request) as { readonly query?: unknown; readonly variables?: Readonly<Record<string, DictionaryValue>>; readonly operationName?: string };
        if (!__epochIsString(body.query)) throw new CommunityError("QUERY_SYNTAX", "GraphQL query is required");
        return json(await executeCommunityGraphQL({ schema: graphqlSchema, source: body.query, context: { authorization, signal: request.signal } satisfies CommunityGraphQLContext, ...(!(body.variables === undefined) && { variableValues: body.variables }), ...(!(body.operationName === undefined) && { operationName: body.operationName }) }));
      }
      if (request.method === "POST" && url.pathname === "/search") {
        const services = requiredServices(options.services);
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const body = await boundedJson(request) as CommunitySearchRequest & { readonly scope?: unknown };
        // SAFETY: Optional search scope is rejected when present before the search service runs.
        rejectUnsupportedSearchScope(body.scope as BoundaryValue | undefined);
        return json(await services.search.search(body, authorization, request.signal));
      }
      if (request.method === "POST" && url.pathname === "/search/parse") {
        const services = requiredServices(options.services);
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const body = await boundedJson(request) as { readonly expression?: unknown; readonly timezone?: string; readonly locale?: string };
        if (!__epochIsString(body.expression)) throw new CommunityError("QUERY_SYNTAX", "Search expression is required");
        return json(services.search.parseSearch(body.expression, { authorization, ...(!(body.timezone === undefined) && { timezone: body.timezone }), ...(!(body.locale === undefined) && { locale: body.locale }) }));
      }
      if (request.method === "POST" && url.pathname === "/search/explain") {
        const services = requiredServices(options.services);
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const body = await boundedJson(request) as Omit<CommunitySearchRequest, "after" | "snapshot"> & { readonly scope?: unknown };
        // SAFETY: Optional search scope is rejected when present before the search service runs.
        rejectUnsupportedSearchScope(body.scope as BoundaryValue | undefined);
        return json(await services.search.explain(body, authorization));
      }
      if (request.method === "GET" && url.pathname === "/namespace/list") {
        const services = requiredServices(options.services);
        return json(await services.namespace.list(url.searchParams.get("path") ?? "/", { first: boundedFirst(url.searchParams.get("first")), ...(!(url.searchParams.get("after") === null) && { after: url.searchParams.get("after")! }) }, authorization, url.searchParams.get("snapshot") ?? undefined));
      }
      if (request.method === "GET" && url.pathname === "/namespace/resolve") return json(await requiredServices(options.services).namespace.resolve(url.searchParams.get("path") ?? "/", authorization, url.searchParams.get("snapshot") ?? undefined));
      if (request.method === "GET" && url.pathname === "/namespace/explain") return json(await requiredServices(options.services).namespace.explain(url.searchParams.get("path") ?? "/", authorization, url.searchParams.get("snapshot") ?? undefined));
      if (request.method === "GET" && url.pathname === "/namespace/mounts") return json(await requiredServices(options.services).namespace.mounts(authorization));
      if (request.method === "POST" && url.pathname === "/namespace/mounts") {
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const body = await boundedJson(request) as Parameters<CommunityNamespaceApi["mount"]>[0];
        return json(await requiredServices(options.services).namespace.mount(body, authorization), 201);
      }
      if (segments[0] === "namespace" && segments[1] === "mounts" && segments[2] !== undefined && segments.length === 3 && request.method === "DELETE") {
        return json({ removed: await requiredServices(options.services).namespace.unmount(segments[2], authorization) });
      }
      if (request.method === "POST" && url.pathname === "/namespace/reset") {
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        const body = await boundedJson(request) as { readonly scope?: unknown };
        if (body.scope !== "user" && body.scope !== "workspace" && body.scope !== "session") throw new CommunityError("NAMESPACE_RECOVERY_PROTECTED", "Only user, workspace, and session namespace scopes may be reset");
        return json(await requiredServices(options.services).namespace.reset(body.scope, authorization));
      }
      if (request.method === "GET" && url.pathname === "/workflows") return json(await api.listWorkflows());
      if (request.method === "GET" && url.pathname === "/repositories") return json(await api.listRepositories());
      // SAFETY: The module validates or constructs this value before applying the asserted contract.
      // SAFETY: The module validates or constructs this value before applying the asserted contract.
      if (request.method === "POST" && url.pathname === "/repositories") return json(await api.createRepository(/* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ await boundedJson(request) as CreateCommunityRepositoryInput), 201);
      if (segments[0] === "objects" && segments[1] !== undefined) {
        if (segments.length === 2 && request.method === "GET") return json(await api.getObject(segments[1], authorization));
        if (segments.length === 3 && segments[2] === "thread" && request.method === "GET") return json(await api.listThreadRelations(segments[1], authorization));
        if (segments.length === 3 && segments[2] === "state" && request.method === "PATCH") {
          // SAFETY: The module validates or constructs this value before applying the asserted contract.
          const input = await boundedJson(request) as { readonly state?: unknown };
          if (!__epochIsString(input.state)) throw new CommunityError("INVALID_FIELD", "Community object state is required");
          return json(await api.updateObjectState(segments[1], input.state, authorization));
        }
      }
      if (segments[0] === "projections") {
        const projections = requiredServices(options.services).projections;
        if (segments.length === 2 && segments[1] === "preview" && request.method === "POST") {
          // SAFETY: The module validates or constructs this value before applying the asserted contract.
          const body = await boundedJson(request) as { readonly definition?: ProjectionDefinition; readonly path?: string; readonly first?: number; readonly after?: string };
          if (body.definition === undefined) throw new CommunityError("PROJECTION_INVALID", "Projection definition is required");
          return json(await projections.preview(body.definition, body.path ?? "/", { first: boundedFirst(body.first === undefined ? null : String(body.first)), ...(!(body.after === undefined) && { after: body.after }) }, authorization));
        }
        if (segments.length === 3 && segments[2] === "explain" && request.method === "GET") return json(await projections.explain(segments[1]!, url.searchParams.get("path") ?? "/", authorization));
        if (segments.length === 1 && request.method === "GET") return json(await projections.list(authorization));
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        if (segments.length === 1 && request.method === "POST") return json(await projections.save(/* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ await boundedJson(request) as ProjectionDefinition, authorization), 201);
        if (segments[1] !== undefined && segments.length === 2 && request.method === "GET") {
          const definition = await projections.get(segments[1], authorization);
          if (definition === undefined) notFound(`Community projection not found: ${segments[1]}`);
          return json(definition);
        }
        if (segments[1] !== undefined && segments.length === 2 && request.method === "DELETE") {
          if (!await projections.delete(segments[1], authorization)) notFound(`Community projection not found: ${segments[1]}`);
          return new Response(null, { status: 204 });
        }
      }
      if (segments[0] === "repositories" && segments[1] !== undefined) {
        if (segments.length === 2 && request.method === "GET") return json(await api.getRepository(segments[1]));
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        if (segments[2] === "issues" && segments.length === 3 && request.method === "POST") return json(await api.openIssue(segments[1], /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ await boundedJson(request) as OpenCommunityIssueInput), 201);
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        if (segments[2] === "issues" && segments[3] !== undefined && segments[4] === "comments" && segments.length === 5 && request.method === "POST") return json(await api.commentOnIssue(segments[1], segments[3], /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ await boundedJson(request) as CommentOnCommunityIssueInput), 201);
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        if (segments[2] === "changes" && segments.length === 3 && request.method === "POST") return json(await api.createChange(segments[1], /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ await boundedJson(request) as CreateCommunityChangeInput), 201);
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        // SAFETY: The module validates or constructs this value before applying the asserted contract.
        if (segments[2] === "changes" && segments[3] !== undefined && segments[4] === "reviews" && segments.length === 5 && request.method === "POST") return json(await api.reviewChange(segments[1], segments[3], /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ await boundedJson(request) as CommunityReviewInput), 201);
      }
      return json({ error: { code: "NOT_FOUND", message: "not found" } }, 404);
    } catch (error) {
      // SAFETY: catch-clause errors are normalized at the Community API boundary.
      const normalized = normalizeApiError(error as BoundaryValue);
      const status = __epochIsNumber(normalized.details?.httpStatus) ? normalized.details.httpStatus : normalized.httpStatus;
      return json({ error: normalized.toJSON() }, status);
    }
  };
}

export function communityWorkflowCatalog(): readonly CommunityWorkflow[] { return workflowCatalog.map((workflow) => ({ ...workflow })); }
export function createCommunityRepository(input: CreateCommunityRepositoryInput, runtime: CommunityRuntimeContext = defaultRuntime()): CommunityRepository {
  validateRepositoryInput(input);
  return { ref: nextRef(runtime, "project"), slug: input.slug, displayName: input.displayName, description: input.description, visibility: input.visibility ?? "public", defaultView: input.defaultView ?? "main", maintainers: [...input.maintainers], topics: [...(input.topics ?? [])], issues: [], changes: [], discussions: [] };
}

function initialState(options: CreateInMemoryCommunityApiOptions, runtime: CommunityRuntimeContext): CommunityStateV3 {
  return migrateCommunityState({ schemaVersion: 2, repositories: options.repositories ?? [], objects: options.messages ?? [], projections: [] }, { clock: runtime.clock, idGenerator: runtime.idGenerator, timezone: runtime.timezone, locale: runtime.locale });
}
function defaultRuntime(): CommunityRuntimeContext {
  const clock: Clock = { now: () => new Date() };
  const idGenerator: IdGenerator = { generate: () => randomUUID() };
  return createCommunityRuntimeContext({ clock, idGenerator, timezone: "UTC", locale: "en-US" });
}
function nextRef(runtime: CommunityRuntimeContext, kind: CommunityObjectKind): CommunityObjectRef { return validateObjectRef({ objectId: runtime.nextId(kind), kind }); }
function requiredRef(ref: CommunityObjectRef | undefined): CommunityObjectRef { if (ref === undefined) throw new CommunityError("INVALID_ENTITY", "Repository identity is missing"); return ref; }
function validateRepositoryInput(input: CreateCommunityRepositoryInput): void { if (!Array.isArray(input.maintainers) || input.maintainers.length === 0) throw new CommunityError("INVALID_FIELD", "Community repositories require at least one maintainer"); }

function repositoryEntity(repository: CommunityRepository, now: string): CommunityEntity {
  return validateCommunityEntity({ ref: requiredRef(repository.ref), fields: { objectId: requiredRef(repository.ref).objectId, kind: "project", slug: repository.slug, title: repository.displayName, description: repository.description, visibility: repository.visibility === "private" ? "private" : "public", defaultView: repository.defaultView, maintainers: repository.maintainers, topics: repository.topics }, searchableText: { title: repository.displayName, description: repository.description }, relations: [], visibility: repository.visibility === "private" ? "private" : "public", ...(repository.visibility === "private" ? { ownerId: repository.maintainers[0], participantIds: repository.maintainers } : { participantIds: [] }), createdAt: now, updatedAt: now, provenance: { sourceId: "repository", nativeId: repository.slug, observedAt: now } });
}
function messageEntity(message: CommunityMessage, repository: CommunityRepository): CommunityEntity { return communityMessageToEntity(message, { provenance: { sourceId: "community-api", nativeId: `${repository.slug}:${message.aliases[0] ?? message.ref.objectId}`, observedAt: message.updatedAt ?? message.publishedAt }, visibility: repository.visibility === "private" ? "private" : "public", ...(repository.visibility === "private" && { ownerId: repository.maintainers[0], participantIds: repository.maintainers }) }); }
function enrich(entity: CommunityEntity, fields: CommunityEntity["fields"]): CommunityEntity { return validateCommunityEntity({ ...entity, fields: { ...entity.fields, ...fields } }); }
function reprojectMessage(entity: CommunityEntity, message: CommunityMessage): CommunityEntity { return enrich(communityMessageToEntity(message, { provenance: { ...entity.provenance, observedAt: message.updatedAt ?? message.publishedAt }, visibility: entity.visibility, ...(!(entity.ownerId === undefined) && { ownerId: entity.ownerId }), participantIds: entity.participantIds }), extraFields(entity.fields)); }
function extraFields(fields: CommunityEntity["fields"]): CommunityEntity["fields"] { const core = new Set(["objectId", "kind", "author", "state", "contextId", "createdAt", "updatedAt", "visibility", "aliases", "participantIds", "title", "parentId", "reactions"]); return Object.fromEntries(Object.entries(fields).filter(([name]) => !core.has(name))); }

function repositoriesFromState(state: CommunityStateSnapshot): readonly CommunityRepository[] {
  const projects = state.entities.filter((entity) => entity.ref.kind === "project" && __epochIsString(entity.fields.slug));
  return projects.map((project) => repositoryFromProject(project, state.entities)).sort((left, right) => left.slug.localeCompare(right.slug, "en"));
}
function repositoryFromProject(project: CommunityEntity, entities: readonly CommunityEntity[]): CommunityRepository {
  const slug = scalar(project.fields.slug); const children = entities.filter((entity) => entity.fields.repositorySlug === slug || (isMessageEntity(entity) && communityEntityToMessage(entity).context.objectId === project.ref.objectId));
  const issues = children.filter((entity) => entity.ref.kind === "issue" && __epochIsString(entity.fields.issueId)).map((entity) => issueFromEntity(entity, children));
  const changes = children.filter((entity) => entity.ref.kind === "change" && __epochIsString(entity.fields.changeId)).map(changeFromEntity);
  const discussions = children.filter((entity) => entity.ref.kind === "thread" && __epochIsString(entity.fields.discussionId)).map((entity) => discussionFromEntity(entity, children));
  return { ref: project.ref, slug, displayName: scalar(project.fields.title), description: scalar(project.fields.description, true), visibility: project.fields.visibility === "private" ? "private" : "public", defaultView: scalar(project.fields.defaultView), maintainers: strings(project.fields.maintainers), topics: stringsPreserve(project.fields.topics), issues, changes, discussions };
}
function issueFromEntity(entity: CommunityEntity, children: readonly CommunityEntity[]): CommunityIssue { const message = communityEntityToMessage(entity); return { id: scalar(entity.fields.issueId), ref: entity.ref, title: message.title ?? "", author: message.authorId, body: message.body, labels: strings(entity.fields.labels), status: message.state === "closed" ? "closed" : "open", comments: children.filter((candidate) => isMessageEntity(candidate) && communityEntityToMessage(candidate).inReplyTo?.objectId === entity.ref.objectId).map(commentFromEntity) }; }
function commentFromEntity(entity: CommunityEntity): CommunityComment { const message = communityEntityToMessage(entity); return { id: message.aliases[0], ref: message.ref, author: message.authorId, body: message.body }; }
// SAFETY: The module validates or constructs this value before applying the asserted contract.
// SAFETY: The module validates or constructs this value before applying the asserted contract.
// SAFETY: The module validates or constructs this value before applying the asserted contract.
function changeFromEntity(entity: CommunityEntity): CommunityChange { const message = communityEntityToMessage(entity); const reviewers = strings(entity.fields.reviewers), decisions = stringsPreserve(entity.fields.reviewDecisions), bodies = stringsPreserve(entity.fields.reviewBodies); const reviews: CommunityReview[] = reviewers.map((reviewer, index) => ({ reviewer, decision: /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ (decisions[index] ?? "commented") as CommunityReview["decision"], body: bodies[index] ?? "" })); return { id: scalar(entity.fields.changeId), ref: entity.ref, title: message.title ?? "", author: message.authorId, body: message.body, sourceView: scalar(entity.fields.sourceView), targetView: scalar(entity.fields.targetView), status: (["approved", "changes-requested", "closed"] as const).includes(/* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ message.state as never) ? /* SAFETY: Runtime validation immediately surrounding this expression establishes the asserted contract. */ message.state as CommunityChange["status"] : "open", reviews }; }
function discussionFromEntity(entity: CommunityEntity, children: readonly CommunityEntity[]) { const message = communityEntityToMessage(entity); return { id: scalar(entity.fields.discussionId), ref: entity.ref, title: message.title ?? "", author: message.authorId, comments: children.filter((candidate) => isMessageEntity(candidate) && communityEntityToMessage(candidate).inReplyTo?.objectId === entity.ref.objectId).map(commentFromEntity) }; }

function repositoryBySlug(repositories: readonly CommunityRepository[], slug: string): CommunityRepository { const value = repositories.find((repository) => repository.slug === slug); if (value === undefined) notFound(`Community repository not found: ${slug}`); return clone(value); }
function messageEntityById(state: CommunityStateSnapshot, objectId: string): CommunityEntity { const entity = state.entity(objectId); if (entity === undefined || !isMessageEntity(entity)) notFound(`Community object not found: ${objectId}`); return entity; }
function isMessageEntity(entity: CommunityEntity): boolean { try { communityEntityToMessage(entity); return true; } catch { return false; } }
function canReadEntity(entity: CommunityEntity, authorization: CommunityAuthorizationContext, configured: (message: CommunityMessage, authorization: CommunityAuthorizationContext) => boolean, entityById: (objectId: string) => CommunityEntity | undefined): boolean { const message = isMessageEntity(entity) ? communityEntityToMessage(entity) : undefined; if (message?.context.kind === "project" && entityById(message.context.objectId)?.ref.kind !== "project") return false; return canReadCommunityResource({ kind: message?.context.kind === "dm" ? "dm" : entity.ref.kind, resourceId: message?.context.kind === "dm" ? message.context.objectId : entity.ref.objectId, visibility: entity.visibility, ownerId: entity.ownerId, participantIds: entity.participantIds }, authorization) && (message === undefined || configured(message, authorization)); }
function authorizeEntity(entity: CommunityEntity, authorization: CommunityAuthorizationContext, configured: (message: CommunityMessage, authorization: CommunityAuthorizationContext) => boolean, entityById: (objectId: string) => CommunityEntity | undefined): CommunityMessage { if (!canReadEntity(entity, authorization, configured, entityById)) notFound(`Community object not found: ${entity.ref.objectId}`); return communityEntityToMessage(entity); }
function changeStatusForReviews(reviews: readonly CommunityReview[]): CommunityChange["status"] { return reviews.some((review) => review.decision === "changes-requested") ? "changes-requested" : reviews.some((review) => review.decision === "approved") ? "approved" : "open"; }
function validateObjectState(value: string): void { if (!objectStates.has(value) || value.length > 64) throw new CommunityError("INVALID_FIELD", "Community object state is not in the supported state vocabulary"); }
function scalar(value: BoundaryValue, empty = false): string { if (!__epochIsString(value) || (!empty && value.length === 0)) throw new CommunityError("INVALID_ENTITY", "Canonical repository field is invalid"); return value; }
function strings(value: BoundaryValue): readonly string[] { return Array.isArray(value) && value.every((item) => __epochIsString(item)) ? [...value].sort() : []; }
function stringsPreserve(value: BoundaryValue): readonly string[] { return Array.isArray(value) && value.every((item) => __epochIsString(item)) ? [...value] : []; }
function clone<T>(value: T): T { return structuredClone(value); }
function cloneMessage(value: CommunityMessage): CommunityMessage { return structuredClone(value); }
function conflict(message: string): never { throw new CommunityError("PERSISTENCE_MIGRATION", message, { httpStatus: 409 }); }
function notFound(message: string): never { throw new CommunityError("INVALID_ENTITY", message, { httpStatus: 404 }); }
function denied(message: string): never { throw new CommunityError("AUTHORIZATION_DENIED", message); }
function normalizeApiError(error: BoundaryValue): CommunityError {
  return isCommunityError(error) ? error : new CommunityError("INTERNAL", "Internal Community API failure", undefined, { cause: error });
}
function requiredServices(value: CommunityServiceApis | undefined): CommunityServiceApis { if (value === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Community search and namespace services are not configured"); return value; }
function rejectUnsupportedSearchScope(scope: BoundaryValue | undefined): void {
  if (scope !== undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "Scoped search requires a source-aware planner");
}
function boundedFirst(value: string | null): number { if (value === null) return 100; const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 1000) throw new CommunityError("QUERY_COST_LIMIT", "first must be between 1 and 1000"); return parsed; }
async function boundedJson(request: Request): Promise<BoundaryValue> {
  const text = await request.text();
  if (text.length > 1_000_000) throw new CommunityError("QUERY_COST_LIMIT", "Request body exceeds its size limit");
  try {
    // SAFETY: JSON.parse yields wire values validated by downstream Community API handlers.
    return JSON.parse(text) as BoundaryValue;
  } catch (error) {
    throw new CommunityError("QUERY_SYNTAX", "Request body must be valid JSON", undefined, { cause: error });
  }
}
function json(value: BoundaryValue, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }
