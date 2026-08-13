# ADR-0040: One Community Command Layer For Web, WebMCP, CLI, And SDK

Status: Accepted; runtime, adapters, and browser UI workspace implemented

## Context

Community Web, Community Web, the Community CLI, the Core CLI, and the browser
integration packages each grew their own way to perform an operation. Community Web
shares an action registry between its buttons and its WebMCP tools, but that
registry is page-scoped. The Community CLI had its own parser and required a
host-injected client context, which the published binary never supplied. The
browser had an append-only tracked-change ledger but no vocabulary for views,
proposals, diffs, merges, or recovery, so any application wanting those would
have invented them privately against the raw repository object.

With no shared layer, authorization, confirmation, error semantics, and audit
metadata drift by construction, and "the agent can do exactly what a person can
do" degrades into two implementations that merely look alike.

Separately, a self-modifying interface needs a boundary. Generated UI is
model-authored, untrusted input; if the generated layer can rewrite its own
validator, component allowlist, tool registry, or recovery controls, it is not
safely self-modifying regardless of how the output is parsed.

## Decision

- `@epoch/community-runtime` owns one command bus, one query surface, and one
  receipt schema. UI, prompt, WebMCP, CLI, SDK, and API are adapters over it and
  may not reach past it to mutate repository state.
- Receipts carry `commandId`, kind, source, actor, workspace, base/proposal refs,
  revision and event ids, a policy receipt, a validation receipt, and a
  confirmation state. Identifiers are content digests of their inputs, so the
  same command from two interfaces yields the same `commandId`. The digest is
  drift detection and is never presented as a signature.
- Capability and confirmation checks live in the command layer. Tool visibility,
  a rendered button, or browser availability are not authorization. Consequential
  commands — merge, revert, restore, leaving safe mode — return a `confirm`
  receipt and change nothing until the caller confirms explicitly.
- `createBrowserEpochWorkspace` extends `BrowserEpoch` with named views,
  proposals, semantic diff, validated merge, append-only revert, last-known-good
  promotion, safe mode, and materialization. Rollback appends; it never rewrites
  or deletes history.
- A `StaticHarnessRelease` is content-addressed and declares the slot ABI, the
  component and action allowlist, permitted theme tokens, and the safe-mode
  manifest. Dynamic revisions are declarative placements plus a theme patch —
  never code — and are validated against the installed release. Invalid revisions
  are recorded and remain inspectable, cannot be merged, and are not rendered.
- Scope (`personal`, `project`, `session`) is a manifest field, so a personal
  preference change cannot become a community-wide publish implicitly. Prompts
  are stored as digests unless the caller opts into retaining the text.
- WebMCP registration awaits `registerTool`, carries an `AbortSignal` for
  lifetime, and sets `readOnlyHint`/`untrustedContentHint` from the command
  descriptor. Unannotated tools are treated as consequential.
- `epoch` is the canonical binary: `epoch ui …` and `epoch view …` route into
  the runtime, `epoch community …` into the Community CLI implementation.
  `epoch-community` remains a compatibility binary over the same code and
  configures itself from `--remote` or `EPOCH_COMMUNITY_URL`.

## Escape And Consequences

Adapters can be removed without touching the runtime; the runtime can be embedded
without any adapter. Nothing here adds a runtime dependency: the package depends
only on `@epoch/integration-core`, keeps no DOM or React code, and injects its
clock so receipts stay reproducible.

Two limits are deliberate and stated rather than implied. The digest is not
cryptographic, and signed provenance remains Core's job. The harness release is
installed and verified for drift, not signed by a trusted party; introducing real
release signing is a separate decision.

The browser workspace still stores through `BrowserEpoch`, which defaults to
`localStorage`. That is acceptable for UI state and unsuitable as a general
object store; asynchronous storage is the next workstream, and this ADR does not
claim it.

## Revisit Criteria

Revisit when browser storage moves to IndexedDB/OPFS, when harness releases gain
real signatures, when the Community remote gains native ref and object
synchronization, or if a second consumer needs a command shape the bus cannot
express without adapters reaching around it.
