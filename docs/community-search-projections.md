# Community Search And Projections

Epoch Community searches canonical Entities and presents them through
user-defined namespaces without changing identity. This document is the public
semantic reference for the text language, GraphQL boundary, source adapters,
Projection Definitions, Namespace Mounts, migration, and recovery.

The normative vocabulary is [Epoch Nomenclature](nomenclature.md); the decision
and trade-offs are [ADR-0042](design-decisions/0042-deterministic-search-and-mounted-projections.md).

## Authority And Data Flow

```text
registered Source Adapters
        │ capabilities + checkpoints + authorized Entities
        ▼
canonical Community state
        │
        ▼
Search Service
parse → type-check → authorize → plan → execute → residual → explain
        │
        ├─ Core reference backend (semantic authority)
        ├─ Orama browser lexical accelerator
        └─ SQLite WASM/FTS browser read model
        │
        ▼
Projection Definition → Projection Entries → Namespace Mounts
```

Canonical state contains Entities, explicit relations, Projection Definitions,
Namespace Mounts, source checkpoints, timestamps, and migration metadata.
Indexes are disposable. Paths are aliases. Search text is not stored as the
semantic form. AI is not called by ordinary parse, search, projection, or
namespace operations.

## Text Search Language

The text frontend is strict and deterministic. Examples:

```text
state:needs-review
author:maya AND has:reactions
kind:(issue OR change)
updatedAt:>=2026-08-01T00:00:00Z
score:[10 TO 100]
NOT visibility:private
"projection engine"
title:proj*
related.reply:object-123
sort:updatedAt:desc
```

Supported forms are parentheses, `AND`, `OR`, `NOT`, leading `-`, implicit
`AND`, escaped phrases, field groups, typed comparisons, inclusive/exclusive
ranges, `field:*` existence, approved prefix terms, relation predicates, and a
typed total sort. Field aliases normalize through the Field Registry.

Contextual values such as `me`, `today`, and relative durations resolve once
against the actor, timezone, locale, and injected clock. Their concrete values
are recorded in the Normalized Query and Search Snapshot. Invalid syntax,
unknown fields, unsupported field/operator pairs, invalid enum values, and
excessive cost fail with a span, stable code, and suggestions. Epoch does not
accept regex, hidden fuzzy matching, boost/proximity syntax, scripts, SQL, or
silent best-effort recovery.

Human text compiles to a Search Expression. Programmatic callers send a Search
Expression directly; they do not generate query text and ask Epoch to parse it.

## GraphQL

`@epoch/community-graphql` is portable across browser and server hosts. Its
structured `SearchExpressionInput` uses GraphQL `@oneOf`; text parsing is
available separately through `parseSearch`. The schema exposes:

- node lookup, search, parse, and search explanation;
- Projection Definition list/get/save/delete;
- namespace list, resolve, locate, and explanation;
- Namespace Mount list/mount/unmount/reset;
- source capabilities and freshness;
- projection-delta subscriptions.

Connections use snapshot-bound keyset cursors. The host injects authorization;
the package does not read browser globals, filesystem persistence, or raw
claims. Hidden fields do not become completion or explanation material.

## Planning, Snapshots, And Pagination

A Search Plan binds:

- canonical Search Expression and total order;
- source-specific pushdown plus a Core residual;
- authorization fingerprint;
- resolved time, locale, and timezone;
- Field Registry and analyzer versions;
- source checkpoints;
- bounded cost and result limit.

Every total order ends in canonical kind and object ID tie-breakers. Relevance
is opt-in and volatile unless bound to an analyzer/index snapshot. Projection
directories default to stable explicit order.

Cursors are opaque, bounded, and integrity-protected across a server boundary.
They reveal no query text, path alias, content, or credentials. Epoch rejects a
cursor whose snapshot, plan, authorization, projection version, schema version,
or source checkpoints do not match. Array offsets are not cursors.

Search results report `complete`, `partial`, `stale`, or `approximate`, with
per-source checkpoints, omitted sources, and unsupported predicates. A missing
or failed source never silently becomes an empty complete result.

## Source Adapters

A Source Adapter declares its fields, operators, full-text level, pagination,
point lookup, relation, watch, and page-size capabilities. It returns canonical
Entities with stable native mapping and provenance plus an explicit checkpoint.

The included source contracts cover canonical Community state, Nightboard host
data, and authorized public ATProto records. Source-native keys are queryable
only after validated namespaced registration. A failed page does not advance a
checkpoint. Replayed upserts/deletes are idempotent; deletion produces a typed
tombstone/change set.

