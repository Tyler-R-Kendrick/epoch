import fc from "fast-check";

/**
 * Inputs for the two Live Spaces properties worth generating rather than
 * enumerating: what a host's tooling might try to publish, and what order an
 * audience might receive the result in.
 *
 * The generators deliberately produce mostly-plausible traffic with hostile
 * values mixed in. A corpus of only obvious secrets proves the filter catches
 * obvious secrets; a corpus where a key looks ordinary and the value is a
 * credential is the case that actually decides whether a stream leaks.
 */

/** Values that must never appear in a released envelope, whatever surrounds them. */
export const LIVE_SECRET_VALUES = [
  "sk-live-51HxFuzzCredential",
  "ghp_fuzzPersonalAccessToken00",
  "AKIAIOSFODNN7EXAMPLE",
  "-----BEGIN RSA PRIVATE KEY-----",
  "xoxb-000000-fuzz-slack-token",
] as const;

/** Paths a session must refuse regardless of what it allow-lists. */
export const LIVE_FORBIDDEN_PATHS = [
  "apps/api/.env",
  ".env.local",
  "packages/app/.env.production",
  "secrets/id_rsa",
  "packages/app/../../etc/shadow",
] as const;

export const LIVE_ALLOWED_ACTIONS = ["view.open", "diff.show"] as const;

const arbOrdinaryValue = fc.oneof(
  fc.string({ maxLength: 24 }),
  fc.integer({ min: -1000, max: 1000 }).map(String),
  fc.constantFrom("board", "main", "open", "true", "false"),
);

const arbSecretValue = fc.constantFrom(...LIVE_SECRET_VALUES);

/** Keys that read as harmless. The value decides, not the label. */
const arbKey = fc.constantFrom("view", "config", "target", "label", "apiKey", "token", "note");

/** What a published argument can hold: the JSON shapes a capture may carry. */
export type LiveArgValue = string | readonly LiveArgValue[] | { readonly [key: string]: LiveArgValue };

/**
 * Arguments up to three levels deep. Nesting is the point: a filter that only
 * inspects top-level values passes a flat corpus and leaks a nested one.
 */
const arbLiveArgValue = fc.letrec<{ value: LiveArgValue }>((tie) => ({
  value: fc.oneof(
    { weight: 3, arbitrary: arbOrdinaryValue },
    { weight: 1, arbitrary: arbSecretValue },
    { weight: 1, arbitrary: fc.array(tie("value"), { maxLength: 3 }) },
    { weight: 1, arbitrary: fc.dictionary(arbKey, tie("value"), { maxKeys: 3 }) },
  ),
})).value;

export const arbLiveArgs: fc.Arbitrary<Readonly<Record<string, LiveArgValue>>> =
  arbLiveArgValue.chain((value) => fc.dictionary(arbKey, fc.constant(value), { minKeys: 1, maxKeys: 4 }));

export const arbLivePath: fc.Arbitrary<string | undefined> = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom("packages/app/board.ts", "packages/app/nested/view.ts") },
  { weight: 2, arbitrary: fc.constantFrom(...LIVE_FORBIDDEN_PATHS) },
  { weight: 1, arbitrary: fc.constant(undefined) },
  { weight: 1, arbitrary: fc.string({ maxLength: 32 }) },
);

export const arbLiveActionId: fc.Arbitrary<string> = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom(...LIVE_ALLOWED_ACTIONS) },
  { weight: 1, arbitrary: fc.constantFrom("input.type", "clipboard.read", "theme.set", "unknown.action") },
);

export interface LiveCaptureAttempt {
  readonly actionId: string;
  readonly args: Readonly<Record<string, LiveArgValue>>;
  readonly path: string | undefined;
  readonly sourceVerified: boolean;
  readonly protectedInput: boolean;
}

export const arbLiveCaptureAttempt: fc.Arbitrary<LiveCaptureAttempt> = fc.record({
  actionId: arbLiveActionId,
  args: arbLiveArgs,
  path: arbLivePath,
  // An unverified source is a capture the publisher must refuse outright, and
  // it has to stay in the corpus or that refusal is never exercised.
  sourceVerified: fc.boolean(),
  protectedInput: fc.boolean(),
});

export const arbLiveCaptureRun: fc.Arbitrary<readonly LiveCaptureAttempt[]> =
  fc.array(arbLiveCaptureAttempt, { minLength: 1, maxLength: 12 });

/**
 * A delivery order: a permutation of released sequences, with duplicates and
 * drops. This is what an audience on a lossy transport actually receives.
 */
export interface LiveDeliveryPlan {
  readonly order: readonly number[];
  readonly duplicates: readonly number[];
  readonly dropped: readonly number[];
}

export function arbLiveDeliveryPlan(count: number): fc.Arbitrary<LiveDeliveryPlan> {
  const sequences = Array.from({ length: count }, (_unused, index) => index + 1);
  if (count === 0) {
    return fc.constant({ order: [], duplicates: [], dropped: [] });
  }
  return fc.record({
    order: fc.shuffledSubarray(sequences, { minLength: count, maxLength: count }),
    duplicates: fc.subarray(sequences, { maxLength: Math.min(3, count) }),
    dropped: fc.subarray(sequences, { maxLength: Math.min(2, count) }),
  });
}
