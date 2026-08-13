# Epoch CLI Reference

Use the CLI for local repository operations, smoke tests, demos, and scripts that operate on the filesystem.

## Build and run

Build before using the source checkout CLI:

```bash
npm run build
npm exec -- epoch --repo ./repo init --author alice
```

The equivalent long-form source host is `node packages/Epoch.CLI/dist/cli.js`.
When installed as a package, use `epoch` and `epoch-git` binaries.

See the public [CLI docs](../../../docs/cli.md) for local linking and command details.

## Global options

| Option | Description |
|---|---|
| `--repo PATH` | Select the Epoch repository root. Defaults to the current working directory. |

## Repository commands

| Command | Purpose |
|---|---|
| `create [PATH] --author NAME` | Create an empty signed repository. |
| `init --author NAME` | Initialize `.epoch/` metadata and identity. |
| `push [PATH...] [--author NAME] [--version NAME]` | Open or create a repository, record existing assets, and create a signed version by default. |
| `record [--type MIME] PATH` | Record a file as an immutable event and blob. |
| `events` | Print event IDs, types, and payloads. |
| `verify` | Verify signatures, DAG state, heads, blobs, and tamper evidence. |
| `sync PEER_REPO` | Copy missing events and blobs from a peer repository. |
| `rollback EVENT_ID` | Append a rollback event for an existing event. |
| `dr-plan` | Print the disaster recovery plan. |
| `op-log` | List signed operation events recorded by mutating CLI commands. |
| `op-show EVENT_ID` | Print one signed operation event projection as JSON. |

## Version commands

| Command | Purpose |
|---|---|
| `version create [NAME] [--view VIEW] [--entity NAME]` | Create a signed version manifest. |
| `versions` | List known versions. |
| `version show VERSION` | Print a version manifest. |
| `version materialize VERSION --out PATH [--base REF] [--force]` | Recreate version files, snapshots, and `epoch-version.json`; `--base` writes only changed files plus `epoch-virtual.json`. |

## Review and policy commands

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

## Entity, resolution, and redaction commands

| Command | Purpose |
|---|---|
| `resolve --type MIME [--path ENTITY_PATH] BASE LEFT RIGHT` | Merge values with media-aware entity adapters and reuse exact signed resolutions when possible. |
| `resolve --type MIME --path ENTITY_PATH --record-resolution RESOLVED BASE LEFT RIGHT` | Record a signed exact-match conflict resolution. |
| `redact BLOB_SHA256 --reason REASON` | Append a signed redaction marker for a blob hash. |
| `redact-plan BLOB_SHA256` | Print affected events, local blob presence, and redaction status. |

## Named view commands

Use views as deterministic logical workspaces over the shared event log.

| Command | Purpose |
|---|---|
| `view-create NAME --parent VIEW --rule JSON` | Create a named view. |
| `views` | List views and mark the current view. |
| `checkout [--virtual\|--full] [--base REF] NAME` | Switch the current view and materialize its files. |
| `view-delete NAME` | Delete a view. |
| `view-diff LEFT RIGHT` | Show a JSON diff between views. |
| `view-promote SOURCE TARGET` | Promote accepted content from one view into another. |

## Virtual working tree commands

`init` defaults `[working_tree] materialization` to `virtual`, so `checkout`
writes only the files a view changes and records `.epoch/checkout.json` plus a
rolling `.epoch/patches/<hash>.patch` (regenerable caches, excluded from `verify`).

| Command | Purpose |
|---|---|
| `checkout --virtual [--base REF] NAME` | Sparse checkout: write only changed files; leave the rest virtual. |
| `checkout --full NAME` | Materialize the whole working tree. |
| `preview [--view VIEW] [--base REF] [--context N]` | Print the rolling aggregate diff without materializing. |
| `hydrate [PATH...]` | Materialize still-virtual files from the object store. |

## Git commands

- `import GIT_REPO` records tracked files from a Git repository into Epoch.
- `export GIT_REPO` writes latest recorded blobs into a Git repository directory.
- `epoch-git` provides a Git-like command surface for integrations that expect clone/add/commit/status behavior.

Unsupported Git commands fail explicitly instead of pretending to be safe.

## Change Graph commands

- `new`, `change create|revise|show|diff`, and `log --revisions REVSET` operate
  on stable changes/revisions using the canonical revset parser.
- `op`, `graph`, `split`, `bundle`, `review record`, `merge-plan`, and
  `conflict` expose local operation recovery, dependency graphs, exact split,
  exact review/merge, and durable resolution workflows.
- `workspace`, `clone`, `fetch`, `hydrate`, and `backfill` sync local Epoch
  replicas, HTTP gossip peers, and Git locators, then hydrate or report
  promised objects. Named remotes persist in `.epoch/remotes-v1.json`.
- `mirror`, `principal`, `agent`, `forge`, `swhid`, `archive`, and
  `interop doctor` inspect interop and authority without printing credentials.
  `archive software-heritage request` submits public HTTPS origins through
  Save Code Now HTTP.

Change Graph commands persist signed protocol events. A leftover
`.epoch/change-graph-v1.json` file is ignored.
JSON failures use stable codes including `invalid-input`, `stale-revision`,
`auth-denied`, `unsupported-capability`, and `conflict`. See the
[public CLI reference](../../../docs/cli.md) for exact subcommands and limits.

## Community search and namespace commands

`epoch-community` is a separate binary. It uses the same Core Search
Expression, planner, snapshot, Projection Definition compiler, and Namespace
runtime as GraphQL and Nightboard. Mutating and search commands need
`EPOCH_COMMUNITY_API_URL`; `help` works without it. An optional
`EPOCH_COMMUNITY_API_TOKEN` is sent only as an authorization header.

| Command | Purpose |
|---|---|
| `search --query QUERY [--json] [--first N] [--after CURSOR]` | Run deterministic cross-source search and report snapshot/completeness. |
| `search --graphql FILE [--variables FILE]` | Execute the portable structured GraphQL boundary. |
| `search explain --query QUERY` | Show normalization, source pushdown, residual evaluation, authorization, order, and omissions. |
| `projections list\|show ID` | Inspect Projection Definitions. |
| `projections validate FILE` | Compile versioned JSON with pointer diagnostics and cost/fanout limits. |
| `projections preview FILE [--path PATH]` | Lazily preview authorized Projection Entries. |
| `projections save FILE` / `delete ID` | Persist or remove a definition; saving invalid JSON fails closed. |
| `projections clone builtin:default NEW_ID` | Create an editable definition from the built-in hierarchy. |
| `namespace mounts` | List scoped Namespace Mounts in effective order. |
| `namespace mount PROJECTION PATH --mode MODE --scope SCOPE` | Compose a definition by explicit `replace`, `before`, or `after`. |
| `namespace unmount MOUNT_ID` / `reset --scope SCOPE` | Remove a mount or restore the built-in root while preserving quarantined definitions. |
| `namespace ls PATH [--first N] [--after CURSOR]` | List one lazy keyset page. |
| `namespace explain PATH` | Show mount precedence, winning entry, shadows, collisions, and freshness. |

Exit codes distinguish invalid query, authorization denial, partial source,
stale cursor, unavailable backend, and internal failure. JSON envelopes use
stable typed codes such as `QUERY_SYNTAX`, `CURSOR_STALE`, `PROJECTION_INVALID`,
and `NAMESPACE_RECOVERY_PROTECTED`. Query content is excluded from error
telemetry unless the user explicitly copies it.
