# Native Sync And Resolution

Epoch sync v2 negotiates a bounded capability manifest, explicit commands, have/want frontiers, object filters, continuation cursors, and verified transaction receipts. Metadata-only transfer sends no content chunks. Missing authenticated promises are availability gaps; malformed promises or wrong bytes are integrity failures.

Content uses the accepted FastCDC-v1 descriptor with pinned 16 KiB minimum, 64 KiB average, and 256 KiB maximum chunks. Manifests bind ordered offsets, lengths, chunk hashes, complete length, and complete SHA-256. Range hydration verifies every returned chunk before publication.

Conflict resolution tries deterministic rules before optional providers. Automatic commutation is recorded only when both application orders produce the same canonical result. Provider output remains an untrusted proposal until authorization, budget, disclosure, sandbox validation, policy checks, and explicit acceptance succeed.

The shipped HTTP/in-process protocol is a declared subset; it does not make Git objects Epoch's ontology or claim a custom binary transport.
