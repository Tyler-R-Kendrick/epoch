import assert from "node:assert/strict";
import {
  applySemanticPatch,
  BUILTIN_SYNTAX_PROVIDERS,
  chunkBySyntax,
  delimiterSyntaxProvider,
  deriveDictionary,
  dedupeSubtrees,
  encodeSemanticDelta,
  formatSemanticPatch,
  jsonSyntaxProvider,
  markdownSyntaxProvider,
  planCompression,
  indexDigest,
  indexTree,
  isAncestorPath,
  joinPath,
  node,
  parentPathOf,
  pathStep,
  selectBuiltinProvider,
  semanticDiff,
  semanticMerge,
  SemanticPatchError,
  tomlSyntaxProvider,
  type SyntaxProvider,
} from "@epoch/semantic";

export function runSemanticPipelineTests(): void {
  structuralPathsSurviveReformatting();
  patchAppliesToReformattedTarget();
  movedDeclarationIsOneEditNotTwo();
  renamedMemberIsReportedAsARename();
  roundTripsEveryEditKind();
  disjointEditsMergeWithoutConflict();
  commutativeContainersMergeIndependentInsertions();
  commutativeMergeIsOrderIndependent();
  genuineDisagreementStaysAConflict();
  conflictSignatureIgnoresFormatting();
  conflictPathSurvivesReformatting();
  deletionAgainstEditIsAConflict();
  subtreeDedupSharesRepeatedDeclarations();
  syntaxChunkingIsStableUnderReindentation();
  dictionaryDerivationIsDeterministic();
  semanticDeltaTracksMeaningNotFormatting();
  providerSelectionIsDeterministic();
  malformedContentFailsClosed();
  providersHandleNestedAndQuotedContent();
  structuralPathHelpersRoundTrip();
  declarationsMoveBetweenContainers();
  insertedParentsCarryTheirChildren();
  patchApplicationRejectsAmbiguousEdits();
  mergeReportsUnapplicableAndNestedEdits();
}

const CODE = `function alpha() {\n  return 1;\n}\n\nfunction beta() {\n  return 2;\n}\n`;

function structuralPathsSurviveReformatting(): void {
  const dense = `{"name":"epoch","version":"0.1.0"}`;
  const pretty = `{\n  "name": "epoch",\n  "version": "0.1.0"\n}`;

  const denseIndexPaths = semanticDiff(
    jsonSyntaxProvider.parse(dense),
    jsonSyntaxProvider.parse(dense),
  ).edits;
  assert.deepEqual(denseIndexPaths, [], "identical content must produce no edits");

  // The same member is addressable by the same path in both layouts, which is
  // the property line offsets cannot provide.
  const bumped = pretty.replace("0.1.0", "0.2.0");
  const patch = semanticDiff(jsonSyntaxProvider.parse(pretty), jsonSyntaxProvider.parse(bumped));
  assert.equal(patch.edits.length, 1);
  assert.equal(patch.edits[0].kind, "update");
  assert.ok(patch.edits[0].path.includes("member:version"));
}

function patchAppliesToReformattedTarget(): void {
  const dense = `{"name":"epoch","version":"0.1.0"}`;
  const pretty = `{\n  "name": "epoch",\n  "version": "0.1.0"\n}`;
  const bumped = `{"name":"epoch","version":"0.2.0"}`;

  const patch = semanticDiff(jsonSyntaxProvider.parse(dense), jsonSyntaxProvider.parse(bumped));
  // A unified diff built against the dense text would reject here; a
  // path-keyed patch resolves against the reformatted tree instead.
  const applied = applySemanticPatch(pretty, patch, jsonSyntaxProvider);
  assert.equal(applied, `{\n  "name": "epoch",\n  "version": "0.2.0"\n}`);
}

function movedDeclarationIsOneEditNotTwo(): void {
  const swapped = `function beta() {\n  return 2;\n}\n\nfunction alpha() {\n  return 1;\n}\n`;
  const patch = semanticDiff(delimiterSyntaxProvider.parse(CODE), delimiterSyntaxProvider.parse(swapped));

  assert.equal(patch.edits.length, 1, "a pure permutation is one edit, not a delete plus an insert");
  assert.equal(patch.edits[0].kind, "reorder");
  assert.deepEqual(patch.edits[0].order, ["declaration:beta", "declaration:alpha"]);
  assert.equal(applySemanticPatch(CODE, patch, delimiterSyntaxProvider), swapped);
}

