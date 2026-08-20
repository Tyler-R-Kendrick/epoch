---
type: Agent Skill Reference
title: "SDLC repo hygiene"
description: "Avoid file/folder bloat; balance coupling and cohesion; know when to clean dirs, caches, worktrees, and session leftovers."
tags: [epoch, sdlc, hygiene, cohesion, coupling, cleanup, bloat]
timestamp: 2026-08-20T00:00:00Z
---

# Repo hygiene (anti-bloat, coupling/cohesion, cleanup)

Improve the repository by **adding less surface area** and **removing session leftovers**.
Persona-minimum ([persona-minimum.md](persona-minimum.md)) asks “does a user need this?”;
this file asks “does the **tree** need this path?”

Pair with [operations.md](operations.md) (branches/worktrees), [stages/clean.md](stages/clean.md),
ADR-0017 / `konsistent.json`, and [docs/documentation-freshness.md](../../../docs/documentation-freshness.md).

## Goals

1. **One clear home** for each concern — extend an existing package/module before inventing a
   sibling directory.
2. **Cohesion over scatter** — things that change together live together.
3. **Coupling at boundaries only** — prefer Pact/public APIs between packages; avoid deep
   imports across package internals.
4. **Ephemeral stays ephemeral** — caches, worktrees, build outputs, probe files never become
   permanent tree citizens.

---

## Avoid file / folder explosion

### Before creating a new path

Ask, in order:

1. Does an existing file/module already own this concern? **Edit it.**
2. Does an existing package own the domain? Add under that package’s `src/` (or established
   subfolder) — do **not** mint `packages/Epoch.Something.New` for a thin helper.
3. Is this a one-off script? Prefer `scripts/<verb>-<object>.mjs` next to related scripts, not
   a new top-level directory.
4. Is this agent/process state? Prefer `.sdlc/` (machine) or `docs/plans/<initiative>/`
   (narrative) — not a new `.my-agent/` or `tmp/` committed to git.
5. Is this evidence? One slug under `docs/evidence/<slug>/`, not nested mirrors of the whole
   feature tree.

### Reject (common bloat patterns)

| Pattern | Why it hurts | Prefer |
|---|---|---|
| New package per small feature | Workspace + konsistent + CI surface grows | Module inside the owning package |
| Parallel `utils/`, `helpers/`, `lib/` trees | Orphans with no owner | Colocate next to the only caller; extract only on second use |
| Duplicate skill/docs copies under host trees | Drift | Symlinks via `skills:mirror-sdlc` / host install scripts |
| `*_v2`, `legacy/`, `old/` folders “for later” | Dead weight | Delete or migrate in the same initiative |
| Persona/governance `.feature` files | Process as product | Real persona journeys only ([persona-minimum.md](persona-minimum.md)) |
| New full-stack e2e suite when Pact covers the boundary | Suite explosion | Pact + focused unit/component ([stages/test.md](stages/test.md)) |
| Deep one-file-per-type trees (`types/a.ts`, `types/b.ts`…) | Navigation tax | Group by feature/capability until files are large enough to split |
| Committed `dist/`, `coverage/`, `.npm-cache/`, screenshots dumps | Noise + secrets risk | Gitignore; keep only intentional small evidence artifacts |
| Empty placeholder dirs “for structure” | False architecture | Create directories when the first real file lands |

### Accept (controlled growth)

- New file when an existing module would violate **single responsibility** or become
  unreadable (>~400–600 lines as a soft signal — split by capability, not by layer fashion).
- New package only when there is a **deploy/version/publish boundary**, a distinct runtime,
  or konsistent/workspace rules require it — record a `.sdlc/decisions/` entry (+ ADR if
  material).
- New `docs/` page only when discoverable from `README.md` / `docs/README.md` and required by
  freshness policy — no orphan docs.

### Structural gates

- `npm run konsistent` — workspace layout conventions ([ADR-0017](../../../docs/design-decisions/0017-konsistent-structural-conventions.md)).
- `npm run docs:check` — no broken links / orphaned docs or specs.
- Do **not** weaken `konsistent.json` or ignore rules to land a one-off folder.

---

## Coupling vs cohesion

Aim for **high cohesion, low coupling** — not “more folders = cleaner.”

### Cohesion (keep together)

| Signal | Action |
|---|---|
| Same persona journey edits the same files every time | Keep those modules in one package/feature folder |
| Types only used by one module | Colocate; don’t export “just in case” |
| Test only exists for one production path | Sit next to that path’s package test layout — don’t invent a parallel tree |
| Decision + review + eval for one initiative | `.sdlc/` + one `docs/plans/<slug>/` — don’t fork copies |

### Coupling (keep apart / at edges)

