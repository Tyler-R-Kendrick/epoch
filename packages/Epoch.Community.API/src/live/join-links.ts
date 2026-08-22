import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque, expiring join links.
 *
 * A link is a bearer credential, so it is treated like one: the secret exists
 * only in the response that mints it, the store keeps a digest, lookup is by
 * digest with a constant-time confirmation, and redemption yields the narrowest
 * thing that is useful — a single-session observer grant with an expiry. A
 * leaked link therefore expands to exactly one session's released state, for a
 * bounded time, and can be revoked without touching anyone else's access.
 */

export interface LiveJoinLinkRecord {
  readonly linkId: string;
  readonly sessionId: string;
  readonly issuedByPrincipalId: string;
  readonly expiresAtMs: number;
  readonly maxRedemptions: number;
  readonly redemptions: number;
  readonly revoked: boolean;
}

export interface LiveJoinLinkIssue {
  /** Returned once, to the issuer. Never stored, logged, or re-derivable. */
  readonly token: string;
  readonly record: LiveJoinLinkRecord;
}

export type LiveJoinLinkRedemption =
  | { readonly kind: "redeemed"; readonly sessionId: string; readonly linkId: string; readonly observerPrincipalId: string }
  | { readonly kind: "refused"; readonly reason: LiveJoinLinkRefusal };

export type LiveJoinLinkRefusal = "unknown" | "expired" | "revoked" | "exhausted";

export interface LiveJoinLinkStoreOptions {
  readonly now: () => number;
  /** Injected so tests are deterministic; production uses crypto randomness. */
  readonly randomToken?: () => string;
  readonly maxLifetimeMs?: number;
  readonly maxLinksPerSession?: number;
}

export interface LiveJoinLinkStore {
  issue(input: {
    readonly sessionId: string;
    readonly issuedByPrincipalId: string;
    readonly lifetimeMs: number;
    readonly maxRedemptions?: number;
  }): LiveJoinLinkIssue;
  redeem(token: string): LiveJoinLinkRedemption;
  revoke(linkId: string): boolean;
  list(sessionId: string): readonly LiveJoinLinkRecord[];
}

const DEFAULT_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_LINKS_PER_SESSION = 32;
const DEFAULT_MAX_REDEMPTIONS = 500;

export function createLiveJoinLinkStore(options: LiveJoinLinkStoreOptions): LiveJoinLinkStore {
  const maxLifetimeMs = options.maxLifetimeMs ?? DEFAULT_MAX_LIFETIME_MS;
  const maxLinksPerSession = options.maxLinksPerSession ?? DEFAULT_MAX_LINKS_PER_SESSION;
  const byDigest = new Map<string, LiveJoinLinkRecord>();
  const digestByLinkId = new Map<string, string>();

  function mintToken(): string {
    if (options.randomToken !== undefined) return options.randomToken();
    return randomBytes(32).toString("base64url");
  }

  return {
    issue(input) {
      const existing = [...byDigest.values()].filter((record) =>
        record.sessionId === input.sessionId && !record.revoked);
      if (existing.length >= maxLinksPerSession) {
        throw new Error("This session already has the maximum number of active join links.");
      }
      const lifetimeMs = Math.min(Math.max(input.lifetimeMs, 1), maxLifetimeMs);
      const token = mintToken();
      const digest = digestOfToken(token);
      const record: LiveJoinLinkRecord = {
        linkId: `livelink_${digest.slice(0, 16)}`,
        sessionId: input.sessionId,
        issuedByPrincipalId: input.issuedByPrincipalId,
        expiresAtMs: options.now() + lifetimeMs,
        maxRedemptions: Math.min(Math.max(input.maxRedemptions ?? DEFAULT_MAX_REDEMPTIONS, 1), DEFAULT_MAX_REDEMPTIONS),
        redemptions: 0,
        revoked: false,
      };
      byDigest.set(digest, record);
      digestByLinkId.set(record.linkId, digest);
      return { token, record };
    },

    redeem(token) {
      const digest = digestOfToken(token);
      const record = byDigest.get(digest);
      if (record === undefined) return { kind: "refused", reason: "unknown" };
      // The map lookup already matched; this confirms it without a
      // content-dependent comparison anywhere in the path.
      if (!constantTimeEquals(digest, digestOfToken(token))) return { kind: "refused", reason: "unknown" };
      if (record.revoked) return { kind: "refused", reason: "revoked" };
      if (options.now() >= record.expiresAtMs) return { kind: "refused", reason: "expired" };
      if (record.redemptions >= record.maxRedemptions) return { kind: "refused", reason: "exhausted" };
      const redeemed: LiveJoinLinkRecord = { ...record, redemptions: record.redemptions + 1 };
      byDigest.set(digest, redeemed);
      return {
        kind: "redeemed",
        sessionId: record.sessionId,
        linkId: record.linkId,
        // One opaque observer principal per redemption, scoped to this session.
        observerPrincipalId: `liveguest_${digestOfToken(`${digest}:${redeemed.redemptions}`).slice(0, 24)}`,
      };
    },

    revoke(linkId) {
      const digest = digestByLinkId.get(linkId);
      if (digest === undefined) return false;
      const record = byDigest.get(digest);
      if (record === undefined) return false;
      byDigest.set(digest, { ...record, revoked: true });
      return true;
    },

    list(sessionId) {
      return [...byDigest.values()].filter((record) => record.sessionId === sessionId);
    },
  };
}

/** Links are stored hashed: a database copy does not yield working credentials. */
export function digestOfToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}
