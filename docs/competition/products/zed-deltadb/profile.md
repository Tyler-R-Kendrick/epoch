---
product: Zed DeltaDB
slug: zed-deltadb
category: crdt_collaboration
primary_sources:
  - https://zed.dev/blog/sequoia-backs-zed
  - https://zed.dev/blog/zed-1-0
  - https://zed.dev/blog/crdts
  - https://zed.dev/docs/collaboration/overview
  - https://zed.dev/docs/collaboration/channels
---

# Zed DeltaDB

Zed DeltaDB is Zed's planned operation-level version-control and synchronization layer. It competes with Epoch at the CRDT-backed repository history layer: edit-level operations, durable code-linked discussions, agent/human collaboration, Git interoperability, and stable references that survive code movement.

## Competitive Relevance

- DeltaDB is explicitly framed as version control that tracks operations rather than only commits.
- Zed already has a production collaboration surface: channels, shared projects, notes, voice, screen sharing, following, and concurrent editing.
- Zed's CRDT writing emphasizes logical anchors, immutable insertions, tombstones, vector timestamps, Lamport ordering, and per-participant undo.
- Character-level permalinks are a direct challenge to Epoch's goal of durable, code-addressed collaboration state.
- Zed can distribute DeltaDB through a high-traction IDE instead of asking teams to adopt a standalone VCS first.

## Epoch Implications

- Epoch should make its signed event log feel as navigable as an editor-native operation history, not merely auditable.
- Stable anchors should be a first-class product capability: code discussions, agent assumptions, review notes, and policy events need to survive refactors and file movement.
- Epoch can differentiate by being editor-agnostic, cryptographically authored, locally inspectable, and portable across CLI, SDK, WASM, and forge workflows.
- Epoch should preserve Git interop while explaining what operation-level events add beyond snapshots, generated commits, or PR comments.
- The product must manage signal-to-noise deliberately; recording every operation is only valuable if users and agents can query intent without drowning in transient edits.

## Unknowns To Track

- Public sources do not yet describe DeltaDB's standalone API, storage format, signature model, self-hosting story, migration path, or conflict policy.
- Zed says DeltaDB is planned to be open source with an optional paid service, but public material does not yet show the repository, service boundary, or governance model.
