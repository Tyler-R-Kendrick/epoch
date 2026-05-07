# Epoch.Platform Specification

Status: Draft v1

Purpose: Define a self-hostable, enterprise-ready platform for deploying, operating, and collaborating on Epoch repositories and applications. The specification is written to be self-contained enough for another team or coding agent to reproduce the product from the document alone.

Sources and inspirations:

- OpenAI Symphony `SPEC.md` inspired the conformance-style structure: https://github.com/openai/symphony/blob/main/SPEC.md
- Coolify inspired the self-hostable deployment-console posture: https://github.com/coollabsio/coolify
- Primer Product UI defines the GitHub product design system vocabulary: https://primer.style/product/
- Current Epoch repository architecture is described in [Epoch Current Design](design.md).

## Normative Language

The key words `MUST`, `MUST NOT`, `REQUIRED`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, and `OPTIONAL` are to be interpreted as normative product and implementation requirements.

`Implementation-defined` means the behavior is part of the implementation contract, but this specification does not prescribe one universal policy. Implementations MUST document the selected behavior.

## 1. Problem Statement

Organizations can self-host source control, CI/CD, deployment dashboards, artifact storage, community collaboration, and AI developer tooling, but doing so usually requires stitching together many systems with inconsistent identity, security, disaster recovery, and user experience.

Epoch.Platform solves this by providing a single self-hostable platform that can:

- host Epoch repositories and collaboration workflows as a GitHub or GitLab alternative
- deploy applications, databases, workers, and services to customer-controlled infrastructure
- keep enterprise controls such as SSO, RBAC, audit, policy, HA, and DR built in from the start
- expose headless management through an SDK so operators can run it without the web console
- make public community and social features an optional module rather than a mandatory core dependency

Important boundary:

- `Epoch.Platform.Core` owns platform logic, domain invariants, APIs, deployment orchestration, policy, and persistence.
- `Epoch.Platform.Sdk` owns headless programmatic access to Core.
- `Epoch.Platform.Community` owns optional social and public-community capabilities, and MUST be deployable or removable without breaking Core.
- The web console is a product surface over Core and Community APIs; correctness MUST live in Core, not in UI-only logic.

## 2. Goals and Non-Goals

### 2.1 Goals

- Provide a sleek, minimal, mobile-native web console for self-hosting and operating Epoch.
- Use GitHub's Primer product design language and Octicons for layout, navigation, forms, status, and workflow affordances.
- Feel operationally direct like Coolify: connect infrastructure, create a project, choose a deployable, set secrets, deploy, observe, rollback.
- Support enterprise identity, authorization, compliance, audit, security policy, and multi-tenant organization boundaries.
- Support highly available and disaster-recoverable deployments with explicit backup, restore, seed bootstrap, failover, and recovery validation flows.
- Make AI a first-class product layer for code review, deploy diagnostics, incident repair, repository understanding, release notes, policy explanation, and guided operations.
- Keep Core usable without Community, without any public social graph, public feeds, global profiles, public discussions, or reputation systems.
- Keep the SDK capable enough for infrastructure-as-code, CI automation, operators, and agents to manage the platform headlessly.

### 2.2 Non-Goals

- Cloning GitHub or GitLab pixel-for-pixel.
- Requiring public-community features for private enterprise installations.
- Requiring a cloud-hosted control plane.
- Requiring one deployment substrate for all customers.
- Hiding production-critical actions inside AI-only workflows.
- Making generated deployments depend on UI state that cannot be reproduced through the SDK.
- Implementing every GitHub or GitLab feature in v1. The first product MUST prioritize deployability, repository collaboration, operational safety, and platform extensibility.

### 2.3 Product Principles

- Simple first screen: every user should immediately understand system health, active deployments, pending review work, and next action.
- Core before chrome: all business rules live in `Epoch.Platform.Core`; UI and SDK are clients.
- AI with receipts: AI actions need context, proposed diffs or commands, approval gates, audit trails, and measurable evals.
- Social is modular: community discovery and public identity are front and center when enabled, and absent when disabled.
- Mobile is not a read-only mode: approval, rollback, incident triage, review comments, deploy status, and AI assistance MUST work on phones.
- Enterprise is a baseline: SSO, audit, policy, HA, DR, and secure secret handling are not afterthoughts.
- Reversibility over drama: dangerous actions must be plan-first, previewable, cancelable before commit, and paired with obvious recovery paths.
- Context beats navigation: screens should preserve the user's project, repository, environment, and incident context as they move between code, deploys, logs, issues, and AI assistance.

### 2.4 Experience North Star

Epoch.Platform should feel like a quiet command center for building, deploying, and governing software on infrastructure the user controls. A user should never feel dropped into an admin maze. Every major screen MUST answer five questions without hunting:

- What exists here?
- What changed recently?
- What is unhealthy, blocked, or risky?
- What can I safely do next?
- What will happen if I approve this action?

The interface should be dense enough for daily operators, restrained enough for enterprise review, and warm enough for community participation when Community is enabled. It should feel familiar to GitHub users, operationally direct like Coolify, and clearly differentiated by Epoch's signed history, deployability, and AI-native workflows.

## 3. Template Application and Iterations

The extracted template in [Specification Template Extracted From Symphony](spec-template-outline.md) is applied here through eleven refinement passes.

### 3.1 Iteration 1: Product Shape

The initial shape separates the platform into Core, SDK, Community, and web console surfaces. This removes the main ambiguity: the product is not only a forge and not only a PaaS. It is a self-hosted forge plus deployment platform where the deployable infrastructure workflows are as prominent as repository workflows.

### 3.2 Iteration 2: Architecture Boundaries

The second pass moves all invariants into Core. Repositories, deployments, identity, policy, audit, runners, secrets, and disaster recovery belong to Core. The SDK and UI consume Core contracts. Community consumes Core events and public APIs but does not own repository correctness, deployment correctness, or enterprise policy.

### 3.3 Iteration 3: User Experience

The third pass constrains the UX: Primer components, GitHub-like density, mobile-native responsive layouts, keyboard-first interaction, progressive disclosure, and Coolify-style deployment flows. The product should feel like a calm operations console with collaboration built in, not a marketing site or dashboard collage.

### 3.4 Iteration 4: Enterprise Hardening

The fourth pass adds security, HA, DR, observability, AI guardrails, compliance, accessibility, validation profiles, and conformance checklists. This turns the concept into a product spec that can guide implementation and acceptance testing.

### 3.5 Iteration 5: Persona and Moment-of-Need Correction

Critical finding: the first draft described platform capabilities more strongly than user intent. The revised UX is anchored around moments of need:

