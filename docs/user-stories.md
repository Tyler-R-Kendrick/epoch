# Epoch Implemented User Stories

This document lists user stories supported by the current implementation and feature suite. It does not list roadmap stories without executable coverage.

See the [Feature Registry](features.md) for feature IDs and executable coverage links.

## Developer Stories

### DEV-001: Initialize A Signed Repository

**As a** developer,  
**I want** to initialize an Epoch repository with my author name,  
**So that** future events are signed with a local Ed25519 identity.

Acceptance criteria:

- Repository metadata is created on disk.
- Identity uses Ed25519 keys.
- Verification succeeds immediately after initialization.

### DEV-002: Create A Repository Quickly

**As a** developer,  
**I want** one command or SDK call to create an empty signed repository,  
**So that** I can start using Epoch without learning the event log first.

Acceptance criteria:

- Empty repositories verify successfully.
- `init()` remains available for compatibility.
- CLI output names the repository path, author, and event count.

## Operator Stories

### OPS-004: Create A Platform Project Headlessly

**As a** platform operator,  
**I want** to create an organization, project, and repository through the
Epoch.Platform SDK,  
**So that** platform setup can be automated without the web console.

Acceptance criteria:

- Community capability discovery reports disabled when the instance starts with
  Community disabled.
- Project overview lists created repositories.
- Project overview exposes a `Create deployable` empty-state action when no
  deployables exist.

### OPS-019: Manage Epoch Hosting Services

**As an** Epoch operator,  
**I want** a PWA hosting control plane for Epoch-only services,  
**So that** I can deploy, restart, roll back, scale, and inspect the pieces
needed to host Epoch.

Acceptance criteria:

- Platform Web describes Epoch node, object store, sync seed, and deployable app
  services.
- Platform Web can register the Community app as a deployable service.
- Platform Web does not own repository browsing, issue, review, or discussion
  workflows.

## Tooling Stories

### TOOL-007: Use The Epoch Community App

**As an** Epoch maintainer,  
**I want** a separate GitHub-like community web app,  
**So that** repository discovery, issues, reviews, discussions, releases, and
profiles live outside the hosting control plane.

Acceptance criteria:

- Community API owns repository records with maintainers, topics, issues,
  change proposals, and discussions.
- Community Core exposes the API client used by Community Web and Community CLI.
- Community API can open issues, propose changes, and record maintainer reviews.
- Community Web exports a deployable app descriptor that Platform Web can manage
  without importing Community packages.
- Community Web is covered by a Gherkin feature driven through Playwright.
- Community Web site releases are materialized through an Epoch repository so
  site changes are represented by signed branch, merge, version, verification,
  and rollback-target events.
- Community Web renders a branded design-system shell with discoverable
  workflows, repository cards, visible focus, and skip-link navigation.
- Community Core and API are covered by Pact contract tests for their HTTP
  boundary.
- Community API, Core, CLI, and Web appear in the c8 coverage report.

### TOOL-008: Drive Community Work Through Persona Scenarios

**As a** GitHub open-source contributor,
**I want** Community features to begin with design-thinking and user-centric
persona-driven Gherkin scenarios,
**So that** contribution workflows solve real trust, security, cost,
accessibility, moderation, degraded-state, and portability problems before
implementation details are chosen.

Acceptance criteria:

- Community human-centered design documents the default persona as a GitHub
  open-source contributor.
- Community feature work adds or updates persona-driven scenarios under
  `features/` before implementation.
- Scenarios name the contributor journey, pain point, trust question,
  degraded-state behavior, and validation evidence.
- Scenarios name the design-thinking stage and user-centric success criteria.
- Repository and agent instructions require Community work to keep those
  persona scenarios current.
