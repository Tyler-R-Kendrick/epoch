# Protocol Experiment Registry

Gated protocol experiments for federation, bridges, and native channels.
Transport moves bytes; clients verify signatures. Verdicts default
**rejected**. Standing production row:

**Production ship: (none yet)**

No scalar “best protocol” scores. Matrices only. Evidence is local
config-hash output from `test/unit/protocol-experiments/` (explicit
no-sync; never only under `outputs/`). Garbage evidence must not promote.

The runner is `test/unit/protocol-experiments/registry.ts`, executed by
`node dist/test/run-unit-tests.js`.

## Standing production row

| Surface | Verdict |
|---|---|
| Production ship | (none yet) |

## E01–E16

| ID | Hypothesis | Verdict | Runnable | Notes |
|---|---|---|---|---|
| E01 | Bridge throughput vs matched direct vs stripped-signature control; ≥25% delta | rejected | yes | Prosody harness does not prove the floor; adapter off |
| E02 | Zero-mechanism bridge solver (adaptive vs static routing) | rejected | yes | Static routing matches the in-process double |
| E03 | State-resolution cost ladder (1/2/5× contention) | rejected | yes | No preregistered contention evidence |
| E04 | Parse-vs-meaning state validity | rejected | yes | Structural 1.0 / semantic 0.0 is rejected |
| E05 | Identity portability (fidelity 1.0, forged proofs 100% rejected) | rejected | yes | Exit bindings survive; forged-proof corpus incomplete |
| E06 | Moderation latency under load | rejected | yes | SLA-by-drops would be harness failure; not measured |
| E07 | Appeal reversibility | rejected | yes | On/off identical would be non-load-bearing |
| E08 | Sybil dose ladder (1/2/5× cost params) | rejected | yes | Cost params not load-bearing yet |
| E09 | Migration safety | rejected | yes | Byte-identical-but-wrong state is invalidated |
| E10 | Real-PDS graduation | rejected | yes | Adapter exists, default off; interop corpus incomplete |
| E11 | MLS-over-linear-log PoC vs Megolm-style baseline | pending | no | Deferred-pending-design placeholder |
| E12 | Labeler/moderation-service conformance | pending | no | No labeler fixture |
| E13 | Livestream privacy vs ADR-0050 | rejected | yes | Protected inputs never leak; control still rejected |
| E14 | Grant-attenuation fuzzing vs ADR-0034 | rejected | yes | Revoked-grant use fails in unit tests; not promoted |
| E15 | Tangled interop fit matrix | rejected | yes | Conformance matrix only; identity-compromise cells forbidden |
| E16 | Native-channel parity vs issue-backed chat | rejected | yes | Zero-mechanism control matches on some metrics |

## Rejected-protocol ledger

| ID | Why rejected |
|---|---|
| E01 | No ≥25% throughput delta on a real s2s harness |
| E02 | Adaptive routing is non-load-bearing vs static |
| E03 | Missing preregistered contention doses |
| E04 | Parse-1.0 / meaning-0.0 pattern |
| E05 | Forged-proof corpus not 100% |
| E06 | Unmeasured; SLA-by-drop would invalidate the harness |
| E07 | Reversibility not differentiated from off |
| E08 | Sybil cost params not proven load-bearing |
| E09 | Wrong-meaning migration is invalidated, not promoted |
| E10 | Real PDS stays off until interop + PrivatePublishError corpus lands |
| E13 | Matched streamer corpus not yet locked |
| E14 | Unit denial is not a promotion |
| E15 | No identity-compromise cells; no scalar score |
| E16 | Issue-backed chat still matches locked metrics → channel mechanism not promoted |

Destructive control: feeding garbage, forged, unsigned, or `{ promote: true }`
evidence returns **rejected**.

## Related

- [ADR-0055](design-decisions/0055-trust-posture-modes-and-federation-topology.md)
- [XMPP profile](xmpp-profile.md)
- [Exit and migration](exit-and-migration.md)
- [NATS fabric](nats.md)
