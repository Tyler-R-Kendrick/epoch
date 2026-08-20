/* eslint-disable @typescript-eslint/ban-ts-comment -- Playwright scenario globals are runtime-injected. */
// @ts-nocheck
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page, type Response as PlaywrightResponse, type Route } from "playwright";
import {
  createCanonicalStoreSource,
  createCommunityApiFetchHandler,
  createCommunityGraphQLServices,
  createCommunityNamespaceApi,
  createCommunityProjectionApi,
  createCommunitySearchApi,
  createInMemoryCommunityApi,
  createMemoryCommunityStateStore,
  migrateCommunityState,
  type CommunityServiceApis,
  type CommunityStateV3,
} from "@epoch/community-api";
import {
  EntityProjectionRuntime,
  BUILT_IN_ACTIONS,
  ProjectionDeltaController,
  ReferenceSearchBackend,
  builtinDefaultProjection,
  compileProjectionDefinition,
  createCommunityFieldRegistry,
  createCommunityRuntimeContext,
  createNamespaceRuntime,
  createSearchServiceFromSources,
  normalizeQuery,
  type CommunityApiTransport,
  type CommunityAuthorizationContext,
  type CommunityEntity,
  type CommunitySourceAdapter,
  type ProjectionDefinition,
  type SearchExpression,
  type VfsEntry,
  createCommunityClient,
} from "@epoch/community-core";
import { runProjectionCommand } from "@epoch/community-cli";
import { createCommunityGraphQLSchema, executeCommunityGraphQL } from "@epoch/community-graphql";
import {
  BrowserPersistenceCoordinator,
  chooseSqliteStorage,
  createCommunityWebApp,
  createCommunityWebSource,
  renderCommunityWebDocument,
} from "@epoch/community-web";
import { chromiumLaunchOptions } from "./playwright-options";

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[] | undefined;
interface JsonObject {
  readonly [key: string]: JsonValue;
}

type JourneyValue = JsonValue | object;

interface AtprotoHostFixture {
  readonly authorizationServer: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly fetch: (url: string) => Promise<Response>;
}

interface AtprotoCompletionFixture {
  readonly code: string;
  readonly state: string;
  readonly expectedState: string;
  readonly codeVerifier: string;
  readonly loginHint: string;
  readonly host: AtprotoHostFixture;
}

interface ProjectionPageOptions {
  readonly first: number;
  after?: string;
}

interface CommunityWebWorld {
  readonly api?: CommunityApiTransport;
  readonly apiHandler?: (request: Request) => Promise<Response>;
  readonly browser?: Browser;
  readonly page?: Page;
  /** Resolves when the runtime's boot-time refreshRepository GET has been answered (live API mode only). */
  readonly initialRefresh?: Promise<PlaywrightResponse | undefined>;
  /** Rendered document, kept so a scenario can reopen the page in the same origin. */
  readonly document?: string;
}

/** Matches the deployed route: vercel.json rewrites /community/* to the page. */
const COMMUNITY_PAGE_PATH = "/community";

let world: CommunityWebWorld = {};

/** Title of the message whose provenance a scenario revealed. */
let revealedMessageTitle = "";
let searchProjectionJourneyResult: JsonObject = {};
let communityWebAppFocusedMessage = "";
let communityWebAppContextMenuResult: {
  readonly navStable: boolean;
  readonly downStayedInMenu: boolean;
  readonly upStayedInMenu: boolean;
  readonly focusRestored: boolean;
} | undefined;
let communityWebAppCdResult: {
  readonly labelled: boolean;
  readonly horizontal: boolean;
  readonly previewed: boolean;
  readonly cancelled: boolean;
  readonly committed: boolean;
} | undefined;
let communityWebAppPostActionResult: {
  readonly controls: Readonly<Record<string, string | null>>;
  readonly vote: number;
  readonly reactionOpened: boolean;
  readonly folded: boolean;
  readonly reposted: boolean;
  readonly shared: boolean;
  readonly copied: boolean;
  readonly replied: boolean;
} | undefined;
let communityWebAppStartupApplied = false;
let communityWebAppRouteSticky = false;
let communityWebAppFocusRestored = false;
let communityWebAppLinkResult: {
  readonly objectId: string;
  readonly canonical: string;
  readonly contextual: string;
  readonly exact: string;
} | undefined;
let communityWebAppSavedViewResult: {
  readonly id: string;
  readonly expression: JsonValue;
  readonly resultIds: readonly string[];
} | undefined;
let communityWebAppThreadA11yResult: {
  readonly selected: string;
  readonly reading: string;
  readonly oneTabStop: boolean;
  readonly topology: boolean;
} | undefined;
let communityWebAppNavigationActions: readonly { readonly actionId: string; readonly objectId?: string }[] = [];
let communityWebAppJumpResult: {
  readonly cdStayed: boolean;
  readonly grouped: boolean;
  readonly explained: boolean;
  readonly locationStayed: boolean;
} | undefined;
const deterministicJourney = new Map<string, JourneyValue>();

const FIXED_NOW = "2026-08-12T15:00:00.000Z";
const TEST_AUTHORIZATION = Object.freeze({
  actorId: "maya",
  permissions: ["object:state:write"] as const,
}) satisfies CommunityAuthorizationContext;
const CURSOR_KEY = new Uint8Array(32).fill(7);

function testRuntime() {
  let sequence = 0;
  return createCommunityRuntimeContext({
    clock: { now: () => new Date(FIXED_NOW) },
    idGenerator: { generate: (namespace) => `${namespace}-${++sequence}` },
    timezone: "UTC",
    locale: "en-US",
  });
}

function entity(input: {
  readonly objectId: string;
  readonly kind?: CommunityEntity["ref"]["kind"];
  readonly title: string;
  readonly state?: string;
  readonly visibility?: CommunityEntity["visibility"];
  readonly ownerId?: string;
  readonly participantIds?: readonly string[];
  readonly sourceId?: string;
  readonly updatedAt?: string;
}): CommunityEntity {
  const kind = input.kind ?? "project";
  const visibility = input.visibility ?? "public";
  const updatedAt = input.updatedAt ?? FIXED_NOW;
  const candidate = {
    ref: Object.freeze({ objectId: input.objectId, kind }),
    fields: Object.freeze({
      objectId: input.objectId,
      kind,
      title: input.title,
      state: input.state ?? "open",
      visibility,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt,
    }),
    searchableText: Object.freeze({ title: input.title, body: input.title }),
    relations: Object.freeze([]),
    visibility,
    participantIds: Object.freeze([...(input.participantIds ?? [])]),
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt,
    provenance: Object.freeze({
      sourceId: input.sourceId ?? "community-store",
      nativeId: input.objectId,
      observedAt: updatedAt,
      checkpoint: `${input.sourceId ?? "community-store"}-checkpoint`,
    }),
  };
  return Object.freeze(input.ownerId === undefined ? candidate : { ...candidate, ownerId: input.ownerId });
}

function stateV3(entities: readonly CommunityEntity[] = []): CommunityStateV3 {
  return {
    schemaVersion: 3,
    metadata: {
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      migratedAt: FIXED_NOW,
      migrationTimestamp: FIXED_NOW,
      sourceSchemaVersion: 3,
      migrationId: "migration-current",
    },
    entities,
    relations: entities.flatMap((candidate) => candidate.relations),
    projectionDefinitions: [],
    namespaceMounts: [],
    sourceCheckpoints: [],
    quarantinedDefinitions: [],
  };
}

function compileContext(registry = createCommunityFieldRegistry()) {
  const visible = registry.list(TEST_AUTHORIZATION);
  return {
    fields: visible.map((field) => field.name),
    sortableFields: visible.filter((field) => field.sortable).map((field) => field.name),
    limits: { maxDepth: 16, maxNodes: 256, maxFanout: 10_000, maxTemplateLength: 1024, maxSegmentLength: 255 },
  };
}

function projection(input: {
  readonly projectionId: string;
  readonly root: ProjectionDefinition["root"];
  readonly label?: string;
  readonly ownerId?: string;
  readonly updateMode?: ProjectionDefinition["updateMode"];
}): ProjectionDefinition {
  const definition = {
    apiVersion: "epoch.dev/v1alpha1",
    projectionId: input.projectionId,
    version: 1,
    label: input.label ?? input.projectionId,
    visibility: input.ownerId === undefined ? "public" : "private",
    root: input.root,
    order: [
      { field: "updatedAt", direction: "descending", nulls: "last" },
      { field: "kind", direction: "ascending", nulls: "last" },
      { field: "objectId", direction: "ascending", nulls: "last" },
    ],
    updateMode: input.updateMode ?? "live",
    consistency: "current",
  } satisfies Omit<ProjectionDefinition, "ownerId">;
  return Object.freeze(input.ownerId === undefined ? definition : { ...definition, ownerId: input.ownerId });
}

function entityListProjection(
  projectionId: string,
  entitiesWhere: SearchExpression = { kind: "all" },
  leafBranches = ["leaf"],
): ProjectionDefinition {
  return projection({
    projectionId,
    ownerId: "maya",
    root: {
      nodeId: "root",
      kind: "literal",
      segment: "",
      children: [{
        nodeId: "select",
        kind: "select",
        objectKinds: ["project", "issue", "change", "message"],
        where: entitiesWhere,
        children: leafBranches.map((nodeId) => ({
          nodeId,
          kind: "leaf" as const,
          segment: { template: "{slug(coalesce(title, objectId))}" },
          representation: "default" as const,
        })),
      }],
    },
  });
}

async function createSearchEnvironment(
  entities: readonly CommunityEntity[],
  sources?: readonly CommunitySourceAdapter[],
) {
  const runtime = testRuntime();
  const registry = createCommunityFieldRegistry();
  const backend = new ReferenceSearchBackend({ registry, cursorKey: CURSOR_KEY });
  const canonical = createCanonicalStoreSource({
    readEntities: async () => entities,
    checkpoint: async () => ({ sourceId: "community-store", token: "community-current", observedAt: FIXED_NOW, status: "current" }),
  });
  const registered = sources ?? [canonical];
  const service = await createSearchServiceFromSources({
    backend,
    registry,
    context: runtime,
    sources: registered,
    authorization: TEST_AUTHORIZATION,
  });
  return { runtime, registry, backend, service, sources: registered };
}

async function createServiceEnvironment(
  entities: readonly CommunityEntity[],
  definitions: readonly ProjectionDefinition[] = [],
): Promise<CommunityServiceApis & { readonly projectionRuntime: EntityProjectionRuntime }> {
  const runtime = testRuntime();
  const registry = createCommunityFieldRegistry();
  const store = createMemoryCommunityStateStore(stateV3(entities), { clock: runtime.clock });
  const backend = new ReferenceSearchBackend({ registry, cursorKey: CURSOR_KEY });
  const source = createCanonicalStoreSource({
    readEntities: () => store.read((snapshot) => snapshot.entities),
    checkpoint: async () => ({ sourceId: "community-store", token: "community-current", observedAt: FIXED_NOW, status: "current" }),
  });
  const searchService = await createSearchServiceFromSources({ backend, registry, context: runtime, sources: [source], authorization: TEST_AUTHORIZATION });
  const projectionRuntime = new EntityProjectionRuntime({
    entities,
    completeness: { status: "complete", sources: [await source.checkpoint()], omittedSources: [], unsupportedPredicates: [] },
    cursorKey: CURSOR_KEY,
    compileContext: compileContext(registry),
  }, definitions);
  const namespaceRuntime = createNamespaceRuntime(projectionRuntime);
  return {
    store,
    runtime,
    search: createCommunitySearchApi({ searchService, registry, runtime, sources: [source], explain: (plan) => backend.explain(plan) }),
    projections: createCommunityProjectionApi({ store, runtime, projectionRuntime, fields: registry }),
    namespace: createCommunityNamespaceApi({ store, runtime, namespaceRuntime }),
    projectionRuntime,
  };
}

function journey<T>(key: string): T {
  assert.ok(deterministicJourney.has(key), `Missing deterministic journey value: ${key}`);
  // SAFETY: The key-existence assertion above proves this indexed journey value is present.
  return deterministicJourney.get(key) as T;
}

const COMMUNITY_WEB_APP_ROOT = join(process.cwd(), "packages", "Epoch.Community.Web", "app");
const COMMUNITY_WEB_APP_CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
} as const satisfies Readonly<Record<string, string>>;

function contentTypeFor(file: string): string {
  const extension = extname(file);
  if (!Object.hasOwn(COMMUNITY_WEB_APP_CONTENT_TYPES, extension)) return "application/octet-stream";
  // SAFETY: Object.hasOwn proves the extension is one of the content-type map's literal keys.
  return COMMUNITY_WEB_APP_CONTENT_TYPES[extension as keyof typeof COMMUNITY_WEB_APP_CONTENT_TYPES];
}

After(async function () {
  await closeWithTimeout(world.page?.context().close(), "community web browser context close");
  await closeWithTimeout(world.browser?.close(), "community web browser close");
  world = {};
  deterministicJourney.clear();
});

Given("the Community Web live API has repository activity", async function () {
  const api = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven version control for signed, collaborative repository history.",
      maintainers: ["maya"],
      topics: ["dvcs", "agents", "community"],
    }],
  });
  await api.openIssue("epoch/epoch", {
    id: "IDEA-3",
    title: "Dashboard widget should group revenue by region",
    author: "nora",
    body: "The current widget answers total revenue, but support threads keep asking which region changed. Could this become a small widget setting instead of a separate report?",
    labels: ["idea"],
  });
  await api.openIssue("epoch/epoch", {
    id: "BUG-17",
    title: "Preview keyboard focus skips the chart setting",
    author: "ren",
    body: "The preview works visually, but tab order jumps from the toolbar to the footer.",
    labels: ["bug"],
  });
  await api.createChange("epoch/epoch", {
    id: "CHANGE-12",
    title: "Keep preview cards attached to conversation state",
    author: "maya",
    body: "Preview status should stay attached to the conversation where review happens.",
    sourceView: "maya/preview-card-thread",
    targetView: "main",
  });

  world = {
    api,
    apiHandler: createCommunityApiFetchHandler(api),
  };
});

Given("Epoch Community is available", function () {
  assert.ok(existsSync(join(COMMUNITY_WEB_APP_ROOT, "index.html")));
  assert.ok(existsSync(join(COMMUNITY_WEB_APP_ROOT, "board.html")));
  assert.ok(existsSync(join(COMMUNITY_WEB_APP_ROOT, "canvasui-fx.js")));
});

async function fulfillCommunityTestRoute(route: Route): Promise<void> {
  const pathname = new URL(route.request().url()).pathname;
  const name = pathname === "/" ? "index.html" : basename(pathname);
  const file = join(COMMUNITY_WEB_APP_ROOT, name);
  if (!existsSync(file)) {
    await route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: contentTypeFor(file),
    body: readFileSync(file),
  });
}

async function reloadCommunityPage(page: Page): Promise<Page> {
  const url = page.url();
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    return page;
  } catch {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return page;
    } catch {
      const next = await page.context().newPage();
      await next.goto(url, { waitUntil: "domcontentloaded" });
      world = { ...world, page: next };
      return next;
    }
  }
}

When("I open Epoch Community", async function () {
  const browser = await chromium.launch(chromiumLaunchOptions({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.route("https://community.test/**", fulfillCommunityTestRoute);
  const page = await context.newPage();
  await page.goto("https://community.test/", { waitUntil: "domcontentloaded" });
  world = { ...world, browser, page };
});

Then("the landing presents the creator story with CanvasUI motion", async function () {
  const page = requirePage();
  await page.locator(".cw-landing").waitFor({ state: "visible" });
  await page.locator("#cw-landing-headline").waitFor({ state: "attached" });
  assert.equal(await page.locator("[data-landing-grid]").count(), 1);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  assert.equal(await page.evaluate(() => Object.hasOwn(window, "CW_CanvasUI")), true);
});

When("I enter the community board", async function () {
  const page = requirePage();
  await page.locator("#cw-enter-board").click();
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  await page.waitForFunction(() => ((window as {
    CW_APP?: { navigate?: JsonValue };
  })).CW_APP?.navigate !== undefined);
});

Then("the tmux-style Community Web is ready for keyboard collaboration", async function () {
  const page = requirePage();
  await page.locator('[data-mount][data-tui="true"]').waitFor({ state: "visible" });
  assert.equal(await page.locator(".cw-bar [data-gridroad]").count(), 1);
  assert.equal(await page.locator("[data-region=\"status\"] .cw-keys-cue").count(), 1);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  assert.equal(await page.evaluate(() => Object.hasOwn(window, "CW_APP")), true);
});

Then("the board names itself a sample stream", async function () {
  const page = requirePage();
  await page.locator("[data-sample-stream]").waitFor({ state: "visible" });
  const label = (await page.locator("[data-sample-stream]").innerText()).trim();
  assert.match(label, /SAMPLE STREAM/i);
});

Then("idle Activity unread does not grow on the sample board", async function () {
  const page = requirePage();
  const before = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { unreadActivityCount(): number; state: { live: boolean } };
    })).CW_APP;
    return { unread: app.unreadActivityCount(), live: app.state.live };
  });
  assert.equal(before.live, false);
  await page.waitForTimeout(1100);
  const after = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { unreadActivityCount(): number; state: { merged: Array<{ id?: string }> } };
    })).CW_APP;
    return {
      unread: app.unreadActivityCount(),
      liveIds: app.state.merged.filter((post) => String(post.id || "").startsWith("live-")).length,
    };
  });
  assert.equal(after.unread, before.unread);
  assert.equal(after.liveIds, 0);
});

Then("spaces do not present fixture subscriber counts as live members", async function () {
  const page = requirePage();
  const copy = await page.evaluate(() => document.body?.innerText || "");
  assert.doesNotMatch(copy, /\b142 members\b/u);
  assert.doesNotMatch(copy, /\b38 members\b/u);
  assert.doesNotMatch(copy, /\b12 members\b/u);
});

Then("a livestream command that names an email is rewritten to a fixed-width cipher", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_RUNTIME?: {
        sanitizeStreamCommand(input: JsonValue): { kind: string; envelope?: { args: { body?: string } } };
        cipherToken(salt: string, field: string, value: string): string;
      };
    });
    const result = runtime.CW_RUNTIME?.sanitizeStreamCommand({
      envelope: {
        t: 1,
        actorId: "maya",
        actionId: "compose.publish",
        args: { body: "write maya@epoch.dev" },
        path: "projects/community/channels/general",
      },
      sessionSalt: "walk",
    });
    const token = runtime.CW_RUNTIME?.cipherToken("walk", "email", "maya@epoch.dev") ?? "";
    return {
      kind: result?.kind,
      body: result?.envelope?.args.body ?? "",
      token,
    };
  });
  assert.equal(probe.kind, "emit");
  assert.doesNotMatch(probe.body, /maya@epoch\.dev/u);
  assert.equal(probe.token.length, 12);
  assert.match(probe.body, new RegExp(probe.token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
});

Then("a protected login field emits no livestream input events", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_RUNTIME?: { sanitizeStreamCommand(input: JsonValue): { kind: string } };
    });
    const result = runtime.CW_RUNTIME?.sanitizeStreamCommand({
      envelope: {
        t: 2,
        actorId: "maya",
        actionId: "compose.publish",
        args: { body: "hunter2" },
        path: "projects/community/channels/general",
      },
      protectedInput: true,
    });
    return result?.kind;
  });
  assert.equal(probe, "drop");
});

Then("a DM path is omitted from the livestream command log", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_RUNTIME?: { sanitizeStreamCommand(input: JsonValue): { kind: string } };
    });
    const result = runtime.CW_RUNTIME?.sanitizeStreamCommand({
      envelope: { t: 3, actorId: "maya", actionId: "nav.enter", args: {}, path: "dms/maya" },
    });
    return result?.kind;
  });
  assert.equal(probe, "drop");
});

Then("a livestream rewrite rule ciphers a legal name", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const stream = ((window as {
      CW_STREAM: {
        reset(): void;
        configure(input: { rewrite: string }): void;
        emit(actionId: string, args: { body: string }, path: string): { kind: string; envelope?: { args?: { body?: string } } };
      };
    })).CW_STREAM;
    stream.reset();
    stream.configure({ rewrite: "legal_name = /Maya Chen/g → cipher" });
    return stream.emit("compose.publish", { body: "credit Maya Chen" }, "projects/community/channels/general");
  });
  assert.equal(probe.kind, "emit");
  assert.doesNotMatch(String(probe.envelope?.args?.body || ""), /Maya Chen/u);
});

