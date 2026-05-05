# Epoch CLI Reference

Use the CLI for local repository operations, smoke tests, demos, and scripts that operate on the filesystem.

## Build and run

Build before using the source checkout CLI:

```bash
npm run build
node packages/Epoch.CLI/dist/cli.js --repo ./repo init --author alice
```

When installed as a package, use `epoch` and `epoch-git` binaries.

## Global options

| Option | Description |
|---|---|
| `--repo PATH` | Select the Epoch repository root. Defaults to the current working directory. |

## Repository commands

| Command | Purpose |
|---|---|
| `init --author NAME` | Initialize `.epoch/` metadata and identity. |
| `record [--type MIME] PATH` | Record a file as an immutable event and blob. |
| `events` | Print event IDs, types, and payloads. |
| `verify` | Verify signatures, DAG state, heads, blobs, and tamper evidence. |
| `sync PEER_REPO` | Copy missing events and blobs from a peer repository. |
| `rollback EVENT_ID` | Append a rollback event for an existing event. |
| `dr-plan` | Print the disaster recovery plan. |

## Review and policy commands

| Command | Purpose |
|---|---|
| `intent PATH` | Create a signed proposed change event. |
| `merge INTENT_ID` | Sign an inclusion policy event. |
| `reject INTENT_ID` | Sign a rejection policy event. |
| `comment --intent INTENT_ID TEXT` | Add signed discussion metadata. |
| `status` | Show intent policy status. |
| `main` | Print accepted intent IDs. |

## Named view commands

Use views as deterministic logical workspaces over the shared event log.

| Command | Purpose |
|---|---|
| `view-create NAME --parent VIEW --rule JSON` | Create a named view. |
| `views` | List views and mark the current view. |
| `checkout NAME` | Switch the current view. |
| `view-delete NAME` | Delete a view. |
| `view-diff LEFT RIGHT` | Show a JSON diff between views. |
| `view-promote SOURCE TARGET` | Promote accepted content from one view into another. |

## Git commands

- `import GIT_REPO` records tracked files from a Git repository into Epoch.
- `export GIT_REPO` writes latest recorded blobs into a Git repository directory.
- `epoch-git` provides a Git-like command surface for integrations that expect clone/add/commit/status behavior.

Unsupported Git commands fail explicitly instead of pretending to be safe.
