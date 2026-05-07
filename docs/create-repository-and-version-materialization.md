# Create Repository And Version Materialization Spec

Status: Implemented

This spec records the implemented direction for making Epoch repository
creation and deployable asset versioning simpler for users. It is intentionally
user-scenario first.

## Executive Summary

Problem statement: Epoch can initialize repositories and record signed assets
today, but the user story still feels like a storage API. Users who already have
assets, browser bundles, datasets, documents, or generated agent state should be
able to make an Epoch repository in one step, and deployed assets need a
first-class version they can materialize later without reconstructing a workflow.

Proposed solution: Add a small repository creation layer on top of the existing
event log: `create` for empty repositories, `push` for "assets already exist,
make a repo and capture them", and signed `version` events that bind a
materialized view/frontier to a manifest of deployable content.

Success criteria:

- A new user can create an empty repository with one CLI command and one SDK
  call without learning events, blobs, views, or intent policy.
- A folder of existing assets can become an Epoch repository and produce its
  first named version in one command.
- Every deployable version has a signed manifest that records the exact event
  frontier, content blobs, materialized CRDT snapshots, and metadata needed to
  reproduce it.
- Version materialization is deterministic: materializing the same version into
  a clean directory yields the same files and manifest every time.
- Errors explain the user action to take next and avoid assuming Git expertise.

## Product Context

The repository's competition notes point to a consistent adoption lesson:
powerful version-control systems lose users when repository state is hard to
see, setup vocabulary appears before value, or recovery depends on expert Git
knowledge.

Competitive complaint themes to design against:

- GitHub: repository pages and source download/clone affordances can overload
  non-expert users with developer concepts.
- Graphite: stacked workflow value can be delayed by setup, authentication,
  branch naming, metadata, and sync concepts.
- Jujutsu: advanced local ergonomics are compelling, but Git compatibility edge
  cases and review-system mapping can surprise teams.
- Pijul: advanced merge theory is not enough if users worry about maturity,
  performance, clone bugs, or reset surprises.
- Radicle: peer-to-peer ownership is appealing, but users need clear answers
  for persistence, seeding, and what happens when peers are offline.
- Sapling: a clear mental model of repository state can be a differentiator,
  especially when the graph/status view names what is pending, accepted, and
  synced.

Epoch's create/version story should therefore optimize for immediate value,
plain language, explicit state summaries, reproducible versions, and escape
hatches for expert APIs.

## Personas

Asset-first creator: Has a directory of images, generated site output, prompts,
datasets, or design exports and wants to turn it into an auditable repository
without planning repository structure first.

Application developer: Wants one SDK call to create a repository, then store
application state or files as signed history.

Deployment operator: Needs each deployed asset set to have a durable version
identifier, manifest, and materialization path for rollback and audit.

Agent developer: Wants agents to create repositories, push generated artifacts,
and attach versions without making the agent reason through low-level event
storage.

Integrator: Wants to import from Git or another tool, produce a first Epoch
version, and keep the migration path reversible.

Offline collaborator: Wants a repo and version manifest that can be exchanged
or restored through local sync/seed workflows without central forge assumptions.

## User Stories

### CRV-001: Create An Empty Repository Fast

As a developer, I want one command or one SDK call to create an empty signed
repository so that I can start with Epoch without learning the event model.

CLI:

```bash
epoch create ./repo --author alice
```

SDK:

```ts
const repository = await EpochRepository.create("./repo", { author: "alice" });
```

Acceptance criteria:

- Creates the same `.epoch/` metadata and Ed25519 identity that `init` creates
  today.
- Succeeds without requiring any assets.
- Prints a short state summary: repository path, author, event count, and next
  useful commands.
- Keeps `epoch init` and `repository.init()` as compatibility aliases.

### CRV-002: Push Assets To Create A Repository

As an asset-first creator, I want to point Epoch at an existing directory so
that it creates a repository, records the assets, and gives me a first version.

CLI:

```bash
cd ./dist
epoch push . --author alice --version initial-site
```

Acceptance criteria:

- If `.epoch/` does not exist, Epoch creates it automatically.
- Recursively records included files under the repository root and skips
  `.epoch/`, `.git/`, `node_modules/`, and files outside the root.
- Creates a signed `version` event by default unless `--no-version` is passed;
  `--version` supplies a friendly name for that event.
- Prints the version id and a concise manifest summary.
- Running the command again with unchanged assets is idempotent or reports that
  no new content was recorded.

### CRV-003: Create A Version From The Current Repository

As a deployment operator, I want to create a named version from the current
repository state so that a deployment can reference a stable signed artifact
set.

CLI:

```bash
epoch version create release-2026-05-06
```

SDK:

