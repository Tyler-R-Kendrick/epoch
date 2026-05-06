---
product: Jujutsu
design_sources:
  - https://docs.jj-vcs.dev/
  - https://github.com/jj-vcs/jj
---

# Design

## Look And Feel

Jujutsu's primary design surface is terminal output plus Material for MkDocs documentation. The UX is language and command centered: concise CLI commands, graph output, revsets, operation IDs, and conflict markers that expose internal structure directly.

## Open Design Assets

- Official docs are the main open design artifact.
- Terminal output examples in docs act as screenshots for core workflows.
- The repository README and docs describe status, roadmap, and Git compatibility constraints.

## Differentiators

- The UI treats history rewriting as safe and reversible through the operation log.
- Conflicted commits are normal repository states rather than failed commands.
- Automatic working-copy commits remove the Git index from the core flow.

## What Works

- Power users get a simpler mental model for stacked, rewritten, and rebased work.
- Undo and operation restore reduce fear around advanced workflows.
- Git backend support makes adoption incremental.

## UX Breakdowns

- The model is still a new VCS vocabulary layered near Git vocabulary: changes, revisions, operations, bookmarks, revsets, and Git refs.
- Git colocation can confuse users when Git tools and `jj` disagree about conflicts, branches, or metadata.
- GitHub/GitLab review flows do not naturally understand Jujutsu's default stacked/rewrite workflow.

