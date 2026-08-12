# Epoch

Epoch is a signed, event-driven Distributed Version Control System — a
successor to Git, prototyped in TypeScript. It keeps the useful parts of Git,
such as offline work and content-addressed history, while adding stable logical
Changes, immutable signed Revisions, cryptographic principal identity,
deterministic policy, local sync, and CRDT-backed shared state.

**Epoch.Community.Web is to Epoch what GitHub is to Git**: the community
experience built on the DVCS. It is the central place where an open-source
community follows the work of the people and projects it cares about, where
maintainers manage signed Changes and Review Bundles, and where members engage
each other — messaging, questions, decisions, showcases — in the same context
as the work itself. Its participants include professional developers, citizen
builders building in the open, and agents committing concurrently under human
oversight. Every so often the community's work is materialized into an
**epoch** — a point-in-time snapshot of the project, credited to everyone who
took part — which gives the product its name. Epoch is the link that makes all
of it trustworthy; the sample projects that appear in documentation and designs
are placeholders and can be swapped at any time.

The repository is currently a research-friendly implementation split into a
Core SDK, Node CLI, WASM-safe exports, browser integration adapters, an
`Epoch.Platform` foundation, and separate Epoch Community packages.
`Epoch.Platform.Core` and `Epoch.Platform.Sdk` provide the headless control
plane domain and SDK surfaces. `Epoch.Platform.Web` is the PWA hosting control
plane for deploying Epoch-related services. `Epoch.Community.Web` is the
GitHub-like community app that Platform Web can deploy and manage as a
separate service. Its canonical UI is Nightboard: the CanvasUI-powered creator
landing at `/` and the tmux-style, keyboard-first board at `/board.html`.
Community behavior is split through
`Epoch.Community.API`, `Epoch.Community.Core`, `Epoch.Community.CLI`, and
`Epoch.Community.Web`. `Epoch.Community.Operations.Web` is a separate
Coolify-inspired deployable extension for sandbox workspaces, project hosting,
workflow, runner, and agent-sandbox operations over Platform SDK/Core state.
The full implemented
feature list lives in the
[feature registry](docs/features.md).

## Why Epoch?

Developers already talk about their work everywhere except where the work
lives: chat on Discord or Slack, announcements on X, questions that used to go
to Stack Overflow, long-form on Reddit. GitHub suits none of those
interactions, and it makes following a person's in-progress work, welcoming
non-code contributors, or celebrating a release as a community milestone harder
than it should be. Epoch exists to bring those disparate interactions into one
community home built around the project itself.

Epoch itself supports repository workflows where:

- history should be auditable and tamper-evident by default;
- authorship is based on local Ed25519 identities instead of a central account
  system;
- logical Changes retain stable identity across immutable signed Revisions;
- peers can exchange local repository state without requiring a forge; and
- applications and agents can use repository history as programmable state.

The Change Graph surface adds stable logical Changes and immutable signed
Revisions, dependency graphs, exact review/merge evidence, durable conflicts,
verified metadata-only storage, native `epoch.sync/v2`, deterministic Git
projection, loss-aware forge codecs, attenuated agent authority, and SWHIDs.
These are explicit bounded contracts: Epoch does not claim a native
Eden/Pijul/F3 server or a full Git/forge transport where one is not shipped.

For the full architecture, see [Epoch Current Design](docs/design.md). For the
principles and research influences behind those choices, see
[Design Decisions and ADRs](docs/design-decisions/README.md).

## Quick Start

Install dependencies and build the workspace:

```bash
npm ci
npm run build
```

Run the canonical Community app locally:

```bash
npm run dev:community-web
# Landing: http://127.0.0.1:8787/
# Board:   http://127.0.0.1:8787/board.html
```

Run the CLI from the source checkout with the package bin shorthand:

```bash
npm exec -- epoch create --author alice
npm exec -- epoch record README.md --type text/plain
npm exec -- epoch events
npm exec -- epoch verify
```

The long-form source command still works after building:

```bash
node packages/Epoch.CLI/dist/cli.js verify
```

For a durable local `epoch` and `epoch-git` shell alias while working in this
checkout, link the package once from the repository root:

```bash
npm link
epoch verify
```

Use `npm unlink -g epoch` when you want to remove the global link.

## Common Workflows

Sync two local repositories:

```bash
npm exec -- epoch --repo ./peer-a sync ./peer-b
```

Push existing assets and materialize a signed version:

```bash
npm exec -- epoch push dist --author alice --version initial-site
npm exec -- epoch version materialize initial-site --out deploy
```

Create a Change and put its exact Revision in a Change Graph:

```bash
npm exec -- epoch change create "Update README"
npm exec -- epoch graph create docs-update <revision-id>
```

Track working-tree lifecycle changes natively:

```bash
npm exec -- epoch mv docs/old.md docs/new.md
npm exec -- epoch check-ignore dist/app.js
npm exec -- epoch config get working_tree.max_new_file_bytes
```

Use the Git-compatible CLI surface when integrating with tools that expect
Git-like commands:

```bash
npm exec -- epoch-git clone https://example.invalid/project.git ./project
```

Embed Epoch in a browser app with explicit generated-UI tracking:

```ts
import { trackGeneratedUiChange } from "@epoch/gen-ui";
import { createBrowserEpoch } from "@epoch/integration-core";

const epoch = createBrowserEpoch({ namespace: "demo", author: "agent" });

trackGeneratedUiChange(epoch, {
  entity: "dashboard",
  source: "prompt",
  summary: "add revenue card",
  renderer: "json-render",
  components: [{ id: "component:revenue", spec: { label: "Revenue" } }],
});
```

See the [CLI Reference](docs/cli.md) for command coverage, installed-package
usage, and the relationship between `epoch`, `epoch-git`, and the long-form
Node commands.

## Documentation

Start with the [documentation index](docs/README.md). It links the repository's
architecture, SDK, CLI, feature, operations, design-decision, contribution, and
agent-facing references so the docs stay discoverable as the project grows.
The [visual design system](DESIGN.md) defines the current Epoch Community
interface tokens and component vocabulary.

High-value entry points:

| Topic | Link |
|---|---|
| Architecture | [docs/design.md](docs/design.md) |
| Change Graph and operation history | [docs/change-graph.md](docs/change-graph.md) |
| Canonical terminology | [docs/nomenclature.md](docs/nomenclature.md) |
| Object resolution and native sync | [docs/resolver-sync.md](docs/resolver-sync.md) |
| Workspace providers | [docs/workspace-providers.md](docs/workspace-providers.md) |
| Forge adapters and mirror authority | [docs/forge-adapters.md](docs/forge-adapters.md) |
| Visual design system | [DESIGN.md](DESIGN.md) |
| Samples | [samples/README.md](samples/README.md) |
| Notebooks | [notebooks/README.md](notebooks/README.md) |
| CLI usage | [docs/cli.md](docs/cli.md) |
| Core SDK, actor API, and React integration | [docs/sdk.md](docs/sdk.md) |
| Platform web apps | [docs/platforms.md](docs/platforms.md) |
| Community Web experience | [docs/community-web-experience.md](docs/community-web-experience.md) |
| Nightboard navigation/projection parity | [docs/evidence/nightboard-navigation-projection-parity/README.md](docs/evidence/nightboard-navigation-projection-parity/README.md) |
| Community Operations extension | [docs/community-operations.md](docs/community-operations.md) |
| Create repo and version materialization proposal | [docs/create-repository-and-version-materialization.md](docs/create-repository-and-version-materialization.md) |
| Feature registry | [docs/features.md](docs/features.md) |
| Executable feature scenario inventory | [docs/feature-scenario-inventory.md](docs/feature-scenario-inventory.md) |
| Epoch.Platform product spec | [docs/epoch-platform-spec.md](docs/epoch-platform-spec.md) |
| Community human-centered design | [docs/community-human-centered-design.md](docs/community-human-centered-design.md) |
| Persona feature matrix | [docs/persona-feature-matrix.md](docs/persona-feature-matrix.md) |
| Reusable spec template | [docs/spec-template-outline.md](docs/spec-template-outline.md) |
| Competition research | [docs/competition/README.md](docs/competition/README.md) |
| Design decisions and ADRs | [docs/design-decisions/README.md](docs/design-decisions/README.md) |
| User stories | [docs/user-stories.md](docs/user-stories.md) |
| HA/DR operations | [docs/HA-DR.md](docs/HA-DR.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Developer experience (DX) baseline | [DX.md](DX.md) |
| Code of conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Security policy | [SECURITY.md](SECURITY.md) |
| Support | [SUPPORT.md](SUPPORT.md) |
| PR template | [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) |
| Issue templates | [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md), [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md) |
| Gauntlet Loop agent skill | [skills/gauntlet-loop/README.md](skills/gauntlet-loop/README.md) |
| OptimizeXP agent skill | [skills/optimizexp/SKILL.md](skills/optimizexp/SKILL.md) |
| SDLC agent skill | [skills/sdlc/SKILL.md](skills/sdlc/SKILL.md) |

## Contributing

This repository expects small, well-tested changes. Before opening a pull
request, run the local quality gate:

```bash
npm run verify
```

Behavior changes should start with a failing feature scenario or focused test,
then preserve or improve coverage. Documentation changes are part of the same
work: use the [Documentation Freshness Policy](docs/documentation-freshness.md)
to update the README, docs index, ADRs, feature registry, and skill references
when their surfaces change. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[AGENTS.md](AGENTS.md) for the full workflow.

## License

Epoch is licensed under the [MIT License](LICENSE).
