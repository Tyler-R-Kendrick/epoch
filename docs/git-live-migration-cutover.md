# Git Live Migration Cutover Runbook

Operator guide for migrating a repository **to** Epoch (or dual-running with a
Git forge) using the Git compatibility proxy.

See also [Git Compatibility Proxy](git-compatibility-proxy.md),
[ADR-0021](design-decisions/0021-git-projection-and-live-migration.md).

## Prerequisites

- Epoch repository initialized (`epoch create` / `epoch init`)
- System `git` available
- Built packages: `@epoch/core`, `@epoch/git-proxy`, `@epoch/cli`

## Modes

| Command | Meaning |
|---|---|
| `epoch-git project --repo PATH` | One-shot Epoch → Git projection |
| `epoch-git mirror import --repo PATH --remote URL` | `import-live` once (fetch + ingest + checkpoint) |
| `epoch-git mirror export --repo PATH --remote URL` | `export-live` once (project + push + checkpoint) |
| `epoch-git mirror dual-run --import-remote URL --export-remote URL` | Import lane + export product heads |
| `epoch-git serve --repo PATH --port PORT` | Smart-HTTP façade (`git clone` / `push`) |

## Cutover recipe (local remotes)

1. **Baseline import** from the legacy forge/remote:

   ```bash
   epoch-git mirror import --repo ./my-epoch --remote /path/to/upstream.git
   epoch --repo ./my-epoch verify
   ```

2. **Safety export** to a backup bare remote:

   ```bash
   git init --bare /path/to/backup.git
   epoch-git mirror export --repo ./my-epoch --remote /path/to/backup.git
   ```

3. **Dual-run window** (repeat import then export while teams still push upstream):

   ```bash
   epoch-git mirror dual-run \
     --repo ./my-epoch \
     --import-remote /path/to/upstream.git \
     --export-remote /path/to/backup.git
   ```

   Checkpoints are signed Epoch events (`git.mirror.checkpoint`). Resume after
   downtime by running import again; the worker re-fetches and ingests the tip.

4. **Point clients at the Epoch Git proxy**:

   ```bash
   epoch-git serve --repo ./my-epoch --port 9418
   # git clone http://127.0.0.1:9418/epoch.git
   ```

   Publish the same URL on ATProto public repo cards as `gitCloneUrl`.

5. **Freeze upstream**, final `import-live`, declare Epoch authoritative:

   ```bash
   epoch-git mirror import --repo ./my-epoch --remote /path/to/upstream.git
   epoch --repo ./my-epoch verify
   ```

6. Optionally keep `export-live` forever as a disaster Git mirror.

## Authority during dual-run

- Product heads advertised by the proxy are **Epoch-primary**.
- `dual-run` import uses `authority: epoch-primary`: it fetches and checkpoints
  the import remote tip on `refs/epoch/import-lane/*` and records
  `git.mirror.fetch` / `git.mirror.checkpoint`, but **does not** ingest import
  trees into Epoch product materialization. Divergent same-path content on the
  import remote cannot overwrite Epoch product files.
- Standalone `mirror import` defaults to `git-primary` (migration ingest).
- Always run `epoch verify` after mirror operations.

## Failure / resume

- Mirror checkpoints store `{ remote, ref, commitOid, direction, status }`.
- After process restart, re-run `import` / `export`; progress is idempotent for
  content already recorded (duplicate file records may append; verify stays green
  when content matches).
- If the projection cache under `.epoch/git-projection` is deleted, rebuild with
  `epoch-git project --repo PATH --rebuild` before serving.
