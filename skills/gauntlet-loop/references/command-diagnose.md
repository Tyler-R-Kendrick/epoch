# Command families: issue, counterexample, diagnosis

## When to load this file

Load it to localize failures and record what you believe caused them: group
raw failures into issues, pin exact counterexamples, and write falsifiable
diagnoses. This is where host-agent reasoning becomes durable, testable
evidence.

## Prerequisites

- An initialized project with observations to work from (see
  command-observe.md for imports; evaluator runs also produce observations).

## Commands

```bash
uv run --project <skill-root> gauntlet issue cluster
uv run --project <skill-root> gauntlet issue list|show|close|reopen

uv run --project <skill-root> gauntlet counterexample add
uv run --project <skill-root> gauntlet counterexample minimize
uv run --project <skill-root> gauntlet counterexample list|show

uv run --project <skill-root> gauntlet diagnosis record
uv run --project <skill-root> gauntlet diagnosis list|show|revoke
```

### issue

`cluster` groups failures deterministically by a canonical fingerprint over
invariant ID, evaluator ID, error code, stack fingerprint, artifact
region/entity, and trace-shape fingerprint — identical inputs produce the
same cluster ID on every machine. An optional host-agent label may be
attached as evaluative metadata (`label_source: host-agent`); it never
changes the clustering. Issue records are current-state documents:
`close`/`reopen` update status in place (atomically), unlike ledger records.

### counterexample

`add` records a `CounterexampleV1` binding the exact candidate,
artifact/representation, scope, expected and actual behavior, violated
rule, raw evidence digests, severity, confidence, and a minimal
reproduction. Declare its split visibility: `search-visible`,
`calibration-only`, or `promotion-sealed`. `minimize` runs a pluggable
reducer (the shipped one is a deterministic ddmin-style line remover for
text fixtures); the original is always retained and linked via
`minimized_from`, and visibility is inherited so a sealed case can never
leak into a builder-visible split by being minimized.

### diagnosis

`record` persists a `DiagnosisV1`: concise hypothesis, failure regime,
earliest suspected causal divergence, supporting evidence, contradicting or
missing evidence, confidence and calibration basis, a stated **falsifier**,
candidate intervention seams, and whether the claim is observational,
correlational, or experimentally confirmed. A diagnosis without a falsifier
is invalid. `revoke` appends a revocation (never deletes) and computes the
dependency impact: dependent interventions, experiments, decisions, and
potentially affected releases are flagged for review, and pending intents
lose the revoked evidence (see safety.md for the belief cascade).

## Input template (diagnosis)

```yaml
hypothesis: "The tokenizer drops trailing UTF-8 continuation bytes."
failure_regime: deterministic-parser-error
earliest_divergence: "observation:… span 14"
supports: ["observation:…"]
contradicts: []
confidence: 0.6
falsifier: "Feeding the minimized fixture through the tokenizer alone
  reproduces the truncation; if it does not, this diagnosis is false."
intervention_seams: [deterministic-operator]
claim_level: correlational
```

## Durable outputs

- Issue records with deterministic fingerprints (current-state documents).
- `.gauntlet/counterexamples/records/<id>.json` and
  `.gauntlet/counterexamples/fixtures/<id>.txt` (tracked regression
  memory), plus `dev.gauntlet.counterexample.created.v1` export events.
- Diagnosis records and their belief-graph relations (`supports`,
  `contradicts`, `depends_on`) in the graph and ledger.

## Action and effect class

`list`/`show` are R0. `cluster`, `add`, `minimize`, `record`, `close`,
`reopen`, and `revoke` are R1 local writes (project lock). Effect class
`reversible` — corrections append; history is never rewritten.

## Failure and recovery

- A counterexample referencing a nonexistent candidate/evidence digest
  exits 2 — fix the reference, do not fabricate one.
- Minimization that no longer reproduces the failure keeps the original and
  reports the reducer failure; nothing is lost.
- Revoking a diagnosis that later proves correct is safe: record a new
  diagnosis; the revoked one stays as history.
- Unreadable records are skipped by navigation (`gauntlet next`) and
  reported by `gauntlet audit integrity`.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet issue cluster --json
{
  "clusters": [
    {
      "issue_id": "issue:…",
      "fingerprint": "sha256:…",
      "members": 4,
      "invariant_id": "invariant:utf8-roundtrip",
      "status": "open"
    }
  ]
}
```

## External docs

- Delta debugging (background for minimization):
  <https://www.debuggingbook.org/html/DeltaDebugger.html>
