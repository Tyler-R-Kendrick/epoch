# Command family: release

## When to load this file

Load it when a promoted result must affect the outside world: push, publish,
deploy, send, merge a protected remote branch, mutate persistent shared
memory, or update a canonical external reference. Release is a separate
decision from promotion, with its own authority.

## Prerequisites

- An applied local promotion (see command-promote.md).
- Human approval authority available: every outward effect is R3 or R4 and
  `--non-interactive` fails (exit 3) rather than inferring approval.

## Commands

```bash
uv run --project <skill-root> gauntlet release plan
uv run --project <skill-root> gauntlet release approve
uv run --project <skill-root> gauntlet release apply
uv run --project <skill-root> gauntlet release reconcile
uv run --project <skill-root> gauntlet release status
```

- `plan` identifies **all** outward effects and the exact artifacts/commits
  they would touch, as a `ReleasePlanV1`.
- `approve` records the required human/governance authority as immutable
  votes on the release intent. An LLM vote may recommend or veto but can
  never be the sole approval for R3/R4.
- `apply` executes only committed release intents through the effect
  executor and records returned external IDs/digests. Each effect declares
  its effect class and, where meaningful, an idempotency key.
- `reconcile` handles unknown outcomes: it queries external state using the
  idempotency key or returned external identifier where supported. It never
  assumes failure and never retries a non-idempotent operation.
- `status` reports settlement and monitoring per effect.

## Promotion vs release, in one table

| Action | Family | Class |
|---|---|---|
| candidate branch accepted locally | promote | R2 |
| promotion branch pushed to remote | release | R3 |
| package uploaded to a registry | release | R3 |
| deploy / send / notify / shared-memory write | release | R3 |
| new policy/evaluator made authoritative | governance release | R4 |

## Durable outputs

- Ledger kind `releases`: `ReleasePlanV1` and `ReleaseDecisionV1` records
  with approvals, external IDs, and settlement outcomes.
- Ledger kind `incidents` when a released artifact is later found to depend
  on revoked evidence (see safety.md).
- Effect lifecycle events (`dev.gauntlet.effect.started.v1` …
  `….completed.v1` / `….failed.v1` / `….unknown.v1` / `….compensated.v1`)
  and `dev.gauntlet.release.completed.v1`.

## Action and effect class

`plan` and `status` are R0. `approve` records authority (R1 write of an
immutable vote). `apply` executes R3 effects (push, publish, deploy,
send-or-notify, update-shared-memory — all `approval: human` under the
default policy) or R4 governance releases. Effect classes range from
`idempotent_known_outcome` (requires an idempotency key) to
`irreversible_gated`; `unknown` gets the most restrictive handling and zero
automatic retries.

## Failure and recovery

- Exit 3: an approval is missing. Surface the pending intent to the human
  (`gauntlet intent list` / `approve` — see safety.md); never work around
  it.
- Exit 7: an effect finished with `outcome_unknown` (for example, the
  process crashed after the registry accepted the upload but before the
  result persisted). Run `gauntlet release reconcile`; do **not** rerun
  `apply` — a duplicate non-idempotent effect is exactly what the protocol
  prevents.
- A failed effect after partial settlement is compensated where reversible
  and otherwise recorded for manual remediation; `status` shows each step.
- A revoked belief that a released artifact materially depended on creates
  an incident record and proposes (never executes) compensation or
  rollback.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet release plan --json
{
  "release_id": "release:…",
  "effects": [
    {
      "capability": "push",
      "action_class": "R3",
      "effect_class": "reversible_with_cost",
      "target": "origin gauntlet/promotion/…",
      "approval": "pending"
    }
  ],
  "approvals_required": ["human"],
  "status": "planned"
}
```

## External docs

None required beyond the target systems' own documentation (registry,
deployment platform); gauntlet only gates and records the interaction.