- an operator needs to connect infrastructure and prove the system can recover
- a developer needs to move from code to reviewed change to deployed service
- a reviewer needs to understand risk quickly and approve safely
- an incident responder needs to diagnose, rollback, and leave an audit trail from a phone
- a community maintainer needs to showcase work and moderate collaboration without exposing private Core data

Each primary surface MUST optimize for the next decision in those moments, not for showing every object the platform knows about.

### 3.6 Iteration 6: Navigation and Mental Model Correction

Critical finding: a GitHub-like nav list alone is not enough. Epoch.Platform needs a stable mental model:

`Organization -> Project -> Repository -> Environment -> Deployable -> Deployment -> Resource`

The UI MUST preserve this model through breadcrumbs, page headers, filter chips, and command-palette scoping. Users should be able to tell whether they are acting on a repository, a deployed service, an environment, or the whole platform before seeing any destructive or production-impacting control.

### 3.7 Iteration 7: First-Run and Empty-State Correction

Critical finding: the first draft under-specified first-run success. A new instance MUST guide the operator to a meaningful deploy without making them read docs first. Empty states must be actionable:

- no infrastructure: connect a server, cluster, or local runner
- no project: create project or import from Git/GitHub/GitLab
- no deployable: choose template, detect from repo, or define service manually
- no secrets: add required secret references with scope explanation
- no backup: configure backup destination before production environment is marked healthy
- no Community: enable, hide, or defer Community intentionally

### 3.8 Iteration 8: Operational Trust and Reversibility Correction

Critical finding: "deploy" was too generic. Operators need confidence. Every production-impacting action MUST have a reviewable plan showing resources, secrets used by reference, commands or provider calls, policy gates, expected downtime, rollback target, and audit impact. The UI should make safe defaults fast and unsafe actions slow.

### 3.9 Iteration 9: AI Integration Correction

Critical finding: AI could feel like a chat drawer bolted onto an admin console. The revised model makes AI contextual and inspectable. AI appears where users make decisions: deploy plans, failed checks, review summaries, incident timelines, policy denials, moderation queues, and SDK examples. AI suggestions MUST include citations or source references and a visible action boundary.

### 3.10 Iteration 10: Community Product Correction

Critical finding: Community was optional architecturally but not product-shaped enough. When enabled, it MUST become a first-class product mode with public profiles, project showcases, discussions, feeds, contribution narratives, and moderation. When disabled, it MUST disappear cleanly without leaving dead links, awkward empty nav items, or hidden dependencies in private workflows.

### 3.11 Iteration 11: Mobile and Accessibility Correction

Critical finding: mobile support cannot be "responsive layout" only. The revised requirement is mobile-native task completion for urgent workflows: approve, reject, comment, deploy, rollback, acknowledge incident, inspect health, and ask AI for diagnosis. The product MUST validate these as task flows, not just viewport screenshots.

## 4. System Overview

### 4.1 Product Surfaces

1. `Epoch.Platform.Core`
   - Hosts domain logic, policy enforcement, APIs, job orchestration, deployment orchestration, repository hosting, identity, audit, secrets, and persistence.
   - Exposes stable public contracts to the web console, SDK, CLI, automation, agents, and optional modules.

2. `Epoch.Platform.Sdk`
   - Provides typed headless access to Core.
   - Supports administration, project provisioning, repository management, deployment automation, policy changes, incident response, export, backup, and restore workflows.

3. `Epoch.Platform.Web`
   - Provides the main responsive web console.
   - Uses Primer product UI patterns and Octicons.
   - MUST not contain unique business rules that bypass Core.

4. `Epoch.Platform.Community`
   - Optional deployment module for public profiles, follows, stars, feeds, discussions, showcases, reputation, community moderation, public project pages, and ecosystem discovery.
   - MUST be disabled cleanly in private corporate installs.

5. `Epoch.Platform.Runners`
   - Execute builds, tests, deploys, backups, restores, health checks, indexing, and AI tool actions.
   - Can run local, remote, Kubernetes, VM, container, or SSH-based workloads through documented adapters.

6. `Epoch.Platform.AI`
   - Cross-cutting capability exposed through Core APIs and UI surfaces.
   - Provides assistant, agent, summarization, review, diagnosis, and operator workflows under policy.

### 4.2 Main Components

1. `Identity and Access`
   - Users, service accounts, organizations, teams, groups, roles, permissions, SSO, SCIM, API tokens, sessions, and device trust.

2. `Repository Service`
   - Epoch repository hosting, signed event log verification, intents, merge/reject/comment workflows, named views, Git compatibility adapters, import/export, hooks, and repository web views.

3. `Project and Workspace Service`
   - Organizations, projects, environments, resource groups, tags, ownership, metadata, and navigation hierarchy.

4. `Deployment Orchestrator`
   - Deployable discovery, build plans, release plans, deploy jobs, rollback jobs, environment promotion, health gates, locks, and change windows.

5. `Infrastructure Adapter Layer`
   - Connects servers, Kubernetes clusters, SSH hosts, container engines, object storage, databases, identity providers, DNS, TLS issuers, package registries, and notification providers.

6. `Runner Coordinator`
   - Schedules jobs, assigns runners, enforces concurrency, captures logs, streams status, retries safe tasks, and quarantines unhealthy workers.

7. `Secrets and Configuration`
   - Stores encrypted secrets, environment variables, configuration templates, secret references, rotation metadata, and access grants.

8. `Policy Engine`
   - Evaluates RBAC, ABAC, approvals, protected environments, branch/view rules, deployment gates, required checks, secret access, AI tool scopes, and community moderation policy.

9. `Audit and Compliance`
   - Emits tamper-evident audit events for admin actions, repository decisions, policy changes, deployment actions, AI actions, secret access, auth events, and DR operations.

10. `Observability`
    - Stores logs, metrics, traces, deployment events, runner events, service health, synthetic checks, and incident annotations.

11. `Search and Indexing`
    - Indexes repositories, issues, discussions, deployment logs, docs, packages, audit metadata, and community content according to visibility rules.

12. `AI Context and Tooling`
    - Builds scoped context packs, invokes configured models, exposes approved tools, redacts secrets, evaluates outputs, and records AI action trails.

13. `Community Graph`
    - Optional social graph, public profiles, follows, stars, discussions, feeds, reputation, project showcases, moderation queues, and report handling.

14. `SDK/API Gateway`
    - Provides versioned REST, GraphQL, webhook, event stream, and SDK-compatible contracts.

### 4.3 Abstraction Levels

Epoch.Platform is easiest to reproduce when kept in these layers:

1. `Domain Layer`
   - Core entities, invariants, repository state, deployment state, policy decisions, and audit records.

2. `Application Layer`
   - Use cases such as create project, import repository, deploy service, approve release, rollback deployment, create backup, restore tenant, follow project.

