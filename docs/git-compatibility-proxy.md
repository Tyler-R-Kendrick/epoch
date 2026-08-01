# Git Compatibility Proxy

This document is the working specification for Epoch's **Git compatibility
proxy**: a network-facing façade that speaks Git to the outside world while
**Epoch Core remains the system of record**.

It implements the design decisions in
[ADR-0020](design-decisions/0020-community-federation-atproto-git-proxy.md) and
[ADR-0021](design-decisions/0021-git-projection-and-live-migration.md).

## Why This Exists

1. **Epoch is not Git.** Canonical history is a signed event log, content-
   addressed blobs, and optional CRDT entities.  
2. **The ecosystem is Git.** Forges, CI, developer muscle memory, and ATProto
   expect `git clone` / `fetch` / `push`.  
3. **ATProto social parity needs a clone URL.** Public repo records without a
   working Git endpoint are social cards only.  
4. **Migration must be live.** Teams moving to or from Git servers need
   continuous mirror modes, not only one-shot import/export.

## Current Foundation (not the proxy)

| Surface | What it does |
|---|---|
| `EpochRepository.importFromGit` | One-shot file import from a Git tree |
| `EpochRepository.exportToGit` | One-shot export of latest blobs into a directory |
| `EpochCoreGit` / `epoch-git` | Local Git-like CLI over a real `.git` + Epoch recording |
| `.epoch/git.json` | Stored remote/ref/commit metadata |
| Platform `git_mirror_ref` | Spec field; not a live service yet |

The proxy elevates these into a **deployable service** with protocol coverage,
mapping events, and live sync.

## Architecture

```text
git clients / CI / GitHub / other Git remotes
              │
              ▼
     ┌────────────────────┐
     │ Git Compat Proxy   │  smart HTTP (P0), SSH (later)
     │ serve + mirror     │
     └─────────┬──────────┘
               │ project / ingest
               │ signed mapping events
               ▼
     ┌────────────────────┐
     │ Epoch Core         │  authoritative verify + history
     └────────────────────┘
```

ATProto Community (ADR-0020) publishes `gitCloneUrl` values that resolve here.

## Responsibilities

### Serve Git

- Advertise refs mapped from Epoch views and versions.  
- Implement `git-upload-pack` and `git-receive-pack` (smart HTTP minimum).  
- Authenticate via Platform tokens and, later, AT-bound SSH keys.  
- Emit signed `git.proxy.*` events for receive and project operations.

### Ingress (Git → Epoch)

- Accept pushes.  
- Continuously fetch configured upstream remotes (`import-live`).  
- Materialize trees and record content into Epoch.  
- Checkpoint progress for resume after downtime.

### Egress (Epoch → Git)

- Project Epoch heads to Git commits/trees deterministically.  
- Push to configured remotes (`export-live`).  
- Support dual-write during migration windows.

### Reconciliation

- Mapping: `gitOid ↔ epochEventId[]`, `ref ↔ view/version`, mirror cursors.  
- Drift alarms when advertised OID ≠ latest mapping tip.  
- Projection cache (`.git`) rebuildable from Epoch alone.

## Non-Responsibilities

- Git is not canonical for merge/CRDT policy.  
- Full Git feature surface (every hook, submodule edge case, LFS parity) is
  progressive; unsupported operations fail closed.  
- Community moderation, SSO, and legal hold remain Platform concerns.

## Modes

| Mode | Behavior |
|---|---|
| `serve` | Expose proxy endpoints for clone/fetch/push |
| `import-live` | Poll/fetch upstream Git → Epoch |
| `export-live` | Project Epoch → push remote Git |
| `dual-run` | Both directions with explicit lane policy |
| `one-shot` | Existing CLI import/export |

### Dual-run authority

- **Epoch-primary** on refs the proxy advertises as product heads.  
- **Git-primary** only on configured import lanes until cutover.  
- Never silently rewrite Epoch history to match a divergent remote tip.

### Operator cutover

