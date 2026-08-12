# Forge And Mirror Adapters

Epoch signed state remains authoritative. Git refs are rebuildable projections or explicit import lanes; F3 is a migration archive; ForgeFed, NIP-34, Radicle, ATProto, and Nostr records are external mappings and evidence.

`@epoch/forge` publishes versioned capability and loss manifests. F3 support is pinned to 4.0. ForgeFed follows the 18 June 2025 branch snapshot and is a codec only (`transport: none`). NIP-34 and Radicle mappings require caller-supplied signature/replay evidence. Unsupported kinds fail closed or appear in the loss report.

Mirror definitions separate direction and authority. The reference engine validates HTTPS remotes, rejects embedded credentials and private or rebinding addresses, uses idempotency markers and expected old OIDs, records drift, and pauses only the affected ref. Force and deletion default to deny. Credentials are secret references and never portable signed content.

See [ADR-0035](design-decisions/0035-forge-adapters-and-mirror-authority.md) and the machine-readable [compatibility matrix](evidence/frontier-vcs-convergence/compatibility-matrix.json).
