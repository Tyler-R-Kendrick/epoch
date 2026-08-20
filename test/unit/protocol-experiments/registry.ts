import { createHash } from "node:crypto";
import { isObjectNonNull, isString } from "../../helpers/type-guards";

export type ExperimentVerdict = "rejected" | "pending" | "accepted";

export type ExperimentGate = {
  readonly id: string;
  readonly title: string;
  readonly verdict: ExperimentVerdict;
  readonly reason: string;
  readonly runnable: boolean;
};

export const PRODUCTION_SHIP = "(none yet)" as const;

const GATES: readonly ExperimentGate[] = [
  { id: "E01", title: "bridge throughput", verdict: "rejected", reason: "Prosody harness does not prove ≥25% delta; adapter off", runnable: true },
  { id: "E02", title: "zero-mechanism bridge solver", verdict: "rejected", reason: "static routing matches in-process double", runnable: true },
  { id: "E03", title: "state-resolution cost ladder", verdict: "rejected", reason: "no preregistered contention evidence", runnable: true },
  { id: "E04", title: "parse-vs-meaning state validity", verdict: "rejected", reason: "structural 1.0 / semantic 0.0 control", runnable: true },
  { id: "E05", title: "identity portability", verdict: "rejected", reason: "exit bindings survive but forged proofs not yet 100% corpus", runnable: true },
  { id: "E06", title: "moderation latency under load", verdict: "rejected", reason: "SLA-by-drops would be harness failure; not measured", runnable: true },
  { id: "E07", title: "appeal reversibility", verdict: "rejected", reason: "on/off identical would be non-load-bearing", runnable: true },
  { id: "E08", title: "Sybil dose ladder", verdict: "rejected", reason: "cost params not load-bearing yet", runnable: true },
  { id: "E09", title: "migration safety", verdict: "rejected", reason: "byte-identical-but-wrong state is invalidated", runnable: true },
  { id: "E10", title: "real-PDS graduation", verdict: "rejected", reason: "adapter exists, default off; interop corpus incomplete", runnable: true },
  { id: "E11", title: "MLS-over-linear-log PoC", verdict: "pending", reason: "deferred-pending-design placeholder", runnable: false },
  { id: "E12", title: "labeler/moderation-service conformance", verdict: "pending", reason: "no labeler fixture", runnable: false },
  { id: "E13", title: "livestream privacy vs ADR-0050", verdict: "rejected", reason: "control still default rejected pending matched streamer corpus", runnable: true },
  { id: "E14", title: "grant-attenuation fuzzing vs ADR-0034", verdict: "rejected", reason: "revoked-grant use fails in unit tests; not promoted", runnable: true },
  { id: "E15", title: "Tangled interop fit matrix", verdict: "rejected", reason: "no scalar score; identity-compromise cells forbidden", runnable: true },
  { id: "E16", title: "native-channel parity", verdict: "rejected", reason: "issue-backed chat matches on some metrics; channels stay gated", runnable: true },
];

export function experimentGates(): readonly ExperimentGate[] {
  return GATES;
}

export function standingProductionRow(): string {
  return `Production ship: ${PRODUCTION_SHIP}`;
}

export function configHash<T>(config: T): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

export function evaluateEvidence(input: {
  readonly gateId: string;
  readonly evidence: unknown;
}): ExperimentVerdict {
  const gate = GATES.find((item) => item.id === input.gateId);
  if (!gate || !gate.runnable) return gate?.verdict ?? "rejected";
  if (input.evidence === null || input.evidence === undefined) return "rejected";
  if (isString(input.evidence) && /garbage|forged|unsigned/i.test(input.evidence)) {
    return "rejected";
  }
  if (isObjectNonNull(input.evidence) && "promote" in input.evidence) {
    return "rejected";
  }
  return "rejected";
}
