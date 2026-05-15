# ADR-0009: Native Working Tree Lifecycle

Status: Accepted

## Context

Epoch already records file content as signed `record` events and can project
versions from repository history. That model is not enough for a complete
working-tree experience. Path-only snapshots cannot explain whether a user
intended to rename, copy, delete, or stop tracking a file, and `push` discovery
needs repository-specific ignore and configuration behavior.

Git compatibility is not sufficient for this layer. Git's `mv` command is
familiar, but Git commits do not store rename metadata as a durable object;
rename display is inferred later by diff heuristics. Epoch can preserve the
familiar command shape while recording explicit signed lifecycle intent.

## Decision

Epoch will expose native working-tree commands in the main `epoch` CLI:

- `epoch mv FROM TO`
- `epoch rm PATH`
- `epoch cp FROM TO`
- `epoch track [--include-ignored] PATH`
- `epoch forget PATH`
- `epoch status [--ignored]`
- `epoch check-ignore PATH`
- `epoch config get KEY`
- `epoch config path [--scope local|shared]`

Moves, copies, deletes, and forgets are signed Epoch events:

- `file.move`
- `file.copy`
- `file.delete`
- `file.forget`

These events participate in named-view projection like records and CRDT
operations. Version manifests are derived from the projected file state after
applying records and lifecycle events.

Ignore discovery reads shared `.epochignore`, local `.epoch/info/exclude`, and
an optional TOML-configured global ignore file. Ignore rules affect untracked
discovery and automatic `push` capture; they do not silently untrack files that
are already recorded.

Repository configuration uses TOML. Local machine settings live in
`.epoch/config.toml`. Shared project policy can live in `epoch.toml` and be
recorded like any other file.

## Consequences

Positive:

- Epoch preserves explicit rename, copy, delete, and untrack intent in signed
  history instead of relying only on path snapshots.
- Native commands avoid making Git compatibility the only ergonomic path.
- Ignore and config behavior are available before a repository is initialized,
  which improves onboarding and workspace diagnostics.
- TOML gives repository behavior a typed, readable configuration format without
  mixing glob lists into structured config.

Trade-offs:

- Lifecycle projection is now part of the security-sensitive repository state
  model and must stay deterministic.
- The first implementation supports simple glob rules rather than the full
  breadth of Gitignore syntax.
- Move-aware conflict resolution is still a later layer. The current projection
  records lifecycle intent but does not yet classify move/edit or move/delete
  conflicts as a separate conflict family.

## Revisit Criteria

Revisit this decision if:

- users need full Gitignore compatibility such as negation patterns and nested
  directory precedence;
- move/copy conflict handling becomes central to collaboration workflows;
- TOML config grows enough surface area to require a dedicated parser
  dependency; or
- Git import/export needs to round-trip explicit lifecycle metadata across
  systems that cannot represent it natively.

## Related Documents

- [CLI Reference](../cli.md)
- [Current Design](../design.md)
- [Feature Registry](../features.md)