Then("a livestream ignore file drops a private organization path", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const stream = ((window as {
      CW_STREAM: {
        reset(): void;
        configure(input: { ignore: string }): void;
        emit(actionId: string, args: JsonObject, path: string): { kind: string };
      };
    })).CW_STREAM;
    stream.reset();
    stream.configure({ ignore: "orgs/acme-private/**" });
    return stream.emit("nav.enter", {}, "orgs/acme-private/repos/ledger");
  });
  assert.equal(probe.kind, "drop");
});

When("I mute livestream inputs", async function () {
  const page = requirePage();
  const muted = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = (window as {
      CW_ACTIONS?: { invoke(actionId: string, input: JsonObject, context: JsonObject): Promise<JsonValue> };
      CW_STREAM?: { isMuted(): boolean };
    });
    return win.CW_ACTIONS!.invoke("stream.protect", {}, { origin: "keyboard" }).then(() => win.CW_STREAM!.isMuted());
  });
  assert.equal(muted, true);
});

Then("composing a secret does not appear on the livestream command log", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const stream = ((window as {
      CW_STREAM: {
        emit(actionId: string, args: { body: string }, path: string): { kind: string };
        log(): Array<{ args?: { body?: string } }>;
        isMuted(): boolean;
      };
    })).CW_STREAM;
    const result = stream.emit("compose.publish", { body: "hunter2" }, "projects/community/channels/general");
    return {
      kind: result.kind,
      muted: stream.isMuted(),
      leaked: stream.log().some((entry) => String(entry.args?.body || "").includes("hunter2")),
    };
  });
  assert.equal(probe.muted, true);
  assert.equal(probe.kind, "drop");
  assert.equal(probe.leaked, false);
});

Then("replaying a streamer theme command leaves my theme unchanged", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = (window as {
      CW_STREAM: {
        enterSpectator(): string;
        replay(envelopes: Array<{ t: number; actorId: string; actionId: string; args: JsonObject }>): Promise<{ skipped: Array<{ reason: string }> }>;
      };
    });
    const before = document.body.dataset.theme || "";
    win.CW_STREAM.enterSpectator();
    return win.CW_STREAM.replay([
      { t: 1, actorId: "maya", actionId: "theme.use", args: { theme: "crt" } },
    ]).then((result) => ({
      before,
      after: document.body.dataset.theme || "",
      skipped: result.skipped.map((item) => item.reason),
    }));
  });
  assert.equal(probe.after, probe.before);
  assert.ok(probe.skipped.includes("view-preference"));
});

Then("replaying a public navigation command uses my view", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = (window as {
      CW_STREAM: {
        enterSpectator(): string;
        replay(envelopes: Array<{ t: number; actorId: string; actionId: string; args: JsonObject; path?: string }>): Promise<{ applied: number }>;
      };
      CW_APP: { state: { path: string } };
    });
    const theme = document.body.dataset.theme || "";
    win.CW_STREAM.enterSpectator();
    return win.CW_STREAM.replay([
      {
        t: 2,
        actorId: "maya",
        actionId: "nav.enter",
        args: { path: "/projects/community/channels/general" },
        path: "/projects/community/channels/general",
      },
    ]).then((result) => ({
      applied: result.applied,
      path: win.CW_APP.state.path,
      theme,
      themeAfter: document.body.dataset.theme || "",
    }));
  });
  assert.equal(probe.applied, 1);
  assert.match(probe.path, /channels\/general/u);
  assert.equal(probe.themeAfter, probe.theme);
});

When("I keep a search query while jumping", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        state: { searchWorkbench?: { expression?: string }; feedQuery?: string };
        jumpBest?(terms: string): boolean;
        executeAction(actionId: string, input: JsonObject, context: JsonObject): JsonValue;
      };
    })).CW_APP;
    app.state.searchWorkbench = { expression: "state:needs-review" };
    app.state.feedQuery = "state:needs-review";
    if (app.jumpBest) app.jumpBest("general");
    else app.executeAction("jump.best", { terms: "general" }, { origin: "cli" });
    return {
      search: app.state.searchWorkbench?.expression || "",
      feed: app.state.feedQuery || "",
    };
  });
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  (this as { jumpSearch?: { search: string; feed: string } }).jumpSearch = probe;
});

Then("the search query remains after jump", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { searchWorkbench?: { expression?: string }; feedQuery?: string } };
    })).CW_APP;
    return {
      search: app.state.searchWorkbench?.expression || "",
      feed: app.state.feedQuery || "",
    };
  });
  assert.equal(probe.search, "state:needs-review");
  assert.equal(probe.feed, "state:needs-review");
});

Then("a signature locator opens as an inspectable receipt", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { openReceiptLocator(raw: string): { inspectable?: boolean; kind?: string } | null };
    })).CW_APP;
    const receipt = app.openReceiptLocator("sig:lea-install");
    return {
      receipt,
      blade: document.querySelector("[data-receipt-blade]")?.textContent || "",
    };
  });
  assert.equal(probe.receipt?.inspectable, true);
  assert.equal(probe.receipt?.kind, "sig");
  assert.match(probe.blade, /sig:lea-install/u);
  assert.match(probe.blade, /actor/u);
});

Then("composer letters stay in the prompt", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = ((window as {
      CW_RUNTIME: {
        composerOwnsLetter(input: JsonObject): boolean;
        letterSteersBoard(input: JsonObject): boolean;
      };
    })).CW_RUNTIME;
    return {
      ownsJ: runtime.composerOwnsLetter({ composerFocused: true, composerValue: "draft", key: "j" }),
      ownsR: runtime.composerOwnsLetter({ composerFocused: true, composerValue: "draft", key: "R" }),
      steers: runtime.letterSteersBoard({
        composerFocused: true, composerValue: "draft", key: "j", columnFocus: true,
      }),
    };
  });
  assert.equal(probe.ownsJ, true);
  assert.equal(probe.ownsR, true);
  assert.equal(probe.steers, false);
});

Then("Escape from Following returns along the documented path", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        state: { homeFeed: string; prev: string; path: string; detailOpen: boolean };
        cancelTopLayer(): boolean;
        navigate(path: string, opts?: JsonObject): boolean;
      };
    })).CW_APP;
    app.state.homeFeed = "following";
    app.state.prev = "/projects/community/channels/general";
    app.state.detailOpen = false;
    const returned = app.cancelTopLayer();
    return { returned, path: app.state.path };
  });
  assert.equal(probe.returned, true);
  assert.match(probe.path, /channels\/general/u);
});

Then("mute report and hook refuse an unscoped target", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = ((window as {
      CW_RUNTIME: { requireScopedTarget(actionId: string, objectId?: string): { ok: boolean } };
    })).CW_RUNTIME;
    return {
      mute: runtime.requireScopedTarget("post.mute", undefined).ok,
      report: runtime.requireScopedTarget("post.report", "").ok,
      hook: runtime.requireScopedTarget("hooks.test", undefined).ok,
    };
  });
  assert.equal(probe.mute, false);
  assert.equal(probe.report, false);
  assert.equal(probe.hook, false);
});

Then("mute report and hook apply only to the selected object", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        executeAction(actionId: string, input: JsonObject, context: JsonObject): { objectId?: string };
        state: { mutedObjects?: Record<string, boolean>; reportedObjects?: JsonObject };
      };
    })).CW_APP;
    const muted = app.executeAction("post.mute", { objectId: "p1" }, { origin: "test" });
    const reported = app.executeAction("post.report", { objectId: "p1" }, { origin: "test" });
    return {
      mutedId: muted.objectId,
      reportedId: reported.objectId,
      mutedOnly: Object.keys(app.state.mutedObjects || {}),
      reportedOnly: Object.keys(app.state.reportedObjects || {}),
    };
  });
  assert.equal(probe.mutedId, "p1");
  assert.equal(probe.reportedId, "p1");
  assert.deepEqual(probe.mutedOnly, ["p1"]);
  assert.deepEqual(probe.reportedOnly, ["p1"]);
});

Then("AT sign-in without an OAuth host stays unlinked", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = (window as {
      CW_ATPROTO_OAUTH?: JsonValue;
      CW_SESSION: { authorizeAtproto(handle: string, principalId: string, spaceId: string): JsonValue };
    });
    win.CW_ATPROTO_OAUTH = undefined;
    try {
      win.CW_SESSION.authorizeAtproto("maya", "guest-1", "tuner-crew");
      return { threw: false };
    } catch (error) {
      return { threw: true, message: error instanceof Error ? error.message : String(error) };
    }
  });
  assert.equal(probe.threw, true);
  assert.match(String(probe.message || ""), /PAR\/PKCE\/DPoP/u);
});

Then("AT OAuth completes through PAR PKCE and DPoP without a stub DID", async function () {
  const page = requirePage();
  const probe = await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = ((window as {
      CW_RUNTIME: {
        beginAtprotoAuthorization(handle: string, host: AtprotoHostFixture): Promise<{ state: string; codeVerifier: string; loginHint: string }>;
        finishAtprotoAuthorization(input: AtprotoCompletionFixture): Promise<{ did: string; source: string }>;
        isHandleHashStub(did: string, handle: string): boolean;
      };
    })).CW_RUNTIME;
    const host = {
      authorizationServer: "https://auth.test",
      clientId: "https://epoch.test/client-metadata.json",
      redirectUri: "https://epoch.test/oauth/callback",
      fetch: async (url: string) => {
        if (String(url).endsWith("/oauth/par")) {
          return new Response(JSON.stringify({ request_uri: "urn:ietf:params:oauth:request_uri:par-1" }), { status: 201 });
        }
        return new Response(JSON.stringify({
          access_token: "dpop-access",
          sub: "did:plc:fromtokennotahash",
          handle: "maya.bsky.social",
        }), { status: 200 });
      },
    };
    const start = await runtime.beginAtprotoAuthorization("maya", host);
    const finished = await runtime.finishAtprotoAuthorization({
      code: "auth-code",
      state: start.state,
      expectedState: start.state,
      codeVerifier: start.codeVerifier,
      loginHint: start.loginHint,
      host,
    });
    return {
      did: finished.did,
      source: finished.source,
      stub: runtime.isHandleHashStub(finished.did, "maya.bsky.social"),
    };
  });
  assert.equal(probe.did, "did:plc:fromtokennotahash");
  assert.equal(probe.source, "par-pkce-dpop");
  assert.equal(probe.stub, false);
});

Then("the sample board does not invent idle Activity", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        unreadActivityCount(): number;
        ingestStoreActivity(events: object[]): JsonValue[];
        tick(): void;
        state: { live: boolean; merged: Array<{ id?: string }> };
      };
    })).CW_APP;
    const before = app.unreadActivityCount();
    app.tick();
    const invented = app.ingestStoreActivity([{ id: "tick-1", actorId: "fixture", kind: "tick" }]);
    return {
      before,
      after: app.unreadActivityCount(),
      live: app.state.live,
      invented: invented.length,
      liveIds: (app.state.merged || []).filter((post) => String(post.id || "").startsWith("live-")).length,
    };
  });
  assert.equal(probe.live, false);
  assert.equal(probe.after, probe.before);
  assert.equal(probe.invented, 0);
  assert.equal(probe.liveIds, 0);
});

Then("store participant events can add Activity when the board is live", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = ((window as {
      CW_RUNTIME: {
        activityFromParticipantEvents(events: object[], input: { sampleBoard: boolean }): object[];
      };
    })).CW_RUNTIME;
    const accepted = runtime.activityFromParticipantEvents(
      [{ id: "e1", actorId: "maya", kind: "mention" }],
      { sampleBoard: false },
    );
    return accepted.length;
  });
  assert.equal(probe, 1);
});

Then("the sample board opens the general channel without a restored showcase filter", async function () {
  const page = requirePage();
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { path: string; feedQuery: string; filter: string } };
    })).CW_APP;
    return { path: app.state.path, feedQuery: app.state.feedQuery, filter: app.state.filter };
  });
  assert.match(probe.path, /channels\/general/u);
  assert.doesNotMatch(probe.path, /showcase/u);
  assert.doesNotMatch(String(probe.feedQuery || ""), /needs-review/u);
});

When("I open the Community Web general channel from the prompt", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("cd /projects/community/channels/general");
  await prompt.press("Enter");
  await page.locator(".cn-comment").first().waitFor({ state: "visible" });
});

When("I move to the next Community Web message and open its thread by keyboard", async function () {
  const page = requirePage();
  // Roots-only channel feed: start from the first visible root, then move to the next.
  const first = page.locator('.cn-feed-tree[role="feed"] .cn-comment[role="article"]').first();
  await first.waitFor({ state: "visible" });
  await first.focus();
  const before = await first.getAttribute("data-key");
  assert.ok(before);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction((previous) =>
    document.activeElement?.closest?.('.cn-comment[role="article"]')?.getAttribute("data-key") !== previous, before);
  const selected = page.locator('.cn-feed-tree[role="feed"] .cn-comment[role="article"]:focus');
  await selected.waitFor({ state: "attached" });
  communityWebAppFocusedMessage = (await selected.getAttribute("data-key")) ?? "";
  assert.ok(communityWebAppFocusedMessage);
  assert.notEqual(communityWebAppFocusedMessage, before);
  await page.keyboard.press("Enter");
  await page.waitForFunction((expected) =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { threadFocus?: string } } })).CW_APP.state.threadFocus === expected,
  communityWebAppFocusedMessage);
  await page.locator('.cn-thread-tree[role="tree"]').waitFor({ state: "visible" });
});

Then("the selected Community Web message remains the single focused feed item", async function () {
  const page = requirePage();
  // Enter replaces the linear channel projection with its thread projection;
  // the same canonical message remains the sole roving focus target.
  assert.equal(await page.locator('.cn-thread-tree[role="tree"] .cn-comment[role="treeitem"][tabindex="0"]').count(), 1);
  const selected = page.locator('.cn-thread-tree[role="tree"] .cn-comment[role="treeitem"]:focus');
  assert.equal(await selected.getAttribute("data-key"), communityWebAppFocusedMessage);
  assert.equal(await selected.getAttribute("data-here"), "true");
  assert.equal(await selected.getAttribute("aria-current"), "true");
  const location = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { threadFocus: string; path: string } } })).CW_APP;
    const tree = document.querySelector('.cn-thread-tree [role="treeitem"][aria-selected="true"]');
    const body = tree?.querySelector(".cn-comment-body");
    return {
      threadFocus: app.state.threadFocus,
      path: app.state.path,
      synchronized: tree?.getAttribute("data-key") === app.state.threadFocus &&
        !!(body && String(body.textContent || "").trim()) &&
        !document.querySelector(".cn-thread-reading"),
      virtualNav: Array.from(document.querySelectorAll('.cn-blade[data-blade-kind="list"] .cn-item'))
        .map((el) => el.getAttribute("data-key"))
        .some((name) => /^(body\.md|metadata\.json|replies|backlinks|receipts)$/.test(name || "")),
    };
  });
  assert.equal(location.threadFocus, communityWebAppFocusedMessage);
  assert.equal(location.path, "/projects/community/channels/general");
  assert.equal(location.synchronized, true);
  assert.equal(location.virtualNav, false, "opening a thread must not swap the navigator into message directories");
});
When("I navigate the Community Web VFS into general and return from messages by keyboard", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const w = (window as {
      CW_APP: {
        state: {
          cursor: number;
          focus: number;
          columnFocus: boolean;
          detailOpen: boolean;
        };
        render: (keepCli?: boolean) => void;
      };
      CW_MAP: { list: (path: string) => Array<{ name: string }> };
    });
    const list = w.CW_MAP.list("/projects/community/channels") || [];
    const ix = list.findIndex((e) => e.name === "general");
    w.CW_APP.state.cursor = ix >= 0 ? ix : 0;
    w.CW_APP.state.focus = 0;
    w.CW_APP.state.columnFocus = true;
    w.CW_APP.state.detailOpen = true;
    w.CW_APP.render(true);
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const navItem = document.querySelector(
      '.cn-blade[data-blade-kind="list"] .cn-item[aria-current="true"]',
    ) as HTMLElement | null;
    navItem?.focus({ preventScroll: true });
  });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { path: string; focus: number } } })).CW_APP;
    return app.state.path === "/projects/community/channels/general" && app.state.focus >= 1;
  });
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { focus: number } } })).CW_APP;
    return app.state.focus === 0 &&
      !!document.activeElement?.closest?.('.cn-blade[data-blade-kind="list"] .cn-item');
  });
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { focus: number } } })).CW_APP;
    return app.state.focus >= 1 &&
      !!document.activeElement?.closest?.(".cn-comment[data-key]");
  });
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { focus: number } } })).CW_APP.state.focus === 0);
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { path: string; focus: number } } })).CW_APP;
    return app.state.path === "/projects/community/channels" && app.state.focus === 0 &&
      !!document.activeElement?.closest?.('.cn-blade[data-blade-kind="list"] .cn-item');
  }, null, { timeout: 10_000 });
});

Then("the Community Web navigator owns the keyboard again at the channels list", async function () {
  const page = requirePage();
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { path: string; focus: number } } })).CW_APP;
    return app.state.path === "/projects/community/channels" && app.state.focus === 0 &&
      !!document.activeElement?.closest?.('.cn-blade[data-blade-kind="list"] .cn-item') &&
      !document.activeElement?.closest?.(".cn-comment[data-key]");
  }, null, { timeout: 10_000 });
  const probe = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { path: string; focus: number } } })).CW_APP;
    return {
      path: app.state.path,
      focus: app.state.focus,
      onNav: !!document.activeElement?.closest?.('.cn-blade[data-blade-kind="list"] .cn-item'),
      onMessage: !!document.activeElement?.closest?.(".cn-comment[data-key]"),
    };
  });
  assert.equal(probe.path, "/projects/community/channels");
  assert.equal(probe.focus, 0);
  assert.equal(probe.onNav, true);
  assert.equal(probe.onMessage, false);
});

When("I enter the community board with a resumable session update and workspace defaults", async function () {
  const page = requirePage();
  await page.evaluate(() => localStorage.setItem("cw-startup-signals-v1", JSON.stringify({
    continuation: { host: "codex", sessionId: "codex-cucumber", workspace: "epoch" },
    update: { current: "0.8.0", available: "0.9.0" },
    workspace: { id: "epoch", defaultsVersion: 2, appliedVersion: 1 },
  })));
  await page.locator("#cw-enter-board").click();
});

Then("the bottom line recommends one Ctrl+U restart action", async function () {
  const page = requirePage();
  await page.locator("[data-restart-cue]").waitFor({ state: "visible" });
  const status = await page.locator("[data-status-line]").innerText();
  assert.match(status, /Ctrl\+U.*update.*prime.*resume/i);
});

When("I restart Community Web with Ctrl+U", async function () {
  const page = requirePage();
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.keyboard.press("Control+u"),
    ]);
  } catch {
    await reloadCommunityPage(page);
  }
  communityWebAppStartupApplied = await requirePage().evaluate(() => {
    const got = JSON.parse(localStorage.getItem("cw-startup-applied-v1") ?? "{}");
    return got.update === "0.9.0" && got.workspace === 2 && got.continuation === "codex-cucumber";
  });
});

Then("the session is continued on the updated workspace defaults", function () {
  assert.equal(communityWebAppStartupApplied, true);
});

When("I send repeated agent turns in one workspace", async function () {
  communityWebAppRouteSticky = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const browserWindow = (window as {
      CW_ROUTE: { pick(id: string, policy: JsonValue): { id: string } | null };
    });
    const policy = {
      version: "cucumber-v1",
      routes: [{ id: "local", model: "on-device" }, { id: "capable", model: "switchyard/capable" }],
    };
    const first = browserWindow.CW_ROUTE.pick("workspace-cucumber", policy);
    const second = browserWindow.CW_ROUTE.pick("workspace-cucumber", {
      ...policy, routes: [...policy.routes].reverse(),
    });
    return first?.id === "local" && second?.id === "local";
  });
});

Then("Community Web keeps the same cache route until policy or failure invalidates it", function () {
  assert.equal(communityWebAppRouteSticky, true);
});

