/**
 * Epoch ATProto social plane: mock PDS, identity bind, public social records,
 * federation modes, and legal-hold AT URI fields.
 */

export type CommunityFederationMode = "disabled" | "local-only" | "federated";

export type AtRecord = {
  readonly uri: string;
  readonly cid: string;
  readonly did: string;
  readonly collection: string;
  readonly rkey: string;
  readonly value: Record<string, unknown>;
  readonly createdAt: string;
};

export type AtIdentity = {
  readonly did: string;
  readonly handle: string;
  readonly pdsEndpoint: string;
  readonly epochAuthorId?: string;
};

/** Lexicon collection NSIDs (Epoch-native). */
export const EpochLexicon = {
  profile: "org.epoch.actor.profile",
  follow: "org.epoch.graph.follow",
  star: "org.epoch.feed.star",
  repo: "org.epoch.repo",
  issue: "org.epoch.issue",
  issueComment: "org.epoch.issue.comment",
  proposal: "org.epoch.proposal",
  proposalReview: "org.epoch.proposal.review",
} as const;

export class FeatureDisabledError extends Error {
  readonly code = "feature_disabled" as const;
  constructor(message = "Community federation is disabled") {
    super(message);
    this.name = "FeatureDisabledError";
  }
}

export class PrivatePublishError extends Error {
  readonly code = "private_publish_forbidden" as const;
  constructor(message = "Private content cannot be published as public AT records") {
    super(message);
    this.name = "PrivatePublishError";
  }
}

export interface PdsTransport {
  createRecord(input: {
    did: string;
    collection: string;
    rkey?: string;
    record: Record<string, unknown>;
  }): Promise<AtRecord>;
  listRecords(did: string, collection: string): Promise<readonly AtRecord[]>;
  getRecord(uri: string): Promise<AtRecord | undefined>;
  deleteRecord(uri: string): Promise<void>;
}

/** In-process mock PDS for tests and local federated mode. */
export class MockPds implements PdsTransport {
  readonly #records = new Map<string, AtRecord>();
  #seq = 0;

  async createRecord(input: {
    did: string;
    collection: string;
    rkey?: string;
    record: Record<string, unknown>;
  }): Promise<AtRecord> {
    this.#seq += 1;
    const rkey = input.rkey ?? `r${this.#seq.toString(36)}`;
    const uri = `at://${input.did}/${input.collection}/${rkey}`;
    const value = { ...input.record, $type: input.collection };
    const rec: AtRecord = {
      uri,
      cid: `bafy${this.#seq.toString(16).padStart(8, "0")}`,
      did: input.did,
      collection: input.collection,
      rkey,
      value,
      createdAt: new Date().toISOString(),
    };
    this.#records.set(uri, rec);
    return rec;
  }

  async listRecords(did: string, collection: string): Promise<readonly AtRecord[]> {
    return [...this.#records.values()].filter(
      (r) => r.did === did && r.collection === collection,
    );
  }

  async getRecord(uri: string): Promise<AtRecord | undefined> {
    return this.#records.get(uri);
  }

  async deleteRecord(uri: string): Promise<void> {
    this.#records.delete(uri);
  }

  /** All records (AppView projection). */
  allRecords(): readonly AtRecord[] {
    return [...this.#records.values()];
  }
}

export interface FederatedCommunityOptions {
  readonly mode?: CommunityFederationMode;
  readonly pds?: PdsTransport;
  readonly gitCloneBaseUrl?: string;
  readonly epochSyncBaseUrl?: string;
}

export type PublicRepoCard = {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: "public" | "private" | "unlisted";
  readonly ownerDid?: string;
  readonly gitCloneUrl?: string;
  readonly epochSyncUrl?: string;
  readonly atUri?: string;
  readonly topics: readonly string[];
};

export type FederatedIssue = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly authorDid: string;
  readonly repoSlug: string;
  readonly visibility: "public" | "private";
  readonly atUri?: string;
  readonly intentRef?: string;
  readonly comments: readonly { authorDid: string; body: string; atUri?: string }[];
};

