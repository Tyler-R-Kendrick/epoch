# Epoch Community Operations

`@epoch/community-operations-web` is a separate deployable extension for
community-owned project operations. Its first concrete product slice is
Community Sandbox Workspaces: a Codespaces-style flow where contributors open a
repository, launch or resume an agent-backed sandbox workspace, edit code, run
checks, submit a signed patch intent, and let maintainers review the result.
It is Coolify-inspired, but it is not part of `Epoch.Platform.Web` and it does
not make `Epoch.Platform.Core` own new Community workflows.

The package is a projection over existing Platform state. Platform Core remains
the authority for repositories, deployables, environments, deploy plans,
deployments, jobs, runners, secrets, AI action plans, platform events, and
audit records. Community Operations reads that state through
`@epoch/platform-sdk` and renders a static PWA model for maintainers.

## Sandbox Workspace Capabilities

The current model describes a contributor and maintainer workflow for:

- workspace templates attached to repositories;
- sandbox workspace sessions with goal, repository, developer, changed files,
  checks, cost owner, security policy, agent context, recovery state, patch
  intent, signed event, and next actions;
- interrupted workspace resume so a contributor can keep working without losing
  repository state, changed files, and agent context from a signed workspace
  snapshot;
- patch-intent submission from the workspace; and
- maintainer review with changed files, checks, preview id, approval/rejection,
  and signed review provenance.

The executable product coverage is
[`features/community_sandbox_workspaces.feature`](../features/community_sandbox_workspaces.feature).

## Agent Sandbox Capabilities

The same extension also models the agent-side workflow that supports those
workspaces:

- maintainers start from a signed patch intent and choose an approved agent;
- sandbox launch records policy, resource limits, input intent, AI action plan,
  and signed invocation event;
- completed sandbox results keep transcript summary, changed files, checks,
  output patch intent, preview id, and signed output event together;
- failed sandbox results preserve failure diagnosis and signed failure evidence;
  and
- retries create a separate queued sandbox linked to the previous failed run
  while keeping the no-secret policy and agent context visible.

The executable product coverage is
[`features/community_agent_sandboxes.feature`](../features/community_agent_sandboxes.feature).

## Maintainer Operations Capabilities

The same package also projects operations state for:

- hosted apps from Platform repositories, deployables, environments,
  deployments, deploy plans, runners, secret references, and audit events;
- preview actions that can be represented as static links for `Create Preview`,
  `Promote`, and `Rollback`;
- imported workflow metadata through `CommunityWorkflowAutomation`, including
  GitHub Actions-style definitions as source metadata rather than execution
  authority, with `executionAuthority` naming the Epoch runner/job path that
  will own execution;
- workflow run status through `CommunityWorkflowRun`, optionally connected to
  Platform jobs;
- agent sandbox output through `CommunityAgentSandboxRun`, connected to
  Platform AI action plans where available, with user-facing fields for agent,
  repository, state, input intent, output patch, policy summary, resource
  limits, transcript, changed files, checks, preview, failure, previous run,
  signed event, and optional `CommunityAgentSandboxRuntime` metadata for
  provider, orchestrator, adapter, gateway, writable directory, resource
  limits, and policy layers;
- runner capacity through `CommunityRunnerSummary`;
- secrets metadata as counts and environment association without plaintext
  exposure; and
- signed activity and provenance from Platform audit and event records.

The rendered shell has sections for Apps, Sandbox Workspaces, Workspace
Reviews, Previews, Workflows, Agent Sandboxes, Runners, and Activity. Cards
show the workspace goal, repository, template, cost owner, security policy,
changed files, checks, agent context, recovery state, patch intent, preview,
review decision, signed event IDs, and next available action.

## Public API

`createCommunityOperationsWebApp(options)` builds the structural PWA model for
a single Platform project. It accepts an `EpochPlatformSdk`, a `projectId`,
optional deployment metadata, optional workflow automations, optional workflow
runs, optional sandbox runs, optional workspace templates, optional sandbox
workspace sessions, and optional workspace reviews.

