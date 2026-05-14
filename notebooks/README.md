# Epoch Notebooks

These notebooks show executable usage scenarios for the current Epoch feature
surface. They are Jupyter `nbformat` notebooks with Node.js-flavored JavaScript
cells, because Epoch's public examples are TypeScript/JavaScript package and
CLI surfaces.

## Notebook Pattern

The examples follow the common Jupyter documentation pattern:

1. Start each scenario with Markdown context that names when to use the flow.
2. Put the runnable code in the next code cell.
3. Store the stdout result directly under the code cell.
4. Explain how to interpret the result after the output.

This mirrors the way Jupyter separates narrative Markdown cells, executable
code cells, and captured outputs. The pattern is based on the official
[Jupyter Notebook code-cell documentation](https://jupyter-notebook.readthedocs.io/en/v7.4.5/examples/Notebook/Running%20Code.html),
[Jupyter Markdown cell documentation](https://jupyter-notebook.readthedocs.io/en/v7.4.5/examples/Notebook/Working%20With%20Markdown%20Cells.html),
and [nbformat documentation](https://nbformat.readthedocs.io/en/v5.10.3/).

## Running Or Refreshing

From the repository root:

```bash
npm ci
npm run build
npm run notebooks:build
```

The build step is required because the notebooks import the compiled workspace
exports such as `epoch`, `epoch/Epoch.Platform.Core`, and
`epoch/Epoch.WASM.React`. To execute cells interactively, open the notebooks
with a Node.js-compatible Jupyter kernel from the repository root. The same code
can also be pasted into `.mjs` files and run with Node.js.

## Notebook Index

| Notebook | Usage scenarios |
|---|---|
| [01-repository-cli-and-git.ipynb](01-repository-cli-and-git.ipynb) | Core repository lifecycle, CLI usage, version materialization, and trusted-host Git-compatible commands. |
| [02-change-control-collaboration-and-crdt.ipynb](02-change-control-collaboration-and-crdt.ipynb) | Intent policy, named views, signed collaboration objects, gate checks, conflict resolutions, redactions, bundle transport, actors, CRDT state, sync, and entity merges. |
| [03-recovery-wasm-and-react.ipynb](03-recovery-wasm-and-react.ipynb) | HA/DR compacts, pruning, seed bootstrap, cold backups, WASM-safe helpers, React history, browser VFS sync, and unsupported native Git behavior in WASM. |
| [04-platform-community-and-web.ipynb](04-platform-community-and-web.ipynb) | Platform deployment, infrastructure delivery, enterprise APIs, operations, AI guardrails, backup/restore/HA drills, Community workflows, and web rendering surfaces. |

## Feature Coverage Map

| Feature spec | Notebook coverage |
|---|---|
| [`features/repository.feature`](../features/repository.feature) | Repository create/open, file record, asset push, signed version, materialization, verification, sync, intent workflow, and Git-compatible host command examples. |
| [`features/actors.feature`](../features/actors.feature) | XState-backed actor system, per-user authorship, and peer sync. |
| [`features/crdt_log.feature`](../features/crdt_log.feature) | Map CRDT operations, materialization, sync convergence, and built-in merge adapters. |
| [`features/merge.feature`](../features/merge.feature) | Text, JSON, CSV, and reusable exact-match conflict resolution examples. |
| [`features/named_views.feature`](../features/named_views.feature) | Feature view isolation and promotion into main. |
| [`features/cli_wasm.feature`](../features/cli_wasm.feature) | CLI record/verify/version flows, WASM-safe merge helpers, and WASM Git rejection. |
| [`features/wasm_react.feature`](../features/wasm_react.feature) | React store history, rewind, rematerialization, browser live repository, and VFS sync. |
| [`features/ha_dr.feature`](../features/ha_dr.feature) | Compact creation, pruning, restore, seed bootstrap, cold backup, and backup verification. |
| [`features/advanced_collaboration.feature`](../features/advanced_collaboration.feature) | Issues, reviews, CI gates, operation log, memory/bundle transport, redaction plan, redaction events, and reusable conflict resolutions. |
| [`features/platform_core.feature`](../features/platform_core.feature) | Headless platform setup, optional Community enablement, deploy plans, approvals, and deployment execution. |
| [`features/platform_operations.feature`](../features/platform_operations.feature) | First-run readiness, backups, runners, secrets, deployment logs, incidents, rollback, AI plans, and Community moderation. |
| [`features/platform_product_domains.feature`](../features/platform_product_domains.feature) | RBAC-related identity, forge issues/reviews, packages, search, observability-adjacent dashboard output, Community social flows, and snapshots through exported state surfaces. |
| [`features/platform_enterprise_conformance.feature`](../features/platform_enterprise_conformance.feature) | SSO, SCIM, service accounts, API tokens, sessions, API correlation, webhooks, typed errors, audit, compliance, and tenant export/delete. |
| [`features/platform_infrastructure_delivery.feature`](../features/platform_infrastructure_delivery.feature) | Infrastructure targets, resources, templates, deployable discovery, dry-run/edit/cancel/promote, platform jobs, retries, reconciliation, and config validation. |
| [`features/platform_ai_operations_ha.feature`](../features/platform_ai_operations_ha.feature) | AI context redaction, tool guardrails, incident follow-up, support-style operations, backup verification, restore dry-run, HA profile, and failover drill. |
| [`features/platform_community_conformance.feature`](../features/platform_community_conformance.feature) | Public profile, showcase, topics, releases, follows, stars, bookmarks, discussions, reports, moderation queue, legal hold, and Community worker status. |
| [`features/platform_web.feature`](../features/platform_web.feature) | DOM-rendered operations console model with Community-enabled state. |
| [`features/platform_web_conformance.feature`](../features/platform_web_conformance.feature) | Mobile actions, home modules, admin sections, dense search/package data, and SDK-equivalent copy rendered through the web console. |
| [`features/platform_projects.feature`](../features/platform_projects.feature) | Separate Platform Web and Community Web app definitions plus Community API/Core/Web package interaction. |
