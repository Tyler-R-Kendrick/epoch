# .gauntlet/ project state

Durable state for gauntlet-loop improvement campaigns in this repository.
Created by `gauntlet project init`; owned by the gauntlet scripts. Do not
hand-edit generated ledgers or the ActiveGraph store.

## State classes

| Contents | Git treatment | Semantics |
|---|---|---|
| `spec/`, `policies/`, `schemas/`, `evaluators/`, `profiles/`, `reference-pack/` manifests | tracked | Normative or configuration state; changes are reviewable and digest-addressed. |
| `counterexamples/` records and curated fixtures | tracked | Durable regression memory. |
| `ledger/` campaign, experiment, decision, promotion, release, incident records | tracked | Immutable, one-record-per-file portable control ledger. |
| `handoffs/` | tracked (after redaction) | Compact campaign objective, stop rules, latest result, next legal actions. |
| `artifacts/manifests/` | tracked | Content digests, media types, provenance, storage URIs. |
| `workflows/` | tracked | Generated Microsoft Agent Framework declarative workflow YAML and plans. |
| `state/` (ActiveGraph store) | ignored | Durable local runtime truth, not a Git collaboration format. |
| `traces/`, `runs/`, `exports/`, `cache/`, `tmp/`, `locks/` | ignored | High-volume, reconstructable, or privacy-sensitive products. |
| `artifacts/blobs/`, `artifacts/staging/`, `datasets/promotion/sealed/` | ignored | Digest-addressed blobs and sealed promotion cases. |
| `secrets/` | ignored unconditionally | Never serialized into events, traces, ledgers, bundles, or Git. |

The ignored runtime database is never the only durable evidence: every
promotion, release, governance decision, and retained counterexample has a
portable immutable record under `ledger/`, linked to ActiveGraph event IDs
and artifact digests. Export/verify/hydrate a full evidence bundle with
`gauntlet bundle export|verify|hydrate`.