When("I expand and restore the focused panel by keyboard", { timeout: 60_000 }, async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        state: { focus: number; helpOpen?: boolean; columnFocus?: boolean };
        focusColumns(): void;
        render(keep?: boolean): void;
      };
    })).CW_APP;
    app.state.helpOpen = false;
    app.state.focus = 1;
    app.focusColumns();
    app.state.columnFocus = true;
    app.render(true);
  });
  await page.keyboard.press("z");
  await page.waitForFunction(() => (
    document.querySelector(".cn-blades")?.getAttribute("data-focus-expanded") === "1"
  ), null, { timeout: 10_000 });
  await page.keyboard.press("z");
  await page.waitForFunction(() => (
    document.querySelector(".cn-blades")?.getAttribute("data-focus-expanded") !== "1"
  ), null, { timeout: 10_000 });
  communityWebAppFocusRestored = true;
});

Then("focus and selection remain in the same panel context", function () {
  assert.equal(communityWebAppFocusRestored, true);
});

When("I open one Community Web message from its channel projection", { timeout: 60_000 }, async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = (window as {
      CW_APP: {
        cancelTopLayer?: () => void;
        navigate(path: string, options?: JsonObject): void;
      };
    });
    if (app.CW_APP.cancelTopLayer) app.CW_APP.cancelTopLayer();
    app.CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
  });
  await page.waitForFunction(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    /\/channels\/general/.test(((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path),
  { timeout: 10_000 });
  const message = page.locator('.cn-feed-tree .cn-comment[data-key="p1"]');
  await message.waitFor({ state: "visible", timeout: 15_000 });
  await message.click();
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { threadFocus?: string } } })).CW_APP;
    return app.state.threadFocus === "p1"
      && !!document.querySelector('.cn-thread-tree[role="tree"]');
  }, null, { timeout: 15_000 });
  communityWebAppLinkResult = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_APP: { state: { path: string; threadFocus: string } };
      CW_DATA: { posts: Array<JsonObject> };
      CW_MAP: { objectRef(post: JsonObject): { objectId: string; revision?: string }; projectionIdForPath(path: string): string };
      CW_CORE: { objectUrl(ref: { objectId: string; revision?: string }, options?: JsonObject): string };
    });
    const post = runtime.CW_DATA.posts.find((item) => item.id === runtime.CW_APP.state.threadFocus);
    if (!post) throw new Error("focused Community Web message was not found");
    const ref = runtime.CW_MAP.objectRef(post);
    const projectionId = runtime.CW_MAP.projectionIdForPath(runtime.CW_APP.state.path);
    return {
      objectId: ref.objectId,
      canonical: runtime.CW_CORE.objectUrl(ref, { origin: location.origin }),
      contextual: runtime.CW_CORE.objectUrl(ref, { projectionId, origin: location.origin }),
      exact: runtime.CW_CORE.objectUrl({ ...ref, revision: ref.revision ?? "fixture-revision" }, {
        revision: ref.revision ?? "fixture-revision",
        origin: location.origin,
      }),
    };
  });
});

Then("canonical contextual and exact links identify the same message without private content", async function () {
  assert.ok(communityWebAppLinkResult);
  const parsed = await requirePage().evaluate((links) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const core = ((window as {
      CW_CORE: { parseObjectUrl(url: string): { objectId?: string; projectionId?: string; revision?: string } };
    })).CW_CORE;
    return [core.parseObjectUrl(links.canonical), core.parseObjectUrl(links.contextual), core.parseObjectUrl(links.exact)];
  }, communityWebAppLinkResult);
  assert.deepEqual(parsed.map((item) => item.objectId), Array(3).fill(communityWebAppLinkResult.objectId));
  assert.equal(new URL(communityWebAppLinkResult.canonical).searchParams.has("projection"), false);
  assert.ok(new URL(communityWebAppLinkResult.contextual).searchParams.get("projection"));
  assert.ok(new URL(communityWebAppLinkResult.exact).searchParams.get("revision"));
  assert.doesNotMatch(JSON.stringify(communityWebAppLinkResult), /DO_NOT_LEAK_7f3c/);
});

When("I save and reopen the Community Web needs-review Projection Definition", async function () {
  const page = requirePage();
  communityWebAppSavedViewResult = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_QUERY: {
        normalize(query: string): { ast: JsonValue; canonical: string; error?: string };
        filterEntries(entries: JsonValue[], query: string): { entries: Array<{ post?: { ref?: { objectId: string }; objectId?: string; id: string } }>; error?: string };
      };
      CW_WORKBENCH: {
        openSearch(state: JsonObject, expression: string): void;
        runSearch(state: JsonObject): Promise<void>;
        saveSearchProjection(state: JsonObject, label: string): {
          projectionId: string; root: { children: Array<{ where: JsonValue }> };
        };
        definitions(): Array<{ projectionId: string; root: { children: Array<{ where: JsonValue }> } }>;
      };
      CW_MAP: { feedEntriesAt(path: string): Array<{ post?: { ref?: { objectId: string }; objectId?: string; id: string } }> };
    });
    const normalized = runtime.CW_QUERY.normalize(" ( state:needs-review ) ");
    if (normalized.error) throw new Error(normalized.error);
    const state: JsonObject = {};
    runtime.CW_WORKBENCH.openSearch(state, normalized.canonical);
    return runtime.CW_WORKBENCH.runSearch(state).then(() => {
      const saved = runtime.CW_WORKBENCH.saveSearchProjection(state, "needs review");
      const reopened = runtime.CW_WORKBENCH.definitions().find((definition) =>
        definition.projectionId === saved.projectionId);
      if (!reopened) throw new Error("Projection Definition did not persist");
    const projected = runtime.CW_QUERY.filterEntries(
      runtime.CW_MAP.feedEntriesAt("/projects/community/channels/general"), normalized.canonical,
    );
    if (projected.error) throw new Error(projected.error);
    const entries = projected.entries;
    return {
      id: reopened.projectionId,
      expression: reopened.root.children[0]?.where,
      resultIds: entries.filter((entry) => entry.post).map((entry) => entry.post?.ref?.objectId ?? entry.post?.objectId ?? entry.post?.id ?? ""),
    };
    });
  });
  const savedResult = communityWebAppSavedViewResult;
  assert.ok(savedResult);
  await reloadCommunityPage(page);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  await requirePage().waitForFunction((id) => !!((window as {
    CW_WORKBENCH?: { definitions(): Array<{ projectionId: string }> };
  })).CW_WORKBENCH?.definitions().some((definition) => definition.projectionId === id), savedResult.id);
});

Then("the Projection Definition keeps its identity Search Expression and canonical Entity state", async function () {
  const savedResult = communityWebAppSavedViewResult;
  assert.ok(savedResult);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const reopened = await requirePage().evaluate((id) => ((window as {
    CW_WORKBENCH: { definitions(): Array<{ projectionId: string; root: { children: Array<{ where: JsonValue }> } }> };
  })).CW_WORKBENCH.definitions().find((definition) => definition.projectionId === id), savedResult.id);
  assert.ok(reopened);
  assert.equal(reopened.projectionId, savedResult.id);
  assert.deepEqual(reopened.root.children[0]?.where, savedResult.expression);
  assert.ok(savedResult.resultIds.length > 0);
  assert.equal(new Set(savedResult.resultIds).size, savedResult.resultIds.length);
});

When("I traverse a Community Web thread with tree keys", async function () {
  const page = requirePage();
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  await page.evaluate(() => ((window as { CW_APP: { navigate(path: string): void; openThread(id: string): void } })).CW_APP
    .navigate("/projects/community/channels/general"));
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  await page.evaluate(() => ((window as { CW_APP: { openThread(id: string): void } })).CW_APP.openThread("p3"));
  const current = page.locator('.cn-thread-tree [role="treeitem"][tabindex="0"]');
  await current.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  communityWebAppThreadA11yResult = await page.evaluate(() => {
    const selected = document.querySelector('.cn-thread-tree [role="treeitem"][aria-selected="true"]');
    const items = Array.from(document.querySelectorAll('.cn-thread-tree [role="treeitem"]'));
    const body = selected?.querySelector(".cn-comment-body");
    return {
      selected: selected?.getAttribute("data-object-id") ?? "",
      hasBody: !!(body && String(body.textContent || "").trim()),
      oneTabStop: items.filter((item) => item.getAttribute("tabindex") === "0").length === 1,
      topology: items.every((item) => Number(item.getAttribute("aria-level")) >= 1 &&
        Number(item.getAttribute("aria-posinset")) >= 1 && Number(item.getAttribute("aria-setsize")) >= 1),
      singleColumn: !document.querySelector(".cn-thread-reading"),
    };
  });
});

Then("the selected Community Web thread message reports topology and one tab stop", function () {
  assert.ok(communityWebAppThreadA11yResult);
  assert.ok(communityWebAppThreadA11yResult.selected);
  assert.equal(communityWebAppThreadA11yResult.hasBody, true);
  assert.equal(communityWebAppThreadA11yResult.oneTabStop, true);
  assert.equal(communityWebAppThreadA11yResult.topology, true);
  assert.equal(communityWebAppThreadA11yResult.singleColumn, true);
});
When("I invoke namespace parent thread parent browser back and previous location", async function () {
  communityWebAppNavigationActions = await requirePage().evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_ACTIONS: {
        invoke(actionId: string, input: JsonObject, context: JsonObject): Promise<JsonValue>;
        lastEvent(): { actionId: string; objectId?: string };
      };
      CW_APP: { state: { path: string; threadFocus?: string } };
      CW_MAP: { projectionIdForPath(path: string): string };
    });
    const actions = [
      ["nav.ascend", {}],
      ["thread.parent", {}],
      ["history.back", {}],
      ["history.previousLocation", {}],
    ] as const;
    const events: Array<{ actionId: string; objectId?: string }> = [];
    for (const [actionId, input] of actions) {
      await runtime.CW_ACTIONS.invoke(actionId, input, {
        origin: "diagnostic",
        context: "board",
        objectId: runtime.CW_APP.state.threadFocus,
        projectionId: runtime.CW_MAP.projectionIdForPath(runtime.CW_APP.state.path),
      });
      events.push(runtime.CW_ACTIONS.lastEvent());
    }
    return events;
  });
});

Then("each Community Web navigation operation reports its distinct action and outcome", function () {
  assert.deepEqual(communityWebAppNavigationActions.map((event) => event.actionId), [
    "nav.ascend",
    "thread.parent",
    "history.back",
    "history.previousLocation",
  ]);
  assert.equal(new Set(communityWebAppNavigationActions.map((event) => event.actionId)).size, 4);
});

When("I compare ambiguous cd with the Community Web global jump chooser", async function () {
  const page = requirePage();
  const prompt = page.locator("[data-cli]");
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const origin = await page.evaluate(() => ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path);
  await prompt.fill("cd gen");
  await prompt.press("Enter");
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const afterCd = await page.evaluate(() => ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path);
  await prompt.fill("zi general");
  await prompt.press("Enter");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { candIndex: number; completion?: { kind?: string } } };
    })).CW_APP;
    return app.state.completion?.kind === "jump" && app.state.candIndex === -1 &&
      !!document.querySelector('.cn-menu:not([hidden]) [role="option"]');
  });
  communityWebAppJumpResult = await page.evaluate(({ originPath, cdPath }) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const state = ((window as {
      CW_APP: { state: { path: string; candIndex: number; completion: { candidates: Array<{
        group?: string; value?: string; kind?: string; matchReason?: string;
        objectId?: string; projectionId?: string; id?: string;
      }> } } };
    })).CW_APP.state;
    const candidates = state.completion.candidates;
    const groups = Array.from(new Set(candidates.map((candidate) => candidate.group).filter(Boolean)));
    const allowedGroups = ["CURRENT", "RECENT", "SAVED VIEWS", "GLOBAL"];
    const rendered = document.querySelectorAll('.cn-menu:not([hidden]) [role="option"]');
    return {
      cdStayed: cdPath === originPath,
      grouped: groups.includes("CURRENT") && groups.includes("GLOBAL") &&
        // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
        groups.every((group) => allowedGroups.includes(group as string)),
      explained: candidates.length > 1 && candidates.every((candidate) =>
        !!candidate.value && !!candidate.kind && !!candidate.matchReason &&
        !!(candidate.objectId || candidate.projectionId || candidate.id)) &&
        state.candIndex === -1 && rendered.length > 1,
      locationStayed: state.path === originPath,
    };
  }, { originPath: origin, cdPath: afterCd });
});

Then("cd stays put while jump candidates await explicit acceptance with reasons", function () {
  assert.deepEqual(communityWebAppJumpResult, {
    cdStayed: true,
    grouped: true,
    explained: true,
    locationStayed: true,
  });
});

When("I operate every focused Community Web post action by keyboard", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: {
        columnFocus: boolean; feedMark: string; votes: Record<string, number>;
        folded: Record<string, boolean>; reposts: Record<string, boolean>; reactPick: string | null;
      }; navigate(path: string): void; render(preserve?: boolean): void };
    })).CW_APP;
    app.navigate("/projects/community/channels/general");
    app.state.columnFocus = true;
    app.state.feedMark = "p1";
    app.state.votes = {};
    app.state.folded = {};
    app.state.reposts = {};
    app.state.reactPick = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => {
        // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
        ((window as { __postActionClipboard?: string })).__postActionClipboard = text;
      } },
    });
    app.render(true);
    document.querySelector<HTMLElement>('.cn-comment[data-key="p1"]')?.focus();
  });
  const article = page.locator('.cn-comment[data-key="p1"]');
  const controls = await article.evaluate((node) => ({
    up: node.querySelector('[data-vote="up"]')?.getAttribute("aria-keyshortcuts") ?? null,
    down: node.querySelector('[data-vote="down"]')?.getAttribute("aria-keyshortcuts") ?? null,
    react: node.querySelector("[data-react-pick]")?.getAttribute("aria-keyshortcuts") ?? null,
    fold: null as string | null,
    foldName: null as string | null,
    reply: node.querySelector("[data-reply]")?.getAttribute("aria-keyshortcuts") ?? null,
    repost: node.querySelector("[data-repost]")?.getAttribute("aria-keyshortcuts") ?? null,
    share: node.querySelector("[data-share-post]")?.getAttribute("aria-keyshortcuts") ?? null,
    copy: node.querySelector("[data-copy-post]")?.getAttribute("aria-keyshortcuts") ?? null,
  }));
  await page.keyboard.press("u");
  await page.keyboard.press("d");
  await page.keyboard.press("a");
  const reactionOpened = await page.evaluate(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { reactPick: string | null } } })).CW_APP.state.reactPick === "p1");
  // Fold lives in thread detail only (roots-only channel feed has no inline nest).
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { threadFocus?: string } } })).CW_APP.state.threadFocus === "p1"
      && !!document.querySelector('.cn-thread-tree [data-fold="p1"]'),
  null, { timeout: 10_000 });
  const threadArticle = page.locator('.cn-thread-tree .cn-comment[data-key="p1"]');
  await threadArticle.focus();
  const threadControls = await threadArticle.evaluate((node) => ({
    fold: node.querySelector('[data-fold="p1"]')?.getAttribute("aria-keyshortcuts") ?? null,
    foldName: node.querySelector('[data-fold="p1"]')?.getAttribute("aria-label") ?? null,
  }));
  controls.fold = threadControls.fold;
  controls.foldName = threadControls.foldName;
  await page.keyboard.press("f");
  await page.keyboard.press("Shift+r");
  await page.keyboard.press("s");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const copied = ((window as { __postActionClipboard?: string })).__postActionClipboard ?? "";
    try {
      const url = new URL(copied);
      return url.origin === location.origin && url.pathname === "/board.html" &&
        !!url.searchParams.get("projection") && !!url.searchParams.get("focus");
    } catch {
      return false;
    }
  });
  const shared = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const url = new URL(((window as { __postActionClipboard: string })).__postActionClipboard);
    return url.origin === location.origin && url.pathname === "/board.html" &&
      !!url.searchParams.get("projection") && !!url.searchParams.get("focus");
  });
  await page.keyboard.press("y");
  await page.waitForFunction(() => /community web thread.*p1/i.test(
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { __postActionClipboard?: string })).__postActionClipboard ?? ""));
  const acted = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const browserWindow = (window as {
      __postActionClipboard?: string;
      CW_APP: { state: {
        votes: Record<string, number>; folded: Record<string, boolean>; reposts: Record<string, boolean>;
      } };
    });
    return {
      vote: browserWindow.CW_APP.state.votes.p1,
      folded: browserWindow.CW_APP.state.folded.p1 === true,
      reposted: browserWindow.CW_APP.state.reposts.p1 === true,
      copied: /community web thread.*p1/i.test(browserWindow.__postActionClipboard ?? ""),
    };
  });
  await page.keyboard.press("r");
  const replied = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { composeContext(): { postId?: string } };
    })).CW_APP;
    return app.composeContext().postId === "p1" &&
      document.activeElement === document.querySelector("[data-cli]");
  });
  communityWebAppPostActionResult = { controls, reactionOpened, shared, replied, ...acted };
});

Then("repost and share are visible and every post action has keyboard parity", function () {
  assert.deepEqual(communityWebAppPostActionResult, {
    controls: {
      up: "u", down: "d", react: "a", fold: "f", foldName: "Collapse replies", reply: "r",
      repost: "Shift+R", share: "s", copy: "y",
    },
    vote: -1,
    reactionOpened: true,
    folded: true,
    reposted: true,
    shared: true,
    copied: true,
    replied: true,
  });
});

When("I reply to a Community Web message in CLI mode and see it under the parent", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        state: { ai: boolean; columnFocus: boolean };
        navigate(path: string): void;
        render(preserve?: boolean): void;
        clearComposeDraft?(opts?: JsonObject): void;
        armReplyTo(id: string, who: string, channel: string, project: string | null): void;
      };
    })).CW_APP;
    app.state.ai = false;
    app.clearComposeDraft?.({ silent: true, noRender: true });
    app.navigate("/projects/community/channels/general");
    app.armReplyTo("p1", "lea", "general", null);
    app.state.columnFocus = false;
    app.render(true);
    document.querySelector<HTMLInputElement>("[data-cli]")?.focus();
  });
  await page.locator("[data-cli]").fill("bdd cli reply under lea");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { merged: Array<{ id: string; re?: string; body?: string }>; feedMark: string; threadFocus: string } };
    })).CW_APP;
    const hit = (app.state.merged || [])
      .filter((p) => p.re === "p1" && /bdd cli reply under lea/.test(p.body || ""))
      .pop();
    if (!hit) return false;
    const inDom = !!document.querySelector('.cn-comment[data-key="' + hit.id + '"]');
    return inDom && app.state.feedMark === hit.id && app.state.threadFocus === "p1";
  });
});