3. `Coordination Layer`
   - Job scheduling, runner assignment, locks, retries, reconciliation, idempotency, and event fanout.

4. `Integration Layer`
   - Adapters for compute, storage, identity, VCS import, notification, DNS, TLS, AI providers, and observability sinks.

5. `Experience Layer`
   - Web console, mobile responsive layouts, SDK, CLI, webhooks, command palette, and AI assistant surfaces.

6. `Operations Layer`
   - Install, upgrade, backup, restore, failover, health checks, logs, metrics, traces, support bundles, and admin diagnostics.

### 4.4 External Dependencies

An implementation MAY choose different providers, but MUST document the selected adapters for:

- relational control-plane database
- durable object/blob storage
- queue or job coordination
- search index
- container or workload execution
- identity provider
- email and notification provider
- TLS and DNS automation
- AI model provider or local model runtime
- metrics, logs, and traces sink
- backup destination

## 5. User Experience Specification

### 5.1 UX Invariants

Every screen MUST obey these UX invariants:

- Show scope before action: organization, project, repository, environment, and deployable context MUST be visible before a user can approve, deploy, rollback, delete, reveal, or change policy.
- Keep the next action obvious: each page SHOULD have one primary action and a small number of secondary actions.
- Preserve context across work: moving from an intent to checks, deploy logs, incident notes, or AI diagnosis MUST keep the user in the same project and environment context.
- Prefer progressive disclosure: routine users see status, next action, and risk; advanced details remain one click away.
- Make generated work inspectable: generated deploy plans, AI suggestions, templates, SDK snippets, and infrastructure changes MUST show source inputs and editable outputs.
- Make waiting useful: build, deploy, backup, restore, and indexing states MUST show live progress, current step, elapsed time, logs, and likely next states.
- Make failure actionable: every failure state MUST answer what failed, where it failed, whether retry is safe, what rollback target exists, and which logs or audit events explain it.
- Keep private and public modes distinct: Community-enabled public surfaces MUST be visually and navigationally distinct from private Core operations.

### 5.2 Primary Personas and Jobs

`Platform Operator`

- Connect infrastructure.
- Configure identity, policy, backups, runners, and observability.
- Diagnose platform health and capacity.
- Restore service after failure.

`Developer`

- Create or import a repository.
- Open an intent, pass checks, request review, and deploy.
- Understand why a deploy failed without becoming a platform expert.

`Reviewer or Maintainer`

- Review code, signed provenance, checks, deploy impact, and policy gates.
- Approve, reject, comment, or request changes quickly.
- Use AI summaries without trusting them blindly.

`Incident Responder`

- Triage degraded deploys.
- Compare current release to last healthy release.
- Roll back or open a fix intent from desktop or mobile.

`Security and Compliance Admin`

- Manage SSO, SCIM, RBAC, protected environments, audit export, retention, runner trust, and AI tool policy.
- Prove who changed what and when.

`Community Maintainer`

- Publish public project pages.
- Moderate discussions.
- Grow contribution without exposing private enterprise data.

### 5.3 Information Architecture

The primary navigation MUST stay small and action-oriented:

- `Home`
- `Projects`
- `Repositories`
- `Deployments`
- `Infrastructure`
- `Issues`
- `Reviews`
- `Packages`
- `Observability`
- `Community` when enabled
- `Admin`

The global nav MUST be paired with scoped navigation:

- Organization scope switcher.
- Project scope switcher.
- Environment filter.
- Repository or deployable subnav when inside a resource.
- Command palette scoped to the current page context.

On narrow mobile viewports, the navigation MUST collapse into:

- bottom tabs for `Home`, `Projects`, `Deployments`, `Reviews`, and `More`
- a persistent scoped header showing current project/environment
- a command button for search, AI, and quick actions

The product MUST avoid deep left-nav trees. If a section needs more than two levels, it should become a landing page with grouped tasks and search.

### 5.4 Page Anatomy

Core pages SHOULD use this structure:

1. `PageHeader`
   - title, scope, state label, visibility, and primary action
2. `Context Strip`
   - environment, branch/view, deployable, health, policy, and recent activity counters
3. `Primary Work Area`
   - table, timeline, diff, logs, form, or plan review
4. `Right Rail` on wide screens
   - AI summary, related resources, approvals, warnings, or recent events
5. `Bottom Action Bar` on mobile
   - primary action, overflow menu, and risk state

The right rail MUST collapse below the main content on mobile. It MUST never contain the only path to complete a required workflow.

### 5.5 Role-Aware Home

The first authenticated screen MUST be role-aware.

For operators, Home MUST show:

- platform health
- incidents and degraded services
- backup freshness
- runner capacity
- failed jobs
- pending admin actions
- infrastructure targets
- recent policy and audit events

For developers, Home MUST show:

- assigned issues
- review requests
- open intents
- recent deploys tied to their projects
- failing checks
- favorite repositories and projects
- AI prompt entry scoped to their work

For maintainers, Home MUST show:

- pending reviews
- risky deploys awaiting approval
- unresolved review threads
- protected environment gates
- release candidates
- recent community activity when enabled

For incident responders, Home MUST show:

- active incidents
- degraded deployments
- recent rollbacks
- alerts by severity
- runbooks and AI diagnosis shortcuts

Users with multiple roles MAY customize the Home modules, but the default order MUST prioritize urgent work over static inventory.

### 5.6 First-Run Experience

A new instance MUST guide the operator through a short setup path:

1. Create admin account or complete SSO bootstrap.
2. Confirm base URL and email/notification settings.
3. Connect one infrastructure target or local runner.
4. Configure object storage and backup destination.
5. Create first organization and project.
6. Import or create a repository.
7. Deploy a sample or detected app.
8. Verify health, logs, backup status, and rollback target.

Setup MUST show completion state, skipped steps, and production readiness. The platform MUST NOT mark a production environment ready until backup destination, runner health, and identity policy are configured or explicitly waived.

### 5.7 Empty States

Empty states MUST teach the product by offering the next concrete action:

- No projects: "Create project", "Import from GitHub/GitLab", "Start from template".
- No infrastructure: "Connect server", "Connect Kubernetes", "Use local runner".
- No repositories: "Create Epoch repository", "Import Git repository", "Mirror existing forge".
- No deployables: "Detect from repository", "Use template", "Define manually".
- No secrets: "Add secret reference", "Import environment file", "Connect secret manager".
- No Community: "Enable Community", "Keep private", "Learn what changes".
- No AI provider: "Configure AI provider", "Use manual workflows", "Run local model".

Empty states MUST be real UI states, not documentation links alone.

### 5.8 Project Overview

A project is the primary operational unit. Its overview MUST show:

