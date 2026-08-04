import type { CommunityRepository } from "@epoch/community-core";
import type {
  BuildCommunityFeedOptions,
  CommunityFeedSource,
  DevFeedBuildResult,
  DevFeedItem,
  DevFeedTab,
} from "./types";
import { channelForIssue } from "./channels";
import { buildCommunityFeed } from "./feed";

/**
 * Build the network Dev Feed (ATProto-style contribution timeline).
 * Combines repository activity with social graph verbs (follow/star/create/release).
 * When API-connected with activity, contribution events are live; social verbs may
 * still include an honest snapshot/AT sample so the network plane is never empty-looking
 * without labeling.
 */
export function buildDevFeed(options: BuildCommunityFeedOptions): DevFeedBuildResult {
  const repoFeed = buildCommunityFeed(options);
  const contributionItems = contributionDevFeedItems(options.repositories, repoFeed.source);
  const socialItems = socialDevFeedItems(options.repositories, repoFeed.source);
  const items = [...socialItems, ...contributionItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return {
    source: repoFeed.source,
    items,
    followingHandles: ["maya", "nora", "lea", "ren", "sam"],
  };
}

export function filterDevFeedItems(
  items: readonly DevFeedItem[],
  tab: DevFeedTab,
): readonly DevFeedItem[] {
  return items.filter((item) => item.tabs.includes(tab));
}

function contributionDevFeedItems(
  repositories: readonly CommunityRepository[],
  source: CommunityFeedSource,
): readonly DevFeedItem[] {
  const issueItems = repositories.flatMap((repo) =>
    repo.issues.map((issue, index) => ({
      id: `dev-issue-${repo.slug}-${issue.id}`,
      kind: "issue_open" as const,
      actor: { handle: issue.author, role: "contributor" },
      verb: "opened",
      object: { type: "issue" as const, label: `${issue.id}: ${issue.title}`, hrefHint: issue.id },
      body: issue.body.slice(0, 180) || undefined,
      repoSlug: repo.slug,
      channelHint: channelForIssue(issue.labels),
      trust: {
        sig: `sig:${issue.id.toLowerCase()}`,
        anchor: `issue:${issue.id}`,
        atUri: source === "api" ? `at://did:plc:demo/org.epoch.issue/${issue.id}` : undefined,
        source: source === "api" ? "api" as const : "snapshot" as const,
      },
      createdAt: `2026-08-01T1${index % 6}:1${index % 9}:00Z`,
      tabs: ["following", "network", "contributions"] as const,
    })),
  );
  const proposalItems = repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal, index) => ({
      id: `dev-change-${repo.slug}-${proposal.id}`,
      kind: "proposal" as const,
      actor: { handle: proposal.author, role: "contributor" },
      verb: "proposed",
      object: { type: "proposal" as const, label: `${proposal.id}: ${proposal.title}`, hrefHint: proposal.id },
      body: proposal.body.slice(0, 180) || undefined,
      repoSlug: repo.slug,
      channelHint: "previews" as const,
      trust: {
        sig: `sig:${proposal.id.toLowerCase()}`,
        anchor: `change:${proposal.id}`,
        atUri: source === "api" ? `at://did:plc:demo/org.epoch.proposal/${proposal.id}` : undefined,
        source: source === "api" ? "api" as const : "snapshot" as const,
      },
      createdAt: `2026-08-01T1${(index + 2) % 6}:2${index % 9}:00Z`,
      tabs: ["following", "network", "contributions"] as const,
    })),
  );
  const agentItems = repositories.flatMap((repo) =>
    repo.issues
      .filter((issue) => issue.labels.some((label) => label.toLowerCase().includes("agent")))
      .map((issue, index) => ({
        id: `dev-agent-${repo.slug}-${issue.id}`,
        kind: "agent_run" as const,
        actor: { handle: "agent-ui-reviewer", role: "agent" },
        verb: "posted a run for",
        object: { type: "issue" as const, label: issue.id, hrefHint: issue.id },
        body: "Policy-bound agent work requires human review before merge.",
        repoSlug: repo.slug,
        channelHint: "agent-runs" as const,
        trust: {
          sig: `sig:agent-${issue.id.toLowerCase()}`,
          anchor: `agent-run://${issue.id}`,
          source: source === "api" ? "api" as const : "snapshot" as const,
        },
        createdAt: `2026-08-01T12:${30 + index}:00Z`,
        tabs: ["network", "contributions"] as const,
      })),
  );
  return [...issueItems, ...proposalItems, ...agentItems];
}

