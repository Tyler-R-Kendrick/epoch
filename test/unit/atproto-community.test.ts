import assert from "node:assert/strict";
import {
  EpochLexicon,
  FeatureDisabledError,
  FederatedCommunity,
  MockPds,
  PrivatePublishError,
} from "@epoch/atproto";

export async function runAtprotoCommunityTests(): Promise<void> {
  await federationModesAndSocialGraph();
  await publicRepoCardGitCloneUrl();
  await issuesProposalsPrivateGatesAndLegalHold();
}

async function federationModesAndSocialGraph(): Promise<void> {
  const pds = new MockPds();
  const disabled = new FederatedCommunity({ mode: "disabled", pds });
  assert.throws(() => disabled.bindIdentity({
    did: "did:plc:alice",
    handle: "alice.test",
    pdsEndpoint: "mock://pds",
  }), (error) => error instanceof FeatureDisabledError && error.code === "feature_disabled");

  const local = new FederatedCommunity({ mode: "local-only", pds });
  local.bindIdentity({
    did: "did:plc:alice",
    handle: "alice.test",
    pdsEndpoint: "mock://pds",
    epochAuthorId: "alice",
  });
  const profileLocal = await local.putProfile({ did: "did:plc:alice", displayName: "Alice" });
  assert.equal(profileLocal.atUri, undefined);
  await local.follow({ followerDid: "did:plc:alice", subject: "did:plc:bob" });
  await local.star({ did: "did:plc:alice", repoSlug: "epoch/demo" });
  assert.equal(pds.allRecords().length, 0);
  assert.equal(local.listStars().length, 1);

  const federated = new FederatedCommunity({
    mode: "federated",
    pds,
    gitCloneBaseUrl: "http://127.0.0.1:9418/epoch.git",
  });
  federated.bindIdentity({
    did: "did:plc:alice",
    handle: "alice.test",
    pdsEndpoint: "mock://pds",
  });
  const profile = await federated.putProfile({ did: "did:plc:alice", displayName: "Alice" });
  assert.ok(profile.atUri?.startsWith("at://did:plc:alice/org.epoch.actor.profile/"));
  const follow = await federated.follow({ followerDid: "did:plc:alice", subject: "did:plc:bob" });
  assert.ok(follow.atUri);
  const star = await federated.star({ did: "did:plc:alice", repoSlug: "epoch/demo" });
  assert.ok(star.atUri);
  assert.ok(federated.appViewTimeline().length >= 3);
  assert.ok(
    federated.appViewTimeline().some((r) => r.collection === EpochLexicon.star),
  );
}

async function publicRepoCardGitCloneUrl(): Promise<void> {
  const pds = new MockPds();
  const cloneBase = "http://127.0.0.1:9555/epoch.git";
  const community = new FederatedCommunity({
    mode: "federated",
    pds,
    gitCloneBaseUrl: cloneBase,
    epochSyncBaseUrl: "epoch://sync",
  });
  const card = await community.publishRepo({
    slug: "epoch/demo",
    name: "Demo",
    description: "Public demo",
    visibility: "public",
    ownerDid: "did:plc:alice",
    topics: ["atproto"],
  });
  assert.equal(card.gitCloneUrl, cloneBase);
  assert.ok(card.epochSyncUrl?.includes("epoch%2Fdemo") || card.epochSyncUrl?.includes("epoch/demo"));
  assert.ok(card.atUri?.includes(EpochLexicon.repo));
  assert.equal(community.getRepo("epoch/demo")?.gitCloneUrl, cloneBase);
}

async function issuesProposalsPrivateGatesAndLegalHold(): Promise<void> {
  const pds = new MockPds();
  const community = new FederatedCommunity({ mode: "federated", pds });

  await assert.rejects(
    () => community.publishPrivateAsPublic({
      did: "did:plc:alice",
      kind: "repository",
      visibility: "private",
      payload: { name: "secret" },
    }),
    (error) => error instanceof PrivatePublishError,
  );

  await assert.rejects(
    () => community.publishRepo({
      slug: "secret/repo",
      name: "Secret",
      description: "nope",
      visibility: "private",
      ownerDid: "did:plc:alice",
    }),
    (error) => error instanceof PrivatePublishError,
  );

  const issue = await community.openIssue({
    repoSlug: "epoch/demo",
    title: "Public bug",
    body: "details",
    authorDid: "did:plc:bob",
    visibility: "public",
    intentRef: "event:intent-1",
  });
  assert.ok(issue.atUri);
  assert.equal(issue.intentRef, "event:intent-1");

  const commented = await community.commentOnIssue({
    issueId: issue.id,
    authorDid: "did:plc:carol",
    body: "same",
  });
  assert.ok(commented.comments[0]?.atUri);

  const privateIssue = await community.openIssue({
    repoSlug: "epoch/demo",
    title: "Private",
    authorDid: "did:plc:bob",
    visibility: "private",
  });
  assert.equal(privateIssue.atUri, undefined);
  assert.ok(!pds.allRecords().some((r) => r.value.title === "Private"));

  const proposal = await community.proposeChange({
    repoSlug: "epoch/demo",
    title: "Change",
    authorDid: "did:plc:bob",
    intentRef: "event:intent-2",
  });
  assert.ok(proposal.atUri);
  const reviewed = await community.reviewProposal({
    proposalId: proposal.id,
    reviewerDid: "did:plc:alice",
    decision: "approved",
    body: "lgtm",
  });
  assert.ok(reviewed.reviews[0]?.atUri);

  const report = community.fileModerationReport({
    reason: "spam",
    targetUri: issue.atUri,
    relatedAtUris: [proposal.atUri!],
  });
  assert.ok(report.atUris.includes(issue.atUri!));

  const hold = community.legalHoldExport();
  assert.ok(hold.atUris.includes(issue.atUri!));
  assert.ok(hold.records.some((r) => r.collection === EpochLexicon.issue));
  assert.equal(hold.mode, "federated");
}
