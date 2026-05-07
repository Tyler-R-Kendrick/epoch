# Specification Template Extracted From Symphony

Status: Draft v1

Purpose: Capture a reusable outline for writing a self-contained product and service specification that is detailed enough for another team or coding agent to reproduce an application from the document alone.

Sources used for this outline:

- OpenAI Symphony `SPEC.md`: https://github.com/openai/symphony/blob/main/SPEC.md
- Primer Product UI: https://primer.style/product/
- Coolify README: https://github.com/coollabsio/coolify/blob/v4.x/README.md

## 1. Normative Frame

Define the document status, target audience, purpose, and normative language. State what `MUST`, `SHOULD`, `MAY`, and `OPTIONAL` mean, and define `implementation-defined` so unspecified choices still become documented implementation contracts.

## 2. Problem, Boundary, Goals, and Non-Goals

Describe the problem in operational terms. Include the important boundary early: what the system owns, what it delegates, and what successful completion means.

Then list:

- goals that are required for conformance
- non-goals that protect scope
- product principles that guide trade-offs
- explicit assumptions that may vary by implementation

## 3. System Overview

Break the system into named components with one clear responsibility each. Include:

- main product surfaces
- backend services and domain modules
- UI surfaces
- integration adapters
- operator surfaces
- optional extensions

Then describe abstraction layers, from policy and configuration through coordination, execution, integration, observability, and safety.

## 4. Domain Model

Define the canonical entities before workflows. For each entity, specify required fields, optional fields, stable identifiers, normalization rules, and ownership boundaries.

Good specs define data enough that independent implementors produce compatible APIs, logs, tests, and UI states.

## 5. Public Contracts

Document the contracts that external users, agents, or services rely on:

- configuration files and schema
- API resources and error shapes
- SDK capabilities
- event names and payloads
- extension points
- CLI commands, if applicable
- UI state URLs, if applicable

Unknown or extension fields should have forward-compatibility rules.

## 6. Runtime State and Lifecycle

Define state machines for the behaviors that matter. Include:

- internal state names
- transition triggers
- terminal states
- idempotency rules
- retry behavior
- reconciliation behavior
- restart behavior

If the system has no daemon, still define request, job, deployment, approval, or workflow lifecycles.

## 7. Scheduling, Coordination, and Data Flow

Specify ordering, concurrency, locking, retries, backoff, race handling, and consistency semantics. Include any distinction between control-plane state, data-plane state, and derived views.

## 8. Resource and Safety Management

Document how the system creates, reuses, isolates, and removes resources. Cover filesystem paths, workspaces, runner environments, secrets, logs, caches, generated artifacts, and cleanup rules.

## 9. Integration Protocols

Specify how adapters talk to external systems. Include required operations, normalization, pagination, error mapping, authentication, rate limits, and unsupported behavior.

## 10. AI Context and Prompt Contracts

For AI-native systems, define:

- model-facing context sources
- prompt assembly rules
- tool permissions
- approval gates
- output schemas
- evaluation strategy
- data-retention and privacy boundaries

AI features should be auditable product capabilities, not invisible magic.

## 11. Observability and Operator Surfaces

Define logs, metrics, traces, dashboards, alerts, audit trails, status pages, and snapshots. Observability should expose enough state to debug live systems without changing correctness.

## 12. Failure Model and Recovery

List failure classes and required recovery behavior. Include partial failure, retry safety, degraded mode, stale state, dependency outage, data corruption, backup restore, and operator intervention points.

## 13. Security and Operational Safety

Document trust boundaries, secret handling, authorization, filesystem or network containment, supply-chain controls, audit logging, compliance expectations, and abuse controls.

## 14. Reference Algorithms

Include language-agnostic pseudocode for the most important workflows. This is where a spec becomes reproducible: startup, provisioning, dispatch, reconciliation, deployment, rollback, backup, restore, and extension loading can all be captured as algorithms.

## 15. Test and Validation Matrix

Split validation into profiles:

- core conformance for every implementation
- extension conformance for optional features
- real integration profile for environment-dependent checks
- accessibility and UX validation for user-facing surfaces
- performance, scale, and disaster-recovery validation for production readiness

Each row should be concrete enough to become a test, Gherkin scenario, or acceptance criterion.

## 16. Implementation Checklist

End with a definition of done. Separate required work from recommended extensions and operational validation. The checklist should be terse, auditable, and mapped to the validation matrix.

## 17. Appendices

Use appendices for optional deployment profiles, extension examples, glossary terms, rejected alternatives, and compatibility notes. Optional sections should never be required for core conformance unless explicitly selected.

## Iteration Loop for Applying the Template

1. Capture the product intent in one paragraph.
2. Identify hard boundaries and non-goals.
3. Name the independently deployable modules.
4. Define the minimum domain model.
5. Walk the primary user workflows from empty state to production use.
6. Add AI-native workflows and guardrails.
7. Add mobile, accessibility, and design-system constraints.
8. Add scale, HA, DR, security, and compliance constraints.
9. Convert vague requirements into validation rows.
10. Re-read for contradictions, orphan modules, and implementation-defined gaps.

## UX-Critical Iteration Loop

After the first full draft, run a separate UX critique. A technically complete spec can still produce a bad app if it does not name the humans, their moments of need, and the decisions each screen helps them make.

Use these passes:

1. `Persona pass`: define the primary users and the job each one needs to complete.
2. `First-run pass`: specify the shortest path from fresh install to meaningful success.
3. `Navigation pass`: define the mental model, page scopes, breadcrumbs, and command/search behavior.
4. `Decision pass`: for every major screen, name the next decision the user is trying to make.
5. `Trust pass`: require plans, previews, impact summaries, confirmations, rollback paths, and audit links for risky actions.
6. `Empty-state pass`: make every empty state point to a real next action, not only documentation.
7. `Failure pass`: make errors explain what failed, why it matters, whether retry is safe, and what recovery path exists.
8. `Mobile pass`: validate urgent workflows as complete mobile tasks, not only responsive screenshots.
9. `Accessibility pass`: require keyboard, screen-reader, color, focus, zoom, and reduced-motion behavior.
10. `Measurement pass`: add UX acceptance metrics that can be tested before release.

## Anti-Patterns to Avoid

- Describing screens without defining the domain model behind them.
- Describing services without defining the operator experience.
- Adding AI features without permission, evaluation, and audit contracts.
- Saying "enterprise-ready" without HA, DR, identity, compliance, and supportability requirements.
- Making optional social features depend on core deployability.
- Copying a design system's brand instead of using its interaction patterns and components.
- Treating "responsive" as enough for mobile instead of specifying task completion.
- Creating a dashboard that shows inventory but does not help the user decide what to do next.
- Adding confirmation dialogs that warn generally but do not explain scope, blast radius, rollback, and audit impact.
