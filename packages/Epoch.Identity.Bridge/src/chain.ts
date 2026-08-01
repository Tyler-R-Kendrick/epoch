/**
 * Hash-chained ordering for binding events (Invariant 3).
 * "Latest" = head of the longest valid chain, never largest created_at.
 */

export type ChainLink = {
  readonly seqno: number;
  readonly id: string;
  readonly prevId?: string;
  readonly revoked: boolean;
};

export type ChainValidationResult =
  | { readonly ok: true; readonly head: ChainLink }
  | { readonly ok: false; readonly reason: "chain-broken" | "chain-regression" };

/**
 * Validate a chain sorted by seqno ascending (1..n).
 * - seqno starts at 1 and increments by 1
 * - every link after first has prevId equal to previous id
 * - revocation is terminal: nothing may follow a revoked link
 */
export function validateChain(
  links: readonly ChainLink[],
  pinnedHead?: { readonly seqno: number; readonly id: string },
): ChainValidationResult {
  if (links.length === 0) {
    return { ok: false, reason: "chain-broken" };
  }

  const ordered = [...links].sort((a, b) => a.seqno - b.seqno);
  for (let i = 0; i < ordered.length; i += 1) {
    const link = ordered[i]!;
    if (link.seqno !== i + 1) {
      return { ok: false, reason: "chain-broken" };
    }
    if (i === 0) {
      if (link.prevId !== undefined) {
        return { ok: false, reason: "chain-broken" };
      }
    } else {
      const prev = ordered[i - 1]!;
      if (prev.revoked) {
        return { ok: false, reason: "chain-broken" };
      }
      if (link.prevId !== prev.id) {
        return { ok: false, reason: "chain-broken" };
      }
    }
  }

  const head = ordered[ordered.length - 1]!;
  if (pinnedHead !== undefined) {
    if (head.seqno < pinnedHead.seqno) {
      return { ok: false, reason: "chain-regression" };
    }
    if (head.seqno === pinnedHead.seqno && head.id !== pinnedHead.id) {
      return { ok: false, reason: "chain-regression" };
    }
  }

  return { ok: true, head };
}

/**
 * Cross-plane chain agreement: both sides must claim the same head seqno and prev linkage.
 */
export function agreeOnHead(
  nostr: { readonly seqno: number; readonly prevEventId?: string; readonly eventId: string },
  at: { readonly seqno: number; readonly prevBindingEventId?: string },
): boolean {
  if (nostr.seqno !== at.seqno) {
    return false;
  }
  const nPrev = nostr.prevEventId;
  const aPrev = at.prevBindingEventId;
  if (nPrev === undefined && aPrev === undefined) {
    return true;
  }
  return nPrev !== undefined && aPrev !== undefined && nPrev === aPrev;
}
