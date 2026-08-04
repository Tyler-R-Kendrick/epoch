import type { CommunityConversationView } from "./types";

/**
 * Channel messages read in the order they were sent. Builder order grouped them
 * by source and the client re-grouped them again, so threads ran 09:47 before
 * 09:40. Lives apart from the feed builders so the client can take the ordering
 * rule without the fixture data.
 */
export function byTime(
  conversations: readonly CommunityConversationView[],
): readonly CommunityConversationView[] {
  return [...conversations].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}
