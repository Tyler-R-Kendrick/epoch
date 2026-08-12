# Security Policy

Epoch handles signed events, repository identities, content-addressed blobs, compacts, and Git interoperability. Treat these areas as security-sensitive.

## Supported versions

Epoch is currently a pre-1.0 prototype. Security fixes are accepted on the default development line.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the repository maintainers through a GitHub private vulnerability report at <https://github.com/Tyler-R-Kendrick/epoch/security/advisories/new>. Do not open a public issue for secrets exposure, signature bypasses, tamper-detection failures, arbitrary file writes, command execution, or dependency compromise.

Include:

- Affected command or API.
- Reproduction steps.
- Expected and actual behavior.
- Any relevant repository state, sanitized logs, or proof-of-concept details.

## Security expectations for contributors

- Never commit private keys, tokens, seed data, or real user repositories.
- Validate paths and filesystem writes carefully in CLI, Git, backup, and restore code.
- Preserve signature verification, event hash validation, DAG validation, and blob integrity checks.
- Avoid shell execution. When native Git is necessary, prefer argument-array APIs such as `execFileSync`.
- Keep dependencies minimal and review new packages before adoption.

## Frontier Version-Control Trust Boundaries

- Stable IDs, object digests, explicit parents, expected heads/OIDs, review gate
  digests, and receipts are security-sensitive inputs and fail closed.
- Promised objects are unavailable, not valid empty content. Materialize only
  after expiry, size, chunk layout, and full SHA-256 verification.
- HTTP promise resolvers and forge mirrors validate HTTPS origin, port,
  credentials, every DNS result, and every redirect target. Literal-IP checks
  alone do not close DNS rebinding.
- Incoming sync events/objects and Git receives remain quarantined until all
  signatures, digests, topology, limits, and transaction preconditions pass.
- Forge exports are public-only. Codec loss is explicit; ForgeFed currently has
  `transport: none` and must not be presented as federation delivery.
- Mirror configuration stores an opaque `credentialRef`, never the credential.
  Drift pauses the ref and creates a conflict/import record rather than
  overwriting declared authority.
- Agent/provider calls require attenuated grants and budget reservations.
  Provider output is an untrusted proposal and cannot mutate canonical state
  directly. The shipped in-memory authority ledger requires injected durable
  transactional persistence in production.
- Reference CLI state, browser capability probes, and in-process workspace
  execution are not durability or sandbox-isolation claims.

See [Change Graph And Operation History](docs/change-graph.md) and the
[threat matrix](docs/evidence/change-graph-convergence/threat-matrix.json).
