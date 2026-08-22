import assert from "node:assert/strict";
import {
  createLiveActionCatalog,
  createLivePresentationPublisher,
  createLiveSpectatorProjection,
  normalizeLivePublicationPolicy,
  type LivePresentationEnvelopeV2,
  type LivePresentationPublisher,
} from "@epoch/community-runtime";
import {
  LIVE_ALLOWED_ACTIONS,
  LIVE_FORBIDDEN_PATHS,
  LIVE_SECRET_VALUES,
  type LiveCaptureAttempt,
  type LiveDeliveryPlan,
} from "../arbitraries/live-spaces";

type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };

const SESSION = "livesession-fuzz";
const SALT = "fuzz-entropy";

const CATALOG = createLiveActionCatalog({
  "view.open": { streamSafe: true, replayEffect: "presentation-local" },
  "diff.show": { streamSafe: true, replayEffect: "presentation-local" },
  "theme.set": { streamSafe: true, replayEffect: "presentation-local" },
  "input.type": { streamSafe: false, replayEffect: "never-replay" },
  "clipboard.read": { streamSafe: false, replayEffect: "never-replay" },
});

function publisher(): LivePresentationPublisher {
  const normalized = normalizeLivePublicationPolicy({
    visibility: "community",
    presentationViewRef: "views/present",
    allowedPathPatterns: ["packages/app/**"],
    allowedActionIds: [...LIVE_ALLOWED_ACTIONS],
  });
  if (normalized.kind !== "valid") throw new Error(normalized.errors.join("; "));
  let clockMs = 0;
  return createLivePresentationPublisher({
    sessionId: SESSION,
    policy: normalized.policy,
    catalog: CATALOG,
    sessionSalt: SALT,
    now: () => { clockMs += 10; return clockMs; },
  });
}

/**
 * Publish a generated run and assert the two things a stream may never do:
 * carry a secret an author typed, or carry a path the policy denies.
 *
 * The assertion is over the serialized envelope set rather than over named
 * fields, because a leak that arrives in a field nobody thought to check is
 * exactly the leak worth catching.
 */
export function assertLiveStreamNeverCarriesSecrets(
  attempts: readonly LiveCaptureAttempt[],
): readonly LivePresentationEnvelopeV2[] {
  const log = publisher();
  for (const attempt of attempts) {
    log.capture({
      actorId: "principal-fuzz",
      actionId: attempt.actionId,
      // SAFETY: the generator emits JSON-shaped values, which is DictionaryValue.
      args: attempt.args as Readonly<Record<string, DictionaryValue>>,
      ...(attempt.path !== undefined && { path: attempt.path }),
      sourceEventIds: ["event-fuzz"],
      sourceViewRef: "views/present",
      sourceVerified: attempt.sourceVerified,
      protectedInput: attempt.protectedInput,
    });
  }
  log.release();

  const released = log.releasedEnvelopes();
  const serialized = JSON.stringify(released);
  for (const secret of LIVE_SECRET_VALUES) {
    assert.equal(serialized.includes(secret), false, `a released envelope carried ${secret}`);
  }
  // The quarantine record is retained evidence, and it is read by operators —
  // so it is held to the same rule as the stream itself.
  const quarantined = JSON.stringify(log.quarantined());
  for (const secret of LIVE_SECRET_VALUES) {
    assert.equal(quarantined.includes(secret), false, `a quarantine record carried ${secret}`);
  }

  for (const envelope of released) {
    const allowedActions: readonly string[] = LIVE_ALLOWED_ACTIONS;
    assert.equal(allowedActions.includes(envelope.actionId), true,
      `released a non-allow-listed action: ${envelope.actionId}`);
    if (envelope.path !== undefined) {
      assert.equal(envelope.path.startsWith("packages/app/"), true,
        `released a path outside the allow-list: ${envelope.path}`);
      const forbiddenPaths: readonly string[] = LIVE_FORBIDDEN_PATHS;
      assert.equal(forbiddenPaths.includes(envelope.path), false,
        `released a baseline-denied path: ${envelope.path}`);
      assert.equal(envelope.path.includes(".."), false,
        `released a traversal path: ${envelope.path}`);
    }
  }

  // Sequence authority: released order is dense and strictly increasing, so a
  // spectator can always tell a hole from a slow sender.
  released.forEach((envelope, index) => {
    assert.equal(envelope.sequence, index + 1, "released sequences must be dense and strictly increasing");
  });

  return released;
}

/**
 * Deliver a released set in a generated order and assert convergence.
 *
 * The invariant is not "every order produces the same view" — a dropped
 * envelope legitimately leaves a reader behind. It is that a reader is never
 * *silently* behind: its reported position is exactly the contiguous run it
 * actually received, nothing is applied twice, and it never advances past a
 * hole no matter what order the rest arrives in.
 */
export function assertSpectatorConvergesOrReportsAGap(
  released: readonly LivePresentationEnvelopeV2[],
  plan: LiveDeliveryPlan,
): void {
  const bySequence = new Map(released.map((envelope) => [envelope.sequence, envelope]));
  const spectator = createLiveSpectatorProjection({ sessionId: SESSION });
  const dropped = new Set(plan.dropped);

  const deliveries = [...plan.order, ...plan.duplicates]
    .filter((sequence) => !dropped.has(sequence) && bySequence.has(sequence));
  let sawGap = false;
  for (const sequence of deliveries) {
    const envelope = bySequence.get(sequence);
    if (envelope === undefined) continue;
    if (spectator.apply(envelope).kind === "gap") sawGap = true;
  }

  // The position a correct reader should be at: the longest run from 1 that
  // was actually delivered. Applying is not counted from the return value —
  // one apply can drain a queue and settle several envelopes at once.
  const delivered = new Set(deliveries);
  let expected = 0;
  while (delivered.has(expected + 1)) expected += 1;

  const state = spectator.state();
  assert.equal(state.lastSequence, expected,
    "the reported position must equal the contiguous run the reader actually received");
  assert.equal(state.appliedCount, expected,
    "each envelope in that run is applied exactly once, however many copies arrived");
  assert.equal(state.lastSequence <= released.length, true,
    "a reader can never be ahead of what was released");

  // Anything delivered beyond a hole is held, never applied and never lost.
  const beyond = [...delivered].filter((sequence) => sequence > expected).length;
  assert.equal(state.pendingCount, beyond,
    "envelopes past a hole must be held pending, not discarded and not applied");
  if (beyond > 0) {
    assert.equal(sawGap, true, "a reader holding envelopes past a hole must have been told about the hole");
  }

  // A resync over the full released set closes every hole and settles there.
  if (released.length > 0) {
    for (const envelope of released) spectator.apply(envelope);
    assert.equal(spectator.state().lastSequence, released.length,
      "replaying the full released set must converge the reader on the head");
    assert.equal(spectator.state().pendingCount, 0,
      "convergence leaves nothing held");
  }
}
