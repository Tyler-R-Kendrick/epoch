# Epoch Current Feature Registry

This registry describes features implemented in the current TypeScript prototype. It intentionally excludes roadmap items that do not have executable coverage in `features/`.
Every executable feature spec is also mapped to a persona, journey, pain point,
trust question, degraded-state behavior, human considerations, validation
evidence, and executable e2e persona coverage in the
[persona feature matrix](persona-feature-matrix.md) and
[persona end-to-end journeys](persona-e2e-journeys.md).

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
| [`features/community_persona_driven_design.feature`](../features/community_persona_driven_design.feature) | Persona-driven BDD contract for Community design thinking, user-centric design, and human-centered design, including contributor trust, degraded state, security, cost, accessibility, moderation, and portability scenarios. |
| [`features/platform_projects.feature`](../features/platform_projects.feature) | Separation between the hosting control-plane web app and the Community API/Core/CLI/Web packages, including the browser-rendered Community design-system shell and Community Web dogfooding through signed Epoch site history. |
| [`features/persona_e2e_journeys.feature`](../features/persona_e2e_journeys.feature) | Cross-persona end-to-end journeys that prove documented contributor, maintainer, operator, and security/compliance personas can complete real app workflows. |
| [`features/community_operations.feature`](../features/community_operations.feature) | Separate Community Operations extension for hosted apps, workflow runs, agent sandboxes, runner status, signed provenance, and Platform Web descriptor registration. Evidence: [Community Operations evidence](evidence/community-operations/README.md), [Cucumber JSON](evidence/community-operations/community_operations.feature.json), and [Playwright WebM](evidence/community-operations/community_operations.webm). |

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
