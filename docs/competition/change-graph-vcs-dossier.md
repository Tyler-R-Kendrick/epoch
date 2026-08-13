# Change Graph And Operation-History Dossier

Labels are strict: **Official** is a linked primary-source claim;
**Implemented** is executable Epoch behavior; **Difference** is a design
boundary; **Missing** is not advertised as shipped. Sources were rechecked
2026-08-13.

Delta's product documentation went live at `delta.dev/docs` and answers several
questions this dossier previously carried as open. The detailed treatment —
including the separation of the virtualized-worktree claim from any
copy-on-write filesystem mechanism — is in
[Delta Workspace Convergence Analysis](delta-workspace-convergence.md).

## Zed DeltaDB

DeltaDB is Epoch's closest direct competitor because both place durable work
history below Git commits and aim to keep human/agent context attached to the
work that produced it.

- **Official:** Zed describes DeltaDB as tracking every operation as a
  fine-grained delta with stable identity; worktrees are continuously versioned
  alongside conversations, synchronized as conflict-free replicated worktrees,
  and remain interoperable with Git and CI.
  [Introducing DeltaDB](https://zed.dev/blog/introducing-deltadb)
- **Official:** Zed has described operation-level version control, CRDT sync,
  character-level permalinks, and Git interoperability as the direction behind
  DeltaDB. [Sequoia backs Zed](https://zed.dev/blog/sequoia-backs-zed),
  [Zed 1.0](https://zed.dev/blog/zed-1-0)
- **Implemented:** Epoch has signed stable Changes and immutable Revisions,
  explicit Fragments, multi-head Change Graphs, local operation recovery,
  signed CRDT Code Operations with Change/session/tool/private-conversation-
  digest context, Review Bundles, exact gates, durable conflicts, declared Git
  projections, principals/grants/budgets, evidence, partial Residency, and
  archive mappings.
- **Difference:** DeltaDB is editor-native and operation-continuous. Epoch is
  editor-independent and event-authoritative: it emphasizes portable signatures,
  policy, review/merge scope, external projections, and offline verification.
- **Missing:** Epoch does not continuously capture every editor/terminal action,
  mount a live CRDT worktree shared by arbitrary tools, or expose durable
  character-level code-to-conversation permalinks. Code Operations are explicit
  signed capture, not DeltaDB parity.
- **Official (2026-08-13, product docs):** the object model is now public. A
  **thread** is "one thread, one agent, and its own worktrees"; a **worktree**
  lives in DeltaDB and is explicitly not a Git worktree; a **checkout** is the
  per-machine folder realizing it, either Delta-managed or an adopted existing
  project folder, with `.delta` metadata and two Git remotes (`origin` and
  `local`). The agent runs on exactly one **machine** per turn.
  [Worktrees & Machines](https://delta.dev/docs/concepts/worktrees-and-machines),
  [Delta & Git](https://delta.dev/docs/concepts/delta-and-git)
- **Official:** the storage boundary is answered and is a single vendor.
  "Delta's backend runs entirely on Cloudflare" — R2 for file contents and Git
  commits, Durable Objects with SQLite for thread/worktree deltas, KV and D1 for
  metadata. No self-hosting boundary is published, and thread deletion "does not
  yet remove already-synced copies from our servers."
  [Data Storage](https://delta.dev/docs/privacy-and-security/data-storage)
- **Official:** the authority question is answered by its absence. Zed documents
  "no framework for agent permissions," "no agent sandbox capability," and no
  mechanism preventing execution of shared worktree settings or configuration,
  with agents holding unrestricted device access — roadmap items, early access
  "at your own risk." Transport is TLS, storage is encrypted with
  Cloudflare-managed keys, and secret redaction matches only exact values
  already known from environment variables, dotenv, and Mise files.
  [Agentic Safety](https://delta.dev/docs/privacy-and-security/agentic-safety),
  [Security](https://delta.dev/docs/privacy-and-security/security)
- **Difference (worktree virtualization):** the launch post's virtualized
  worktree with near-free branching is a claim about the *data model* — a branch
  is a position in the delta stream. The documentation describes real
  per-machine checkouts and no kernel VFS, FUSE mount, or filesystem
  copy-on-write. Epoch's cheap joining comes from residency
  ([ADR-0014](../design-decisions/0014-virtual-working-tree-and-sparse-checkout.md),
  [ADR-0032](../design-decisions/0032-residency-native-sync-and-workspace-providers.md))
  and should be described as such rather than matched to an unstated mechanism.
- **Difference (conflict semantics):** a conflict-free replicated worktree
  always converges, so semantic disagreement never becomes an artifact. Epoch
  keeps durable conflicts with every side and the resolution lineage, and
  [ADR-0031](../design-decisions/0031-durable-conflicts-and-conservative-commutation.md)
  refuses to treat unknown commutation as permission.
- **Open DeltaDB questions:** a stable *external* storage/API contract,
  signature model, and migration format sufficient for an Epoch fidelity adapter
  remain unpublished. The self-hosting boundary is no longer open — it is
  documented as absent.

The practical opportunity is complementarity rather than a false feature tie:
DeltaDB can provide high-resolution authoring history; Epoch can verify and
govern accepted logical work across editors, agents, forges, and archives. A
future adapter should ingest declared DeltaDB operations as evidence or
Fragments without making an editor database Epoch's authority.

The competitive read after the product launch is narrower than "catch up":
Delta owns the *ergonomics* of the joinable shared agent workspace and has
explicitly deferred its *governance*, while Epoch holds the governance
primitives and has never assembled the ergonomics.
[ADR-0042](../design-decisions/0042-spaces-shared-signed-workspaces.md) proposes
the assembly.

## Jujutsu (jj)

- **Official:** jj records repository operations for concurrent command
  reconciliation and exposes an operation log for recovery.
  [Concurrency](https://jj-vcs.github.io/jj/latest/technical/concurrency/),
  [operation log](https://docs.jj-vcs.dev/latest/operation-log/)
- **Implemented:** immutable headers plus stable change identity map to Epoch
  Revisions; Epoch also has a local-only operation DAG.
- **Difference:** jj owns a working-copy/VCS operation model; Epoch adds signed
  authority, evidence, projection, and collaboration records.
- **Missing:** Epoch does not host jj's native operation store or wire protocol.

## Pijul and Darcs

- **Official:** Pijul and Darcs treat changes and commutation as first-class.
  [Pijul changes](https://pijul.org/manual/why_pijul),
  [Darcs theory](https://darcs.net/Theory)
- **Implemented:** Epoch has stable Change/Revision identities, durable
  conflicts, and conservative apply-both-orders commutation evidence.
- **Difference:** Epoch makes no patch-theory algebra claim; unknown
  commutation is not permission.
- **Missing:** no native Pijul or Darcs repository/transport adapter.

## Graphite

- **Official:** Graphite organizes dependent changes as stacked Git branches
  and provides restacking. [Overview](https://graphite.com/docs/get-started),
  [restacking](https://graphite.com/docs/restack-branches)
- **Implemented:** a Graphite fixture maps a linear branch presentation into a
  Change Graph and deterministic dependency closure.
- **Difference:** “stack” is external projection language. Epoch's native graph
  is a DAG and keeps presentation ordering separate from hard dependencies.
- **Missing:** no Graphite account, hosted workflow, or private API adapter.

## GitButler

- **Official:** GitButler presents multiple virtual branches in one working
  directory. [Overview](https://docs.gitbutler.com/overview)
- **Implemented:** parallel Git branches map to independent Changes without
  forcing a linear graph.
- **Difference:** Epoch separates Change Graph, Residency, Workspace storage,
  and Sandbox isolation.
- **Missing:** no native GitButler workspace/project-file adapter.

## Git

- **Official:** Git protocol v2 provides command and capability negotiation;
  partial clone provides object filters.
  [Protocol v2](https://git-scm.com/docs/protocol-v2),
  [partial clone](https://git-scm.com/docs/partial-clone)
- **Implemented:** deterministic declared Git projection, bounded protocol-v2
  negotiation, quarantine admission, and promisor-gated filtering.
- **Difference:** Git objects and refs are projections or explicit import lanes,
  not Epoch's canonical Change identity.
- **Missing:** the shipped profile does not claim SHA-256 Git projection or
  unrestricted private-ref advertisement.

## Forge and archive adapters

- **Implemented:** F3 v4 public record interchange, codec-only ForgeFed and
  NIP-34 boundaries, narrow Radicle mapping, mirror policy, and SWHID v1.2 with
  injected Save Code Now transport.
- **Difference:** every adapter reports fidelity, verification, and loss; none
  becomes an aggregate root.
- **Missing:** no bundled forge federation server, Radicle node, or Software
  Heritage archive service.

See [Forge Adapters](../forge-adapters.md) and
[Epoch Nomenclature](../nomenclature.md).