function renamedMemberIsReportedAsARename(): void {
  const before = `{\n  "alpha": 1\n}`;
  const after = `{\n  "renamed": 1\n}`;
  const patch = semanticDiff(jsonSyntaxProvider.parse(before), jsonSyntaxProvider.parse(after));
  assert.equal(patch.edits.length, 1);
  assert.equal(patch.edits[0].kind, "rename");
  assert.ok(patch.edits[0].path.includes("member:alpha"));
  assert.ok(patch.edits[0].toPath?.includes("member:renamed"));
}

function roundTripsEveryEditKind(): void {
  const cases: readonly { label: string; from: string; to: string; provider: SyntaxProvider }[] = [
    { label: "json reformat", from: `{"a":1}`, to: `{\n  "a": 1\n}`, provider: jsonSyntaxProvider },
    { label: "json insert", from: `{\n  "a": 1\n}`, to: `{\n  "a": 1,\n  "b": 2\n}`, provider: jsonSyntaxProvider },
    { label: "json delete", from: `{\n  "a": 1,\n  "b": 2\n}`, to: `{\n  "a": 1\n}`, provider: jsonSyntaxProvider },
    { label: "json update", from: `{\n  "a": 1\n}`, to: `{\n  "a": 9\n}`, provider: jsonSyntaxProvider },
    { label: "json rename", from: `{\n  "a": 1\n}`, to: `{\n  "z": 1\n}`, provider: jsonSyntaxProvider },
    { label: "toml insert", from: `[deps]\nzod = "4"\n`, to: `[deps]\nzod = "4"\nxstate = "5"\n`, provider: tomlSyntaxProvider },
    { label: "code reorder", from: CODE, to: `function beta() {\n  return 2;\n}\n\nfunction alpha() {\n  return 1;\n}\n`, provider: delimiterSyntaxProvider },
    { label: "code body edit", from: CODE, to: CODE.replace("return 1;", "return 11;"), provider: delimiterSyntaxProvider },
    { label: "code append", from: CODE, to: `${CODE}\nfunction gamma() {\n  return 3;\n}\n`, provider: delimiterSyntaxProvider },
    { label: "code remove", from: CODE, to: `function alpha() {\n  return 1;\n}\n`, provider: delimiterSyntaxProvider },
    { label: "markdown section edit", from: `# One\n\nbody\n\n# Two\n\nmore\n`, to: `# One\n\nchanged\n\n# Two\n\nmore\n`, provider: markdownSyntaxProvider },
  ];

  for (const scenario of cases) {
    const patch = semanticDiff(scenario.provider.parse(scenario.from), scenario.provider.parse(scenario.to));
    const applied = applySemanticPatch(scenario.from, patch, scenario.provider);
    assert.equal(applied, scenario.to, `round trip failed for ${scenario.label}`);
  }
}

function disjointEditsMergeWithoutConflict(): void {
  // Both sides edit a different function. Line merge conflicts when the edits
  // land close together; structural merge never sees them as related.
  const left = CODE.replace("return 1;", "return 11;");
  const right = CODE.replace("return 2;", "return 22;");
  const result = semanticMerge(CODE, left, right, delimiterSyntaxProvider);

  assert.deepEqual(result.conflicts, []);
  assert.ok(result.clean);
  assert.ok(result.merged.includes("return 11;"));
  assert.ok(result.merged.includes("return 22;"));
}

function commutativeContainersMergeIndependentInsertions(): void {
  const base = `[dependencies]\nzod = "4"\n`;
  const left = `[dependencies]\nzod = "4"\nxstate = "5"\n`;
  const right = `[dependencies]\nzod = "4"\nplaywright = "1"\n`;
  const result = semanticMerge(base, left, right, tomlSyntaxProvider);

  assert.deepEqual(result.conflicts, []);
  assert.ok(result.merged.includes(`xstate = "5"`));
  assert.ok(result.merged.includes(`playwright = "1"`));
  assert.ok(result.merged.includes(`zod = "4"`));
}