Adapters do not implement private query semantics. Pushdown is an optimization;
Core applies residual semantics and final authorization. New adapters should
use the source conformance harness for stable IDs, pagination termination,
checkpoint behavior, cancellation, malformed data, provenance, and privacy.

## Projection Definitions

A Projection Definition is deterministic versioned JSON using
`apiVersion: "epoch.dev/v1alpha1"`. Its node algebra is:

| Node | Purpose |
|---|---|
| `literal` | Add a fixed safe branch. |
| `select` | Select authorized Entity kinds with an optional Search Expression. |
| `group` | Group by one approved field and segment template. |
| `traverse` | Follow one explicit relation within a bounded depth. |
| `union` | Compose branches without merging Entity identity. |
| `alias` | Place one target Entity at an explicit contextual name. |
| `leaf` | Render the default, `body.md`, or `metadata.json` representation. |

Templates permit only `slug`, `shortId`, `date`, `lower`, `upper`, `coalesce`,
`pad`, `truncate`, and `replace`. Inputs come from approved fields or canonical
identity. Slash, backslash, NUL, control characters, traversal, ambiguous
Unicode, empty output, and recovery-name collisions fail or escape
deterministically. There is no embedded code.

Compilation checks cycles, recursion, depth, relation depth, fanout, inaccessible
fields, templates, and unstable order. Listing is lazy by path and page; it does
not materialize the entire hierarchy.

Each Projection Entry has an occurrence `entryId` and canonical `target`. The
same target can occur in many definitions or multiple times in one definition.
Equal normalized names receive a stable hash suffix derived from target and
occurrence branch—not arrival order or result position. Explanation reports
the original segment, normalization, collision set, and final name.

## Namespace Mounts And Recovery

Mount scope precedence is:

```text
session > user > workspace > community > builtin
```

Within one scope, explicit order precedes lexical mount ID. `replace`, `before`,
and `after` follow ordered union semantics: lookup uses the first visible match;
listing returns a deterministic union and retains shadow metadata for explain.

Definitions are read-only by default. A create/write operation is allowed only
when exactly one authorized mount is explicitly writable. Removing an alias is
not deleting its target Entity. Existing mutations always carry canonical ID;
ambiguous writes fail closed.

These paths cannot be replaced, shadowed, removed, renamed, or made private:

```text
/.epoch/default
/.epoch/canonical
/.epoch/projections
/.epoch/sources
/.epoch/diagnostics
```

Namespace reset removes mounts in the requested user/workspace/session scope,
restores the built-in root, and preserves invalid definitions for export.

## Browser Backends And Offline Behavior

The reference backend is dependency-free and defines semantics. Orama is the
selected browser lexical candidate engine; Core retains authorization,
residual, ordering, pagination, facets, suggestions, and explanation. SQLite
WASM/FTS5 is the selected optional Worker read model with runtime FTS5 and OPFS
detection. Its integration must use parameterized statements and an AST
translator, not user SQL.

OPFS capability, VFS selection, quota, locking, and multi-tab single-writer
coordination are explicit. If SQLite cannot open, the browser falls back to
Orama or the reference backend without losing canonical data. Removing the
index triggers rebuild rather than data loss. Static/offline use remains
available for resident data.

Backend conformance and browser persistence status are recorded in the
[evidence index](evidence/community-search-projection/README.md). A dependency
pin or interface alone is not evidence that a backend passed.

## Persistence And Recovery

The authoritative schema stores stable IDs and timestamps as schema version 3
only. Earlier on-disk bags are refused. Seed helpers may quarantine invalid
Projection Definitions while building current state for tests and fixtures.

Recovery procedure:

1. Open `/.epoch/diagnostics` to inspect schema, source, snapshot, and index
   health.
2. Export quarantined definitions before resetting a namespace.
3. Use `/.epoch/default` to regain the built-in hierarchy.
4. Use `/.epoch/canonical/<kind>/<objectId>` to locate an authorized Entity
   independently of projections.
5. Reset only the affected user, workspace, or session mounts; canonical state
   remains intact.

## Security And Privacy

Authorization happens before ranking, score, count, facet, suggestion,
completion, group, path, collision suffix, error detail, or explanation. Two
corpora that differ only in unreadable Entities must be observationally
equivalent for the caller. Query, AST, relation, source, cursor, GraphQL,
template, path, SQL/FTS, and subscription complexity are bounded.

Private content, query text, aliases, participants, credentials, and raw claims
never enter routes, history, action events, notification tags, mount IDs, or
cursor plaintext. Ordinary search/projection telemetry records bounded operation
metadata and error codes, not query content.