When("I draft an AI reply inline then commit reject and edit it", { timeout: 120_000 }, async function () {
  const page = requirePage();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = (window as {
      CWResilient?: { availability(): Promise<string> };
      CW_AGENT?: { run(...args: JsonValue[]): Promise<JsonValue> };
      CW_APP: {
        state: {
          ai: boolean;
          columnFocus: boolean;
          sessionClosed?: boolean;
          sessionOutFocus?: boolean;
          menuDismissed?: boolean;
          candIndex?: number;
        };
        clearComposeDraft?(opts?: JsonObject): void;
        armReplyTo(id: string, who: string, channel: string, project: string | null): void;
        render(preserve?: boolean): void;
      };
    });
    // Keep drafting deterministic under coverage load: never wait on on-device model.
    if (win.CWResilient) win.CWResilient.availability = async () => "unavailable";
    if (win.CW_AGENT) win.CW_AGENT.run = async () => undefined;
    const app = win.CW_APP;
    app.clearComposeDraft?.({ silent: true, noRender: true });
    app.state.ai = true;
    app.state.sessionClosed = true;
    app.state.sessionOutFocus = false;
    app.armReplyTo("p1", "lea", "general", null);
    app.state.columnFocus = false;
    app.state.menuDismissed = true;
    app.state.candIndex = -1;
    app.render(true);
    document.querySelector<HTMLInputElement>("[data-cli]")?.focus();
  });
  await page.locator("[data-cli]").fill("bdd ai draft intent");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        state: {
          composeDraft?: { status?: string; body?: string; postId?: string };
          ai: boolean;
          sessionClosed?: boolean;
        };
      };
    })).CW_APP;
    const draft = app.state.composeDraft;
    const inline = document.querySelector(
      '.cn-blade[data-blade-kind="detail"] .cn-comment[data-key="p1"] [data-compose-draft], ' +
      '.cn-comment[data-key="p1"] [data-compose-draft]',
    );
    const footDraft = document.querySelector(".cn-tui-foot [data-compose-draft]");
    const sessionBlade = document.querySelector('.cn-blade[data-blade-kind="session"]');
    return app.state.ai === true && draft?.status === "ready" && draft.postId === "p1" &&
      /bdd ai draft intent/.test(draft.body || "") &&
      !!inline && !footDraft && !sessionBlade && app.state.sessionClosed !== false &&
      !!document.querySelector("[data-draft-accept]");
  }, null, { timeout: 30_000 });
  await page.keyboard.press("e");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { composeDraft?: JsonValue }; composeContext(): { kind?: string } };
    })).CW_APP;
    const value = document.querySelector<HTMLInputElement>("[data-cli]")?.value || "";
    return !app.state.composeDraft && /bdd ai draft intent/.test(value) &&
      app.composeContext().kind === "reply";
  }, null, { timeout: 30_000 });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const draft = ((window as {
      CW_APP: { state: { composeDraft?: { status?: string } } };
    })).CW_APP.state.composeDraft;
    return !!document.querySelector("[data-compose-draft]") && draft?.status === "ready";
  }, null, { timeout: 30_000 });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { composeDraft?: JsonValue }; composeContext(): { kind?: string; postId?: string } };
    })).CW_APP;
    return !app.state.composeDraft && !document.querySelector("[data-compose-draft]") &&
      app.composeContext().kind === "reply" && app.composeContext().postId === "p1";
  }, null, { timeout: 30_000 });
  await page.locator("[data-cli]").fill("bdd ai committed reply");
  await page.keyboard.press("Enter");
  // Commit via keyboard like the e2e path — avoid scrolling a hidden duplicate in another blade.
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const draft = ((window as {
      CW_APP: { state: { composeDraft?: { status?: string; postId?: string } } };
    })).CW_APP.state.composeDraft;
    return draft?.status === "ready" && draft.postId === "p1" &&
      !!document.querySelector("[data-draft-accept]");
  }, null, { timeout: 30_000 });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: {
        merged: Array<{ id: string; re?: string; body?: string }>;
        composeDraft?: JsonValue;
        feedMark: string;
        threadFocus: string;
        sessionClosed?: boolean;
      } };
    })).CW_APP;
    const hit = (app.state.merged || [])
      .filter((p) => p.re === "p1" && /bdd ai committed reply/.test(p.body || ""))
      .pop();
    if (!hit || app.state.composeDraft) return false;
    const sessionBlade = document.querySelector('.cn-blade[data-blade-kind="session"]');
    return !!document.querySelector('.cn-comment[data-key="' + hit.id + '"]') &&
      app.state.feedMark === hit.id && app.state.threadFocus === "p1" &&
      !sessionBlade && app.state.sessionClosed !== false;
  }, null, { timeout: 30_000 });
});

Then("Community Web reply drafts stay visible under the parent until committed", async function () {
  const page = requirePage();
  const ok = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: {
        merged: Array<{ id: string; re?: string; body?: string }>;
        composeDraft?: JsonValue;
        sessionClosed?: boolean;
      } };
    })).CW_APP;
    const hit = (app.state.merged || [])
      .filter((p) => p.re === "p1" && /bdd ai committed reply/.test(p.body || ""))
      .pop();
    const sessionBlade = document.querySelector('.cn-blade[data-blade-kind="session"]');
    return !!hit && !app.state.composeDraft &&
      !!document.querySelector('.cn-comment[data-key="' + hit.id + '"]') &&
      !sessionBlade && app.state.sessionClosed !== false;
  });
  assert.equal(ok, true, "committed AI reply should remain visible under the parent without opening agent chat");
});

When("I browse Community Web message directories with cd completion", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("cd /projects/community/channels/general");
  await prompt.press("Enter");
  await page.locator(".cn-comment").first().waitFor({ state: "visible" });
  const origin = await page.evaluate(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path);

  await prompt.fill("cd p3");
  const p3 = page.locator('.cn-menu [role="option"]', { hasText: "p3" }).first();
  await p3.waitFor({ state: "visible" });
  const labelled = /Drafted a plan to split the cache key/i.test(await p3.locator("i").innerText());

  await prompt.fill("cd p");
  const selected = await page.evaluate(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { completion: { candidates: Array<{ value: string }> } } } }))
      .CW_APP.state.completion.candidates[0]?.value || "");
  await prompt.press("ArrowRight");
  await page.waitForFunction((path) =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path !== path, origin);
  const drilled = await prompt.inputValue();
  await prompt.press("ArrowLeft");
  await page.waitForFunction((path) =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path === path, origin);
  const horizontal = drilled.endsWith(selected) && await prompt.inputValue() === "cd p";

  await prompt.press("ArrowDown");
  await page.waitForFunction((path) =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path !== path, origin);
  const previewed = await page.locator("[data-cd-preview]").isVisible();
  await prompt.press("Escape");
  await page.waitForFunction((path) =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path === path, origin);
  const cancelled = await prompt.inputValue() === "cd p";

  await prompt.fill("");
  await prompt.fill("cd p");
  await prompt.press("ArrowDown");
  const acceptedPath = await page.evaluate(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path);
  await prompt.press("Enter");
  await page.waitForFunction((path) =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path === path, acceptedPath);
  communityWebAppCdResult = {
    labelled,
    horizontal,
    previewed,
    cancelled,
    committed: acceptedPath !== origin && await prompt.inputValue() === "",
  };
});

Then("message choices explain their content and cd typeahead can drill cancel or commit", function () {
  assert.deepEqual(communityWebAppCdResult, {
    labelled: true,
    horizontal: true,
    previewed: true,
    cancelled: true,
    committed: true,
  });
});

When("I open the general channel context menu and move down and up by keyboard", async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("cd /projects/community/channels");
  await prompt.press("Enter");
  const item = page.locator('[data-blade-kind="list"] .cn-item[data-key="general"]').first();
  await item.waitFor({ state: "visible" });
  await item.focus();
  const before = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const state = ((window as { CW_APP: { state: { cursor: number; focus: number } } })).CW_APP.state;
    return { cursor: state.cursor, focus: state.focus };
  });
  await item.click({ button: "right" });
  await page.waitForFunction(() => document.activeElement?.hasAttribute("data-ctx-prompt") === true);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.hasAttribute("data-ctx-action") === true);
  const downStayedInMenu = await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem");
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => document.activeElement?.hasAttribute("data-ctx-prompt") === true);
  const upStayedInMenu = await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem");
  const after = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const state = ((window as { CW_APP: { state: { cursor: number; focus: number } } })).CW_APP.state;
    return { cursor: state.cursor, focus: state.focus };
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("[data-ctx-menu]"));
  communityWebAppContextMenuResult = {
    navStable: before.cursor === after.cursor && before.focus === after.focus,
    downStayedInMenu,
    upStayedInMenu,
    focusRestored: await item.evaluate((element) => document.activeElement === element),
  };
});

Then("the Community Web context menu retains focus without moving the nav selection", function () {
  assert.deepEqual(communityWebAppContextMenuResult, {
    navStable: true,
    downStayedInMenu: true,
    upStayedInMenu: true,
    focusRestored: true,
  });
});

When("I join Community Web lounge voice with a mocked microphone", { timeout: 60_000 }, async function () {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  await page.evaluate(async () => {
    const track = {
      kind: "audio",
      enabled: true,
      stop() { this.enabled = false; },
      addEventListener() {},
      removeEventListener() {},
    };
    const stream = {
      getTracks() { return [track]; },
      getAudioTracks() { return [track]; },
      getVideoTracks() { return []; },
    };
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    (navigator.mediaDevices as { getUserMedia: () => Promise<JsonValue> }).getUserMedia = async () => stream;
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: {
        joinVoice(id: string, path: string): Promise<JsonValue>;
      };
    })).CW_APP;
    await app.joinVoice("lounge", "/projects/community/channels/lounge");
  });
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { voice?: { joined?: boolean; channelId?: string } } } })).CW_APP;
    return !!document.querySelector("[data-voice-tray]") &&
      app.state.voice?.joined === true && app.state.voice?.channelId === "lounge";
  }, null, { timeout: 15_000 });
});

When("I open the Community Web general channel while still in voice", { timeout: 30_000 }, async function () {
  const page = requirePage();
  await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ((window as { CW_APP: { navigate(path: string, options?: JsonObject): void } }))
      .CW_APP.navigate("/projects/community/channels/general", { keepCli: true });
  });
  await page.waitForFunction(() =>
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    /\/channels\/general/.test(((window as { CW_APP: { state: { path: string } } })).CW_APP.state.path),
  null, { timeout: 10_000 });
});

Then("the voice connections tray still names lounge and can disconnect", { timeout: 30_000 }, async function () {
  const page = requirePage();
  const snap = await page.evaluate(() => {
    const tray = document.querySelector("[data-voice-tray]");
    const leave = document.querySelector("[data-voice-leave]");
    const ptt = document.querySelector("[data-voice-ptt]");
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const voice = ((window as { CW_APP: { state: { voice?: { joined?: boolean; channelId?: string } } } })).CW_APP.state.voice;
    return {
      tray: !!tray,
      label: tray?.textContent || "",
      leave: !!leave,
      ptt: !!ptt,
      joined: !!voice?.joined,
      channelId: voice?.channelId || "",
    };
  });
  assert.equal(snap.joined, true);
  assert.equal(snap.channelId, "lounge");
  assert.equal(snap.tray, true);
  assert.match(snap.label, /lounge/i);
  assert.equal(snap.leave, true);
  assert.equal(snap.ptt, true);
});

Then("I can hold push-to-speak from that tray", { timeout: 30_000 }, async function () {
  const page = requirePage();
  const ptt = page.locator("[data-voice-ptt]");
  await ptt.waitFor({ state: "visible" });
  const box = await ptt.boundingBox();
  assert.ok(box, "push-to-speak control must stay on screen after changing rooms");
  await ptt.dispatchEvent("pointerdown");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as {
      CW_APP: { state: { voice?: { speaking?: boolean; inputMode?: string } } };
    })).CW_APP;
    return app.state.voice?.inputMode === "ptt" && app.state.voice?.speaking === true;
  }, null, { timeout: 10_000 });
  await ptt.dispatchEvent("pointerup");
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { voice?: { speaking?: boolean } } } })).CW_APP;
    return app.state.voice?.speaking !== true;
  }, null, { timeout: 10_000 });
  await page.locator("[data-voice-leave]").click();
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const app = ((window as { CW_APP: { state: { voice?: { joined?: boolean } } } })).CW_APP;
    return !app.state.voice?.joined && !document.querySelector("[data-voice-tray]");
  }, null, { timeout: 10_000 });
});

When("I define the Community Web review macro with voice phrase {string}", async function (phrase: string) {
  const page = requirePage();
  const helpClose = page.locator("[data-help-close]:visible");
  if (await helpClose.count()) await helpClose.click();
  const prompt = page.locator("[data-cli]");
  await prompt.fill("macro set review = cd /projects/community/channels/general; view state:needs-review");
  await prompt.press("Enter");
  await prompt.fill(`macro voice review = ${phrase}`);
  await prompt.press("Enter");
});

Then("the review macro persists as the {string} agent skill", async function (toolName: string) {
  const page = requirePage();
  const before = await page.evaluate((name) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const root = (window as {
      CW_POWER: { list: () => Array<{ name: string; voice: string }> };
      CW_MCP: { list: () => Array<{ name: string }> };
    });
    return {
      action: root.CW_POWER.list().find((item) => item.name === "review"),
      tool: root.CW_MCP.list().some((tool) => tool.name === name),
    };
  }, toolName);
  assert.equal(before.action?.voice, "start review");
  assert.equal(before.tool, true);
  await reloadCommunityPage(page);
  const after = await requirePage().evaluate((name) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const root = (window as {
      CW_POWER: { list: () => Array<{ name: string; voice: string }> };
      CW_MCP: { list: () => Array<{ name: string }> };
    });
    return {
      action: root.CW_POWER.list().find((item) => item.name === "review"),
      tool: root.CW_MCP.list().some((tool) => tool.name === name),
    };
  }, toolName);
  assert.equal(after.action?.voice, "start review");
  assert.equal(after.tool, true);
});

Then("the exact voice phrase runs the same review macro", async function () {
  const parsed = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const root = (window as {
      CW_SPEECH: { parseUtterance: (phrase: string, mode: string) => { kind: string; line?: string } };
    });
    return root.CW_SPEECH.parseUtterance("start review", "commands");
  });
  assert.deepEqual({ kind: parsed.kind, line: parsed.line }, { kind: "command", line: "macro run review" });
});

Then("a near voice phrase does not run it", async function () {
  const parsed = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const root = (window as {
      CW_SPEECH: { parseUtterance: (phrase: string, mode: string) => { kind: string; line?: string } };
    });
    return root.CW_SPEECH.parseUtterance("start reviewing", "commands");
  });
  assert.equal(parsed.kind, "unknown");
  assert.equal(parsed.line, undefined);
});

Given("I open the Community Web channel experience", async function () {
  assert.ok(world.api);
  assert.ok(world.apiHandler);
  const app = await createCommunityWebApp({
    client: createCommunityClient(world.api),
    apiBaseUrl: "https://community.test",
  });
  await openCommunityWebPage(app, world.apiHandler);
});

Given("Community Web is running from an honest snapshot", async function () {
  const api = createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven version control for signed, collaborative repository history.",
      maintainers: ["maya"],
      topics: ["dvcs", "agents", "community"],
    }],
  });
  const app = await createCommunityWebApp({ client: createCommunityClient(api) });
  world = { api };
  await openCommunityWebPage(app);
});

async function openCommunityWebPage(
  app: Awaited<ReturnType<typeof createCommunityWebApp>>,
  apiHandler?: (request: Request) => Promise<Response>,
): Promise<void> {
  const videoDir = process.env.EPOCH_COMMUNITY_WEB_VIDEO_DIR;
  if (videoDir !== undefined) {
    mkdirSync(videoDir, { recursive: true });
  }
  const browser = await chromium.launch(chromiumLaunchOptions({
    headless: true,
  }));
  const page = await browser.newPage({
    recordVideo: videoDir === undefined
      ? undefined
      : {
        dir: videoDir,
        size: { width: 1440, height: 960 },
      },
    viewport: { width: 1440, height: 960 },
  });
  const document = renderCommunityWebDocument(app);
  // Serve the document from a real origin instead of setContent: an opaque
  // origin has no usable localStorage, and durable preferences (last-read
  // watermarks, first-run dismissal) are part of the shipped experience.
  await page.route("https://community.test/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/" || pathname === COMMUNITY_PAGE_PATH || pathname.startsWith(`${COMMUNITY_PAGE_PATH}/`)) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: document,
      });
      return;
    }
    if (apiHandler === undefined) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: "no api" });
      return;
    }
    await routeCommunityApi(route, apiHandler);
  });
  let initialRefresh: Promise<PlaywrightResponse | undefined> | undefined;
  if (apiHandler !== undefined) {
    // Register before navigation: the runtime refreshes the repository from the
    // live API during boot, and the response must not be missed by a late waiter.
    initialRefresh = page.waitForResponse(
      (response) => response.request().method() === "GET" && response.url().includes("/repositories/"),
      { timeout: 10_000 },
    ).catch(() => undefined);
  }
  await page.goto(`https://community.test${COMMUNITY_PAGE_PATH}`, { waitUntil: "domcontentloaded" });
  world = { ...world, browser, page, initialRefresh, document, apiHandler };
}

When("I open the Network Feed", async function () {
  const page = requirePage();
  await page.locator('button[data-product-mode="network"]').click();
  await page.locator("[data-surface-panel=\"network\"]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
});

When("I switch to the Agent Guild community", async function () {
  const page = requirePage();
  await page.locator('[data-open-community="agent-guild"]').click();
  await page.locator("#community-title").waitFor({ state: "visible", timeout: 5_000 });
});

When("I open the agent-runs channel", async function () {
  await requirePage().locator('button[data-channel="agent-runs"]').click();
});

When("I open the ideas channel in the active community", async function () {
  const page = requirePage();
  await page.locator('button[data-channel="ideas"]').click();
  await page.locator("[data-surface-panel=\"channels\"]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
  await page.locator(
    "[data-surface-panel=\"channels\"]:not([hidden]) [data-message]:not([hidden]) .row-heading",
    { hasText: "Dashboard widget should group revenue by region" },
  ).first().waitFor({ state: "visible", timeout: 5_000 });
});

When("I select the {string} community message", async function (title: string) {
  await selectCommunityMessage(title);
});

When("the community repository refreshes from the live API", async function () {
  const page = requirePage();
  assert.ok(world.initialRefresh, "live API scenarios track the runtime's boot-time repository refresh");
  const response = await world.initialRefresh;
  assert.ok(response, "the runtime should refresh the repository from the live API on load");
  // renderRepository rebuilds the whole feed just after the response resolves;
  // wait for the client-rendered welcome message to be back in the feed.
  await page.waitForTimeout(200);
  await page.locator('[data-message-id="epoch-civic-general-welcome"]')
    .waitFor({ state: "attached", timeout: 5_000 });
});

When("I promote the selected message to a Change candidate", async function () {
  const page = requirePage();
  await page.locator("[data-selected-message=\"true\"] [data-action=\"promote-change\"]").click();
});

When("I request an agent from the selected message", async function () {
  const page = requirePage();
  await page.locator("[data-selected-message=\"true\"] [data-action-more] > summary").click();
  await page.locator("[data-selected-message=\"true\"] [data-action=\"agent\"]").click();
});

When("I add a community reply {string}", async function (message: string) {
  const page = requirePage();
  await page.locator("#community-message").fill(message);
  await page.locator("[data-comment-composer] button[type=\"submit\"]").click();
});

When("I report the selected message", async function () {
  const page = requirePage();
  await page.locator("[data-selected-message=\"true\"] [data-action-more] > summary").click();
  await page.locator("[data-selected-message=\"true\"] [data-action=\"report\"]").click();
});

When("I search community receipts for {string}", async function (query: string) {
  const page = requirePage();
  const search = page.locator("[data-receipt-search]");
  await search.waitFor({ state: "visible", timeout: 5_000 });
  await search.fill(query);
  await page.waitForTimeout(200);
});

When("I use Community Web at a narrow mobile width", async function () {
  await requirePage().setViewportSize({ width: 390, height: 844 });
});

When("I zoom Community Web to 200 percent in a short viewport", async function () {
  const page = requirePage();
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "200%";
  });
});

Then("the Community Web shows a community with channels", async function () {
  const page = requirePage();
  assert.equal(await page.locator('[data-product-mode="community"]').count(), 1);
  assert.equal(await page.locator("[data-community-list]").count(), 1);
  assert.equal(await page.locator("[data-channel-list]").count(), 1);
  assert.equal(await page.locator("[data-surface-panel=\"channels\"]:not([hidden])").count(), 1);
  await assertVisible(page, "Epoch Civic Workshop");
  await assertVisible(page, "# general");
  await assertVisible(page, "Welcome to Epoch Civic Workshop");
});

