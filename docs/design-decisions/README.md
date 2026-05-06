# Design Decisions And ADRs

Epoch records architectural decisions as short ADR-style documents. A decision
record should explain the context, the chosen direction, meaningful trade-offs,
and when the decision should be revisited.

## Index

| ADR | Status | Decision |
|---|---|---|
| [ADR-0001](0001-design-philosophy-and-inspiration.md) | Accepted | Keep Epoch small, event-driven, local-first, auditable, and shaped by prior DVCS/local-first systems. |
| [ADR-0002](../crdt-backend-decision.md) | Accepted | Use Collabs for operation-based CRDT entities and store Collabs messages in signed Epoch events. |
| [ADR-0003](0003-competitive-gap-design-options.md) | Accepted | Evaluate competitive gaps and outline Epoch-shaped options for collaboration objects, sync, conflict reuse, operation recovery, entity adapters, browser live state, redaction, and signed gates. |

## Supporting Decision Records

| Document | Purpose |
|---|---|
| [Dependency Exceptions](../dependency-exceptions.md) | Documents reviewed dependency overrides, including the protobuf override required by the Collabs backend. |

## Adding A Decision

New design decisions should:

- use the next `ADR-NNNN` number;
- include status, context, decision, consequences, and revisit criteria;
- link related feature coverage or implementation docs; and
- be added to this index.