- health summary by environment
- repositories and active views
- deployables and current releases
- databases, queues, buckets, and dependent resources
- latest deploys and rollbacks
- open issues, review requests, and blocked intents
- incidents, alerts, and failed checks
- secret/config status
- backup coverage
- activity timeline
- AI suggestions with evidence and approval state

The project overview SHOULD make the most common path one click: code, review, deploy, rollback, inspect logs, open incident, or ask AI.

### 5.9 Deployment Flow

The deploy flow MUST be short, plan-first, and reversible:

1. Select source: Epoch repository, Git import, container image, template, package, or manual service definition.
2. Select target: server, cluster, runner group, environment, or resource pool.
3. Detect or choose deployable type: app, static site, worker, database, cron, queue, object bucket, custom service, or stack.
4. Configure build, runtime, secrets, domains, health checks, scaling, backup, and rollback policy.
5. Review generated plan with explicit resources, commands or provider calls, permissions, secret references, downtime estimate, cost/capacity estimate where known, and blast radius.
6. Resolve policy gates and required approvals.
7. Deploy with live logs, current step, health gate, cancel state, and rollback affordance.
8. Land on a deployment result page with release, health, logs, audit, rollback target, and follow-up recommendations.

The default path SHOULD work with minimal choices, but every generated value MUST be visible before execution. Advanced settings SHOULD remain available without forcing simple deploys through enterprise-only fields.

### 5.10 Deploy Plan Review

Deploy plan review is the central trust-building screen. It MUST show:

- source snapshot and verification state
- target environment and protection status
- affected deployables and resources
- generated build and runtime configuration
- secret names by reference, never plaintext
- required policy gates and current approval state
- health checks and rollback target
- expected downtime or zero-downtime strategy
- data migration or destructive-operation warnings
- exact SDK/API equivalent for headless reproducibility
- AI summary with citations if AI is enabled

The primary action label MUST reflect consequence, such as `Deploy to production`, `Promote to staging`, `Rollback to v42`, or `Create plan`, not a generic `Submit`.

### 5.11 Repository Collaboration Flow

Repository pages MUST support:

- files and history
- signed event verification status
- intents and pull-request-like change review
- comments and review threads
- checks, CI, and deployment links
- named views
- merge, reject, rollback, and promote actions
- Git import/export where host access allows it
- audit and provenance views

The UX SHOULD map familiar forge concepts onto Epoch primitives without hiding Epoch's signed event and intent model.

An intent review page MUST show:

- changed files and semantic summary
- signed event provenance
- affected deployables and environments
- required checks
- review threads
- policy gates
- AI risk summary with source references
- merge or promote consequence

### 5.12 Incident and Failure Experience

Incidents and failed deployments MUST have a dedicated diagnosis view:

- current state and severity
- timeline of recent deploys, checks, alerts, and resource changes
- first failing step
- linked logs and traces
- last healthy release
- rollback eligibility
- owners and notification state
- AI diagnosis with citations
- recommended next actions

The incident page MUST support mobile triage. A responder on a phone must be able to acknowledge, comment, inspect the likely cause, trigger an approved rollback, and create a follow-up issue.

### 5.13 AI-Native Experience

AI MUST be available through:

- global command palette
- scoped assistant in project, repository, deployment, incident, admin, and Community views
- review summaries
- deploy diagnosis
- release note drafts
- policy explanation
- migration planning
- SDK automation examples
- moderation assistance

AI MUST be contextual rather than generic. The assistant entry point should inherit the current scope and show what it can see: project, repository, deployment, logs, checks, policy, and Community content.

AI MUST NOT execute production-impacting actions without a policy-approved plan, scoped tools, and explicit approval unless an organization has configured trusted automation for that action class.

Every AI action MUST record:

- user or service account
- model/provider
- prompt/context source identifiers
- tools requested and tools used
- proposed action
- approval decision
- final action result
- relevant audit event IDs

AI output UI MUST distinguish:

- explanation
- suggestion
- generated plan
- executable action
- completed action

### 5.14 Community UX

When Community is enabled, it MUST feel like an intentional product mode:

- public Explore page for projects, topics, maintainers, releases, and discussions
- user profiles with contribution history, project roles, and public activity
- project showcase pages with README, deploy status badges where public, releases, discussions, topics, and contribution prompts
- follows, stars or bookmarks, and feed personalization
- discussion and Q&A flows tied to projects
- moderation queues with AI-assisted triage and human decisions

Community pages MUST respect visibility at every boundary. Private repository names, private deploy names, private org membership, private issue text, and private audit events MUST NOT leak into Community surfaces.

When Community is disabled, the nav item, public routes, public profile affordances, feed jobs, discussion prompts, and showcase controls MUST disappear or return documented `feature_disabled` responses.

### 5.15 Admin and Governance UX

Admin pages MUST optimize for safe operation, not configuration sprawl. Required admin groups:

- identity and SSO
- teams and roles
- policy and protected environments
- runners and infrastructure
- secrets and key rotation
- AI providers and tool policy
- audit and compliance export
- backups and restore drills
- Community moderation and visibility when enabled
- upgrade and support bundle

Each admin section MUST include:

- current state
- drift or risk warnings
- last changed by and when
- test connection or validate button where applicable
- audit link for recent changes
- SDK/API equivalent for automation

### 5.16 Forms, Tables, and Dense Data

Forms MUST be short by default and expandable for advanced controls. Required fields MUST explain why they are required when the reason is not obvious.

Data tables MUST support:

- search
- filtering
- sorting
- saved views where useful
- keyboard navigation
- bulk actions only when safe and auditable
- row-level actions
- mobile row cards

Tables showing operational state MUST include last updated time and stale-data indicators.

### 5.17 Error, Warning, and Confirmation Patterns

Warnings MUST be specific and actionable. Confirmation dialogs for dangerous actions MUST include:

- resource name
- environment
- consequence
- rollback or recovery option
- required typed confirmation only for irreversible or high-blast-radius actions
- audit event that will be recorded

For policy denials, the UI MUST show:

- denied action
- policy that denied it
- missing permission or approval
- who can approve or change policy
- safe alternative action when one exists

### 5.18 GitHub Design System Requirements

The UI MUST use Primer product UI patterns where available:

- `PageLayout` for core page structure
- `NavList`, `UnderlineNav`, and breadcrumbs for navigation
- `DataTable`, `ListView`-style rows, labels, counters, and state labels for dense operational data
- `Timeline` for repository, deployment, audit, incident, and community activity
- `ActionMenu`, `ActionList`, and `IconButton` for compact actions
- `FormControl`, `TextInput`, `Select`, `Checkbox`, `RadioGroup`, and `ToggleSwitch` for forms
- `Dialog`, `ConfirmationDialog`, `Banner`, and `InlineMessage` for interruptive or safety-critical UI
- `BranchName`, `LabelGroup`, `RelativeTime`, `CounterLabel`, `Tooltip`, and `TreeView` where they map naturally to forge workflows
- Octicons for recognizable action and status icons

