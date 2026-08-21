# Executable Feature Scenario Inventory

This inventory records every executable Gherkin scenario in `features/` and the persona context that drives it. It is the scenario-level companion to the [feature registry](features.md) and the [persona feature matrix](persona-feature-matrix.md).

Personas remain user context for real product behavior. Do not add persona-only feature files or matrix-only scenarios to satisfy this inventory; instead, update the real product feature scenario and this record together.

## Feature Spec Counts

| Feature spec | Scenario records |
|---|---:|
| `features/actors.feature` | 4 |
| `features/advanced_collaboration.feature` | 9 |
| `features/cli_wasm.feature` | 11 |
| `features/community_agent_sandboxes.feature` | 3 |
| `features/community_channels.feature` | 4 |
| `features/community_sandbox_workspaces.feature` | 3 |
| `features/community_web_experience.feature` | 88 |
| `features/identity_bridge.feature` | 5 |
| `features/crdt_log.feature` | 3 |
| `features/ha_dr.feature` | 7 |
| `features/merge.feature` | 7 |
| `features/named_views.feature` | 4 |
| `features/spaces.feature` | 10 |
| `features/platform_ai_operations_ha.feature` | 4 |
| `features/platform_community_conformance.feature` | 3 |
| `features/platform_core.feature` | 4 |
| `features/platform_enterprise_conformance.feature` | 4 |
| `features/platform_infrastructure_delivery.feature` | 4 |
| `features/platform_operations.feature` | 10 |
| `features/platform_product_domains.feature` | 5 |
| `features/platform_projects.feature` | 5 |
| `features/platform_web.feature` | 3 |
| `features/platform_web_conformance.feature` | 3 |
| `features/repository.feature` | 31 |
| `features/repository_composition.feature` | 6 |
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
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor creates a stable Change as a signed revision | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor publishes a Change for review without a pull-request branch | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | CLI policy, view, sync, Git import/export, and DR commands are covered | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | CLI errors and Git compatibility command wrapper return failures | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | WASM exports support CRDT helpers and reject native Git operations | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor merges concurrent dependency additions without a false conflict | None | 0 |
| `features/cli_wasm.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor sees a diff that names the changed value, not the surrounding lines | None | 0 |
| `features/cli_wasm.feature` | `@persona.maintainer` | Scenario | Maintainer is told when a discovered extension is not trusted | None | 0 |
| `features/cli_wasm.feature` | `@persona.maintainer` | Scenario | A trusted extension loses its grant when its binary is replaced | None | 0 |
| `features/cli_wasm.feature` | `@persona.maintainer` | Scenario | Untrusting an extension revokes it even under an open trust policy | None | 0 |
| `features/community_agent_sandboxes.feature` | `@persona.maintainer` | Scenario | Maintainer starts a policy-bound agent sandbox from a signed intent | None | 0 |
| `features/community_agent_sandboxes.feature` | `@persona.maintainer` | Scenario | Maintainer reviews a completed agent sandbox result | None | 0 |
| `features/community_agent_sandboxes.feature` | `@persona.maintainer` | Scenario | Maintainer retries a failed agent sandbox without losing failure evidence | None | 0 |
| `features/community_channels.feature` | `@persona.github_open_source_contributor` | Scenario | Two contributors exchange signed channel messages | None | 0 |
| `features/community_channels.feature` | `@persona.github_open_source_contributor` | Scenario | Live composer does not use local-only signatures | None | 0 |
| `features/community_channels.feature` | `@persona.github_open_source_contributor` | Scenario | Public channel messages fan out over XMPP without treating MUC as identity | None | 0 |
| `features/community_channels.feature` | `@persona.platform_operator` | Scenario | Open posture keeps a local unread watermark | None | 0 |
| `features/community_sandbox_workspaces.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor submits a repository patch without local setup | None | 0 |
| `features/community_sandbox_workspaces.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor resumes an interrupted sandbox workspace | None | 0 |
| `features/community_sandbox_workspaces.feature` | `@persona.maintainer` | Scenario | Maintainer approves a submitted sandbox workspace result | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Spectator replay hides private identity and protected input | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Streamer silences input so spectators cannot watch a secret | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Spectator replays a stream in their own theme | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor follows a receipt without losing search | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user types in the composer without j k R stealing focus | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Moderator scopes mute report and hook to the selected object | None | 0 |
| `features/community_web_experience.feature` | `@persona.bluesky_power_user` | Scenario | Contributor cannot mint a stub AT session without OAuth | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user sees Activity grow only from store participants | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user browses Activity categories like channel messages | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor searches registered sources and sees completeness | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor corrects a precise search syntax error without AI | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer explains why an Entity matched | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor saves search semantics as a Projection Definition | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor clones and reorganizes the built-in namespace | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor replaces the root and recovers from an invalid projection | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer composes a projection and explains deterministic shadowing | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | One canonical Entity appears at multiple paths and occurrences | None | 0 |
| `features/community_web_experience.feature` | `@persona.screen_reader_power_user` | Scenario | Queued projection updates preserve the reader's position | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Private Entities cannot influence observable search or paths | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Browser falls back when persistent SQLite is unavailable | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Two browser tabs contend without corrupting the search index | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Projection state survives reload and deterministic migration | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | GraphQL and text frontends share one Search Expression | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | CLI user validates and previews a Projection Definition | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor splits a change graph atomically and reconstructs the exact snapshot | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor gets a safe failure when an atomic split is ambiguous | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer follows stable revisions across multiple heads and supersession | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer reviews a bundle without losing individual change context | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer partially merges only a dependency-closed subset | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer squashes a change graph without erasing provenance | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer cannot merge with stale review evidence | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor resolves a durable conflict after deterministic help precedes AI | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor hydrates a partial browser replica and sees truthful copy isolation | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor keeps stable mappings while escaping through interoperable forges | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer sponsors a finite-budget agent and later revokes it | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Responder archives a public release but denies a private archive request | None | 0 |
| `features/community_web_experience.feature` | `@persona.screen_reader_power_user` | Scenario | Screen-reader maintainer traverses the change graph at mobile width and 200 percent zoom | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor opens a community and sees community-owned channels first | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor enters the Community Web community from the Epoch landing | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user sees the sample board named as a sample stream | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor enters a clean sample channel from the landing | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user traverses Community Web messages without a pointer | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user pages through a tall message before the next post | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user sees which nested message is in focus | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user yields the prompt and returns to the last board context | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user navigates the VFS and returns from messages by keyboard | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user replies in CLI and previews AI drafts before posting | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user operates every Community Web post action without a pointer | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user swaps board chords via a keymap.toml loadout | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user previews and enters message directories from the prompt | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user navigates a Community Web context menu without losing focus | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user manages lounge voice after moving to another room | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer defines one action for prompt agent and voice control | None | 0 |
| `features/community_web_experience.feature` | `@persona.platform_operator` | Scenario | Agent operator consumes compatible startup conditions with one restart | None | 0 |
| `features/community_web_experience.feature` | `@persona.platform_operator` | Scenario | Agent operator keeps model routing sticky within a workspace | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor expands and restores the focused panel by keyboard | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor shares one message with stable context choices | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer reopens a durable Projection Definition | None | 0 |
| `features/community_web_experience.feature` | `@persona.screen_reader_power_user` | Scenario | Screen-reader power user traverses an explicit reply thread | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user distinguishes namespace ascent thread ancestry and history | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Power user chooses global jump without weakening deterministic cd | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor opens Network Feed for cross-community discovery | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer switches communities and gets a new channel list | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer promotes a community idea into a Change | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer requests an agent from a selected conversation | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer recovers a signed action from snapshot mode | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor adds a unified signed comment to the current channel | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor reaches a channel conversation on a narrow screen | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor keeps community content in reach at 200 percent zoom | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Moderator reports a selected conversation for legal hold | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Contributor searches community receipts by harness and Change | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_power_user` | Scenario | Maintainer sees a receipt after recording a Change | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor keeps signed actions after a live refresh | None | 0 |
| `features/community_web_experience.feature` | `@persona.bluesky_power_user` | Scenario | Contributor sees state-driven identity honesty on a live API session | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor sees an inviting empty state in a quiet channel | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Contributor searching with no matches sees the query named back | None | 0 |
| `features/community_web_experience.feature` | `@persona.slack_power_user` | Scenario | Contributor clears receipt search with Escape | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Contributor sees unread only for channels with new activity | None | 0 |
| `features/community_web_experience.feature` | `@persona.security_compliance_responder` | Scenario | Contributor reveals the record behind a signature | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_power_user` | Scenario | Maintainer follows a promoted message to the change it became | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor sees what a generated interface change does before accepting it | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor recovers from an interface change that no longer renders | None | 0 |
| `features/community_web_experience.feature` | `@persona.maintainer` | Scenario | Maintainer confirms the terminal and an agent performed the same action | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor gets their own workspace and project when they open the board | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor composes an interface change and accepts it after reading the diff | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor carries their interface to another machine and rolls it back | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Guest contributor with fabric configured is told realtime requires sign-in | None | 0 |
| `features/community_web_experience.feature` | `@persona.github_open_source_contributor` | Scenario | Signed-in contributor with a Platform fabric ticket attaches realtime honestly | None | 0 |
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
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Operator distinguishes availability gaps from integrity failures | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Operator verifies Git protocol fidelity and a rejected push | None | 0 |
| `features/platform_operations.feature` | `@persona.platform_operator` | Scenario | Operator audits continuous mirror lag identity authority and archive state | None | 0 |
| `features/platform_operations.feature` | `@persona.security_compliance_responder` | Scenario | Responder exports a redacted support bundle and confirms dangerous operations | None | 0 |
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
| `features/repository_composition.feature` | `@persona.github_open_source_contributor` | Scenario | A contributor narrows their workspace to the component they work on | None | 0 |
| `features/repository_composition.feature` | `@persona.github_open_source_contributor` | Scenario | A contributor asks why a file is not in their working tree | None | 0 |
| `features/repository_composition.feature` | `@persona.github_open_source_contributor` | Scenario | A contributor sees how much of the repository their selection covers | None | 0 |
| `features/repository_composition.feature` | `@persona.maintainer` | Scenario | A maintainer embeds a component another team owns | None | 0 |
| `features/repository_composition.feature` | `@persona.maintainer` | Scenario | A maintainer is stopped from mounting a component inside another one | None | 0 |
| `features/repository_composition.feature` | `@persona.maintainer` | Scenario | A maintainer sees that a linked component's content is not available locally | None | 0 |
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
| `features/spaces.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor joins a shared space and gets to work | None | 0 |
| `features/spaces.feature` | `@persona.maintainer` | Scenario | Maintainer removes a participant and their access ends with them | None | 0 |
| `features/spaces.feature` | `@persona.security_compliance_responder` | Scenario | Responder confirms an agent cannot outspend its allocated budget | None | 0 |
| `features/spaces.feature` | `@persona.security_compliance_responder` | Scenario | Responder confirms continuous capture requires recorded consent | None | 0 |
| `features/spaces.feature` | `@persona.platform_operator` | Scenario | Operator sees a workspace report only what its provider declared | None | 0 |
| `features/spaces.feature` | `@persona.github_open_source_contributor` | Scenario | A review comment survives the file being reformatted | None | 0 |
| `features/spaces.feature` | `@persona.security_compliance_responder` | Scenario | Responder confirms an agent turn ran inside a proven boundary | None | 0 |
| `features/spaces.feature` | `@persona.security_compliance_responder` | Scenario | Responder sees an unprovable sandbox refused rather than trusted | None | 0 |
| `features/spaces.feature` | `@persona.github_open_source_contributor` | Scenario | Contributor joins a space and pays for content only where they look | None | 0 |
| `features/spaces.feature` | `@persona.maintainer` | Scenario | Maintainer joins a space synced from another machine | None | 0 |