```ts
const version = await repository.createVersion({
  name: "release-2026-05-06",
  description: "Static site deployment",
});
```

Acceptance criteria:

- A version is a signed event, not only a mutable local registry entry.
- The version payload references the event frontier used to compute it.
- The version manifest lists materialized files with path, MIME type, blob hash,
  size, and source event id.
- Optional CRDT materializations are written as content-addressed snapshot blobs
  and referenced from the same manifest.
- Version names are friendly aliases; the event id remains the durable identity.

### CRV-004: Materialize A Version

As a user recovering or deploying assets, I want to materialize a version into a
clean directory so that the deployed content can be reproduced exactly.

CLI:

```bash
epoch version materialize release-2026-05-06 --out ./deploy
```

SDK:

```ts
await repository.materializeVersion("release-2026-05-06", {
  outDir: "./deploy",
});
```

Acceptance criteria:

- Resolves a version by id or unambiguous name.
- Refuses to overwrite non-empty output unless `--force` is provided.
- Writes files exactly as recorded in the version manifest.
- Writes a small manifest file next to the output, such as
  `epoch-version.json`, so deployment systems can report the version id.
- Verification checks signatures, frontier membership, referenced blobs, and
  materialized output hashes.

### CRV-005: Version Browser Or Agent State

As an application or agent developer, I want CRDT-backed state to become a
versioned materialization so that deployed state can be audited just like files.

Acceptance criteria:

- `createVersion()` can include named CRDT entities.
- CRDT snapshots are deterministic for the selected frontier.
- Snapshot blobs include entity name, content type, and source CRDT event ids.
- Materialization can write snapshots as JSON files or return them through the
  SDK without requiring filesystem output in WASM-safe hosts.

### CRV-006: Import Existing Git Assets And Version Them

As an integrator, I want to import tracked Git files and produce an Epoch
version in one flow so that migration does not require a separate conceptual
step.

CLI:

```bash
epoch create ./repo --author alice
epoch import ./git-repo --version imported-main
```

Acceptance criteria:

- `import --version NAME` records imported files and creates a version from the
  imported frontier.
- Git import remains explicit about trusting host Git state.
- The version manifest points to Epoch record events, not directly to Git
  object ids.

### CRV-007: Explain State After Every Create Or Push

As a user, I want Epoch to explain what exists now so that I can recover without
learning the internals first.

Acceptance criteria:

- `create`, `push`, and `version create` print the repository path, event count,
  current heads, created version id, and suggested next commands.
- Error messages name the failed action in user terms, such as "could not
  create repository" or "version materialization would overwrite files".
- Expert details such as event ids and blob hashes remain available through
  `events`, `versions`, and `version show`.

## Data Model

Add `version` as a new event type.

Payload shape:

```json
{
  "name": "release-2026-05-06",
  "description": "Static site deployment",
  "view": "main",
  "frontier": ["event-id-1", "event-id-2"],
  "files": [
    {
      "path": "index.html",
      "entity_type": "text/html",
      "blob_sha256": "64-hex",
      "size": 1024,
      "source_event": "record-event-id"
    }
  ],
  "entities": [
    {
      "name": "tasks",
      "entity_type": "application/json",
      "blob_sha256": "64-hex",
      "size": 128,
      "source_events": ["crdt-event-id"]
    }
  ],
  "metadata": {
    "labels": ["deployable"]
  }
}
```

Design rules:

- The version event id is the durable version id.
- Friendly names are optional and must resolve unambiguously within the local
  event log.
- The version event parents should be the repository heads used for the
  materialization.
- Version manifests should be derived from existing record/CRDT events. They
  should not copy file bytes into a second storage system.
- Versions are independent from HA/DR compacts. A compact may later include or
  accelerate version recovery, but creating a version should not require
  compaction.

## CLI Surface

| Command | Purpose |
|---|---|
| `epoch create [PATH] [--author NAME]` | Create an empty repository at `PATH` or the current directory. |
| `epoch push [PATH...] [--author NAME] [--version NAME] [--message TEXT] [--no-version]` | Open or create a repository, record existing assets, and optionally create a version. |
| `epoch version create [NAME] [--view NAME] [--entity NAME] [--description TEXT]` | Create a signed version event from a view/frontier. |
| `epoch versions` | List known versions by name, id, file count, and entity count. |
| `epoch version show VERSION` | Show a version manifest. |
| `epoch version materialize VERSION --out PATH [--force]` | Recreate the files and snapshots described by a version. |

CLI design notes:

- Keep `init` as an alias for `create` to preserve current users.
- Keep `record` for expert single-file event workflows.
- Make `push` the asset-first workflow and avoid requiring users to understand
  "record event" before they see value.
