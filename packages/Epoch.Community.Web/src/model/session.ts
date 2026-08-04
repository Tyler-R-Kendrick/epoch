import type { CommunityAgentMember, CommunityAuthState, CommunitySessionIdentity } from "./types";

export function defaultSessionForApi(apiBaseUrl: string | undefined): CommunitySessionIdentity {
  if (apiBaseUrl === undefined) {
    return {
      handle: "maya.epoch.community",
      did: "did:plc:maya",
      authState: "sample-session",
    };
  }
  return {
    handle: "maya.epoch.community",
    did: "did:plc:maya",
    authState: "api-session",
  };
}

export function resolveSessionAuthNote(authState: CommunityAuthState): string {
  switch (authState) {
    case "authenticated":
      return "AT session linked";
    case "api-session":
      return "AT not linked";
    case "unauthenticated":
      return "not signed in";
    case "sample-session":
    default:
      return "sample session";
  }
}

export function withLiveAgentSessions(
  agents: readonly CommunityAgentMember[],
  liveAgentIds: readonly string[] | undefined,
): readonly CommunityAgentMember[] {
  if (liveAgentIds === undefined || liveAgentIds.length === 0) {
    return agents;
  }
  const live = new Set(liveAgentIds);
  return agents.map((agent) =>
    live.has(agent.id) || live.has(agent.displayName)
      ? { ...agent, sessionKind: "live" as const, status: agent.status === "idle" ? "working" : agent.status }
      : agent
  );
}

/**
 * The unshortened statement behind the chip's short label. The visible chip is
 * three lines in a 250px rail, so the long form lives on the chip's title
 * instead of being dropped: shortening the label must not lose the fact.
 */
export function resolveSessionAuthDetail(authState: CommunityAuthState): string {
  switch (authState) {
    case "authenticated":
      return "AT Protocol session linked";
    case "api-session":
      return "Live Community API session; AT Protocol OAuth is not linked";
    case "unauthenticated":
      return "Not signed in";
    default:
      return "Sample session; not an AT Protocol login";
  }
}
