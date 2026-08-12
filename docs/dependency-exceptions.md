# Dependency Exceptions

## `protobufjs` override for Collabs

Epoch pins `protobufjs@7.5.5` and uses npm `overrides` to force Collabs' transitive protobuf dependency to the patched version.

Reason:

- `@collabs/collabs@0.13.4` is the selected CRDT entity backend.
- Collabs packages currently request `protobufjs ~6.9.0`.
- `protobufjs <7.5.5` has a critical advisory.
- The override keeps the Collabs backend while allowing `npm audit --omit=dev` to report zero production vulnerabilities.

See [ADR-0002: CRDT Backend Selection](crdt-backend-decision.md) for the backend decision and exception rationale.

## Frontier convergence dependency result

The 2026-08-11 frontier convergence implementation added no external runtime
dependency and therefore needs no new exception. Package-local dependencies
connect existing Epoch workspaces (`@epoch/protocol`, Core, SDK/WASM, Git proxy,
forge, identity, and Software Heritage). Hashing, URL validation, subprocess
probing, and reference transports use existing platform APIs. Revisit this
record before adding a native VFS, external resolver, forge transport, archive
client transport, or sandbox provider dependency.
