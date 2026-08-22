/**
 * Characterization goldens for Live Spaces (Verify-style).
 *
 * Everything pinned here is a promise made to something outside this process:
 * signed history that must verify offline years from now, an authority surface
 * a reviewer reads to know what a command may do, a digest that appears in
 * signed evidence, and two payloads that leave the trust boundary entirely.
 *
 * Unit tests assert that a rule holds. These assert that a *shape* has not
 * moved — the failure mode where every test still passes and yet a previously
 * signed session no longer verifies, or a field nobody meant to publish
 * appears on a dashboard.
 *
 * Goldens live in test/verify/verified/; refresh with EPOCH_UPDATE_VERIFIED=1
 * and read the diff before accepting it.
 */
import {
  PROTOCOL_EVENT_SCHEMAS,
  LIVE_SESSION_LIFECYCLE_STATES,
  LIVE_SESSION_LIFECYCLE_COMMANDS,
  LIVE_SESSION_VISIBILITIES,
  LIVE_SESSION_SECURITY_MODES,
  LIVE_SESSION_CONSENT_SCOPES,
  LIVE_SESSION_POLICY_CHANGES,
  LIVE_SESSION_COMPLETENESS,
  LIVE_SESSION_BINDING_KINDS,
} from "@epoch/protocol";
import {
  IMMUTABLE_LIVE_DENY_PATHS,
  LIVE_SANITIZER_BOUNDS,
  LIVE_MODERATION_ACTIONS,
  createLiveActionCatalog,
  createLivePresentationPublisher,
  createLiveSpaceCommandExtensions,
  evaluateLiveModeration,
  liveTelemetryRecord,
  normalizeLivePublicationPolicy,
  projectLiveOperations,
} from "@epoch/community-runtime";
import { assertVerified, verifiedFixture } from "../verify/assert-verified";

export function runLiveSpacesCharacterizationTests(): void {
  liveProtocolEventVocabulary();
  liveCommandAuthoritySurface();
  livePolicyNormalizationAndDigest();
  liveImmutableDenyBaseline();
  liveReleasedEnvelopeContract();
  liveOperationsAndTelemetryPayloads();
  liveModerationWording();
}

/**
 * The signed-history vocabulary.
 *
 * A live session's lifecycle is signed evidence. Renaming a state, dropping an
 * event type, or reordering a closed vocabulary changes what a verifier will
 * accept — and the sessions already sealed cannot be re-signed.
 */
function liveProtocolEventVocabulary(): void {
  assertVerified("live-protocol-events", verifiedFixture({
    eventTypes: PROTOCOL_EVENT_SCHEMAS.filter((type) => type.startsWith("live.")),
    lifecycleStates: [...LIVE_SESSION_LIFECYCLE_STATES],
    lifecycleCommands: [...LIVE_SESSION_LIFECYCLE_COMMANDS],
    visibilities: [...LIVE_SESSION_VISIBILITIES],
    securityModes: [...LIVE_SESSION_SECURITY_MODES],
    consentScopes: [...LIVE_SESSION_CONSENT_SCOPES],
    policyChanges: [...LIVE_SESSION_POLICY_CHANGES],
    completeness: [...LIVE_SESSION_COMPLETENESS],
    bindingKinds: [...LIVE_SESSION_BINDING_KINDS],
  }));
}

/**
 * The authority surface, as a reviewer reads it.
 *
 * `capability`, `readOnly` and `requiresConfirmation` are what stand between a
 * command and someone's session. A read command quietly becoming a write, or a
 * destructive one losing its confirmation, is a privilege change that no
 * behavioural test necessarily fails — so it is pinned by shape.
 */
function liveCommandAuthoritySurface(): void {
  // No port: descriptors are static, and building them without one proves they
  // carry no state from a particular deployment.
  const extensions = createLiveSpaceCommandExtensions(undefined, () => "principal-golden");
  assertVerified("live-command-catalog", verifiedFixture(
    extensions
      .map((extension) => ({
        kind: extension.descriptor.kind,
        capability: extension.descriptor.capability,
        readOnly: extension.descriptor.readOnly,
        requiresConfirmation: extension.descriptor.requiresConfirmation,
        untrustedContent: extension.descriptor.untrustedContent,
        required: [...(extension.descriptor.inputSchema.required ?? [])].sort(),
      }))
      .sort((left, right) => left.kind.localeCompare(right.kind)),
  ));
}

