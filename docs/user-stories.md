# Epoch Implemented User Stories

This document lists user stories supported by the current implementation and feature suite. It does not list roadmap stories without executable coverage.

See the [Feature Registry](features.md) for feature IDs and executable coverage links.

## Developer Stories

### DEV-001: Initialize A Signed Repository

**As a** developer,  
**I want** to initialize an Epoch repository with my author name,  
**So that** future events are signed with a local Ed25519 identity.

Flow:

1. Run `epoch init --author alice`.
2. Epoch creates `.epoch/` metadata, an identity document, event/blob directories, and heads.
3. Run `epoch verify`.
4. Verification reports `ok`.

Acceptance criteria:

- Repository metadata is created on disk.
- Identity uses Ed25519 keys.
- Verification succeeds immediately after initialization.

### DEV-002: Create A Repository Quickly

**As a** developer,  
**I want** one command or SDK call to create an empty signed repository,  
**So that** I can start using Epoch without learning the event log first.

Flow:

1. Run `epoch create ./repo --author alice` or call
   `EpochRepository.create("./repo", { author: "alice" })`.
2. Epoch creates `.epoch/` metadata, identity, event/blob directories, and heads.
3. Run `epoch --repo ./repo verify`.

Acceptance criteria:

- Empty repositories verify successfully.
- `init()` remains available for compatibility.
- CLI output names the repository path, author, and event count.

### DEV-003: Record A File As A Signed Event

**As a** developer,  
**I want** to record a workspace file,  
**So that** the repository has a signed, content-addressed event for that change.

Flow:

1. Write a file in the workspace.
2. Run `epoch record --type text/plain note.txt`.
3. Epoch stores the file bytes under `.epoch/blobs`.
4. Epoch appends a signed `record` event.

Acceptance criteria:

- Blob content matches the original file.
- Event payload includes path, MIME type, blob hash, and size.
- Tampered event or blob data is reported by `epoch verify`.

### DEV-004: Work Offline With Intents

**As a** contributor,  
**I want** to create an intent and have maintainers sign a decision later,  
**So that** non-merged changes are communicated as intent instead of hidden branch state.

Flow:

1. Run `epoch intent README.md --type text/plain --title "Update README"`.
2. A maintainer runs `epoch merge INTENT_ID --author bob`.
3. Another maintainer can run `epoch reject INTENT_ID --author carol --reason duplicate`.
4. Run `epoch status` to inspect policy state.

Acceptance criteria:

- Intent, merge, rejection, and comment events are signed.
- Intent metadata supports title, description, reason, and labels.
- Policy projection classifies intents as merged, rejected, or pending.

### DEV-005: Resolve Text And JSON Entities

**As a** developer,  
**I want** built-in merge behavior for common file types,  
**So that** routine concurrent edits can be resolved through the CLI.

Flow:

1. Prepare base, left, and right files.
2. Run `epoch resolve --type application/json base.json left.json right.json`.
3. Inspect the merged result on stdout.

Acceptance criteria:

- JSON object merges preserve non-conflicting keys.
- Text merges produce conflict markers for incompatible edits.
- Unsupported or invalid values report clear errors.

## Collaboration Stories

### COLLAB-001: Explicitly Sync Two Local Repositories

**As a** collaborator,  
**I want** to sync with a peer repository path,  
**So that** both local repositories have the same signed events and blobs.

Flow:

1. Initialize two local Epoch repositories.
2. Record different events in each repository.
3. Run `epoch --repo ./peer-a sync ./peer-b`.
4. Verify both repositories.

Acceptance criteria:

- Missing event files are copied both directions.
- Missing blobs are copied both directions.
- Both repositories converge to the same frontier.

### COLLAB-002: Materialize Shared Agent State

**As an** agent developer,  
**I want** to append CRDT operations and materialize current state,  
**So that** concurrent map and text updates converge after sync.

Flow:

1. Two actor users append CRDT operations for the same entity.
2. Repositories sync.
3. Code calls `materialize(entity)`.

Acceptance criteria:

- Independent map updates from multiple authors are present.
- Concurrent text inserts converge deterministically.
- Materialized values match on both peers after sync.

### COLLAB-003: Use Async Repository Actors

**As an** application developer,  
**I want** serialized async repository commands and per-user actors,  
**So that** concurrent local writes keep correct authorship and signing keys.

Flow:

1. Create `EpochActorSystem`.
2. Initialize it.
3. Use `repository.user("alice")` and `repository.user("bob")` concurrently.
4. Verify the event log.

Acceptance criteria:

- Concurrent operations append valid signed events.
- Per-author signing keys are distinct.
- Actor verification reports no repository problems.

## Operator Stories

### OPS-001: Push Assets And Create A First Version

**As an** asset-first creator,  
**I want** to push an existing directory into Epoch,  
**So that** assets I already have become a signed repository and deployable version.

Flow:

1. Put generated assets under `dist/`.
2. Run `epoch push dist --author alice --version initial-site`.
3. Inspect the signed `version` event with `epoch versions`.

Acceptance criteria:

- Epoch creates the repository if needed.
- Files under `.epoch/` are skipped.
- Changed assets become signed `record` events.
- A signed version manifest references the recorded files.

### OPS-002: Materialize A Signed Version

**As a** deployment operator,  
**I want** to materialize a named version into a clean directory,  
**So that** deployment and rollback reproduce the exact signed assets.

Flow:

1. Run `epoch version create release-1`.
2. Run `epoch version materialize release-1 --out deploy`.
3. Read `deploy/epoch-version.json` during deployment.

Acceptance criteria:

- Version names resolve when unambiguous.
- Non-empty output directories are rejected by default.
- Materialized files and CRDT snapshots match the version manifest.

### OPS-003: Create And Restore A Compact

**As a** repository operator,  
**I want** to compact a validated log prefix and restore from it,  
**So that** recovery does not require retaining every event as a loose file.

Flow:

1. Record events.
2. Call `createCompact(repository)`.
3. Call `pruneEventLogBeforeCompact(repository, compact.id)`.
4. Call `restoreFromCompact(repository, compact.id)`.
5. Run `verify()`.

Acceptance criteria:

- Compact data is signed and hash-verified.
- Pruning removes only events before the compact boundary.
- Restore rebuilds event and blob storage.

### OPS-004: Restore A Cold Backup

**As a** repository operator,  
**I want** to create a signed cold backup and restore it into a fresh repository,  
**So that** I can recover from local data loss.

Flow:

1. Run `createColdBackup(repository)`.
2. Restore with `restoreFromColdBackup(freshRepository, backup)`.
3. Verify the fresh repository.

Acceptance criteria:

- Backup signature is verified.
- Compact events and tail events are restored.
- Referenced blobs are restored.

### OPS-005: Bootstrap From A Trusted Seed

**As a** repository operator,  
**I want** a fresh peer to bootstrap from a trusted local seed path,  
**So that** recovery can start from a known-good repository identity.

Flow:

1. Create a compact in the seed repository.
2. Initialize a peer repository.
3. Call `bootstrapFromSeed(peer, seedConfig)`.

Acceptance criteria:

- Full-trust bootstrap restores the seed compact.
- Unexpected seed identity is rejected.
- Missing events and blobs are copied with sync.

### OPS-004: Create A Platform Project Headlessly

**As a** platform operator,
**I want** to create an organization, project, and repository through the
Epoch.Platform SDK,
**So that** platform setup can be automated without the web console.

Flow:

1. Create a filesystem-backed platform Core instance for durable operator
   automation, or an in-memory Core instance for short-lived tests.
2. Wrap it with `EpochPlatformSdk`.
3. Create an organization, project, and repository.
4. Inspect the project overview.

Acceptance criteria:

- Community capability discovery reports disabled when the instance starts with
  Community disabled.
- Project overview lists created repositories.
- Project overview exposes a `Create deployable` empty-state action when no
  deployables exist.

### OPS-005: Review And Execute A Protected Deploy Plan

**As a** release operator,
**I want** deploy plans to show source, target, required approvals, and SDK
operation before execution,
**So that** protected deployments are reviewable and automatable.

Flow:

1. Create a project repository, protected production environment, and deployable.
2. Generate a deploy plan.
3. Try to execute it before approval.
4. Approve and execute the plan.

Acceptance criteria:

- Deploy plan exposes source repository and target environment.
- Protected environments require `protected-environment` approval.
- Execution before approval fails with `policy_denied`.
- Approved execution records a `deployment.executed` audit event.

### OPS-006: Keep Community Optional

**As an** enterprise platform admin,
**I want** Community features to be disabled until explicitly enabled,
**So that** private Core deployments do not accidentally expose public social
surfaces.

Flow:

1. Start Epoch.Platform with Community disabled.
2. Try to publish a project to Community.
3. Enable Community.
4. Publish the project.

Acceptance criteria:

- Publication fails with `feature_disabled` while Community is disabled.
- Enabling Community updates capability discovery.
- Publication succeeds after Community is enabled.

### OPS-007: Complete First-Run Production Readiness

**As a** platform operator,
**I want** first-run readiness to track infrastructure, backups, and first
deployment,
**So that** a new platform instance does not look production-ready before its
operational basics are in place.

Flow:

1. Inspect first-run readiness on a new platform instance.
2. Register a runner.
3. Configure a backup destination.
4. Execute the first approved deployment.
5. Inspect readiness again.

Acceptance criteria:

- Missing runner, backup destination, and first deployment appear as incomplete
  steps.
- Readiness becomes production-ready only after all required setup steps are
  complete.

### OPS-008: Diagnose And Roll Back A Degraded Deployment

**As an** incident responder,
**I want** degraded deployments to produce a diagnosis and rollback action,
**So that** I can recover service while preserving audit context.

Flow:

1. Execute at least one successful deployment.
2. Mark the latest deployment degraded with a health-check reason.
3. Inspect incident diagnosis.
4. Roll back as an incident lead.

Acceptance criteria:

- Diagnosis severity is high.
- Diagnosis records the first failing step.
- Diagnosis recommends rollback.
- Rollback changes deployment state and records a `deployment.rolled_back`
  audit event.

### OPS-009: Gate AI Actions With Approval

**As a** platform admin,
**I want** AI-generated production actions to require approval,
**So that** AI remains useful without silently changing production state.

Flow:

1. Ask AI to produce a scoped action plan.
2. Try to execute the plan before approval.
3. Approve and execute the plan.

Acceptance criteria:

- AI plan records the requested action and project context.
- Execution before approval fails with `approval_required`.
- Approved execution records `ai.plan.executed`.

### OPS-010: Use The Platform Web Console On Mobile And Desktop

**As an** operator,
**I want** the web console to preserve project scope, next action, AI access,
and Community mode across viewport sizes,
**So that** urgent workflows remain usable on desktop and mobile.

Flow:

1. Render the console at mobile width.
2. Verify production readiness, scoped project/environment/deployable context,
   primary action, hidden Community nav, and AI label.
3. Render the console at desktop width with Community enabled.
4. Verify Community navigation, moderation state, operational telemetry,
   package distribution, search results, feed activity, and moderation queue
   count.

Acceptance criteria:

- Mobile rendering uses mobile navigation.
- Desktop rendering uses desktop navigation.
- Community navigation follows the Community capability.
- Desktop platform panels expose operations, packages, search, Community
  activity, moderation, and Community project showcase details.
- The AI affordance has an accessible label.

### OPS-011: Govern Deploy Approvals With RBAC

**As a** platform administrator,
**I want** protected environment approvals to respect team role bindings,
**So that** production deploys are gated by explicit release authority.

