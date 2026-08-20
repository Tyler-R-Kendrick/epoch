---
type: Agent Skill Reference
title: "SDLC review"
description: "Automatic security, design, and architecture review between stacked PRs."
tags: [epoch, sdlc, review, security, design, architecture]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc review`

Run before bottom-up squash-merge of each stacked PR (and when the user asks). Default facet
set when no flags are given: **security + design + architecture**.

## Flags

| Flag | Meaning |
|---|---|
| `--security` | Trust boundaries, secrets, authz, Pact consumer/provider safety |
| `--design` | DESIGN.md / tokens / Bracket Rule / adversarial persona critique |
| `--architecture` | Cascade proofs, ADR need, package boundaries, anti-slop cleanliness |

Combine freely: `sdlc review --design --security`.

## Procedure

1. Identify the PR or layer (`gh pr view`, `gh stack view --json`, or path diff vs base).
2. Spawn a **read-only** reviewer subagent when available; otherwise run the checklist yourself
   on a clean understanding of the diff (do not trust the implementer’s self-report alone).
3. For each selected facet, fill the checklist below.
4. Write [`.sdlc/reviews/<pr-or-layer>.yaml`](../../../../.sdlc/reviews/) conforming to
   `schema/review.schema.json`.
5. Post a short PR comment summarizing pass/fail and blocking findings.
6. Blocking findings must be fixed (or explicitly waived with a `.sdlc/decisions/` record + ADR
   when material) before merge.

## Checklists

### `--security`

- No secrets in diff; env **names** only.
- Authz / posture / signed-event paths fail closed.
- Pact interactions do not invent provider behavior; unauthorized cases covered.
- New network/file/crypto surfaces have adversarial tests or an explicit decision record.

### `--design`

- Root [DESIGN.md](../../../../DESIGN.md) named rules (Bracket Rule, terminal type, etc.).
- `npm run design:lint` and `npm run design:audit` mentality: no token drift, no native-chrome
  buttons on Community Web board controls (`community-web:app:design-lint` when UI touched).
- Adversarial persona critique protocol for Community-facing visuals
  ([docs/community-human-centered-design.md](../../../../docs/community-human-centered-design.md)).
- Competitor power-user lens when the surface competes
  ([docs/evidence/competition/](../../../../docs/evidence/competition/)).

### `--architecture`

- Change maps to a persona outcome ([persona-minimum.md](../persona-minimum.md)).
- Package boundaries respected; no drive-by refactors.
- **Repo hygiene:** no unjustified new packages/dirs; cohesion over scatter; coupling only at
  public/Pact boundaries ([repo-hygiene.md](../repo-hygiene.md)). Call out path sprawl as
  blocking when a thinner edit would have worked.
- **Documentation:** freshness matrix satisfied; claims match code/features; no orphans;
  `docs:check` green ([documentation.md](../documentation.md)). Overclaims are blocking.
- Material trade-offs → `.sdlc/decisions/` (+ ADR under `docs/design-decisions/` when human-facing).
- Anti-slop: no new `unknown` laundering, empty-object spreads, or assertion chains without
  `SAFETY:` ([docs/anti-slop.md](../../../../docs/anti-slop.md)).
- `konsistent` conventions still hold; do not weaken them to land a folder.
## Output shape (YAML)

```yaml
id: review-pr-174
pr: 174
layer: sdlc/example-03-slug
facets: [security, design, architecture]
status: pass | fail
blocking: []
notes: |
  Short natural-language summary.
recordedAt: 2026-08-20T00:00:00Z
```
