# Epoch Current Feature Registry

This registry describes features implemented in the current TypeScript prototype. It intentionally excludes roadmap items that do not have executable coverage in `features/`.
Every executable feature spec is also mapped to the user personas it serves in
the [persona feature matrix](persona-feature-matrix.md). Personas describe the
users in product scenarios; they are not standalone features.
Scenario-level behavior is recorded in the
[executable feature scenario inventory](feature-scenario-inventory.md), which
lists every current `Scenario`, `Scenario Outline`, rule context, examples
count, and persona tag from `features/`.

## Executable Feature Specs

The current registry is backed by these Cucumber feature files:

| Feature spec | Coverage focus |
|---|---|
| [`features/repository.feature`](../features/repository.feature) | Repository creation, asset push, native working-tree lifecycle commands, ignore/config behavior, signed versions, materialization, verification, sync, hooks, and Git import/export. |
| [`features/repository_composition.feature`](../features/repository_composition.feature) | Workspace Selection (set/show/explain/index), materialization modes, Repository Links, mount validation, and link availability reporting. |
| [`features/actors.feature`](../features/actors.feature) | Async actor facade and per-user authorship. |
| [`features/crdt_log.feature`](../features/crdt_log.feature) | Operation CRDT events and materialized map/text state. |
| [`features/merge.feature`](../features/merge.feature) | Intent policy and entity merge behavior. |
| [`features/named_views.feature`](../features/named_views.feature) | Named logical views and promotion flows. |
| [`features/cli_wasm.feature`](../features/cli_wasm.feature) | CLI command behavior, signed Change Graph commands, change-based review publish (`Change-Id`, `refs/for/<target>`), and WASM-safe exports. |
| [`features/spaces.feature`](../features/spaces.feature) | Shared signed workspaces: joining a Space, grant-bound turns, budget limits, consent-gated capture, truthful workspace binding, structural anchors that survive a reformat, sandboxed turns with signed receipts, on-access hydration, and cross-machine join. |
| [`features/wasm_react.feature`](../features/wasm_react.feature) | Browser-safe React state persistence, rewind, rematerialization, and resume flows. |
| [`features/ha_dr.feature`](../features/ha_dr.feature) | Compacts, backups, seed bootstrap, and recovery flows. |
| [`features/advanced_collaboration.feature`](../features/advanced_collaboration.feature) | Signed collaboration objects, gates, memory transport, reusable conflict resolutions, operation events, CSV adapters, redactions, and serialization providers. |
| [`features/platform_core.feature`](../features/platform_core.feature) | Initial Epoch.Platform Core and SDK foundation for headless project, deploy-plan, audit, and optional Community flows. |
| [`features/platform_operations.feature`](../features/platform_operations.feature) | Epoch.Platform operational flows for readiness, backups, runners, secrets, deploy jobs, incidents, AI plans, Community moderation, object availability/integrity, Git negotiation/quarantine, mirror/identity/archive health, and redacted dangerous-operation support. |
| [`features/platform_product_domains.feature`](../features/platform_product_domains.feature) | Epoch.Platform identity/RBAC, forge collaboration, packages, search, observability, Community social workflows, moderation, and snapshots. |
| [`features/platform_enterprise_conformance.feature`](../features/platform_enterprise_conformance.feature) | Enterprise identity, SSO/SCIM, service accounts, API tokens, sessions, idempotency, webhooks, events, secret access, audit export, compliance, and tenant export/delete. |
| [`features/platform_infrastructure_delivery.feature`](../features/platform_infrastructure_delivery.feature) | Infrastructure targets, resources, templates, deployable discovery, dry-run plans, cancel, promote, runner coordination, job retry/reconcile, and configuration validation. |
| [`features/platform_ai_operations_ha.feature`](../features/platform_ai_operations_ha.feature) | AI context/guardrails/evals, failure diagnosis, incident follow-up, operator dashboard, support bundle, backup, restore, HA profile, and failover drill. |
| [`features/platform_community_conformance.feature`](../features/platform_community_conformance.feature) | Community showcases, topics, releases, reputation, search, abuse controls, takedowns, blocking, legal hold, worker disablement, and Core continuity. |
| [`features/platform_web.feature`](../features/platform_web.feature) | Browser-rendered Epoch.Platform web console behavior across mobile and desktop navigation. |
| [`features/platform_web_conformance.feature`](../features/platform_web_conformance.feature) | Mobile task completion, role-aware home modules, admin governance sections, dense data, confirmations, and SDK-equivalent web copy. |
| [`features/platform_projects.feature`](../features/platform_projects.feature) | Separation between the hosting control-plane web app and the Community API/Core/CLI/Web packages, including the browser-rendered Community design-system shell and Community Web dogfooding through scannable signed Epoch site history. |
| [`features/community_web_experience.feature`](../features/community_web_experience.feature) | Canonical Community Web plus Change Graph and deterministic discovery journeys: typed cross-source search with completeness/explain, Projection Definitions, repeated occurrence identity, scoped Namespace Mounts and recovery, keyset snapshots, browser fallback, GraphQL/text parity, atomic split, stable Revisions, Review Bundles, dependency-closed merge, durable conflicts, interoperability, authority, archival/privacy, accessible keyboard navigation, swappable `/keymap.toml` loadouts, sample-stream honesty on the fixture board, inspectable receipts and jump/search isolation, composer keyboard contract, scoped mute/report/hook, PAR/PKCE/DPoP AT OAuth, store-only Activity, command-replay livestream privacy, persistent voice connections with push-to-speak after changing rooms, and self-evolving interface proposals with semantic diff, confirmed merge, harness-enforced recovery, and one command receipt across terminal and agent. |
| [`features/identity_bridge.feature`](../features/identity_bridge.feature) | Nostr↔ATProto mutual identity binding ceremony, pure client-side verification, revocation rollback defense, mix-and-match rejection, and agent attestation policy. |
| [`features/community_sandbox_workspaces.feature`](../features/community_sandbox_workspaces.feature) | Community Sandbox Workspace journeys where a contributor launches, resumes, checks, and submits a signed patch from a sandbox workspace, and a maintainer reviews the result. |
| [`features/community_agent_sandboxes.feature`](../features/community_agent_sandboxes.feature) | Community Agent Sandbox journeys where a maintainer starts a policy-bound agent run from a signed intent, reviews completed output, and retries failures without losing evidence. |
| [`features/community_channels.feature`](../features/community_channels.feature) | Signed native channel create/message journeys, live composer integrity, XMPP s2s fanout of public channel bytes, and open-posture local unread watermarks. |

