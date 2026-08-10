# Command family: replay

## When to load this file

Load it to reconstruct state from recorded events, verify deterministic
conformance, fork history at an exact event, or compare two runs. Replay is
how you prove the projection did not drift and how first-divergence analysis
gets its counterfactual branch.

## Prerequisites

- An initialized project with an ActiveGraph event history under
  `.gauntlet/state/`.

## Commands

Exactly one explicit mode per invocation:

```bash
uv run --project <skill-root> gauntlet replay rebuild
uv run --project <skill-root> gauntlet replay strict
uv run --project <skill-root> gauntlet replay fork
uv run --project <skill-root> gauntlet replay diff
```

- `rebuild` — permissive state rebuild: project the recorded events into
  state without re-firing behaviors. Historical projection; read-only.
- `strict` — deterministic conformance replay: re-fire the registered
  deterministic behaviors from the recorded seed events and compare the
  resulting event stream with the log. Any divergence is a failed gate
  (exit 4), never a warning.
- `fork` — fork the run at an exact recorded event into a new run that
  reuses the recorded prefix; the new suffix is then executed
  intentionally (for example, an alternate repair after the earliest
  divergence found in trace analysis).
- `diff` — structural diff of state, artifacts, observations, and decisions
  between a parent run and one of its forks (or two runs).

## Honesty rule

Only the *recorded prefix* is deterministically replayed. Anything executed
after a replayed prefix (a live suffix) is new execution and is never
described as "deterministic replay" — by you or by the records. A fork
improves causal attribution but does not prove causality when the
environment, hidden model state, or evaluator is not controlled.

## Durable outputs

- A `ReplayRecordV1` per invocation pinning the resulting state and event
  digests (canonical JSON, `sha256:`) plus code, projector, schema, skill,
  and policy digests, persisted to the ledger (kind `decisions`) so later
  audits can prove the projection did not drift. The store location is
  summarized as a kind, never a URL, so no credentials can leak into the
  ledger.
- `fork` additionally creates the forked run in the ActiveGraph store.

## Action and effect class

`rebuild`, `strict`, and `diff` are R0 (read-only over the event store;
strict replay re-fires behaviors into a scratch run, not the canonical
one). `fork` is R1 (it creates durable local state). No network, no
external effects.

## Failure and recovery

- `strict` divergence (exit 4) means a behavior, schema, or dependency
  version changed relative to the recorded run. Compare pinned digests in
  the replay record against the current environment; do not "fix" the log.
- `rebuild` mismatches against live state indicate hand-edited or corrupted
  durable state — run `gauntlet audit integrity`.
- `fork` at an event that does not exist exits 2 with the valid range.
- Replaying with the wrong projector or dependency version is detected via
  the pinned digests and rejected rather than silently producing a
  different history.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet replay strict --json
{
  "mode": "strict",
  "run_id": "run:…",
  "events_replayed": 412,
  "divergence": null,
  "state_digest": "sha256:…",
  "event_stream_digest": "sha256:…",
  "record_id": "replay:…"
}
```

## External docs

None; replay semantics are provided by ActiveGraph and documented by its
package (<https://pypi.org/project/activegraph/>).
