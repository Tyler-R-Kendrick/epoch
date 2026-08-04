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
      return "live API session · AT OAuth not linked";
    case "unauthenticated":
      return "not signed in";
    case "sample-session":
    default:
      return "session sample · not AT login";
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
