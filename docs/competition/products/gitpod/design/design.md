---
product: Gitpod
design_sources:
  - https://www.gitpod.io/docs
  - https://www.gitpod.io/assets/style-guide.pdf
  - https://preview.gitpod.io/blog/introducing-gitpod-flex
  - https://www.gitpod.io/docs/flex/introduction/zero-trust
---

# Design

## Look And Feel

Gitpod's current public surface is clean, bright, and documentation-led. The docs use a modern sidebar-and-content system with sparse illustrations, screenshots, code snippets, and security architecture diagrams. The product screenshots emphasize dashboards, projects, runners, automations, and environment launch rather than chat or agent spectacle.

## Open Design Assets

- Gitpod publishes a brand style guide PDF with typography and brand guidance.
- Public docs and launch posts include dashboard and architecture screenshots.
- No standalone public design-token package was found in the reviewed sources.

## Differentiators

- The zero-trust architecture diagram is a design asset as much as a technical artifact: it makes the management-plane and runner boundary legible.
- Gitpod Desktop extends the same environment idea to local machines, giving the product a local-cloud continuity story.
- The design makes automations and Dev Containers feel like enterprise-standard configuration, not personal setup hacks.

## What Works

- The visual style is calm and credible for security-conscious teams.
- Runner, project, secret, audit, and automation concepts are explained in product language that maps to platform responsibilities.
- The docs make the trust boundary concrete: source code and secrets stay in the customer's network while the management plane handles policy and orchestration.

## UX Breakdowns

- The shift from Gitpod Classic to Flex creates naming and migration overhead for users who remember the older hosted workspace product.
- The architecture-first story can slow down first value for individuals who just want to open a repository and code.
- Some platform options remain availability-constrained, such as Desktop platform support and runner choices, so the visual promise can outpace current access.

## Epoch Design Lessons

- Architecture diagrams can be primary UX when trust boundaries matter.
- Epoch should make local, hosted, and agent-run execution boundaries visible without forcing users through a long security explainer.
- The product should preserve a simple path for contributors while still giving platform operators a precise provenance model.
