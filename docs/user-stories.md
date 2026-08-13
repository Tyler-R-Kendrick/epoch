# Epoch Implemented User Stories

This document lists user stories supported by the current implementation and feature suite. It does not list roadmap stories without executable coverage.

See the [Feature Registry](features.md) for feature IDs and executable coverage
links, and the [Executable Feature Scenario Inventory](feature-scenario-inventory.md)
for scenario-level persona records.

## Developer Stories

### DEV-005: Find Work Across Sources Without Hidden AI

**As a** contributor,
**I want** strict deterministic search across every registered source,
**So that** I can trust why an Entity matched and whether any source is stale or missing.

Acceptance criteria:

- Text and equivalent GraphQL inputs produce the same authorized targets.
- Syntax errors identify the exact span and suggest approved fields/values.
- Search reports snapshot and source completeness rather than silent omission.
- Explain names normalization, pushdown, residual evaluation, authorization,
  order, and omissions without exposing unreadable Entities.
- Ordinary search never invokes AI.

### DEV-006: Organize Canonical Entities In My Own Namespace

**As a** contributor,
**I want** to define, preview, mount, and recover declarative projections,
**So that** I can arrange work around my task without changing canonical identity.

Acceptance criteria:

- The same Entity can have multiple stable Projection Entries and paths.
- Mount precedence and shadowing are deterministic and explainable.
- Invalid/cyclic definitions are quarantined and exportable.
- `/.epoch/default` remains reachable after a broken custom root.
- Queued updates preserve focus and reading position until explicitly applied.
- Ambiguous writes and recovery-namespace mutation fail closed.

### DEV-003: Evolve A Stable Change Safely

**As a** contributor,
**I want** stable Change identity across Revisions, splits, Change Graphs, and Review Bundles,
**So that** review context survives rebases, parallel heads, and presentation changes.

Acceptance criteria:

- Atomic split reconstructs the original snapshot exactly or fails without mutation.
- Revision heads and superseded revisions retain stable identities.
- Partial merge is dependency-closed; squash preserves source provenance.
- Stale review/gate/target evidence blocks merge with a typed explanation.
- `epoch change create` appends a signed `change.created` event that `epoch verify` accepts.

### DEV-004: Work With Partial Data Honestly

**As a** contributor,
**I want** metadata-only replicas and workspaces to distinguish availability from integrity,
**So that** I can hydrate safely without mistaking promised bytes for corruption.

Acceptance criteria:

- Manifests and promises are versioned and verified before materialization.
- Range fetch occurs only when verified chunk boundaries prove it.
- Workspace reports residency, materialization, storage, and execution separately.
- Full checkout and verified export remain available escape paths.

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

### OPS-022: Operate Convergence Boundaries

**As a** platform operator,
**I want** protocol, quarantine, mirror, identity-budget, and archive state reported independently,
**So that** I can diagnose lag or rejected data without inventing success.

Acceptance criteria:

- Git and native sync report negotiated capabilities and bounded limits.
- Quarantined/rejected objects are never reported as mirrored or archived.
- Mirror drift creates a conflict/import ref and pauses only the affected ref.
- Support bundles redact private sessions and credentials; dangerous operations
  name authority and require confirmation.

### OPS-023: Archive Public Source Without Leaking Private Work

**As a** security/compliance responder,
**I want** deterministic SWHIDs and verified public archive receipts,
**So that** preserved source is independently identifiable without exposing private sessions.

Acceptance criteria:

- Local SWHID computation and verification do not require network access.
- Archive requests require public visibility and explicit authority.
- Remote archival is confirmed only from a matching succeeded/full result.
- Private archive requests fail without including private content in output.

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

### OPS-020: Manage Community Sandbox Workspaces

**As a** community contributor,
**I want** a browser-based sandbox workspace for repository changes,
**So that** I can contribute without local setup while maintainers still get
checks, changed files, patch intent, preview, and signed provenance.

Acceptance criteria:

- Community Operations exports a deployable app descriptor that Platform Web can
  register without importing the implementation package.
- Community Operations projects hosted apps, workflow runs, agent sandboxes,
  runner capacity, and signed activity from Platform SDK/Core state.
