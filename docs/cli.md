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
npm exec -- epoch --repo ./repo init --author alice
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
| `init --author NAME` | Initialize `.epoch/` metadata and identity. |
| `record [--type MIME] PATH` | Record a file as an immutable event and blob. |
| `events` | Print event IDs, types, and payloads. |
| `verify` | Verify signatures, DAG state, heads, blobs, and tamper evidence. |
| `sync PEER_REPO` | Copy missing events and blobs from a peer repository. |
| `rollback EVENT_ID` | Append a rollback event for an existing event. |
| `dr-plan` | Print the disaster recovery plan. |
| `op-log` | List signed operation events recorded by mutating CLI commands. |
| `op-show EVENT_ID` | Print one signed operation event projection as JSON. |

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
| `checkout NAME` | Switch the current view. |
| `view-delete NAME` | Delete a view. |
| `view-diff LEFT RIGHT` | Show a JSON diff between views. |
| `view-promote SOURCE TARGET` | Promote accepted content from one view into another. |

## Git Commands

- `import GIT_REPO` records tracked files from a Git repository into Epoch.
- `export GIT_REPO` writes latest recorded blobs into a Git repository
  directory.
- `epoch-git` provides a Git-like command surface for integrations that expect
  clone, add, commit, and status behavior.

Unsupported Git commands fail explicitly instead of pretending to be safe.

## Related Docs

- [Core SDK Reference](sdk.md)
- [Feature Registry](features.md)
- [Current Design](design.md)
