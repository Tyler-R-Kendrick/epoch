---
product: GitButler
design_sources:
  - https://gitbutler.com/
  - https://docs.gitbutler.com/overview
  - https://docs.gitbutler.com/features/virtual-branches/overview
  - https://docs.gitbutler.com/features/virtual-branches/branch-lanes
  - https://docs.gitbutler.com/features/ai-tools
---

# Design

## Look And Feel

GitButler presents Git as a desktop workspace with branch lanes, change cards, commit controls, and repository status clustered around the working tree. The design is product-led and visual: it gives local changes a board-like shape so developers can drag, assign, split, commit, and push work without repeatedly translating intent into command-line state.

## Open Design Assets

- The public website and docs include screenshots and diagrams for virtual branches, branch management, and AI tools.
- There is no formal public design-token package in the docs reviewed for this pass.
- The open-source repository is the practical reference for native app UI implementation details.

## Differentiators

- The most important design differentiator is the virtual-branch lane model. It makes independent streams of work visible in a single working directory.
- Branch and commit operations are framed as object manipulation rather than command recall.
- AI affordances are placed near commit and branch cleanup jobs, where assistance can save time without taking over the whole development process.

## What Works

- The UI gives a concrete visual answer to "what am I working on right now?" across multiple parallel tasks.
- It reduces stash and checkout churn for developers who context-switch often.
- It makes stacked or split review preparation feel like a first-class local workflow rather than an expert-only Git ritual.

## UX Breakdowns

- The model adds a layer of product-specific state and vocabulary on top of Git, which can confuse users when the CLI and app disagree.
- Visual branch lanes are powerful for individuals but do not by themselves solve organization-wide audit, signature, or policy questions.
- Desktop-app centric workflow can be awkward for browser-only environments, remote development containers, and tightly controlled enterprise machines.

## Epoch Design Lessons

- Epoch should make actor intent and reviewable units visible, not just cryptographically present.
- A future Epoch UI should distinguish signed event history from Git-like branch cosmetics, while still making common local operations feel direct and tactile.
