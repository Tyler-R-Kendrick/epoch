import type { CommunityRepository } from "@epoch/community-core";
import type { CommunitySpace } from "./types";
import { defaultSocialChannels, defaultWorkChannels, deriveChannel } from "./channels";

/**
 * Build first-class communities (Discord servers analog).
 * Channels belong to the community; repositories are linked projects.
 */
export function buildCommunitySpaces(
  repositories: readonly CommunityRepository[],
): readonly CommunitySpace[] {
  const slugs = repositories.map((repo) => repo.slug);
  const primary = slugs[0] ?? "epoch/epoch";
  const secondary = slugs[1];
  return [
    {
      id: "epoch-civic",
      name: "Epoch Civic Workshop",
      slug: "epoch-civic",
      description: "Signed civic hangout for maintainers, contributors, and agents — community channels first, linked repos second.",
      channels: [...defaultSocialChannels, ...defaultWorkChannels],
      linkedRepos: secondary ? [primary, secondary] : [primary],
    },
    {
      id: "agent-guild",
      name: "Agent Guild",
      slug: "agent-guild",
      description: "Community for policy-bound agents, human review culture, and agent-run showcases.",
      channels: [
        deriveChannel("general", {
          topic: "Agent operators and reviewers hang out here.",
          emptyTitle: "No messages in #general yet.",
          emptyAction: "Introduce yourself and the agents you operate.",
        }),
        deriveChannel("showcase", {
          topic: "Show agent runs, traces, and demos.",
          emptyTitle: "No agent runs shown yet.",
          emptyAction: "Post a run, a trace, or a demo.",
        }),
        deriveChannel("agent-runs", {
          topic: "Active agent runs awaiting human review.",
          emptyTitle: "No runs awaiting review.",
          emptyAction: "Requested agent work lands here for human review.",
        }),
        deriveChannel("ideas", {
          topic: "Agent product ideas promoted toward signed intents.",
          emptyTitle: "No agent ideas yet.",
          emptyAction: "Propose one — it can become a signed intent.",
        }),
        deriveChannel("governance", {
          topic: "Agent policy, hold, and witness discussion.",
          emptyTitle: "No policy records yet.",
          emptyAction: "Agent policy, holds, and witness decisions are recorded here.",
        }),
      ],
      linkedRepos: [primary],
    },
  ];
}

export function defaultCommunityIdForRepo(
  spaces: readonly CommunitySpace[],
  repoSlug: string,
): string {
  const match = spaces.find((space) => space.linkedRepos.includes(repoSlug));
  return match?.id ?? spaces[0]?.id ?? "epoch-civic";
}