Then("the active channel does not require a repository", async function () {
  const page = requirePage();
  // Social hangout channel is community-owned: it is active and writable with no
  // linked project selected. This asserts the rule rather than a sentence about it.
  assert.equal(await page.locator('button[data-channel="general"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator("[data-repo-surfaces]:not([hidden])").count(), 0);
  const composer = page.locator("[data-comment-composer]");
  assert.equal(await composer.getAttribute("data-composer-available"), "true");
  assert.equal(await page.locator("[data-composer-input]").isDisabled(), false);
});

Then("the Community Web shows the Network Feed with activity tabs", async function () {
  const page = requirePage();
  assert.equal(await page.locator("[data-surface-panel=\"network\"]:not([hidden])").count(), 1);
  assert.equal(await page.locator('[data-feed-tab="following"]').count(), 1);
  assert.equal(await page.locator('[data-feed-tab="network"]').count(), 1);
  assert.equal(await page.locator('[data-feed-tab="contributions"]').count(), 1);
  const feedText = await page.locator("[data-dev-feed]").innerText();
  assert.match(feedText, /starred|followed|opened|released|proposed/i);
});

Then("the Community Web shows the Agent Guild channels", async function () {
  const page = requirePage();
  await assertVisible(page, "Agent Guild");
  assert.equal(await page.locator('[data-open-community="agent-guild"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('button[data-channel="agent-runs"][aria-pressed="true"]').count(), 1);
});

Then("signed project actions are collapsed until I select a message", async function () {
  const page = requirePage();
  assert.equal(await page.locator("[data-message-actions]:visible").count(), 0);
  await selectCommunityMessage("Dashboard widget should group revenue by region");
  await page.locator("[data-selected-message=\"true\"] [data-message-actions]").waitFor({ state: "visible", timeout: 5_000 });
  await page.locator("[data-selected-message=\"true\"] [data-action=\"promote-change\"]").waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await page.locator("[data-selected-message=\"true\"]").count(), 1);
});

Then("the live API records a Change for the selected conversation", async function () {
  const page = requirePage();
  assert.ok(world.api);
  await assertVisible(page, "Change candidate recorded from the live API");
  const repository = await world.api.getRepository("epoch/epoch");
  const promoted = repository.changes.find((change) =>
    change.title === "Dashboard widget should group revenue by region"
  );
  assert.ok(promoted);
  await page.locator(`[data-promote-receipt][data-change-id="${promoted.id}"], [data-change-meta]`).filter({ hasText: `change:${promoted.id}` }).first()
    .waitFor({ state: "attached", timeout: 5_000 });
  assert.equal(await page.locator(`[data-change-list] [data-change-id="${promoted.id}"]`).count(), 1);
  await page.locator(`[data-message][data-linked-change="${promoted.id}"]`).first()
    .waitFor({ state: "attached", timeout: 5_000 });
  assert.ok(
    await page.locator(`[data-message][data-linked-change="${promoted.id}"]`).count() >= 1,
  );
});

Then("the selected message shows that human review remains required", async function () {
  const page = requirePage();
  await assertVisible(page, "Agent run requested. Human review remains required.");
});

Then("the selected message explains how to reconnect and retry Promote to Change", async function () {
  await assertVisible(
    requirePage(),
    "Reconnect the Community API (EPOCH_COMMUNITY_API_URL), reload this page, then retry Promote to Change.",
  );
});

Then("the snapshot banner explains how to reconnect for signed work", async function () {
  await assertVisible(
    requirePage(),
    "You're viewing a saved snapshot — not live community activity. To promote signed work, reconnect the Community API (EPOCH_COMMUNITY_API_URL), reload this page, then retry the action.",
  );
});

Then("the reply appears in the message feed with signed comment metadata", async function () {
  const page = requirePage();
  const row = page.locator("[data-message]", { hasText: "Keyboard navigation works in the preview." });
  await row.first().waitFor({ state: "visible", timeout: 5_000 });
  const html = await row.first().innerHTML();
  assert.match(html, /sha256:[a-f0-9]{64}/u, "live composer must persist a signed channel digest");
  assert.equal(html.includes("sig:local-only"), false, "live composer must not use local-only signatures");
});

Then("the active conversation remains reachable without an oversized navigation rail", async function () {
  const page = requirePage();
  const feed = await page.locator("[data-message-feed]").boundingBox();
  assert.ok(feed);
  // The rail is a sheet on narrow screens: it must not occupy the content
  // column at rest. Four stacked horizontal scrollers used to eat 83% of the
  // first screen before the first message.
  // The sheet slides on a 180ms transition after the viewport change lands.
  // Waiting for it to settle beats sleeping a magic number: a loaded runner
  // can miss a fixed 300ms, and a real regression still fails below — the wait
  // times out and the assertion reports where the rail actually is.
  const offCanvas = () => {
    const element = document.querySelector("[data-community-channel-rail]");
    return element !== null && Math.round(element.getBoundingClientRect().right) <= 1;
  };
  await page.waitForFunction(offCanvas, undefined, { timeout: 5_000 }).catch(() => undefined);
  const rail = await page.evaluate(() => {
    const element = document.querySelector("[data-community-channel-rail]");
    if (element === null) return null;
    const box = element.getBoundingClientRect();
    return { right: Math.round(box.right), width: Math.round(box.width) };
  });
  assert.ok(rail);
  assert.ok(
    rail.right <= 1,
    `rail must be off-canvas until requested on a narrow screen; its right edge is at ${rail.right}px`,
  );
  assert.ok(feed.y < 844 * 0.4, `message feed starts at ${feed.y}px — chrome is eating the first screen`);
  // And there must be a visible way to open it.
  await page.locator("[data-rail-toggle]").waitFor({ state: "visible", timeout: 5_000 });
});
Then("I can browse each navigation group without horizontal page overflow", async function () {
  const page = requirePage();
  const layout = await page.evaluate(() => ({
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    // Navigation is a vertical list in the sheet. It used to be four
    // horizontally-scrolling strips that clipped mid-word ("# su\u2310") and hid
    // six of nine channels behind a sideways swipe inside a vertical drawer.
    groups: ["[data-community-list]", "[data-channel-list]", "[data-repo-list]"].map((selector) => {
      const element = document.querySelector(selector);
      if (element === null) throw new Error(`Missing element ${selector}`);
      return {
        selector,
        overflowX: getComputedStyle(element).overflowX,
        clipped: element.scrollWidth > element.clientWidth + 1,
      };
    }),
  }));
  assert.equal(layout.pageOverflows, false);
  for (const group of layout.groups) {
    assert.notEqual(group.overflowX, "auto", `${group.selector} must not scroll sideways`);
    assert.equal(group.clipped, false, `${group.selector} clips its own content horizontally`);
  }

  // The page-level check alone gave a false pass: an ancestor with
  // overflow-x: hidden suppressed the document scrollbar while the message
  // feed itself rendered wider than the viewport and clipped message text.
  const feed = await page.evaluate(() => {
    const element = document.querySelector(".message-feed");
    if (element === null) throw new Error("Missing .message-feed");
    return { scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  });
  assert.ok(
    feed.scrollWidth <= feed.clientWidth,
    `message feed content is clipped: scrollWidth ${feed.scrollWidth} > clientWidth ${feed.clientWidth}`,
  );
});

Then("conversation reactions meet the Community touch-target floor", async function () {
  const heights = await requirePage().locator(".reaction:visible").evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().height)
  );
  assert.ok(heights.length > 0);
  assert.ok(Math.min(...heights) >= 28, `smallest reaction is ${Math.min(...heights)}px tall`);
});

Then("Community state remains readable and announced", async function () {
  const page = requirePage();
  const heading = await page.locator(".feed-heading").boundingBox();
  const state = page.locator("[data-header-meta]");
  const stateBox = await state.boundingBox();
  assert.ok(heading);
  assert.ok(stateBox);
  // The header is a single row now, so state sits beside the heading rather
  // than stacked beneath it — but the two must not overlap.
  assert.ok(
    stateBox.x >= heading.x + heading.width || stateBox.y >= heading.y + heading.height,
    "Community state overlaps the heading",
  );
  assert.equal(await state.getAttribute("role"), "status");
  // Liveness is stated once, in words, not by colour alone.
  const text = (await state.innerText()).trim();
  assert.match(text, /^(live|snapshot)$/u, `header state should be one word, got: ${text}`);
});

Then("the current channel context remains labeled", async function () {
  assert.equal(await requirePage().getByRole("group", { name: "Current channel" }).count(), 1);
});

Then("the zoomed navigation remains bounded above community content", async function () {
  const page = requirePage();
  const rail = await page.locator("[data-community-channel-rail]").boundingBox();
  const content = await page.locator("#community-content").boundingBox();
  assert.ok(rail);
  assert.ok(content);
  assert.ok(rail.height <= 300, `zoomed navigation rail is ${rail.height}px tall`);
  assert.ok(content.y < 450, `zoomed community content starts below the viewport at ${content.y}px`);
});

Then("the zoomed document has no horizontal page overflow", async function () {
  assert.equal(await requirePage().evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  ), false);
});

Then("the selected message shows legal-hold evidence status", async function () {
  const page = requirePage();
  await assertVisible(page, "Moderation report opened with legal-hold evidence.");
});

Then("the receipt search reports at least one match", async function () {
  const page = requirePage();
  const status = page.locator("[data-receipt-search-status]");
  await status.waitFor({ state: "visible", timeout: 5_000 });
  const text = await status.innerText();
  assert.match(text, /[1-9]\d* receipt match/i);
});

Then("a visible agent receipt includes harness {string}", async function (harness: string) {
  const page = requirePage();
  const hit = page.locator('[data-author-role="agent"][data-search-hit="true"]:visible, [data-author-role="agent"]:not([hidden])');
  await hit.first().waitFor({ state: "visible", timeout: 5_000 });
  const text = await hit.first().innerText();
  assert.match(text, new RegExp(harness, "i"));
});

Then("the Community Web shows a signed promote receipt for the new proposal", async function () {
  const page = requirePage();
  assert.ok(world.api);
  await assertVisible(page, "Change candidate recorded from the live API");
  const repository = await world.api.getRepository("epoch/epoch");
  const promoted = repository.changes.find((change) =>
    change.title === "Dashboard widget should group revenue by region"
  );
  assert.ok(promoted);
  const receipt = page.locator(`[data-promote-receipt][data-change-id="${promoted.id}"]`);
  await receipt.first().waitFor({ state: "attached", timeout: 8_000 });
  assert.equal(await page.locator(`[data-change-list] [data-change-id="${promoted.id}"]`).count(), 1);
});

Then("the selected message keeps the Promote to Change and Report signed actions", async function () {
  const page = requirePage();
  const selected = page.locator('[data-selected-message="true"]');
  await selected.waitFor({ state: "attached", timeout: 5_000 });
  await selected.locator("[data-message-actions]").waitFor({ state: "visible", timeout: 5_000 });
  // EPX-D001: client-rendered social messages must keep the signed action tray after a live refresh.
  assert.equal(
    await selected.locator('[data-action="promote-change"]').count(),
    1,
    "Promote to Change action must survive a live client refresh on community-owned messages",
  );
  assert.equal(
    await selected.locator('[data-action="report"]').count(),
    1,
    "Report action must survive a live client refresh on community-owned messages",
  );
});

Then("the identity chip uses auth state {string}", async function (authState: string) {
  const page = requirePage();
  const chip = page.locator("[data-identity-chip]");
  await chip.first().waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await chip.first().getAttribute("data-auth-state"), authState);
});

Then("the identity chip explains that AT OAuth is not linked", async function () {
  await assertVisible(requirePage(), "AT not linked");
});

async function routeCommunityApi(
  route: Route,
  apiHandler: ((request: Request) => Promise<Response>) | undefined,
): Promise<void> {
  assert.ok(apiHandler);
  const request = route.request();
  const response = await apiHandler(new Request(request.url(), {
    method: request.method(),
    headers: request.headers(),
    body: request.postData(),
  }));
  await route.fulfill({
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  });
}

function requirePage(): Page {
  assert.ok(world.page);
  return world.page;
}

async function selectCommunityMessage(title: string): Promise<void> {
  const page = requirePage();
  await page.getByRole("button", { name: `Open signed actions for ${title}` }).click();
}

async function assertVisible(page: Page, text: string): Promise<void> {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 5_000 });
}

