# Epoch CLI Reference

Use the CLI for local repository operations, smoke tests, demos, and scripts
that operate on the filesystem.

## Build From Source

Install dependencies and build before running the source checkout CLI:

```bash
npm ci
npm run build
```

The workspace exposes package bins, so the short source-checkout form is:

```bash
npm exec -- epoch create ./repo --author alice
```

This is equivalent to the long-form Node host command:

```bash
node packages/Epoch.CLI/dist/cli.js --repo ./repo init --author alice
```

For a durable local shell alias while iterating in this checkout, link the root
package once:

```bash
npm link
epoch --repo ./repo verify
epoch-git status
```

Remove the global link with:

```bash
npm unlink -g epoch
```

When Epoch is installed as a package, use the installed `epoch`, `epoch-git`,
and `git-remote-epoch` binaries directly. `git-remote-epoch` speaks the Git
remote-helper protocol for `epoch://` remotes and fails closed for fetch/push
until an authenticated Epoch endpoint is configured.

## Global Options

| Option | Description |
|---|---|
| `--repo PATH` | Select the Epoch repository root. Defaults to the current working directory. |

## Repository Commands

| Command | Purpose |
|---|---|
| `create [PATH] --author NAME` | Create an empty signed repository at `PATH` or the selected repository root. |
| `init --author NAME` | Initialize `.epoch/` metadata and identity. |
| `push [PATH...] [--author NAME] [--version NAME] [--message TEXT] [--no-version]` | Open or create a repository, record existing assets, and create a signed version by default. |
| `record [--type MIME] PATH` | Record a file as an immutable event and blob. |
| `track [--type MIME] [--include-ignored] PATH` | Record a path explicitly, including ignored files when the override flag is supplied. |
| `forget PATH` | Stop tracking a path without deleting it from the workspace. |
| `mv FROM TO` | Move or rename a tracked path and record a signed `file.move` event. |
| `rm PATH` | Delete a tracked path from the workspace and record a signed `file.delete` event. |
| `cp FROM TO` | Copy a tracked path and record a signed `file.copy` event. |
| `events` | Print event IDs, types, and payloads. |
| `verify` | Verify signatures, DAG state, heads, blobs, and tamper evidence. |
| `sync PEER_REPO` | Bidirectional path gossip with a peer repository. |
| `sync --peer URL` | Bidirectional HTTP gossip with a peer (`POST /epoch/gossip`). |
| `gossip PEER_REPO` | Same as path `sync` (bidirectional local gossip). |
| `gossip --peer URL` | HTTP gossip exchange with a remote peer. |
| `gossip --serve [--port N]` | Serve HTTP gossip for this repository. |
| `publish-artifacts VERSION\|EVENT_ID` | Dual-write public version blobs to AT (`federated` mode only). |
| `rollback EVENT_ID` | Append a rollback event for an existing event. |
| `dr-plan` | Print the disaster recovery plan. |
| `op-log` | List signed operation events recorded by mutating CLI commands. |
| `op-show EVENT_ID` | Print one signed operation event projection as JSON. |

## Working Tree, Ignore, And Config Commands

Epoch has a native working-tree surface in the main `epoch` CLI. File lifecycle
commands are signed Epoch events, not only Git compatibility shims.

| Command | Purpose |
|---|---|
| `status [--ignored]` | Show tracked, modified, deleted, untracked, and optionally ignored workspace paths. |
| `check-ignore PATH` | Print the ignore file, line, pattern, and path when a path is ignored. |
| `config get KEY` | Read a TOML configuration value such as `working_tree.max_new_file_bytes`. |
| `config path [--scope local|shared]` | Print the local `.epoch/config.toml` or shared `epoch.toml` config path. |

Ignore discovery reads shared `.epochignore`, local `.epoch/info/exclude`, and
the optional `ignore.global_file` configured in TOML. Ignore rules affect
untracked discovery and `push` auto-capture; they do not silently untrack an
already recorded file. Use `track --include-ignored PATH` when an ignored file
must be recorded intentionally.

