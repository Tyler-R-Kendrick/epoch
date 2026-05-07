# Epoch Current Feature Registry

This registry describes features implemented in the current TypeScript prototype. It intentionally excludes roadmap items that do not have executable coverage in `features/`.

## Executable Feature Specs

The current registry is backed by these Cucumber feature files:

| Feature spec | Coverage focus |
|---|---|
| [`features/repository.feature`](../features/repository.feature) | Repository creation, asset push, signed versions, materialization, verification, sync, hooks, and Git import/export. |
| [`features/actors.feature`](../features/actors.feature) | Async actor facade and per-user authorship. |
| [`features/crdt_log.feature`](../features/crdt_log.feature) | Operation CRDT events and materialized map/text state. |
| [`features/merge.feature`](../features/merge.feature) | Intent policy and entity merge behavior. |
| [`features/named_views.feature`](../features/named_views.feature) | Named logical views and promotion flows. |
| [`features/cli_wasm.feature`](../features/cli_wasm.feature) | CLI command behavior and WASM-safe exports. |
| [`features/wasm_react.feature`](../features/wasm_react.feature) | Browser-safe React state persistence, rewind, rematerialization, and resume flows. |
| [`features/ha_dr.feature`](../features/ha_dr.feature) | Compacts, backups, seed bootstrap, and recovery flows. |
| [`features/advanced_collaboration.feature`](../features/advanced_collaboration.feature) | Signed collaboration objects, gates, memory transport, reusable conflict resolutions, operation events, CSV adapters, redactions, and serialization providers. |
| [`features/platform_core.feature`](../features/platform_core.feature) | Initial Epoch.Platform Core and SDK foundation for headless project, deploy-plan, audit, and optional Community flows. |
| [`features/platform_operations.feature`](../features/platform_operations.feature) | Epoch.Platform operational flows for readiness, backups, runners, secrets, deploy jobs, incidents, AI plans, and Community moderation. |
| [`features/platform_product_domains.feature`](../features/platform_product_domains.feature) | Epoch.Platform identity/RBAC, forge collaboration, packages, search, observability, Community social workflows, moderation, and snapshots. |
| [`features/platform_enterprise_conformance.feature`](../features/platform_enterprise_conformance.feature) | Enterprise identity, SSO/SCIM, service accounts, API tokens, sessions, idempotency, webhooks, events, secret access, audit export, compliance, and tenant export/delete. |
| [`features/platform_infrastructure_delivery.feature`](../features/platform_infrastructure_delivery.feature) | Infrastructure targets, resources, templates, deployable discovery, dry-run plans, cancel, promote, runner coordination, job retry/reconcile, and configuration validation. |
| [`features/platform_ai_operations_ha.feature`](../features/platform_ai_operations_ha.feature) | AI context/guardrails/evals, failure diagnosis, incident follow-up, operator dashboard, support bundle, backup, restore, HA profile, and failover drill. |
| [`features/platform_community_conformance.feature`](../features/platform_community_conformance.feature) | Community showcases, topics, releases, reputation, search, abuse controls, takedowns, blocking, legal hold, worker disablement, and Core continuity. |
| [`features/platform_web.feature`](../features/platform_web.feature) | Browser-rendered Epoch.Platform web console behavior across mobile and desktop navigation. |
| [`features/platform_web_conformance.feature`](../features/platform_web_conformance.feature) | Mobile task completion, role-aware home modules, admin governance sections, dense data, confirmations, and SDK-equivalent web copy. |

## F-001 - Signed Event Log

Every repository stores signed immutable events under `.epoch/events`.

Implemented behavior:

- `EpochRepository.init(author?)` creates repository metadata and an Ed25519 identity.
- `EpochRepository.create(root, options)` and `openOrCreate(root, options)` provide one-call repository creation helpers.
- `recordFile(path, mimeType)` appends a signed `record` event with causal parents.
- `events()`, `read(eventId)`, and `heads()` expose the local event log.
- `verify()` checks event IDs, signatures, parent references, heads, and blob integrity.

Covered by:

- `features/repository.feature`
- `features/actors.feature`

## F-002 - Content-Addressed Blob Storage

Recorded file content is stored once by SHA-256 hash under `.epoch/blobs`.

