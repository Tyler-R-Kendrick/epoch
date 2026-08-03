import type { CommunityRepository } from "@epoch/community-core";
import type {
  BuildCommunityFeedOptions,
  CommunityConversationView,
  CommunityFeedBuildResult,
  CommunityFeedSource,
  CommunitySpace,
} from "./types";
import { channelForIssue } from "./channels";
import { buildCommunitySpaces, defaultCommunityIdForRepo } from "./spaces";

/**
 * Build the repository channel feed from API-backed repository state when connected and
 * non-empty; otherwise fall back to an explicitly labeled snapshot demo feed.
 * Live connected mode never mixes hard-coded demos into product activity.
 */
export function buildCommunityFeed(options: BuildCommunityFeedOptions): CommunityFeedBuildResult {
  const issues = options.repositories.flatMap((repo) =>
    repo.issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      author: issue.author,
      status: issue.status,
      labels: issue.labels,
      repositorySlug: repo.slug,
      channel: channelForIssue(issue.labels),
    })),
  );
  const changes = options.repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      author: proposal.author,
      status: proposal.status,
      sourceView: proposal.sourceView,
      targetView: proposal.targetView,
      repositorySlug: repo.slug,
    })),
  );
  const hasApiActivity = issues.length > 0 || changes.length > 0;

  const spaces = buildCommunitySpaces(options.repositories);
  if (options.apiConnected && hasApiActivity) {
    return {
      source: "api",
      conversations: [
        ...communitySocialConversations(spaces, "api"),
        ...agentMemberConversations(spaces, options.repositories[0]?.slug ?? "epoch/epoch", "api"),
        ...apiIssueConversations(options.repositories),
        ...apiProposalConversations(options.repositories),
      ],
      issues,
      changes,
    };
  }

  const repository = options.repositories[0];
  return {
    source: "snapshot",
    conversations: [
      ...communitySocialConversations(spaces, "snapshot"),
      ...agentMemberConversations(spaces, repository?.slug ?? "epoch/epoch", "snapshot"),
      ...snapshotConversations(repository),
    ],
    issues,
    changes,
  };
}

/** Buzz-aligned multi-agent handoff samples (member agents, harness, intent receipts). */
function agentMemberConversations(
  spaces: readonly CommunitySpace[],
  slug: string,
  source: CommunityFeedSource,
): readonly CommunityConversationView[] {
  const communityId = spaces[0]?.id ?? "epoch-civic";
  const guildId = spaces.find((space) => space.id === "agent-guild")?.id ?? communityId;
  return [
    {
      id: "agent-handoff-scout",
      channel: "agent-runs",
      communityId,
      repositorySlug: slug,
      author: "scout",
      role: "agent",
      title: "Scout: incident memory pass for install-cache failures",
      body: "@patcher I searched six months of #support + linked issues. Root themes: stale sandbox resume, cache path drift after view switch. Draft plan posted; waiting for scoped implementation.",
      time: "10:01",
      anchor: "agent-run://scout/201",
      signature: "sig:agent-scout-201",
      visibility: "community",
      state: "handoff",
      reactions: ["receipts"],
      linkedArtifact: "intent://install-cache-hardening",
      source,
      harness: "goose",
      managedBy: "lea",
      intentId: "intent-install-cache",
      artifactCard: "Intent · install-cache-hardening",
    },
    {
      id: "agent-handoff-patcher",
      channel: "agent-runs",
      communityId,
      repositorySlug: slug,
      author: "patcher",
      role: "agent",
      title: "Patcher: draft PR for install-cache hardening",
      body: "@scout plan accepted under policy. Opened a draft change with tests only; @maya human review still required before promote.",
      time: "10:02",
      anchor: "agent-run://patcher/202",
      signature: "sig:agent-patcher-202",
      visibility: "community",
      state: "needs review",
      reactions: ["tests passed"],
      linkedArtifact: "change://install-cache-hardening",
      linkedProposalId: "CHANGE-install-cache",
      source,
      harness: "codex",
      managedBy: "maya",
      intentId: "intent-install-cache",
      artifactCard: "Epoch · draft change CHANGE-install-cache",
    },
    {
      id: "agent-preview-copy",
      channel: "agent-runs",
      communityId: guildId,
      repositorySlug: slug,
      author: "ui-reviewer",
      role: "agent",
      title: "ui-reviewer drafted copy cleanup for preview card",
      body: "Policy allows copy and test updates only. Human review is still required before merge. Intent linked for receipts.",
      time: "10:03",
      anchor: "agent-run://ui-reviewer/173",
      signature: "sig:agent-173",
      visibility: "maintainers",
      state: "needs review",
      reactions: ["tests passed"],
      linkedArtifact: "preview-173",
      source,
      harness: "claude-code",
      managedBy: "maya",
      intentId: "intent-preview-copy",
      artifactCard: "Intent · preview-copy-cleanup",
    },
  ];
}

function apiIssueConversations(
  repositories: readonly CommunityRepository[],
): readonly CommunityConversationView[] {
  const spaces = buildCommunitySpaces(repositories);
  return repositories.flatMap((repo) =>
    repo.issues.map((issue) => ({
      id: `issue-${issue.id}`,
      channel: channelForIssue(issue.labels),
      communityId: defaultCommunityIdForRepo(spaces, repo.slug),
      repositorySlug: repo.slug,
      author: issue.author,
      role: "contributor",
      title: issue.title,
      body: issue.body.length === 0 ? "Can someone help confirm the next step?" : issue.body,
      time: "10:12",
      anchor: `issue:${issue.id}`,
      signature: `sig:${issue.id.toLowerCase()}`,
      visibility: "community",
      state: issue.status,
      reactions: ["reply", "follow"],
      source: "api" as const,
    })),
  );
}