Repository configuration uses TOML. Local machine-specific settings belong in
`.epoch/config.toml`. Shared project policy can live in `epoch.toml` and be
recorded like any other file. The currently enforced working-tree setting is:

```toml
[working_tree]
max_new_file_bytes = 1048576
```

## Version Commands

Versions are signed manifest events for deployable files and optional CRDT
snapshots.

| Command | Purpose |
|---|---|
| `version create [NAME] [--view VIEW] [--entity NAME] [--description TEXT]` | Create a signed version from a view/frontier. |
| `versions` | List known versions by id, name, file count, and entity count. |
| `version show VERSION` | Print a version manifest. |
| `version materialize VERSION --out PATH [--base REF] [--force]` | Recreate version files, CRDT snapshots, and `epoch-version.json`. With `--base` write only files that differ from another version/view and add an `epoch-virtual.json` manifest. |

## Review And Policy Commands

| Command | Purpose |
|---|---|
| `intent PATH` | Create a signed proposed change event. |
| `merge INTENT_ID` | Sign an inclusion policy event. |
| `reject INTENT_ID` | Sign a rejection policy event. |
| `comment --intent INTENT_ID TEXT` | Add signed discussion metadata. |
| `issue --title TITLE BODY` | Create a signed issue-style collaboration object. |
| `review --state STATE --body TEXT INTENT_ID` | Record a signed review against an intent. |
| `ci-record --name NAME --status STATUS INTENT_ID` | Record a signed CI attestation against an intent. |
| `gate-status --review STATE --ci NAME INTENT_ID` | Project whether an intent satisfies local signed gate policy. |
| `status` | Show intent policy status. |
| `main` | Print accepted intent IDs. |

## Entity, Resolution, And Redaction Commands

| Command | Purpose |
|---|---|
| `resolve --type MIME [--path ENTITY_PATH] BASE LEFT RIGHT` | Merge values with the default media-aware entity adapters, reusing exact-match signed resolutions when `--path` is supplied. |
| `resolve --type MIME --path ENTITY_PATH --record-resolution RESOLVED BASE LEFT RIGHT` | Record a signed exact-match conflict resolution for future reuse. |
| `redact BLOB_SHA256 --reason REASON` | Append a signed redaction marker for a blob hash. |
| `redact-plan BLOB_SHA256` | Print affected events, local blob presence, and redaction status. |

## Named View Commands

Use views as deterministic logical workspaces over the shared event log.

| Command | Purpose |
|---|---|
| `view-create NAME --parent VIEW --rule JSON` | Create a named view. |
| `views` | List views and mark the current view. |
| `checkout [--materialization MODE] [--select EXPR] [--base REF] NAME` | Switch the current view and materialize its selected files. |
| `view-delete NAME` | Delete a view. |
| `view-diff LEFT RIGHT` | Show a JSON diff between views. |
| `view-promote SOURCE TARGET` | Promote accepted content from one view into another. |

## Selection And Materialization Commands

Two independent questions, two independent flags. **Selection** (`--select`,
or the persisted workspace selection) decides *which resources are relevant*.
**Materialization** (`--materialization`) decides *how they are realized*.

| Mode | Behavior |
|---|---|
| `eager` | Write every selected path. |
| `explicit` | Describe the selection and its promises; write nothing until `hydrate`. |
| `lazy` | Reserved for on-access hydration. No provider can do this yet, so it currently behaves like `explicit`. |
| `delta` | Write only selected paths whose blob differs from `--base`. |

`--virtual` and `--full` remain accepted as deprecated aliases for `delta` and
`eager`. What shipped as `--virtual` selects by *difference from a base*, which
is delta materialization, not sparse checkout (ADR-0041).

| Command | Purpose |
|---|---|
| `checkout --materialization delta [--base REF] NAME` | Write only files that differ from the base; leave the rest virtual. |
| `checkout --select 'apps/api + packages/contracts' NAME` | Check out one selection without persisting it. |
| `preview [--view VIEW] [--base REF] [--context N]` | Print the rolling aggregate unified diff without materializing files. |
| `hydrate [PATH...]` | Materialize still-virtual files (all, or the given paths) from the object store. |

