# Executable Feature Scenario Inventory

This inventory records every executable Gherkin scenario in `features/` and the persona context that drives it. It is the scenario-level companion to the [feature registry](features.md) and the [persona feature matrix](persona-feature-matrix.md).

Personas remain user context for real product behavior. Do not add persona-only feature files or matrix-only scenarios to satisfy this inventory; instead, update the real product feature scenario and this record together.

## Feature Spec Counts

| Feature spec | Scenario records |
|---|---:|
| `features/actors.feature` | 4 |
| `features/advanced_collaboration.feature` | 9 |
| `features/cli_wasm.feature` | 4 |
| `features/community_agent_sandboxes.feature` | 3 |
| `features/community_sandbox_workspaces.feature` | 3 |
| `features/community_web_experience.feature` | 5 |
| `features/identity_bridge.feature` | 5 |
| `features/crdt_log.feature` | 3 |
| `features/ha_dr.feature` | 7 |
| `features/merge.feature` | 7 |
| `features/named_views.feature` | 4 |
| `features/platform_ai_operations_ha.feature` | 4 |
| `features/platform_community_conformance.feature` | 3 |
| `features/platform_core.feature` | 4 |
| `features/platform_enterprise_conformance.feature` | 4 |
| `features/platform_infrastructure_delivery.feature` | 4 |
| `features/platform_operations.feature` | 6 |
| `features/platform_product_domains.feature` | 5 |
| `features/platform_projects.feature` | 5 |
| `features/platform_web.feature` | 3 |
| `features/platform_web_conformance.feature` | 3 |
| `features/repository.feature` | 31 |
| `features/wasm_react.feature` | 2 |

## Scenario Records

