import type { CommunityRepository } from "@epoch/community-core";
import type { CommunitySpace } from "./types";
import { defaultSocialChannels, defaultWorkChannels } from "./channels";

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
        { id: "general", label: "general", kind: "social", topic: "Agent operators and reviewers hang out here." },
        { id: "showcase", label: "showcase", kind: "social", topic: "Show agent runs, traces, and demos." },
        { id: "agent-runs", label: "agent-runs", kind: "work", topic: "Active agent runs awaiting human review." },
        { id: "ideas", label: "ideas", kind: "work", topic: "Agent product ideas promoted toward signed intents." },
        { id: "governance", label: "governance", kind: "work", topic: "Agent policy, hold, and witness discussion." },
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
