---
type: Agent Skill Reference
title: "SDLC operations"
description: "When and how to use subagents, create/destroy branches, and create/destroy worktrees during an SDLC loop."
tags: [epoch, sdlc, subagents, branches, worktrees, operations]
timestamp: 2026-08-20T00:00:00Z
---

# SDLC operations (subagents, branches, worktrees)

Coordinator-owned lifecycle. Subagents implement; they do not invent stack topology, merge,
or clean up unrelated user work. Pair with [dispatch.md](dispatch.md),
[stacked-prs.md](stacked-prs.md), [stages/clean.md](stages/clean.md),
[finish.md](finish.md), and [repo-hygiene.md](repo-hygiene.md) (path sprawl + caches).

## Decision cheat sheet

| Need | Prefer | Avoid |
|---|---|---|
| Isolated one-shot layer | Cloud coding agent (own branch + PR) | Sharing the coordinator working tree |
| Adjacent shared files / fast red-green | Local subagent in a **dedicated worktree** | Two agents on the same package |
| Single tiny fix, no delegation | Coordinator sequential (no subagent) | Spawning agents for trivial edits |
| 2+ dependent layers | `gh stack` + one agent per layer | One mega-branch |
| After squash-merge | `sdlc clean --merged-only` (+ `--worktrees` / `--remote` as needed) | Leaving merged branches/worktrees forever |
| Unmerged WIP the user still wants | Leave it; never `--force` without chat auth | `git clean -fdx`, wiping other people's branches |

---

## Subagents

### When to create / spawn

Spawn an implementer when **all** hold:

1. User permission for offload was granted for this initiative (or batch) — see
   [dispatch.md](dispatch.md) permission gate.
2. The work is a **bounded layer** with a written acceptance checklist (Linear issue or plan
   slice).
3. A backend is available (`github-coding-agent`, harness subagent, etc.); otherwise use
   sequential-fallback (coordinator implements).

Prefer:

| Situation | Backend |
|---|---|
| Isolated package scope, no shared-file edits | Cloud coding agent (**preferred**) |
| Touches coordinator-owned shared files lightly, needs fast feedback | Local subagent + worktree |
| Review-only between stack layers | Read-only `reviewer` / `sdlc review` — **not** an implementer |

Spawn a **reviewer** (or run `sdlc review` yourself) after each layer PR is ready and before
bottom-up merge. Reviewers are read-only: no commits, no merges, no Linear edits.

### When not to spawn

- Brainstorm / plan / stack topology / Linear / shared registries — **parent only**.
- Trivial one-file fix the coordinator can land in one red→green cycle.
- Second agent on a package already claimed (per-package exclusivity).
- Merge, rebase-upstack, or `sdlc clean` — parent only.

### How to brief

Every implementer brief must include:

- Issue id + acceptance checklist + branch name request (`sdlc/<id>-NN-<slug>`).
- Incremental checkins: commit after each red→green; `npm run gate:commit`; never hook-bypass.
- Persona tags / feature paths in scope; no orphan tests.
- Handback: local `.sdlc/report.json` or PR fenced `sdlc-report` block ([dispatch.md](dispatch.md)).
- Explicit **out of scope**: Linear, stack restructure, squash-merge, deleting branches/worktrees.

### When to tear down / stop a subagent

| Event | Action |
|---|---|
| Handback received and verified (gates + review) | Stop the agent; ingest report; parent applies `cascadeDeltas` |
| Review findings | Re-brief same worktree/PR; do not open a parallel agent on the same package |
| Agent stuck / abandoned | Reconcile ([dispatch.md](dispatch.md) Resume): reclaim branch; prune only **orphan** worktree metadata |
| Layer squash-merged | Agent already stopped; run `sdlc clean` for branch/worktree |

Never leave an implementer running after its PR is merged. Never let a dead agent’s dirty
worktree become the coordinator’s default checkout without an explicit checkout.

---

## Branches

### When to create

| Trigger | Command / pattern |
|---|---|
| New single-layer delivery | `git checkout -b feat/<short-slug>` or `sdlc/<issue-id>-<slug>` off `origin/main` |
| Stack bottom | `gh stack init sdlc/<id>-01-<slug>` |
| Stack upper layer | From stack top: `gh stack add sdlc/<id>-NN-<slug>` |
| Finish found work on `main` | Create delivery branch **before** committing ([finish.md](finish.md)) |