function commutativeMergeIsOrderIndependent(): void {
  // ADR-0031 only permits claiming commutation when both application orders
  // produce the identical canonical result. Assert exactly that.
  const scenarios: readonly { base: string; left: string; right: string; provider: SyntaxProvider }[] = [
    {
      base: `{\n  "a": 1\n}`,
      left: `{\n  "a": 1,\n  "b": 2\n}`,
      right: `{\n  "a": 1,\n  "c": 3\n}`,
      provider: jsonSyntaxProvider,
    },
    {
      base: `import { a } from "a";\n\nfunction main() {\n  return a;\n}\n`,
      left: `import { a } from "a";\nimport { b } from "b";\n\nfunction main() {\n  return a;\n}\n`,
      right: `import { a } from "a";\nimport { c } from "c";\n\nfunction main() {\n  return a;\n}\n`,
      provider: delimiterSyntaxProvider,
    },
  ];

  for (const scenario of scenarios) {
    const forward = semanticMerge(scenario.base, scenario.left, scenario.right, scenario.provider);
    const backward = semanticMerge(scenario.base, scenario.right, scenario.left, scenario.provider);
    assert.ok(forward.clean && backward.clean);
    assert.equal(forward.merged, backward.merged, "commutative merge must not depend on side order");
  }
}

function genuineDisagreementStaysAConflict(): void {
  const base = `{\n  "a": 1\n}`;
  const result = semanticMerge(base, `{\n  "a": 2\n}`, `{\n  "a": 3\n}`, jsonSyntaxProvider);

  assert.equal(result.clean, false);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].kind, "edit-edit");
  assert.equal(result.conflicts[0].left, "2");
  assert.equal(result.conflicts[0].right, "3");
  assert.equal(result.merged, base, "an unresolved conflict must not be guessed at");
}

function conflictSignatureIgnoresFormatting(): void {
  const tight = semanticMerge(`{\n  "a": 1\n}`, `{\n  "a": 2\n}`, `{\n  "a": 3\n}`, jsonSyntaxProvider);
  const loose = semanticMerge(`{"a":1}`, `{"a":2}`, `{"a":3}`, jsonSyntaxProvider);

  assert.equal(tight.conflicts.length, 1);
  assert.equal(loose.conflicts.length, 1);
  // A recorded resolution keyed on this signature still matches after the file
  // is reformatted, which is what generalizes rerere beyond whitespace.
  assert.equal(tight.conflicts[0].signature, loose.conflicts[0].signature);
}

function conflictPathSurvivesReformatting(): void {
  const conflict = semanticMerge(
    `function alpha() {\n  return 1;\n}\n`,
    `function alpha() {\n  return 2;\n}\n`,
    `function alpha() {\n      return 3;\n}\n`,
    delimiterSyntaxProvider,
  );
  assert.equal(conflict.conflicts.length, 1);
  // The conflict names a construct, not a line range.
  assert.ok(conflict.conflicts[0].path.startsWith("declaration:alpha"));
}

function deletionAgainstEditIsAConflict(): void {
  const base = `{\n  "a": 1,\n  "b": 2\n}`;
  const result = semanticMerge(base, `{\n  "a": 1\n}`, `{\n  "a": 1,\n  "b": 9\n}`, jsonSyntaxProvider);

  assert.equal(result.clean, false);
  assert.ok(result.conflicts.some((conflict) => conflict.kind === "edit-delete" || conflict.kind === "ancestor-descendant"));
}

function subtreeDedupSharesRepeatedDeclarations(): void {
  const shared = `function shared() {\n  return "a body long enough to be worth deduplicating";\n}\n`;
  const result = dedupeSubtrees(
    [
      { path: "one.ts", text: `${shared}\nfunction one() {\n  return 1;\n}\n` },
      { path: "two.ts", text: `${shared}\nfunction two() {\n  return 2;\n}\n` },
    ],
    delimiterSyntaxProvider,
  );

  const repeated = result.entries.find((entry) => entry.occurrences === 2);
  assert.ok(repeated !== undefined, "the shared declaration must be recognised across files");
  assert.equal(repeated.paths.length, 2);
  assert.ok(result.savedBytes >= shared.trimEnd().length, "dedup must actually save the repeated bytes");
  assert.ok(result.storedBytes < result.totalBytes);
}

