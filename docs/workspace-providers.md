# Workspace Providers

Workspace selection is independent from object residency and execution isolation.

- `manifest` is the portable default. It records selected paths and promised content and hydrates explicitly.
- `reflink` probes the destination filesystem and reports the actual clone or fallback mode.
- `rift` is opt-in, invokes no hooks by default, validates arguments, and reports unavailable instead of impersonating Rift.
- browser providers use the shared verified object contracts for memory, IndexedDB, or OPFS implementations.

Metadata records resident objects, materialized paths or ranges, actual storage mode, and any separate sandbox identifier. Two logical workspaces in one process are not execution-isolated. The filesystem provider rejects traversal and existing symlink targets before writes or removal.

The manifest provider's "selected paths" are the paths it materialized, not a
declared user interest. A first-class Workspace Selection, named materialization
modes, and composition across Repository Links are designed but not implemented;
see [Repository Composition And Workspace Selection](repository-composition-and-selection.md).

See [ADR-0032](design-decisions/0032-residency-native-sync-and-workspace-providers.md).