`status` reports still-virtual paths with a `V` marker rather than as deletions.

### Workspace Selection

Selection is workspace-local state in `.epoch/selection.json`. It is never signed
history, so two people on one view can hold different selections.

| Command | Purpose |
|---|---|
| `workspace select show` | Print the expression, its digest, and what it resolves to. |
| `workspace select set EXPR` | Replace the workspace selection. |
| `workspace select add PATH...` | Union paths into the current selection. |
| `workspace select remove PATH...` | Subtract paths from the current selection. |
| `workspace select clear` | Select everything again. |
| `workspace select profile ID [EXPR]` | Define or print a named selection profile. |
| `workspace select index` | Build the sparse index: selected entries plus opaque unselected subtrees. |
| `workspace select explain PATH` | Say why a path is absent: excluded, promised, unauthorized, unavailable, or corrupt. |

The expression language is order-independent set algebra, deliberately not
gitignore syntax: `*` (all), `!` (none), `path` (recursive), `path::self` (one
level), `@profile`, and the `+`, `-`, `&` operators.

### Repository Composition

A Repository Link mounts another repository's exact Version at a path. Links are
read-only from the parent workspace and convey no authorization.

| Command | Purpose |
|---|---|
| `component link MOUNT [LINK_ID] --repository-id ID --version-id ID --namespace-root DIGEST [--source-path PATH]` | Record a link to an exact child Version. |
| `component list` / `component show LINK_ID` | Inspect current links. |
| `component retarget LINK_ID --version-id ID --namespace-root DIGEST` | Move a link to a different exact child Version. |
| `component remove LINK_ID` | Remove a link. |
| `component conflicts` | List concurrent retargets of one link, both sides preserved. |
| `component verify [--resolver PATH,...]` | Compose the namespace and report ownership plus unresolved links. |
| `component vendorize LINK_ID [--resolver PATH,...]` | Copy the child's files into owned paths and record provenance. |
| `component provenance` | List recorded vendorize provenance. |
| `component update-plan LAST UPSTREAM LOCAL` | Three-way merge plan for a vendored tree (JSON path→digest maps). |

Mounts may not collide or overlap, may not escape the namespace, may not collide
under case folding, and may not form a cycle — every one of those fails closed at
`component link` time rather than at checkout time. Links resolve through
injected resolvers and local sibling repositories; Core performs no network I/O.

## Git Commands

- `import [--version NAME] GIT_REPO` records tracked files from a Git repository into Epoch and can create a first version.
- `export GIT_REPO` writes latest recorded blobs into a Git repository
  directory.
- `epoch-git` provides a Git-like command surface for integrations that expect
  clone, add, commit, and status behavior.
- `epoch-git project --repo PATH [--rebuild]` projects Epoch content into a Git
  working tree with signed mapping events.
- `epoch-git serve --repo PATH [--port N]` starts the smart-HTTP Git façade
  (`@epoch/git-proxy`).
- `epoch-git mirror import|export|dual-run` runs live migration once against
  configured remotes (see [Git Live Migration Cutover](git-live-migration-cutover.md)).

Unsupported Git commands fail explicitly instead of pretending to be safe.

## Change Graph And Merge Commands

These commands persist signed repository events (`change.created`,
`change.revised`, `change-graph.defined`, `review.bundle.created`,
`merge.plan.created`, and related protocol types). The leftover
`.epoch/change-graph-v1.json` file is ignored and is not authoritative.
Local operation undo/restore stays in `.epoch/operations/`. Split proposals
and workspace handles remain local drafts until a protocol event exists for
them.

New object IDs are generated through the Protocol 256-bit lowercase-base32
canonical ID generator, whose CSPRNG is injectable for deterministic hosts and
tests. Only Protocol-declared kinds are emitted: a split proposal is an
Operation and a Review Bundle uses `review-bundle` identity. Exact Revision IDs are branded
signed event IDs; `epoch:revision:*` is not a valid canonical ID kind.

