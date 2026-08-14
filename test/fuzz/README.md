# Epoch Fuzz Lanes

Epoch uses three complementary lanes ([ADR-0052](../../docs/design-decisions/0052-model-based-and-coverage-guided-fuzzing.md)).
Do not call the smoke suite "coverage-guided fuzzing."

| Lane | Entry | When |
|---|---|---|
| Deterministic smoke | `npm run change-graph:fuzz-smoke` | Every PR / `test:runtime` |
| Short fast-check | `npm run fuzz:fast-check` | Every PR / `test:runtime` |
| Corpus regression | `npm run fuzz:regression` | Every PR / `test:runtime` |
| History long run | `npm run fuzz:history:long` | Scheduled campaign |
| Jazzer.js campaigns | `npm run fuzz:jazzer` | Scheduled campaign |
| Jazzer regression | `npm run fuzz:jazzer:regression` | Scheduled campaign / local |

Jazzer is not part of `test:runtime` or `coverage`. PR replay is
`corpus-regression` plus explicit minimized tests. Jazzer children also drop
`NODE_OPTIONS` / `NODE_V8_COVERAGE` so a manual `c8` wrap cannot rewrite
package coverage maps.

## Layout

```
test/fuzz/
  deterministic.ts              # SeededGenerator — smoke only
  change-graph-parser.fuzz.test.ts
  oracles/                      # Shared parse/assert helpers
  arbitraries/                  # fast-check generators
  properties/                   # Short shrinking properties
  history/                      # Command model over SignedChangeGraphStore
  jazzer/                       # Coverage-guided targets
  corpus/v1/<target>/           # Versioned seed + crash corpora
  regressions/                  # Explicit minimized repros
  promote.mjs                   # Minimize → corpus + regression helper
```

## Corpus Promotion

1. Minimize the failing input (fast-check shrink or Jazzer minimize).
2. Write `corpus/v1/<target>/<sha256-or-stable-id>`.
3. Add `regressions/<name>.test.ts` that replays it.
4. Never delete older corpus versions; add `v2/` when encodings change.

Corpus files are marked binary in `.gitattributes` so whitespace-only and
trailing-space inputs stay byte-for-byte.

## Smoke Seeds

Parser smoke uses seed `0x46555a5a` and a fixed case count. Case failures
report `seed`, `case`, and `caseSeed` for exact local reproduction.

The history suite always runs, in addition to shrinking command lists:
snapshot then tail replay, missing-revision fail-closed, rejected conflicts
blocking merge, git ingest of a declared subset, and workspace path escape.
