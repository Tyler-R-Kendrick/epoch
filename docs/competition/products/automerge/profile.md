---
product: Automerge
slug: automerge
category: local_first_crdt_sync_engine
primary_sources:
  - https://automerge.org/
  - https://automerge.org/docs/tutorial/concepts/
  - https://automerge.org/docs/reference/repositories/
  - https://automerge.org/blog/automerge-repo/
  - https://github.com/automerge/automerge
---

# Automerge

Automerge is a local-first CRDT engine and repository layer for multiplayer applications. It competes with Epoch where teams need durable local history, conflict-free collaboration, offline writes, sync adapters, and application-owned data histories rather than centralized forge-only workflows.

## Competitive Relevance

- Automerge describes itself as version control for application data, with offline operation, automatic merge, compact change storage, and local history.
- `automerge-repo` packages storage, networking, document handles, and sync policy into a practical repository model for applications.
- The product is not a general source-control forge, but its document and repo vocabulary overlaps directly with Epoch's event-log and content-addressed repository ambitions.
- Automerge already has strong local-first credibility and a clear architecture for browser, server, and peer-to-peer sync adapters.
- The core is open source and language-aware enough to attract infrastructure builders rather than only end-user app teams.

## Epoch Implications

- Epoch should be explicit about how its repository model differs from a CRDT document repository: signed identity, multi-artifact history, CLI/SDK/WASM surfaces, and forge interoperability.
- Automerge's adapter model is a good precedent for separating storage, networking, and policy from the core merge model.
- Epoch should make offline-first and sync-later flows concrete in docs and demos because Automerge owns that language well.
- Fine-grained history must be useful to humans and agents, not just preserved as a low-level log.
- Epoch can differentiate by treating source, generated outputs, policy events, signatures, and agent context as one auditable repository rather than only app documents.

## Unknowns To Track

- How much production usage depends on the newer repo layer versus direct Automerge document APIs.
- Whether storage compaction, large-document behavior, and sync adapter maturity hold up for broad repository workloads.
- Whether Automerge will move further into developer-tool history, branching, and review surfaces.
