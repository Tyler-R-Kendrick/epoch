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

When Epoch is installed as a package, use the installed `epoch` and `epoch-git`
binaries directly.

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
| `sync PEER_REPO` | Copy missing events and blobs from a peer repository. |
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
| `checkout [--virtual\|--full] [--base REF] NAME` | Switch the current view and materialize its files. |
| `view-delete NAME` | Delete a view. |
| `view-diff LEFT RIGHT` | Show a JSON diff between views. |
| `view-promote SOURCE TARGET` | Promote accepted content from one view into another. |

## Virtual Working Tree Commands

`epoch init` sets `[working_tree] materialization = "virtual"` in
`.epoch/config.toml`, so `checkout` writes only the files a view changes relative
to its base and leaves the rest virtual. The full tree is described in
`.epoch/checkout.json`, and a rolling `base -> view` unified diff is written to
`.epoch/patches/<hash>.patch`. These are regenerable caches and are not part of
`verify`.

| Command | Purpose |
|---|---|
| `checkout --virtual [--base REF] NAME` | Sparse checkout: write only files that differ from the base; leave unchanged files virtual. |
| `checkout --full NAME` | Materialize the entire working tree (the previous default behavior). |
| `preview [--view VIEW] [--base REF] [--context N]` | Print the rolling aggregate unified diff without materializing files. |
| `hydrate [PATH...]` | Materialize still-virtual files (all, or the given paths) from the object store. |

`status` reports still-virtual paths with a `V` marker rather than as deletions.

## Git Commands

- `import [--version NAME] GIT_REPO` records tracked files from a Git repository into Epoch and can create a first version.
- `export GIT_REPO` writes latest recorded blobs into a Git repository
  directory.
- `epoch-git` provides a Git-like command surface for integrations that expect
  clone, add, commit, and status behavior.

Unsupported Git commands fail explicitly instead of pretending to be safe.

## Related Docs

- [Core SDK Reference](sdk.md)
- [Feature Registry](features.md)
- [Current Design](design.md)