Implemented behavior:

- Blob hashes, sizes, and MIME types are recorded in event payloads.
- Duplicate content reuses the same content-addressed blob.
- Verification reports missing, tampered, or size-mismatched blobs.

Covered by:

- `features/repository.feature`

## F-003 - Intent Policy

Epoch represents requested changes as intents. Maintainers can sign merge, rejection, and comment events for those intents.

Implemented behavior:

- `intentFile()` and `intent()` create signed `intent` events.
- `mergeIntent()`, `rejectIntent()`, and `comment()` create signed policy events.
- `policy()`, `mainIntentIds()`, `mergedIntents()`, and `mainPatches()` compute the deterministic main projection.
- The CLI exposes `intent`, `merge`, `reject`, `comment`, `status`, and `main`.

Covered by:

- `features/merge.feature`
- `features/cli_wasm.feature`

## F-004 - Entity Merge Registry

Epoch includes a pluggable registry for snapshot-style entity merges.

Implemented behavior:

- `CRDTRegistry.defaults()` provides text and JSON merge behavior.
- `threeWayMerge()` handles text defaults and JSON object merges.
- `epoch resolve --type MIME BASE LEFT RIGHT` exposes the registry through the CLI.
- WASM exports expose the registry helpers without native filesystem access.

Covered by:

- `features/merge.feature`
- `features/cli_wasm.feature`

## F-005 - Operation CRDT Log

Epoch can store operation-based CRDT updates as signed events and materialize convergent map/text views.

Implemented behavior:

- `appendCRDTOperation()` records map and text CRDT operations.
- `materialize(entity)` replays CRDT events into the current materialized value.
- `EpochActorSystem` exposes async CRDT operation recording and materialization.

Covered by:

- `features/crdt_log.feature`
- `features/actors.feature`

## F-006 - Explicit Repository Sync

Local repositories can exchange missing events and blobs by repository path.

Implemented behavior:

- `syncFrom(peerPath)` copies missing events and blobs from a peer.
- `sync(peerPath)` performs two-way exchange by syncing both repositories.
- `epoch sync PEER_REPO` exposes two-way sync through the CLI.
- Sync currently targets local filesystem repository paths.

Covered by:

- `features/repository.feature`
- `features/crdt_log.feature`
- `features/cli_wasm.feature`

## F-007 - Lifecycle Hooks

Repository hooks observe core lifecycle points.

Implemented behavior:

- Hooks receive `EpochHookEvent` objects with a name, repository, timestamp, and detail payload.
- Hook names cover init, append, record, CRDT operation/materialization, read, events, heads, verify, sync, and gossip operations.

Covered by:

- `features/repository.feature`

## F-008 - Async Actor Facade

XState-backed actors serialize repository commands and support per-user authorship.

Implemented behavior:

- `EpochActorSystem` exposes async init, append, record, materialize, verify, and sync calls.
- `EpochUserActor` records events for a fixed author.
- Concurrent actor operations preserve per-author signing identities.

Covered by:

- `features/actors.feature`

## F-009 - Named Views

Named views compute deterministic logical workspaces over the shared event log.

Implemented behavior:

- `createView()`, `listViews()`, `checkoutView()`, `deleteView()`, `diffViews()`, and `promoteToView()` manage views.
- Inclusion rules include all, intent list, ancestor chain, tag filter, union, intersection, difference, until, and base view composition.
- Main view inclusion can be gated by approvals and CI statuses.
- The CLI exposes view create/list/checkout/delete/diff/promote commands.

Covered by:

- `features/named_views.feature`
- `features/cli_wasm.feature`

## F-010 - Compacts, Cold Backups, and Seed Bootstrap

Epoch can materialize a prefix of the log, prune local event files before that compact, and restore from backups.

Implemented behavior:

- `createCompact()`, `pruneEventLogBeforeCompact()`, `restoreFromCompact()`, `latestCompact()`, and `verifyCompact()` manage compacts.
- `createColdBackup()`, `restoreFromColdBackup()`, and `verifyColdBackup()` manage signed backup bundles.
- `bootstrapFromSeed()` and `bootstrapFromSeeds()` bootstrap peers from trusted local seed paths.

