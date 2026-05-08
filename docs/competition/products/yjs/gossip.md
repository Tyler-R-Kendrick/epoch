---
product: Yjs
gossip_sources:
  - https://github.com/yjs/yjs/issues
  - https://discuss.yjs.dev/
  - https://docs.yjs.dev/getting-started/adding-awareness
  - https://docs.yjs.dev/getting-started/a-collaborative-editor
---

# Gossip

## Positive Sentiment

- Developers frequently treat Yjs as the practical default for web collaborative editing because bindings and providers already exist.
- The community discussion forum is active, which gives adopters a place to debug provider, editor, and persistence questions.
- The ability to add real-time collaboration to established editors is a major source of goodwill.

## Complaints And Friction

- GitHub issues show recurring reports around memory growth, deleted-entry tombstones, undo behavior, large document reconnects, and update merge performance.
- Production teams often need help choosing between providers, persistence layers, server deployments, and awareness patterns.
- Awareness can improve collaboration, but the docs themselves note that too much presence data can distract users.
- Some edge cases are hard to reason about because behavior emerges from the interaction between editor binding, provider, persistence layer, and application code.

## Bug Themes To Watch

- Memory behavior for long-lived documents with deleted content.
- Undo manager correctness and remote/local undo boundaries.
- Large document synchronization and provider reconnect stability.
- Performance of update merge operations under heavy histories.

## Epoch Takeaways

- Build first-class tests around long-lived deleted state, undo, and large-history synchronization.
- Make integration choices explicit; provider ambiguity becomes product friction.
- Treat presence as a focused UX signal rather than a stream of distracting metadata.
- Distinguish live collaboration from durable repository accountability in marketing and docs.
