import { ed25519ManifestVerifier, type ManifestSignatureVerifier } from "./signing";

/**
 * Publisher key lifecycle (ADR-0042).
 *
 * A publisher identifier *is* an Ed25519 key, which is what makes verification
 * offline and unspoofable — and what left the identity with no lifecycle. This
 * module adds the three statements that give it one: an expiry inside the
 * signed manifest, a succession signed by the key being retired, and a
 * revocation that outranks both.
 *
 * Everything here is a pure function over statements. Where the statements come
 * from — the event log, the operator's configuration — is the caller's problem,
 * which is what keeps the rule "revocations replicate, consent does not"
 * enforceable at the boundary that decides it.
 */

/** How far a succession chain may be followed before it is refused. */
export const DEFAULT_SUCCESSION_DEPTH = 4;

export interface SuccessorStatement {
  /** The key being retired, which signs this statement. */
  readonly predecessor: string;
  readonly successor: string;
  readonly issuedAt: string;
  /** `ed25519:<base64>` over `successorSigningPayload`. */
  readonly signature: string;
}

export interface PublisherRevocation {
  readonly publisher: string;
  readonly reason?: string;
  readonly effectiveAt: string;
  /**
   * Present for self-revocation, absent for operator revocation.
   *
   * The unsigned form is not a weaker version of the signed one; it is the case
   * that matters most. A compromised key's holder may be exactly who the
   * operator is defending against, so revocation cannot require their
   * cooperation.
   */
  readonly signature?: string;
}

/** The exact bytes a retiring key signs to name its successor. */
export function successorSigningPayload(statement: SuccessorStatement): string {
  return JSON.stringify({
    issuedAt: statement.issuedAt,
    predecessor: statement.predecessor,
    statement: "epoch.publisher.successor",
    successor: statement.successor,
  });
}

/** The exact bytes a key signs to revoke itself. */
export function revocationSigningPayload(revocation: PublisherRevocation): string {
  return JSON.stringify({
    effectiveAt: revocation.effectiveAt,
    publisher: revocation.publisher,
    reason: revocation.reason ?? null,
    statement: "epoch.publisher.revocation",
  });
}

export interface PublisherLifecycle {
  /** Rotation statements, replicated as events; each carries its own proof. */
  readonly successors: readonly SuccessorStatement[];
  /** Revocations, replicated as events. Signed ones are self-revocations. */
  readonly revocations: readonly PublisherRevocation[];
  /** `revoked_publishers` from configuration: local, immediate, unsigned. */
  readonly revokedPublishers: readonly string[];
  readonly maximumDepth?: number;
}

export const EMPTY_PUBLISHER_LIFECYCLE: PublisherLifecycle = {
  successors: [],
  revocations: [],
  revokedPublishers: [],
};

export type PublisherStatus =
  | {
    readonly kind: "allowed";
    /** `direct` when the key is in `allow_publishers`, `succession` otherwise. */
    readonly via: "direct" | "succession";
    /** The allowed key this trust is rooted in. */
    readonly root: string;
    /** Zero for a direct allow; the number of rotations otherwise. */
    readonly depth: number;
  }
  | {
    readonly kind: "revoked";
    readonly origin: "self" | "operator";
    /** The revoked key: this publisher, or an ancestor its trust came through. */
    readonly publisher: string;
    readonly reason?: string;
  }
  | { readonly kind: "not-allowed" };

export interface PublisherEvaluationOptions {
  /** Injected so expiry is testable without waiting. */
  readonly now?: Date;
  readonly verifySignature?: ManifestSignatureVerifier;
}

/**
 * Decide whether a publisher key is trusted, and how it got there.
 *
 * Revocation is checked before anything else and no configuration mode
 * overrides it, which is the rule the trust policy already applies to `block`:
 * a statement that subtracts authority always outranks one that adds it.
 */