function syntaxChunkingIsStableUnderReindentation(): void {
  const body = Array.from({ length: 8 }, (_, index) =>
    `function fn${index}() {\n  return ${index};\n}\n`).join("\n");
  const reindented = body.replace(/\n {2}/gu, "\n    ");

  const original = chunkBySyntax(body, delimiterSyntaxProvider);
  const shifted = chunkBySyntax(reindented, delimiterSyntaxProvider);

  assert.ok(original.length > 1, "the sample must actually split into several chunks");
  // Byte-rolling chunkers reshuffle every boundary after an indentation change.
  // Snapping to node edges keeps the boundary count and the node they close on.
  assert.equal(original.length, shifted.length);
  assert.deepEqual(original.map((chunk) => chunk.path), shifted.map((chunk) => chunk.path));

  // Grouping several nodes per chunk stays stable for the same reason.
  const grouped = chunkBySyntax(body, delimiterSyntaxProvider, { nodesPerChunk: 3 });
  const groupedShifted = chunkBySyntax(reindented, delimiterSyntaxProvider, { nodesPerChunk: 3 });
  assert.deepEqual(grouped.map((chunk) => chunk.path), groupedShifted.map((chunk) => chunk.path));
  assert.ok(grouped.length < original.length);
}

function dictionaryDerivationIsDeterministic(): void {
  const corpus = [
    `import { Repository } from "@epoch/core";\nfunction one() { return Repository; }\n`,
    `import { Repository } from "@epoch/core";\nfunction two() { return Repository; }\n`,
    `import { Repository } from "@epoch/core";\nfunction three() { return Repository; }\n`,
  ];
  const first = deriveDictionary(corpus);
  const second = deriveDictionary([...corpus]);

  assert.equal(first.digest, second.digest, "the same corpus must derive the same dictionary");
  assert.ok(first.entries.length > 0);
  assert.ok(first.entries.some((entry) => entry.token === "Repository"));
  assert.ok(first.coveredBytes > 0);
}

function semanticDeltaTracksMeaningNotFormatting(): void {
  const base = Array.from({ length: 12 }, (_, index) =>
    `function fn${index}() {\n  return ${index};\n}\n`).join("\n");
  const reindented = base.replace(/\n {2}/gu, "\n        ");
  const changed = base.replace("return 5;", "return 500;");

  const meaningful = encodeSemanticDelta(base, changed, delimiterSyntaxProvider);
  assert.equal(meaningful.patch.edits.length, 1);
  // A byte delta would rewrite every line of the reindented file; a semantic
  // delta records the same number of edits either way.
  const reformatted = encodeSemanticDelta(base, reindented, delimiterSyntaxProvider);
  assert.ok(meaningful.encodedBytes < meaningful.plainBytes);
  assert.ok(reformatted.patch.edits.length <= base.split("\n\n").length);

  const plan = planCompression([{ path: "base.ts", text: base }], delimiterSyntaxProvider);
  assert.equal(plan.providerId, delimiterSyntaxProvider.id);
  assert.ok(plan.plainBytes > 0);
  assert.ok(plan.plannedBytes <= plan.plainBytes);
}

function providerSelectionIsDeterministic(): void {
  assert.equal(selectBuiltinProvider({ path: "package.json" })?.id, jsonSyntaxProvider.id);
  assert.equal(selectBuiltinProvider({ path: "epoch.toml" })?.id, tomlSyntaxProvider.id);
  assert.equal(selectBuiltinProvider({ path: "README.md" })?.id, markdownSyntaxProvider.id);
  assert.equal(selectBuiltinProvider({ path: "src/core.ts" })?.id, delimiterSyntaxProvider.id);
  assert.equal(selectBuiltinProvider({ mimeType: "application/json" })?.id, jsonSyntaxProvider.id);
  assert.equal(selectBuiltinProvider({ path: "photo.bin" }), undefined);
}

function malformedContentFailsClosed(): void {
  assert.throws(() => jsonSyntaxProvider.parse(`{"a": }`), SyntaxError);
  assert.throws(() => jsonSyntaxProvider.parse(`{"a": 1`), SyntaxError);

  // A patch naming a path the target does not have is reported, not guessed.
  const patch = semanticDiff(
    jsonSyntaxProvider.parse(`{\n  "a": 1\n}`),
    jsonSyntaxProvider.parse(`{\n  "a": 2\n}`),
  );
  assert.throws(
    () => applySemanticPatch(`{\n  "different": 1\n}`, patch, jsonSyntaxProvider),
    (error: unknown) => error instanceof SemanticPatchError && error.code === "missing-path",
  );

  const rendered = formatSemanticPatch(patch);
  assert.ok(rendered.startsWith("diff --epoch-semantic"));
  assert.ok(rendered.includes("level syntax"));
}

