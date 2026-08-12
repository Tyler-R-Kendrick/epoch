---
product: Zed DeltaDB
slug: zed-deltadb
category: crdt_collaboration
primary_sources:
  - https://zed.dev/blog/introducing-deltadb
  - https://zed.dev/blog/sequoia-backs-zed
  - https://zed.dev/blog/zed-1-0
  - https://zed.dev/blog/crdts
  - https://zed.dev/docs/collaboration/overview
  - https://zed.dev/docs/collaboration/channels
---

# Zed DeltaDB

Zed DeltaDB is Zed's operation-level version-control and synchronization layer. It is Epoch's closest direct competitor at the history layer: stable fine-grained operations, durable code-linked conversations, human/agent collaboration, Git interoperability, and references that survive code movement.

## Competitive Relevance

- Zed now describes DeltaDB as tracking every operation as a stable fine-grained delta and continuously versioning worktrees alongside conversations.
- Zed already has a production collaboration surface: channels, shared projects, notes, voice, screen sharing, following, and concurrent editing.
- Zed's CRDT writing emphasizes logical anchors, immutable insertions, tombstones, vector timestamps, Lamport ordering, and per-participant undo.
- Delta-anchored references and character-level permalinks directly challenge Epoch's current lack of durable character-level code-to-conversation history.
- Zed can distribute DeltaDB through a high-traction IDE instead of asking teams to adopt a standalone VCS first.

## Epoch Implications

- Epoch should make its signed Change and local Operation graphs as navigable as an editor-native operation history, not merely auditable.
- Stable anchors should be a first-class product capability: code discussions, agent assumptions, review notes, and policy events need to survive refactors and file movement.
- Epoch can differentiate by being editor-agnostic, cryptographically authored, locally inspectable, and portable across CLI, SDK, WASM, and forge workflows.
- Epoch should preserve Git interop while explaining what operation-level events add beyond snapshots, generated commits, or PR comments.
- The product must manage signal-to-noise deliberately; recording every operation is only valuable if users and agents can query intent without drowning in transient edits.

## Unknowns To Track

- Public sources do not yet define a stable standalone storage/API contract, signature/authority model, self-hosting boundary, or migration format sufficient for a fidelity adapter.
- The June 2026 announcement described a beta on a near-term horizon. That schedule is a dated product statement, not evidence of a generally available or independently deployable protocol.
