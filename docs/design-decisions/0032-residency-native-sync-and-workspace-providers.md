# ADR-0032: Separate Residency, Native Sync, And Workspace Providers

Status: Accepted and implemented

## Context

A repository may know an object's identity without holding its bytes, and a
workspace may be persistent without being materialized or execution-isolated.
Collapsing those concepts leads to false corruption reports and unsafe sandbox
claims.

## Decision

- Storage descriptors are `inline`, `chunk-manifest`, or `external-pointer`.
  Full blob SHA-256 always hashes the complete bytes.
- `epoch.chunk-manifest/v1` uses pinned FastCDC-v1 parameters and ordered
  offset/length/SHA-256 entries. Unknown chunkers and malformed layouts fail.
- `epoch.object-promise/v1` distinguishes promised missing bytes from resident
  bytes. Fulfillment verifies expiry, size, and hash before materialization.
- `epoch.sync/v2` negotiates hash, signature, serialization, event, storage,
  compression, commands, authentication names, and limits. In-process and HTTP
  transports share the command contract; receipts are idempotent.
- `epoch.workspace-manifest/v1` reports residency, materialization, storage,
  and execution separately. Memory, filesystem, and browser capability probes
  are truthful. Rift launch is explicit opt-in, hook-free, safe-argument only,
  and declares `in-process`, never isolated.

## Compatibility, Migration, And Escape

Whole inline blobs and existing event IDs remain valid; no event rewrite occurs.
Metadata-only clones can hold manifests/promises without zero-filled fake
blobs. Hydrate/backfill retrieves bytes only through a configured adapter.
`checkout --full` remains the whole-tree escape. Browser users can export data
and clear the provider store; filesystem users can remove a child workspace,
but provider-root removal is refused.

## Consequences

Missing promised data is an availability gap, while bad resident bytes are an
integrity failure. Range fetch is allowed only when a manifest proves chunk
boundaries; otherwise callers fetch the full object or receive an explicit
rejection. OPFS/IndexedDB are capabilities, not guaranteed availability.

## Revisit Criteria

Revisit for a genuinely isolated execution provider, durable promise resolver,
or new chunker/protocol version with migration and golden vectors.

## Related

- [Workspace Provider Guide](../workspace-providers.md)
- [Resolver And Sync Guide](../resolver-sync.md)
- [ADR-0014](0014-virtual-working-tree-and-sparse-checkout.md)
- [ADR-0018](0018-blob-subsystem-reference-architecture.md)
