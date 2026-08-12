# ADR-0031: Durable Conflicts And Conservative Commutation

Status: Accepted and implemented

## Context

Treating a conflict as an interrupted command loses its identity and makes
later review, automation, and policy decisions ambiguous. Assuming two edits
commute is worse: a silent wrong merge is not recoverable evidence.

## Decision

- Conflicts are durable objects with stable IDs, exact side revisions,
  unresolved/proposed/accepted/rejected state, and resolution revision IDs.
- `ConflictLedger.commute` returns true only when applying both orders produces
  the same canonical result; exceptions or ambiguity mean false.
- Deterministic resolution runs before optional provider help. Provider output
  is an untrusted proposal and cannot mutate canonical state.
- Protected merges reject unresolved conflicts. Accept and reject transitions
  require the proposed resolution revision and reject stale input.
- Split and merge integrity checks are fail-closed and preserve provenance.

## Consequences

Conflicts can travel through review and sync without disappearing. Epoch does
not claim Pijul's full patch theory or conflict-free commutation; it adopts the
safer invariant that uncertainty remains a named conflict.

Users can reject a proposal, resolve manually, or remove the local reference
CLI record. No AI provider is required, and no AI action is exposed as an
authoritative fallback.

## Revisit Criteria

Revisit when additional entity-specific commutation proofs have executable
golden vectors and conservative failure behavior.

## Related

- [ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md)
- [Threat And Compatibility Evidence](../frontier-vcs-convergence.md#evidence-and-limits)
