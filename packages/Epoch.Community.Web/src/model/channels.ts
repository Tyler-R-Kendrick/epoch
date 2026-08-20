import type { CommunityAgentMember, CommunityChannel, CommunityChannelId } from "./types";

export const defaultWorkChannels: readonly CommunityChannel[] = [
  {
    id: "support",
    label: "support",
    kind: "work",
    topic: "Questions and answers",
    emptyTitle: "No questions in #support yet.",
    emptyAction: "Ask what you are stuck on — accepted answers can become docs patches.",
  },
  {
    id: "ideas",
    label: "ideas",
    kind: "work",
    topic: "Ideas into signed Changes",
    emptyTitle: "No ideas in #ideas yet.",
    emptyAction: "Propose one — ideas here become signed Changes you can review.",
  },
  {
    id: "bugs",
    label: "bugs",
    kind: "work",
    topic: "Defect reports and patches",
    emptyTitle: "No reports in #bugs yet.",
    emptyAction: "Report what broke and how to reproduce it.",
  },
  {
    id: "agent-runs",
    label: "agent-runs",
    kind: "work",
    topic: "Agent-authored Changes, human merge",
    emptyTitle: "No agent runs in #agent-runs yet.",
    emptyAction: "Request an agent from a message to start one — you keep merge authority.",
  },
  {
    id: "previews",
    label: "previews",
    kind: "work",
    topic: "Deploy previews and release readiness",
    emptyTitle: "No previews in #previews yet.",
    emptyAction: "Promote a message to a change and its preview lands here.",
  },
  {
    id: "governance",
    label: "governance",
    kind: "work",
    topic: "Moderation, legal hold, release trust",
    emptyTitle: "No governance records in #governance yet.",
    emptyAction: "Reports, legal holds, and release trust decisions are recorded here.",
  },
];

export const defaultSocialChannels: readonly CommunityChannel[] = [
  {
    id: "general",
    label: "general",
    kind: "social",
    topic: "Community hangout",
    emptyTitle: "No messages in #general yet.",
    emptyAction: "Say hello — this hangout needs no repository.",
  },
  {
    id: "showcase",
    label: "showcase",
    kind: "social",
    topic: "Demos and wins",
    emptyTitle: "No ships in #showcase yet.",
    emptyAction: "Share what you are building.",
  },
];

/**
 * Derive a community-specific channel from the defaults.
 * Communities own their channels, so they may reword topic and empty copy —
 * but the shape stays single-sourced here rather than re-declared per space.
 */
export function deriveChannel(
  id: CommunityChannelId,
  overrides: Partial<Omit<CommunityChannel, "id">>,
): CommunityChannel {
  const base = [...defaultSocialChannels, ...defaultWorkChannels].find(
    (channel) => channel.id === id,
  );
  if (base === undefined) {
    throw new Error(`unknown channel id: ${id}`);
  }
  return { ...base, ...overrides };
}

/** Empty-state copy for a channel id, for surfaces that only carry the id. */
export function emptyCopyForChannel(
  channelId: CommunityChannelId,
) {
  const channel = [...defaultSocialChannels, ...defaultWorkChannels].find(
    (item) => item.id === channelId,
  );
  return {
    title: channel?.emptyTitle ?? "No messages in this channel yet.",
    action: channel?.emptyAction ?? "Start the conversation.",
  };
}

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
    status: "idle",
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