The product MUST use the design system's interaction language without copying GitHub branding, logos, product names, or proprietary visual identity.

### 5.19 Visual Tone

The visual tone should be:

- sleek, minimal, and work-focused
- high contrast without looking heavy
- quiet in idle states, precise in warning states
- dense but readable
- optimized for scanning operational state
- distinct enough to feel like Epoch, not a generic GitHub skin

The palette SHOULD use neutral surfaces, restrained accents, strong semantic status colors, and clear typography. It MUST avoid decorative dashboards, oversized marketing hero sections, decorative gradients, and card stacks that bury operational hierarchy.

### 5.20 Coolify-Inspired Feel

Epoch.Platform SHOULD feel operationally close to Coolify in these ways:

- self-hosting is assumed, not hidden
- infrastructure connection is a first-class setup path
- deployables are concrete resources, not abstract dashboards
- users can deploy to their own servers or clusters
- templates and one-click resources are available, but generated configuration remains inspectable
- no vendor lock-in: exported configuration and running resources remain understandable outside the product

Epoch.Platform differs from Coolify by pairing deployability with forge collaboration, signed Epoch history, enterprise policy, and optional Community.

### 5.21 Mobile and Accessibility

The web console MUST meet WCAG 2.2 AA for core workflows.

Required behavior:

- all primary workflows usable at 360px width
- touch targets at least 44px where practical
- keyboard access for all controls
- visible focus states
- no color-only status encoding
- screen-reader labels for icon-only controls
- responsive data tables that collapse into scannable rows or detail panels
- reduced-motion support
- text that reflows without clipping at 200 percent zoom
- mobile-safe confirmation flows for deploy, rollback, secret reveal, delete, and policy changes

Mobile users MUST be able to approve, reject, deploy, rollback, triage incidents, comment on reviews, and ask AI for assistance. Mobile validation MUST be task-based: the test passes only if the workflow can be completed, not merely rendered.

### 5.22 UX Acceptance Metrics

The product SHOULD track these UX acceptance targets before a v1 release:

- First deploy from a fresh configured instance: <= 10 minutes for a simple detected app.
- Production deploy plan comprehension: 90 percent of test users can identify target environment, affected resources, rollback target, and required approvals.
- Failed deploy diagnosis: 80 percent of test users can find first failing step and safe next action within 2 minutes.
- Mobile incident rollback: approved responder can inspect, approve, and trigger rollback at 360px width without horizontal scrolling.
- Community disablement: no public social route appears in nav or project pages when disabled.
- Accessibility: automated checks pass and manual keyboard/screen-reader smoke tests cover core workflows.

## 6. Core Domain Model

### 6.1 Tenant and Identity Entities

`Organization`

- `id`
- `slug`
- `display_name`
- `plan`
- `created_at`
- `settings`
- `community_enabled`
- `audit_policy`
- `default_region`

`User`

- `id`
- `handle`
- `display_name`
- `primary_email`
- `identity_subjects`
- `status`
- `created_at`
- `profile_visibility`

`ServiceAccount`

- `id`
- `name`
- `organization_id`
- `scopes`
- `expires_at`
- `last_used_at`

`Team`

- `id`
- `organization_id`
- `slug`
- `display_name`
- `members`
- `role_bindings`

`RoleBinding`

- `subject_id`
- `subject_type`
- `resource_id`
- `resource_type`
- `role`
- `conditions`

### 6.2 Repository and Collaboration Entities

`Repository`

- `id`
- `organization_id`
- `project_id`
- `slug`
- `visibility`
- `default_view`
- `epoch_storage_ref`
- `git_mirror_ref`
- `verification_state`
- `created_at`
- `archived_at`

`EpochEvent`

- `id`
- `repository_id`
- `event_type`
- `author_id`
- `parents`
- `payload_ref`
- `signature_ref`
- `created_at`
- `verification_state`

`Intent`

- `id`
- `repository_id`
- `title`
- `description`
- `source_view`
- `target_view`
- `author_id`
- `state`
- `checks`
- `approvals`
- `merge_policy_snapshot`

`ReviewThread`

- `id`
- `repository_id`
- `intent_id`
- `path`
- `position`
- `state`
- `participants`
- `comments`

`Issue`

- `id`
- `project_id`
- `repository_id`
- `title`
- `description`
- `state`
- `assignees`
- `labels`
- `linked_intents`
- `linked_deployments`
- `visibility`

### 6.3 Deployment Entities

`Project`

- `id`
- `organization_id`
- `slug`
- `display_name`
- `description`
- `owner_team_id`
- `default_environment_id`
- `tags`

`Environment`

- `id`
- `project_id`
- `name`
- `type`
- `protected`
- `approval_policy`
- `secrets_scope`
- `deployment_strategy`

`Deployable`

- `id`
- `project_id`
- `source_type`
- `source_ref`
- `kind`
- `name`
- `runtime`
- `build_config`
- `resource_config`
- `health_checks`
- `rollback_policy`

`Deployment`

- `id`
- `deployable_id`
- `environment_id`
- `release_id`
- `state`
- `strategy`
- `started_by`
- `started_at`
- `completed_at`
- `health_state`
- `rollback_target`

`Release`

- `id`
- `project_id`
- `source_snapshot`
- `artifact_refs`
- `provenance`
- `created_by`
- `created_at`

`Resource`

- `id`
- `project_id`
- `environment_id`
- `kind`
- `name`
- `provider`
- `external_ref`
- `state`
- `backup_policy`
- `owner`

### 6.4 Infrastructure Entities

`InfrastructureTarget`

- `id`
- `organization_id`
- `kind`
- `name`
- `connection_ref`
- `region`
- `capacity`
- `health_state`
- `last_seen_at`

`Runner`

- `id`
- `runner_group_id`
- `target_id`
- `version`
- `labels`
- `state`
- `capacity`
- `last_heartbeat_at`

`Job`

- `id`
- `type`
- `state`
- `priority`
- `idempotency_key`
- `runner_requirements`
- `attempt`
- `created_at`
- `started_at`
- `finished_at`
- `logs_ref`

`Secret`

- `id`
- `scope`
- `name`
- `ciphertext_ref`
- `created_by`
- `rotated_at`
- `last_accessed_at`
- `access_policy`

### 6.5 Community Entities

Community entities exist only when `Epoch.Platform.Community` is installed and enabled.

`PublicProfile`

