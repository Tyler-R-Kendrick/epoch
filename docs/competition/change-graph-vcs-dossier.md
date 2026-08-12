# Change Graph And Operation-History Dossier

Labels are strict: **Official** is a linked primary-source claim;
**Implemented** is executable Epoch behavior; **Difference** is a design
boundary; **Missing** is not advertised as shipped. Sources were rechecked
2026-08-12.

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
- **Open DeltaDB questions:** public sources do not yet define a stable external
  storage/API contract, signature and authority model, self-hosting boundary, or
  migration format sufficient for an Epoch fidelity adapter.

The practical opportunity is complementarity rather than a false feature tie:
DeltaDB can provide high-resolution authoring history; Epoch can verify and
govern accepted logical work across editors, agents, forges, and archives. A
future adapter should ingest declared DeltaDB operations as evidence or
Fragments without making an editor database Epoch's authority.

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
