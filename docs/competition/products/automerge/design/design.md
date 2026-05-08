---
product: Automerge
design_sources:
  - https://automerge.org/
  - https://automerge.org/docs/tutorial/concepts/
  - https://automerge.org/docs/tutorial/local-sync/
  - https://automerge.org/docs/reference/repositories/
  - https://automerge.org/blog/automerge-repo/
---

# Design

## Look And Feel

Automerge's public design is documentation-first and engineer-facing. The homepage uses a concise local-first narrative, small interactive task-list demos, and direct claims about offline, conflict prevention, versioning, compact storage, and speed. The docs favor code snippets and architectural concepts over a polished SaaS console.

## Open Design Assets

- The homepage provides the primary public visual language: minimal typography, focused claims, and small multiplayer task-list examples.
- The tutorial and reference docs document the conceptual model: documents, repositories, storage adapters, network adapters, handles, and sync.
- The `automerge-repo` announcement explains the product packaging and shows how a repo is configured.
- The public repository exposes implementation and examples, but Automerge does not present a broad open design-system package.

## Differentiators

- The strongest design move is conceptual: local-first collaboration is explained through documents and repositories rather than through a centralized server product.
- The adapter design makes infrastructure choices legible: IndexedDB, filesystem storage, WebSocket, BroadcastChannel, and other network layers are replaceable parts.
- The docs make offline sync testable with simple browser-tab flows, which lowers the perceived complexity of CRDT adoption.
- Automerge frames version history as embedded in the data model, not as a separate tool that users must remember to operate.

## What Works

- The homepage quickly communicates the user promise: local speed, offline work, background sync, and no manual conflict resolution.
- Code-heavy examples respect the target audience and show concrete integration paths.
- The repo model gives application developers a familiar ownership boundary without forcing them into a hosted service.
- The minimal visual treatment keeps attention on architectural clarity.

## UX Breakdowns

- There is no broad product UI for review, audit, branch visualization, policy, identity, or repository governance.
- The docs assume developers can reason about CRDTs, document handles, adapters, and sync protocols; non-specialists may struggle to map that to product workflows.
- Application teams must still design their own collaboration UX, observability, permissions, and recovery flows.
- The open-source-library surface can make adoption feel like engineering infrastructure work rather than a ready collaboration product.