- A contributor can start from a repository, choose a workspace template, review
  the cost owner and security policy before launch, edit code, run checks, and
  submit the workspace as a signed patch intent.
- A contributor can resume an interrupted sandbox workspace without losing the
  repository, goal, changed files, recovery state, or agent context needed to
  continue from a signed workspace snapshot.
- A maintainer can review a submitted sandbox workspace result, inspect changed
  files and passing checks, see preview/provenance state, and approve or reject
  the patch.
- Hosted app cards show repository source, runtime, environment, deployment
  health, runner, secret count, operator identity, signed event ID, and links
  for create-preview, logs, promotion, and rollback actions.
- GitHub Actions workflow definitions are represented as imported source
  metadata, with Epoch runner jobs named as the execution authority.
- Workflow and sandbox cards show imported workflow source, run state, job
  linkage, agent identity, model/provider, policy, input intent, output patch,
  signed provenance, re-run, and sandbox-result actions.
- Agent sandbox cards can show implementation-specific runtime metadata without
  making that adapter part of Platform Core.
- Runner and activity sections show capacity, online status, audit event IDs,
  and signed provenance without exposing plaintext secrets.

### OPS-021: Manage Community Agent Sandboxes

**As a** maintainer,
**I want** policy-bound agent sandboxes for signed patch intents,
**So that** agents can help with repository work without bypassing human
approval, secret policy, or provenance.

Acceptance criteria:

- A maintainer can start from a repository patch intent, choose an approved
  agent, review sandbox policy and resource limits, and start an agent sandbox.
- Agent sandbox runs are projected from the same Community Operations extension
  model over Platform SDK/Core AI action plans, not from Platform Web or
  Platform Core imports of Community Operations.
- A running sandbox records the input intent, approved agent, policy summary,
  resource limits, action plan id, and signed invocation event.
- A completed sandbox result records transcript summary, changed files, checks,
  output patch intent, preview id, and signed output event for maintainer
  review.
- A failed sandbox keeps the signed failure event and diagnosis visible when the
  maintainer retries the run.
- A retry creates a separate queued sandbox linked to the previous failed run
  and preserves the no-secret policy and agent context needed to continue.

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
- Community Web has one runtime: the CanvasUI creator landing at `/` and the
  tmux-style, keyboard-first Nightboard at `/board.html`; local and Vercel
  entrypoints serve those same files.
- Community objects keep stable opaque IDs while channel, thread, DM, Activity,
  search, saved-query, project, and filesystem-like projections provide
  contextual locations over one explicit relation graph.
- Nightboard uses a hierarchical navigator + detail blade; exact namespace,
  reply ancestry, browser history, previous shell location, and top-layer
  cancellation remain separately invokable and testable.
- Canonical, contextual, and exact HTTPS links contain stable references rather
  than private content, and legacy locators migrate without losing work.
- Keyboard, pointer, CLI, slash, voice, macros, and WebMCP resolve through one
  permissioned action registry; feed, thread tree, and prompt completion follow
  their WAI-ARIA interaction contracts.
- The historical document renderer has no local or production route.
- Community Core and API are covered by Pact contract tests for their HTTP
  boundary.
- Community API, Core, CLI, and Web appear in the c8 coverage report.

### TOOL-008: Drive Community Work Through Persona Scenarios

**As a** GitHub open-source contributor,
**I want** Community features to begin with design-thinking and user-centric
product scenarios,
**So that** contribution workflows solve real trust, security, cost,
accessibility, moderation, degraded-state, and portability problems before
implementation details are chosen.

Acceptance criteria:

- Community human-centered design documents the default persona as a GitHub
  open-source contributor.
- Community feature work adds or updates persona-tagged scenarios in the
  relevant product feature specs under `features/` when user-visible behavior
  changes.
- Personas are scenario context, not standalone features.
- Agent instructions, test procedures, evidence recording, persona-matrix
  audits, and repository governance checks are not encoded as `.feature`
  scenarios.
- Scenario-level persona records stay current in the executable feature
  scenario inventory.
- Scenarios name the contributor journey, pain point, trust question,
  degraded-state behavior, and validation evidence.
- Scenarios name the design-thinking stage and user-centric success criteria.
- Repository and agent instructions require Community work to keep those
  persona scenarios current.