- `user_id`
- `handle`
- `bio`
- `links`
- `avatar_ref`
- `visibility`
- `moderation_state`

`CommunityProject`

- `repository_id`
- `public_slug`
- `summary`
- `topics`
- `stars_count`
- `followers_count`
- `showcase_assets`
- `moderation_state`

`Follow`

- `follower_id`
- `target_type`
- `target_id`
- `created_at`

`Discussion`

- `id`
- `target_type`
- `target_id`
- `title`
- `body`
- `state`
- `visibility`
- `participants`
- `moderation_state`

`FeedEvent`

- `id`
- `actor_id`
- `verb`
- `object_type`
- `object_id`
- `visibility`
- `created_at`

### 6.6 Stable Identifiers and Normalization

- Slugs MUST be unique within their parent scope and normalized to lowercase kebab-case.
- Internal IDs MUST be stable, opaque identifiers.
- Public handles MUST be case-insensitive and display-preserving.
- Repository event IDs MUST remain content-derived where Epoch semantics require it.
- External provider refs MUST be namespaced by provider and adapter version.
- Community public URLs MUST not expose private organization identifiers when Community is disabled.

## 7. Deployment and Topology Contract

### 7.1 Deployment Profiles

`Single Node`

- One host runs Core, Web, database, object storage, queue, runner, and optional Community.
- Suitable for evaluation and small teams.
- MUST support backup and restore.

`Small HA`

- Multiple stateless Core/Web instances behind a load balancer.
- External or clustered database, object storage, queue, and search.
- Runners are separate from the control plane.
- Suitable for production teams.

`Enterprise HA`

- Multi-zone or multi-region control plane.
- Dedicated runner pools.
- Separate admin, user, and public ingress.
- Enforced backup validation, restore drills, key rotation, audit export, and incident runbooks.

`Community Edge`

- Optional public Community module runs on separate ingress and may use separate cache/search tiers.
- Core private APIs remain protected behind organization policy.

### 7.2 Module Dependency Rules

- Core MUST NOT depend on Community.
- SDK MUST depend only on public Core contracts.
- Web MAY show Community routes only when Community capability discovery reports enabled.
- Community MAY subscribe to Core events through documented event contracts.
- Disabling Community MUST remove public social routes, feeds, profile discovery, public discussions, and public project showcase surfaces without impacting private repositories, deployments, SDK, or admin functions.

### 7.3 Configuration Contract

Implementations SHOULD support a platform configuration document such as `epoch-platform.yml` with these top-level sections:

- `server`
- `database`
- `storage`
- `queue`
- `search`
- `identity`
- `security`
- `repositories`
- `deployments`
- `runners`
- `secrets`
- `ai`
- `community`
- `observability`
- `backup`
- `ha`

Unknown top-level sections SHOULD be ignored with warnings for forward compatibility. Invalid known sections MUST fail startup or reload according to the severity of the field.

## 8. Core Platform Contract

### 8.1 Required Core Capabilities

Core MUST provide:

- organization and project management
- identity and access policy
- repository hosting and verification
- intent/pull-request-style review workflows
- issue tracking sufficient for repository and deployment work
- deployment orchestration
- runner coordination
- resource and environment management
- secrets management
- audit logging
- observability events
- backup and restore coordination
- AI context and tool authorization
- public API and event stream

### 8.2 API Requirements

Core APIs MUST provide:

- stable versioning
- consistent pagination
- idempotency keys for mutating actions
- typed error codes
- request correlation IDs
- audit event IDs for production-impacting actions
- capability discovery
- feature-disabled responses for unavailable optional modules
- least-privilege service account tokens
- webhook signing
- event-stream replay cursors

### 8.3 Event Contract

Core MUST emit events for:

- auth and session changes
- organization/project changes
- repository events and verification changes
- intent state transitions
- issue state transitions
- deployment lifecycle
- runner heartbeat and job lifecycle
- resource lifecycle
- secret access and rotation
- policy decisions
- AI plan/action lifecycle
- backup, restore, and failover operations
- Community-publicable events when Community is enabled and visibility allows it

Events MUST include:

- `id`
- `type`
- `occurred_at`
- `actor`
- `organization_id`
- `resource`
- `visibility`
- `correlation_id`
- `audit_event_id` when applicable
- `payload_schema_version`

### 8.4 Manifest and Deployable Discovery

Core SHOULD discover deployables from:

- repository metadata
- explicit `epoch.deploy.yml`
- container manifests
- package metadata
- templates
- manual user input
- SDK-provided definitions

Generated deploy plans MUST be visible, editable within policy, and reproducible through SDK calls.

## 9. SDK Contract

### 9.1 SDK Purpose

`Epoch.Platform.Sdk` MUST let users manage the platform without the web console.

Required audiences:

- platform operators
- CI jobs
- infrastructure-as-code providers
- migration tools
- AI agents
- internal admin scripts
- integration partners

### 9.2 SDK Capabilities

The SDK MUST support:

- authentication and token refresh
- organization, team, and role management
- project and repository provisioning
- repository import/export
- intent/review/comment operations
- issue operations
- environment and resource provisioning
- secret reference creation without exposing plaintext after write
- deploy plan generation
- deploy, promote, rollback, and cancel operations
- logs, metrics, and status streaming
- backup, restore, and verification operations
- capability discovery
- webhook signature verification helpers
- AI plan creation, approval, rejection, and result inspection

### 9.3 SDK Safety

SDK mutating methods MUST accept idempotency keys or generate stable ones. Production-impacting operations MUST expose dry-run or plan-first methods before execution.

SDK errors MUST include:

- stable code
- human message
- retryability
- correlation ID
- field violations when applicable
- audit event ID when applicable

## 10. Community Extension

### 10.1 Community Purpose

`Epoch.Platform.Community` turns Epoch.Platform from a private enterprise forge into a public or internal community platform with discovery, identity, collaboration, reputation, and project storytelling.

When enabled, Community should feel front and center, not bolted on. Public project pages, feeds, profiles, discussions, and reputation SHOULD be visible in the main navigation and project pages.

### 10.2 Required Community Capabilities

Community MUST provide:

- public or internal profiles
- project showcases
- stars or bookmarks
- follows
- discussions
- activity feeds
- topic discovery
- contribution summaries
- reputation signals
- moderation queues
- reports and takedowns
- abuse-rate controls
- public visibility rules

### 10.3 Community Disablement

When Community is disabled:

- no public profiles are served
- no follows, feeds, stars, public discussions, or reputation routes are available
- repository collaboration remains available privately through Core
- API capability discovery reports Community disabled
- SDK calls to Community APIs return `feature_disabled`
- background workers for Community indexing and feeds do not run
- existing Community data is retained or purged according to documented operator policy

