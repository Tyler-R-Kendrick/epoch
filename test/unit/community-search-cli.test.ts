import assert from "node:assert/strict";
import {
  CommunityError,
  COMMUNITY_ACTION_IDS,
  type CompiledProjection,
  type NamespaceMount,
  type NamespacePage,
  type NamespaceResetResult,
  type ProjectionDefinition,
  type ProjectionExplanation,
  type SearchExplanation,
  type SearchPage,
  type VfsPage,
} from "@epoch/community-core";
import {
  COMMUNITY_CLI_EXIT_CODES,
  QUERY_CLI_COMMANDS,
  communityCliExitCode,
  createHttpCommunityCliContext,
  formatCommunityCliHelp,
  main,
  NAMESPACE_CLI_COMMANDS,
  PROJECTION_CLI_COMMANDS,
  runNamespaceCommand,
  runProjectionCommand,
  runQueryCommand,
  type NamespaceCommandServices,
  type ProjectionCommandServices,
  type QueryCommandServices,
} from "@epoch/community-cli";

const NOW = "2026-08-12T20:00:00.000Z";

export async function runCommunitySearchCliTests(): Promise<void> {
  await searchProducesStableJsonAndForwardsCursor();
  await partialSearchHasDistinctExitCode();
  await queryErrorsAndCancellationHaveTypedExitCodes();
  await graphqlUsesStructuredFileInputs();
  await projectionValidateSaveCloneAndExportAreDeterministic();
  await namespaceCommandsPreserveTypedMountSemantics();
  commandDescriptorsMatchTheActionRegistry();
  await publicCliDispatchesSearchCommands();
  await shippedCliContextUsesTheCommunityApi();
  await helpWorksWithoutAnApiUrl();
}

async function helpWorksWithoutAnApiUrl(): Promise<void> {
  const previous = process.env.EPOCH_COMMUNITY_API_URL;
  delete process.env.EPOCH_COMMUNITY_API_URL;
  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const exitCode = await main(["help"], {
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    });
    assert.equal(exitCode, 0);
    assert.equal(stderr.join(""), "");
    assert.match(stdout.join(""), /epoch-community search --query/u);
    assert.match(stdout.join(""), /epoch-community changes create/u);
  } finally {
    if (previous === undefined) delete process.env.EPOCH_COMMUNITY_API_URL;
    else process.env.EPOCH_COMMUNITY_API_URL = previous;
  }
}

async function shippedCliContextUsesTheCommunityApi(): Promise<void> {
  const requests: { readonly method: string; readonly path: string; readonly body?: unknown }[] = [];
  const context = createHttpCommunityCliContext({
    baseUrl: "https://community.example.test",
    now: NOW,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, ...(init?.body === undefined ? {} : { body: JSON.parse(String(init.body)) }) });
      if (url.pathname === "/search") return Response.json(page());
      if (url.pathname === "/projections") return Response.json([]);
      if (url.pathname === "/namespace/mounts") return Response.json([]);
      return Response.json({ error: { code: "QUERY_UNSUPPORTED_SOURCE", message: "unsupported test route" } }, { status: 422 });
    },
    readFile: async () => "",
    writeFile: async () => undefined,
  });
  const result = await main(["search", "--query", "kind:issue", "--json"], { stdout: () => undefined, stderr: () => undefined }, context);
  assert.equal(result, 0);
  assert.equal(requests[0]?.path, "/search");
  assert.equal((requests[0]?.body as { readonly first?: number }).first, 50);
  assert.deepEqual(await context.projections?.list(), []);
  assert.deepEqual(await context.namespace?.mounts(), []);
}

async function publicCliDispatchesSearchCommands(): Promise<void> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await main(["search", "--query", "kind:issue", "--json"], {
    stdout: (value) => stdout.push(value), stderr: (value) => stderr.push(value),
  }, { client: {} as never, search: new FakeQueryServices() });
  assert.equal(exitCode, 0);
  assert.match(stdout.join(""), /epoch\.community\.cli\.search\.v1/u);
  assert.equal(stderr.length, 0);
}

function commandDescriptorsMatchTheActionRegistry(): void {
  const descriptors = [...QUERY_CLI_COMMANDS, ...PROJECTION_CLI_COMMANDS, ...NAMESPACE_CLI_COMMANDS];
  for (const descriptor of descriptors) {
    assert.ok(COMMUNITY_ACTION_IDS.includes(descriptor.actionId));
    assert.ok(descriptor.usage.startsWith(descriptor.command));
  }
  const help = formatCommunityCliHelp(descriptors);
  for (const descriptor of descriptors) assert.match(help, new RegExp(escapeRegex(descriptor.usage), "u"));
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }

async function searchProducesStableJsonAndForwardsCursor(): Promise<void> {
  const service = new FakeQueryServices();
  const result = await runQueryCommand([
    "--query", "state:needs-review", "--first", "2", "--after", "cursor-1", "--json",
  ], service);
  assert.equal(result.exitCode, 0);
  assert.equal(service.searchInput?.after, "cursor-1");
  assert.equal(service.searchInput?.first, 2);
  assert.match(result.stdout, /^\{"completeness":/u);
  assert.deepEqual(JSON.parse(result.stdout), {
    completeness: page().completeness,
    hits: page().hits,
    pageInfo: page().pageInfo,
    schema: "epoch.community.cli.search.v1",
    snapshot: page().snapshot,
  });
}

async function partialSearchHasDistinctExitCode(): Promise<void> {
  const service = new FakeQueryServices();
  service.page = { ...page(), completeness: { ...page().completeness, status: "partial", omittedSources: ["atproto"] } };
  const result = await runQueryCommand(["--query", "kind:issue"], service);
  assert.equal(result.exitCode, COMMUNITY_CLI_EXIT_CODES.partialSource);
  assert.match(result.stderr, /partial/u);
  assert.match(result.stdout, /issue-a/u);
}

async function queryErrorsAndCancellationHaveTypedExitCodes(): Promise<void> {
  const invalid = await runQueryCommand(["--query", "unknown:value"], new FakeQueryServices());
  assert.equal(invalid.exitCode, COMMUNITY_CLI_EXIT_CODES.invalidQuery);
  assert.doesNotMatch(invalid.stderr, /unknown:value/u);
  assert.equal(communityCliExitCode(new CommunityError("AUTHORIZATION_DENIED", "denied")), COMMUNITY_CLI_EXIT_CODES.unauthorized);
  assert.equal(communityCliExitCode(new CommunityError("CURSOR_STALE", "stale")), COMMUNITY_CLI_EXIT_CODES.staleCursor);
  assert.equal(communityCliExitCode(new CommunityError("SOURCE_UNAVAILABLE", "down")), COMMUNITY_CLI_EXIT_CODES.unavailableBackend);
  const controller = new AbortController();
  controller.abort();
  const cancelled = await runQueryCommand(["--query", "kind:issue"], new FakeQueryServices(), { signal: controller.signal });
  assert.equal(cancelled.exitCode, COMMUNITY_CLI_EXIT_CODES.cancelled);
}

async function graphqlUsesStructuredFileInputs(): Promise<void> {
  const service = new FakeQueryServices();
  service.files.set("query.graphql", "query Search($first: Int!) { search(where: { all: true }, first: $first) { totalCount } }");
  service.files.set("variables.json", "{\"first\":2}");
  const result = await runQueryCommand(["--graphql", "query.graphql", "--variables", "variables.json", "--json"], service);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(service.graphqlInput?.variables, { first: 2 });
  assert.doesNotMatch(result.stderr, /query Search/u);
}

async function projectionValidateSaveCloneAndExportAreDeterministic(): Promise<void> {
  const services = new FakeProjectionServices();
  services.files.set("projection.json", JSON.stringify(definition("mine")));
  const validated = await runProjectionCommand(["validate", "projection.json", "--json"], services);
  assert.equal(validated.exitCode, 0);
  assert.deepEqual(JSON.parse(validated.stdout).diagnostics, []);
  const saved = await runProjectionCommand(["save", "projection.json", "--json"], services);
  assert.equal(saved.exitCode, 0);
  assert.equal(services.saved.at(-1)?.projectionId, "mine");
  const cloned = await runProjectionCommand(["clone", "builtin:default", "clone-id", "--json"], services);
  assert.equal(cloned.exitCode, 0);
  assert.equal(services.saved.at(-1)?.projectionId, "clone-id");
  const shown = await runProjectionCommand(["show", "mine", "--json"], services);
  assert.equal(shown.exitCode, 0);
  assert.deepEqual(JSON.parse(shown.stdout), definition("mine"));
  assert.equal(shown.stdout, (await runProjectionCommand(["show", "mine", "--json"], services)).stdout);
}

async function namespaceCommandsPreserveTypedMountSemantics(): Promise<void> {
  const services = new FakeNamespaceServices();
  const mounted = await runNamespaceCommand([
    "mount", "mine", "/", "--mode", "before", "--scope", "user", "--json",
  ], services);
  assert.equal(mounted.exitCode, 0);
  assert.deepEqual(services.mounted, { projectionId: "mine", mountPath: "/", mode: "before", scope: "user" });
  const listed = await runNamespaceCommand(["ls", "/", "--first", "20", "--after", "vfs-cursor", "--json"], services);
  assert.equal(listed.exitCode, 0);
  assert.deepEqual(services.listInput, { path: "/", first: 20, after: "vfs-cursor" });
  const reset = await runNamespaceCommand(["reset", "--scope", "session", "--json"], services);
  assert.equal(reset.exitCode, 0);
  assert.equal(services.resetScope, "session");
  const protectedReset = await runNamespaceCommand(["reset", "--scope", "builtin"], services);
  assert.equal(protectedReset.exitCode, COMMUNITY_CLI_EXIT_CODES.invalidQuery);
}

class FakeQueryServices implements QueryCommandServices {
  readonly queryContext = { now: NOW, timezone: "UTC", locale: "en-US", actorId: "maya" };
  page: SearchPage = page();
  searchInput?: { readonly first: number; readonly after?: string };
  graphqlInput?: { readonly document: string; readonly variables?: Readonly<Record<string, unknown>> };
  readonly files = new Map<string, string>();
  async search(input: Parameters<QueryCommandServices["search"]>[0]): Promise<SearchPage> {
    this.searchInput = { first: input.first, ...(input.after === undefined ? {} : { after: input.after }) };
    return this.page;
  }
  async explain(): Promise<SearchExplanation> {
    return { planHash: "plan", backendId: "reference", expression: {}, sourcePlans: [], ordering: [], authorization: "pre-filtered" };
  }
  async executeGraphql(input: { readonly document: string; readonly variables?: Readonly<Record<string, unknown>> }): Promise<unknown> {
    this.graphqlInput = input;
    return { data: { search: { totalCount: 1 } } };
  }
  async readFile(path: string): Promise<string> {
    const value = this.files.get(path);
    if (value === undefined) throw new Error("missing fixture");
    return value;
  }
}

class FakeProjectionServices implements ProjectionCommandServices {
  readonly files = new Map<string, string>();
  readonly saved: ProjectionDefinition[] = [];
  async readFile(path: string): Promise<string> { return this.files.get(path) ?? ""; }
  async list(): Promise<readonly ProjectionDefinition[]> { return [definition("mine"), definition("builtin:default")]; }
  async get(id: string): Promise<ProjectionDefinition | undefined> { return id === "mine" || id === "builtin:default" ? definition(id) : undefined; }
  async validate(input: ProjectionDefinition): Promise<CompiledProjection> { return compiled(input); }
  async preview(): Promise<VfsPage> { return vfsPage(); }
  async save(input: ProjectionDefinition): Promise<ProjectionDefinition> { this.saved.push(input); return input; }
  async delete(): Promise<boolean> { return true; }
  formattedDefinition(input: ProjectionDefinition): string { return `${JSON.stringify(input, null, 2)}\n`; }
}

class FakeNamespaceServices implements NamespaceCommandServices {
  mounted?: { readonly projectionId: string; readonly mountPath: string; readonly mode: string; readonly scope: string };
  listInput?: { readonly path: string; readonly first: number; readonly after?: string };
  resetScope?: string;
  async mounts(): Promise<readonly NamespaceMount[]> { return []; }
  async mount(input: Parameters<NamespaceCommandServices["mount"]>[0]): Promise<NamespaceMount> {
    this.mounted = input;
    return mount();
  }
  async unmount(): Promise<boolean> { return true; }
  async reset(scope: "user" | "workspace" | "session"): Promise<NamespaceResetResult> {
    this.resetScope = scope;
    return { scope, removedMountIds: [], preservedProjectionIds: [] };
  }
  async list(input: Parameters<NamespaceCommandServices["list"]>[0]): Promise<NamespacePage> {
    this.listInput = input;
    return { ...vfsPage(), shadowed: [], componentOrder: [] };
  }
  async explain(): Promise<ProjectionExplanation> {
    return { projectionId: "namespace", path: "/", componentOrder: [], shadowed: [], detail: "builtin" };
  }
}

function page(): SearchPage {
  return {
    hits: [{ target: { objectId: "issue-a", kind: "issue" }, sortKey: [NOW, "issue", "issue-a"], matchedFields: ["state"], provenance: { sourceId: "store", nativeId: "issue-a", observedAt: NOW } }],
    pageInfo: { hasNextPage: false, startCursor: "start", endCursor: "end" },
    snapshot: { snapshotId: "snapshot", createdAt: NOW, resolvedNow: NOW, timezone: "UTC", locale: "en-US", queryHash: "query", planHash: "plan", fieldRegistryVersion: 1, analyzerVersion: "v1", authorizationFingerprint: "sha256:actor", sourceCheckpoints: [] },
    completeness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] },
  };
}

function definition(projectionId: string): ProjectionDefinition {
  return { apiVersion: "epoch.dev/v1alpha1", projectionId, version: 1, label: projectionId, visibility: "private", root: { nodeId: "root", kind: "literal", segment: "root", children: [] }, order: [], updateMode: "live", consistency: "current" };
}

function compiled(input: ProjectionDefinition): CompiledProjection {
  return { definition: input, canonicalJson: JSON.stringify(input), diagnostics: [], nodeCount: 1, maximumDepth: 1, estimatedFanout: 0, effectiveOrder: [] };
}

function vfsPage(): VfsPage {
  return { entries: [], pageInfo: { hasNextPage: false }, freshness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] } };
}

function mount(): NamespaceMount {
  return { mountId: "mount-1", scope: "user", mountPath: "/", projectionId: "mine", mode: "before", order: 0, writable: false, createdAt: NOW, updatedAt: NOW };
}

if (require.main === module) {
  runCommunitySearchCliTests().then(
    () => console.log("community search CLI tests passed"),
    (error: unknown) => { console.error(error); process.exitCode = 1; },
  );
}