function structuralPathHelpersRoundTrip(): void {
  const source = `{"a": 1}`;
  const child = node("member", source, 1, 7, { name: "a" });
  const root = node("object", source, 0, 8, { children: [child], commutative: true, separator: ",\n" });

  assert.equal(pathStep(child, [child]), "member:a");
  const firstUnnamed = node("scalar", source, 1, 2);
  const secondUnnamed = node("scalar", source, 3, 4);
  assert.equal(pathStep(firstUnnamed, [firstUnnamed, secondUnnamed]), "scalar#0");
  assert.equal(pathStep(secondUnnamed, [firstUnnamed, secondUnnamed]), "scalar#1");
  // A named sibling must not renumber the unnamed ones around it.
  assert.equal(pathStep(secondUnnamed, [firstUnnamed, child, secondUnnamed]), "scalar#1");
  assert.equal(joinPath("", "object#0"), "object#0");
  assert.equal(joinPath("object#0", "member:a"), "object#0/member:a");
  assert.equal(parentPathOf("object#0/member:a"), "object#0");
  assert.equal(parentPathOf("object#0"), "");
  assert.ok(isAncestorPath("object#0", "object#0/member:a"));
  assert.ok(isAncestorPath("", "anything"));
  assert.equal(isAncestorPath("object#1", "object#0/member:a"), false);

  // Names containing separators must not be able to forge a deeper path.
  const tricky = node("member", `x`, 0, 1, { name: "a/b:c" });
  assert.equal(pathStep(tricky, [tricky]), "member:a\\/b\\:c");

  const index = indexTree({ providerId: "t", language: "t", source, root });
  assert.equal(index.childrenOf("").length, 1);
  assert.ok(index.byPath.has("member:a"));
  assert.equal(indexDigest("same"), indexDigest("same"));
  assert.notEqual(indexDigest("same"), indexDigest("other"));

  assert.equal(BUILTIN_SYNTAX_PROVIDERS.length, 4);
  assert.ok(BUILTIN_SYNTAX_PROVIDERS.every((provider) => provider.fidelity === "grammar" || provider.fidelity === "heuristic"));
}

function declarationsMoveBetweenContainers(): void {
  // A declaration relocated into a different enclosing block is one move, not
  // an unrelated delete and insert.
  const before = `class A {\n  function shared() {\n    return 1;\n  }\n}\n\nclass B {\n}\n`;
  const after = `class A {\n}\n\nclass B {\n  function shared() {\n    return 1;\n  }\n}\n`;
  const patch = semanticDiff(delimiterSyntaxProvider.parse(before), delimiterSyntaxProvider.parse(after));

  const moves = patch.edits.filter((edit) => edit.kind === "move");
  assert.equal(moves.length, 1, "a relocation across containers is one move, not a delete plus an insert");
  assert.ok(moves[0].path.startsWith("declaration:A"));
  assert.ok(moves[0].toPath?.startsWith("declaration:B"));
  assert.equal(patch.edits.some((edit) => edit.kind === "delete" || edit.kind === "insert"), false);
}

function insertedParentsCarryTheirChildren(): void {
  // An inserted container's text already contains its children, so the child
  // edits must not also be emitted or they would double-apply.
  const before = `{\n  "a": 1\n}`;
  const after = `{\n  "a": 1,\n  "nested": {\n    "x": 1,\n    "y": 2\n  }\n}`;
  const patch = semanticDiff(jsonSyntaxProvider.parse(before), jsonSyntaxProvider.parse(after));

  const inserts = patch.edits.filter((edit) => edit.kind === "insert");
  assert.equal(inserts.length, 1, "only the inserted container is reported");
  assert.equal(applySemanticPatch(before, patch, jsonSyntaxProvider), after);

  const removal = semanticDiff(jsonSyntaxProvider.parse(after), jsonSyntaxProvider.parse(before));
  assert.equal(removal.edits.filter((edit) => edit.kind === "delete").length, 1);
  assert.equal(applySemanticPatch(after, removal, jsonSyntaxProvider), before);
}