Covered by:

- `features/ha_dr.feature`

## F-011 - Git Compatibility

Epoch can bridge to trusted host Git repositories.

Implemented behavior:

- `importFromGit()` records tracked files from a Git repository.
- `exportToGit()` writes current recorded blobs to a Git repository and commits changes.
- `EpochCoreGit`, `EpochCLIGit`, and `Epoch.WASM.Git` expose Git-compatible surfaces with explicit unsupported errors where host access is unavailable.

Covered by:

- `features/repository.feature`
- `features/cli_wasm.feature`

## F-012 - CLI and WASM Entrypoints

The prototype includes command-line and WASM-facing integration surfaces.

Implemented behavior:

- The CLI covers repository init, record, intent policy, events, verify, sync, resolve, rollback, views, Git import/export, and disaster recovery plan output.
- WASM exports CRDT helpers and returns explicit unsupported errors for native Git operations.

Covered by:

- `features/cli_wasm.feature`

## F-013 - WASM React State History

Epoch includes browser-safe React helpers that persist local state changes as
append-only Epoch event history.

Implemented behavior:

- `@epoch/wasm-react` exposes `createEpochReactStore()`,
  `createMemoryEpochReactStorage()`, and `useEpochState()`.
- React state updates persist as append-only CRDT events that can be rewound
  and materialized at earlier points in history.
- Browser-hosted React flows restore persisted state and continue appending new
  events after rewind and rematerialization.

Covered by:

- `features/wasm_react.feature`

## F-014 - Advanced Collaboration And Gates

Epoch stores collaboration and policy state as signed events.

Implemented behavior:

- `createIssue()` records signed issue-style discussion roots.
- `reviewIntent()` records signed reviews against intents.
- `recordCI()` records signed CI attestations.
- `collaboration()` projects issues and reviews.
- `gateStatus()` deterministically evaluates required review state,
  approvals, rejections, and named CI checks.

Covered by:

- `features/advanced_collaboration.feature`

## F-015 - Transport And Serialization Providers

Epoch exposes transport and serialization seams without making either one
authoritative.

Implemented behavior:

- `exportToMemoryTransport()` exports events, heads, and blobs to an explicit
  memory transport packet.
- `syncWithTransport()` imports missing content from that packet and keeps
  verification as the trust boundary.
- `EpochTransport` defines the transport contract, and `BundleEpochTransport`
  persists a hash-checked bundle packet for offline handoff.
- `EpochSerializationProvider` lets repositories substitute event file
  serialization while preserving canonical event IDs and signatures.

Covered by:

- `features/advanced_collaboration.feature`

## F-016 - Media-Aware Entity Adapters And Conflict Reuse

Epoch's merge registry is aware of media types and can reuse signed conflict
resolutions.

Implemented behavior:

- `CRDTRegistry.defaults()` includes text, JSON, and row-keyed CSV merge
  adapters.
- `EntityRegistry.defaults()` exposes merge, diff, validation, redaction, and
  display adapter hooks where an adapter implements them.
- `recordConflictResolution()` records signed exact-match conflict
  resolutions.
- `reusableConflictResolution()` returns a prior resolution only when path,
  media type, base, left, and right match exactly.
- `mergeEntity()` reuses a signed exact-match resolution before falling back to
  media-aware adapter merge behavior.
- The CLI can record resolutions with `resolve --record-resolution` and reuse
  them with `resolve --path`.

Covered by:

- `features/merge.feature`
- `features/advanced_collaboration.feature`

## F-017 - Operation Events And Secret-Safe Redactions

Epoch represents local operation history and redaction workflow in the event
log.

Implemented behavior:

- `appendOperation()` appends signed operation events with command, status, and
  detail payloads.
- `operations()` projects operation events for recovery and explanation.
- `redactBlob()` appends a signed redaction marker for a blob hash and reason.
- `planRedaction()` reports affected event IDs, local blob presence, and
  whether a matching redaction already exists.
- `verify()` accepts missing blobs only when an exact redaction event exists.
- `redactions()` projects signed redaction markers.
- Mutating CLI commands append signed operation events for user-facing
  recovery and explanation, and `op-log` / `op-show` expose them.

Covered by:

- `features/advanced_collaboration.feature`

## F-018 - Browser Live VFS Repository

Epoch React helpers include a browser-safe live repository surface backed by a
virtual file system.

Implemented behavior:

- `createMemoryEpochVfs()` creates an in-memory virtual file system for browser
  and test hosts.
- `createEpochLiveRepository()` stores live entity events in the VFS.
- `syncFrom()` copies missing VFS event files between live repositories.
- `useEpochHistory()`, `useEpochEntity()`, and `useEpochView()` subscribe to
  live repository history and materialized entity state through
  `useSyncExternalStore`.

Covered by:

- `features/wasm_react.feature`

## F-019 - First-Class Repository Creation And Versions

Epoch can create repositories from empty directories or existing assets, then
bind deployable content to signed version manifests.

Implemented behavior:

- `epoch create` creates an empty signed repository with concise state output.
- `epoch push` opens or creates a repository, recursively records existing
  assets, skips `.epoch/`, `.git/`, and `node_modules/`, and creates a signed
  version by default.
- `EpochRepository.push()` and `EpochRepository.openOrCreate()` expose the same
  asset-first workflow through the SDK.
- `createVersion()`, `versions()`, `resolveVersion()`, and
  `materializeVersion()` manage signed `version` events.
- Version manifests reference a view/frontier, file blobs, source record
  events, and optional CRDT snapshot blobs.
- Version materialization writes recorded files, CRDT JSON snapshots, and an
  `epoch-version.json` manifest while refusing to overwrite non-empty output by
  default.
- `epoch version create`, `epoch versions`, `epoch version show`, and
  `epoch version materialize` expose the version workflow through the CLI.

Covered by:

- `features/repository.feature`
## F-020 - Epoch.Platform Core and SDK Foundation

Epoch includes an initial platform foundation that keeps domain logic in
`@epoch/platform-core` and exposes headless management through
`@epoch/platform-sdk`.

Implemented behavior:

- `createInMemoryPlatformCore()` creates an in-memory platform domain service.
- `createFileSystemPlatformCore()` creates a durable local platform domain
  service with hash-verified state envelopes, atomic state writes, backup
  artifact creation, backup-artifact restore, and tamper detection.
- `EpochPlatformSdk` wraps Core with organization, project, repository,
  environment, deployable, deployment, identity, issue, review, package,
  search, observability, runner, backup, secret, incident, AI, Community,
  snapshot, capability, and audit surfaces.
- `EpochPlatformCommunity` wraps the SDK as the optional Community deployment
  module for public/internal profiles, project showcases, discussions, feeds,
  moderation, and legal-hold workflows.
- Capability discovery reports Community as enabled or disabled.
- Project overviews list repositories and expose empty-state actions such as
  `Create deployable`.
- Deploy plans expose source repository, target environment, protected
  environment approval requirements, primary action text, and the matching SDK
  operation.
- Protected deploy execution fails with a typed `policy_denied` error until the
  plan is approved.
- Executed deployments record `deployment.executed` audit events.
- Community publication fails with `feature_disabled` until Community is
  explicitly enabled.

Covered by:

- `features/platform_core.feature`
- `features/platform_operations.feature`
- `test/unit/platform-production-core.test.ts`

## F-021 - Epoch.Platform Product Domains

Epoch.Platform now includes executable product-domain coverage beyond the
foundation slice.

Implemented behavior:

- Platform users, teams, memberships, and team role bindings can govern
  protected environment approvals.
- RBAC-managed protected deploy plans reject unauthorized approvers with
  `permission_denied` and a recovery suggestion.
- Issues, review intents, CI checks, AI review summaries, approvals, and merge
  state form a GitHub/GitLab-like forge workflow.
- Packages can be published from deployments and discovered alongside
  repositories and deployables through platform search.
- Observability summaries expose runner count and latest deployment state.
- Community profiles can follow and star Community projects, open discussions,
  report discussions, feed activity, and resolve moderation reports.
- Platform snapshots export and restore core and Community state into a fresh
  in-memory Core instance.

Covered by:

- `features/platform_product_domains.feature`

## F-022 - Epoch.Platform Web Console Foundation

Epoch includes an initial browser-rendered platform console package,
`@epoch/platform-web`.

