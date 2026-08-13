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
| [`features/actors.feature`](../features/actors.feature) | Async actor facade and per-user authorship. |
| [`features/crdt_log.feature`](../features/crdt_log.feature) | Operation CRDT events and materialized map/text state. |
| [`features/merge.feature`](../features/merge.feature) | Intent policy and entity merge behavior. |
| [`features/named_views.feature`](../features/named_views.feature) | Named logical views and promotion flows. |
| [`features/cli_wasm.feature`](../features/cli_wasm.feature) | CLI command behavior, signed Change Graph commands, and WASM-safe exports. |
| [`features/spaces.feature`](../features/spaces.feature) | Shared signed workspaces: joining a Space, grant-bound turns, budget limits, consent-gated capture, truthful workspace binding, and structural anchors that survive a reformat. |
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
| [`features/community_web_experience.feature`](../features/community_web_experience.feature) | Canonical Nightboard plus Change Graph workbench journeys: atomic split, stable multi-head Revisions, Review Bundles, dependency-closed merge and squash provenance, stale review blocking, durable conflict resolution, partial hydration, interoperability fidelity, agent grants/budgets, public archival/privacy, accessible graph traversal, stable contextual links, projections, deterministic navigation, shared actions, and signed moderation evidence. |
| [`features/identity_bridge.feature`](../features/identity_bridge.feature) | Nostr↔ATProto mutual identity binding ceremony, pure client-side verification, revocation rollback defense, mix-and-match rejection, and agent attestation policy. |
| [`features/community_sandbox_workspaces.feature`](../features/community_sandbox_workspaces.feature) | Community Sandbox Workspace journeys where a contributor launches, resumes, checks, and submits a signed patch from a sandbox workspace, and a maintainer reviews the result. |
| [`features/community_agent_sandboxes.feature`](../features/community_agent_sandboxes.feature) | Community Agent Sandbox journeys where a maintainer starts a policy-bound agent run from a signed intent, reviews completed output, and retries failures without losing evidence. |

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

See [ADR-0022](design-decisions/0022-gossip-event-plane-atproto-public-artifacts.md) and
[docs/community-atproto.md](community-atproto.md).

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
- `features/actors.feature`
