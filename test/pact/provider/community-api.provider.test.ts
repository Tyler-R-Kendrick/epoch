import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Verifier } from "@pact-foundation/pact";
import {
  createCommunityApiFetchHandler,
  createInMemoryCommunityApi,
} from "@epoch/community-api";
import type { CommunityApiTransport } from "@epoch/community-core";
import { PACT_DIR, PactProviders, startFetchHandlerServer } from "../helpers";

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

  const state: { api: CommunityApiTransport } = {
    api: createInMemoryCommunityApi(),
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

  const server = await startFetchHandlerServer(handler);
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
      },
    }).verifyProvider();
  } finally {
    await server.close();
  }

  assert.ok(true, "Community API provider verification completed");
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
        const parsed = JSON.parse(readFileSync(path, "utf8")) as {
          provider?: { name?: string };
        };
        return parsed.provider?.name === provider;
      } catch {
        return false;
      }
    });
}
