---
product: Automerge
gossip_sources:
  - https://github.com/automerge/automerge/issues
  - https://github.com/automerge/automerge-repo/issues
  - https://news.ycombinator.com/item?id=36995248
  - https://automerge.org/docs/reference/concepts/
---

# Gossip

## Positive Sentiment

- Public discussion is strongest around the clarity of local-first software and the appeal of collaboration that keeps working offline.
- Developers like that Automerge handles merge semantics and lets applications choose storage and transport details.
- The project has credibility because it is open, technically deep, and connected to the broader local-first research community.

## Complaints And Friction

- Hacker News-style discussion often circles the same adoption concern: CRDTs are powerful, but production apps still need permissions, sync service operations, data migration, compaction, and debugging.
- GitHub issues show recurring engineering friction around repo adapters, sync behavior, TypeScript/JavaScript package boundaries, storage behavior, and cross-runtime edge cases.
- Users evaluating Automerge must distinguish the mature core CRDT from the surrounding repo and adapter ecosystem.
- Some teams may worry about data growth, tombstones, and whether history retention remains cheap for very large or long-lived documents.

## Bug Themes To Watch

- Adapter-specific persistence and reconnect behavior.
- Large-document performance and memory use.
- Sync protocol edge cases across browser tabs, WebSocket servers, and custom transports.
- Developer ergonomics around handles, loading states, and unavailable peers.

## Epoch Takeaways

- Do not sell low-level convergence alone; show the complete operator story around identity, policy, history, and recovery.
- Make storage and network adapters explicit extension points.
- Preserve local-first strengths while adding repository-level review and audit affordances.
- Document scale boundaries and compaction behavior before users discover them in production.
