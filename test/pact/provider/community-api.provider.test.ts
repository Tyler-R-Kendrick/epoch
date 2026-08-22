import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Verifier } from "@pact-foundation/pact";
import {
  createCommunityApiFetchHandler,
  createInMemoryCommunityApi,
  createLiveSessionFetchHandler,
  createLiveSessionHub,
  createLiveSessionService,
} from "@epoch/community-api";
import {
  createCommunityRuntime,
  createLiveSpaceCommandExtensions,
  createLocalLiveSpacePort,
  type LiveSessionSnapshot,
} from "@epoch/community-runtime";
import type { CommunityApiTransport } from "@epoch/community-core";
import { PACT_DIR, PactProviders, startFetchHandlerServer } from "../helpers";

interface ProviderState {
  api: CommunityApiTransport;
  live: LiveProviderState;
}

/**
 * The live routes are a second handler on the same provider, so verification
 * composes them the way a deployment does rather than verifying a handler no
 * deployment assembles.
 */
interface LiveProviderState {
  readonly handler: (request: Request) => Promise<Response>;
  /** The real, minted session id this pact's fixed id stands for. */
  readonly sessionId: string;
}

const LIVE_BASE_PATH = "/community/live";
/** The id the consumer pact names. Sessions mint their own, so it is aliased. */
const PACT_SESSION_ID = "livesession-pact";
const PACT_PRINCIPAL = "principal-cli-host";
const PACT_OWNER = "principal-pact-owner";

/**
 * Provider verification: Epoch.Community.API against consumer pacts.
 * @see https://docs.pact.io/getting_started/verifying_pacts
 * @see https://github.com/pact-foundation/pact-js/blob/master/docs/provider.md
 */
export async function runCommunityApiProviderVerification(): Promise<void> {
  const pactUrls = listPactsForProvider(PactProviders.communityApi);
  if (pactUrls.length === 0) {
    throw new Error(
      `No consumer pacts found for ${PactProviders.communityApi} in ${PACT_DIR}. Run consumer contract tests first.`,
    );
  }

  const state: ProviderState = {
    api: createInMemoryCommunityApi(),
    live: await liveDeployment({ ownerPrincipalId: PACT_PRINCIPAL }),
  };

  const handler = createCommunityApiFetchHandler({
    listWorkflows: () => state.api.listWorkflows(),
    listRepositories: () => state.api.listRepositories(),
    getRepository: (slug) => state.api.getRepository(slug),
    createRepository: (input) => state.api.createRepository(input),
    openIssue: (slug, input) => state.api.openIssue(slug, input),
    commentOnIssue: (slug, issueId, input) => state.api.commentOnIssue(slug, issueId, input),
    createChange: (slug, input) => state.api.createChange(slug, input),
    reviewChange: (slug, changeId, input) => state.api.reviewChange(slug, changeId, input),
    getObject: (objectId, authorization) => state.api.getObject(objectId, authorization),
    updateObjectState: (objectId, objectState, authorization) => state.api.updateObjectState(objectId, objectState, authorization),
    listThreadRelations: (objectId, authorization) => state.api.listThreadRelations(objectId, authorization),
  }, {
    resolveAuthorization: () => ({
      actorId: "pact-provider",
      permissions: ["object:state:write"],
    }),
  });

  // One provider, two route families — dispatched by prefix exactly as a
  // deployment mounts them.
  const composed = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname.startsWith(LIVE_BASE_PATH)) {
      return state.live.handler(aliasSessionId(request, state.live.sessionId));
    }
    return handler(request);
  };

  const server = await startFetchHandlerServer(composed);
  try {
    await new Verifier({
      provider: PactProviders.communityApi,
      providerBaseUrl: server.url,
      pactUrls,
      logLevel: "error",
      stateHandlers: {
        "community repositories exist": async () => {
          state.api = seededApi();
        },
        "repository epoch/epoch exists": async () => {
          state.api = seededApi();
        },
        "community workflows are available": async () => {
          state.api = createInMemoryCommunityApi();
        },
        "community object m-pact exists": async () => {
          state.api = seededObjectApi();
        },
        "live session livesession-pact is live": async () => {
          // The consumer's principal owns this one, so its reads and commands
          // are the ordinary authorized path.
          state.live = await liveDeployment({ ownerPrincipalId: PACT_PRINCIPAL });
        },
        "live session livesession-pact refuses publication from this principal": async () => {
          // Someone else's session: the consumer can read it and cannot publish
          // into it, which is the refusal the contract is about.
          state.live = await liveDeployment({ ownerPrincipalId: PACT_OWNER });
        },
      },
    }).verifyProvider();
  } finally {
    await server.close();
  }

  assert.ok(true, "Community API provider verification completed");
}

