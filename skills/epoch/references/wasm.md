# Epoch WASM Reference

Use `@epoch/wasm` when browser, worker, or embedded runtimes need Epoch-compatible CRDT helpers without direct host filesystem or native Git access.

## Package and exports

- Workspace package: `@epoch/wasm`
- React workspace package: `@epoch/wasm-react`
- Browser integration packages: `@epoch/integration-core`, `@epoch/react`,
  `@epoch/gen-ui`, `@epoch/redux`, and `@epoch/xstate`
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

The integration packages sit above `@epoch/wasm-react`:

- `createBrowserEpoch` in `@epoch/integration-core` creates a browser-safe live
  repository with localStorage defaults and exposes `trackChange`,
  `readTrackedEntity`, and `versionLedger`.
- `@epoch/react` provides `EpochProvider`, `useEpochRepository`,
  `useEpochTrackedEntity`, and `useEpochVersionLedger`.
- `@epoch/gen-ui` provides `trackGeneratedUiChange` for explicit generated UI
  component versioning.
- `@epoch/redux` provides explicit middleware for selected actions and state
  selectors.
- `@epoch/xstate` provides explicit observers for selected XState transitions
  and machine-definition updates.

## Git compatibility behavior

`EpochWasmGit` and `EpochWASMGit` expose a WASM-facing Git compatibility surface. Native operations such as clone and arbitrary Git command execution throw `EpochWasmGitUnsupportedOperationError` because the WASM runtime cannot safely access host repositories or invoke native Git.

Use Core or CLI Git surfaces in trusted host environments when filesystem-backed Git operations are required.

## Integration guidance

- Keep network sync and unrestricted filesystem access in the host application.
- Use WASM exports for deterministic CRDT merge/materialization logic.
- Prefer the integration packages when an app wants out-of-the-box browser
  persistence, explicit tracked-change envelopes, and version ledgers.
- Use `@epoch/wasm-react` for framework-local persistent state that must render, rewind, rematerialize, or subscribe to live VFS-backed repository state in a browser without Node filesystem access.
- Use [the self-evolving canvas sample](../../../samples/self-evolving-canvas/README.md) as a minimal reference for a browser agent that persists JSON-render widget changes and gossips live repository history between peers.
- Use [the self-evolving dashboard sample](../../../samples/self-evolving-dashboard/README.md) as the minimal generated UI reference for `createBrowserEpoch`, `EpochProvider`, and `trackGeneratedUiChange`.
- Return explicit unsupported errors for operations that require native Git or unrestricted filesystem access.