Flow:

1. Create platform users and a release manager team.
2. Add the approver to the team.
3. Grant the team `environment-approver` on production.
4. Try to approve as a non-member.
5. Approve as the release manager.

Acceptance criteria:

- Unauthorized approval fails with `permission_denied`.
- The failure suggests asking an environment approver.
- Authorized approval records the approver and audit event.

### OPS-012: Run A Forge Review Workflow

**As a** maintainer,
**I want** issues, review intents, checks, AI summaries, approvals, and merges,
**So that** Epoch.Platform can support collaborative code review flows.

Flow:

1. Create an issue for a project.
2. Create a review intent linked to that issue.
3. Record a passing check.
4. Ask AI to summarize the review intent.
5. Approve and merge the review intent.

Acceptance criteria:

- Review intent state becomes `merged`.
- Checks and AI summary remain attached to the review intent.
- The issue links back to the review intent.
- Merge records a `review_intent.merged` audit event.

### OPS-013: Publish, Search, Observe, And Snapshot Platform State

**As a** platform operator,
**I want** packages, search, observability, and snapshots connected to deploys,
**So that** release state can be discovered and recovered headlessly.

Flow:

1. Execute an approved deployment.
2. Publish a package from the deployment.
3. Search for the service name.
4. Inspect observability summary.
5. Export a platform snapshot and restore it into a fresh SDK.

Acceptance criteria:

- Package version is available after publishing.
- Search returns repository, deployable, and package results.
- Observability reports runner count and latest deployment state.
- Restored snapshots preserve Community capability, project overview,
  Community slug, and latest deployment state.

### OPS-014: Moderate A Community Social Surface

**As a** Community moderator,
**I want** follows, stars, discussions, reports, feeds, and resolution queues,
**So that** public collaboration can stay useful without being mandatory for
private deployments.

Flow:

1. Enable Community and publish a project.
2. Approve the project as a moderator.
3. Create a public profile.
4. Follow, star, and open a discussion.
5. Report and resolve the discussion.

Acceptance criteria:

- Follower and star counts update.
- Feed activity records the discussion.
- Open reports appear in the moderation queue.
- Resolving the report clears the queue and records audit history.

### OPS-015: Operate Enterprise Controls Through SDK

**As a** security and compliance admin,
**I want** SSO, SCIM, service accounts, tokens, sessions, audit export, and
retention available through SDK calls,
**So that** enterprise installs can be automated and audited.

Acceptance criteria:

- SSO and SCIM changes create audit records.
- Service account tokens and user sessions can be revoked.
- API requests expose correlation and idempotency metadata.
- Webhooks verify signatures.
- Audit export and compliance reports include retention and secret-handling
  findings.

### OPS-016: Connect Infrastructure And Coordinate Runners

**As a** platform operator,
**I want** targets, resources, templates, discovery, dry-run plans, cancellation,
promotion, job retry, and runner reconciliation,
**So that** deployment workflows stay plan-first and recoverable.

Acceptance criteria:

- Infrastructure targets and resources appear in project context.
- Discovered deployables retain runtime and manifest metadata.
- Dry-run plans expose generated configuration and can be canceled.
- Promotions and runner/job lifecycle changes are audited.
- Unknown config sections warn while invalid known sections fail safely.

### OPS-017: Run AI, Support, Backup, Restore, And HA Drills

**As an** enterprise operator,
**I want** AI guardrails, support bundles, backup verification, restore dry-runs,
and failover drills,
**So that** production readiness is testable before incidents.

Acceptance criteria:

- AI context cites sources and redacts secrets.
- Unsafe tools are denied and deploy tools require approval.
- Support bundles include diagnostics without plaintext secrets.
- Backup verification, manifest-hashed backup artifacts, backup-artifact
  restore, restore dry-run, RPO/RTO targets, and failover drill status are
  inspectable.

