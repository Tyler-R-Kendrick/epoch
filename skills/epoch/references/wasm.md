# Epoch WASM Reference

Use `@epoch/wasm` when browser, worker, or embedded runtimes need Epoch-compatible CRDT helpers without direct host filesystem or native Git access.

## Package and exports

- Workspace package: `@epoch/wasm`
- React workspace package: `@epoch/wasm-react`
- Root package export: `epoch/Epoch.WASM.Git`
- React root package export: `epoch/Epoch.WASM.React`

The WASM package re-exports CRDT helpers such as `CRDTRegistry`, `EntityType`, `JsonMapCRDT`, `CsvTableCRDT`, `TextWeaveCRDT`, `dumpEntity`, `loadEntity`, and `threeWayMerge`.

`@epoch/wasm-react` exposes browser-safe React state helpers:

- `createEpochReactStore` persists JSON object state changes as append-only Epoch React operation events.
- `useEpochState` bridges that store to React via `useSyncExternalStore`.
- `createMemoryEpochReactStorage` provides a testable storage adapter; browser consumers can pass `localStorage`-compatible storage.
- Store snapshots can be materialized at `latest`, rewound by event id, or rewound by event count.
- `createMemoryEpochVfs` provides a browser-safe virtual file system.
- `createEpochLiveRepository`, `syncFrom`, `useEpochHistory`, `useEpochEntity`, and `useEpochView` expose live VFS-backed repository state through React.

## Git compatibility behavior

`EpochWasmGit` and `EpochWASMGit` expose a WASM-facing Git compatibility surface. Native operations such as clone and arbitrary Git command execution throw `EpochWasmGitUnsupportedOperationError` because the WASM runtime cannot safely access host repositories or invoke native Git.

Use Core or CLI Git surfaces in trusted host environments when filesystem-backed Git operations are required.

## Integration guidance

- Keep persistence, network sync, and filesystem access in the host application.
- Use WASM exports for deterministic CRDT merge/materialization logic.
- Use `@epoch/wasm-react` for framework-local persistent state that must render, rewind, rematerialize, or subscribe to live VFS-backed repository state in a browser without Node filesystem access.
- Return explicit unsupported errors for operations that require native Git or unrestricted filesystem access.
