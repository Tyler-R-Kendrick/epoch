---
product: Sapling
design_sources:
  - https://sapling-scm.com/docs/overview/smartlog/
  - https://sapling-scm.com/docs/addons/isl
  - https://sapling-scm.com/docs/introduction/getting-started
---

# Design

## Look And Feel

Sapling's signature design is the smartlog: dense terminal graph output that hides irrelevant history and foregrounds the user's stack, remote main, current checkout, landed commits, PR numbers, review status, and CI state. Its Interactive Smartlog adds a local web UI for commit trees, drag-and-drop rebasing, commit/amend flows, and automatically refreshing repository state.

## Open Design Assets

- Official smartlog documentation with terminal examples.
- Interactive Smartlog docs with screenshot references for overview, goto commits, uncommitted changes, and drag/drop workflows.
- ReviewStack docs and links for pull request review UI.

## Differentiators

- Sapling's design is not decoration; it is a mental-model repair for DVCS.
- It collapses many Git concepts into one stateful graph view.
- Interactive Smartlog turns advanced stack manipulation into direct manipulation.

## What Works

- Smartlog is immediately useful for experts and learners.
- Hiding irrelevant commits prevents large history from overwhelming the user.
- PR and CI context in the graph connects local work to review status.

## UX Breakdowns

- The best scale story depends on Meta infrastructure that is not fully public.
- Users still need to learn Sapling's command set and stack model.
- Interactive Smartlog is powerful but not a full replacement for all CLI workflows.

