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
| [ADR-0004](0004-first-class-repository-creation-and-versions.md) | Accepted | Add simple repository creation, asset-first push, and signed version materialization as first-class user stories. |
| [ADR-0005](0005-platform-core-domain-seam.md) | Accepted | Keep Epoch.Platform invariants in Core while SDK, Community, and Web consume Core contracts. |
| [ADR-0006](0006-platform-filesystem-core.md) | Accepted | Add filesystem-backed Epoch.Platform Core state, HMAC webhooks, and verified backup artifacts. |
| [ADR-0007](0007-platform-community-module.md) | Accepted | Document the now-superseded SDK-backed `Epoch.Platform.Community` module and why it existed before package extraction. |
| [ADR-0008](0008-separate-platform-web-and-community.md) | Accepted | Keep Epoch Platform Web and Epoch Community as separate package families with a descriptor-only deployment boundary. |
| [ADR-0009](0009-native-working-tree-lifecycle.md) | Accepted | Add native signed working-tree lifecycle commands, ignore rules, and TOML repository config. |
| [ADR-0010](0010-epoch-community-design-system.md) | Accepted | Give Epoch Community a product design system with tokens, repository cards, workflow navigation, and visual review coverage. |
| [ADR-0011](0011-community-human-centered-design.md) | Accepted | Use design thinking, user-centric design, human-centered design, and the GitHub open-source contributor persona to drive Epoch Community design. |

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
