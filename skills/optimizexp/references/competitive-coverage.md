---
type: Agent Skill Reference
title: "OptimizeXP competitive coverage"
description: "How Community Web (and similar surfaces) capture competitor experience gaps every run via scorecards, persona panels, survey extensions, and closeout gates."
tags: [hobo, optimizexp, competitive, scorecard, personas, community]
timestamp: 2026-08-03T00:00:00Z
---

# Competitive coverage (gap capture every run)

One-off chat analyses of “how we compare to Discord/Buzz/…” are **not** enough. When a product maintains a **competitive experience scorecard**, OptimizeXP runs must **update it** and leave a run-scoped artifact.

## When this applies

A run is **competitive-covered** when **any** of:

- Project config sets `competitive.scorecard` (e.g. Community Web)
- Selected feature ids match a known competitive product prefix (`community-web-*`)
- Scope explicitly lists `competitivePanel` / scorecard path

## Artifacts

```text
docs/…-gap-scorecard.md                    # human living scorecard
.optimizexp/competitive/<product>-dimensions.json
.optimizexp/runs/<run-id>/competitive-scorecard.json
```

### Run scorecard (`competitive-scorecard.json`)

```json
{
  "schemaVersion": 1,
  "runId": "…",
  "product": "community-web",
  "panel": "community-competitive",
  "scoredAt": "ISO-8601",
  "dimensions": [
    {
      "id": "belong",
      "status": "partial",
      "personaIds": ["discord-power-user"],
      "evidencePaths": [".optimizexp/features/…/evidence/…/"],
      "harms": 1,
      "friction": 1,
      "uncertainty": 1,
      "notes": "first-person summary",
      "implementableNow": true,
      "smallestExperiment": "…"
    }
  ],
  "currencyChecks": [
    {
      "persona": "buzz-power-user",
      "policy": "research-before-respond",
      "sources": ["https://github.com/block/buzz/blob/main/README.md"],
      "worksToday": ["…"],
      "wiring": ["…"],
      "comparisonBar": ["…"]
    }
  ]
}
```

Copy dimension statuses back into the global dimensions JSON (`lastRunId`, `lastScoredAt`, `status`, evidence).

## Persona panels

Project config may define:

```json
"personas": {
  "defaultPanel": "community-competitive",
  "panels": { "community-competitive": ["discord-power-user", "…"] }
}
```

**Bare review** for that project: load `defaultPanel` unless `--personas` is set.

## Survey extension

When competitive coverage applies, each persona survey **must** include (in addition to the fixed instrument):

| Id | Prompt |
|---|---|
| `q_competitor_bar` | Which product is your home bar for this path? |
| `q_parity` | 0–5: how close is Epoch to that bar on **this** journey? |
| `q_epoch_only` | What did Epoch do that your bar product does **not**? |
| `q_dealbreaker` | What is still a dealbreaker vs switching / dual-wielding? |
| `q_dimension` | Which scorecard dimensions failed? (ids) |

Feature requests derived from these answers should set:

```json
"competitiveDimension": "belong"
```

## Currency research

Personas with frontmatter or body **`currencyPolicy: research-before-respond`** (Buzz) must emit a **currency check** before first judgment (see persona file). Store under `competitive-scorecard.json` → `currencyChecks[]`.

`dossier-ok` = local competition dossier sufficient unless user asks for live currency.

## Run ritual

1. Resolve panel → personas.
2. Currency research where required.
3. Read prior scorecard / dimensions JSON.
4. For each dimension with an owner in the panel: expect → act → outcome (or justify deferred).
5. Apply S/M experiment that moves a **scorecard row**.
6. Competitive survey questions.
7. Write run `competitive-scorecard.json` + update dimensions JSON.
8. Dual-regime closeout as usual; **assert-complete** should fail if scorecard missing when `requireScorecardOnComplete` is true.

## Soft → hard gates

| Stage | Behavior |
|---|---|
| **Soft (default until pilot)** | Doctor / summary warn if scorecard missing |
| **Hard** | `assert-complete` fails with `competitive_scorecard_missing` |

Community Web sets `requireScorecardOnComplete: true` in project config — agents must write the artifact before claiming complete.

## Anti-patterns

- Scoring only cold-entry and ignoring discover/agents/promote
- Copying scores without evidence
- Claiming agents-as-members `proven` without live session or honesty labels
- Skipping Buzz currency research when `buzz-power-user` is selected

## Related

- [persona-survey.md](persona-survey.md)
- [personas.md](personas.md)
- [review-loop.md](review-loop.md)
- [experiment-backlog.md](experiment-backlog.md)