function patchApplicationRejectsAmbiguousEdits(): void {
  const source = `{\n  "a": 1\n}`;
  const patch = semanticDiff(jsonSyntaxProvider.parse(source), jsonSyntaxProvider.parse(`{\n  "a": 2\n}`));

  // Two edits rewriting the same span cannot both apply; that is reported
  // rather than silently resolved by ordering.
  const doubled = { ...patch, edits: [...patch.edits, ...patch.edits] };
  assert.throws(
    () => applySemanticPatch(source, doubled, jsonSyntaxProvider),
    (error: unknown) => error instanceof SemanticPatchError && error.code === "overlapping-edits",
  );

  const unsupported = { ...patch, edits: [{ kind: "teleport", path: "object#0" }] } as unknown as typeof patch;
  assert.throws(
    () => applySemanticPatch(source, unsupported, jsonSyntaxProvider),
    (error: unknown) => error instanceof SemanticPatchError && error.code === "unsupported-edit",
  );

  // Appending a declaration to an empty document exercises the root-level
  // insertion point, where there is no sibling to anchor against.
  const appended = semanticDiff(
    delimiterSyntaxProvider.parse(""),
    delimiterSyntaxProvider.parse(`function only() {\n  return 1;\n}\n`),
  );
  assert.ok(applySemanticPatch("", appended, delimiterSyntaxProvider).includes("function only()"));
}

function mergeReportsUnapplicableAndNestedEdits(): void {
  // One side rewrites an enclosing declaration while the other edits inside
  // it. Conservative behavior is a conflict, not a guess (ADR-0031).
  const base = `function alpha() {\n  return 1;\n}\n`;
  const left = `function renamed() {\n  return 1;\n}\n`;
  const right = `function alpha() {\n  return 2;\n}\n`;
  const result = semanticMerge(base, left, right, delimiterSyntaxProvider);

  assert.equal(result.clean, false);
  assert.ok(result.conflicts.length >= 1);
  assert.ok(result.conflicts.every((conflict) => conflict.signature.length > 0));

  // Both sides making the identical edit is agreement, not a conflict.
  const agreed = semanticMerge(base, right, right, delimiterSyntaxProvider);
  assert.ok(agreed.clean);
  assert.equal(agreed.merged, right);
}

function providersHandleNestedAndQuotedContent(): void {
  // Braces inside strings and comments must not be mistaken for block
  // structure, or every declaration after them would be misattributed.
  const tricky = [
    `// a comment with { an unbalanced brace`,
    `/* block comment } with braces { */`,
    `function withStrings() {`,
    `  const a = "a } string";`,
    `  const b = 'another { one';`,
    "  const c = `template } literal`;",
    `  return a + b + c;`,
    `}`,
    ``,
    `function after() {`,
    `  return 1;`,
    `}`,
    ``,
  ].join("\n");

  const tree = delimiterSyntaxProvider.parse(tricky);
  const names = tree.root.children.map((child) => child.name);
  assert.deepEqual(names, ["withStrings", "after"], "quoted and commented braces must not split declarations");

  const edited = tricky.replace("return 1;", "return 2;");
  const patch = semanticDiff(delimiterSyntaxProvider.parse(tricky), delimiterSyntaxProvider.parse(edited));
  assert.equal(patch.edits.length, 1);
  assert.ok(patch.edits[0].path.startsWith("declaration:after"));
  assert.equal(applySemanticPatch(tricky, patch, delimiterSyntaxProvider), edited);

  // JSON arrays are positional, and escapes must not terminate a string early.
  const arrays = `{\n  "items": [1, 2, 3],\n  "quoted": "a \\" brace } here"\n}`;
  const arrayTree = jsonSyntaxProvider.parse(arrays);
  assert.equal(arrayTree.root.children[0].children.length, 2);
  const bumped = arrays.replace("[1, 2, 3]", "[1, 2, 4]");
  const arrayPatch = semanticDiff(jsonSyntaxProvider.parse(arrays), jsonSyntaxProvider.parse(bumped));
  assert.equal(applySemanticPatch(arrays, arrayPatch, jsonSyntaxProvider), bumped);

  // A fenced code block containing '#' must not register as a heading.
  const markdown = [
    `# Real Heading`,
    ``,
    "```",
    `# not a heading`,
    "```",
    ``,
    `## Real Subheading`,
    ``,
    `body`,
    ``,
  ].join("\n");
  const sections = markdownSyntaxProvider.parse(markdown).root.children;
  assert.equal(sections.length, 1);
  assert.equal(sections[0].name, "h1 Real Heading");
  assert.deepEqual(sections[0].children.map((child) => child.name), ["h2 Real Subheading"]);

  // TOML comments and blank lines are trivia, not entries.
  const toml = `# leading comment\n\n[deps]\n# inline note\nzod = "4"   # trailing\n\n[build]\ntarget = "es2022"\n`;
  const tables = tomlSyntaxProvider.parse(toml).root.children;
  assert.deepEqual(tables.map((table) => table.name), ["deps", "build"]);
  assert.deepEqual(tables[0].children.map((entry) => entry.name), ["zod"]);
}