Workspace templates carry the user-facing launch constraints a contributor
needs before spending community compute: repository slug, starting context,
setup summary, optional cost owner, and optional security policy. Workspace
sessions carry the continuity and trust state a contributor and maintainer need
after launch: developer, goal, state, changed files, checks, agent context,
optional recovery state, optional patch intent, optional signed event, and
available actions.

Agent sandbox runs carry the agent-side trust state a maintainer needs before
and after delegation: sandbox id, AI plan id, approved agent, provider/model,
repository slug, input intent, optional output patch, policy summary, resource
limits, transcript summary, changed files, checks, preview id, failure reason,
previous run id, signed event, agent context, and available actions.

`createCommunityOperationsDeploymentTarget(options)` returns a
`DeployableEpochApp`-compatible descriptor with the stable id
`epoch-community-operations`, route `/community/operations`, health path
`/healthz`, and required services for Epoch node, object store, sync seed, and
Community API.

`renderCommunityOperationsDocument(app)` renders the static HTML document for
the operations dashboard. The first screen is the usable dashboard, not a
landing page.

Primary structural model types:

- `CommunityOperationsWebAppDefinition`
- `CommunityOperationsDeploymentTarget`
- `CommunityHostedApp`
- `CommunitySandboxWorkspaceTemplate`
- `CommunitySandboxWorkspaceSession`
- `CommunitySandboxWorkspaceReview`
- `CommunityWorkflowAutomation`
- `CommunityWorkflowRun`
- `CommunityAgentSandboxRun`
- `CommunityAgentSandboxRuntime`
- `CommunityRunnerSummary`
- `CommunityOperationsActivity`

## Extension Boundary

Community Operations composes with Platform Web through a deployable app
descriptor. Platform Web can register that descriptor like any other managed
service, but Platform Web and Platform Core do not import
`@epoch/community-operations-web`.

The intended composition point is host wiring:

```ts
import { createCommunityOperationsWebApp } from "@epoch/community-operations-web";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";
import { createPlatformWebApp } from "@epoch/platform-web";

const operations = await createCommunityOperationsWebApp({
  platform: new EpochPlatformSdk(createInMemoryPlatformCore()),
  projectId: "project_1",
});

const web = createPlatformWebApp({
  deployableApps: [operations.deploymentTarget],
});
```

## Workflow And Sandbox Notes

GitHub Actions support is import/display/projection only in v1. Imported
workflow definitions can label their source as `github-actions`, while
`executionAuthority` records that Epoch runner jobs are the intended execution
authority.

Agent sandbox runs are signed, inspectable outputs. A sandbox card records the
sandbox id, agent, provider, model, policy, input intent, output patch, AI plan
id, state, transcript summary, changed files, checks, preview, failure reason,
previous run, and signed event id. Sandbox runtime metadata can describe
OpenShell and Deep Agents-style execution without adding a runtime dependency to
this package: provider, orchestrator, adapter kind, adapter package label,
gateway, compute mode, writable directory, resource limits, and policy layers
are structural provenance fields.

The OpenShell/Deep Agents reference flow is documented at
[langchain-ai/openshell-deepagent](https://github.com/langchain-ai/openshell-deepagent).
If a sandbox operator configures OpenShell through a Node package, Community
Operations should preserve that Node package/CLI surface as metadata instead of
forcing a Python-only adapter path.

## V1 Limits

- Static PWA shell and rendered document only.
- No replacement for Platform Core deploy, job, runner, secret, AI plan, or
  audit authority.
- No external deploy-platform authority.
- No GitHub Actions execution authority.
- No browser evidence recording, generated evidence artifact, or
  package-specific unit proof anchor.
- Community Sandbox Workspace behavior is covered by the named app feature
  [`features/community_sandbox_workspaces.feature`](../features/community_sandbox_workspaces.feature).
- Community Agent Sandbox behavior is covered by the named app feature
  [`features/community_agent_sandboxes.feature`](../features/community_agent_sandboxes.feature).

## Related Documents

- [Platform Packages](platforms.md)
- [ADR-0013: Community Operations Extension Package](design-decisions/0013-community-operations-extension-package.md)
- [User Stories](user-stories.md#ops-020-manage-community-sandbox-workspaces)
- [Agent Sandbox User Story](user-stories.md#ops-021-manage-community-agent-sandboxes)