function socialDevFeedItems(
  repositories: readonly CommunityRepository[],
  source: CommunityFeedSource,
): readonly DevFeedItem[] {
  const primary = repositories[0]?.slug ?? "epoch/epoch";
  const secondary = repositories[1]?.slug ?? "epoch/community-kit";
  const trustSource = source === "api" ? "atproto" as const : "snapshot" as const;
  return [
    {
      id: "dev-star-lea-epoch",
      kind: "star",
      actor: { handle: "lea", did: "did:plc:lea", role: "contributor" },
      verb: "starred",
      object: { type: "repo", label: primary },
      repoSlug: primary,
      trust: {
        sig: "sig:star-lea",
        atUri: "at://did:plc:lea/org.epoch.feed.star/1",
        source: trustSource,
      },
      createdAt: "2026-08-01T14:20:00Z",
      tabs: ["following", "network"],
    },
    {
      id: "dev-follow-maya-nora",
      kind: "follow",
      actor: { handle: "maya", did: "did:plc:maya", role: "maintainer" },
      verb: "followed",
      object: { type: "actor", label: "@nora" },
      trust: {
        atUri: "at://did:plc:maya/org.epoch.graph.follow/nora",
        source: trustSource,
      },
      createdAt: "2026-08-01T14:05:00Z",
      tabs: ["following", "network"],
    },
    {
      id: "dev-create-maya-epoch",
      kind: "repo_create",
      actor: { handle: "maya", did: "did:plc:maya", role: "maintainer" },
      verb: "created",
      object: { type: "repo", label: primary },
      repoSlug: primary,
      body: "Event-driven DVCS for signed collaborative history.",
      trust: {
        sig: "sig:repo-create",
        atUri: "at://did:plc:maya/org.epoch.repo/epoch",
        source: trustSource,
      },
      createdAt: "2026-08-01T09:00:00Z",
      tabs: ["following", "network", "contributions"],
    },
    {
      id: "dev-release-maya",
      kind: "release",
      actor: { handle: "maya", did: "did:plc:maya", role: "maintainer" },
      verb: "released",
      object: { type: "release", label: "v0.2.0" },
      repoSlug: primary,
      body: "Signed artifacts with sha256 witnesses.",
      trust: {
        sig: "sig:release-0.2.0",
        anchor: "release://0.2.0",
        atUri: "at://did:plc:maya/org.epoch.release/0.2.0",
        source: trustSource,
      },
      createdAt: "2026-08-01T13:40:00Z",
      tabs: ["following", "network", "contributions"],
    },
    {
      id: "dev-star-sam-kit",
      kind: "star",
      actor: { handle: "sam", did: "did:plc:sam", role: "contributor" },
      verb: "starred",
      object: { type: "repo", label: secondary },
      repoSlug: secondary,
      trust: {
        atUri: "at://did:plc:sam/org.epoch.feed.star/kit",
        source: trustSource,
      },
      createdAt: "2026-08-01T13:10:00Z",
      tabs: ["network"],
    },
    {
      id: "dev-follow-ren-lea",
      kind: "follow",
      actor: { handle: "ren", did: "did:plc:ren", role: "contributor" },
      verb: "followed",
      object: { type: "actor", label: "@lea" },
      trust: {
        atUri: "at://did:plc:ren/org.epoch.graph.follow/lea",
        source: trustSource,
      },
      createdAt: "2026-08-01T12:50:00Z",
      tabs: ["network"],
    },
    {
      id: "dev-contribution-ren",
      kind: "contribution",
      actor: { handle: "ren", role: "contributor" },
      verb: "signed a contribution on",
      object: { type: "repo", label: primary },
      repoSlug: primary,
      body: "Patch event on preview keyboard focus.",
      trust: {
        sig: "sig:contrib-ren",
        anchor: "event://preview-focus",
        source: source === "api" ? "api" : "snapshot",
      },
      createdAt: "2026-08-01T12:15:00Z",
      tabs: ["following", "contributions"],
    },
  ];
}

export function formatFeedTime(iso: string): string {
  const hour = iso.slice(11, 16);
  return hour || "now";
}
