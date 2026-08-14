import fc from "fast-check";

const KIND = ["cnt", "dir", "rev", "rel", "snp"] as const;
const REVSET_ATOMS = ["heads()", "roots()", "pending()", "approved()", "mergeable()"] as const;
const REVSET_OTHER = ["conflicts()", "author(alice)", "change(change1)"] as const;
const FORGE_KINDS = ["issue", "change", "comment", "release"] as const;

export const arbCanonicalBytes = fc.uint8Array({ minLength: 32, maxLength: 32 });

export const arbRevsetExpression = fc.tuple(
  fc.constantFrom(...REVSET_ATOMS),
  fc.constantFrom("|", "&", "-"),
  fc.constantFrom(...REVSET_OTHER),
).map(([a, op, b]) => `${a} ${op} ${b}`);

export const arbPktPayload = fc.uint8Array({ minLength: 1, maxLength: 1024 }).map((u) => Buffer.from(u));

export const arbChunkBytes = fc.uint8Array({ minLength: 1, maxLength: 12_000 }).map((u) => Buffer.from(u));

export const arbSwhidValue = fc.record({
  version: fc.constant(1 as const),
  kind: fc.constantFrom(...KIND),
  digest: fc.uint8Array({ minLength: 20, maxLength: 20 }).map((u) => Buffer.from(u).toString("hex")),
  qualifiers: fc.record({ path: fc.stringMatching(/^\/[a-z0-9/_-]{1,48}\.ts$/u) }),
});

export const arbForgeObject = fc.tuple(fc.nat({ max: 200 }), fc.integer({ min: 0, max: 3 })).map(([index, kindIndex]) => ({
  kind: FORGE_KINDS[kindIndex]!,
  objectId: `forge-${index}`,
  repositoryId: "repo-epoch",
  title: `Object ${index}`,
  body: `Body ${index}`,
  state: "open" as const,
  authorId: "principal-alice",
  createdAt: index,
  updatedAt: index + 1,
  visibility: "public" as const,
  revision: `revision-${index}`,
}));

export const arbBudgetEvent = fc.tuple(
  fc.nat({ max: 500 }),
  fc.constantFrom("agent.budget.allocated", "agent.budget.consumed"),
  fc.nat({ max: 1_000_000 }),
).map(([index, type, units]) => ({
  schemaVersion: 1 as const,
  type,
  eventId: `event-${index}`,
  revisionId: `event-${index}`,
  body: {
    budgetId: `epoch:budget:${"a".repeat(52)}`,
    principalId: `epoch:principal:${"b".repeat(52)}`,
    units,
  },
}));

export const arbRemoteVerbosity = fc.integer({ min: 0, max: 3 }).map(String);
export const arbProposalName = fc.stringMatching(/^proposal-[a-z0-9-]{1,24}$/u);

/** PR-time short budget. Campaigns override via env. */
export function shortFcParams(): { numRuns: number; seed: number; endOnFailure: boolean } {
  const numRuns = Number(process.env.EPOCH_FUZZ_RUNS ?? "96");
  const seed = Number(process.env.EPOCH_FUZZ_SEED ?? "0x46415354");
  return { numRuns: Number.isFinite(numRuns) && numRuns > 0 ? numRuns : 96, seed: seed >>> 0, endOnFailure: true };
}

export function longFcParams(): { numRuns: number; seed: number; endOnFailure: boolean } {
  const numRuns = Number(process.env.EPOCH_FUZZ_RUNS ?? "400");
  const seed = Number(process.env.EPOCH_FUZZ_SEED ?? Date.now());
  return { numRuns: Number.isFinite(numRuns) && numRuns > 0 ? numRuns : 400, seed: seed >>> 0, endOnFailure: true };
}