### OPS-018: Publish A Safe Community Showcase

**As a** Community maintainer,
**I want** public profiles, reviewed visibility policy, maintainer-gated
showcases, bookmarks, discussions, feeds, reputation, abuse controls,
takedowns, blocking, legal-hold export, and backup/restore,
**So that** public collaboration can grow without leaking private Core data.

Acceptance criteria:

- Community status exposes enabled state, worker state, and the reviewed public
  visibility policy.
- Project showcase publication requires maintainer permission when a project is
  governed by project RBAC.
- Pending showcases are hidden from search and cannot be starred, followed,
  bookmarked, or discussed until approved.
- Public project pages include topics and releases.
- Public project pages include README, deploy badge, contribution prompt,
  bookmark count, and discussion count without exposing private repository
  slugs.
- Personalized feeds expose public activity events with actor, verb, object,
  visibility, and timestamp metadata.
- Contributions increase public reputation.
- Abuse throttles, AI-assisted moderation triage, reports, and takedowns create
  typed errors and audit events.
- Legal-hold export includes relevant Community discussion details.
- Filesystem backup artifacts restore Community data and feed events.
- Disabled Community APIs return `feature_disabled` while Core repository
  collaboration continues.

## Tooling Stories

### TOOL-001: Import And Export Git Files

**As a** tool integrator,  
**I want** to import from and export to trusted host Git repositories,  
**So that** Epoch can interoperate with existing Git workflows.

Flow:

1. Import tracked files from a Git repository.
2. Verify the Epoch repository.
3. Export the latest recorded blobs to a fresh Git repository.

Acceptance criteria:

- Imported files become signed Epoch record events.
- Exported files match recorded blob content.
- Unsupported Git-compatible commands fail with explicit errors.

### TOOL-002: Use WASM-Safe Surfaces

**As a** WASM host developer,  
**I want** explicit unsupported errors for native Git operations,  
**So that** browser-hosted code does not silently assume filesystem access.

Flow:

1. Call WASM CRDT registry helpers.
2. Try a native Git operation through `Epoch.WASM.Git`.

Acceptance criteria:

- CRDT helpers return expected merge results.
- Native Git operations return explicit unsupported errors.

### TOOL-003: Persist React State As Epoch History

**As a** React application developer,  
**I want** browser-safe hooks that persist state changes as Epoch event history,  
**So that** local UI state can rewind, rematerialize, and resume deterministically.

Flow:

1. Create a store with `createEpochReactStore(...)`.
2. Bind it with `useEpochState(...)` in a browser-hosted React component.
3. Update state, rewind history, materialize another point in time, and resume changes.

Acceptance criteria:

- State updates persist as append-only Epoch React events.
- Rewind and rematerialization restore earlier browser-visible state.
- Restored state can continue accepting new updates without losing history.

### TOOL-004: Gate An Intent With Signed Review And CI

**As a** maintainer,  
**I want** review decisions and CI results to be signed Epoch events,  
**So that** merge readiness can be projected without trusting a central forge.

Acceptance criteria:

- Issues, reviews, and CI attestations are signed events.
- Gate status reports pass or concrete blockers from local event history.
- Rejections block gates deterministically.

### TOOL-005: Sync Through A Transport Packet

**As an** integration developer,  
**I want** to exchange events and blobs through an explicit transport packet,  
**So that** storage or network layers can vary without becoming authoritative.

Acceptance criteria:

- Missing events and blobs import from the packet.
- Verification remains the trust boundary after import.
- Browser hosts can use VFS-backed live repository state.

### TOOL-006: Redact A Sensitive Blob Locally

**As an** operator,  
**I want** a signed redaction marker before removing a sensitive blob locally,  
**So that** audit evidence survives without promising impossible global deletion.

Acceptance criteria:

- Redaction events reference exact blob hashes and reasons.
- Verification accepts missing blobs only when an exact redaction exists.
- Redaction projections expose the signed reasons.