### 10.4 Moderation and Safety

Community MUST include:

- content report flow
- moderator roles
- audit trails for moderation actions
- user blocking or muting
- spam and abuse throttles
- public/private visibility checks
- legal hold/export hooks for enterprise installs that enable public content

## 11. AI System Requirements

### 11.1 AI Capabilities

AI features SHOULD cover:

- repository Q&A with source citations
- code review summary and risk analysis
- intent/pull request title and description drafting
- deployment failure diagnosis
- incident timeline summary
- rollback recommendation
- release note generation
- policy explanation
- migration from Git/GitHub/GitLab
- infrastructure template generation
- SDK script generation
- community moderation assistance

### 11.2 AI Guardrails

AI MUST operate under policy:

- context is scoped to user permissions
- secrets are redacted unless a tool is explicitly allowed to use them without revealing plaintext
- write actions require plans
- production-impacting plans require approval unless trusted automation is configured
- model/provider choice is auditable
- tool calls are allowlisted and scoped
- prompt and context sources are recorded by identifier
- generated code or config can be reviewed before apply
- AI outputs that affect policy, deploys, security, or moderation are never silently applied

### 11.3 Evaluation Strategy

AI conformance MUST include evals for:

- citation accuracy in repository Q&A
- false-positive and false-negative rates in deploy diagnosis
- policy explanation correctness
- unsafe action refusal
- secret redaction
- approval-gate compliance
- code review usefulness
- hallucination resistance on missing data
- mobile UX for AI-assisted approval and rollback

## 12. Security, Compliance, and Governance

Core MUST support:

- OIDC and SAML SSO
- SCIM provisioning for enterprise profile
- local admin break-glass account with documented controls
- RBAC and conditional access
- protected repositories, environments, and deployables
- required reviews and checks
- encrypted secrets at rest
- short-lived runner credentials
- signed webhooks
- audit log export
- tamper-evident audit records
- IP allow/deny policy where deployed behind compatible ingress
- session management and token revocation
- dependency and container provenance metadata
- key rotation procedures
- data retention policy
- tenant export and delete flows

Security-sensitive actions MUST create audit records, including:

- role changes
- SSO/SCIM changes
- secret access or rotation
- protected environment changes
- deployment approvals
- rollbacks
- runner registration
- backup restore
- AI tool approval
- Community moderation actions

## 13. Observability and Operations

### 13.1 Logs, Metrics, and Traces

The platform MUST emit structured logs, metrics, and traces for:

- API requests
- job scheduling
- runner execution
- deploy lifecycle
- repository verification
- search indexing
- AI actions
- policy decisions
- auth events
- backup and restore
- Community feeds and moderation

Every production-impacting workflow MUST expose a correlation ID that connects API request, job, runner logs, deployment event, audit event, and UI status.

### 13.2 Operator Dashboard

Admin surfaces MUST show:

- service health
- database/storage/queue/search health
- runner health and capacity
- job backlog
- failed jobs
- deploy failure rate
- backup freshness
- restore verification status
- audit export status
- license or edition status if applicable
- Community queue health when enabled
- AI provider status and spend/usage where supported

### 13.3 Support Bundle

Core SHOULD generate a support bundle with:

- config summary with secrets redacted
- service versions
- recent errors
- health checks
- job samples
- audit summary
- runner diagnostics
- backup status
- feature capability map

## 14. High Availability and Disaster Recovery

### 14.1 HA Requirements

Production profiles MUST support:

- stateless horizontally scalable API/Web nodes
- independent runner pools
- durable database
- durable object storage
- durable queue or job log
- search index rebuild procedure
- leader election or distributed locks for singleton jobs
- rolling upgrades
- health probes
- readiness probes
- graceful shutdown
- backpressure on job queues

### 14.2 Backup Requirements

Backups MUST cover:

- control-plane database
- repository event storage
- artifacts and package storage
- secret metadata and encrypted secret payloads
- object storage
- configuration
- audit records
- Community data when enabled

Backups MUST record:

- timestamp
- component versions
- schema versions
- encryption key identifiers
- source region
- verification status
- restore compatibility

### 14.3 Restore Requirements

Restore workflows MUST support:

- full platform restore
- organization restore
- project restore
- repository restore
- artifact restore
- Community data restore when enabled
- dry-run validation
- post-restore verification
- operator-visible progress

### 14.4 RPO and RTO Targets

Reference targets:

- Single Node: RPO <= 24 hours, RTO <= 4 hours
- Small HA: RPO <= 1 hour, RTO <= 1 hour
- Enterprise HA: RPO <= 5 minutes, RTO <= 30 minutes

Implementations MAY choose different targets, but MUST document them and expose restore drill results.

## 15. Failure Model and Recovery

### 15.1 Failure Classes

The platform MUST classify:

- validation failure
- auth failure
- policy denial
- dependency outage
- runner unavailable
- job timeout
- deployment health failure
- resource drift
- secret unavailable
- repository verification failure
- search indexing lag
- AI provider failure
- Community moderation or abuse spike
- backup failure
- restore failure
- partial region outage

### 15.2 Recovery Behavior

Required behavior:

- failed deploys preserve logs and plan metadata
- safe retries use idempotency keys
- unsafe retries require a new plan or approval
- runner loss marks jobs unknown, then reconciles with target infrastructure
- resource drift is surfaced before destructive correction
- search lag degrades search results without blocking repository correctness
- AI provider failure degrades AI surfaces without blocking manual workflows
- Community outage does not block Core repository or deployment workflows
- backup failure alerts operators and marks compliance status degraded

## 16. Reference Workflows

### 16.1 First Install to First Deploy

1. Operator installs Epoch.Platform with Single Node or HA profile.
2. Operator creates admin identity and configures base URL.
3. Operator connects infrastructure target.
4. Operator creates organization and project.
5. User imports or creates repository.
6. Core detects deployables or asks for a template.
7. User selects environment and confirms generated deploy plan.
8. Runner builds and deploys release.
9. Health gate passes.
10. Project overview shows deployed service, logs, rollback target, and linked source.

### 16.2 Repository Change to Production

1. Developer creates intent from repository changes.
2. Checks run on runner.
3. AI summarizes risk and changed surfaces.
4. Reviewer approves or requests changes.
5. Protected environment policy requires deployment approval.
6. Release is created from verified source snapshot.
7. Deployment runs with health gate.
8. Audit log links intent, checks, approval, release, and deployment.

### 16.3 Deployment Failure Diagnosis

1. Deployment enters failed or degraded state.
2. Logs, health checks, resource state, recent changes, and policy context are assembled.
3. AI proposes likely causes and safe next steps.
4. User chooses inspect, retry, rollback, open issue, or apply approved fix.
5. Every action is recorded with correlation ID and audit event.