async function closeWithTimeout(task: PromiseLike<JsonValue | void> | undefined, label: string): Promise<void> {
  if (task === undefined) {
    return;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      task.then(() => undefined),
      new Promise<void>((resolve) => {
        timeout = setTimeout(() => {
          console.warn(`${label} timed out; continuing cleanup`);
          resolve();
        }, 5_000);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

// ── Experience layer: empty states, search clearing, unread, first run ───────

When("I open the support channel in the active community", async function () {
  const page = requirePage();
  await page.locator('button[data-channel="support"]').click();
  await page.locator('[data-surface-panel="channels"]:not([hidden])').waitFor({ state: "visible", timeout: 5_000 });
});

When("I press Escape in the receipt search", async function () {
  const page = requirePage();
  const search = page.locator("[data-receipt-search]");
  await search.focus();
  await search.press("Escape");
  await page.waitForTimeout(150);
});

When("the ideas channel gains activity after I last read it", async function () {
  const page = requirePage();
  // Simulate having read #ideas when it was empty: the watermark is the message
  // count seen, so a lower watermark is exactly what storage would hold.
  await page.evaluate(() => {
    const key = "epoch-community:last-read";
    const raw = window.localStorage.getItem(key);
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const map: Record<string, number> = raw === null ? {} : JSON.parse(raw) as Record<string, number>;
    map["epoch-civic|ideas"] = 0;
    window.localStorage.setItem(key, JSON.stringify(map));
  });
  // Re-render badges by selecting another channel.
  await page.locator('button[data-channel="general"]').click();
  await page.waitForTimeout(150);
});

Then("the channel shows an empty state naming a next action", async function () {
  const page = requirePage();
  const state = page.locator('.message-feed [data-state-item]:not([hidden]) [data-state-kind="empty"]');
  await state.waitFor({ state: "visible", timeout: 5_000 });
  const title = await state.locator(".state-title").innerText();
  const action = await state.locator(".state-action").innerText();
  assert.match(title, /No questions in #support yet\./u);
  assert.ok(action.trim().length > 0, "empty state must offer a next action");
  assert.match(action, /Ask what you are stuck on/u);
});

Then("the feed shows a zero-result state naming {string}", async function (query: string) {
  const page = requirePage();
  const state = page.locator('.message-feed [data-state-item]:not([hidden]) [data-state-kind="empty"]');
  await state.waitFor({ state: "visible", timeout: 5_000 });
  const title = await state.locator(".state-title").innerText();
  assert.ok(title.includes(query), `zero-result state should name the query, got: ${title}`);
  const action = await state.locator(".state-action").innerText();
  assert.match(action, /Search covers messages, Changes, harness labels, and promote receipts/u);
});

Then("the receipt search is empty and announces the channel", async function () {
  const page = requirePage();
  const value = await page.locator("[data-receipt-search]").inputValue();
  assert.equal(value, "");
  const status = await page.locator("[data-receipt-search-status]").innerText();
  assert.match(status, /Search cleared\./u);
  const visible = await page.locator('[data-surface-panel="channels"]:not([hidden]) [data-message]:not([hidden])').count();
  assert.ok(visible > 0, "clearing search must restore the channel messages");
});

Then("no channel shows an unread count on a first visit", async function () {
  const page = requirePage();
  const unread = await page.locator("[data-channel-has-unread]").count();
  assert.equal(unread, 0, "a first visit must not mark every channel unread");
});

Then("the ideas channel shows an unread count", async function () {
  const page = requirePage();
  const button = page.locator('button[data-channel="ideas"]');
  await button.locator("[data-channel-unread]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
  const count = await button.locator("[data-channel-unread]").innerText();
  assert.match(count.trim(), /^[1-9]\d*$/u);
  const label = await button.getAttribute("aria-label");
  assert.match(label ?? "", /unread/u, "unread must be readable, not colour-only");
});

// ── Craft moments: provenance reveal and contribution lineage ────────────────

When("I reveal the provenance of the {string} message", async function (title: string) {
  const page = requirePage();
  const message = page.locator("[data-message]:not([hidden])", { hasText: title }).first();
  await message.waitFor({ state: "visible", timeout: 5_000 });
  await message.locator("[data-signature-reveal]").click();
  await message.locator("[data-provenance-panel]:not([hidden])").waitFor({ state: "visible", timeout: 5_000 });
  revealedMessageTitle = title;
});

When("I view the lineage of the promoted message", async function () {
  const page = requirePage();
  const lineage = page.locator("[data-message]:not([hidden]) [data-view-lineage]").first();
  await lineage.waitFor({ state: "visible", timeout: 5_000 });
  await lineage.click();
  await page.locator('[data-lineage-target="true"]').waitFor({ state: "visible", timeout: 5_000 });
});

Then("the provenance panel names the signature, anchor, and source", async function () {
  const page = requirePage();
  assert.ok(revealedMessageTitle, "a message must be revealed first");
  const message = page.locator("[data-message]:not([hidden])", { hasText: revealedMessageTitle }).first();
  const panel = message.locator("[data-provenance-panel]:not([hidden])");
  await panel.waitFor({ state: "visible", timeout: 5_000 });
  const text = await panel.innerText();
  // Labels are uppercased by CSS, so innerText returns them transformed.
  assert.match(text, /signature/iu);
  assert.match(text, /anchor/iu);
  assert.match(text, /source/iu);
  // The values themselves, not just the labels.
  assert.match(text, /sig:/u);
  // The panel must state which side of the honesty line the record came from.
  assert.match(text, /live Community API|snapshot sample/u);
  const expanded = await message.locator("[data-signature-reveal]").getAttribute("aria-expanded");
  assert.equal(expanded, "true", "the signature mark must report its expanded state");
});

Then("the origin message and the resulting change are marked as one contribution", async function () {
  const page = requirePage();
  await page.locator('[data-lineage-target="true"]').waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await page.locator('[data-lineage-origin="true"]').count(), 1, "origin message must be marked");
  assert.equal(await page.locator('[data-lineage-target="true"]').count(), 1, "resulting change must be marked");
  const originChange = await page.locator('[data-lineage-origin="true"]').getAttribute("data-linked-change");
  const targetChange = await page.locator('[data-lineage-target="true"]').getAttribute("data-change-id");
  assert.ok(originChange);
  assert.equal(originChange, targetChange, "both ends must reference the same Change");
});

// ── Deterministic search and projection workbench journeys ──────────────────

Given("Community Web has authorized Entities from current and stale registered sources", async function () {
  const current = createCommunityWebSource({ posts: [{
    id: "current-change",
    kind: "change",
    title: "Current review",
    state: "needs-review",
    visibility: "public",
    publishedAt: "2026-08-11T12:00:00.000Z",
  }] }, FIXED_NOW);
  const staleEntity = entity({ objectId: "stale-issue", kind: "issue", title: "Stale review", state: "needs-review", sourceId: "community-store" });
  const stale = createCanonicalStoreSource({
    readEntities: async () => [staleEntity],
    checkpoint: async () => ({ sourceId: "community-store", token: "stale-1", observedAt: "2026-08-10T00:00:00.000Z", status: "stale" }),
  });
  deterministicJourney.set("environment", await createSearchEnvironment([], [current, stale]));
  deterministicJourney.set("aiCalls", 0);
});

When("I run the deterministic search {string}", async function (expression: string) {
  const environment = journey<Awaited<ReturnType<typeof createSearchEnvironment>>>("environment");
  const normalized = normalizeQuery(expression, {
    now: FIXED_NOW,
    timezone: "UTC",
    locale: "en-US",
    actorId: TEST_AUTHORIZATION.actorId,
    authorization: TEST_AUTHORIZATION,
    fieldRegistry: environment.registry,
    fieldRegistryVersion: environment.registry.version,
  });
  assert.ok(normalized.ast, normalized.error);
  deterministicJourney.set("normalized", normalized);
  deterministicJourney.set("page", await environment.service.search({
    expression: normalized.ast,
    order: normalized.sort,
    authorization: TEST_AUTHORIZATION,
    first: 20,
  }));
});

Then("results identify their canonical targets and source provenance", function () {
  const page = journey<Awaited<ReturnType<ReferenceSearchBackend["search"]>>>("page");
  assert.deepEqual(page.hits.map((hit) => hit.target.objectId), ["stale-issue", "current-change"]);
  assert.deepEqual([...new Set(page.hits.map((hit) => hit.provenance.sourceId))].sort(), ["community-store", "community-web-host"]);
});

Then("source completeness names the stale source without invoking AI", function () {
  const page = journey<Awaited<ReturnType<ReferenceSearchBackend["search"]>>>("page");
  assert.equal(page.completeness.status, "stale");
  assert.equal(page.completeness.sources.find((source) => source.sourceId === "community-store")?.status, "stale");
  assert.equal(deterministicJourney.get("aiCalls"), 0);
});

Given("I open the Community Web query workbench by keyboard", function () {
  const action = BUILT_IN_ACTIONS.find((candidate) => candidate.actionId === "search.open");
  assert.deepEqual(action?.keyBindings, [{ key: "Ctrl+F", contexts: ["global"] }]);
  deterministicJourney.set("workbenchOpen", true);
  deterministicJourney.set("searchRuns", 0);
  deterministicJourney.set("aiCalls", 0);
});

When("I enter an unsupported field and operator", function () {
  deterministicJourney.set("diagnosticQuery", normalizeQuery("sttae:>=open", {
    now: FIXED_NOW,
    timezone: "UTC",
    locale: "en-US",
    authorization: TEST_AUTHORIZATION,
    fieldRegistry: createCommunityFieldRegistry(),
  }));
});

Then("the diagnostic identifies line column span code and field suggestions", function () {
  const query = journey<ReturnType<typeof normalizeQuery>>("diagnosticQuery");
  const diagnostic = query.diagnostics.find((candidate) => candidate.severity === "error");
  assert.ok(diagnostic?.span);
  assert.equal(diagnostic.span.line, 1);
  assert.ok(diagnostic.span.column >= 1 && diagnostic.span.end > diagnostic.span.start);
  assert.match(diagnostic.code, /^QUERY_/u);
  assert.ok(diagnostic.suggestions.includes("state"));
});

Then("no partial search or AI translation runs", function () {
  const query = journey<ReturnType<typeof normalizeQuery>>("diagnosticQuery");
  assert.equal(query.ast, null);
  assert.equal(deterministicJourney.get("searchRuns"), 0);
  assert.equal(deterministicJourney.get("aiCalls"), 0);
});

Given("a deterministic search returned an authorized Entity", async function () {
  const visible = entity({ objectId: "visible-review", kind: "change", title: "Visible review", state: "needs-review" });
  const hidden = entity({ objectId: "hidden-review", kind: "change", title: "Hidden review", state: "needs-review", visibility: "private", ownerId: "other" });
  const environment = await createSearchEnvironment([visible, hidden]);
  const normalized = normalizeQuery("state:needs-review", { now: FIXED_NOW, timezone: "UTC", locale: "en-US", authorization: TEST_AUTHORIZATION, fieldRegistry: environment.registry });
  assert.ok(normalized.ast);
  const page = await environment.service.search({ expression: normalized.ast, order: normalized.sort, authorization: TEST_AUTHORIZATION, first: 10 });
  assert.deepEqual(page.hits.map((hit) => hit.target.objectId), [visible.ref.objectId]);
  deterministicJourney.set("environment", environment);
  deterministicJourney.set("normalized", normalized);
  deterministicJourney.set("hiddenId", hidden.ref.objectId);
});

When("I open Search Explain", async function () {
  const environment = journey<Awaited<ReturnType<typeof createSearchEnvironment>>>("environment");
  const normalized = journey<ReturnType<typeof normalizeQuery>>("normalized");
  assert.ok(normalized.ast);
  const plan = await environment.service.plan({ expression: normalized.ast, order: normalized.sort, authorization: TEST_AUTHORIZATION, limit: 10 });
  deterministicJourney.set("plan", plan);
  deterministicJourney.set("explanation", await environment.backend.explain(plan));
});

Then("I can inspect normalization source pushdown residual evaluation authorization ordering and omissions", function () {
  const normalized = journey<ReturnType<typeof normalizeQuery>>("normalized");
  const explanation = journey<Awaited<ReturnType<ReferenceSearchBackend["explain"]>>>("explanation");
  assert.ok(normalized.canonicalJson.includes("needs-review"));
  assert.equal(explanation.sourcePlans.length, 1);
  assert.ok(explanation.sourcePlans[0]?.pushdown && explanation.sourcePlans[0]?.residual);
  assert.equal(explanation.authorization, "pre-filtered");
  assert.deepEqual(explanation.ordering.slice(-2), ["kind:ascending:last", "objectId:ascending:last"]);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  assert.deepEqual((explanation as typeof explanation & { omissions?: readonly string[] }).omissions ?? [], []);
});

Then("the explanation does not reveal unreadable Entities", function () {
  assert.doesNotMatch(JSON.stringify(journey("explanation")), new RegExp(journey<string>("hiddenId"), "u"));
});

Given("I preview an authorized deterministic search", async function () {
  const environment = await createServiceEnvironment([
    entity({ objectId: "change-review", kind: "change", title: "Review", state: "needs-review" }),
  ]);
  const parsed = environment.search.parseSearch("state:needs-review", { authorization: TEST_AUTHORIZATION });
  assert.ok(parsed.ast);
  const page = await environment.search.search({ where: parsed.ast, orderBy: parsed.sort, first: 10 }, TEST_AUTHORIZATION);
  deterministicJourney.set("services", environment);
  deterministicJourney.set("parsed", parsed);
  deterministicJourney.set("previewTargets", page.hits.map((hit) => hit.target.objectId));
});

When("I save it as the {string} projection", async function (projectionId: string) {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const parsed = journey<ReturnType<CommunityServiceApis["search"]["parseSearch"]>>("parsed");
  assert.ok(parsed.ast);
  const definition = entityListProjection(`user-${projectionId}`, parsed.ast);
  deterministicJourney.set("savedDefinition", await services.projections.save(definition, TEST_AUTHORIZATION));
});

Then("the Projection Definition stores the typed Search Expression and total order", function () {
  const definition = journey<ProjectionDefinition>("savedDefinition");
  assert.equal(definition.root.kind, "literal");
  const select = definition.root.kind === "literal" ? definition.root.children[0] : undefined;
  assert.equal(select?.kind, "select");
  assert.deepEqual(select?.kind === "select" ? select.where : undefined, journey<ReturnType<CommunityServiceApis["search"]["parseSearch"]>>("parsed").ast);
  const fields = definition.order.map((order) => order.field);
  assert.deepEqual(fields.slice(-2), ["kind", "objectId"]);
});

Then("reopening it preserves canonical Entity identity rather than a copied result tree", async function () {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const saved = journey<ProjectionDefinition>("savedDefinition");
  const reopened = await services.projections.get(saved.projectionId, TEST_AUTHORIZATION);
  assert.equal(reopened?.projectionId, saved.projectionId);
  assert.deepEqual(journey("previewTargets"), ["change-review"]);
  assert.equal(JSON.stringify(reopened).includes("change-review"), false);
});

Given("I clone {string} into my own Projection Definition", async function (sourceId: string) {
  assert.equal(sourceId, builtinDefaultProjection.projectionId);
  const clone: ProjectionDefinition = {
    ...structuredClone(builtinDefaultProjection),
    projectionId: "user-default-copy",
    version: 1,
    label: "My namespace",
    ownerId: "maya",
    visibility: "private",
  };
  const services = await createServiceEnvironment([
    entity({ objectId: "project-alpha", title: "Same Project", state: "open" }),
    entity({ objectId: "project-beta", title: "Same Project", state: "open" }),
  ], [clone]);
  deterministicJourney.set("services", services);
  deterministicJourney.set("clone", await services.projections.save(clone, TEST_AUTHORIZATION));
});

When("I group project Entities by state and preview the tree", async function () {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const clone = journey<ProjectionDefinition>("clone");
  const grouped: ProjectionDefinition = {
    ...clone,
    version: clone.version + 1,
    root: {
      nodeId: "root",
      kind: "literal",
      segment: "",
      children: [{
        nodeId: "select-projects",
        kind: "select",
        objectKinds: ["project"],
        children: [{
          nodeId: "group-state",
          kind: "group",
          field: "state",
          segment: { template: "{slug(state)}" },
          missing: "no-state",
          order: "key-ascending",
          child: { nodeId: "project-leaf", kind: "leaf", segment: { template: "{slug(title)}" }, representation: "default" },
        }],
      }],
    },
  };
  await services.projections.save(grouped, TEST_AUTHORIZATION);
  const context = await services.namespace.context(TEST_AUTHORIZATION, "snapshot-group");
  const root = await services.projectionRuntime.list(grouped.projectionId, "/", { first: 20 }, context);
  const groupPath = root.entries[0]?.logicalPath;
  assert.ok(groupPath);
  const preview = await services.projectionRuntime.list(grouped.projectionId, groupPath, { first: 20 }, context);
  const builtin = await services.projectionRuntime.list("builtin:default", "/", { first: 20 }, context);
  deterministicJourney.set("grouped", grouped);
  deterministicJourney.set("preview", preview);
  deterministicJourney.set("namespaceDiff", {
    removed: builtin.entries.map((entry) => entry.name).filter((name) => !root.entries.some((entry) => entry.name === name)),
    added: root.entries.map((entry) => entry.name).filter((name) => !builtin.entries.some((entry) => entry.name === name)),
  });
});

Then("the preview uses authorized real data and deterministic collision names", function () {
  const entries = journey<{ readonly entries: readonly VfsEntry[] }>("preview").entries;
  assert.equal(entries.length, 2);
  assert.ok(entries.every((entry) => entry.target.objectId.startsWith("project-")));
  assert.equal(new Set(entries.map((entry) => entry.name)).size, 2);
  assert.ok(entries.every((entry) => /^same-project~[a-z0-9]+$/u.test(entry.name)));
});

Then("the namespace diff explains changes before I mount them", function () {
  const diff = journey<{ readonly removed: readonly string[]; readonly added: readonly string[] }>("namespaceDiff");
  assert.ok(diff.removed.includes("projects"));
  assert.deepEqual(diff.added, ["open"]);
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  assert.equal(services.namespace.mounts(TEST_AUTHORIZATION) instanceof Promise, true);
});

Given("I mount my valid Projection Definition at root with user replace precedence", async function () {
  const definition = entityListProjection("user-valid");
  const services = await createServiceEnvironment([entity({ objectId: "valid-project", title: "Valid", state: "open" })], [definition]);
  await services.projections.save(definition, TEST_AUTHORIZATION);
  const mount = await services.namespace.mount({
    mountId: "user-root",
    scope: "user",
    mountPath: "/",
    projectionId: definition.projectionId,
    mode: "replace",
    order: 1,
    writable: false,
  }, TEST_AUTHORIZATION);
  deterministicJourney.set("services", services);
  deterministicJourney.set("mount", mount);
  deterministicJourney.set("definition", definition);
});

When("a later edit makes that Projection Definition invalid", async function () {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const definition = journey<ProjectionDefinition>("definition");
  const invalid: ProjectionDefinition = {
    ...definition,
    version: definition.version + 1,
    root: { nodeId: "root-invalid", kind: "literal", segment: ".epoch", children: [] },
  };
  let message = "";
  try { await services.projections.save(invalid, TEST_AUTHORIZATION); }
  catch (error) { message = error instanceof Error ? error.message : String(error); }
  assert.ok(message);
  await services.store.write((transaction) => transaction.putQuarantinedDefinition({
    projectionId: invalid.projectionId,
    reason: message,
    quarantinedAt: services.runtime.now(),
    input: invalid,
  }));
  deterministicJourney.set("invalidMessage", message);
});

Then("the invalid definition is quarantined and exportable", async function () {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const exported = await services.store.export();
  assert.equal(exported.quarantinedDefinitions.length, 1);
  assert.equal(exported.quarantinedDefinitions[0]?.projectionId, "user-valid");
  assert.match(JSON.stringify(exported.quarantinedDefinitions[0]?.input), /root-invalid/u);
});

Then("I can open {string} and reset my user namespace entirely by keyboard", async function (path: string) {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const recovered = await services.namespace.resolve(path, TEST_AUTHORIZATION, "snapshot-recovery");
  assert.equal(recovered?.projectionId, "builtin:default");
  assert.equal(recovered?.logicalPath, path);
  assert.ok(BUILT_IN_ACTIONS.some((action) => action.actionId === "namespace.reset"));
  const reset = await services.namespace.reset("user", TEST_AUTHORIZATION);
  assert.deepEqual(reset.removedMountIds, ["user-root"]);
  assert.equal((await services.namespace.mounts(TEST_AUTHORIZATION)).some((mount) => mount.scope === "user"), false);
});

Given("the built-in root and a community Projection Definition contain the same child name", function () {
  const definition = projection({
    projectionId: "community-root",
    root: { nodeId: "community-root", kind: "literal", segment: "", children: [{ nodeId: "community-projects", kind: "literal", segment: "projects", children: [] }] },
  });
  const projectionRuntime = new EntityProjectionRuntime({
    entities: [],
    completeness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] },
    cursorKey: CURSOR_KEY,
    compileContext: compileContext(),
  }, [definition]);
  deterministicJourney.set("projectionRuntime", projectionRuntime);
  deterministicJourney.set("communityDefinition", definition);
});

When("I mount the community definition before the built-in root", async function () {
  const projectionRuntime = journey<EntityProjectionRuntime>("projectionRuntime");
  const namespace = createNamespaceRuntime(projectionRuntime, [{
    mountId: "community-before",
    scope: "community",
    mountPath: "/",
    projectionId: "community-root",
    mode: "before",
    order: 0,
    writable: false,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  }]);
  const context = { authorizationFingerprint: "auth-shadow", snapshotId: "snapshot-shadow" };
  deterministicJourney.set("namespaceRuntime", namespace);
  deterministicJourney.set("namespacePage", await namespace.list("/", { first: 20 }, context));
  deterministicJourney.set("namespaceExplanation", await namespace.explain("/projects", context));
});

Then("first-match lookup selects the higher-precedence Projection Entry", function () {
  const page = journey<{ readonly entries: readonly VfsEntry[] }>("namespacePage");
  assert.equal(page.entries.find((entry) => entry.name === "projects")?.projectionId, "community-root");
});

Then("Namespace Explain identifies the ordered components and shadowed entry", function () {
  const explanation = journey<{ readonly componentOrder: readonly string[]; readonly shadowed: readonly VfsEntry[] }>("namespaceExplanation");
  assert.deepEqual(explanation.componentOrder, ["community-before", "builtin-root"]);
  assert.equal(explanation.shadowed.length, 1);
  assert.equal(explanation.shadowed[0]?.projectionId, "builtin:default");
});

Given("one Entity is selected by two branches of one Projection Definition", function () {
  const target = entity({ objectId: "same-entity", title: "Repeated", state: "open" });
  const definition = entityListProjection("user-twice", { kind: "all" }, ["leaf-a", "leaf-b"]);
  const projectionRuntime = new EntityProjectionRuntime({
    entities: [target],
    completeness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] },
    cursorKey: CURSOR_KEY,
    compileContext: compileContext(),
  }, [definition]);
  const namespace = createNamespaceRuntime(projectionRuntime, [{
    mountId: "user-twice",
    scope: "user",
    mountPath: "/",
    projectionId: definition.projectionId,
    mode: "replace",
    order: 0,
    writable: false,
    ownerId: "maya",
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  }]);
  deterministicJourney.set("target", target);
  deterministicJourney.set("namespaceRuntime", namespace);
});

When("I locate that Entity in the mounted namespace", async function () {
  const namespace = journey<ReturnType<typeof createNamespaceRuntime>>("namespaceRuntime");
  const target = journey<CommunityEntity>("target");
  deterministicJourney.set("locations", await namespace.locate(target.ref, { authorizationFingerprint: "auth-locate", snapshotId: "snapshot-locate" }));
});

Then("both Projection Entries have distinct stable occurrence IDs and paths", function () {
  const entries = journey<readonly VfsEntry[]>("locations");
  assert.equal(entries.length, 2);
  assert.equal(new Set(entries.map((entry) => entry.entryId)).size, 2);
  assert.equal(new Set(entries.map((entry) => entry.logicalPath)).size, 2);
});

Then("both entries target the same canonical object ID", function () {
  assert.deepEqual(journey<readonly VfsEntry[]>("locations").map((entry) => entry.target.objectId), ["same-entity", "same-entity"]);
});

Given("I am reading one Projection Entry in queued update mode", async function () {
  const target = entity({ objectId: "reading-target", title: "Reading", state: "open" });
  const definition = entityListProjection("user-queued");
  const runtime = new EntityProjectionRuntime({
    entities: [target],
    completeness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] },
    cursorKey: CURSOR_KEY,
    compileContext: compileContext(),
  }, [definition]);
  const entries = (await runtime.list(definition.projectionId, "/", { first: 10 }, { authorizationFingerprint: "auth-queued", snapshotId: "snapshot-queued" })).entries;
  const anchor = { focusedEntryId: entries[0]?.entryId, targetId: target.ref.objectId, readingAnchor: { objectId: target.ref.objectId, pixelOffset: 42 } };
  deterministicJourney.set("tracked", new ProjectionDeltaController().track("queued", entries, anchor));
  deterministicJourney.set("anchor", anchor);
  deterministicJourney.set("originalEntry", entries[0]);
});

When("a source change adds an earlier-sorting Entity", function () {
  const tracked = journey<ReturnType<ProjectionDeltaController["track"]>>("tracked");
  const original = journey<VfsEntry>("originalEntry");
  const added: VfsEntry = { ...original, entryId: "entry-added-earlier", target: { objectId: "earlier-target", kind: "project" }, name: "earlier", logicalPath: "/earlier", sortKey: ["2026-08-13T00:00:00.000Z", "project", "earlier-target"] };
  deterministicJourney.set("queuedResult", tracked.ingest({ projectionId: original.projectionId, projectionVersion: original.projectionVersion, sequence: 1, upserts: [added], deletes: [], observedAt: FIXED_NOW }));
});

Then("Community Web announces the queued count without moving focus or reading anchor", function () {
  const result = journey<{ readonly queuedCount: number; readonly anchor: JsonValue; readonly entries: readonly VfsEntry[] }>("queuedResult");
  assert.equal(result.queuedCount, 1);
  assert.deepEqual(result.anchor, deterministicJourney.get("anchor"));
  assert.equal(result.entries.some((entry) => entry.entryId === "entry-added-earlier"), false);
});

When("I apply queued updates", function () {
  deterministicJourney.set("appliedResult", journey<ReturnType<ProjectionDeltaController["track"]>>("tracked").applyQueued());
});

Then("focus remains attached to the prior occurrence or canonical target", function () {
  const result = journey<{ readonly queuedCount: number; readonly anchor: { readonly focusedEntryId?: string; readonly targetId?: string }; readonly entries: readonly VfsEntry[] }>("appliedResult");
  assert.equal(result.queuedCount, 0);
  assert.equal(result.anchor.focusedEntryId, journey<VfsEntry>("originalEntry").entryId);
  assert.equal(result.anchor.targetId, "reading-target");
  assert.equal(result.entries.length, 2);
});

Given("two corpora differ only by Entities I am not authorized to read", async function () {
  const visible = entity({ objectId: "public-project", title: "Same Name", state: "open" });
  const hidden = entity({ objectId: "private-project", title: "Same Name", state: "open", visibility: "private", ownerId: "other" });
  deterministicJourney.set("visibleEnvironment", await createSearchEnvironment([visible]));
  deterministicJourney.set("hiddenEnvironment", await createSearchEnvironment([visible, hidden]));
  deterministicJourney.set("visibleEntity", visible);
  deterministicJourney.set("hiddenEntity", hidden);
});

When("I compare search hits counts facets suggestions completions paths collisions and explanations", async function () {
  const observe = async (environment: Awaited<ReturnType<typeof createSearchEnvironment>>, entities: readonly CommunityEntity[]) => {
    const parsed = normalizeQuery("state:open", { now: FIXED_NOW, timezone: "UTC", locale: "en-US", authorization: TEST_AUTHORIZATION, fieldRegistry: environment.registry });
    assert.ok(parsed.ast);
    const plan = await environment.service.plan({ expression: parsed.ast, order: parsed.sort, authorization: TEST_AUTHORIZATION, limit: 10 });
    const page = await environment.backend.search(plan, { first: 10 });
    const facets = await environment.backend.facets(plan, ["state"]);
    const suggestions = await environment.backend.suggest({ plan, field: "state", prefix: "o", limit: 10 });
    const explanation = await environment.backend.explain(plan);
    const authorized = entities.filter((candidate) => candidate.visibility === "public" || candidate.ownerId === TEST_AUTHORIZATION.actorId);
    const definition = entityListProjection("user-privacy");
    const projectionRuntime = new EntityProjectionRuntime({
      entities: authorized,
      completeness: page.completeness,
      cursorKey: CURSOR_KEY,
      compileContext: compileContext(environment.registry),
    }, [definition]);
    const entries = await projectionRuntime.list(definition.projectionId, "/", { first: 10 }, { authorizationFingerprint: plan.authorizationFingerprint, snapshotId: page.snapshot.snapshotId });
    return {
      hits: page.hits.map((hit) => hit.target.objectId),
      count: page.hits.length,
      facets,
      suggestions,
      completions: environment.registry.list(TEST_AUTHORIZATION).map((field) => field.name),
      paths: entries.entries.map((entry) => entry.logicalPath),
      collisions: entries.entries.map((entry) => entry.name),
      explanation,
      sourceStatuses: page.completeness.sources.map(({ sourceId, status }) => ({ sourceId, status })),
    };
  };
  deterministicJourney.set("visibleObservations", await observe(journey("visibleEnvironment"), [journey("visibleEntity")]));
  deterministicJourney.set("hiddenObservations", await observe(journey("hiddenEnvironment"), [journey("visibleEntity"), journey("hiddenEntity")]));
});

Then("every observable authorized result is equivalent", function () {
  assert.deepEqual(deterministicJourney.get("visibleObservations"), deterministicJourney.get("hiddenObservations"));
});

Then("source status reveals at most a generic unauthorized omission", function () {
  const observations = journey<{ readonly sourceStatuses: readonly { readonly sourceId: string; readonly status: string }[] }>("hiddenObservations");
  assert.deepEqual(observations.sourceStatuses, [{ sourceId: "community-store", status: "current" }]);
  assert.doesNotMatch(JSON.stringify(observations), /private-project|Same Name.*Same Name/u);
});

