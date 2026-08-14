/**
 * Deterministic randomized conformance (smoke lane) — fixed seeds, no shrinking.
 * Not coverage-guided fuzzing; see ADR-0052 and test/fuzz/README.md.
 */
import { property } from "./deterministic";
import {
  assertCanonicalIdRoundtrip,
  assertChunkManifestRoundtrip,
  assertForgeCodecSubset,
  assertPktLineRoundtrip,
  assertProtocolEventClosed,
  assertRemoteHelperClosed,
  assertRevsetDeterministic,
  assertSwhidRoundtrip,
} from "./oracles/parsers";
import type { ForgeObject } from "@epoch/forge";

const SEED = 0x46555a5a;
const CASES = 96;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

async function main(): Promise<void> {
  await property("CHANGE-GRAPH-FUZZ-001 protocol IDs reject pre-release spellings", SEED, CASES, (random) => {
    assertCanonicalIdRoundtrip(random.bytes(32));
  });

  await property("CHANGE-GRAPH-FUZZ-002 event schema JSON fails closed", SEED ^ 1, CASES, (random, index) => {
    const principalId = id("principal", random.integer(ALPHABET.length));
    const budgetId = id("budget", random.integer(ALPHABET.length));
    assertProtocolEventClosed({
      schemaVersion: 1,
      type: random.pick(["agent.budget.allocated", "agent.budget.consumed"] as const),
      eventId: `event-${index}`,
      revisionId: `event-${index}`,
      body: { budgetId, principalId, units: random.integer(1_000_000) },
    });
  });

  await property("CHANGE-GRAPH-FUZZ-003 revset parser is bounded and deterministic", SEED ^ 2, CASES, (random) => {
    const atom = random.pick(["heads()", "roots()", "pending()", "approved()", "mergeable()"] as const);
    const other = random.pick(["conflicts()", "author(alice)", "change(change1)"] as const);
    assertRevsetDeterministic(`${atom} ${random.pick(["|", "&", "-"] as const)} ${other}`);
  });

  await property("CHANGE-GRAPH-FUZZ-004 chunk manifest JSON and packet ranges stay bounded", SEED ^ 3, 32, (random) => {
    assertChunkManifestRoundtrip(random.bytes(1 + random.integer(180_000)), "application/octet-stream");
    assertPktLineRoundtrip(random.bytes(1 + random.integer(1024)));
  });

  await property("CHANGE-GRAPH-FUZZ-005 Git refs headers and push options reject injection", SEED ^ 4, CASES, (random, index) => {
    assertRemoteHelperClosed(String(random.integer(4)), `proposal-${index}`);
  });

  await property("CHANGE-GRAPH-FUZZ-006 forge codecs preserve declared public subset", SEED ^ 5, 32, (random, index) => {
    assertForgeCodecSubset(forgeObject(index, random.integer(4)), index);
  });

  await property("CHANGE-GRAPH-FUZZ-007 SWHID parser rejects malformed variants", SEED ^ 6, CASES, (random) => {
    assertSwhidRoundtrip({
      version: 1,
      kind: random.pick(["cnt", "dir", "rev", "rel", "snp"] as const),
      digest: random.bytes(20).toString("hex"),
      qualifiers: { path: `/src/${random.next()}.ts` },
    });
  });

  process.stdout.write(JSON.stringify({
    suite: "change-graph-parser-fuzz",
    seed: SEED,
    cases: CASES,
    status: "passed",
    lane: "deterministic-smoke",
  }) + "\n");
}

function id(kind: string, index: number): string {
  return `epoch:${kind}:${ALPHABET[index % ALPHABET.length]!.repeat(52)}`;
}

function forgeObject(index: number, kindIndex: number): ForgeObject {
  return {
    kind: (["issue", "change", "comment", "release"] as const)[kindIndex]!,
    objectId: `forge-${index}`,
    repositoryId: "repo-epoch",
    title: `Object ${index}`,
    body: `Body ${index}`,
    state: "open",
    authorId: "principal-alice",
    createdAt: index,
    updatedAt: index + 1,
    visibility: "public",
    revision: `revision-${index}`,
  };
}

void main().catch((error: unknown) => {
  process.stderr.write(`${String((error as Error).stack ?? error)}\n`);
  process.exitCode = 1;
});
