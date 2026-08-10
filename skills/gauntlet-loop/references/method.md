# Method

## When to load this file

Load it when you need to understand *why* the loop is shaped this way — the
research lineage, the separation of concerns, and the lifecycle of a
counterexample. It is background, not command documentation.

## Lineage

The gauntlet loop composes proven mechanisms rather than inventing one:

| Lineage | What gauntlet takes from it |
|---|---|
| Test-driven development | A failing case precedes the fix; retained failures become permanent regression fixtures. |
| CEGIS / SyGuS | Counterexample-guided synthesis: each rejected candidate must produce a counterexample that constrains the next search step. |
| Blackboard systems | Independent specialists (evaluators, importers, the host agent) contribute to shared durable state; no single component owns the whole answer. |
| Self-Refine / Reflexion / CRITIC | Iterative self-critique — but critiques become persisted observations and diagnoses, never free-floating prose that authorizes anything. |
| Tree/search methods (Tree of Thoughts, beam search) | Bounded beams, Pareto frontiers, and explicitly retained alternative branches instead of greedy single-path refinement. |
| Ralph-style fresh-context persistence | Each session can start from a clean context because durable state (`.gauntlet/`, handoffs) is the memory, not the conversation. |
| Spec-driven kits (Spec Kit and kin) | A frozen, digest-addressed specification gates the campaign; generated content never silently becomes normative. |
| Autoresearch (NeMo RL Auto Research and kin) | Baseline first; one falsifiable hypothesis and one Git branch per experiment; keep/discard/crash/inconclusive outcomes; failed branches retained as evidence. |
| Metamorphic testing | Relations between transformed inputs/outputs substitute for missing exact oracles. |
| Delta debugging (ddmin) | Deterministic minimization of failing cases while retaining the original. |
| Quality-diversity (MAP-Elites) | An archive indexed by behavior/pathology descriptors, so search retains diverse candidates instead of collapsing quality to one scalar. |
| Analysis-by-synthesis | Derived representations exist to make latent properties observable and controllable, not as decoration. |
| Trace-guided repair (Shepherd, BLADE-style routing) | Failed and successful traces are aligned; the earliest structurally meaningful divergence proposes a fork point and an action seam — advisory until experimentally tested. |
| Checkpoint/time-travel systems (LangGraph persistence and kin) | Replay, fork at an exact event, and diff are first-class, provided by ActiveGraph. |
| Transactional agents (LogAct, Atomix, MemTX) | Write-ahead intents before effects; transactional beliefs with revocation; saga-style settlement with compensation and reconciliation. |

## Six concerns, kept distinct

The loop works because these are separate mechanisms with separate records:

1. **Persistence** — what happened: append-only events, observations, the
   control ledger. Never rewritten.
2. **Specification** — what must be true: the frozen spec bundle, digest
   addressed; changed only by R4 governance supersession.
3. **Search** — what to try: hypotheses, candidates, branches, archives.
   Free to be wrong; cheap to discard.
4. **Verification** — what holds: evaluator portfolios, calibration,
   held-out promotion evidence. Independent of the builder.
5. **Authority** — what may execute: write-ahead intents, votes, R0–R4
   ceilings, effect settlement.
6. **Release** — what may touch the world: a separate decision after
   promotion, with its own approvals.

A component may participate in several concerns but a single record never
plays two roles. This is why "the critic said it's fixed" cannot promote
anything, and why a promoted candidate still cannot push.

## Counterexample lifecycle

1. **Capture** — an evaluator or import produces a raw observation; a
   violated expectation becomes a `CounterexampleV1` binding the exact
   candidate, artifact/representation, scope, expected vs actual behavior,
   violated rule, raw evidence digests, severity, and confidence.
2. **Minimize** — pluggable reducers (ddmin-style) shrink the reproduction;
   the original is always retained and linked via `minimized_from`.
3. **Classify visibility** — search-visible, calibration-only, or
   promotion-sealed; minimization inherits visibility so sealed cases can
   never leak into a builder-visible split.
4. **Drive repair** — the counterexample motivates a diagnosis and an
   intervention; experiments record which counterexamples they fix, retain,
   or introduce.
5. **Become memory** — every retained failure becomes one or more of: exact
   regression fixture, minimized reproduction, metamorphic property,
   evaluator calibration case, adversarial search seed, hard-invariant
   proposal, representation-gap record, or (only after verification) a
   training trajectory.
6. **Monitor recurrence** — recurrence after promotion is an incident, not
   a silent re-open.

## Observation / diagnosis / intervention separation

A critic can correctly notice a defect and still infer the wrong cause or
repair, so the three are separate records:

- **Observation** (`ObservationV1`): what was measured, where, by which
  tool/version, with raw evidence digests. Append-only; carries uncertainty.
- **Diagnosis** (`DiagnosisV1`): a falsifiable causal hypothesis — failure
  regime, earliest suspected divergence, supporting and contradicting
  evidence, confidence, and a stated **falsifier**. Labeled observational,
  correlational, or experimentally confirmed. Never causal proof by itself.
- **Intervention** (`InterventionV1`): the smallest permitted change that
  tests the diagnosis — one primary action seam, exact permitted mutation
  globs, protected surfaces, predicted effect, rollback plan, and the new
  failure modes it could create.

Confirmation requires a controlled counterfactual experiment (fork before
the suspected divergence, change one seam, compare paired outcomes) or
equivalent evidence. Beliefs derived from observations follow their own
lifecycle (raw → tentative → validated → committed → action_safe, with
quarantine/supersede/revoke) — see the state machines in
[contracts.md](contracts.md).

## Repair distillation

Repeated repairs must not accumulate as ever-growing prompt prose. The
escalation ladder:

```text
counterexample fixture
  → temporary prompt/skill guidance
  → repeatedly validated deterministic operator, policy, or transform
  → workflow/harness change
  → model training, only for residual capability failures
```

When the same guidance repeatedly succeeds across held-out cases, propose an
operator-distillation intervention: compile the behavior into a
deterministic operator, constraint, cache, or verifier. Skill-improvement
candidates use a closed ADD/MODIFY/REMOVE mutation vocabulary, identify the
exact artifacts affected, run task *and* trigger/non-trigger held-out
evaluations, obey a hard regression budget, and are decided by the baseline
promotion kernel — never by the candidate skill itself. Prefer replacing or
removing obsolete guidance over appending forever.
