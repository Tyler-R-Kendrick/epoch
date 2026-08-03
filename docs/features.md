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
| [`features/platform_projects.feature`](../features/platform_projects.feature) | Separation between the hosting control-plane web app and the Community API/Core/CLI/Web packages, including the browser-rendered Community design-system shell and Community Web dogfooding through scannable signed Epoch site history. |
| [`features/community_web_experience.feature`](../features/community_web_experience.feature) | Community Web responsive and 200%-zoom channel navigation, message feed, snapshot action recovery, selected-message signed actions, live intent promotion, promote receipts, receipt search, state-driven identity honesty, agent requests, unified comments, and moderation/legal-hold evidence. |
| [`features/identity_bridge.feature`](../features/identity_bridge.feature) | Nostr↔ATProto mutual identity binding ceremony, pure client-side verification, revocation rollback defense, mix-and-match rejection, and agent attestation policy. |
| [`features/community_sandbox_workspaces.feature`](../features/community_sandbox_workspaces.feature) | Community Sandbox Workspace journeys where a contributor launches, resumes, checks, and submits a signed patch from a sandbox workspace, and a maintainer reviews the result. |
| [`features/community_agent_sandboxes.feature`](../features/community_agent_sandboxes.feature) | Community Agent Sandbox journeys where a maintainer starts a policy-bound agent run from a signed intent, reviews completed output, and retries failures without losing evidence. |

### Unit-covered federation packages (no Cucumber yet)

| Package / surface | Coverage |
|---|---|
| `@epoch/core` gossip (`GossipPeer`, HTTP `/epoch/gossip`, `gossipExchange`) | `test/unit/gossip-atproto-integration.test.ts` |
| `@epoch/atproto` (modes, public release dual-write, hybrid resolve) | `test/unit/atproto-community.test.ts`, `test/unit/gossip-atproto-integration.test.ts` |
| `@epoch/git-proxy` + Git projection | `test/unit/git-projection.test.ts`, `test/unit/git-proxy.test.ts` |

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
