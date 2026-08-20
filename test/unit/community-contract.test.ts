import assert from "node:assert/strict";
import { MatchersV3 } from "@pact-foundation/pact";
import {
  CommunityRepository,
  createHttpCommunityClient,
} from "@epoch/community-core";
import { createConsumerPact, PactConsumers, PactProviders } from "../pact/helpers";
import { isString } from "../helpers/type-guards";

/**
 * Consumer-driven contract: Epoch.Community.Core → Epoch.Community.API
 * Official Pact JS consumer pattern (PactV3 + MatchersV3).
 * @see https://docs.pact.io/implementation_guides/javascript/docs/consumer
 */
export async function runCommunityContractTests(): Promise<void> {
  await coreHttpClientHonorsTheCommunityApiRepositoryContract();
  await coreHttpClientHonorsTheCommunityApiIssueContract();
  await coreHttpClientHonorsTheCommunityApiWorkflowsContract();
  await coreHttpClientHonorsTheCommunityApiChangeContract();
  await coreHttpClientHonorsCanonicalObjectContract();
}

async function coreHttpClientHonorsCanonicalObjectContract(): Promise<void> {
  const provider = communityPact();
  provider
    .given("community object m-pact exists")
    .uponReceiving("a request for a canonical community object")
    .withRequest({
      method: "GET",
      path: "/objects/m-pact",
      headers: { Accept: "application/json" },
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        ref: { objectId: "m-pact", kind: "message" },
        context: { objectId: "channel-general", kind: "channel" },
        authorId: "alice",
        body: "Pact object",
        publishedAt: "2026-08-11T00:00:00.000Z",
        threadRoot: { objectId: "m-pact", kind: "message" },
        relations: [],
        state: "read",
        aliases: ["pact-object"],
      },
    });

  await provider.executeTest(async (mockServer) => {
    const client = createHttpCommunityClient({ baseUrl: mockServer.url });
    const object = await client.getObject("m-pact");
    assert.equal(object.ref.objectId, "m-pact");
    assert.equal(object.threadRoot.objectId, "m-pact");
  });
}

const repositoryExample: CommunityRepository = {
  slug: "epoch/epoch",
  displayName: "Epoch",
  description: "Event-driven DVCS",
  visibility: "public",
  defaultView: "main",
  maintainers: ["alice"],
  topics: ["dvcs", "crdt"],
  issues: [],
  changes: [],
  discussions: [],
};

function communityPact(): ReturnType<typeof createConsumerPact> {
  return createConsumerPact({
    consumer: PactConsumers.communityCore,
    provider: PactProviders.communityApi,
  });
}

async function coreHttpClientHonorsTheCommunityApiRepositoryContract(): Promise<void> {
  const provider = communityPact();
  provider
    .given("community repositories exist")
    .uponReceiving("a request to list community repositories")
    .withRequest({
      method: "GET",
      path: "/repositories",
      headers: { Accept: "application/json" },
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: MatchersV3.eachLike(repositoryExample, 1),
    });

  await provider.executeTest(async (mockServer) => {
    const client = createHttpCommunityClient({ baseUrl: mockServer.url });
    const repositories = await client.listRepositories();
    assert.equal(repositories[0].slug, "epoch/epoch");
    assert.deepEqual(repositories[0].maintainers, ["alice"]);
  });
}

async function coreHttpClientHonorsTheCommunityApiIssueContract(): Promise<void> {
  const provider = communityPact();
  const repositoryWithIssue: CommunityRepository = {
    ...repositoryExample,
    issues: [{
      id: "ISSUE-1",
      title: "Browser feature coverage",
      author: "bob",
      body: "",
      labels: ["coverage"],
      status: "open",
      comments: [],
    }],
  };

  provider
    .given("repository epoch/epoch exists")
    .uponReceiving("a request to open a community issue")
    .withRequest({
      method: "POST",
      path: "/repositories/epoch%2Fepoch/issues",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: {
        title: "Browser feature coverage",
        author: "bob",
        labels: ["coverage"],
      },
    })
    .willRespondWith({
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: repositoryWithIssue,
    });

  await provider.executeTest(async (mockServer) => {
    const client = createHttpCommunityClient({ baseUrl: mockServer.url });
    const repository = await client.openIssue("epoch/epoch", {
      title: "Browser feature coverage",
      author: "bob",
      labels: ["coverage"],
    });
    assert.equal(repository.issues[0].id, "ISSUE-1");
    assert.equal(repository.issues[0].status, "open");
  });
}

async function coreHttpClientHonorsTheCommunityApiWorkflowsContract(): Promise<void> {
  const provider = communityPact();
  provider
    .given("community workflows are available")
    .uponReceiving("a request to list community workflows")
    .withRequest({
      method: "GET",
      path: "/workflows",
      headers: { Accept: "application/json" },
    })
    .willRespondWith({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: MatchersV3.eachLike({
        id: "repository-browsing",
        label: "Repositories",
        purpose: "Browse Epoch repositories",
      }, 1),
    });

  await provider.executeTest(async (mockServer) => {
    const client = createHttpCommunityClient({ baseUrl: mockServer.url });
    const workflows = await client.listWorkflows();
    assert.ok(workflows.length >= 1);
    assert.equal(isString(workflows[0].id), true);
  });
}

async function coreHttpClientHonorsTheCommunityApiChangeContract(): Promise<void> {
  const provider = communityPact();
  const withChange: CommunityRepository = {
    ...repositoryExample,
    changes: [{
      id: "CHANGE-1",
      title: "Ship pact gates",
      author: "alice",
      body: "wire provider verification",
      sourceView: "feature/pact",
      targetView: "main",
      status: "open",
      reviews: [],
    }],
  };

  provider
    .given("repository epoch/epoch exists")
    .uponReceiving("a request to create a community Change")
    .withRequest({
      method: "POST",
      path: "/repositories/epoch%2Fepoch/changes",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: {
        title: "Ship pact gates",
        author: "alice",
        body: "wire provider verification",
        sourceView: "feature/pact",
        targetView: "main",
      },
    })
    .willRespondWith({
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: withChange,
    });

  await provider.executeTest(async (mockServer) => {
    const client = createHttpCommunityClient({ baseUrl: mockServer.url });
    const repository = await client.createChange("epoch/epoch", {
      title: "Ship pact gates",
      author: "alice",
      body: "wire provider verification",
      sourceView: "feature/pact",
      targetView: "main",
    });
    assert.equal(repository.changes[0]?.id, "CHANGE-1");
    assert.equal(repository.changes[0]?.status, "open");
  });
}
