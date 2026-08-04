import type { CommunityConversationView } from "./types";

/**
 * Channel messages read in the order they were sent.
 *
 * Builder order grouped conversations by source — social fixtures, then agent
 * members, then forge items — and the client re-grouped them the same way on
 * every refresh, so a thread read 09:05, 09:18, 09:31, 09:47, 09:40.
 *
 * This lives apart from the feed builders on purpose: the client needs the
 * ordering rule and must not drag the seeded fixture data into its bundle.
 */
export function byTime(
  conversations: readonly CommunityConversationView[],
): readonly CommunityConversationView[] {
  return [...conversations].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}
