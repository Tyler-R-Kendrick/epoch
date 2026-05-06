# ADR-0001: Design Philosophy And Inspiration

Status: Accepted

## Context

Epoch explores an event-driven DVCS model that keeps repository history local,
signed, auditable, and programmable. The project draws from Git, local-first
databases, CRDT systems, decentralized forge research, and event sourcing, but
it intentionally avoids operationally heavy designs that would make the
prototype harder to reason about.

## Decision

Epoch should follow these design principles:

1. Immutability by default: events are never mutated, and history remains
   complete and verifiable.
2. Identity without authority: cryptographic keys, not central registries,
   establish authorship.
3. Offline first: sync is an enhancement, not a requirement for local work.
4. Progressive enhancement: three-way merge works immediately, while CRDT
   definitions add capability incrementally.
5. No unnecessary complexity: avoid blockchain, certificate-authority, and
   heavy operational dependencies unless they become clearly necessary.
6. Extensibility: CRDT definitions, hooks, SDK APIs, CLI hosts, and storage
   adapters are first-class extension points.

## Inspiration

Epoch synthesizes lessons from these systems:

| System | What Epoch Takes From It |
|---|---|
| [weave-crdt](../../.inspiration/weave-crdt/README.md) | Sequence CRDT algorithm, tombstone model, and identifier-based element addressing. |
| [goatdb](../../.inspiration/goatdb/README.md) | Ed25519 signing, Git-like commit DAG, three-way merge, and local-first database ergonomics. |
| [manyana](../../.inspiration/manyana/README.md) | Event sourcing, CQRS, and the event log as the source of truth. |
| [git-warp](../../.inspiration/git-warp/README.md) | DAG object model, timestamp restoration ideas, and content-addressed history. |
| [radicle](../../.inspiration/radicle/README.md) | Event Sync, cryptographic identities, and append-only decentralized forge ideas. |
| [roshi](../../.inspiration/roshi/README.md) | OR-Set CRDT concepts, convergence repair, and high-throughput distributed sets. |
| [solgit](../../.inspiration/solgit/README.md) | Blockchain VCS lessons and what to avoid: gas costs and immutable sensitive data. |
| [bda-svc](../../.inspiration/bda-svc/README.md) | IPFS and Hyperledger Fabric lessons and what to avoid: extreme operational complexity. |

## Consequences

- The repository should prefer signed append-only events over mutable pointers
  for collaboration state.
- The implementation should stay modular enough for Core, CLI, WASM, and agent
  skill surfaces to evolve independently.
- New dependencies and distributed-system features need a clear security and
  maintenance rationale.
- Large research notes belong in focused documentation or the inspiration
  archive, not in the root README.

## Revisit Criteria

Revisit this decision if Epoch moves from prototype to production deployment,
adds networked access control, introduces key rotation, or adopts a heavier
runtime dependency that changes the project's local-first operating model.