export type FederatedProposal = {
  readonly id: string;
  readonly title: string;
  readonly authorDid: string;
  readonly repoSlug: string;
  readonly intentRef?: string;
  readonly atUri?: string;
  readonly reviews: readonly { reviewerDid: string; decision: string; body: string; atUri?: string }[];
};

export type LegalHoldExport = {
  readonly exportedAt: string;
  readonly mode: CommunityFederationMode;
  readonly atUris: readonly string[];
  readonly records: readonly AtRecord[];
};

/**
 * Community federation service: disabled / local-only / federated with a single
 * write gate that never publishes private objects to AT.
 */
export class FederatedCommunity {
  #mode: CommunityFederationMode;
  readonly #pds: PdsTransport;
  readonly #gitCloneBaseUrl: string;
  readonly #epochSyncBaseUrl: string;
  readonly #identities = new Map<string, AtIdentity>();
  readonly #localFollows: { followerDid: string; subject: string }[] = [];
  readonly #localStars: { did: string; repoSlug: string }[] = [];
  readonly #localProfiles = new Map<string, Record<string, unknown>>();
  readonly #repos = new Map<string, PublicRepoCard>();
  readonly #issues = new Map<string, FederatedIssue>();
  readonly #proposals = new Map<string, FederatedProposal>();
  readonly #moderationReports: {
    id: string;
    targetUri?: string;
    reason: string;
    atUris: string[];
  }[] = [];

  constructor(options: FederatedCommunityOptions = {}) {
    this.#mode = options.mode ?? "local-only";
    this.#pds = options.pds ?? new MockPds();
    this.#gitCloneBaseUrl = options.gitCloneBaseUrl ?? "http://127.0.0.1:0/epoch.git";
    this.#epochSyncBaseUrl = options.epochSyncBaseUrl ?? "epoch://local/sync";
  }

  get mode(): CommunityFederationMode {
    return this.#mode;
  }

  setMode(mode: CommunityFederationMode): void {
    this.#mode = mode;
  }

  #requireEnabled(): void {
    if (this.#mode === "disabled") {
      throw new FeatureDisabledError();
    }
  }

  #requirePublic(visibility: string, kind: string): void {
    if (visibility !== "public") {
      throw new PrivatePublishError(`Cannot federate ${kind} with visibility=${visibility}`);
    }
  }

  bindIdentity(identity: AtIdentity): AtIdentity {
    this.#requireEnabled();
    this.#identities.set(identity.did, identity);
    return identity;
  }

  getIdentity(did: string): AtIdentity | undefined {
    return this.#identities.get(did);
  }

  async putProfile(input: {
    did: string;
    displayName: string;
    bio?: string;
    links?: readonly string[];
  }): Promise<{ local: Record<string, unknown>; atUri?: string }> {
    this.#requireEnabled();
    const value = {
      displayName: input.displayName,
      bio: input.bio ?? "",
      links: [...(input.links ?? [])],
      createdAt: new Date().toISOString(),
    };
    this.#localProfiles.set(input.did, value);
    if (this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.did,
        collection: EpochLexicon.profile,
        rkey: "self",
        record: value,
      });
      return { local: value, atUri: rec.uri };
    }
    return { local: value };
  }

  async follow(input: { followerDid: string; subject: string }): Promise<{ atUri?: string }> {
    this.#requireEnabled();
    this.#localFollows.push({ followerDid: input.followerDid, subject: input.subject });
    if (this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.followerDid,
        collection: EpochLexicon.follow,
        record: { subject: input.subject, createdAt: new Date().toISOString() },
      });
      return { atUri: rec.uri };
    }
    return {};
  }

  async star(input: { did: string; repoSlug: string }): Promise<{ atUri?: string }> {
    this.#requireEnabled();
    this.#localStars.push({ did: input.did, repoSlug: input.repoSlug });
    if (this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.did,
        collection: EpochLexicon.star,
        record: { subject: input.repoSlug, createdAt: new Date().toISOString() },
      });
      return { atUri: rec.uri };
    }
    return {};
  }

  /**
   * Publish a public repo card. Private/unlisted fail closed on federated write.
   * gitCloneUrl is always set for public cards from the configured serve base.
   */
  async publishRepo(input: {
    slug: string;
    name: string;
    description: string;
    visibility: "public" | "private" | "unlisted";
    ownerDid: string;
    topics?: readonly string[];
  }): Promise<PublicRepoCard> {
    this.#requireEnabled();
    const gitCloneUrl = `${this.#gitCloneBaseUrl.replace(/\/$/, "")}`;
    const epochSyncUrl = `${this.#epochSyncBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(input.slug)}`;
    const card: PublicRepoCard = {
      slug: input.slug,
      name: input.name,
      description: input.description,
      visibility: input.visibility,
      ownerDid: input.ownerDid,
      topics: [...(input.topics ?? [])],
      gitCloneUrl: input.visibility === "public" ? gitCloneUrl : undefined,
      epochSyncUrl: input.visibility === "public" ? epochSyncUrl : undefined,
    };

    if (input.visibility === "public" && this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.ownerDid,
        collection: EpochLexicon.repo,
        rkey: input.slug.replace(/[^a-zA-Z0-9._-]/g, "-"),
        record: {
          name: input.name,
          description: input.description,
          gitCloneUrl,
          epochSyncUrl,
          topics: card.topics,
          createdAt: new Date().toISOString(),
        },
      });
      const published = { ...card, atUri: rec.uri };
      this.#repos.set(input.slug, published);
      return published;
    }

    if (input.visibility !== "public" && this.#mode === "federated") {
      // Explicit fail-closed if caller tries to federate private.
      this.#requirePublic(input.visibility, "repository");
    }

    this.#repos.set(input.slug, card);
    return card;
  }

  /** Attempt to force-publish private content — must throw PrivatePublishError. */
  async publishPrivateAsPublic(input: {
    did: string;
    kind: "repository" | "issue";
    visibility: "private" | "unlisted";
    payload: Record<string, unknown>;
  }): Promise<never> {
    this.#requireEnabled();
    this.#requirePublic(input.visibility, input.kind);
    throw new Error("unreachable");
  }

  async openIssue(input: {
    id?: string;
    repoSlug: string;
    title: string;
    body?: string;
    authorDid: string;
    visibility: "public" | "private";
    intentRef?: string;
  }): Promise<FederatedIssue> {
    this.#requireEnabled();
    const id = input.id ?? `ISSUE-${this.#issues.size + 1}`;
    const issue: FederatedIssue = {
      id,
      title: input.title,
      body: input.body ?? "",
      authorDid: input.authorDid,
      repoSlug: input.repoSlug,
      visibility: input.visibility,
      intentRef: input.intentRef,
      comments: [],
    };

    if (input.visibility === "public" && this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.authorDid,
        collection: EpochLexicon.issue,
        record: {
          repo: input.repoSlug,
          title: input.title,
          body: issue.body,
          intentRef: input.intentRef,
          createdAt: new Date().toISOString(),
        },
      });
      const published = { ...issue, atUri: rec.uri };
      this.#issues.set(id, published);
      return published;
    }

    if (input.visibility !== "public" && this.#mode === "federated") {
      // Storing private issues locally is OK; federating is not.
      this.#issues.set(id, issue);
      return issue;
    }

    this.#issues.set(id, issue);
    return issue;
  }

  async commentOnIssue(input: {
    issueId: string;
    authorDid: string;
    body: string;
  }): Promise<FederatedIssue> {
    this.#requireEnabled();
    const current = this.#issues.get(input.issueId);
    if (current === undefined) throw new Error(`Issue not found: ${input.issueId}`);

    let atUri: string | undefined;
    if (current.visibility === "public" && this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.authorDid,
        collection: EpochLexicon.issueComment,
        record: {
          issue: current.atUri ?? current.id,
          body: input.body,
          createdAt: new Date().toISOString(),
        },
      });
      atUri = rec.uri;
    }

    const updated: FederatedIssue = {
      ...current,
      comments: [...current.comments, { authorDid: input.authorDid, body: input.body, atUri }],
    };
    this.#issues.set(input.issueId, updated);
    return updated;
  }

  async proposeChange(input: {
    id?: string;
    repoSlug: string;
    title: string;
    authorDid: string;
    intentRef?: string;
    visibility?: "public" | "private";
  }): Promise<FederatedProposal> {
    this.#requireEnabled();
    const visibility = input.visibility ?? "public";
    const id = input.id ?? `CHANGE-${this.#proposals.size + 1}`;
    const proposal: FederatedProposal = {
      id,
      title: input.title,
      authorDid: input.authorDid,
      repoSlug: input.repoSlug,
      intentRef: input.intentRef,
      reviews: [],
    };

    if (visibility === "public" && this.#mode === "federated") {
      const rec = await this.#pds.createRecord({
        did: input.authorDid,
        collection: EpochLexicon.proposal,
        record: {
          repo: input.repoSlug,
          title: input.title,
          intentRef: input.intentRef,
          createdAt: new Date().toISOString(),
        },
      });
      const published = { ...proposal, atUri: rec.uri };
      this.#proposals.set(id, published);
      return published;
    }

    if (visibility !== "public") {
      // private proposals stay local only
      this.#proposals.set(id, proposal);
      return proposal;
    }

    this.#proposals.set(id, proposal);
    return proposal;
  }

  async reviewProposal(input: {
    proposalId: string;
    reviewerDid: string;
    decision: string;
    body?: string;
  }): Promise<FederatedProposal> {
    this.#requireEnabled();
    const current = this.#proposals.get(input.proposalId);
    if (current === undefined) throw new Error(`Proposal not found: ${input.proposalId}`);

    let atUri: string | undefined;
    if (this.#mode === "federated" && current.atUri) {
      const rec = await this.#pds.createRecord({
        did: input.reviewerDid,
        collection: EpochLexicon.proposalReview,
        record: {
          proposal: current.atUri,
          decision: input.decision,
          body: input.body ?? "",
          createdAt: new Date().toISOString(),
        },
      });
      atUri = rec.uri;
    }

    const updated: FederatedProposal = {
      ...current,
      reviews: [
        ...current.reviews,
        {
          reviewerDid: input.reviewerDid,
          decision: input.decision,
          body: input.body ?? "",
          atUri,
        },
      ],
    };
    this.#proposals.set(input.proposalId, updated);
    return updated;
  }

  fileModerationReport(input: {
    reason: string;
    targetUri?: string;
    relatedAtUris?: readonly string[];
  }): { id: string; atUris: readonly string[] } {
    this.#requireEnabled();
    const atUris = [
      ...(input.targetUri ? [input.targetUri] : []),
      ...(input.relatedAtUris ?? []),
    ];
    const id = `report-${this.#moderationReports.length + 1}`;
    this.#moderationReports.push({ id, targetUri: input.targetUri, reason: input.reason, atUris });
    return { id, atUris };
  }

  legalHoldExport(): LegalHoldExport {
    this.#requireEnabled();
    const records =
      this.#pds instanceof MockPds
        ? this.#pds.allRecords()
        : [];
    const atUris = [
      ...records.map((r) => r.uri),
      ...this.#moderationReports.flatMap((r) => r.atUris),
      ...[...this.#repos.values()].map((r) => r.atUri).filter((u): u is string => u !== undefined),
      ...[...this.#issues.values()].map((i) => i.atUri).filter((u): u is string => u !== undefined),
      ...[...this.#proposals.values()].map((p) => p.atUri).filter((u): u is string => u !== undefined),
    ];
    return {
      exportedAt: new Date().toISOString(),
      mode: this.#mode,
      atUris: [...new Set(atUris)],
      records: [...records],
    };
  }

  getRepo(slug: string): PublicRepoCard | undefined {
    return this.#repos.get(slug);
  }

  listStars(): readonly { did: string; repoSlug: string }[] {
    return [...this.#localStars];
  }

  listFollows(): readonly { followerDid: string; subject: string }[] {
    return [...this.#localFollows];
  }

  /** AppView-style projection over mock PDS public records. */
  appViewTimeline(): readonly AtRecord[] {
    if (this.#mode !== "federated") return [];
    if (this.#pds instanceof MockPds) return this.#pds.allRecords();
    return [];
  }
}
