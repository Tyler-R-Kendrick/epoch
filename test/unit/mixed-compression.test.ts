import assert from "node:assert/strict";
import {
  dedupeSubtrees,
  delimiterSyntaxProvider,
  jsonSyntaxProvider,
  markdownSyntaxProvider,
  planCompression,
  planCompressionAcross,
  selectBuiltinProvider,
  type SyntaxProvider,
} from "@epoch/semantic";

/**
 * Mixed-language compression planning (ADR-0046).
 *
 * A storage-planning tool that only accepts single-language input answers a
 * question nobody has: real repositories hold TypeScript, JSON, TOML, and
 * Markdown in every directory, and both subtree dedup and dictionary derivation
 * improve with corpus size — so the restriction suppressed the effect being
 * measured.
 */
export function runMixedCompressionTests(): void {
  aRepositoryPlansAsGroups();
  sourcesNoProviderMatchesAreReportedNotDropped();
  identicalTextUnderTwoGrammarsIsNotSharedStorage();
  theDictionarySpansEveryGroup();
  theSingleProviderFormIsTheDegenerateCase();
  planningIsDeterministicRegardlessOfInputOrder();
  aDigestCollisionStoresBothDeclarations();
}

const resolver = (source: { readonly path: string }): SyntaxProvider | undefined =>
  selectBuiltinProvider({ path: source.path });

const typescript = (name: string): string =>
  Array.from({ length: 4 }, (_, index) =>
    `function ${name}${index}() {\n  return "@epoch/core is imported everywhere in this corpus";\n}\n`).join("\n");

function aRepositoryPlansAsGroups(): void {
  const plan = planCompressionAcross(
    [
      { path: "src/cli.ts", text: typescript("cli") },
      { path: "src/core.ts", text: typescript("core") },
      { path: "package.json", text: `{\n  "name": "@epoch/core",\n  "version": "0.1.0"\n}\n` },
      { path: "README.md", text: `# Epoch\n\nA line about @epoch/core.\n\n## Install\n\nMore text.\n` },
    ],
    resolver,
  );

  assert.deepEqual(
    plan.groups.map((group) => group.providerId),
    [delimiterSyntaxProvider.id, jsonSyntaxProvider.id, markdownSyntaxProvider.id].sort((a, b) => a.localeCompare(b)),
    "groups are ordered by provider id, so two clones report the same plan",
  );
  assert.equal(plan.groups.find((group) => group.providerId === delimiterSyntaxProvider.id)?.files, 2);
  assert.equal(plan.unplanned.length, 0);
  assert.ok(plan.plainBytes > 0);
  assert.ok(plan.plannedBytes <= plan.plainBytes);
  assert.equal(
    plan.plainBytes,
    plan.groups.reduce((total, group) => total + group.plainBytes, 0),
    "every input's bytes are accounted for by exactly one group",
  );
}

function sourcesNoProviderMatchesAreReportedNotDropped(): void {
  const plan = planCompressionAcross(
    [
      { path: "src/cli.ts", text: typescript("cli") },
      { path: "pnpm-lock.yaml", text: "lockfileVersion: 9\npackages: {}\n" },
      { path: "logo.bin", text: "" },
    ],
    resolver,
  );

  // Sorted by path, like the groups, so a shell's glob order cannot change what
  // the plan reports.
  assert.deepEqual(plan.unplanned.map((source) => source.path), ["logo.bin", "pnpm-lock.yaml"]);
  assert.match(plan.unplanned[0].reason, /no syntax provider matches/u);
  // Their bytes still count toward the total. A plan that omitted them would
  // overstate its own coverage.
  const planned = plan.groups.reduce((total, group) => total + group.plainBytes, 0);
  assert.ok(plan.plainBytes > planned, "unplanned bytes are in the total, not silently dropped");
}

/**
 * Storage sharing across languages is a real opportunity, but it belongs to the
 * byte layer, not to a table keyed by structural identity. Two identical byte
 * sequences parsed under different grammars are different declarations.
 */
function identicalTextUnderTwoGrammarsIsNotSharedStorage(): void {
  const text = `{\n  "shared": "a value long enough to clear the minimum dedup size threshold"\n}\n`;
  const asJson = dedupeSubtrees([{ path: "a.json", text }], jsonSyntaxProvider);
  const asDelimited = dedupeSubtrees([{ path: "a.ts", text }], delimiterSyntaxProvider);

  const jsonKeys = new Set(asJson.entries.map((entry) => entry.key));
  for (const entry of asDelimited.entries) {
    assert.ok(!jsonKeys.has(entry.key), "a dedup key carries the provider that produced it");
  }

  // The same content digest may well coincide; the key is what storage uses.
  const plan = planCompressionAcross(
    [{ path: "a.json", text }, { path: "a.ts", text }],
    resolver,
  );
  const shared = plan.groups.flatMap((group) => group.dedup.entries).filter((entry) => entry.occurrences > 1);
  assert.deepEqual(shared, [], "nothing is claimed as shared across grammars");
}

