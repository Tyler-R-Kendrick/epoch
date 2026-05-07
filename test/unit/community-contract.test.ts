import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MatchersV3, PactV3 } from "@pact-foundation/pact";
import {
  CommunityRepository,
  createHttpCommunityClient,
} from "@epoch/community-core";

export async function runCommunityContractTests(): Promise<void> {
  await coreHttpClientHonorsTheCommunityApiRepositoryContract();
  await coreHttpClientHonorsTheCommunityApiIssueContract();
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
  changeProposals: [],
  discussions: [],
};

async function coreHttpClientHonorsTheCommunityApiRepositoryContract(): Promise<void> {
  const provider = pact("repository-list");
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
  const provider = pact("issue-open");
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

function pact(name: string): PactV3 {
  return new PactV3({
    consumer: "Epoch.Community.Core",
    provider: "Epoch.Community.API",
    dir: mkdtempSync(join(tmpdir(), `epoch-community-pact-${name}-`)),
    logLevel: "error",
  });
}
