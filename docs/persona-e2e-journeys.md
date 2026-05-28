# Persona End-To-End Journeys

This registry connects documented personas to executable end-to-end Cucumber
journeys. It complements the [persona feature matrix](persona-feature-matrix.md)
by proving the product can satisfy real human workflows, not only describe why a
feature exists.

Every documented persona must have at least one `@e2e` scenario in
[`features/persona_e2e_journeys.feature`](../features/persona_e2e_journeys.feature).
Every executable feature spec must appear in the feature-to-journey coverage
table below. The Community design contract fails the test suite when either
side drifts.

## Executable Persona Journeys

| Persona | Scenario tag | End-to-end journey |
|---|---|---|
| A GitHub open-source contributor | `@persona.github_open_source_contributor` | Carries signed local work through intent review, verification, Git export, and browser-rendered Community discovery. |
| A maintainer | `@persona.maintainer` | Reviews work, resolves moderation reports, links issues to review intents, records checks, uses AI summary context, and merges accepted work. |
| A platform operator | `@persona.platform_operator` | Checks production readiness, sees secret-safe impact and rollback cost signals, deploys, diagnoses health degradation, and rolls back with audit evidence. |
| A security and compliance responder | `@persona.security_and_compliance_responder` | Verifies SSO/SCIM identity, revokes tokens and sessions, redacts secret access, exports audit evidence, and handles tenant export/delete with typed diagnostics. |

## Feature-To-Journey Coverage

| Feature spec | Persona journey coverage |
|---|---|
| `features/repository.feature` | Contributor signed local work, verification, review intent, and Git export journey. |
| `features/actors.feature` | Contributor signed authorship and async provenance journey. |
| `features/crdt_log.feature` | Contributor local-first and offline convergence journey. |
| `features/merge.feature` | Contributor and maintainer review clarity journey. |
| `features/named_views.feature` | Contributor isolated experimentation and rollback journey. |
| `features/cli_wasm.feature` | Contributor portable CLI and browser-safe execution journey. |
| `features/wasm_react.feature` | Contributor interrupted browser session and rematerialization journey. |
| `features/ha_dr.feature` | Contributor recovery and trusted restore journey. |
| `features/advanced_collaboration.feature` | Contributor secure collaboration, redaction, gate, and adapter journey. |
| `features/platform_core.feature` | Operator headless platform, deploy-plan, approval, audit, and Community capability journey. |
| `features/platform_operations.feature` | Operator readiness, secret-safe deploy, incident, AI approval, rollback, and Community moderation journey. |
| `features/platform_product_domains.feature` | Maintainer RBAC, issue, review, package, search, observability, Community, moderation, and snapshot journey. |
| `features/platform_enterprise_conformance.feature` | Security and compliance identity, token, session, webhook, secret, audit, compliance, and tenant-data journey. |
| `features/platform_infrastructure_delivery.feature` | Operator dry-run infrastructure, runner, retry, reconcile, and cost-control journey. |
| `features/platform_ai_operations_ha.feature` | Operator AI governance, incident follow-up, support bundle, backup, restore, and HA journey. |
| `features/platform_community_conformance.feature` | Maintainer showcase, reputation, search, abuse-control, takedown, block, legal-hold, and disabled-worker journey. |
| `features/platform_web.feature` | Operator responsive web console and Community-enabled navigation journey. |
| `features/platform_web_conformance.feature` | Operator accessible task completion, role-aware modules, governance, dense data, confirmation, and SDK-parity journey. |
| `features/community_persona_driven_design.feature` | Contributor-centered design-thinking and persona-driven BDD governance journey. |
| `features/platform_projects.feature` | Contributor Community app boundary, API/Core/CLI/Web workflow, and signed site dogfooding journey. |
| `features/persona_e2e_journeys.feature` | Cross-persona executable proof that documented personas can complete end-to-end workflows. |
