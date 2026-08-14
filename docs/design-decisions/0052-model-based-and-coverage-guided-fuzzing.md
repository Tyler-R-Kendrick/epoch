# ADR-0052: Model-Based And Coverage-Guided Fuzzing

Status: Accepted

## Context

Epoch already ships a useful deterministic fuzz-smoke suite under
`test/fuzz/`. It targets canonical IDs, event schemas, revsets, chunk
manifests, Git packet lines and refs, forge codecs, and SWHIDs through a
custom `SeededGenerator` with fixed seeds and a bounded case count.

That suite is valuable and reproducible, but it is not coverage-guided
fuzzing: it has no automatic shrinking, corpus evolution, or branch-directed
exploration. Calling it "fuzz" without that distinction understates what
full campaigns provide and overstates what PR smoke currently proves.

The highest-value inputs for Epoch are not arbitrary strings. They are
sequences of DVCS and collaboration operations over the Change Graph
([ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md),
[ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)). Parser
boundaries still need byte-level campaigns. PR gates must stay fast on free
public runners ([`docs/ai-automation-strategy.md`](../ai-automation-strategy.md)
Finding 1).

## Decision

Epoch runs **three lanes**:

1. **Deterministic smoke (PR / `verify`)** — Keep
   `change-graph:fuzz-smoke` and fixed seeds forever. Treat it as
   deterministic randomized conformance, not coverage-guided fuzzing.
2. **Structured property testing with shrinking (PR short / schedule long)** —
   Use `fast-check` for structured generation. The **primary** target is a
   model-based command history over `SignedChangeGraphStore`: create/revise
   changes, parallel heads, serialize/deserialize, duplicate/reorder/omit
   events, merge, conflict decide, snapshot+tail, sync/hydrate, and Git
   ingest for the declared common subset. Failures must shrink to a minimal
   command list.
3. **Coverage-guided parser fuzzing (schedule + regression)** — Wrap
   individual parsers and codecs with Jazzer.js. Persist every discovered
   failure as a corpus entry and an explicit regression test. Version
   corpora (`test/fuzz/corpus/v1/…`) so old encodings stay exercised when
   formats evolve.

**PR / `test:runtime`** runs smoke + short fast-check + corpus regression
only. Jazzer stays off that path so libFuzzer cannot rewrite `c8` maps.
**Scheduled** `.github/workflows/fuzz-campaign.yml` runs the long history
campaign and Jazzer mutation budgets. The full campaign is not a required
PR check.

### Properties The History Model Must Guard

- Valid delivery orders converge to the same canonical state.
- Duplicate events are idempotent.
- Missing dependencies fail closed or remain explicitly pending.
- Snapshot plus tail replay equals full replay.
- Serialization and deserialization preserve graph identity.
- Merge never silently drops reachable data.
- Conflict state is preserved until explicitly resolved.
- Invalid refs and paths never cross filesystem boundaries.
- Equivalent operation histories produce equivalent normalized graph state.
- Export/import through adapters preserves only the declared common semantic
  subset ([ADR-0035](0035-forge-adapters-and-mirror-authority.md)).

### Corpus Promotion

On crash or property failure: minimize, write
`test/fuzz/corpus/v1/<target>/<hash>`, and add
`test/fuzz/regressions/<name>.test.ts` that replays the minimized input.
Never delete an older corpus version; add `v2/` alongside `v1/`.
Corpus paths are binary in `.gitattributes` so whitespace-only inputs stay
byte-for-byte.

### Deferred

Maelstrom, Jepsen, and Elle distributed consistency campaigns are **not**
part of this delivery. Revisit when multi-node gossip/replica surfaces are
mature enough that an adapter can expose graph/event operations as a
distributed workload. FoundationDB and TigerBeetle deterministic simulation
remain design inspiration for a future seed-reproducible multi-node harness,
not an implementation commitment here.

## Escape And Consequences

- Contributors and agents must not describe smoke-only green as "full
  fuzzing."
- Long campaigns can find bugs overnight without blocking every PR.
- Maintaining corpora and regressions increases review surface; promotion
  rules keep that intentional rather than ad-hoc.

## Revisit Criteria

Revisit when: (1) gossip/multi-node sync needs Maelstrom-style partition
testing; (2) Jazzer.js or fast-check cease to fit the Node toolchain; (3) a
required PR fuzz budget becomes affordable without violating the free-runner
assumption; or (4) a new protocol encoding needs a `v2` corpus lane with
different oracles.

## Coverage

- `test/fuzz/change-graph-parser.fuzz.test.ts` — deterministic smoke
- `test/fuzz/properties/parser-roundtrip.fast-check.test.ts` — short fast-check
- `test/fuzz/history/history.fast-check.test.ts` — history command model
- `test/fuzz/jazzer/*` — coverage-guided parser targets
- `test/fuzz/regressions/*` — promoted minimized failures
- `.github/workflows/fuzz-campaign.yml` — scheduled campaign