1. Start `import-live` from the legacy forge.  
2. Optionally start `export-live` to a safety mirror.  
3. Point team remotes and AT repo cards at the proxy.  
4. Freeze upstream; final sync; declare Epoch authoritative.  
5. Keep `export-live` if a Git disaster mirror is desired.

## Mapping Model

| Epoch | Git projection |
|---|---|
| View `main` (or default) | `refs/heads/main` |
| Named view | `refs/heads/<view>` |
| Signed version | `refs/tags/<version>` |
| Materialized tree | Git tree + blobs |
| Event bundle / tip | Synthetic commit (trailers carry epoch event ids) |
| Proposal (later) | `refs/epoch/proposals/<id>` or PR-shaped ref |

### Mapping events (illustrative types)

- `git.proxy.project` — Epoch head projected to commit/tree OIDs  
- `git.proxy.receive` — push accepted into Epoch  
- `git.commit.import` — commit ingested from mirror fetch  
- `git.mirror.checkpoint` — remote, ref, OID, cursor, status  
- `git.mirror.fetch` / `git.mirror.push` — operational records  

Exact payload schemas land with the Core implementation.

## Package Sketch

| Package | Role |
|---|---|
| `Epoch.Core` | Projection/ingest pure functions, mapping events |
| `Epoch.Git.Proxy` (proposed) | Smart HTTP/SSH server, auth hooks |
| Mirror worker (proposed) | `import-live` / `export-live` scheduler |
| `epoch-git` CLI | `serve`, `mirror`, `migrate` operator surface |
| Platform / Community | Clone URL publication, private gating |

Initial pack transfer MAY shell out to the `git` binary; ownership of mapping
and authority remains in Epoch.

## Security

- Private repositories MUST NOT be advertised on public AT records.  
- Proxy auth is mandatory for non-public refs.  
- Receive path runs the same verify gates as other mutating Epoch APIs.  
- Do not treat Git commit signatures as a substitute for Epoch `verify()`.  
- Mirror remotes are operator-trusted configuration; credentials stay in
  Platform secrets, never in public events.

## ATProto Linkage

Public repo records (lexicon TBD, target `org.epoch.repo`) include:

- `gitCloneUrl` — proxy endpoint humans and tools use  
- `epochSyncUrl` — optional native Epoch sync for Epoch-aware clients  
- owner DID, name, description, topics  
- optional head anchors (event ids / content tips)

## Phased Delivery

| Phase | Outcome |
|---|---|
| 1 | Deterministic project/ingest library + round-trip tests |
| 2 | Smart HTTP serve: clone/fetch/push → Epoch events |
| 3 | Live import/export workers + cutover runbook |
| 4+ | AT social graph + repo cards pointing at proxy URLs |

See the approved ATProto parity plan for full social phases.

## Success Criteria

1. Unmodified `git` clones and pushes an Epoch-backed repo via the proxy.  
2. Projection cache can be deleted and rebuilt without content loss.  
3. `import-live` resumes after interruption via checkpoints.  
4. `epoch verify` stays green after push and mirror operations.  
5. Public AT repo cards resolve to a working `gitCloneUrl`.

## Related Documents

- [ADR-0020 Community federation](design-decisions/0020-community-federation-atproto-git-proxy.md)  
- [ADR-0021 Git projection and live migration](design-decisions/0021-git-projection-and-live-migration.md)  
- [Git Live Migration Cutover](git-live-migration-cutover.md)  
- [Community ATProto](community-atproto.md)  
- [CLI Reference](cli.md) (current Git commands)  
- [Community human-centered design](community-human-centered-design.md)  

## Implementation packages

| Package | npm name |
|---|---|
| `packages/Epoch.Core` (`git-projection.ts`) | `@epoch/core` |
| `packages/Epoch.Git.Proxy` | `@epoch/git-proxy` |
| `packages/Epoch.Atproto` | `@epoch/atproto` |
| `epoch-git serve \| mirror \| project` | `@epoch/cli` |  