### Unit-covered federation packages (no Cucumber yet)

| Package / surface | Coverage |
|---|---|
| `@epoch/core` gossip (`GossipPeer`, HTTP `/epoch/gossip`, `gossipExchange`) | `test/unit/gossip-atproto-integration.test.ts` |
| `@epoch/atproto` (modes, public release dual-write, hybrid resolve) | `test/unit/atproto-community.test.ts`, `test/unit/gossip-atproto-integration.test.ts` |
| `@epoch/git-proxy` + Git projection | `test/unit/git-projection.test.ts`, `test/unit/git-proxy.test.ts` |
| `@epoch/protocol` + convergence Core | Browser-safe schemas/revsets/inspection, Change Graph and Merge Plan validation, durable conflicts, explicit-parent transactions, object/chunk/promise verification, native sync, and Workspaces in focused unit suites. |
| `@epoch/git-proxy` protocol foundation | Deterministic projection, protocol-v2 capability honesty, quarantine receive, compatibility fixtures, and remote-helper behavior in package and focused unit suites. |
| `@epoch/forge` | Public loss-aware codecs and mirror authority/idempotency/SSRF/drift behavior in `packages/Epoch.Forge/test/`. |
| `@epoch/identity` | Principal/grant/budget/provider authority and privacy-safe receipts in identity-focused unit suites. |
| `@epoch/software-heritage` | SWHID parsing/computation/Git mapping and injected public archival client in package unit suites. |
| `@epoch/extensions` | Manifest parsing/validation, discovery precedence, trust modes (explicit/signed/any, block, missing manifest), builtin shadowing, environment contract, and deterministic capability resolution in `test/unit/extension-mechanism.test.ts`. |
| `@epoch/semantic` | Structural paths under reformatting, patch application onto reformatted targets, move/rename/reorder detection, round-trip fidelity per edit kind, disjoint and commutative merge, order-independent commutation, path-scoped conflicts with formatting-insensitive signatures, subtree dedup, reindentation-stable chunking, deterministic dictionaries, and semantic deltas in `test/unit/semantic-pipeline.test.ts`. |
| `@epoch/protocol` trust posture | `evaluatePosture` matrix, unknown/malformed deny, open cannot enable discovery (`test/unit/posture.test.ts`). |
| `@epoch/community-core` native channels | `epoch.channel/v1` projectors and unread watermarks (`test/unit/channel-events.test.ts`). |
| `@epoch/nats` fabric | JWT issuance, sourceServer ACLs, revoke fencing, auth callout, posture-gated `epoch.svc.>` discovery (`test/unit/fabric-jwt.test.ts`, `test/unit/nats-service-discovery.test.ts`). |
| `@epoch/atproto` RealPds (gated) | Default-off adapter, PrivatePublishError, CID spoof (`test/unit/real-pds.test.ts`). |
| `@epoch/xmpp` (gated) | FederationTransport double, PrivatePublishError, JID admission-only, public `channel.create`/`channel.message` fanout over conference-shaped routing JIDs (`test/unit/xmpp-transport.test.ts`). |
| `@epoch/core` exit | `epoch-exit/v1` export/import/migrate (`test/unit/exit-bundle.test.ts`). |
| Protocol experiments | E01–E16 rejected/pending, garbage cannot promote (`test/unit/protocol-experiments/registry.test.ts`). |

See [ADR-0022](design-decisions/0022-gossip-event-plane-atproto-public-artifacts.md) and
[docs/community-atproto.md](community-atproto.md).

## F-037 - Deterministic Community Search And Mounted Projections