Implemented behavior:

- `renderPlatformConsole(container, model)` renders an operations-first console
  into a browser DOM container.
- The console shows production readiness, deployment health, project /
  environment / deployable scope, and the primary deploy action.
- Community navigation is hidden when Community is disabled and visible when
  enabled.
- Community moderation state is visible when Community is enabled.
- Desktop rendering can expose operational telemetry, package distribution,
  search results, Community follower/star counts, feed activity, and moderation
  queue count.
- Community-enabled desktop rendering can expose public project showcase data
  including slug, README, deploy badge, contribution prompt, bookmarks, and
  discussion count.
- The AI affordance has an accessible label.
- Mobile viewport rendering uses mobile navigation, while desktop viewport
  rendering uses desktop navigation.

Covered by:

- `features/platform_web.feature`
- `features/platform_web_conformance.feature`

## F-023 - Epoch.Platform Enterprise Conformance

Epoch.Platform includes executable enterprise controls from the spec's Core,
SDK, API, security, compliance, and governance sections.

Implemented behavior:

- SSO providers, SCIM-provisioned users, service accounts, API tokens, and
  sessions can be created, revoked, and audited.
- Mutating deploy-plan creation supports idempotency keys and API request
  correlation IDs.
- Webhook endpoints can be registered and verified through SDK helpers using
  HMAC signatures.
- Platform event streams expose replayable event records.
- Secret rotation, least-privilege secret-reference reads, audit export, audit
  retention, compliance reports, tenant export, tenant export deletion, and
  typed SDK errors are covered.

Covered by:

- `features/platform_enterprise_conformance.feature`

## F-024 - Epoch.Platform Infrastructure And Delivery

Epoch.Platform includes the infrastructure and delivery coordination contracts
needed for the Coolify-like operational path in the spec.

Implemented behavior:

- Infrastructure targets, resources, deployable templates, and deployable
  discovery from manifests are available through Core and SDK.
- Dry-run deploy plans are editable, idempotent, cancelable, and expose
  generated configuration.
- Deployments can be promoted between environments.
- Runner heartbeats, quarantine, platform job scheduling, retry, and runner-loss
  reconciliation are tracked.
- Platform configuration accepts forward-compatible unknown sections and rejects
  invalid known sections with typed errors.

Covered by:

- `features/platform_infrastructure_delivery.feature`

## F-025 - Epoch.Platform AI, Operations, And HA/DR

Epoch.Platform includes the AI guardrail, operator, support, backup, restore,
and HA drill contracts required by the spec.

Implemented behavior:

- AI context packs are scoped, cite sources, and redact secrets.
- Unsafe AI tools are denied, production-impacting AI tools require approval,
  and AI eval results are recorded.
- Failed deployments are classified with recovery actions, incidents can be
  acknowledged, and follow-up issues can be created.
- Operator dashboard and support bundle summaries expose health, runner,
  backup, capability, and redacted diagnostic state.
- Backup start/verify creates manifest-hashed artifacts when Core is
  filesystem-backed; restore dry-run, backup-artifact restore, HA profile
  declaration, and failover drills are available through SDK surfaces.

Covered by:

- `features/platform_ai_operations_ha.feature`

## F-026 - Epoch.Platform Community Conformance

Epoch.Platform Community now covers the optional social product mode required
by the spec.

Implemented behavior:

- Community projects support topics, showcase assets, public releases, public
  page data, Community search, contribution recording, profile reputation, and
  backup/restore through the filesystem-backed Core.
- Community status includes worker state and visibility policy review.
- Showcase publication can require project maintainer RBAC, pending showcases
  are hidden from search, and stars/bookmarks/follows/discussions require
  approved public visibility.
- Public profiles retain user IDs, bios, links, avatar references, visibility,
  and moderation state.
- Discussion bodies, public visibility, participants, feed events, bookmarks,
  AI-assisted report triage, takedowns, profile blocking, legal-hold export,
  and moderation audit events are covered.
- Disabled Community APIs return `feature_disabled`, Community workers report
  disabled, and private Core repository workflows continue to function.

Covered by:

- `features/platform_community_conformance.feature`
- `test/unit/platform-community-module.test.ts`
