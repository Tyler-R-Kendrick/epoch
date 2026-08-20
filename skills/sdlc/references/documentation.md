---
type: Agent Skill Reference
title: "SDLC documentation"
description: "Improve repo documentation accuracy and adherence to Epoch freshness policy, standards, and discoverability gates."
tags: [epoch, sdlc, documentation, freshness, accuracy, adr, docs-check]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc docs` — documentation quality & accuracy

Documentation is part of delivery, not a follow-up. Use this stage to **create, update, and
audit** docs so they stay **accurate**, **discoverable**, and aligned with Epoch standards.

Authoritative policy: [docs/documentation-freshness.md](../../../docs/documentation-freshness.md).
Index: [docs/README.md](../../../docs/README.md). Vocabulary: [docs/nomenclature.md](../../../docs/nomenclature.md).

## Flags

```text
sdlc docs [--audit] [--fix] [--matrix] [--adr] [--dry-run]
```

| Flag | Meaning |
|---|---|
| `--audit` | Diff claims vs code/features; list stale, orphan, or conflicting docs |
| `--fix` | Apply the freshness matrix to the current change set and edit docs in-tree |
| `--matrix` | Print which freshness-matrix rows apply (no edits) |
| `--adr` | Draft or update an ADR when the change is a material decision |
| `--dry-run` | Report planned edits only |

Default when bare `sdlc docs`: `--fix` for the active initiative/diff, then `npm run docs:check`.

---

## Standards this repo follows

| Standard / practice | How Epoch applies it |
|---|---|
| **Docs-as-code** | Docs land in the **same PR** as the behavior; gated by `npm run docs:check` |
| **Single source of truth** | Normative terms in `nomenclature.md`; architecture in `design.md`; decisions in ADRs; behavior in `features/*.feature` + inventories |
| **No orphans** | Every Markdown doc and Gherkin spec reachable from root `README.md` → `docs/README.md` (and narrower indexes) |
| **Progressive disclosure** | Root README = value + quick start + links; deep detail in focused docs; skills stay thin routers + references |
| **ADR discipline** | Context → decision → consequences/trade-offs → revisit triggers; index in `docs/design-decisions/README.md` |
| **Persona-honest product docs** | User-visible claims backed by `@persona.*` scenarios ([persona-minimum.md](persona-minimum.md)) |
| **Truthful capability reporting** | Do not document aspirational, disabled, or competitor-parity features as shipped |
| **Evidence vs product docs** | `docs/evidence/` and `.optimizexp/` are evidence; still link evidence READMEs when humans must find them; don’t treat run state as architecture |
| **Anti-bloat** | Prefer updating an existing page over a new parallel doc ([repo-hygiene.md](repo-hygiene.md)) |

External references agents may use for craft (do not invent a parallel style guide):

- [Diátaxis](https://diataxis.fr/) — separate tutorials / how-to / reference / explanation; Epoch maps roughly: quick start → tutorial-ish, `cli.md`/`sdk.md` → reference, `design.md`/ADRs → explanation, runbooks → how-to.
- [Keep a Changelog](https://keepachangelog.com/) / conventional commits — when release notes or PR summaries claim changes, match the diff.
- [Semantic Versioning](https://semver.org/) — only when docs assert version/compatibility guarantees that the package actually publishes.

---

## Accuracy rules (non-negotiable)

1. **Code wins.** If docs and implementation disagree, fix the docs **or** the code in the same
   initiative; never leave known lies. Prefer updating docs when the code is intentional.
2. **Verify before asserting.** Commands, flags, env vars, URLs, package names, and gate names
   must match `package.json`, `--help`, or source — spot-check; do not copy from memory.
3. **Status is explicit.** Use Accepted / Superseded / design-only / deferred the way ADRs do.
   Mark unimplemented surfaces as non-goals or future work — never as current behavior.
4. **Links work.** Relative links resolve; `npm run docs:check` must pass before handback/finish.
5. **Inventories stay aligned.** Changing `features/*.feature` requires updates to
   `docs/features.md`, `docs/feature-scenario-inventory.md`, and `docs/persona-feature-matrix.md`
   when those inventories track the scenario.
6. **Skills mirror public docs.** CLI/SDK/agent surface changes update both `docs/*` and the
   matching `skills/epoch/` (or `skills/sdlc/`) references.
7. **No process-as-product.** Agent/governance procedures stay in `AGENTS.md` / skills — not in
   `.feature` files ([persona-minimum.md](persona-minimum.md)).

---

## Freshness matrix (how to apply)

1. List files touched in the layer/PR (`git diff --name-only origin/main...HEAD`).
2. Map each change type to rows in [documentation-freshness.md](../../../docs/documentation-freshness.md).
3. Edit every required doc in that PR (or the stack layer that owns the surface).
4. Add new docs to `docs/README.md` (and ADR index / Community indexes as needed).
5. Keep root `README.md` short; push detail downward.
6. Run:

```bash
npm run docs:check
```

7. If no docs were needed, state **why** in the PR body (one sentence). Silent omission is a
   failure.

Cascade: shared registries, matrices, and skill routers are coordinator-owned
([dispatch.md](dispatch.md) `cascadeDeltas`).

---

## When to improve documentation

| Trigger | Action |
|---|---|
| Behavior / API / CLI / workflow change in this PR | `--fix` via freshness matrix |
| User or review says “docs are wrong / missing” | `--audit` then targeted edit; open docs-only layer if needed |
| Same question asked ≥2 times in chat | Add or tighten the canonical doc; optionally `sdlc skills --promote` if it’s agent procedure |
| New material trade-off | `--adr` + index row; machine copy in `.sdlc/decisions/` when useful |
| Superseded design | Update ADR status; fix inbound links; remove or rewrite stale how-tos |
| Competitor / research claims in product docs | Re-verify against current evidence (`docs/evidence/competition/`, live sources) before stating |
| `sdlc eval` `minimumSpec` / `docsAccuracy` ≤ 3 | Backlog concrete doc fixes before next loop |
| Finish / stack closeout | Docs facet of review must pass; `docs:check` green |

---

## How to write (Epoch house style)

1. **One job per page** — don’t dump CLI + architecture + persona matrix into one file.
2. **Lead with the contract** — what the reader can do or must know; put history last.
3. **Use normative vocabulary** — [nomenclature.md](../../../docs/nomenclature.md); don’t invent
   synonyms for Protocol/Core concepts.
4. **Prefer tables** for matrices, command lists, and update requirements.
5. **Show replayable commands** in fenced blocks that actually run.
6. **Cite ADRs** for decisions; don’t re-argue them in every feature doc.
7. **Link, don’t duplicate** — one canonical paragraph; others point to it.
8. **Screenshots / evidence** — small, dated, under `docs/evidence/<slug>/` with README replay;
   not huge binaries in architecture pages.
9. **Accessibility of docs** — meaningful link text; avoid “click here”; keep headings hierarchical.

### ADR shape (minimum)

```markdown
# ADR-NNNN: Title

Status: Accepted | Accepted (design) | Superseded by ADR-… | …

## Context
## Decision
## Consequences
## Alternatives considered
## When to revisit
```

Register in `docs/design-decisions/README.md` and link from `docs/README.md` when it is a
top-level discoverability change.

---

## Audit procedure (`--audit`)

1. Scope: initiative files, open PR diff, or a named doc path.
2. For each claim (command, behavior, status, persona outcome):
   - Locate implementing code or feature scenario.
   - Mark **accurate** / **stale** / **missing** / **overclaimed**.
3. Check discoverability: new files linked from an index in the README hierarchy.
4. Check naming against nomenclature.
5. Emit a short report (PR comment or `docs/plans/<slug>/docs-audit.md`) with fix PRs/layers.
6. Do not “fix” accuracy by deleting failing tests — fix docs or product intentionally.

---

## Review facet (docs)

When reviewing a layer that touches user- or operator-facing surfaces, treat docs as blocking:

- Freshness matrix rows for the diff are satisfied (or justified in PR).
- No broken links (`docs:check`).
- No overclaims vs features/Pact/tests.
- Inventories/matrices updated when scenarios changed.
- ADR added/updated when the change is a material design choice.
- Skill references updated when agent-facing commands/workflows changed.

Fold into `sdlc review --architecture` (and PR closeout) unless a dedicated docs pass already
ran via `sdlc docs --audit`.

---

## Done

- Required docs for the change set updated in-branch.
- `npm run docs:check` green.
- PR body lists doc paths touched **or** an explicit “no docs needed because …”.
- Accuracy audit findings resolved or tracked as follow-up issues/layers — not ignored.

## Related

- [docs/documentation-freshness.md](../../../docs/documentation-freshness.md)
- [persona-minimum.md](persona-minimum.md)
- [repo-hygiene.md](repo-hygiene.md)
- [stages/evidence.md](stages/evidence.md)
- [stages/gate.md](stages/gate.md)
- [skill-evolution.md](skill-evolution.md) — agent procedure docs vs product docs