/**
 * The digest is signed evidence, so normalization is a compatibility surface.
 *
 * If sorting, defaulting, or field order drifts, the same policy hashes to a
 * different digest and a session's recorded policy no longer matches the
 * policy it was recorded under.
 */
function livePolicyNormalizationAndDigest(): void {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "community",
    securityMode: "semantic-only",
    presentationViewRef: "views/present",
    // Deliberately unsorted and duplicated: normalization is what the golden
    // is pinning, so the input must give it something to do.
    allowedPathPatterns: ["packages/app/**", "docs/**", "packages/app/**"],
    allowedActionIds: ["diff.show", "view.open", "diff.show"],
    deniedPathPatterns: ["packages/app/secrets/**"],
  });
  if (normalized.kind !== "valid") throw new Error(normalized.errors.join("; "));
  assertVerified("live-policy-normalization", verifiedFixture({
    digest: normalized.digest,
    policy: normalized.policy,
  }));
}

/**
 * The one list a session cannot negotiate with.
 *
 * Everything else about a policy is the host's choice; this is the floor. A
 * silent removal here is the single worst regression this feature can have, and
 * it would not fail a test that only checks the paths it happens to know about.
 */
function liveImmutableDenyBaseline(): void {
  assertVerified("live-immutable-deny-baseline", verifiedFixture({
    deniedPaths: [...IMMUTABLE_LIVE_DENY_PATHS],
    sanitizerBounds: { ...LIVE_SANITIZER_BOUNDS },
  }));
}

/**
 * What an audience actually receives, field for field.
 *
 * A new field on a released envelope is a publication decision. Pinning the
 * shape means adding one requires accepting a golden diff, which is the point
 * at which somebody asks whether it should be public.
 */
function liveReleasedEnvelopeContract(): void {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "community",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: ["view.open"],
  });
  if (normalized.kind !== "valid") throw new Error(normalized.errors.join("; "));
  let clockMs = 0;
  const publisher = createLivePresentationPublisher({
    sessionId: "livesession-golden",
    policy: normalized.policy,
    catalog: createLiveActionCatalog({ "view.open": { streamSafe: true, replayEffect: "presentation-local" } }),
    sessionSalt: "golden-entropy",
    now: () => { clockMs += 10; return clockMs; },
  });
  publisher.capture({
    actorId: "principal-golden",
    actionId: "view.open",
    args: { view: "board" },
    path: "packages/app/board.ts",
    sourceEventIds: ["event-golden"],
    sourceViewRef: "views/present",
    sourceVerified: true,
  });
  publisher.release();
  assertVerified("live-presentation-envelope", verifiedFixture({
    envelopes: publisher.releasedEnvelopes(),
    checkpoint: publisher.checkpoint(),
  }));
}

/**
 * The two payloads that leave the trust boundary.
 *
 * The operations projection goes to browsers; the telemetry record goes to a
 * pipeline nobody re-reads. Both are enumerated shapes, and pinning them means
 * a widening shows up as a golden diff rather than as a field that has been
 * quietly shipping for months.
 */
function liveOperationsAndTelemetryPayloads(): void {
  assertVerified("live-operations-projection", verifiedFixture(projectLiveOperations({
    sessionId: "livesession-golden",
    lifecycle: "live",
    health: "degraded",
    releasedThroughSequence: 7,
    quarantinedCount: 2,
    mediaLabel: "provider-disabled",
    captionLabel: "provider-disabled",
  })));
  assertVerified("live-telemetry-record", verifiedFixture(liveTelemetryRecord({
    lifecycle: "live",
    releasedCount: 7,
    quarantinedCount: 2,
    participantCount: 3,
    gapCount: 1,
    mediaLabel: "provider-disabled",
  })));
}

/**
 * What a responder is told, in the words they are told it.
 *
 * The `cannotUndo` sentences are the honesty contract of this feature. If one
 * is softened, no behavioural assertion necessarily notices — the list is still
 * non-empty — so the wording itself is the golden.
 */
function liveModerationWording(): void {
  assertVerified("live-moderation-outcomes", verifiedFixture({
    actions: [...LIVE_MODERATION_ACTIONS],
    outcomes: LIVE_MODERATION_ACTIONS.map((action) => ({
      action,
      live: evaluateLiveModeration({ action, lifecycle: "live", releasedThroughSequence: 4, sealed: false }),
      sealed: evaluateLiveModeration({ action, lifecycle: "sealed", releasedThroughSequence: 4, sealed: true }),
      nothingReleased: evaluateLiveModeration({ action, lifecycle: "live", releasedThroughSequence: 0, sealed: false }),
    })),
  }));
}