Record planned names in `docs/plans/<initiative>/sdlc-state.md` before dispatch. Cloud agents
may rename — record the **actual** branch from the handback.

### When not to create

- Extra branches for “maybe later” work without a layer in the plan.
- Branches that duplicate an open stack layer.
- Committing product work on bare `main` when policy forbids it.

### How to name

```text
sdlc/<initiative-or-issue>-NN-<slug>   # stack layers (preferred)
feat/<short-slug>                     # single PR
fix/<short-slug>                      # isolated bugfix (own PR/stack)
```

`NN` is dependency order (`01` bottom). Keep slugs short and stable across rebases.

### When to destroy

| Condition | How |
|---|---|
| Branch squash-merged into `origin/main` | `sdlc clean --merged-only` (local); add `--remote` to delete `origin/<branch>` |
| Stack tool already deleted remote on merge | Still clean local + worktrees |
| Unmerged session branch, user said discard | `sdlc clean --force` **only** with explicit user auth this turn |
| Unrelated user WIP | **Never** delete |

Prefer `git branch -d` (merged) over `-D`. No force-push to rewrite history unless the user
explicitly ordered it for that branch.

### Parent vs subagent

| Actor | May create branch? | May delete branch? |
|---|---|---|
| Parent | Yes (stack + finish) | Yes via `sdlc clean` after merge / authorized force |
| Implementer | Only the branch it was assigned (or cloud-created) | No |
| Reviewer | No | No |

---

## Worktrees

### When to create

Create a linked worktree when:

1. A **local** subagent needs isolation from the coordinator’s dirty tree, or
2. Two stack layers must progress without checkout thrashing, or
3. Independent verification needs a clean checkout of a PR branch while the parent stays on
   another layer.

```bash
git fetch origin
# path convention — keep under a sibling or repo-local worktrees dir you already use
git worktree add -b sdlc/<id>-NN-<slug> <path> origin/main
# or attach an existing stack branch:
git worktree add <path> sdlc/<id>-NN-<slug>
```

Prefer one worktree **per active local layer**. Cloud agents do not need a local worktree.

### When not to create

- Cloud-dispatched work (isolation is remote).
- Sequential-fallback on the coordinator tree for a single layer.
- Nested worktrees inside another worktree’s path.

### How to use

- Point the subagent’s cwd at the worktree path; handback file: `<worktree>/.sdlc/report.json`.
- Parent remains on its own checkout for plan/state/shared files.
- Cap concurrency: never two local agents on the same package ([dispatch.md](dispatch.md)).

### When to destroy

| Condition | How |
|---|---|
| Layer merged and branch cleaned | `sdlc clean --worktrees --merged-only` (removes worktree **before** deleting branch) |
| Handback ingested, worktree idle, branch still open | Keep until merge **or** remove only if you will continue on a different checkout of the same branch |
| Stale metadata (dir already gone) | `git worktree prune` — metadata only |
| Unmerged worktree with user WIP | Do not remove without `--force` auth |

Order matters: **remove worktree → delete local branch → delete remote**
([stages/clean.md](stages/clean.md)).

```bash
git worktree list --porcelain
git worktree remove <path>          # clean tree
# git worktree remove --force <path>  # only with user auth; still no git clean -fdx on other paths
```

---

## Session lifecycle (put together)

```text
init / resume
  → plan layers + record branches in sdlc-state
  → create stack branches (and local worktrees only for local agents)
  → spawn implementers (permission-gated)
  → incremental commits + gate:commit
  → submit PRs → sdlc review → sdlc evidence (PR sticky comment)
  → bottom-up squash-merge (finish)
  → stop agents → sdlc clean --merged-only [--worktrees] [--remote]
```

If resume finds an orphan worktree with no In-Progress issue and no open PR, prune metadata or
remove only when the branch is session-scoped and merged — otherwise ask the user.

## Related

- [dispatch.md](dispatch.md) — backends, handback, Done rule
- [stacked-prs.md](stacked-prs.md) — `gh stack` non-interactive rules
- [stages/clean.md](stages/clean.md) — delete flags
- [stages/evidence.md](stages/evidence.md) — PR evidence format
- [repo-hygiene.md](repo-hygiene.md) — anti-bloat and cache/dir cleanup
- [finish.md](finish.md) — land + merge authorization
