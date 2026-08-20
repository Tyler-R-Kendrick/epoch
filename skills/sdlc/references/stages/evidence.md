---
type: Agent Skill Reference
title: "SDLC evidence"
description: "Publish Playwright traces/video/snapshots, Pact logs, and NL summaries; post a standard evidence block on every related PR."
tags: [epoch, sdlc, evidence, playwright, pact, pull-request]
timestamp: 2026-08-20T00:00:00Z
---

# `sdlc evidence`

For a **completed** user-visible feature, publish a durable evidence pack humans can skim and
agents can re-run, then **post that evidence on every related PR** in a visible, standard
format (PR body section + sticky comment).

## Flags

| Flag | Meaning |
|---|---|
| `--feature <slug>` | Evidence directory slug under `docs/evidence/<slug>/` (required) |
| `--pr <n>` | Post/update evidence on this PR only (default: all open PRs in the session/stack) |
| `--comment-only` | Skip rewriting the PR body; only post/update the sticky comment |
| `--dry-run` | Print the evidence block; do not write files or comment |

## Required artifacts (repo)

Place under `docs/evidence/<slug>/` (link from that README so `docs:check` stays green):

| Artifact | Notes |
|---|---|
| `README.md` | Natural-language summary: persona, outcome, what passed/failed, how to replay |
| Playwright trace / video | Prefer `.zip` trace; include `.mp4` when the suite is configured to record video |
| Snapshots | PNGs or HTML snapshots for critical persona views |
| Replayable script | Command block in README (cucumber tag, Pact test name, or Playwright project) |
| Pact logs | When contracts changed — point at `.pact-logs/` outputs or copied fixtures |

Do not commit huge binaries without need; prefer traces + small snapshots. Follow existing
evidence README patterns under `docs/evidence/`.

## When to post on PRs

| Moment | Action |
|---|---|
| First open/update of a PR that lands user-visible work | Include the **SDLC evidence** section in the PR body (template below) |
| After `sdlc test` / Playwright / Pact produces new artifacts | Re-run `sdlc evidence` and **update** the sticky PR comment |
| Before bottom-up squash-merge (`sdlc finish` / stack closeout) | Evidence comment must exist on each PR in the session set; missing → block merge until posted |
| Stack layers | Post on **each** layer PR that carries persona-visible change; foundation-only layers may note “no persona UI — contracts only” with Pact links |

Parent/coordinator owns posting. Subagents may draft the pack under `docs/evidence/`; they
do not skip the PR comment.

## Standard PR format (mandatory)

Use this exact heading so humans and agents can find/replace it. Prefer a **sticky comment**
(latest comment whose first line is `## SDLC evidence`) plus the same section in the PR body.

### Body + comment template

Paste the following into the PR body and as a sticky comment. Under **Replay**, include a
fenced `bash` block with the exact commands from `docs/evidence/<slug>/README.md`.

~~~~
## SDLC evidence

| Field | Value |
|---|---|
| Feature | `<slug>` |
| Personas | `@persona.…` |
| Outcome | one sentence |
| Pack | `docs/evidence/<slug>/` |
| Scenarios | `features/….feature` (tags) |
| Contracts | Pact consumer/provider names, or `n/a` |
| Gates | `gate:commit` / `gate:push` / `verify` slices run |
| Review | `.sdlc/reviews/<pr-or-layer>.yaml` if present |

### Artifacts

- Summary: `docs/evidence/<slug>/README.md`
- Trace / video: … (path or “not recorded — reason”)
- Snapshots: …
- Pact / logs: …

### Replay

(fenced bash: paste exact commands from the evidence README)

### Gaps / follow-ups

- …
~~~~

Rules for the block:

1. Keep the `## SDLC evidence` heading verbatim (search key for updates).
2. Fill every table row (`n/a` when not applicable — do not omit rows).
3. Link the pack with a path reachable from the PR (relative repo path is enough; GitHub
   resolves it on the head branch).
4. Do not bury evidence only in commit messages or Linear — the PR must show it without
   leaving GitHub.

### How to post / update

```bash
# 1. Ensure pack exists under docs/evidence/<slug>/
# 2. Write body section when creating/updating the PR:
gh pr edit <n> --body "$(cat <<'EOF'
…existing Summary / Test plan…

## SDLC evidence
…
EOF
)"

# 3. Sticky comment (preferred visibility for reviewers):
#    - If an open comment already starts with "## SDLC evidence", edit it (gh api) or
#      delete+recreate; otherwise:
gh pr comment <n> --body "$(cat <<'EOF'
## SDLC evidence
…
EOF
)"
```

When editing an existing PR body, **replace** the prior `## SDLC evidence` section in place;
do not append a second copy.

## Repo README template

```markdown
# Evidence: <feature>

- Personas: …
- Outcome proven: …
- Scenarios: `features/….feature` …
- Contracts: `npm run test:pact` …
- Replay: …
- Gaps / follow-ups: …
```

## Done

- README reachable from docs hierarchy.
- Replay commands work on a clean checkout (or document fixtures required).
- Link evidence from the initiative `sdlc-state.md`.
- Every related open PR has an up-to-date `## SDLC evidence` body section **and** sticky
  comment (or `--comment-only` was intentional and the body already has the section).
