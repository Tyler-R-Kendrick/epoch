---
product: Daytona
design_sources:
  - https://www.daytona.io/
  - https://www.daytona.io/docs/
  - https://www.daytona.io/changelog
  - https://www.daytona.io/dotfiles/sandbox-spending
  - https://www.daytona.io/changelog/sandbox-activity-and-resource-limits
---

# Design

## Look And Feel

Daytona uses a dark, high-contrast infrastructure aesthetic on the marketing site and a docs-led developer interface for implementation details. The public surfaces foreground code snippets, sandbox lifecycle concepts, pricing calculators, changelog screenshots, and dashboard tables for spending, activity, resource limits, and regions.

## Open Design Assets

- Public docs expose screenshot and dashboard references for spending, resource limits, activity, webhooks, and sandbox pages.
- Changelog posts include light and dark dashboard screenshots for recent UX changes.
- No public design-token package was found in the reviewed sources.

## Differentiators

- The design centers the sandbox as a running computer, not just a code interpreter.
- Pricing and resource controls are unusually visible, which fits agent workloads where runaway execution can become a product risk.
- Computer Use documentation makes GUI automation a first-class sandbox capability with screenshots, recordings, display operations, and accessibility-tree APIs.

## What Works

- The docs give agents and developers a clear API-shaped path: create a sandbox, run code, manage files, control processes, snapshot, fork, and tear down.
- Recent dashboard changes expose last activity, per-sandbox resource limits, and per-sandbox spending, helping users connect cost to actual agent behavior.
- The visual posture is credible for infrastructure buyers while still feeling current for AI-agent builders.

## UX Breakdowns

- The product spans many concepts: sandbox states, snapshots, forks, archives, limits, regions, spending, computer use, recordings, and network controls.
- Computer Use support is uneven across operating systems, with Linux available and Windows/macOS in private alpha.
- Per-second pricing is transparent but cognitively expensive for teams that need predictable unit economics.

## Epoch Design Lessons

- Cost, activity, and resource state should be visible beside agent work history.
- If Epoch records sandbox-backed work, it should connect environment state to commit and verification records instead of treating runtime logs as separate artifacts.
- GUI automation evidence needs screenshots and recordings, but those assets should be tied to signed provenance and not just dashboard media.