Community Entities retain canonical identity while strict text and structured
GraphQL Search Expressions query registered sources through authorization-bound
Search Plans and snapshots. Results report completeness/freshness, use keyset
cursors, and explain source pushdown, residual evaluation, ordering, and
omissions without revealing unreadable Entities.

Projection Definitions provide bounded literal/select/group/traverse/union/
alias/leaf hierarchies. Projection Entries carry stable occurrence identity;
the same target can appear at many paths or more than once in one definition.
Scoped Namespace Mounts compose `replace`, `before`, and `after`, while
`/.epoch/*` remains immutable recovery. Browser Orama and SQLite WASM indexes
are rebuildable optional accelerators behind the Core reference semantics.

Covered by:

- `features/community_web_experience.feature`
- focused Core parser/planner/projection/namespace tests
- GraphQL schema/execution tests
- backend/source conformance and browser persistence suites tracked under
  `docs/evidence/community-search-projection/`

See [Community Search And Projections](community-search-projections.md) and
[ADR-0042](design-decisions/0042-deterministic-search-and-mounted-projections.md).

## F-038 - Trust Posture Modes

Communities evaluate `TrustPosture` (`hosted` | `private` | `open`) through
`evaluatePosture`. Absent config is open with extras off. Unknown or
malformed posture denies gated capabilities. Open cannot enable service
discovery. Platform `capability()` gates service-discovery,
cross-community-fabric, server-tracked-read-state, public-artifact-plane, and
inter-node-transport. The board masthead shows an honest posture badge.

Covered by:

- `features/community_channels.feature` (operator unread watermark)
- `test/unit/posture.test.ts`

See [ADR-0055](design-decisions/0055-trust-posture-modes-and-federation-topology.md).

## F-039 - Native Channels

Signed `channel.create|message|presence|read` events (`epoch.channel/v1`)
project onto Community message entities. Live composer never uses
`sig:local-only`. Livestreams carry sanitized envelopes only.

Covered by:

- `features/community_channels.feature`
- `test/unit/channel-events.test.ts`

## F-040 - Fabric JWT Admission

`@epoch/nats` issues short-lived user JWTs, scopes ACLs by `sourceServer`, and
severs tracked connections on revoke. Auth callout answers Epoch-native JSON on
`$SYS.REQ.USER.AUTH`. Hosted/private may use intra-community service discovery
on `epoch.svc.>`; open never grants those subjects. NATS remains
intra-community.

Covered by:

- `test/unit/fabric-jwt.test.ts`
- `test/unit/nats-service-discovery.test.ts`
- `test/unit/fabric-auth-adversarial-mutation.test.ts`

Gated: production nats-server JWT handshake is not a Production ship.

## F-041 - Real PDS Adapter (gated)

`RealPds` implements `PdsTransport` and stays off until E10. Private publish
throws `PrivatePublishError`. CID spoof fails hash verify. Gossip still
verifies when PDS is down.

Covered by: `test/unit/real-pds.test.ts`

## F-042 - XMPP s2s Transport (gated)

`@epoch/xmpp` is a loss-declared FederationTransport. Default off. JIDs are
admission only. Honest phrase: Epoch-native with optional bridges.

When enabled, public `channel.create` and `channel.message` events fan out as
canonical signed bytes using conference-shaped routing JIDs
(`local@conference.dest`). That is a routing label, not XEP-0045 MUC:
occupants never author Epoch principals. Private/shared visibility throws
`PrivatePublishError`. `channel.read` and `channel.presence` do not federate.

Covered by: `test/unit/xmpp-transport.test.ts`,
`features/community_channels.feature`

## F-043 - Exit And Migration

`epoch-exit/v1` export/import/migrate CLI reproduces verified history, keeps
bindings, copies content-addressed blobs needed for `verify()`, and fails closed
on tamper, truncation, and crafted posture
downgrade.

Covered by: `test/unit/exit-bundle.test.ts`

See [Exit And Migration](exit-and-migration.md).

## F-001 - Signed Event Log

Every repository stores signed immutable events under `.epoch/events`.

Implemented behavior:

- `EpochRepository.init(author?)` creates repository metadata and an Ed25519 identity.
- `EpochRepository.create(root, options)` and `openOrCreate(root, options)` provide one-call repository creation helpers.
- `recordFile(path, mimeType)` appends a signed `record` event with causal parents.
- `track`, `forget`, `movePath`, `copyPath`, and `deletePath` record native
  working-tree lifecycle events for explicit file tracking, untracking,
  renames, copies, and deletes.
- `.epochignore`, `.epoch/info/exclude`, and TOML-configured global ignores
  shape untracked discovery and `push` auto-capture.
- `.epoch/config.toml` and `epoch.toml` provide TOML repository configuration;
  `working_tree.max_new_file_bytes` limits automatic new-file capture.
- `events()`, `read(eventId)`, and `heads()` expose the local event log.
- `verify()` checks event IDs, signatures, parent references, heads, and blob integrity.

Covered by:

- `features/repository.feature`
- `features/repository_composition.feature`
- `features/actors.feature`
