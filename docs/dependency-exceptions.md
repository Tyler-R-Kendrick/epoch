# Dependency Exceptions

## `protobufjs` override for Collabs

Epoch pins `protobufjs@7.5.5` and uses npm `overrides` to force Collabs' transitive protobuf dependency to the patched version.

Reason:

- `@collabs/collabs@0.13.4` is the selected CRDT entity backend.
- Collabs packages currently request `protobufjs ~6.9.0`.
- `protobufjs <7.5.5` has a critical advisory.
- The override keeps the Collabs backend while allowing `npm audit --omit=dev` to report zero production vulnerabilities.

See [`crdt-backend-decision.md`](crdt-backend-decision.md) for the backend decision and exception rationale.
