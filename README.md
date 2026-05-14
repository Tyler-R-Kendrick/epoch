# Epoch

Epoch is a TypeScript prototype for a signed, event-driven Distributed Version
Control System. It keeps the useful parts of Git, such as offline work and
content-addressed history, while experimenting with append-only intent events,
cryptographic author identity, deterministic policy, local sync, and
CRDT-backed shared state.

The repository is currently a research-friendly implementation split into a
Core SDK, Node CLI, WASM-safe exports, React integration helpers, an
`Epoch.Platform` foundation, and separate Epoch Community packages.
`Epoch.Platform.Core` and `Epoch.Platform.Sdk` provide the headless control
plane domain and SDK surfaces. `Epoch.Platform.Web` is the PWA hosting control
plane for deploying Epoch-related services. `Epoch.Community.Web` is the
GitHub-like community app that Platform Web can deploy and manage as a
separate service. Community behavior is split through
`Epoch.Community.API`, `Epoch.Community.Core`, `Epoch.Community.CLI`, and
`Epoch.Community.Web`. The full implemented feature list lives in the
[feature registry](docs/features.md).

## Why Epoch?

Epoch is for exploring repository workflows where:

- history should be auditable and tamper-evident by default;
- authorship is based on local Ed25519 identities instead of a central account
  system;
- proposed changes are represented as signed intent events;
- peers can exchange local repository state without requiring a forge; and
- applications and agents can use repository history as programmable state.

For the full architecture, see [Epoch Current Design](docs/design.md). For the
principles and research influences behind those choices, see
[Design Decisions and ADRs](docs/design-decisions/README.md).

## Quick Start

Install dependencies and build the workspace:

```bash
npm ci
npm run build
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

Create and inspect an intent:

```bash
npm exec -- epoch intent README.md --type text/plain --title "Update README"
npm exec -- epoch status
```

Use the Git-compatible CLI surface when integrating with tools that expect
Git-like commands:

```bash
npm exec -- epoch-git clone https://example.invalid/project.git ./project
```

See the [CLI Reference](docs/cli.md) for command coverage, installed-package
usage, and the relationship between `epoch`, `epoch-git`, and the long-form
Node commands.

## Documentation

Start with the [documentation index](docs/README.md). It links the repository's
architecture, SDK, CLI, feature, operations, design-decision, contribution, and
agent-facing references so the docs stay discoverable as the project grows.

High-value entry points:

| Topic | Link |
|---|---|
| Architecture | [docs/design.md](docs/design.md) |
| Samples | [samples/README.md](samples/README.md) |
| CLI usage | [docs/cli.md](docs/cli.md) |
| Core SDK, actor API, and React integration | [docs/sdk.md](docs/sdk.md) |
| Platform web apps | [docs/platforms.md](docs/platforms.md) |
| Create repo and version materialization proposal | [docs/create-repository-and-version-materialization.md](docs/create-repository-and-version-materialization.md) |
| Feature registry | [docs/features.md](docs/features.md) |
| Epoch.Platform product spec | [docs/epoch-platform-spec.md](docs/epoch-platform-spec.md) |
| Reusable spec template | [docs/spec-template-outline.md](docs/spec-template-outline.md) |
| Competition research | [docs/competition/README.md](docs/competition/README.md) |
| Design decisions and ADRs | [docs/design-decisions/README.md](docs/design-decisions/README.md) |
| User stories | [docs/user-stories.md](docs/user-stories.md) |
| HA/DR operations | [docs/HA-DR.md](docs/HA-DR.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Code of conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Security policy | [SECURITY.md](SECURITY.md) |
| Support | [SUPPORT.md](SUPPORT.md) |
| PR template | [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) |
| Issue templates | [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md), [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md) |

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
