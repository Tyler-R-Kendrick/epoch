---
type: Agent Skill Reference
title: "SDLC clean"
description: "Delete merged session branches and worktrees locally and/or remotely with safe flags."
tags: [epoch, sdlc, clean, worktree, branch]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc clean`

Remove **session** delivery branches and git worktrees after they are merged (or when the
user explicitly authorizes `--force`). Never delete unrelated user WIP.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--local` | on if none of local/remote/worktrees set | Delete local branches |
| `--remote` | off | Delete `origin/<branch>` for cleaned branches |
| `--worktrees` | off | Remove linked worktrees whose branch is cleaned |
| `--merged-only` | **on** | Only delete branches fully merged into `origin/main` |
| `--dry-run` | off | Print actions; change nothing |
| `--force` | off | Allow deleting unmerged session branches — **requires explicit user auth in chat** |

If the user passes only `--remote` or only `--worktrees`, do not also imply `--local` unless
they asked to clean everything.

## Scope: what is a “session” branch

Union of:

1. Branches recorded in `docs/plans/<initiative>/sdlc-state.md` / `.sdlc/state/current.yaml`.
2. Branches named `sdlc/<initiative>-*`, `feat/<session-slug>`, or listed in this conversation’s stack.
3. Worktrees under the repo’s worktree list whose branch matches (1)–(2).

Exclude: `main`, protected release branches, branches with unpushed commits the user did not
authorize discarding, and any path outside the session set.

## Algorithm

```bash
git fetch origin
git branch --merged origin/main
git worktree list --porcelain
gh stack view --json 2>/dev/null || true
```

1. Build the candidate set; if `--merged-only`, intersect with merged-into-`origin/main`.
2. If `--dry-run`, print `would delete` lines and stop.
3. If any candidate is **not** merged and `--force` is absent, skip it and warn.
4. If `--force` and unmerged candidates exist, confirm the user already authorized force in this
   turn; otherwise refuse.
5. Order: detach/remove **worktrees** first (`git worktree remove`), then local branches
   (`git branch -d` or `-D` only with `--force`), then remote (`git push origin --delete`).
6. Append outcome to `docs/plans/dispatch-log.md` and clear stale pointers in
   `.sdlc/state/current.yaml` when the initiative is fully cleaned.

## Hard rules

- No `git clean -fdx`, no wiping untracked user files.
- No force-push; remote delete of a branch tip is allowed only for session branches.
- Prefer `-d` (merged) over `-D`.
- Only the **parent/coordinator** runs clean — not implementer subagents.
- Full when/how for create vs destroy: [../operations.md](../operations.md).
- Broader tree/cache hygiene (not just branches): [../repo-hygiene.md](../repo-hygiene.md).
