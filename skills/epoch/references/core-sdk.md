# Epoch Core SDK Reference

Use the Core SDK when an application needs direct programmatic access to Epoch repositories or the initial Epoch.Platform headless management and web console foundation.

## Package and imports

- Workspace package: `@epoch/core`
- React package: `@epoch/wasm-react`
- Integration packages: `@epoch/integration-core`, `@epoch/react`,
  `@epoch/gen-ui`, `@epoch/redux`, `@epoch/xstate`
- Platform Core package: `@epoch/platform-core`
- Platform SDK package: `@epoch/platform-sdk`
- Platform Web package: `@epoch/platform-web`
- Community packages: `@epoch/community-api`, `@epoch/community-core`,
  `@epoch/community-cli`, `@epoch/community-web`
- Root package export: `epoch`
- Git compatibility export: `epoch/Epoch.Core.Git`
- Browser integration root exports: `epoch/Epoch.Integration.Core`,
  `epoch/Epoch.React`, `epoch/Epoch.GenUI`, `epoch/Epoch.Redux`,
  `epoch/Epoch.XState`
- Platform and Community root exports: `epoch/Epoch.Platform.Core`,
  `epoch/Epoch.Platform.Sdk`, `epoch/Epoch.Platform.Web`,
  `epoch/Epoch.Community.API`, `epoch/Epoch.Community.Core`,
  `epoch/Epoch.Community.CLI`, `epoch/Epoch.Community.Web`

Primary exports include `EpochRepository`, `EpochActorSystem`, `CRDTRegistry`, CRDT helpers, transport and serialization helpers, lifecycle hook types, backup/compact helpers, seed-node helpers, and Git compatibility classes.

See the public [SDK docs](../../../docs/sdk.md) for code examples.

## Repository lifecycle

1. Create repositories with `EpochRepository.create(root, options)`, `openOrCreate(root, options)`, or `new EpochRepository(root).init(author?)`.
2. Record data with `recordFile(path, mimeType)`, push existing assets with `push(paths, options)`, or create review flow events with `intentFile`, `mergeIntent`, `rejectIntent`, `comment`, `createIssue`, `reviewIntent`, `recordCI`, and `gateStatus`.
3. Create signed deployable versions with `createVersion(options)` and materialize them with `materializeVersion(reference, options)`.
4. Verify integrity with `verify()` before trusting or distributing state.
5. Exchange events and blobs with `sync(peerPath)` or `syncFrom(peerPath)`.

## CRDT workflow

Use operation-based CRDT events for shared agent state that changes frequently. Append map/register or sequence-text operations with the actor API, then materialize state with `materialize(entity)`.

Use `CRDTRegistry.defaults()` for built-in text, JSON, and CSV merges. Register custom CRDT definitions for application-specific entity types when three-way merge is not enough.

## Advanced collaboration and infrastructure

- `createIssue`, `reviewIntent`, `recordCI`, `collaboration`, and `gateStatus` keep collaboration state in signed events.
- `appendOperation` and `operations` represent command history in the event log.
- `recordConflictResolution`, `reusableConflictResolution`, and `mergeEntity` provide exact-match reusable resolutions and media-aware fallback merging.
- `redactBlob`, `planRedaction`, and `redactions` provide a signed local redaction workflow.
- `EpochTransport`, `exportToMemoryTransport`, `syncWithTransport`, and `BundleEpochTransport` expose explicit transport and bundle seams.
- `EpochSerializationProvider` lets callers substitute event serialization while preserving canonical event IDs and signatures.
- `EntityRegistry` exposes media-aware adapter capabilities beyond merge, including diff and redaction hooks where implemented.

## Hooks and actors

- Hooks observe init, append, record, CRDT, sync, verify, and materialization lifecycle points.
- `EpochActorSystem` coordinates async event-driven usage and per-user actors.
- Stop actor systems when work is complete to release XState resources.

## Git-compatible core surface

`epoch/Epoch.Core.Git` exposes host-filesystem Git compatibility helpers. Native Git operations are for trusted host environments and should not be assumed to work in WASM.

## React surface

Use `@epoch/wasm-react` for browser-safe React state history built on append-only Epoch events and for VFS-backed live repository hooks.

Use `@epoch/integration-core` plus `@epoch/react`, `@epoch/gen-ui`,
`@epoch/redux`, and `@epoch/xstate` when applications need out-of-the-box
browser storage defaults, explicit tracked-change envelopes, generated UI
versioning, Redux action/slice tracking, or XState transition tracking.

## Epoch.Platform foundation

Use `@epoch/platform-core` for the platform domain service,
`@epoch/platform-sdk` for headless automation,
`@epoch/platform-web` for the browser-rendered hosting console foundation, and
the `@epoch/community-*` packages for the separate Community API, Core client,
CLI, and web app. `@epoch/community-web` exposes
`materializeCommunityWebSiteWithEpoch()` so the static Community site is
rendered through an Epoch repository with branch, approval, merge, signed
version, verification, rollback-target, and exported-snapshot evidence. Use
`createInMemoryPlatformCore()` for short-lived embedded flows and
`createFileSystemPlatformCore()` for durable local state, hash-verified state
envelopes, HMAC webhooks, manifest-hashed backup artifacts, and backup-artifact
restore. The current slice covers
capability discovery, organizations, projects, repositories, environments,
deployables, deploy plans, protected-environment approval checks, identity/RBAC, SSO/SCIM,
service accounts, API tokens, sessions, issues, review intents, packages,
search, observability, infrastructure targets, resources, templates, runners,
backup verification, restore dry-runs, HA failover drills, secret references
and rotation, deployment jobs/logs, incident diagnosis, rollback, AI action
approval, AI context packs, AI tool authorization, API request correlation,
webhooks, event streams, compliance reports, tenant export/delete, deployment
audit events, snapshots, optional Community project publication, Community
status and visibility policy review, maintainer-gated showcases, bookmarks,
feeds, Community reputation, Community abuse controls, Community legal-hold
export, Community backup/restore, and Community moderation.

This is a foundation only; networking, real runners, infrastructure adapters,
SSO handshakes, clustered scheduling, and a production database/queue/search
stack are not implemented yet.
