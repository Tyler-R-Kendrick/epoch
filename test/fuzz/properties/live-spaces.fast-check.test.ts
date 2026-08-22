import fc from "fast-check";
import { shortFcParams } from "../arbitraries/parsers";
import {
  arbLiveCaptureRun,
  arbLiveDeliveryPlan,
} from "../arbitraries/live-spaces";
import {
  assertLiveStreamNeverCarriesSecrets,
  assertSpectatorConvergesOrReportsAGap,
} from "../oracles/live-spaces";

/**
 * Two Live Spaces invariants that hand-written cases cannot cover.
 *
 * A publication filter is only as good as the shapes it has seen, and an
 * ordering guarantee is only as good as the interleavings it has survived.
 * Both are generated here rather than enumerated, so a nesting depth or a
 * delivery order nobody imagined still has to hold.
 */
async function main(): Promise<void> {
  const params = shortFcParams();

  // Nothing an author typed reaches an audience if the policy denies it —
  // whatever the key was called and however deep it was buried.
  await fc.assert(fc.asyncProperty(arbLiveCaptureRun, async (attempts) => {
    assertLiveStreamNeverCarriesSecrets(attempts);
  }), params);

  // A reader is never silently behind, under any delivery order.
  await fc.assert(fc.asyncProperty(
    arbLiveCaptureRun.chain((attempts) => {
      const released = assertLiveStreamNeverCarriesSecrets(attempts);
      return fc.record({
        attempts: fc.constant(attempts),
        plan: arbLiveDeliveryPlan(released.length),
      });
    }),
    async (generated) => {
      const released = assertLiveStreamNeverCarriesSecrets(generated.attempts);
      assertSpectatorConvergesOrReportsAGap(released, generated.plan);
    },
  ), params);

  process.stdout.write(JSON.stringify({
    suite: "live-spaces-fast-check",
    ...params,
    status: "passed",
    lane: "fast-check-short",
  }) + "\n");
}

void main().catch((error) => {
  // SAFETY: a rejected property carries an Error with the shrunk counterexample.
  process.stderr.write(`${String((error as Error).stack ?? error)}\n`);
  process.exitCode = 1;
});
