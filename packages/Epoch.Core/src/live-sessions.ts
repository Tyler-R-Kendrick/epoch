/**
 * Live Sessions — signed publication sessions over existing Spaces.
 *
 * A Live Session never replaces a Space: it binds to one, borrows its View
 * selection, and evaluates authority through the Space's own participants and
 * grants. Every lifecycle step, policy digest, consent decision, and seal is a
 * validated protocol event in the same signed history the Space lives in, so
 * the whole session reconstructs deterministically from events and survives
 * sync exactly the way Spaces do.
 */
import { createHash } from "node:crypto";
import {
  assertProtocolEvent,
  createCanonicalId,
  parseCanonicalId,
  type CanonicalId,
} from "@epoch/protocol";
import { SpaceError, type SignedSpaceStore, type SpaceParticipant } from "./spaces";

export type LiveSessionLifecycle = "draft" | "lobby" | "live" | "paused" | "ended" | "sealed";
export type LiveSessionLifecycleCommand = "openLobby" | "start" | "pause" | "resume" | "end";
export type LiveSessionVisibility = "private" | "community" | "unlisted" | "public";
export type LiveSessionSecurityMode = "semantic-only" | "private-e2ee" | "private-recordable" | "public-broadcast";
export type LiveSessionConsentScope =
  | "semantic-capture" | "audio" | "camera" | "screen-share" | "captions" | "recording" | "external-egress";
export type LiveSessionCompleteness = "complete" | "semantic-only" | "media-missing" | "partial";
export type LiveSessionPolicyChange = "initial" | "narrowing" | "widening" | "mixed";

interface LiveLifecycleTransition {
  readonly from: readonly LiveSessionLifecycle[];
  readonly to: LiveSessionLifecycle;
}

const LIFECYCLE_TRANSITIONS = {
  openLobby: { from: ["draft"], to: "lobby" },
  start: { from: ["lobby"], to: "live" },
  pause: { from: ["live"], to: "paused" },
  resume: { from: ["paused"], to: "live" },
  end: { from: ["live", "paused", "lobby"], to: "ended" },
} satisfies Readonly<Record<LiveSessionLifecycleCommand, LiveLifecycleTransition>>;

export interface LiveSessionRecord {
  readonly sessionId: string;
  readonly spaceId: string;
  readonly ownerPrincipalId: string;
  readonly viewName: string;
  readonly visibility: LiveSessionVisibility;
  readonly securityMode: LiveSessionSecurityMode;
  readonly lifecycle: LiveSessionLifecycle;
  readonly policyDigest: string;
  readonly createdEventId: string;
  readonly startedEventId?: string;
  readonly endedEventId?: string;
  readonly sealedEventId?: string;
  readonly manifestDigest?: string;
  readonly completeness?: LiveSessionCompleteness;
  readonly consent: readonly {
    readonly principalId: string;
    readonly scopes: readonly LiveSessionConsentScope[];
    readonly policyDigest: string;
    readonly decision: "granted" | "withdrawn";
  }[];
}

function refuse(code: "invalid-input" | "not-found" | "conflict" | "grant-denied" | "policy-denied", message: string): never {
  throw new SpaceError(code, message);
}

function isNonEmptyString<T>(value: T): value is T & string {
  return typeof value === "string" && value.trim() !== "";
}

/** Protocol validation constrained scopes to the consent enum before append. */
function consentScopeOf<T>(scope: T): LiveSessionConsentScope {
  // SAFETY: assertProtocolEvent validated every scope against the consent enum before the event was appended.
  return String(scope) as LiveSessionConsentScope;
}

/**
 * Signed Live Session store composed over `SignedSpaceStore`.
 *
 * Authority comes from Space grants: owners manage the session, any active
 * participant may record consent, and observers hold no lifecycle authority.
 * A sealed session refuses every further mutation.
 */
export class SignedLiveSessionStore {
  readonly #spaces: SignedSpaceStore;

  constructor(spaces: SignedSpaceStore) {
    this.#spaces = spaces;
  }