| Feature spec | Persona tags | BDD item | Scenario or outline | Rule | Examples |
|---|---|---|---|---|---:|
| `features/actors.feature` | `@persona.github_open_source_contributor` | Scenario | Asynchronous actor repository records and verifies a file | None | 0 |
| `features/actors.feature` | `@persona.github_open_source_contributor` | Scenario | Concurrent actor users append independent events | None | 0 |
| `features/actors.feature` | `@persona.github_open_source_contributor` | Scenario | Actor event sync converges with a peer asynchronously | None | 0 |
| `features/actors.feature` | `@persona.github_open_source_contributor` | Scenario | Actor upgrades an existing repository without user identity storage | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Signed issues, reviews, CI, and gate policy project deterministic collaboration state | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Repositories synchronize through an explicit memory transport | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Reusable conflict resolutions are signed and exact-match only | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | CLI records and reuses exact-match conflict resolutions | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Operation events explain repository command history | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Media-aware entity adapters merge tabular CSV by row identity | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Redaction events allow local secret cleanup without losing audit evidence | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | Event serialization can be substituted by repository providers | None | 0 |
| `features/advanced_collaboration.feature` | `@persona.github_open_source_contributor` | Scenario | CLI exposes collaboration, gate, operation, and redaction workflows | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | CLI records, verifies, lists, and resolves repository content | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | CLI policy, view, sync, Git import/export, and DR commands are covered | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | CLI errors and Git compatibility command wrapper return failures | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | WASM exports support CRDT helpers and reject native Git operations | None | 0 |
| `features/community_agent_sandboxes.feature` | `@persona.maintainer` | Scenario | Maintainer starts a policy-bound agent sandbox from a signed intent | None | 0 |
| `features/community_agent_sandboxes.feature` | `@persona.maintainer` | Scenario | Maintainer reviews a completed agent sandbox result | None | 0 |
| `features/community_agent_sandboxes.feature` | `@persona.maintainer` | Scenario | Maintainer retries a failed agent sandbox without losing failure evidence | None | 0 |
| `features/community_sandbox_workspaces.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor submits a repository patch without local setup | None | 0 |
| `features/community_sandbox_workspaces.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor resumes an interrupted sandbox workspace | None | 0 |
| `features/community_sandbox_workspaces.feature` | `@persona.maintainer` | Scenario | Maintainer approves a submitted sandbox workspace result | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer opens the channel feed and sees social conversations first | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer promotes a community idea into an intent | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer requests an agent from a selected conversation | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor adds a unified signed comment to the current channel | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Moderator reports a selected conversation for legal hold | None | 0 |
| `features/identity_bridge.feature` | `@persona.security_compliance_responder` | Scenario | Valid mutual binding verifies without trusting the index | None | 0 |
| `features/identity_bridge.feature` | `@persona.security_compliance_responder` | Scenario | Rollback after revocation is rejected | None | 0 |
| `features/identity_bridge.feature` | `@persona.security_compliance_responder` | Scenario | Mix-and-match plane proofs fail closed | None | 0 |
| `features/identity_bridge.feature` | `@persona.security_compliance_responder` | Scenario | Agent attestation is scoped expiring and rate-limited | None | 0 |
| `features/identity_bridge.feature` | `@persona.security_compliance_responder` | Scenario | Protocol-shaped AT proof rejects tampering | None | 0 |
| `features/crdt_log.feature` | `@persona.github_open_source_contributor` | Scenario | Offline agents converge independent map updates after sync | None | 0 |
| `features/crdt_log.feature` | `@persona.github_open_source_contributor` | Scenario | One actor can append repeated map updates to the same CRDT entity | None | 0 |
| `features/crdt_log.feature` | `@persona.github_open_source_contributor` | Scenario | Offline agents converge concurrent text inserts after sync | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Compact pruning and restoration | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Pruned compacts remain trusted parents for new events | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Targeted compacts restore with later tail events | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Fresh peer bootstraps from a trusted seed | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Seed bootstrap rejects an unexpected seed identity | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Cold backup restores a repository | None | 0 |
| `features/ha_dr.feature` | `@persona.github_open_source_contributor` | Scenario | Cold backup restores tail events and blobs after its compact | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Merge concurrent text additions | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Merge text additions without dropping repeated lines | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Merge text without dropping repeated base lines | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Merge text additions at their original positions | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Report conflicting text replacements with line numbers | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Merge independent JSON object keys | None | 0 |
| `features/merge.feature` | `@persona.github_open_source_contributor` | Scenario | Report conflicting JSON scalar edits | None | 0 |
| `features/named_views.feature` | `@persona.github_open_source_contributor` | Scenario | Feature view isolates local intents from main | None | 0 |
| `features/named_views.feature` | `@persona.github_open_source_contributor` | Scenario | Promotion to main remains gated until approval | None | 0 |
| `features/named_views.feature` | `@persona.github_open_source_contributor` | Scenario | Rejection excludes an intent from main | None | 0 |
| `features/named_views.feature` | `@persona.github_open_source_contributor` | Scenario | Blue and green deployment views differ by stop intent | None | 0 |
| `features/platform_ai_operations_ha.feature` | `@persona.platform_operator` | Scenario | AI context packs redact secrets, cite sources, and gate unsafe tools | None | 0 |
| `features/platform_ai_operations_ha.feature` | `@persona.platform_operator` | Scenario | Deployment failure diagnosis preserves logs, classifies failure, and creates follow-up work | None | 0 |
| `features/platform_ai_operations_ha.feature` | `@persona.platform_operator` | Scenario | Operator dashboard and support bundle expose production readiness without leaking secrets | None | 0 |
| `features/platform_ai_operations_ha.feature` | `@persona.platform_operator` | Scenario | Backup, restore, failover, and RPO/RTO drills are coordinated | None | 0 |
| `features/platform_community_conformance.feature` | `@persona.maintainer` | Scenario | Public showcases, topics, releases, contribution, and reputation are discoverable | None | 0 |
| `features/platform_community_conformance.feature` | `@persona.maintainer` | Scenario | Abuse controls, blocking, takedowns, and legal hold are audited | None | 0 |
| `features/platform_community_conformance.feature` | `@persona.maintainer` | Scenario | Disabled Community hides social APIs and workers without blocking Core | None | 0 |
| `features/platform_core.feature` | `@persona.platform_operator` | Scenario | Headless project setup keeps Community optional | None | 0 |
| `features/platform_core.feature` | `@persona.platform_operator` | Scenario | Deploy plans expose impact before execution | None | 0 |
| `features/platform_core.feature` | `@persona.platform_operator` | Scenario | Protected deploy execution records audit trail after approval | None | 0 |
| `features/platform_core.feature` | `@persona.platform_operator` | Scenario | Community can be enabled without coupling core deployability | None | 0 |
| `features/platform_enterprise_conformance.feature` | `@persona.security_compliance_responder` | Scenario | SSO, SCIM, service accounts, tokens, and sessions are audited | None | 0 |
| `features/platform_enterprise_conformance.feature` | `@persona.security_compliance_responder` | Scenario | API idempotency, correlation, webhooks, and event stream are reproducible | None | 0 |
| `features/platform_enterprise_conformance.feature` | `@persona.security_compliance_responder` | Scenario | Secret rotation, least privilege access, audit export, and retention are enforced | None | 0 |
| `features/platform_enterprise_conformance.feature` | `@persona.security_compliance_responder` | Scenario | Tenant export, delete, and typed errors carry safe diagnostics | None | 0 |
| `features/platform_infrastructure_delivery.feature` | `@persona.platform_operator` | Scenario | Infrastructure targets, resources, templates, and deployable discovery are inspectable | None | 0 |
| `features/platform_infrastructure_delivery.feature` | `@persona.platform_operator` | Scenario | Dry-run deploy plans are deterministic, editable, cancelable, and promotable | None | 0 |
| `features/platform_infrastructure_delivery.feature` | `@persona.platform_operator` | Scenario | Runner coordination handles heartbeats, quarantine, retries, and reconciliation | None | 0 |
| `features/platform_infrastructure_delivery.feature` | `@persona.platform_operator` | Scenario | Platform configuration accepts forward-compatible unknown sections but rejects invalid known sections | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | First-run readiness requires infrastructure, backups, and a deployment | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Deploy plans include secrets and impact summary without exposing plaintext | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Deploy execution creates runner job, logs, health state, and audit trail | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Incident diagnosis and rollback preserve operator context | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | AI action plans are scoped, auditable, and approval gated | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Community publication includes moderation before public visibility | None | 0 |
| `features/platform_product_domains.feature` | `@persona.maintainer` | Scenario | Environment approvals are governed by RBAC | None | 0 |
| `features/platform_product_domains.feature` | `@persona.maintainer` | Scenario | Issues, intents, checks, and reviews form a forge workflow | None | 0 |
| `features/platform_product_domains.feature` | `@persona.maintainer` | Scenario | Packages, search, and observability connect platform surfaces | None | 0 |
| `features/platform_product_domains.feature` | `@persona.maintainer` | Scenario | Community profiles, follows, stars, discussions, reports, and feeds work together | None | 0 |
| `features/platform_product_domains.feature` | `@persona.maintainer` | Scenario | Platform snapshots restore core and community state | None | 0 |
| `features/platform_projects.feature` | `@persona.github_open_source_contributor` | Scenario | Web manages Community as a deployable Epoch app | None | 0 |
| `features/platform_projects.feature` | `@persona.github_open_source_contributor` | Scenario | Community owns repository collaboration workflows | None | 0 |
| `features/platform_projects.feature` | `@persona.github_open_source_contributor` | Scenario | Community CLI uses the Core API client | None | 0 |
| `features/platform_projects.feature` | `@persona.github_open_source_contributor` | Scenario | Community Web renders repository collaboration in a browser | None | 0 |
| `features/platform_projects.feature` | `@persona.github_open_source_contributor` | Scenario | Community Web dogfoods Epoch for site changes | None | 0 |
| `features/platform_web.feature` | `@persona.platform_operator` | Scenario | Mobile operator console preserves scope and next action | None | 0 |
| `features/platform_web.feature` | `@persona.platform_operator` | Scenario | Community-enabled console exposes moderated community surface | None | 0 |
| `features/platform_web.feature` | `@persona.platform_operator` | Scenario | Community-enabled console exposes the public project showcase | None | 0 |
| `features/platform_web_conformance.feature` | `@persona.platform_operator` | Scenario | Mobile console exposes scoped task actions and compact navigation | None | 0 |
| `features/platform_web_conformance.feature` | `@persona.platform_operator` | Scenario | Desktop console exposes role-aware home modules and admin governance sections | None | 0 |
| `features/platform_web_conformance.feature` | `@persona.platform_operator` | Scenario | Desktop console exposes accessible dense data, confirmations, and SDK equivalents | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Initialize and record a file | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Create an empty repository with one command | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Push assets to create a repository and first version | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Push skips repository metadata directories | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Push honors Epoch ignore files | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Native file lifecycle commands update the signed projection | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Track and forget override ignored discovery | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Check-ignore explains matched Epoch ignore patterns | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Repository TOML config limits automatic tracking size | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Materialize a version into a clean directory | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Refuse to overwrite materialized output by default | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Version CRDT state as a deployable snapshot | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | SDK open-or-create pushes assets and materializes a version | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Repository hooks observe event-driven lifecycle steps | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Detect tampered event content | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Detect tampered blob content | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Reject files outside the repository root | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Sync command surface synchronizes repositories | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Intent merge signatures advance the main projection | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Rejected intents remain on the ledger but are skipped by main | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Intent workflow events carry signed metadata | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Import from and export to Git repositories | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Git compatibility clone records provider metadata | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Git compatibility commit records an Epoch merge event | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Unsupported Git compatibility operations explain why | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Initialization defaults to virtual materialization | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Virtual checkout keeps unchanged files off disk | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Preview prints the rolling aggregate patch | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Hydrate realizes virtual files from the object store | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Full checkout restores the entire working tree | None | 0 |
| `features/repository.feature` | `@persona.github_open_source_contributor` | Scenario | Version materialization with a base writes only changed files | None | 0 |
| `features/wasm_react.feature` | `@persona.github_open_source_contributor` | Scenario | React hook persists, rewinds, rematerializes, and resumes state changes in a browser | None | 0 |
| `features/wasm_react.feature` | `@persona.github_open_source_contributor` | Scenario | Browser live repository hooks synchronize through a VFS | None | 0 |
