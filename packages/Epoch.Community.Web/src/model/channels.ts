import type { CommunityAgentMember, CommunityChannel, CommunityChannelId } from "./types";

export const defaultWorkChannels: readonly CommunityChannel[] = [
  { id: "support", label: "support", kind: "work", topic: "Get unstuck, accept answers, and turn repeated help into docs patches." },
  { id: "ideas", label: "ideas", kind: "work", topic: "Shape product ideas into signed intents, previews, and reviewable patches." },
  { id: "bugs", label: "bugs", kind: "work", topic: "Reproduce defects and connect reports to patches without losing context." },
  { id: "agent-runs", label: "agent-runs", kind: "work", topic: "Watch policy-bound agents propose work while humans keep merge authority." },
  { id: "previews", label: "previews", kind: "work", topic: "Review deploy previews, visual results, and release readiness in one thread." },
  { id: "governance", label: "governance", kind: "work", topic: "Handle moderation, legal hold, witnesses, and signed release trust." },
];

export const defaultSocialChannels: readonly CommunityChannel[] = [
  { id: "general", label: "general", kind: "social", topic: "Day-to-day community hangout — independent of any single repository." },
  { id: "showcase", label: "showcase", kind: "social", topic: "Share demos, screenshots, and wins with the community." },
];

export const defaultCommunityAgents: readonly CommunityAgentMember[] = [
  {
    id: "agent-ui-reviewer",
    displayName: "ui-reviewer",
    harness: "claude-code",
    managedBy: "maya",
    scope: "copy + tests only",
    status: "needs-review",
    sessionKind: "sample",
    communityIds: ["epoch-civic", "agent-guild"],
  },
  {
    id: "agent-scout",
    displayName: "scout",
    harness: "goose",
    managedBy: "lea",
    scope: "read history + draft plans",
    status: "working",
    sessionKind: "sample",
    communityIds: ["epoch-civic", "agent-guild"],
  },
  {
    id: "agent-patcher",
    displayName: "patcher",
    harness: "codex",
    managedBy: "maya",
    scope: "open draft PRs under policy",
    status: "idle",
    sessionKind: "sample",
    communityIds: ["agent-guild", "epoch-civic"],
  },
];

/**
 * Map issue labels onto channel-first surfaces.
 * idea → ideas, bug → bugs, agent → agent-runs, moderation → governance,
 * preview → previews, general → general; default support.
 * Single source for server render and the compiled client runtime — the union of
 * what the two drifted copies handled (client added preview/general/moderation).
 */
export function channelForIssue(labels: readonly string[]): CommunityChannelId {
  const normalized = labels.map((label) => label.toLowerCase());
  if (normalized.includes("idea") || normalized.includes("ideas")) {
    return "ideas";
  }
  if (normalized.includes("bug") || normalized.includes("bugs")) {
    return "bugs";
  }
  if (normalized.includes("agent") || normalized.includes("agent-run")) {
    return "agent-runs";
  }
  if (normalized.includes("governance") || normalized.includes("security") || normalized.includes("moderation")) {
    return "governance";
  }
  if (normalized.includes("preview") || normalized.includes("previews")) {
    return "previews";
  }
  if (normalized.includes("showcase") || normalized.includes("demo")) {
    return "showcase";
  }
  if (normalized.includes("general")) {
    return "general";
  }
  return "support";
}