  get spaces(): SignedSpaceStore { return this.#spaces; }

  createSession(spaceId: string, input: {
    readonly policyDigest: string;
    readonly visibility?: LiveSessionVisibility;
    readonly securityMode?: LiveSessionSecurityMode;
    readonly view?: string;
    readonly principal?: string;
  }): LiveSessionRecord {
    const space = this.#spaces.showSpace(spaceId);
    const principalId = this.requireRole(spaceId, input.principal, ["owner"], "create a live session");
    const visibility = input.visibility ?? "private";
    const securityMode = input.securityMode ?? "semantic-only";
    const viewName = input.view ?? String(space.data.viewName);
    if (!isNonEmptyString(input.policyDigest)) {
      refuse("invalid-input", "a live session requires a normalized policy digest");
    }
    const sessionId = createCanonicalId("session");
    this.append("live.session.created", {
      spaceId, sessionId, principalId, sessionKind: "live",
      viewName, visibility, securityMode, policyDigest: input.policyDigest,
    });
    return this.showSession(sessionId);
  }

  listSessions(spaceId: string): readonly LiveSessionRecord[] {
    this.#spaces.showSpace(spaceId);
    return this.#spaces.repository.events()
      .filter((event) => event.type === "live.session.created" && event.payload.spaceId === spaceId)
      .map((event) => this.showSession(String(event.payload.sessionId)));
  }

  showSession(sessionId: string): LiveSessionRecord {
    parseCanonicalId(sessionId, "session");
    const events = this.#spaces.repository.events();
    const created = events.find((event) =>
      event.type === "live.session.created" && event.payload.sessionId === sessionId)
      ?? refuse("not-found", `live session not found: ${sessionId}`);
    let lifecycle: LiveSessionLifecycle = "draft";
    let policyDigest = String(created.payload.policyDigest);
    let startedEventId: string | undefined;
    let endedEventId: string | undefined;
    let sealedEventId: string | undefined;
    let manifestDigest: string | undefined;
    let completeness: LiveSessionCompleteness | undefined;
    const consent = new Map<string, {
      principalId: string;
      scopes: readonly LiveSessionConsentScope[];
      policyDigest: string;
      decision: "granted" | "withdrawn";
    }>();
    for (const event of events) {
      if (event.payload.sessionId !== sessionId) continue;
      if (event.type === "live.session.lifecycle") {
        // SAFETY: protocol validation constrains `to` to the lifecycle enum before append.
        lifecycle = String(event.payload.to) as LiveSessionLifecycle;
        if (event.payload.command === "start") startedEventId = event.id;
        if (event.payload.command === "end") endedEventId = event.id;
      } else if (event.type === "live.session.policy") {
        policyDigest = String(event.payload.policyDigest);
      } else if (event.type === "live.session.consent") {
        const principal = String(event.payload.principalId);
        const scopes = Array.isArray(event.payload.scopes)
          ? event.payload.scopes.map(consentScopeOf)
          : [];
        consent.set(principal, {
          principalId: principal,
          scopes,
          policyDigest: String(event.payload.policyDigest),
          decision: event.payload.decision === "withdrawn" ? "withdrawn" : "granted",
        });
      } else if (event.type === "live.session.sealed") {
        lifecycle = "sealed";
        sealedEventId = event.id;
        manifestDigest = String(event.payload.manifestDigest);
        // SAFETY: protocol validation constrains completeness to the enum before append.
        completeness = String(event.payload.completeness) as LiveSessionCompleteness;
      }
    }
    return {
      sessionId,
      spaceId: String(created.payload.spaceId),
      ownerPrincipalId: String(created.payload.principalId),
      viewName: String(created.payload.viewName),
      // SAFETY: protocol validation constrains visibility to the enum before append.
      visibility: String(created.payload.visibility) as LiveSessionVisibility,
      // SAFETY: protocol validation constrains securityMode to the enum before append.
      securityMode: String(created.payload.securityMode) as LiveSessionSecurityMode,
      lifecycle,
      policyDigest,
      createdEventId: created.id,
      ...(startedEventId !== undefined && { startedEventId }),
      ...(endedEventId !== undefined && { endedEventId }),
      ...(sealedEventId !== undefined && { sealedEventId }),
      ...(manifestDigest !== undefined && { manifestDigest }),
      ...(completeness !== undefined && { completeness }),
      consent: [...consent.values()],
    };
  }

  applyLifecycle(sessionId: string, input: {
    readonly command: LiveSessionLifecycleCommand;
    readonly principal?: string;
  }): LiveSessionRecord {
    const session = this.requireMutable(sessionId);
    const principalId = this.requireRole(session.spaceId, input.principal, ["owner"], `${input.command} a live session`);
    const transition: LiveLifecycleTransition = LIFECYCLE_TRANSITIONS[input.command]
      ?? refuse("invalid-input", `unknown lifecycle command: ${String(input.command)}`);
    if (!transition.from.includes(session.lifecycle)) {
      refuse("conflict", `cannot ${input.command} from '${session.lifecycle}'`);
    }
    if (input.command === "start") {
      const granted = session.consent.find((record) =>
        record.principalId === session.ownerPrincipalId
        && record.decision === "granted"
        && record.policyDigest === session.policyDigest
        && record.scopes.includes("semantic-capture"));
      if (granted === undefined) {
        refuse("policy-denied", "start requires recorded semantic-capture consent against the current policy digest");
      }
    }
    this.append("live.session.lifecycle", {
      spaceId: session.spaceId, sessionId, principalId,
      command: input.command, from: session.lifecycle, to: transition.to,
    });
    return this.showSession(sessionId);
  }

  /** Append a replacement policy digest. Narrow/widen classification is decided by the runtime policy engine. */
  recordPolicy(sessionId: string, input: {
    readonly policyDigest: string;
    readonly change: LiveSessionPolicyChange;
    readonly principal?: string;
  }): LiveSessionRecord {
    const session = this.requireMutable(sessionId);
    const principalId = this.requireRole(session.spaceId, input.principal, ["owner"], "change a live session policy");
    if (!isNonEmptyString(input.policyDigest)) {
      refuse("invalid-input", "a policy event requires a normalized policy digest");
    }
    this.append("live.session.policy", {
      spaceId: session.spaceId, sessionId, principalId,
      policyDigest: input.policyDigest, change: input.change,
    });
    return this.showSession(sessionId);
  }

  recordConsent(sessionId: string, input: {
    readonly scopes: readonly LiveSessionConsentScope[];
    readonly decision?: "granted" | "withdrawn";
    readonly principal?: string;
  }): LiveSessionRecord {
    const session = this.requireMutable(sessionId);
    const principalId = this.requireRole(
      session.spaceId, input.principal,
      ["owner", "collaborator", "agent", "observer"], "record consent",
    );
    if (input.scopes.length === 0) refuse("invalid-input", "consent requires at least one scope");
    this.append("live.session.consent", {
      spaceId: session.spaceId, sessionId, principalId,
      policyDigest: session.policyDigest,
      decision: input.decision ?? "granted",
      scopes: [...input.scopes],
    });
    return this.showSession(sessionId);
  }

  /** Seal an ended session. The manifest is hashed, not trusted as claimed. */
  seal(sessionId: string, input: {
    readonly manifestJson: string;
    readonly completeness: LiveSessionCompleteness;
    readonly principal?: string;
  }): LiveSessionRecord {
    const session = this.requireMutable(sessionId);
    const principalId = this.requireRole(session.spaceId, input.principal, ["owner"], "seal a live session");
    if (session.lifecycle !== "ended") refuse("conflict", `cannot seal from '${session.lifecycle}'`);
    if (!isNonEmptyString(input.manifestJson)) {
      refuse("invalid-input", "sealing requires the replay manifest content");
    }
    this.append("live.session.sealed", {
      spaceId: session.spaceId, sessionId, principalId,
      manifestDigest: createHash("sha256").update(input.manifestJson).digest("hex"),
      completeness: input.completeness,
    });
    return this.showSession(sessionId);
  }

  // ---------------------------------------------------------------- internals

  private requireMutable(sessionId: string): LiveSessionRecord {
    const session = this.showSession(sessionId);
    if (session.lifecycle === "sealed") {
      refuse("policy-denied", "sealed live sessions are immutable");
    }
    return session;
  }

  private requireRole(
    spaceId: string,
    principal: string | undefined,
    roles: readonly SpaceParticipant["role"][],
    action: string,
  ): CanonicalId<"principal"> {
    const principalId = this.resolvePrincipal(principal);
    const participant = this.#spaces.participants(spaceId)
      .find((item) => item.principalId === principalId && item.active);
    if (participant === undefined) {
      refuse("grant-denied", `no active grant authorizes ${principalId} to ${action}`);
    }
    if (!roles.includes(participant.role)) {
      refuse("grant-denied", `role '${participant.role}' does not authorize ${action}`);
    }
    return principalId;
  }

  /**
   * Resolve a caller to a key-backed principal, exactly as the Space store
   * does: canonical ids pass through, names resolve to real signing keys, and
   * an unnamed caller is the repository identity. An id is never derived from
   * a bare name, so no one can mint membership for a principal without keys.
   */
  private resolvePrincipal(principal: string | undefined): CanonicalId<"principal"> {
    const repository = this.#spaces.repository;
    if (principal !== undefined && principal.startsWith("epoch:principal:")) {
      parseCanonicalId(principal, "principal");
      // SAFETY: parseCanonicalId above verified the principal id shape.
      return principal as CanonicalId<"principal">;
    }
    const identity = principal === undefined || principal === "current" || principal === repository.identity()
      ? repository.identityDocument()
      : repository.identityFor(principal);
    return createCanonicalId("principal", () =>
      new Uint8Array(createHash("sha256").update(identity.publicKey).digest()));
  }

  private append(type: string, body: Record<string, string | readonly string[]>) {
    const payload = Object.fromEntries(Object.entries(body));
    assertProtocolEvent({ schemaVersion: 1, type, eventId: "pending-event", revisionId: "pending-event", body: payload });
    const repository = this.#spaces.repository;
    const parents = repository.heads();
    return repository.appendWithParents(type, payload, {
      author: repository.identity(),
      parents,
      expectedHeads: parents,
      transactionId: `${createCanonicalId("operation")}:${repository.events().length}`,
    });
  }
}