| Signal | Action |
|---|---|
| Package A reaches into Package B’s `src/internal` | Stop — use the package public entry (`src/index.ts`) or a shared contract |
| HTTP/integration between services | **Pact** (or existing contract tests) — not a new e2e harness by default |
| UI importing platform control-plane internals | Cross through documented APIs / events |
| Shared registries, ledgers, persona matrix | **Coordinator-only** edits ([dispatch.md](dispatch.md)); implementers report `cascadeDeltas` |

### Balance heuristics

1. **Fan-in growth** (many callers of a blob) → extract a cohesive module at the shared
   boundary; don’t copy-paste.
2. **Fan-out growth** (one file imports half the monorepo) → split by capability or invert
   dependencies; don’t add a `facade/` folder that re-exports everything.
3. **Change frequency** — files that always land in the same PR belong together; files that
   change for unrelated reasons should not share a mega-module.
4. **“Clean architecture” folder fashion** (`domain/`, `application/`, `infrastructure/` at
   every leaf) is bloat unless the package already uses that layout — **match the package**.

Architecture reviews (`sdlc review --architecture`) must call out new paths that increase
coupling or scatter cohesion without a persona need.

---

## When to clean up

Parent/coordinator owns cleanup. Never `git clean -fdx`. Never delete unrelated user WIP.

### Session / git artifacts

| Artifact | When to clean | How |
|---|---|---|
| Merged session branches | After squash-merge | `sdlc clean --merged-only` (+ `--remote` if tips remain) |
| Linked worktrees for merged layers | Same moment as branch clean | `sdlc clean --worktrees --merged-only` |
| Stale worktree metadata | Dir gone but still listed | `git worktree prune` |
| Abandoned session worktrees (no PR, no In-Progress) | On resume reconcile | See [operations.md](operations.md) / [dispatch.md](dispatch.md); ask if unsure |
| Unmerged session branches | Only with explicit user `--force` auth | `sdlc clean --force …` |

### Generated / cache (local machine — do not commit)

Safe to delete when disk is tight or gates behave oddly; regenerate via normal scripts:

| Path / class | Notes |
|---|---|
| `node_modules/` | `npm ci` after delete |
| `dist/`, build outputs | `npm run build` |
| `coverage/`, c8/nyc outputs | next `npm run coverage` |
| `.npm-cache/`, tool caches | package-manager / tool specific |
| Playwright / test `test-results/`, `blob-report/` (if present) | keep only what evidence needs |
| `.optimizexp/audits/*.json` ephemeral runs | keep if the initiative treats them as evidence; else regenerable |
| `__pycache__/`, `.pytest_cache/` | never commit |

Do **not** commit “cleanup” of gitignored caches. Do **not** add new cache directories to the
repo to “organize” them — rely on `.gitignore`.

### Durable tree hygiene (in PRs)

| Situation | Action |
|---|---|
| Dead code / unused export after the feature | Delete in the same layer that removes the last caller |
| Empty directory left after deletes | Remove the directory in the same commit |
| Orphan doc or feature spec | Delete or link from the README hierarchy before merge |
| Duplicate evidence / screenshot dumps | Keep one canonical pack; delete duplicates |
| Closed initiative `docs/plans/<slug>/` | Keep state/history; don’t create parallel “archive” copies |
| `.sdlc/reviews/` / `evals/` for merged PRs | Keep as append-only history; don’t re-home into random folders |
| Probe / scratch files from agents (`/tmp` copies in-tree) | Delete before commit |

### Cadence

| Moment | Hygiene check |
|---|---|
| Before each commit | No generated caches staged; no empty placeholder dirs; no drive-by new packages |
| After each layer PR | Architecture review flags new path sprawl |
| After stack merge / `sdlc finish` | `sdlc clean --merged-only --worktrees` (+ `--remote`); stop agents |
| `sdlc eval` | Score `minimumSpec` + new `repoHygiene` dimension; backlog deletions |
| Session resume | Reconcile worktrees/branches; prune orphans |

### `sdlc clean` vs broader hygiene

- `sdlc clean` = **git session** branches/worktrees (and optional remotes).
- Repo hygiene = **tree shape** + **local caches** + **deleting dead product paths** in PRs.
- Cache wipes are local ops (report to the user if you recommend them); product deletions are
  normal commits under review.

---

## Brief for implementers

Every implementer brief should include:

- Prefer extending existing modules/packages; justify any new directory in the handback.
- No new packages without coordinator approval + decision record.
- No committed caches or duplicate host skill trees.
- After handback, parent runs worktree/branch clean — implementers do not.

## Related

- [persona-minimum.md](persona-minimum.md) — product surface minimum
- [operations.md](operations.md) — branch/worktree lifecycle
- [stages/clean.md](stages/clean.md) — merged session cleanup flags
- [stages/review.md](stages/review.md) — architecture facet
- [stages/test.md](stages/test.md) — avoid e2e/suite explosion