| Command group | Shipped operations |
|---|---|
| `new`, `change` | Create a revision from one or more explicit parents; create, revise, show, and diff a stable logical change. |
| `log --revisions REVSET` | Parse and evaluate the canonical browser-safe revset against the available revision graph. |
| `op` | Inspect the local operation DAG, undo an operation, or restore a prior local state. Operation history is local-only. |
| `graph` | Create, show, add, remove, order, restack, and submit dependency-ordered Changes. |
| `split` | Propose or inspect a JSON split plan, then accept/reject it. Accept reconstructs fragments and appends `split.accepted`. Empty plans auto-group one fragment per group. |
| `bundle` | Create, show, or materialize a Review Bundle bound to existing signed revision Event IDs. Digests hash the selected revision set. |
| `review record` | Record review evidence against an existing Change or Review Bundle. |
| `merge-plan` | Plan or apply a merge of existing signed revisions. Apply recomputes the selected-revision digest and refuses unresolved conflicts or a moved/missing set. |
| `conflict` | List/show durable conflicts, record a resolution, request a non-authoritative AI proposal, or accept/reject it. |

Revsets support `heads`, `roots`, `ancestors`, `descendants`, `change`,
`graph`, `conflicts`, `pending`, `approved`, `mergeable`, and `author`, with
union, intersection, difference, and parentheses. Parse errors are typed and
ordering is deterministic.

## Semantic Commands

Structural diff, patch, merge, and compression planning over the representation
ladder in [Semantic Content Pipeline](semantic-pipeline.md). A syntax provider
is selected from the file path; content with no matching provider is reported
rather than silently compared as lines.

| Command | Purpose |
|---|---|
| `semantic diff BEFORE AFTER [--json]` | Print a structural patch keyed by node path. `--json` emits the applicable patch document. |
| `semantic apply FILE PATCH.json` | Apply a structural patch to `FILE`, resolving paths against a fresh parse so a reformatted target still accepts it. |
| `semantic merge BASE LEFT RIGHT [--json]` | Three-way structural merge. Exits non-zero and reports path-scoped conflicts when the sides genuinely disagree. |
| `semantic plan FILE... [--json]` | Report syntax-guided chunk count, subtree-dedup savings, and the derived dictionary digest without encoding anything. |

`semantic merge` merges independent insertions into declared commutative
containers — object literals, dependency tables, import blocks — and produces
byte-identical output regardless of which side is `LEFT`.

## Extension Commands

External subcommands and capability providers, per
[Extensions And Capability Providers](extensions.md). `epoch NAME` runs
`epoch-NAME` from `.epoch/ext/bin`, `~/.epoch/ext/bin`, then `$PATH`, but only
when the `[extensions]` trust policy admits it.

| Command | Purpose |
|---|---|
| `ext list` | List discovered extensions with trust state, source, version, declared capabilities, and any builtin shadowing. |
| `ext show NAME` | Print one extension's manifest, resolution, and trust decision as JSON. |
| `ext trust NAME` | Record a signed operation consenting to an extension. |
| `ext untrust NAME` | Record a signed operation withdrawing that consent. |

Builtins always win over an extension of the same name, and `ext list` reports
the shadowing rather than hiding it. An extension that is installed but not
trusted is reported and refused, never run silently.

## Storage, Interop, And Authority Commands