export function evaluatePublisher(
  publisher: string,
  allowed: readonly string[],
  lifecycle: PublisherLifecycle = EMPTY_PUBLISHER_LIFECYCLE,
  options: PublisherEvaluationOptions = {},
): PublisherStatus {
  const now = options.now ?? new Date();
  const verify = options.verifySignature ?? ed25519ManifestVerifier;
  const revoked = effectiveRevocations(lifecycle, now, verify);

  const direct = revoked.get(publisher);
  if (direct !== undefined) return direct;

  if (allowed.includes(publisher)) {
    return { kind: "allowed", via: "direct", root: publisher, depth: 0 };
  }

  // Breadth-first from every allowed root, so the shortest chain wins and the
  // depth reported is the real number of rotations rather than an accident of
  // statement order.
  const depthLimit = lifecycle.maximumDepth ?? DEFAULT_SUCCESSION_DEPTH;
  for (const root of allowed) {
    if (revoked.has(root)) continue;
    const seen = new Set([root]);
    let frontier: readonly string[] = [root];
    for (let depth = 1; depth <= depthLimit; depth += 1) {
      const next: string[] = [];
      for (const key of frontier) {
        for (const statement of lifecycle.successors) {
          if (statement.predecessor !== key || seen.has(statement.successor)) continue;
          if (!verify({
            payload: successorSigningPayload(statement),
            signature: statement.signature,
            publisher: statement.predecessor,
          })) {
            continue;
          }
          // A chain may not be followed *through* a revoked key: revoking a key
          // has to take everything it went on to name with it, or rotation
          // would be a way to outlive revocation.
          if (revoked.has(statement.successor)) continue;
          if (statement.successor === publisher) {
            return { kind: "allowed", via: "succession", root, depth };
          }
          seen.add(statement.successor);
          next.push(statement.successor);
        }
      }
      if (next.length === 0) break;
      frontier = next;
    }
  }

  return { kind: "not-allowed" };
}

/**
 * Revocations in force right now, by key.
 *
 * A self-revocation whose signature does not verify is not a revocation, and is
 * dropped rather than honoured — otherwise anyone could revoke anyone. An
 * operator entry needs no signature because its authority is the file it is
 * written in.
 */
function effectiveRevocations(
  lifecycle: PublisherLifecycle,
  now: Date,
  verify: ManifestSignatureVerifier,
): Map<string, Extract<PublisherStatus, { kind: "revoked" }>> {
  const effective = new Map<string, Extract<PublisherStatus, { kind: "revoked" }>>();

  for (const publisher of lifecycle.revokedPublishers) {
    effective.set(publisher, { kind: "revoked", origin: "operator", publisher });
  }

  for (const revocation of lifecycle.revocations) {
    if (effective.get(revocation.publisher)?.origin === "operator") continue;
    const effectiveAt = Date.parse(revocation.effectiveAt);
    if (Number.isNaN(effectiveAt) || effectiveAt > now.getTime()) continue;
    if (revocation.signature === undefined) {
      // An unsigned revocation arriving as a replicated event carries no proof
      // of anything, unlike the operator's own file. Honouring it would let any
      // peer revoke any publisher for everyone downstream.
      continue;
    }
    if (!verify({
      payload: revocationSigningPayload(revocation),
      signature: revocation.signature,
      publisher: revocation.publisher,
    })) {
      continue;
    }
    effective.set(revocation.publisher, {
      kind: "revoked",
      origin: "self",
      publisher: revocation.publisher,
      reason: revocation.reason,
    });
  }

  return effective;
}

/** Whether a signed manifest's own expiry has passed. */
export function isExpired(notAfter: string | undefined, now: Date = new Date()): boolean {
  if (notAfter === undefined) return false;
  const instant = Date.parse(notAfter);
  // An unparseable expiry is treated as expired: a signature whose validity
  // window cannot be read is not a signature anyone should rely on.
  return Number.isNaN(instant) || instant < now.getTime();
}
