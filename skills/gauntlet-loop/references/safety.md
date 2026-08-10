# Safety: authority, effects, secrets, isolation, beliefs, approvals

## When to load this file

Load it before any effect-bearing work, when inspecting or deciding
write-ahead intents (the `intent` command family routes here), when an
effect ends `outcome_unknown`, when a belief must be revoked, or when
handling approvals.

## Write-ahead authority

No effect-bearing operation executes unless a corresponding
`ActionIntentV1` has durably reached `committed`. The high-level commands
create intents internally; the low-level family exists for inspection,
human approval, recovery, and integration:

```bash
uv run --project <skill-root> gauntlet intent propose|show|list|vote|approve|abort|reconcile
```

An intent binds: intent/project/campaign/branch/correlation IDs; causal
counterexample/diagnosis/intervention IDs; actor identity and capability
digest; operation name and tool-contract digest; canonical input digest;
declared read/write scopes; action class; effect class; idempotency key
when meaningful; pre/postconditions; compensation or reconciliation
strategy; spec/policy/evaluator/environment digests; budget and timeout;
required voters; expected result schema. Votes and decisions are immutable;
a correction appends a new event.

### Action classes (ActiveGraph R0–R4, fail closed)

| Class | Meaning | Approval |
|---|---|---|
| R0 | pure inspection / deterministic computation | automatic |
| R1 | local, bounded, reversible project/candidate state | automatic under the default ceiling |
| R2 | costly experiment, dependency install, local promotion branch, controlled network pull | approval required |
| R3 | push, publish, deploy, send/notify, shared-memory write | human approval, always |
| R4 | authority policy, promotion kernel, sealed suite, frozen spec, trust roots | governance gate, always |

The default instance ceiling is R1. A missing or invalid action class fails
closed. Local capability policy may **lower** the effective ceiling, never
raise it (raising requires a tracked R4 governance decision).

### Voters

Voter kinds: deterministic policy (mandatory), spec/scope, budget,
evaluator/promotion, human approval, optional LLM semantic. A vote records
the voter implementation/version, policy digest, evidence digest, decision
(approve/reject/abstain), reason, and validity. An LLM vote may recommend
or veto but is structurally excluded from the approval quorum for R3/R4 —
it can never be the sole approval.

## Effect settlement

The effect executor (`scripts/gauntlet/effects.py`, a frozen surface) is
the only component allowed to invoke an effect adapter
(`prepare → execute → compensate → reconcile`). It rejects an intent that
is not committed, whose preconditions no longer hold (rechecked immediately
before execution), whose policy/spec digest changed, or whose
idempotency/reconciliation contract is invalid.

Effect classes are orthogonal to action classes: `pure`, `read_only`,
`idempotent_known_outcome` (requires an idempotency key), `bufferable`,
`reversible`, `reversible_with_cost`, `irreversible_gated`, `unknown`
(most restrictive). The retry table in `.gauntlet/policies/effects.yaml`
bounds every retry; the defaults allow 2 retries for pure/read-only, 1 for
idempotent-known-outcome, 0 for everything else.

**`outcome_unknown` handling:** never assume failure, never auto-retry a
non-idempotent operation. Reconciliation queries external state via the
idempotency key or returned external identifier; the outcome settles as
`reconciled`, `compensated`, or `compensation_failed`. Exit code 7 means
"run the family's `reconcile` command", not "try again".

Command adapters execute argv arrays (never `shell=True`) in the declared
worktree/staging cwd, with allowlisted environment, explicit timeout and
output caps, deny-by-default network, schema-validated outputs, and
stdout/stderr preserved as observational artifacts by digest.

## Secrets and privacy

- Config stores secret references / environment variable names only —
  never values. `.gauntlet/secrets/` is ignored unconditionally.
- The redactor (`scripts/gauntlet/redaction.py`) runs before anything is
  persisted or emitted: known sensitive key names, common token shapes,
  and configured patterns. It is a safety net; hook points exist for
  established scanners (detect-secrets), not a bespoke replacement.
- Raw model prompts/responses are opt-in telemetry
  (`telemetry.include_raw_content`, default false). Retention policy for
  raw traces/blobs lives in `.gauntlet/policies/retention.yaml`
  (default raw-trace retention: 14 days).
- Handoffs and bundles are redacted before writing; imported payloads that
  cannot be safely redacted are rejected rather than stored raw.

## Sealed promotion data

`.gauntlet/datasets/promotion/sealed/` is ignored by Git and must never be
visible to candidate builders: candidates receive only the manifest/digest
and permitted aggregate outputs. Leakage checks cover file access,
environment, argv, trace/log content, copied fixtures, Git history, and
early-revealed evaluator counterexamples (`gauntlet audit leakage`). No
cryptographic secrecy is claimed when everything runs as one OS user; the
stronger isolation mode uses separate CI/runner credentials and storage.

## Candidate isolation and self-modification

- Candidates live in external Git worktrees on
  `gauntlet/<campaign>/<experiment>` branches; edits are confined to
  declared `permitted_globs` and checked against the diff before and after
  execution.
- Execution uses a scrubbed allowlisted environment with policy-level
  network denial (documented as discipline, not an OS sandbox).
- Frozen surfaces are enforced on every candidate diff:
  `.gauntlet/policies/**`, `.gauntlet/schemas/**`,
  `.gauntlet/datasets/promotion/**`, `.gauntlet/evaluators/**`, the skill's
  `promotion.py`, `authority.py`, `effects.py`, and `evals/**`.
- A candidate attempting to weaken its own evaluator or promotion policy,
  or to read sealed cases, is blocked and produces a **security
  counterexample** (exit 9). Evaluator-seam campaigns require a separate
  governance campaign with an independent meta-evaluator; a candidate may
  never use its modified evaluator to approve itself.
- Untrusted content (traces, references, web pages, model outputs) can
  propose nothing directly: any command or policy change it suggests must
  pass the same structured intent/authority process.

## Belief revocation cascade

Beliefs follow `raw → tentative → validated → committed → action_safe`
with `quarantined`/`superseded`/`revoked` (see contracts.md). Actions whose
policies require `action_safe` evidence fail closed on tentative,
quarantined, or revoked support. Revoking a belief:

1. appends a revocation event (history is never rewritten);
2. computes every dependent diagnosis, intervention, experiment, promotion,
   release, handoff, and retained skill rule;
3. flags unresolved downstream decisions for review;
4. blocks pending intents whose evidence is no longer valid;
5. creates an incident record if a released artifact materially depended on
   the revoked belief;
6. **proposes** compensation or rollback — and never executes it without
   authority.

## Human approvals and `--non-interactive`

Missing approval is never treated as approval. Interactively, a command
needing approval prompts or points at the pending intent; with
`--non-interactive` it fails with exit 3 instead. Approvals are recorded as
immutable votes (`gauntlet intent approve`), attributable to an actor, and
expire per policy. R3 always requires a human vote; R4 always goes through
the governance gate. `--dry-run` is always available to preview an effect
plan without committing anything.
