---
product: Yjs
slug: yjs
category: collaborative_crdt_framework
primary_sources:
  - https://yjs.dev/
  - https://docs.yjs.dev/
  - https://docs.yjs.dev/getting-started/a-collaborative-editor
  - https://docs.yjs.dev/getting-started/adding-awareness
  - https://github.com/yjs/yjs
---

# Yjs

Yjs is a high-performance CRDT framework for building collaborative applications. It competes with Epoch where teams need shared types, rich editor bindings, awareness, offline support, and network-agnostic synchronization for live collaboration.

## Competitive Relevance

- Yjs has become a default open-source substrate for collaborative editors and app state.
- Its modular ecosystem covers shared data types, editor bindings, providers, persistence layers, language bindings, and awareness.
- Yjs does not present itself as a general version-control system, but it captures the collaboration engine layer that Epoch may need to explain against.
- The ecosystem's strength is breadth: CodeMirror, ProseMirror, Monaco, Quill, WebRTC, WebSocket, IndexedDB, Redis, and other integrations.
- Awareness and presence are first-class enough that collaboration feels like product UX, not only a data-merge algorithm.

## Epoch Implications

- Epoch should clarify whether it is a collaboration engine, a repository/event-history system, or both.
- Yjs shows that bindings and providers matter as much as the CRDT core; Epoch's SDK and WASM surfaces should feel similarly easy to compose.
- Presence, identity, and human-readable collaboration state should not be treated as optional decoration.
- Epoch can differentiate by emphasizing durable signed history, repository workflows, and reviewable artifacts rather than ephemeral live collaboration alone.

## Unknowns To Track

- Whether Yjs users increasingly expect repository-grade history, branching, and audit features from the same stack.
- How the Yjs ecosystem handles long-lived deleted content, snapshots, and move semantics as products scale.
- Whether commercial collaboration platforms built on Yjs make the underlying engine less visible to buyers.