- Use `version show` and `events` when agents, scripts, and CI need event ids,
  blob hashes, or full manifests.

## SDK Surface

```ts
const repository = await EpochRepository.create("./repo", {
  author: "alice",
});

const assetRepository = await EpochRepository.openOrCreate("./dist", {
  author: "alice",
});

const result = await assetRepository.push(["."], {
  version: "initial-site",
  message: "Initial static site",
});

const version = await repository.createVersion({
  name: "release-2026-05-06",
  view: "main",
  entities: ["tasks"],
});

await repository.materializeVersion(version.id, {
  outDir: "./deploy",
});
```

SDK design notes:

- The public convenience methods should delegate to small core functions so
  tests can cover planning, version creation, and materialization separately.
- Existing synchronous repository methods can remain, but new user-facing
  helpers should be designed so async adapters and browser-safe surfaces are
  straightforward.
- WASM-safe materialization should support returning an in-memory manifest and
  file/snapshot buffers instead of requiring native filesystem writes.

## Implementation Notes

- Executable scenarios live in `features/repository.feature`.
- `version` event constants and schemas live in `packages/Epoch.Core/src/domain.ts`.
- Repository creation, asset push, version creation, lookup, and materialization
  live on `EpochRepository`.
- CLI commands are implemented in `packages/Epoch.CLI/src/cli.ts`.
- Public behavior is indexed from `docs/features.md`, `docs/cli.md`,
  `docs/sdk.md`, `docs/user-stories.md`, and `skills/epoch/`.

## Acceptance Scenario Drafts

These scenarios should become executable feature coverage during
implementation.

```gherkin
Scenario: Create an empty repository with one command
  Given a new workspace
  When I create an Epoch repository as "alice"
  Then the repository verifies successfully
  And the event log contains 0 events
  And the repository identity uses Ed25519 keys

Scenario: Push assets to create a repository and first version
  Given a workspace containing "dist/index.html" with content "<h1>Hello</h1>\n"
  When I push "dist" into a new Epoch repository as "alice" versioned "initial-site"
  Then the repository verifies successfully
  And the event log contains record events for "dist/index.html"
  And the latest version is named "initial-site"
  And the version manifest includes "dist/index.html"

Scenario: Materialize a version into a clean directory
  Given an Epoch repository with a version named "initial-site"
  When I materialize version "initial-site" into "deploy"
  Then "deploy/dist/index.html" contains "<h1>Hello</h1>\n"
  And "deploy/epoch-version.json" references the version id

Scenario: Refuse to overwrite materialized output by default
  Given an Epoch repository with a version named "initial-site"
  And output directory "deploy" already contains "keep.txt"
  When I try to materialize version "initial-site" into "deploy"
  Then materialization fails with "would overwrite files"

Scenario: Version CRDT state as a deployable snapshot
  Given a new Epoch repository initialized as "alice"
  And CRDT entity "tasks" has converged state
  When I create version "agent-state" including entity "tasks"
  Then the version manifest includes entity "tasks"
  And materializing version "agent-state" writes a deterministic JSON snapshot
```

## Risks And Mitigations

Risk: `push` sounds like network publication to Git users.
Mitigation: Document it as "push assets into Epoch history" and keep network
sync separate until a remote story exists. If user testing shows confusion,
make `epoch capture` the primary command and keep `push` as an alias.

Risk: Version names can collide after sync.
Mitigation: Treat event id as canonical, detect ambiguous names, and require an
id or disambiguation flag when names collide.

Risk: Materialization could accidentally overwrite user files.
Mitigation: Require empty output directories by default, support `--force`, and
include a dry-run summary before destructive writes if the implementation later
adds interactive prompts.

Risk: Version manifests could become expensive for large repositories.
Mitigation: Start with full manifests for correctness. Revisit chunked manifests
or compact integration only after benchmarks show a real bottleneck.

Risk: Convenience APIs could hide security-sensitive verification.
Mitigation: Keep all convenience flows signing normal events, reusing
content-addressed blobs, and running verification checks on referenced data.

## Non-Goals

- Network remotes, hosted forge behavior, access control, and account systems.
- SemVer package management or dependency resolution.
- Replacing named views, intent policy, compacts, or Git import/export.
- Hiding event ids, signatures, or blob hashes from expert users.
- Making WASM hosts pretend they have native filesystem materialization.

## Open Questions For Implementation

- Should the primary asset-first command be `push`, `capture`, or both with one
  documented as preferred after user testing?
- What generated version name should `push` use when the user does not pass
  `--version`?
- Should version materialization preserve file modes and timestamps once Epoch
  supports them, or keep content-only reproducibility as the first contract?
- Should version names be globally unique within a repository by policy, or
  should collisions be allowed and resolved by id?
