# ADR-0034: Agent Principals, Attenuated Grants, And Finite Budgets

Status: Accepted and implemented as a pure authority model

## Context

An agent must not borrow a human identity or gain ambient authority from a
model/provider configuration. Authorization and finite resource use need
inspectable, replay-safe decisions.

## Decision

- Human, agent, service, device, and organization principals have stable IDs
  and public key bindings; private key material is forbidden from records.
- Grants scope actions/resources plus optional repository, community, path,
  View, Change, Change Graph, tool, model, provider, and audience dimensions.
- Delegation only attenuates scope, expiry, depth, and budgets. Revoking any
  ancestor revokes descendants.
- Budgets use non-negative safe integers. CAS reservations, leases, release,
  consumption, and idempotent receipts distinguish reserved from spent work.
- Provider invocation requires an allowed grant, budget reservation, explicit
  disclosure acceptance, bounded output, and optional schema validation.
  Provider output is always `authoritativeMutation: false`.

## Privacy, Persistence, And Escape

Telemetry contains digests, byte counts, model/provider IDs, usage, and outcome,
not prompts or credentials. The shipped `AuthorityLedger` is in-memory reference
logic; callers must supply durable transactional persistence. Disable providers,
revoke grants, release reservations, or remove agent principals without
rewriting repository history.

## Consequences

Authorization decisions are explainable and fail closed. This does not claim a
hosted IAM system, durable budget service, or secure signer enclave.

## Revisit Criteria

Revisit when a durable ledger adapter and key-rotation ceremony are available.

## Related

- [Identity Bridge](../identity-bridge.md)
- [Security Policy](../../SECURITY.md)
- [ADR-0023](0023-three-plane-identity-binding.md)