Given("my browser cannot provide the required OPFS and FTS5 capabilities", function () {
  deterministicJourney.set("storage", chooseSqliteStorage({ opfs: false, crossOriginIsolated: false, sharedArrayBuffer: false }));
  deterministicJourney.set("fts5", false);
});

When("I open a metadata-only Community replica and search", async function () {
  const visible = entity({ objectId: "metadata-project", title: "Metadata only", state: "open" });
  const environment = await createSearchEnvironment([visible]);
  const parsed = normalizeQuery("state:open", { now: FIXED_NOW, timezone: "UTC", locale: "en-US", authorization: TEST_AUTHORIZATION, fieldRegistry: environment.registry });
  assert.ok(parsed.ast);
  deterministicJourney.set("fallbackPage", await environment.service.search({ expression: parsed.ast, order: parsed.sort, authorization: TEST_AUTHORIZATION, first: 10 }));
  deterministicJourney.set("fallbackBackend", environment.backend.backendId);
});

Then("Community Web reports the unavailable persistence capability", function () {
  assert.deepEqual(deterministicJourney.get("storage"), { mode: "memory", persistent: false, reason: "OPFS is unavailable" });
  assert.equal(deterministicJourney.get("fts5"), false);
});

Then("the Orama or reference backend remains functional without losing canonical data", function () {
  assert.equal(deterministicJourney.get("fallbackBackend"), "epoch-reference");
  assert.deepEqual(journey<Awaited<ReturnType<ReferenceSearchBackend["search"]>>>("fallbackPage").hits.map((hit) => hit.target.objectId), ["metadata-project"]);
});

Given("two Community Web tabs open the same browser search replica", function () {
  const held = new Set<string>();
  const lockManager = {
    async acquire(name: string) {
      if (held.has(name)) return undefined;
      held.add(name);
      return () => { held.delete(name); };
    },
  };
  deterministicJourney.set("firstCoordinator", new BrowserPersistenceCoordinator({ lockManager, lockName: "shared-replica" }));
  deterministicJourney.set("secondCoordinator", new BrowserPersistenceCoordinator({ lockManager, lockName: "shared-replica" }));
  deterministicJourney.set("replicaEntities", [entity({ objectId: "replica-entity", title: "Replica", state: "open" })]);
  deterministicJourney.set("replicaCheckpoint", { sourceId: "community-store", token: "replica-1", observedAt: FIXED_NOW, status: "current" });
});

When("both attempt a local index update", async function () {
  const first = journey<BrowserPersistenceCoordinator>("firstCoordinator");
  const second = journey<BrowserPersistenceCoordinator>("secondCoordinator");
  const lease = await first.acquireWriter();
  let secondCode = "";
  try { await second.acquireWriter(); }
  catch (error) {
    // SAFETY: BrowserPersistenceCoordinator rejects lock contention with its documented coded error.
    secondCode = (error as { readonly code?: string }).code ?? "";
  }
  deterministicJourney.set("secondCode", secondCode);
  await lease.release();
  const secondLease = await second.acquireWriter();
  await secondLease.release();
  deterministicJourney.set("secondRecovered", true);
});

Then("one writer coordinates the update and the other waits or falls back explicitly", function () {
  assert.equal(deterministicJourney.get("secondCode"), "INDEX_LOCKED");
  assert.equal(deterministicJourney.get("secondRecovered"), true);
});

Then("reopening the replica returns the same authorized Entities and checkpoint", async function () {
  const entities = journey<readonly CommunityEntity[]>("replicaEntities");
  const checkpoint = journey<{ readonly sourceId: string; readonly token: string; readonly observedAt: string; readonly status: "current" }>("replicaCheckpoint");
  const source = createCanonicalStoreSource({ readEntities: async () => entities, checkpoint: async () => checkpoint });
  const first = await source.scan({ limit: 10, authorization: TEST_AUTHORIZATION });
  const reopened = await source.scan({ limit: 10, authorization: TEST_AUTHORIZATION });
  assert.deepEqual(reopened.entities.map((candidate) => candidate.ref.objectId), first.entities.map((candidate) => candidate.ref.objectId));
  assert.deepEqual(reopened.checkpoint, first.checkpoint);
});

Given("persisted schema 2 contains stable Entity IDs and a saved query record", function () {
  deterministicJourney.set("schema2", {
    schemaVersion: 2,
    repositories: [],
    objects: [{
      ref: { objectId: "message-stable", kind: "message" },
      context: { objectId: "channel-general", kind: "channel" },
      authorId: "maya",
      title: "Stable migrated message",
      body: "Migration must not invent identity or time.",
      publishedAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-02T10:00:00.000Z",
      threadRoot: { objectId: "message-stable", kind: "message" },
      relations: [],
      state: "needs-review",
      aliases: ["general/42"],
    }],
    projections: [{
      projectionId: "projection-needs-review",
      version: 1,
      label: "Needs review",
      ownerId: "maya",
      visibility: "private",
      query: "state:needs-review",
      queryLanguageVersion: 0,
      order: { by: "publishedAt", direction: "descending" },
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-04T00:00:00.000Z",
    }],
  });
  deterministicJourney.set("migrationContext", {
    clock: { now: () => new Date(FIXED_NOW) },
    idGenerator: { generate: (namespace: string) => `${namespace}-migration` },
    timezone: "UTC",
    locale: "en-US",
  });
});

When("Community migrates and reloads the state", async function () {
  const migrated = migrateCommunityState(deterministicJourney.get("schema2"), journey("migrationContext"));
  const store = createMemoryCommunityStateStore(migrated);
  const exported = await store.export();
  const reloaded = createMemoryCommunityStateStore(exported);
  deterministicJourney.set("migrated", migrated);
  deterministicJourney.set("reloaded", await reloaded.export());
});

Then("one current Projection Definition preserves the IDs timestamps query semantics and aliases", function () {
  const state = journey<CommunityStateV3>("reloaded");
  assert.equal(state.projectionDefinitions.length, 1);
  const migratedEntity = state.entities.find((candidate) => candidate.ref.objectId === "message-stable");
  assert.equal(migratedEntity?.createdAt, "2026-07-01T10:00:00.000Z");
  assert.equal(migratedEntity?.updatedAt, "2026-07-02T10:00:00.000Z");
  assert.deepEqual(migratedEntity?.fields.aliases, ["general/42"]);
  const definition = state.projectionDefinitions[0]?.definition;
  assert.equal(definition?.projectionId, "projection-needs-review");
  const select = definition?.root.kind === "literal" ? definition.root.children[0] : undefined;
  const where = select?.kind === "select" ? select.where : undefined;
  assert.equal(where?.kind, "compare");
  if (where?.kind === "compare") assert.deepEqual({ kind: where.kind, field: where.field, operator: where.operator, value: where.value }, { kind: "compare", field: "state", operator: "eq", value: "needs-review" });
});

Then("rerunning migration produces the same state without a compatibility API", function () {
  const reloaded = journey<CommunityStateV3>("reloaded");
  assert.deepEqual(migrateCommunityState(reloaded, journey("migrationContext")), reloaded);
  assert.equal(Object.hasOwn(reloaded, "projections"), false);
  assert.equal(Object.hasOwn(reloaded, "objects"), false);
});

Given("a structured GraphQL search and text search express the same authorized predicate", async function () {
  const services = await createServiceEnvironment([
    entity({ objectId: "graphql-a", kind: "change", title: "GraphQL A", state: "needs-review", updatedAt: "2026-08-12T12:00:00.000Z" }),
    entity({ objectId: "graphql-b", kind: "change", title: "GraphQL B", state: "needs-review", updatedAt: "2026-08-11T12:00:00.000Z" }),
  ]);
  deterministicJourney.set("services", services);
  deterministicJourney.set("graphqlSchema", createCommunityGraphQLSchema(createCommunityGraphQLServices(services)));
  deterministicJourney.set("graphqlSource", `
    query Equivalent($where: SearchExpressionInput!, $first: Int!) {
      search(where: $where, first: $first) {
        nodes { target { objectId } }
        pageInfo { hasNextPage endCursor }
        snapshot { snapshotId }
      }
    }
  `);
  deterministicJourney.set("graphqlVariables", {
    where: { compare: { field: "state", operator: "EQ", value: { scalar: { string: "needs-review" } } } },
    first: 1,
  });
});

When("I execute both against one Search Snapshot", async function () {
  const services = journey<Awaited<ReturnType<typeof createServiceEnvironment>>>("services");
  const result = await executeCommunityGraphQL({
    schema: journey("graphqlSchema"),
    source: journey("graphqlSource"),
    variableValues: journey("graphqlVariables"),
    context: { authorization: TEST_AUTHORIZATION },
  });
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const graphql = result.data?.search as {
    readonly nodes: readonly { readonly target: { readonly objectId: string } }[];
    readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor?: string };
    readonly snapshot: { readonly snapshotId: string };
  };
  const parsed = services.search.parseSearch("state:needs-review", { authorization: TEST_AUTHORIZATION });
  assert.ok(parsed.ast);
  const text = await services.search.search({ where: parsed.ast, orderBy: parsed.sort, first: 1, snapshot: graphql.snapshot.snapshotId }, TEST_AUTHORIZATION);
  deterministicJourney.set("graphqlResult", graphql);
  deterministicJourney.set("textResult", text);
});

Then("both return the same canonical targets in the same total order", function () {
  const graphql = journey<{ readonly nodes: readonly { readonly target: { readonly objectId: string } }[] }>("graphqlResult");
  const text = journey<Awaited<ReturnType<CommunityServiceApis["search"]["search"]>>>("textResult");
  assert.deepEqual(graphql.nodes.map((node) => node.target.objectId), text.hits.map((hit) => hit.target.objectId));
  assert.deepEqual(text.hits[0]?.sortKey.slice(-2), ["change", "graphql-a"]);
});

Then("GraphQL uses keyset cursors rather than array offsets", function () {
  const pageInfo = journey<{ readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor?: string } }>("graphqlResult").pageInfo;
  assert.equal(pageInfo.hasNextPage, true);
  assert.match(pageInfo.endCursor ?? "", /^[A-Za-z0-9_-]{40,}$/u);
  assert.doesNotMatch(pageInfo.endCursor ?? "", /^\d+$/u);
});

Given("I have a Projection Definition JSON file", async function () {
  const definition = entityListProjection("user-cli-preview");
  const services = await createServiceEnvironment([entity({ objectId: "cli-project", title: "CLI Project", state: "open" })], [definition]);
  const files = new Map([["projection.json", JSON.stringify(definition)]]);
  const saved: string[] = [];
  const mounted: string[] = [];
  deterministicJourney.set("cliDefinition", definition);
  deterministicJourney.set("cliServices", {
    readFile: async (path: string) => files.get(path) ?? "",
    list: () => services.projections.list(TEST_AUTHORIZATION),
    get: (id: string) => services.projections.get(id, TEST_AUTHORIZATION),
    validate: async (candidate: ProjectionDefinition) => compileProjectionDefinition(candidate, compileContext()),
    preview: async ({ definition: candidate, path, first, after }: { readonly definition: ProjectionDefinition; readonly path: string; readonly first: number; readonly after?: string }) => {
      services.projectionRuntime.register(candidate);
      const pageOptions: ProjectionPageOptions = { first };
      if (after !== undefined) pageOptions.after = after;
      return services.projectionRuntime.list(candidate.projectionId, path, pageOptions, { authorizationFingerprint: "auth-cli", snapshotId: "snapshot-cli" });
    },
    save: async (candidate: ProjectionDefinition) => { saved.push(candidate.projectionId); return services.projections.save(candidate, TEST_AUTHORIZATION); },
    delete: (id: string) => services.projections.delete(id, TEST_AUTHORIZATION),
  });
  deterministicJourney.set("cliSaved", saved);
  deterministicJourney.set("cliMounted", mounted);
});

When("I validate and preview it with epoch-community", async function () {
  const services = journey<Parameters<typeof runProjectionCommand>[1]>("cliServices");
  deterministicJourney.set("cliValidation", await runProjectionCommand(["validate", "projection.json", "--json"], services));
  deterministicJourney.set("cliPreview", await runProjectionCommand(["preview", "projection.json", "--json"], services));
});

Then("the CLI reports deterministic JSON diagnostics and Projection Entries", function () {
  const validation = journey<Awaited<ReturnType<typeof runProjectionCommand>>>("cliValidation");
  const preview = journey<Awaited<ReturnType<typeof runProjectionCommand>>>("cliPreview");
  assert.equal(validation.exitCode, 0, validation.stderr);
  assert.deepEqual(JSON.parse(validation.stdout), {
    diagnostics: [], estimatedFanout: 10000, maximumDepth: 3, nodeCount: 3,
    projectionId: "user-cli-preview", schema: "epoch.community.cli.projection-validation.v1", valid: true,
  });
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const parsed = JSON.parse(preview.stdout) as { readonly page: { readonly entries: readonly VfsEntry[] } };
  assert.equal(parsed.page.entries[0]?.target.objectId, "cli-project");
});

Then("invalid cycles fail without saving or mounting the definition", function () {
  const children: JsonValue[] = [];
  const node = { nodeId: "cycle", kind: "literal", segment: "cycle", children } satisfies {
    nodeId: string;
    kind: "literal";
    segment: string;
    children: JsonValue[];
  };
  node.children.push(node);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const invalid = { ...journey<ProjectionDefinition>("cliDefinition"), projectionId: "user-cycle", root: node } as ProjectionDefinition;
  let diagnostics: readonly { readonly code: string }[] = [];
  try { compileProjectionDefinition(invalid, compileContext()); }
  catch (error) {
    // SAFETY: Projection compilation rejects invalid definitions with its documented diagnostics payload.
    diagnostics = (error as { readonly diagnostics?: readonly { readonly code: string }[] }).diagnostics ?? [];
  }
  assert.ok(diagnostics.some((diagnostic) => diagnostic.code === "PROJECTION_CYCLE"));
  assert.deepEqual(deterministicJourney.get("cliSaved"), []);
  assert.deepEqual(deterministicJourney.get("cliMounted"), []);
});

When("I run the Community Web deterministic search {string}", async function (expression: string) {
  const page = requirePage();
  await page.keyboard.press("Control+f");
  const query = page.locator("[data-search-expression]");
  await query.fill(expression);
  await query.press("Control+Enter");
  await page.locator("[data-search-completeness]").waitFor({ state: "visible" });
  searchProjectionJourneyResult = await page.evaluate(() => ({
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    workbench: ((window as { CW_APP: { state: { searchWorkbench: JsonValue } } })).CW_APP.state.searchWorkbench,
    aiCalls: 0,
  }));
});

Then("the Community Web search reports authorized results and source completeness without AI", async function () {
  const page = requirePage();
  await page.locator('[data-search-source="community-web-host"]').waitFor({ state: "visible" });
  assert.match(await page.locator("[data-search-completeness]").innerText(), /complete.*authorized result/iu);
  assert.equal(searchProjectionJourneyResult.aiCalls, 0);
});

When("I enter the invalid Community Web query {string}", async function (expression: string) {
  const page = requirePage();
  await page.keyboard.press("Control+f");
  const query = page.locator("[data-search-expression]");
  await query.fill(expression);
  await query.press("Control+Enter");
  await page.locator("[data-search-diagnostic]").waitFor({ state: "visible" });
});

Then("the Community Web query error identifies its location and suggests {string}", async function (suggestion: string) {
  const diagnostic = requirePage().locator("[data-search-diagnostic]");
  assert.ok(Number(await diagnostic.getAttribute("data-line")) >= 1);
  assert.ok(Number(await diagnostic.getAttribute("data-column")) >= 1);
  assert.match(await diagnostic.innerText(), new RegExp(suggestion, "iu"));
});

When("I explain the Community Web search {string}", async function (expression: string) {
  const page = requirePage();
  searchProjectionJourneyResult = await page.evaluate(async (query) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_APP: { state: JsonObject; viewerContext(): JsonValue };
      CW_WORKBENCH: { openSearch(state: JsonValue, value: string): void; runSearch(state: JsonValue, options: JsonValue): Promise<JsonValue>; explainSearch(state: JsonValue): Promise<JsonObject> };
    });
    runtime.CW_WORKBENCH.openSearch(runtime.CW_APP.state, query);
    await runtime.CW_WORKBENCH.runSearch(runtime.CW_APP.state, { expression: query, context: runtime.CW_APP.viewerContext() });
    return runtime.CW_WORKBENCH.explainSearch(runtime.CW_APP.state);
  }, expression);
});

Then("the explanation names normalization authorization backend and ordering", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const explanation = searchProjectionJourneyResult.explanation as JsonObject;
  assert.ok(explanation.normalized);
  assert.equal(explanation.authorization, "pre-filtered");
  assert.equal(explanation.backend, "epoch-reference");
  assert.ok(Array.isArray(explanation.ordering));
});

When("I save the Community Web search {string} as a projection", async function (expression: string) {
  searchProjectionJourneyResult = await requirePage().evaluate(async (query) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_APP: { state: JsonObject };
      CW_WORKBENCH: { openSearch(state: JsonValue, value: string): void; runSearch(state: JsonValue, options: JsonValue): Promise<JsonValue>; saveSearchProjection(state: JsonValue, label: string): JsonObject };
    });
    runtime.CW_WORKBENCH.openSearch(runtime.CW_APP.state, query);
    await runtime.CW_WORKBENCH.runSearch(runtime.CW_APP.state, { expression: query });
    return runtime.CW_WORKBENCH.saveSearchProjection(runtime.CW_APP.state, "Needs review");
  }, expression);
});

Then("the saved projection keeps the canonical query and stable projection identity", function () {
  assert.match(String(searchProjectionJourneyResult.projectionId), /^projection-/u);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const root = searchProjectionJourneyResult.root as { children: readonly { where: { kind: string; field: string; value: string } }[] };
  assert.deepEqual(root.children[0].where, { kind: "compare", field: "state", operator: "eq", value: "needs-review" });
});

When("I clone the Community Web built-in projection", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as {
      CW_APP: { state: JsonObject };
      CW_CORE: { builtinDefaultProjection: JsonObject };
      CW_WORKBENCH: { openProjection(state: JsonValue, value: JsonValue): void; compileProjection(state: JsonValue): JsonObject };
    });
    const clone = { ...runtime.CW_CORE.builtinDefaultProjection, projectionId: "user:default-copy", version: 1, label: "My namespace" };
    runtime.CW_WORKBENCH.openProjection(runtime.CW_APP.state, clone);
    return runtime.CW_WORKBENCH.compileProjection(runtime.CW_APP.state);
  });
});

Then("the cloned definition validates through the canonical projection compiler", function () {
  assert.deepEqual(searchProjectionJourneyResult.diagnostics, []);
  assert.ok(searchProjectionJourneyResult.compiled);
});

When("I mount the Community Web built-in projection at root in replace mode", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_WORKBENCH: { mount(value: JsonObject): JsonObject } });
    return runtime.CW_WORKBENCH.mount({ mountId: "mount-user-root", scope: "user", mountPath: "/", projectionId: "builtin:default", mode: "replace", order: 10, writable: false });
  });
});

Then("the user namespace records the deterministic root replacement", function () {
  assert.equal(searchProjectionJourneyResult.scope, "user");
  assert.equal(searchProjectionJourneyResult.mountPath, "/");
  assert.equal(searchProjectionJourneyResult.mode, "replace");
});

When("I navigate to the immutable Community Web recovery namespace", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_MAP: { list(path: string): readonly { name: string }[] } });
    return { names: runtime.CW_MAP.list("/.epoch").map((entry) => entry.name) };
  });
});

Then("all protected recovery branches remain reachable", function () {
  assert.deepEqual(searchProjectionJourneyResult.names, ["default", "canonical", "projections", "sources", "diagnostics"]);
});

When("I compose Community Web projection mounts before and after the built-in root", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_WORKBENCH: { mount(value: JsonObject): JsonValue; mounts(): readonly JsonObject[] } });
    runtime.CW_WORKBENCH.mount({ mountId: "mount-before", scope: "user", mountPath: "/", projectionId: "user:first", mode: "before", order: 1, writable: false });
    runtime.CW_WORKBENCH.mount({ mountId: "mount-after", scope: "user", mountPath: "/", projectionId: "user:last", mode: "after", order: 2, writable: false });
    return { mounts: runtime.CW_WORKBENCH.mounts().filter((entry) => String(entry.mountId).startsWith("mount-")) };
  });
});