function apiProposalConversations(
  repositories: readonly CommunityRepository[],
): readonly CommunityConversationView[] {
  const spaces = buildCommunitySpaces(repositories);
  return repositories.flatMap((repo) =>
    repo.changeProposals.map((proposal) => ({
      id: `change-${proposal.id}`,
      channel: "previews" as const,
      communityId: defaultCommunityIdForRepo(spaces, repo.slug),
      repositorySlug: repo.slug,
      author: proposal.author,
      role: "contributor",
      title: proposal.title,
      body: proposal.body.length === 0 ? `${proposal.sourceView} -> ${proposal.targetView}` : proposal.body,
      time: "10:28",
      anchor: `change:${proposal.id}`,
      signature: `sig:${proposal.id.toLowerCase()}`,
      visibility: "community",
      state: proposal.status,
      reactions: ["review", "preview"],
      linkedArtifact: proposal.sourceView,
      linkedProposalId: proposal.id,
      source: "api" as const,
    })),
  );
}

/** Social community messages that do not require a repository (Discord #general / #showcase). */
function communitySocialConversations(
  spaces: readonly CommunitySpace[],
  source: CommunityFeedSource,
): readonly CommunityConversationView[] {
  return spaces.flatMap((space) => {
    const items: CommunityConversationView[] = [];
    if (space.channels.some((channel) => channel.id === "general")) {
      items.push({
        id: `${space.id}-general-welcome`,
        channel: "general",
        communityId: space.id,
        author: "maya",
        role: "maintainer",
        title: `Welcome to ${space.name}`,
        body: "This channel is the community hangout — no repository required. Link a project only when conversation becomes signed work.",
        time: "09:05",
        anchor: `community://${space.slug}/general`,
        signature: `sig:${space.slug}-welcome`,
        visibility: "community",
        state: "open",
        reactions: ["wave", "follow"],
        source,
      });
    }
    if (space.channels.some((channel) => channel.id === "showcase")) {
      items.push({
        id: `${space.id}-showcase-demo`,
        channel: "showcase",
        communityId: space.id,
        author: "lea",
        role: "contributor",
        title: "Shipped a calmer dual-plane shell",
        body: "Community channels first, linked repos second. Dropping a preview for folks hanging out here.",
        time: "11:22",
        anchor: `community://${space.slug}/showcase`,
        signature: `sig:${space.slug}-showcase`,
        visibility: "community",
        state: "open",
        reactions: ["nice", "follow"],
        source,
      });
    }
    return items;
  });
}

function snapshotConversations(
  repository: CommunityRepository | undefined,
): readonly CommunityConversationView[] {
  const slug = repository?.slug ?? "epoch/epoch";
  const maintainer = repository?.maintainers[0] ?? "maya";
  const communityId = "epoch-civic";
  return [
    {
      id: "idea-region-revenue",
      channel: "ideas",
      communityId,
      repositorySlug: slug,
      author: "nora",
      role: "contributor",
      title: "Dashboard widget should group revenue by region",
      body: "The current widget answers total revenue, but support threads keep asking which region changed. Could this become a small widget setting instead of a separate report?",
      time: "09:41",
      anchor: "app://dashboard/widgets/revenue",
      signature: "sig:8f2a-region",
      visibility: "community",
      state: "discussion",
      reactions: ["7 useful", "3 follow"],
      source: "snapshot",
    },
    {
      id: "support-install-cache",
      channel: "support",
      communityId,
      repositorySlug: slug,
      author: "liam",
      role: "newcomer",
      title: "Install cache fails after switching views",
      body: "I can reproduce this after resuming a stale sandbox. The accepted answer should probably become a troubleshooting note.",
      time: "09:58",
      anchor: "docs://support/install-cache",
      signature: "sig:42ab-cache",
      visibility: "community",
      state: "answerable",
      reactions: ["4 same issue"],
      source: "snapshot",
    },
    {
      id: "preview-region-widget",
      channel: "previews",
      communityId,
      repositorySlug: slug,
      author: maintainer,
      role: "maintainer",
      title: "Preview is ready for the region widget",
      body: "The preview renders the chart setting and keeps the old total view as default. Please test keyboard navigation before approval.",
      time: "10:19",
      anchor: "preview://region-widget",
      signature: "sig:preview-91c",
      visibility: "community",
      state: "review",
      reactions: ["open preview", "a11y"],
      linkedArtifact: "deploy-preview-91c",
      source: "snapshot",
    },
    {
      id: "governance-release-witnesses",
      channel: "governance",
      communityId,
      repositorySlug: slug,
      author: "samira",
      role: "security",
      title: "Release needs two witness signatures",
      body: "The release is blocked until the maintainer signature and CI witness agree on the exported artifact hash.",
      time: "10:31",
      anchor: "release://0.1.0",
      signature: "sig:release-witness",
      visibility: "maintainers",
      state: "blocked",
      reactions: ["legal hold available"],
      source: "snapshot",
    },
  ];
}
