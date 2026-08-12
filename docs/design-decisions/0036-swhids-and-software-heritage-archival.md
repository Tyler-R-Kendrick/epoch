# ADR-0036: SWHIDs And Software Heritage Archival

Status: Accepted and implemented with injected remote transport; CLI ships a default HTTP Save Code Now adapter

## Context

Epoch releases need a standard archival identifier and honest proof that a
public origin was accepted by an external archive. A local hash is not remote
archive confirmation.

## Decision

- `@epoch/software-heritage` parses and canonically formats SWHID v1.2 core
  object kinds (`cnt`, `dir`, `rev`, `rel`, `snp`) and supported qualifiers.
- Git-compatible object serialization computes SHA-1 SWHIDs for blob, tree,
  commit, and tag bytes. CLI inspect/compute/verify are local operations.
- `SaveCodeNowClient` accepts only public visibility and public HTTPS origins.
  Its injected transport retries bounded server failures and reports confirmed
  success only for `succeeded` plus `full`, with matching origin.
- The Change Graph CLI ships a default HTTP adapter to
  `https://archive.softwareheritage.org/api/1/origin/save/`. Operators override
  the endpoint with `EPOCH_SWH_SAVE_URL` (tests use a loopback mock). Origin
  SSRF checks still deny localhost, link-local, and private networks. Success
  is recorded as `software-heritage.archive-requested` with the remote status.
- SWHIDs and archive receipts are external evidence, not Epoch object identity
  or authority.

## Privacy, Escape, And Consequences

Private/shared origins fail before transport. No credential is placed in an
identifier. Operators can export Git/F3 and use Software Heritage independently,
or omit the transport entirely. The package does not claim that a local SWHID
is archived. The library client stays injected; only the CLI ships a default
HTTP adapter, and it still requires a remote `succeeded`/`full` response.

## Revisit Criteria

Revisit when authenticated deposit, removal/legal-hold reconciliation, or a
durable receipt store ships with provider conformance tests.

## Related

- [Software Heritage SWHIDs](https://docs.softwareheritage.org/devel/swh-model/persistent-identifiers.html)
- [HA/DR](../HA-DR.md)
- [Change Graph And Operation History](../change-graph.md)
