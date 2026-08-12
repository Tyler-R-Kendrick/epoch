# ADR-0035: Loss-Aware Forge Adapters And Explicit Mirror Authority

Status: Accepted and implemented as codecs plus an injected coordinator

## Context

Forge interchange is useful only if it cannot leak private objects, silently
discard fields, loop forever, or let a mirror overwrite the declared authority.

## Decision

- `@epoch/forge` exposes capability metadata and codecs for F3 v4.0, a narrow
  ForgeFed Ticket/MergeRequest subset, NIP-34, and a Radicle record boundary.
- Every export requires public visibility. Losses are structured; malformed or
  unsupported F3 objects are quarantined. ForgeFed comment/release kinds fail.
- ForgeFed has `transport: none`; the package does not claim ActivityPub
  delivery. F3 is a deterministic JSON codec, not a complete native F3 server
  or archive extractor.
- NIP-34 and Radicle have `transport: codec-only` and
  `verification: injected-evidence-required`. Their decoders reject records
  unless a trusted caller supplies prior cryptographic verification evidence
  bound to the exact event/pubkey or repository/signed-ref/revision/sequence.
  Codec parsing does not claim to verify a network transport or signature.
- Mirror rules declare direction, `epoch-primary` or `git-primary` authority,
  source/destination refs, opaque `credentialRef`, force, and deletion policy.
- HTTPS remotes reject embedded credentials, unsafe ports, loopback/private
  literal or resolved addresses. Expected-old-OID, loop markers, idempotency,
  checkpoints, per-ref pause, and bounded retry protect reconciliation.
- Destination drift creates an import-conflict ref; it never rewrites the
  authoritative ref implicitly.

## Escape And Consequences

Export a public F3 archive or Git projection before disabling an adapter.
Remove/pause a mirror rule without changing canonical objects. Credentials live
outside rules and output. There is no new runtime dependency and no hosted
ForgeFed, F3, Radicle, or Nostr service claim.

## Revisit Criteria

Revisit when a live transport has authentication, redirect revalidation,
viewer-scoped authorization, conformance tests, and explicit authority policy.

## Related

- [Forge Adapter Guide](../forge-adapters.md)
- [F3 v4.0](https://f3.forgefriends.org/)
- [ForgeFed branch snapshot](https://forgefed.org/spec/)
- [Radicle protocol](https://radicle.xyz/guides/protocol/)