/**
 * Compose the live command bus, hub, and routes the way a deployment does,
 * then start one session and report the id it minted.
 */
async function liveDeployment(options: { readonly ownerPrincipalId: string }): Promise<LiveProviderState> {
  let clockMs = 0;
  let currentActor = options.ownerPrincipalId;
  const port = createLocalLiveSpacePort({
    now: () => { clockMs += 10; return clockMs; },
    sessionSalt: "pact-entropy",
    resolveSpace: () => ({ viewRef: "views/present" }),
  });
  const runtime = createCommunityRuntime({
    namespace: "pact-live",
    actor: options.ownerPrincipalId,
    policies: { capabilities: ["*"] },
    now: () => "2026-08-22T00:00:00.000Z",
    extensions: createLiveSpaceCommandExtensions(port, () => currentActor),
  });
  const service = createLiveSessionService({
    execute: runtime.commands.execute,
    hub: createLiveSessionHub({}),
  });

  const created = await port.createSession({
    spaceId: "space-pact",
    actor: options.ownerPrincipalId,
    policy: {
      visibility: "community",
      presentationViewRef: "views/present",
      allowedPathPatterns: ["packages/app/**"],
      allowedActionIds: ["view.open", "diff.show"],
    },
  });
  // SAFETY: createSession returns a LiveSessionSnapshot from the local port.
  const sessionId = (created.data as LiveSessionSnapshot).sessionId;
  await port.recordConsent({ sessionId, actor: options.ownerPrincipalId, scopes: ["semantic-capture"] });
  await port.lifecycle({ sessionId, actor: options.ownerPrincipalId, command: "openLobby" });
  await port.lifecycle({ sessionId, actor: options.ownerPrincipalId, command: "start" });

  const handler = createLiveSessionFetchHandler({
    service,
    now: () => clockMs,
    resolveAuthorization: (request) => {
      const principal = request.headers.get("x-epoch-principal");
      if (principal === null) return undefined;
      currentActor = principal;
      return { principalId: principal };
    },
  });

  return { handler, sessionId };
}

/**
 * Rewrite the pact's fixed session id to the one this run actually minted.
 *
 * Session ids are derived, not chosen, so a contract cannot name a real one.
 * The alias keeps the wire shape under verification and swaps only the opaque
 * identifier — nothing about the request's meaning changes.
 */
function aliasSessionId(request: Request, sessionId: string): Request {
  const url = new URL(request.url);
  if (!url.pathname.includes(PACT_SESSION_ID)) return request;
  url.pathname = url.pathname.replace(PACT_SESSION_ID, sessionId);
  return new Request(url, request);
}

function seededObjectApi(): CommunityApiTransport {
  const ref = { objectId: "m-pact", kind: "message" as const };
  return createInMemoryCommunityApi({
    messages: [{
      ref,
      context: { objectId: "channel-general", kind: "channel" },
      authorId: "alice",
      body: "Pact object",
      publishedAt: "2026-08-11T00:00:00.000Z",
      threadRoot: ref,
      relations: [],
      state: "read",
      aliases: ["pact-object"],
    }],
  });
}

function seededApi(): CommunityApiTransport {
  return createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Event-driven DVCS",
      maintainers: ["alice"],
      topics: ["dvcs", "crdt"],
    }],
  });
}

function listPactsForProvider(provider: string): string[] {
  if (!existsSync(PACT_DIR)) return [];
  return readdirSync(PACT_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(PACT_DIR, name))
    .filter((path) => {
      try {
        // SAFETY: Runtime checks or construction above establish {.
        const parsed = JSON.parse(readFileSync(path, "utf8")) as {
          provider?: { name?: string };
        };
        return parsed.provider?.name === provider;
      } catch {
        return false;
      }
    });
}
