# ADR-0021: Git Projection And Live Migration Semantics

## Status

Accepted and partially implemented. Deterministic object/ref projection,
quarantine receive, protocol-v2 capability forwarding, compatibility profiles,
and mirror coordination ship as a bounded foundation. A complete production
Git hosting/migration service does not.

## Context

Epoch's canonical history is a signed append-only event log with content-
addressed blobs and optional CRDT entities. Git is the default interchange
format for forges, CI, and ATProto-adjacent tooling that expects Git remotes.

Today Epoch can:

- import tracked files from a Git working tree (`importFromGit`);
- export latest blobs into a Git directory (`exportToGit`);
- run a local Git-like CLI (`epoch-git`) that shells out to `git` and records
  Epoch events for a subset of commands.

That is not enough for:

- unmodified `git clone` / `fetch` / `push` against an Epoch-backed host;
- continuous migration from GitHub/GitLab/Codeberg and other Git hosts without
  freeze-only cutovers;
- continuous mirror egress for backup or dual-publish;
- ATProto repo cards that advertise a real clone URL.

## Decision

### Authority

1. **Epoch Core is authoritative** for content, verify, merge policy, and
   audit.  
2. **Git objects and refs exposed by the proxy are projections** (or ingress
   staging) derived from Epoch.  
3. A local `.git` directory used by the proxy is a **discardable cache**. It
   MUST be rebuildable from Epoch plus mapping events. Losing the cache MUST
   NOT lose Epoch-verified content.  
4. Operators and UI MUST present Git remotes as interop/migration surfaces, not
   as the system of record.

### Projection (Epoch → Git)

- Map Epoch views to `refs/heads/<view>` (default view → `refs/heads/main`
  unless configured otherwise).  
- Map signed versions/tags to `refs/tags/<name>`.  
- Build Git trees deterministically from the materialization of a view or
  version (stable path order, blob OIDs from content).  
- Synthesize Git commits that record tree OID, parents when history projection
  is enabled, and trailers/notes linking `epoch-event-id` (and optional DID).  
- Append signed mapping events such as `git.proxy.project` with
  `{ ref, commitOid, treeOid, epochHeadEventIds }`.

Early phases MAY project a single tip commit per ref (squash-style) rather than
full event-linear history, as long as tree content matches materialization and
mapping events remain verifiable.

### Ingestion (Git → Epoch)

- On push or mirror fetch, accept new commits, materialize trees, and record
  files into Epoch (`record` / lifecycle events as appropriate).  
- Append signed mapping events such as `git.proxy.receive` or
  `git.commit.import` with `{ commitOid, ref, recordedEventIds, remote? }`.  
- Unknown or unsafe Git features fail closed (consistent with
  `UnsupportedGitOperationError`).

### Live migration modes

| Mode | Direction | Use |
|---|---|---|
| `serve` | Bidirectional client ↔ proxy | Host for git clients / AT clone URLs |
| `import-live` | Remote Git → Epoch | Continuous migration from a forge |
| `export-live` | Epoch → Remote Git | Backup / GitHub or other Git mirror |
| `dual-run` | Both with explicit lane policy | Long cutovers and hybrid teams |
| `one-shot` | Existing import/export | Bootstrap and tests |

**Dual-run default authority:** Epoch-primary for refs the proxy advertises as
Epoch heads; Git-primary only on explicitly configured import lanes (for
example `refs/remotes/upstream/*` or a dedicated import branch) until cutover
promotes them.

Cutover recipe is normative for operators:

1. `import-live` from legacy remote.  
2. Optional `export-live` to a safety mirror.  
3. Point clients and AT repo cards at the Epoch Git proxy.  
4. Freeze upstream; final sync; mark Epoch authoritative.  
5. Optionally keep `export-live` forever.

### Drift and verify

- Store mirror checkpoints (`git.mirror.checkpoint`) with remote URL, ref,
  OID, and timestamp.  
- `epoch verify` remains the trust gate for Epoch content.  
- Drift detection compares advertised Git tip OID to the latest mapping event;
  mismatch is an operator alarm, not silent rewrite of Epoch history.

### Packaging

- Core gains pure projection/ingest helpers and mapping event types.  
- `Epoch.Git.Proxy` (name TBD) owns smart HTTP/SSH serve.  
- Mirror workers own scheduled fetch/push and checkpoints.  
- `epoch-git` gains operator commands (`serve`, `mirror`, `migrate`) over time.  
- Existing `EpochCoreGit` remains a local helper, not the server.

## Implementation Update (2026-08-11)

Projection includes explicit file modes, byte-sorted trees, parents, author and
committer identities/times/zones, notes, and custom refs without absolute
paths. Git protocol v2 is an honest subset; `filter` is advertised only when a
promisor is configured. Mirror authority, expected-old-OID drift, conflict refs,
idempotency, checkpoints, and pause behavior ship through injected adapters.
SSH serving, Git SHA-256 repositories, replace refs, and full hosted migration
operations remain unsupported.

## Consequences

Positive:

- ATProto and classic forges can treat Epoch as a Git remote.  
- Migrations can run live instead of big-bang only.  
- Projection cache rebuild keeps Core as the recovery path.

Trade-offs:

- Full Git history fidelity may lag content fidelity.  
- Pack protocol work is non-trivial; initial implementation may shell out to
  `git` for pack generation while ownership of mapping stays in Epoch.  
- Dual-run misconfiguration can confuse teams; docs and defaults must be strict.

## Revisit Criteria

Revisit if:

- pure TypeScript pack handling is required for WASM/browser constraints;
- CRDT entity streams need a first-class Git encoding beyond file trees;
- a standard emerges for non-Git code transport in ATProto social coding; or
- squash-tip projection is insufficient for customer CI (needs full history).

## Coverage

- Spec: [docs/git-compatibility-proxy.md](../git-compatibility-proxy.md)  
- Existing foundation: `packages/Epoch.Core/src/git.ts`, `importFromGit`,
  `exportToGit`, CLI Git commands in [docs/cli.md](../cli.md)  
- Current convergence coverage: `test/unit/git-proxy-protocol-v2.test.ts`,
  `test/unit/git-proxy-quarantine.test.ts`,
  `packages/Epoch.Git.Proxy/test/projection.test.mjs`, and
  `packages/Epoch.Forge/test/mirror.test.mjs`
