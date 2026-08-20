# SDLC skill references

Progressive-disclosure bundle. Route by **subcommand** (see SKILL.md), then by phase:

## Stages (subcommands)

- [help.md](help.md) — `sdlc help` / `--help` / `-h`: usage, commands, flags
- [stages/init.md](stages/init.md) — `sdlc init`: mirrors, `.sdlc/`, `gh stack` probe
- [stages/clean.md](stages/clean.md) — `sdlc clean`: merged branches/worktrees
- [stages/review.md](stages/review.md) — `sdlc review`: security / design / architecture
- [stages/test.md](stages/test.md) — `sdlc test`: persona Gherkin + Playwright + Pact
- [stages/evidence.md](stages/evidence.md) — `sdlc evidence`: pack + **standard PR `## SDLC evidence` block**
- [stages/gate.md](stages/gate.md) — `sdlc gate`: gate:commit / push / verify
- [stages/eval.md](stages/eval.md) — `sdlc eval`: rubrics → `.sdlc/evals/`
- [persona-minimum.md](persona-minimum.md) — only what impacts documented personas
- [repo-hygiene.md](repo-hygiene.md) — anti-bloat, coupling/cohesion, cleanup cadence
- [skill-evolution.md](skill-evolution.md) — `sdlc skills`: SkillOpt/Sleep, promote patterns, harness workflows
- [documentation.md](documentation.md) — `sdlc docs`: freshness, accuracy, ADR/docs standards

## Core loop

- [finish.md](finish.md) — **`sdlc finish`**: land session (commit, PR, squash-merge)
- [operations.md](operations.md) — when/how to use subagents; create/destroy branches and worktrees
- [brainstorm.md](brainstorm.md) — adversarial / rubber-duck hardening
- [planning.md](planning.md) — plan mode + stack slicing
- [linear-planning.md](linear-planning.md) — one-shot issue contracts
- [dispatch.md](dispatch.md) — backends, handback, Done rule, incremental checkins
- [stacked-prs.md](stacked-prs.md) — `gh stack` + bottom-up closeout (**run `sdlc review` between PRs**)
- [loops-and-gates.md](loops-and-gates.md) — red/green + required lanes
- [cascade.md](cascade.md) — requirement ripple through proofs/ADRs

SKILL.md keeps Codex-valid frontmatter. Companion CLI skill: `gh-stack`.
Machine decisions/reviews/evals live under [`.sdlc/`](../../../.sdlc/).