/**
 * Cross-language repetition — an import path, a licence header, a URL — is
 * exactly what a derived dictionary exists to capture, so deriving per group
 * would discard the redundancy being measured.
 */
function theDictionarySpansEveryGroup(): void {
  // A bare identifier, because the dictionary tokenizer indexes identifiers
  // rather than arbitrary punctuation-laden strings.
  const token = "EpochCommunityCore";
  const sources = [
    { path: "a.ts", text: `import x from "${token}";\nfunction a() { return x; }\n` },
    { path: "b.json", text: `{\n  "dependencies": { "${token}": "0.1.0" }\n}\n` },
    { path: "c.md", text: `# Notes\n\nSee ${token} for details.\n` },
  ];

  const together = planCompressionAcross(sources, resolver);
  assert.ok(
    together.dictionary.entries.some((entry) => entry.token === token),
    "a token appearing once per language is only frequent when the corpus is whole",
  );

  // Per group it appears once and falls below the occurrence threshold, which
  // is the redundancy grouping would have thrown away.
  const perGroup = planCompression([sources[0]], delimiterSyntaxProvider);
  assert.ok(!perGroup.dictionary.entries.some((entry) => entry.token === token));
}

function theSingleProviderFormIsTheDegenerateCase(): void {
  const sources = [{ path: "a.ts", text: typescript("a") }, { path: "b.ts", text: typescript("b") }];
  const single = planCompression(sources, delimiterSyntaxProvider);
  const grouped = planCompressionAcross(sources, resolver);

  assert.equal(grouped.groups.length, 1);
  assert.equal(grouped.groups[0].providerId, single.providerId);
  assert.equal(grouped.groups[0].chunks, single.chunks);
  assert.equal(grouped.plainBytes, single.plainBytes);
  assert.equal(grouped.plannedBytes, single.plannedBytes);
  assert.equal(grouped.dictionary.digest, single.dictionary.digest);
}

function planningIsDeterministicRegardlessOfInputOrder(): void {
  const sources = [
    { path: "z.ts", text: typescript("z") },
    { path: "a.json", text: `{\n  "name": "@epoch/core"\n}\n` },
    { path: "m.md", text: `# Title\n\nBody text here.\n` },
    // Unsupported sources are part of the reported plan, so they are part of
    // what has to be order-independent.
    { path: "q.lock", text: "opaque\n" },
    { path: "b.lock", text: "also opaque\n" },
  ];
  const forward = planCompressionAcross(sources, resolver);
  const reversed = planCompressionAcross([...sources].reverse(), resolver);

  // The dictionary is order-independent by construction; the groups are made so
  // by sorting, because a shell's glob order must not change a recorded plan.
  assert.equal(
    JSON.stringify(forward.groups),
    JSON.stringify(reversed.groups),
    "a shell's argument order cannot change the plan",
  );
  assert.deepEqual(forward.unplanned, reversed.unplanned, "unplanned sources are ordered too");
  assert.deepEqual(forward.unplanned.map((source) => source.path), ["b.lock", "q.lock"]);
  assert.equal(forward.dictionary.digest, reversed.dictionary.digest);
}

/**
 * A digest is not an identity.
 *
 * When two different declarations hashed to the same value, the second was
 * dropped: its bytes stayed in `totalBytes` and never reached `storedBytes`, so
 * the plan reported a saving for content that was never shared. Storage sized
 * from that number would come up short.
 */
function aDigestCollisionStoresBothDeclarations(): void {
  const one = `function alpha() {\n  return "a body long enough to clear the minimum dedup size";\n}\n`;
  const two = `function beta() {\n  return "a different body, also long enough to be counted";\n}\n`;
  // Every subtree hashes the same, which is the case the text comparison exists
  // to catch and the case the drop used to mishandle.
  const collide = () => "collision";

  const result = dedupeSubtrees(
    [{ path: "a.ts", text: one }, { path: "b.ts", text: two }],
    delimiterSyntaxProvider,
    { digest: collide },
  );

  assert.equal(result.entries.length, 2, "distinct text is kept, not dropped");
  assert.equal(new Set(result.entries.map((entry) => entry.key)).size, 2, "and gets distinct storage keys");
  assert.equal(result.savedBytes, 0, "nothing was shared, so nothing is claimed as saved");
  assert.equal(result.storedBytes, result.totalBytes);

  // The keys a collision produces do not depend on the order the sources came
  // in, or two clones would name the same declaration differently.
  const reversed = dedupeSubtrees(
    [{ path: "b.ts", text: two }, { path: "a.ts", text: one }],
    delimiterSyntaxProvider,
    { digest: collide },
  );
  assert.deepEqual(
    result.entries.map((entry) => [entry.key, entry.text]).sort(),
    reversed.entries.map((entry) => [entry.key, entry.text]).sort(),
  );
}
