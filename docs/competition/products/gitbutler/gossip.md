---
product: GitButler
gossip_sources:
  - https://github.com/gitbutlerapp/gitbutler/issues
  - https://www.reddit.com/r/git/comments/1bbo1de/virtual_branches_from_gitbutler/
  - https://www.reddit.com/r/programming/comments/1bdq4an/gitbutler_a_git_client_for_simultaneous_branches/
---

# Gossip

## What People Say

Public discussion tends to split between enthusiasm for virtual branches and caution about adding another abstraction over Git. Developers like the promise of keeping several tasks live at once, but skeptical Git users ask how recoverable the state is when they leave the app or return to the CLI.

## Bug And Friction Themes

- GitHub issues show the typical surface area of a fast-moving native Git client: repository-state edge cases, push/pull behavior, branch synchronization, and UI-specific workflows.
- Reddit discussion frequently focuses on whether virtual branches are genuinely new or a friendlier packaging of worktrees, patch stacks, and careful staging.
- The product needs trust because it manipulates local work in a domain where users are very sensitive to data loss and confusing history.

## Product Risk For Epoch

GitButler could become the default "better history UX" example for users who do not distinguish between workflow ergonomics and storage semantics.

## Opportunity For Epoch

Epoch can integrate with or emulate the good parts of visual intent splitting while emphasizing signed, durable, content-addressed evidence that survives outside a single desktop client.