### 16.4 Community Opt-In

1. Admin enables Community for an organization or instance.
2. Public visibility policies are reviewed.
3. Users create public profiles.
4. Project maintainers publish showcase pages.
5. Followers, stars, discussions, and feeds activate.
6. Moderation queues and abuse controls are monitored.

### 16.5 Headless Provisioning Through SDK

1. Operator authenticates SDK with service account.
2. SDK creates organization, project, teams, roles, and infrastructure target.
3. SDK creates repository and environment.
4. SDK uploads or references secrets.
5. SDK generates deploy plan with idempotency key.
6. SDK executes deploy after approval token or policy check.
7. SDK streams status and records deployment URL.

## 17. Test and Validation Matrix

Validation profiles:

- `Core Conformance`: REQUIRED for all implementations.
- `SDK Conformance`: REQUIRED for SDK releases.
- `Community Conformance`: REQUIRED only when Community is shipped.
- `AI Conformance`: REQUIRED for AI features selected by implementation.
- `Enterprise Operations`: REQUIRED for production profiles.
- `Accessibility and Mobile`: REQUIRED for web console releases.

### 17.1 Core Conformance

- Organization, project, repository, environment, deployable, deployment, runner, secret, job, and audit entities can be created and queried.
- RBAC denies unauthorized access across organization and project boundaries.
- Repository verification state is displayed and available through API.
- Intent review lifecycle supports create, comment, approve, reject, merge/promote, and audit.
- Deploy plan generation is deterministic for the same source and target inputs.
- Deployment execution streams logs and reaches success, failure, canceled, or rolled-back states.
- Idempotency prevents duplicate production-impacting actions.
- Feature capability discovery reports enabled and disabled modules.
- Disabling Community leaves Core workflows usable.
- Search results respect visibility rules.

### 17.2 SDK Conformance

- SDK can perform first install bootstrap steps supported by API.
- SDK methods expose typed errors with correlation IDs.
- SDK can create dry-run deploy plans and execute approved plans.
- SDK can stream deployment logs and status.
- SDK can verify webhook signatures.
- SDK can start backup, inspect progress, and verify restore status.
- SDK handles `feature_disabled` for Community APIs.

### 17.3 Community Conformance

- Public profile creation respects visibility and moderation policy.
- Project showcase publication requires maintainer permission.
- Stars, follows, discussions, and feeds obey visibility rules.
- Disabled Community routes return `feature_disabled` or 404 according to documented routing policy.
- Moderation actions are audited.
- Abuse throttles apply to unauthenticated and authenticated users.

### 17.4 AI Conformance

- AI context never includes resources the actor cannot access.
- Secret redaction is enforced in prompts, logs, and stored context references.
- Production-impacting AI plans require approval unless trusted automation policy explicitly allows them.
- AI deploy diagnosis cites source logs, health checks, or deployment events.
- AI repository Q&A cites repository paths or event IDs.
- AI unsafe action refusals are tested.
- AI output quality is measured with regression evals.

### 17.5 Enterprise Operations

- SSO login works and maps groups to roles.
- SCIM create/update/deactivate works where configured.
- Audit export includes required security-sensitive actions.
- Backup and restore dry run pass.
- Full restore drill meets documented RPO/RTO target for selected profile.
- Rolling upgrade preserves active deploys or drains them safely.
- Runner loss is detected and jobs reconcile.
- Region or dependency outage enters documented degraded mode.

### 17.6 Accessibility and Mobile

- Core pages pass automated accessibility checks.
- Keyboard-only operation covers navigation, forms, tables, dialogs, deploy approval, rollback, and comments.
- Screen-reader labels exist for icon-only controls.
- Mobile viewport supports overview, deploy status, approval, rollback, incident assistant, issue comment, and review comment.
- Text reflows at 200 percent zoom without clipping.
- Status is not conveyed by color alone.

## 18. Implementation Checklist

### 18.1 REQUIRED for Core Conformance

- Core domain model and persistence.
- Versioned API with capability discovery.
- Identity, RBAC, service accounts, and audit.
- Repository hosting and Epoch verification.
- Intent/review workflow.
- Project, environment, deployable, resource, runner, job, and secret management.
- Deployment plan, execute, rollback, cancel, and status flows.
- Runner coordinator with logs and heartbeats.
- Policy engine for approvals and protected environments.
- Observability events and operator health surface.
- Backup and restore coordination.
- Community disabled mode.
- AI context and tool authorization baseline, even if no provider is configured.

### 18.2 REQUIRED for SDK Conformance

- Typed client.
- Auth helpers.
- Idempotent mutation helpers.
- Dry-run deploy plan support.
- Deployment log/status streaming.
- Backup and restore helpers.
- Webhook verification.
- Capability discovery.
- Feature-disabled handling.

### 18.3 REQUIRED for Community Conformance

- Public profiles.
- Project showcases.
- Stars/bookmarks and follows.
- Discussions.
- Activity feeds.
- Moderation.
- Abuse controls.
- Community data backup/restore.
- Clean disablement behavior.

### 18.4 REQUIRED for Web Console Release

- Primer-based responsive layout.
- Mobile support for core workflows.
- WCAG 2.2 AA target for core workflows.
- AI command palette and assistant panels.
- Deploy flow with plan review.
- Repository, intent, issue, deployment, observability, and admin pages.
- Community navigation only when enabled.

### 18.5 Operational Validation Before Production

- Run Core Conformance.
- Run SDK Conformance.
- Run Community Conformance if enabled.
- Run AI Conformance for configured AI features.
- Run accessibility and mobile validation.
- Run backup and restore drill.
- Run HA failover drill for HA profiles.
- Run runner loss and deployment rollback drills.
- Export and inspect audit logs.

## Appendix A. App Generation Directive

An implementation generated from this specification SHOULD produce a working product, not a marketing site. The first screen after login is the operational overview. The primary workflows are project creation, repository collaboration, infrastructure connection, deployment, review/approval, rollback, incident diagnosis, and optional Community discovery.

The generated UI MUST be dense but calm, using Primer-style navigation, tables, lists, timelines, labels, and dialogs. It should have the operational immediacy of a self-hosted PaaS while preserving the familiar collaboration vocabulary of a forge.

The generated backend MUST keep business rules in Core, expose them through SDK-compatible APIs, and keep Community optional.

## Appendix B. Open Design Decisions

These decisions are intentionally left implementation-defined and MUST be resolved before coding:

- reference database, queue, object storage, and search engine
- package and artifact registry implementation
- default runner isolation technology
- default AI provider and local-model support
- exact Git compatibility depth for v1
- exact public federation posture for Community
- license and edition model
- upgrade and migration packaging