| Command group | Shipped operations and limitations |
|---|---|
| `workspace` | Create, list, inspect, capture, and safely remove memory/filesystem/browser workspaces. Providers report actual residency, materialization, storage, and execution modes. |
| `clone`, `fetch`, `hydrate`, `backfill` | Local Epoch replicas use `syncFrom`. HTTP locators use Epoch gossip. Git locators (`git@`, `ssh://`, `*.git`, `file:`) clone with Git and ingest. Named remotes resolve through `.epoch/remotes-v1.json`. |
| `mirror` | Add, list, inspect, and record a run for a signed mirror definition. Credentials stay opaque; no hosted forge transport is implied. |
| `principal`, `agent` | Inspect capabilities, allocate/status signed budget units, and explain authorization. Missing grants deny. |
| `forge` | Inspect capabilities and import/export public records through loss-aware codecs. ForgeFed transport is `none`. |
| `swhid` | Inspect, compute, and verify SWHIDs locally. |
| `archive` | `archive software-heritage map` records a local SWHID mapping. `request` submits through Save Code Now HTTP (`EPOCH_SWH_SAVE_URL` overrides the endpoint) and records the signed status. Private origins are denied. |
| `interop doctor` | Probe Git/protocol, optional jj/hg/Rift commands, CoW support, adapter manifests, and SWHID support without printing credentials. |

## Community And Interface Commands

`epoch` is the canonical binary for Community work. `epoch community …`
delegates to the Community CLI implementation; `epoch ui …` and `epoch view …`
route into the `@epoch/community-runtime` command bus. `epoch-community` remains
as a compatibility binary over the same code.

| Command | Behavior |
|---|---|
| `community …` | Repositories, issues, change proposals, reviews, graph, bundle, and merge preview against a Community remote. The remote comes from `--remote URL`, then `EPOCH_COMMUNITY_URL`; `help` works before either is set. |
| `ui status` / `ui verify` | Workspace identity, active view, proposal count, recovery state, and harness release verification. |
| `view create NAME` / `view list` / `view switch VIEW` | Named views. `view create` records the base view and revision it was taken from, and accepts `--scope personal\|project\|session`. |
| `ui log [VIEW]` / `ui show VIEW REVISION` | Revision ledger and one revision with its provenance. |
| `ui propose VIEW --manifest JSON` | Record a dynamic UI manifest as a new revision. `--prompt` is stored as a digest unless `--retain-prompt` is passed; `--model` records the generator. |
| `ui preview [VIEW]` / `ui diff FROM [--into VIEW]` / `ui validate VIEW` | What the harness would render, the semantic diff, and harness validation errors. |
| `ui merge FROM [--into VIEW]` | Promote a validated view and advance last-known-good. Requires `--confirm`. |
| `ui rollback VIEW --revision N` / `ui restore` | Append a revision restoring an earlier manifest, or the last known good one. History is never rewritten. Requires `--confirm`. |
| `ui export [--out FILE]` / `ui import FILE` | Move a workspace between participants as a bundle of events. Import skips what is already there and is refused if the bundle's digest does not match its events. Import requires `--confirm`. |
| `ui safe-mode on\|off` | Boot the installed harness only, ignoring the dynamic head. Leaving safe mode requires `--confirm`. |

The workspace persists under `<repo>/.epoch/ui-workspace.json`. `--json` prints
the command receipt verbatim — the same record the browser UI and a WebMCP tool
receive, including `commandId`, policy decision, validation state, and event ids.
A consequential command without `--confirm` returns a `confirm` receipt, changes
nothing, and exits non-zero. See
[Community Web As An Epoch Participant](community-web-epoch-integration.md).

`--json` output is deterministic. Stable error codes are `invalid-command`,
`invalid-input`, `not-found`, `stale-revision`, `auth-denied`,
`unsupported-capability`, `conflict`, and `external-error`. Authoritative or
destructive operations require the same validation in text and JSON modes.

## Related Docs

- [Core SDK Reference](sdk.md)
- [Community Web As An Epoch Participant](community-web-epoch-integration.md)
- [Feature Registry](features.md)
- [Current Design](design.md)
- [Epoch Nomenclature](nomenclature.md)
- [Change Graph And Operation History](change-graph.md)
- [Object Resolver And Native Sync](resolver-sync.md)
- [Workspace Providers](workspace-providers.md)
- [Forge Adapters](forge-adapters.md)
- [Extensions And Capability Providers](extensions.md)
- [Semantic Content Pipeline](semantic-pipeline.md)