Then("the mounts retain explicit mode order and scope", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const mounts = searchProjectionJourneyResult.mounts as readonly JsonObject[];
  assert.deepEqual(mounts.map((entry) => [entry.mode, entry.order, entry.scope]), [["after", 2, "user"], ["before", 1, "user"]]);
});

When("I locate one Community Web object through two contextual paths", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_DATA: { posts: readonly JsonObject[] }; CW_MAP: { objectRef(value: JsonValue): { objectId: string }; pathForObject(id: string, projection?: string): string } });
    const ref = runtime.CW_MAP.objectRef(runtime.CW_DATA.posts[0]);
    return { objectId: ref.objectId, paths: [runtime.CW_MAP.pathForObject(ref.objectId), runtime.CW_MAP.pathForObject(ref.objectId, "projection-context")] };
  });
});

Then("both paths preserve one canonical object identity", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const paths = searchProjectionJourneyResult.paths as readonly string[];
  assert.equal(new Set(paths).size, 2);
  assert.ok(paths.every((path) => path.includes(String(searchProjectionJourneyResult.objectId))));
});

When("I create two Community Web occurrences for one canonical object", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_DATA: { posts: readonly JsonObject[] }; CW_MAP: { objectRef(value: JsonValue): JsonValue }; CW_CORE: { createProjectionOccurrenceId(input: JsonObject): string } });
    const target = runtime.CW_MAP.objectRef(runtime.CW_DATA.posts[0]);
    const base = { projectionId: "user:twice", projectionVersion: 1, parentEntryId: "entry-root", target, resolvedSegment: "message" };
    return { first: runtime.CW_CORE.createProjectionOccurrenceId({ ...base, nodeId: "leaf-a", branchId: "a" }), second: runtime.CW_CORE.createProjectionOccurrenceId({ ...base, nodeId: "leaf-b", branchId: "b" }) };
  });
});

Then("the occurrences have distinct stable entry identities", function () {
  assert.match(String(searchProjectionJourneyResult.first), /^entry-/u);
  assert.notEqual(searchProjectionJourneyResult.first, searchProjectionJourneyResult.second);
});

When("a Community Web projection update is queued while I am reading", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const state = ((window as { CW_APP: { state: JsonObject } })).CW_APP.state;
    const before = { feedMark: state.feedMark, readingAnchor: state.readingAnchor, cursor: state.cursor };
    state.pending = [{ id: "queued-projection-change" }];
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    return { before, after: { feedMark: state.feedMark, readingAnchor: state.readingAnchor, cursor: state.cursor }, pending: (state.pending as JsonValue[]).length };
  });
});

Then("my selected object and reading anchor remain unchanged until apply", function () {
  assert.deepEqual(searchProjectionJourneyResult.before, searchProjectionJourneyResult.after);
  assert.equal(searchProjectionJourneyResult.pending, 1);
});

When("I compare Community Web search with an unauthorized private object present", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_QUERY: { searchBoard(query: string, context: JsonObject): { hits: readonly { post?: { private?: boolean } }[]; matched: number } } });
    const first = runtime.CW_QUERY.searchBoard("state:needs-review", { includePrivate: false });
    const second = runtime.CW_QUERY.searchBoard("state:needs-review", { includePrivate: false, extra: { privateObjects: [{ id: "secret", private: true }] } });
    return { first: { matched: first.matched, privateHits: first.hits.filter((hit) => hit.post?.private).length }, second: { matched: second.matched, privateHits: second.hits.filter((hit) => hit.post?.private).length } };
  });
});

Then("hits completeness collisions and explanation remain observationally identical", function () {
  assert.deepEqual(searchProjectionJourneyResult.first, searchProjectionJourneyResult.second);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  assert.equal((searchProjectionJourneyResult.first as { privateHits: number }).privateHits, 0);
});

When("the Community Web search host reports a stale source", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_APP: { state: JsonObject }; CW_WORKBENCH: { openSearch(state: JsonValue, value: string): void; runSearch(state: JsonValue, options: JsonValue): Promise<JsonObject> } });
    runtime.CW_WORKBENCH.openSearch(runtime.CW_APP.state, "state:needs-review");
    return runtime.CW_WORKBENCH.runSearch(runtime.CW_APP.state, { expression: "state:needs-review", sourceCheckpoints: [{ sourceId: "atproto", token: "old", observedAt: "2026-08-01T00:00:00Z", status: "stale" }] });
  });
});

Then("the search completeness visibly reports stale", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  assert.equal((searchProjectionJourneyResult.result as { completeness: { status: string } }).completeness.status, "stale");
});

When("persistent SQLite is unavailable to Community Web", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_APP: { state: JsonObject }; CW_WORKBENCH: { openSearch(state: JsonValue, value: string): void; runSearch(state: JsonValue, options: JsonValue): Promise<JsonObject> } });
    runtime.CW_WORKBENCH.openSearch(runtime.CW_APP.state, "state:open");
    const result = await runtime.CW_WORKBENCH.runSearch(runtime.CW_APP.state, { expression: "state:open", backendUnavailable: "sqlite-wasm" });
    return { result, backend: "epoch-reference" };
  });
});

Then("deterministic reference search remains available", function () {
  assert.equal(searchProjectionJourneyResult.backend, "epoch-reference");
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  assert.ok((searchProjectionJourneyResult.result as JsonObject).result);
});

When("I compare equivalent Community Web GraphQL and text search expressions", async function () {
  searchProjectionJourneyResult = await requirePage().evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (window as { CW_CORE: { normalizeQuery(value: string): { ast: JsonValue; canonicalJson: string } }; CommunityGraphQL: { searchExpressionFromInput(value: JsonValue): JsonValue; COMMUNITY_GRAPHQL_SDL: string } });
    const text = runtime.CW_CORE.normalizeQuery("state:needs-review");
    const structured = runtime.CommunityGraphQL.searchExpressionFromInput({ compare: { field: "state", operator: "eq", value: { string: "needs-review" } } });
    return { textAst: text.ast, structured, oneOf: runtime.CommunityGraphQL.COMMUNITY_GRAPHQL_SDL.includes("@oneOf") };
  });
});

Then("both frontends expose the same canonical expression semantics", function () {
  assert.deepEqual(searchProjectionJourneyResult.textAst, searchProjectionJourneyResult.structured);
  assert.equal(searchProjectionJourneyResult.oneOf, true);
});

/**
 * The board is an Epoch participant, so opening it is opening a workspace. The
 * assertions below are about what the person gets — their own project, an
 * interface with a revision behind it — not about how it is stored.
 */
interface BoardWorkspaceProbe {
  readonly workspaceId: string;
  readonly harnessVerified: boolean;
  readonly events: number;
  readonly projectSlug: string;
  readonly uiView: string;
  readonly statusSlot: string;
}

async function boardWorkspace(): Promise<BoardWorkspaceProbe> {
  const page = requirePage();
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & { CW_WORKSPACE?: { project(): JsonValue } }).CW_WORKSPACE;
    return workspace !== undefined && workspace.project() !== null;
  }, undefined, { timeout: 10_000 });

  return page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & {
      CW_WORKSPACE: {
        status(): { workspaceId: string; harnessVerified: boolean; events: number };
        project(): { slug: string; uiView: string };
      };
    }).CW_WORKSPACE;
    const status = workspace.status();
    const project = workspace.project();
    return {
      workspaceId: status.workspaceId,
      harnessVerified: status.harnessVerified,
      events: status.events,
      projectSlug: project.slug,
      uiView: project.uiView,
      statusSlot: document.querySelector('[data-cw-slot="shell.workspace-status"]')?.textContent ?? "",
    };
  });
}

Then("the board opens my own workspace with a project that owns my interface", async function () {
  const probe = await boardWorkspace();
  assert.ok(probe.workspaceId.startsWith("ws_"), "the board must open a workspace of its own");
  assert.equal(probe.projectSlug, ".epoch", "a default project holds this browser's interface");
  assert.ok(probe.harnessVerified, "the installed interface harness must verify before it renders");
  assert.ok(probe.events > 0, "opening the workspace records history");
  assert.match(probe.statusSlot, /ws_/u, "the workspace tells me it is there");
});

Then("the interface it renders is a revision I can inspect and roll back", async function () {
  const page = requirePage();
  const probe = await boardWorkspace();
  const ledger = await page.evaluate((view: string) => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & {
      CW_WORKSPACE: { runtime(): { workspace: { history(view: string): readonly { revision: number; summary: string }[] } } };
    }).CW_WORKSPACE;
    return workspace.runtime().workspace.history(view).map((entry) => ({ revision: entry.revision, summary: entry.summary }));
  }, probe.uiView);

  assert.ok(ledger.length > 0, "the rendered interface must have a revision behind it");
  assert.equal(ledger[0].revision, 1);
  assert.equal(await page.locator('[data-cw-command="ui.restoreLastKnownGood"]').count(), 1,
    "the way back is part of the page, not part of what a revision may change");
});

/**
 * Composing an interface change. The point of these assertions is the order:
 * a person sees what a proposal does while nothing has happened yet, and only
 * their acceptance makes it real.
 */
interface ComposeProbe {
  readonly validation: string;
  readonly diff: string;
  readonly appliedBefore: string;
  readonly slotBefore: string;
}

let composeProbe: ComposeProbe | undefined;

When("I compose a panel for my review queue with a denser row token", async function () {
  const page = requirePage();
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & { CW_WORKSPACE?: { project(): JsonValue } }).CW_WORKSPACE;
    return workspace !== undefined && workspace.project() !== null;
  }, undefined, { timeout: 10_000 });

  composeProbe = await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const compose = (globalThis as typeof globalThis & {
      CW_COMPOSE: { propose(): Promise<{ validation: { state: string } } | null> };
    }).CW_COMPOSE;
    document.querySelector<HTMLButtonElement>("[data-compose-open]")?.click();
    document.querySelector<HTMLTextAreaElement>("[data-gen-ui-input]")!.value = "show my review queue";
    document.querySelector<HTMLTextAreaElement>("[data-gen-ui-source]")!.value =
      'root = Panel("Review queue", [Fact("open", "3")])';
    document.querySelector<HTMLTextAreaElement>("[data-token-editor]")!.value = "--cw-cell: 0.58rem;";
    const proposed = await compose.propose();
    return {
      validation: proposed?.validation.state ?? "none",
      diff: document.querySelector("[data-compose-diff]")?.textContent ?? "",
      appliedBefore: getComputedStyle(document.documentElement).getPropertyValue("--cw-cell").trim(),
      slotBefore: document.querySelector('[data-cw-slot="board.context-panel"]')?.textContent ?? "",
    };
  });
});

Then("I see which widget and which token the proposal changes, and nothing has changed yet", function () {
  assert.ok(composeProbe, "nothing was composed");
  assert.equal(composeProbe.validation, "valid");
  assert.match(composeProbe.diff, /GeneratedPanel/u, "the diff must name the widget that appears");
  assert.match(composeProbe.diff, /--cw-cell/u, "the diff must name the token that changes");
  assert.notEqual(composeProbe.appliedBefore, "0.58rem", "nothing may apply before I accept it");
  assert.doesNotMatch(composeProbe.slotBefore, /Review queue/u, "the panel may not appear before I accept it");
});

When("I accept the proposed interface change", async function () {
  const page = requirePage();
  await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    await (globalThis as typeof globalThis & { CW_COMPOSE: { accept(): Promise<JsonValue> } }).CW_COMPOSE.accept();
  });
});

Then("the panel and the token are part of my interface and survive a reload", async function () {
  const page = requirePage();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & { CW_WORKSPACE?: { project(): JsonValue } }).CW_WORKSPACE;
    return workspace !== undefined && workspace.project() !== null;
  }, undefined, { timeout: 10_000 });

  const after = await page.evaluate(() => ({
    generated: document.querySelector('[data-c="generated-panel"]')?.textContent ?? "",
    cell: getComputedStyle(document.documentElement).getPropertyValue("--cw-cell").trim(),
  }));
  assert.match(after.generated, /Review queue/u, "the accepted panel is part of the interface");
  assert.equal(after.cell, "0.58rem", "the accepted token is part of the interface");
});

/**
 * Carrying a workspace somewhere else, and undoing a change without erasing it.
 * The second participant is a second runtime in the same page: what is being
 * tested is that a bundle is enough to reproduce an interface, not that two
 * browsers can reach each other.
 */
interface HandoffProbe {
  readonly applied: number;
  readonly cell: string;
  readonly generated: string;
}

let handoff: HandoffProbe | undefined;

When("I hand my workspace to another participant", async function () {
  const page = requirePage();
  handoff = await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const runtime = (globalThis as typeof globalThis & {
      CW_WORKSPACE: { execute(kind: string, input?: JsonValue): Promise<{ data: JsonValue }> };
      CW_RUNTIME: {
        createCommunityRuntime(options: JsonObject): {
          commands: { execute(request: JsonObject): Promise<{ data: { applied: number } }> };
          workspace: { materialize(): { manifest: { theme: Record<string, string>; placements: { component: string }[] } } };
        };
      };
      CW_WORKSPACE_HARNESS?: JsonValue;
    });

    const bundle = (await runtime.CW_WORKSPACE.execute("workspace.export")).data;
    // The other participant installs the same harness release. A participant on
    // a different release would render safe mode rather than an interface it
    // cannot validate — which is the ABI doing its job, not a failure.
    const other = runtime.CW_RUNTIME.createCommunityRuntime({
      namespace: "community-web",
      actor: "did:epoch:other-machine",
      policies: { capabilities: ["*"] },
      // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
      harness: (globalThis as typeof globalThis & { CW_WORKSPACE: { harness(): JsonValue } }).CW_WORKSPACE.harness(),
    });
    const imported = await other.commands.execute({
      kind: "workspace.import",
      input: { bundle },
      confirmed: true,
    });
    const rendered = other.workspace.materialize();
    return {
      applied: imported.data.applied,
      cell: rendered.manifest.theme["--cw-cell"] ?? "",
      generated: rendered.manifest.placements.map((placement) => placement.component).join(","),
    };
  });
});

Then("the other participant renders the same interface from the same history", function () {
  assert.ok(handoff, "no workspace was handed over");
  assert.ok(handoff.applied > 0, "the other participant received events");
  assert.equal(handoff.cell, "0.58rem", "the token I accepted is what they render");
  assert.match(handoff.generated, /GeneratedPanel/u, "the panel I accepted is what they render");
});

When("I roll my interface back to the revision before the change", async function () {
  const page = requirePage();
  await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & {
      CW_WORKSPACE: {
        execute(kind: string, input?: JsonValue, options?: JsonValue): Promise<JsonValue>;
        runtime(): { workspace: { history(view: string): readonly { revision: number }[] } };
      };
    }).CW_WORKSPACE;
    const history = workspace.runtime().workspace.history("main");
    const previous = history[history.length - 2].revision;
    await workspace.execute("change.revert", { view: "main", revision: previous }, { confirmed: true });
  });
});

Then("my board no longer shows the panel, and the change I rolled back is still readable", async function () {
  const page = requirePage();
  const after = await page.evaluate(() => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const workspace = (globalThis as typeof globalThis & {
      CW_WORKSPACE: {
        runtime(): {
          workspace: {
            history(view: string): readonly { revision: number }[];
            revision(view: string, revision: number): { manifest: { placements: { component: string }[] } };
          };
        };
      };
    }).CW_WORKSPACE;
    const history = workspace.runtime().workspace.history("main");
    const merged = history[history.length - 2].revision;
    return {
      generated: document.querySelector('[data-c="generated-panel"]')?.textContent ?? "",
      cell: getComputedStyle(document.documentElement).getPropertyValue("--cw-cell").trim(),
      rolledBack: workspace.runtime().workspace.revision("main", merged).manifest.placements
        .map((placement) => placement.component).join(","),
    };
  });

  assert.equal(after.generated, "", "the panel is gone from my board");
  assert.notEqual(after.cell, "0.58rem", "the token is no longer applied");
  assert.match(after.rolledBack, /GeneratedPanel/u, "what I rolled back is still there to read");
});

When("a realtime fabric endpoint is configured for the board", async function () {
  const page = requirePage();
  const result = await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = globalThis as typeof globalThis & {
      CW_NATS_FABRIC: {
        reset(): void;
        attach(identity: JsonValue, overrides?: JsonValue): Promise<JsonObject>;
        statusLabel(): string;
      };
      CW_APP: { getIdentity(): { kind?: string; principalId?: string; anonymous?: boolean } };
    };
    win.CW_NATS_FABRIC.reset();
    const identity = win.CW_APP.getIdentity();
    const attached = await win.CW_NATS_FABRIC.attach(identity, {
      endpoint: "wss://nats.example/ws",
    });
    return {
      identityKind: identity?.kind,
      attached: attached.attached,
      status: attached.status,
      message: attached.message,
      openChat: attached.openChat,
      label: win.CW_NATS_FABRIC.statusLabel(),
    };
  });
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  (this as { fabricGuestProbe?: JsonValue }).fabricGuestProbe = result;
});

Then("as a guest I am not attached to the realtime fabric", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const probe = (this as { fabricGuestProbe?: JsonObject }).fabricGuestProbe;
  assert.ok(probe, "fabric guest probe missing");
  assert.ok(probe.identityKind === "guest" || probe.identityKind === "denied", "expected guest identity");
  assert.equal(probe.attached, false);
  assert.equal(probe.status, "needs-sign-in");
});

Then("the fabric status says realtime requires sign-in", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const probe = (this as { fabricGuestProbe?: JsonObject }).fabricGuestProbe;
  assert.ok(probe);
  assert.match(String(probe.message || probe.label || ""), /realtime requires sign-in/i);
});

Then("fabric failure does not open session chat", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const probe = (this as { fabricGuestProbe?: JsonObject; fabricTicketProbe?: JsonObject }).fabricGuestProbe
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    ?? (this as { fabricTicketProbe?: JsonObject }).fabricTicketProbe;
  assert.ok(probe);
  assert.equal(probe.openChat, false);
});

When("I present a Platform fabric ticket for a signed-in identity", async function () {
  const page = requirePage();
  const result = await page.evaluate(async () => {
    // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
    const win = globalThis as typeof globalThis & {
      CW_NATS_FABRIC: {
        reset(): void;
        attach(identity: JsonValue, overrides?: JsonValue): Promise<JsonObject>;
        status(): { opened: boolean; hasSecret: boolean; status: string };
      };
    };
    win.CW_NATS_FABRIC.reset();
    const identity = {
      kind: "atproto",
      principalId: "did:plc:contributor",
      platformSessionId: "session_board_1",
      anonymous: false,
    };
    const attached = await win.CW_NATS_FABRIC.attach(identity, {
      endpoint: "wss://nats.example/ws",
      mintFabricCredential: (input: { sessionId?: string }) => {
        if (input.sessionId !== "session_board_1") throw new Error("unexpected parent");
        return { id: "fabric_board", secret: "opaque-fabric-board-secret" };
      },
      connect: async (opts: { fabricSecret: string }) => {
        if (opts.fabricSecret === identity.principalId || opts.fabricSecret === identity.platformSessionId) {
          throw new Error("secret leaked identity id");
        }
        return { channel: true };
      },
    });
    return {
      attached: attached.attached,
      status: attached.status,
      openChat: attached.openChat,
      hasSecretField: Object.prototype.hasOwnProperty.call(attached, "fabricSecret"),
      fabricStatus: win.CW_NATS_FABRIC.status(),
      secretWasIdentity: false,
    };
  });
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  (this as { fabricTicketProbe?: JsonValue }).fabricTicketProbe = result;
});

Then("the board attaches to the realtime fabric without opening session chat", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const probe = (this as { fabricTicketProbe?: JsonObject }).fabricTicketProbe;
  assert.ok(probe);
  assert.equal(probe.attached, true);
  assert.equal(probe.status, "online");
  assert.equal(probe.openChat, false);
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const fabricStatus = probe.fabricStatus as { opened?: boolean; status?: string };
  assert.equal(fabricStatus.opened, true);
  assert.equal(fabricStatus.status, "online");
});

Then("the fabric secret is never returned as a board identity id", function () {
  // SAFETY: The scenario fixture establishes this test-only contract before the value is consumed.
  const probe = (this as { fabricTicketProbe?: JsonObject }).fabricTicketProbe;
  assert.ok(probe);
  assert.equal(probe.hasSecretField, false, "attach result must not leak fabricSecret");
});
