# Epoch WASM Reference

Use `@epoch/wasm` when browser, worker, or embedded runtimes need Epoch-compatible CRDT helpers without direct host filesystem or native Git access.

## Package and exports

- Workspace package: `@epoch/wasm`
- Root package export: `epoch/Epoch.WASM.Git`

The WASM package re-exports CRDT helpers such as `CRDTRegistry`, `EntityType`, `JsonMapCRDT`, `TextWeaveCRDT`, `dumpEntity`, `loadEntity`, and `threeWayMerge`.

## Git compatibility behavior

`EpochWasmGit` and `EpochWASMGit` expose a WASM-facing Git compatibility surface. Native operations such as clone and arbitrary Git command execution throw `EpochWasmGitUnsupportedOperationError` because the WASM runtime cannot safely access host repositories or invoke native Git.

Use Core or CLI Git surfaces in trusted host environments when filesystem-backed Git operations are required.

## Integration guidance

- Keep persistence, network sync, and filesystem access in the host application.
- Use WASM exports for deterministic CRDT merge/materialization logic.
- Return explicit unsupported errors for operations that require native Git or unrestricted filesystem access.
