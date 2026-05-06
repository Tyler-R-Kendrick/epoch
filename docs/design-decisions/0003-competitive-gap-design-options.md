# ADR-0003: Competitive Gap Design Options

Status: Accepted

## Context

Epoch already has a signed event log, content-addressed blobs, local
filesystem sync, intent policy, named views, lifecycle hooks, operation CRDT
events, compacts, Git import/export adapters, WASM-safe exports, and React state
history helpers. This document looks at competitive and adjacent systems to
identify design gaps worth exploring without copying the operational faults of
those systems.

The comparison uses the repository's inspiration archive plus current public
project docs for adjacent tools:

- Git and Git-adjacent workflows, represented by
  [git-warp](../../.inspiration/git-warp/README.md) and Epoch's Git adapter
  surface.
- Decentralized forges, especially
  [Radicle](../../.inspiration/radicle/README.md) and the current
  [Radicle overview](https://radicle.dev/).
- Patch-theory DVCS ideas from
  [Pijul](https://pijul.com/manual/why_pijul.html) and its
  [channel](https://pijul.org/manual/workflows/channels.html) and
  [conflict](https://pijul.org/manual/conflicts.html) docs.
- Operation-log DVCS ergonomics from
  [Jujutsu](https://jj-vcs.github.io/jj/latest/technical/concurrency/) and its
  [working-copy](https://jj-vcs.github.io/jj/latest/working-copy/) docs.
- Local-first CRDT engines and app databases, including
  [Automerge Repo](https://automerge.org/docs/reference/repositories/),
  [Automerge storage](https://automerge.org/docs/reference/under-the-hood/storage/),
  [Yjs](https://yjs.dev/), and
  [GoatDB](https://goatdb.dev/) with its
  [sync protocol](https://goatdb.dev/docs/sync/).
- Versioned data and database workflows from
  [Dolt](https://docs.dolthub.com/).
- Blockchain and enterprise-ledger VCS concepts in
  [SolGit](../../.inspiration/solgit/README.md) and
  [BDA-SVC](../../.inspiration/bda-svc/README.md).

## Competitive Gaps

1. Decentralized collaboration objects are valuable, but existing designs tend
   to be tied either to Git object storage, long-running local nodes, hosted
   forges, or heavy enterprise governance.
2. Epoch sync is intentionally simple and local-path based. Competitors have
   richer automatic sync, seed nodes, relays, and pluggable transports, but they
   often add availability, privacy, or operational complexity.
3. Git-style conflict resolution can repeat work after rebases or branch
   movement. Pijul's change identities reduce this, but adopting a full patch
   algebra would significantly raise Epoch's implementation burden.
4. Operation-log systems make recovery and concurrent workspace mutation more
   humane. Epoch has event history and named views, but not yet a user-facing
   operation log or stale-workspace recovery story.
5. App/data engines offer schema-aware live queries and rich entity types.
   Epoch has CRDT map/text operations and JSON/text merge defaults, but does not
   yet package reusable entity adapters for tables, typed documents, or domain
   projections.
6. Browser-local-first systems have excellent live state ergonomics. Epoch has
   React state history, but not browser peer sync, awareness, or hook-level
   projections over full repository state.
7. Permanent audit logs can preserve too much. Blockchain-inspired systems make
   secrets and personal data nearly impossible to remove, while mutable forges
   can erase too much without durable evidence.
8. Forge policy and CI are usually centralized or encoded in heavy smart
   contracts. Epoch has signed `approval`, `rejection`, and `ci` event types,
   but no complete gate/policy pipeline around them.

## Option 1: Signed Collaboration Objects

Build first-class collaboration objects as signed Epoch events: issues,
patches, review threads, review decisions, labels, and discussion state. They
would project like intents do today, with deterministic object views keyed by
stable event IDs. The CLI could grow commands such as `epoch issue`,
`epoch review`, and `epoch patch status`, while the SDK exposes object
projection helpers.

This fits Epoch because `intent`, `intent.comment`, `approval`, `rejection`,
named views, and deterministic policy are already present. The new work is a
more general object schema and projection layer, not a replacement for the
event log.

What this avoids:

- It does not require a Radicle-style always-configured node before local
  collaboration artifacts are useful.
- It does not hide social state inside a Git-only object model.
- It does not require a hosted forge account, central username namespace, or
  blockchain governance.

Risks:

- Object schemas can sprawl quickly.
- Review UX can become poor if the CLI is the only consumer.
- Cross-repository object references need strict validation to avoid spoofed
  issue or patch identities.

Best first slice:

- Add a `thread` projection over existing comment and intent events.
- Add a signed `review` event that references an intent and carries approved,
  changes-requested, or informational state.
- Keep all rendering read-only until the projection has feature coverage.

## Option 2: Pluggable Sync And Availability Tiers

Define an `EpochTransport` interface that can exchange event IDs, heads, blobs,
compact manifests, and missing content through local paths, file bundles,
WebSocket relays, or seed repositories. Sync would remain explicit by default,
but transports could support watch mode for applications that want automatic
convergence.

This adapts Automerge Repo's pluggable storage/network separation, GoatDB's
round-trip-conscious commit graph sync, Radicle's seed-node availability idea,
and Yjs' network-agnostic posture. Epoch should keep a smaller trust model:
transport moves bytes, while verification decides whether bytes are acceptable.

What this avoids:

- It does not make a public gossip network part of the core prototype.
- It does not copy IPFS pinning governance or enterprise ordering services.
- It does not make the server authoritative. A relay can be dumb storage.
- It does not make automatic sync the only workflow; explicit sync remains a
  safe baseline.

Risks:

- Transport APIs can leak policy assumptions if they expose "accepted" state
  instead of raw verifiable content.
- Blob availability needs careful partial-sync behavior.
- Browser transports need a WASM-compatible storage story.

Best first slice:

- Introduce a transport contract behind the existing local path sync.
- Add a bundle transport that writes a signed sync packet to disk.
- Add tests proving transport output still requires `verify()` before trust.

## Option 3: Reusable Conflict Resolutions

Represent conflict resolutions as signed events that reference the conflicting
event IDs, entity path, base hash, left/right hashes, resolver, and resolved
blob or CRDT operation. Deterministic projections could reuse the same
resolution anywhere the same conflict appears, including across named views.

This borrows Pijul's useful idea that conflicts are between changes and that a
resolution should itself be a change. Epoch should not adopt full patch theory
up front; it can instead use stable event IDs, blob hashes, and entity adapters
to make common repeated conflicts less tedious.

What this avoids:

- It does not require replacing Epoch's append-only event DAG with a new patch
  algebra.
- It does not rely on Git rerere-style local cache state that cannot be audited
  by peers.
- It does not pretend text merge heuristics understand program semantics.

Risks:

- Bad resolution reuse is worse than a repeated conflict.
- Resolution matching must be precise enough to avoid false positives.
- Binary and directory conflicts need conservative unsupported states until
  entity adapters can model them.

Best first slice:

- Add `intent.resolve` events only for text and JSON entity conflicts.
- Reuse a resolution only when base, left, right, entity type, and path hashes
  match exactly.
- Expose a `resolve --record-resolution` CLI flag once feature scenarios prove
  the projection.

## Option 4: Local Operation Log And Workspace Recovery

Add a local operation log for repository commands and workspace checkouts. Each
operation would record the command name, start heads, resulting heads, current
view, touched paths, timestamp, and result status. It can live in `.epoch/ops`
as local recoverability metadata, with an option to sign and share selected
operation checkpoints later.

This adapts Jujutsu's humane operation-log and stale-working-copy concepts to
Epoch's named views and existing event frontier. Epoch's public signed event log
remains the source of truth; the operation log is a recovery and explanation
tool.

What this avoids:

- It does not make local filesystem conflict markers the only source of
  unresolved state.
- It does not force all local recovery metadata into the shared signed ledger.
- It does not require lock-free repository mutation before the current
  single-process implementation needs it.

Risks:

- Local-only metadata can diverge from signed repository state.
- Users may mistake operation recovery for history rewriting.
- Workspace checkout recovery has to be path-safe and must not restore files
  outside the repository root.

Best first slice:

- Record local operation entries for `record`, `intent`, `checkout`, `sync`,
  and `rollback`.
- Add `epoch op log` and `epoch op show`.
- Add stale checkout detection when a named view's projected files no longer
  match the last operation entry.

## Option 5: Entity Adapter Packs

Package merge, validation, diff, materialization, redaction, and display rules
as reusable entity adapters. Built-in packs could cover text, JSON, ordered
lists, tabular CSV, Markdown front matter, and small typed documents. External
packs can register through the SDK and be made available to the CLI.

This adapts the schema-aware strengths of GoatDB and Dolt without turning Epoch
into a database server. Epoch should version files, events, and projections; it
does not need to become MySQL-compatible or own a query optimizer.

What this avoids:

- It does not require SQL compatibility or table storage to get typed merge
  behavior.
- It does not make every app adopt one CRDT engine or schema system.
- It does not hide validation failures inside automatic sync.

Risks:

- Adapter APIs can become a second plugin platform if they include too much.
- Deterministic behavior must be enforced across Node, WASM, and future browser
  hosts.
- Third-party adapters are security-sensitive if they process untrusted blobs.

Best first slice:

- Generalize `CRDTRegistry` into an `EntityRegistry` that keeps current text and
  JSON behavior.
- Add a CSV adapter with deterministic row-keyed merge and focused feature
  scenarios.
- Require adapter docs to state determinism, unsupported cases, and redaction
  behavior.

## Option 6: Browser Live Repository Surface

Expand `@epoch/wasm-react` from local state history into a live repository
surface: `useEpochEntity`, `useEpochView`, `useEpochHistory`, and optional
transport-aware synchronization. Signed durable state remains separate from
ephemeral awareness such as cursor position, presence, and draft typing state.

This adapts Yjs and Automerge's developer ergonomics while preserving Epoch's
auditability. React apps should get live local-first behavior without losing
the ability to verify signed events, rewind history, or export to host tools.

What this avoids:

- It does not permanently sign ephemeral awareness data into repository
  history.
- It does not make browser sync depend on a single provider or hosted service.
- It does not replace the core event model with an opaque CRDT document URL.

Risks:

- Browser storage quotas can surprise users if full event logs are kept
  indefinitely.
- WASM and Node projections must remain byte-for-byte compatible.
- React hooks can hide expensive materialization if they are too magical.

Best first slice:

- Add a read-only hook over current materialization and history.
- Add a memory transport used only in browser tests.
- Add compaction-aware persistence before enabling long-running browser sync.

## Option 7: Secret-Safe Audit And Redaction Workflow

Add an explicit redaction workflow for sensitive blobs and personal data. A
redaction event would identify affected blob hashes or event payload fields,
state the reason, and point to a compact or replacement projection that omits
the sensitive material while preserving a signed audit trail that a redaction
occurred.

This learns from blockchain VCS failures: immutable audit is useful until it
preserves secrets forever. Epoch should be honest that old peers may retain old
bytes, but it can give operators a deterministic, verifiable path for local
cleanup and future sync policy.

What this avoids:

- It does not promise impossible global deletion from peers that already copied
  data.
- It does not keep plaintext secrets in a public immutable ledger by design.
- It does not silently rewrite history without leaving a signed reason.

Risks:

- Redaction policy is security-sensitive and easy to overpromise.
- Existing compacts and backups need explicit compatibility rules.
- Sync must learn to reject or quarantine redacted payloads safely.

Best first slice:

- Add docs and verification checks for redaction markers before changing blob
  storage.
- Add a local `epoch redact plan` command that reports affected events, blobs,
  compacts, and backups.
- Only then add signed redaction events and compact filtering.

## Option 8: Signed Gate Pipeline

Build a deterministic gate pipeline over signed `approval`, `rejection`, `ci`,
and intent decision events. Policies would be pure projections: required
reviewers, required CI names, status freshness windows, maintainer sets, and
view-promotion requirements. The CLI could expose `epoch gate status`,
`epoch ci record`, and `epoch promote --require-gates`.

This adapts hosted forge checks and enterprise policy engines to Epoch's local,
signed event model. It also gives named views a clearer route to become release,
staging, or production projections.

What this avoids:

- It does not require smart contracts, certificate authorities, or ordering
  services to express policy.
- It does not require GitHub, GitLab, or another forge to be authoritative.
- It does not merge mutable CI database state into trusted history without a
  signed attestation event.

Risks:

- CI attestations can be forged if runner identity is not constrained.
- Policy can become hard to explain if it is too expressive.
- Stale status windows need deterministic clock handling.

Best first slice:

- Add a `GatePolicy` document format and projection tests over existing event
  types.
- Add a CLI command that reports why an intent or view is blocked.
- Defer external CI adapters until the local policy model is stable.

## Recommended Sequencing

1. Start with Option 8 and a small part of Option 1. They amplify intent policy,
   approvals, comments, and named views that already exist.
2. Add Option 2's transport contract after the gate pipeline can decide which
   synced events are acceptable.
3. Add Option 4's local operation log to improve day-to-day safety before
   adding more automatic sync.
4. Add Option 5 and Option 6 incrementally as SDK and browser demand becomes
   concrete.
5. Treat Option 7 as a prerequisite before any public relay, seed, or hosted
   availability story.
6. Keep Option 3 scoped to exact-match reusable resolutions until entity
   adapters provide better semantic matching.

## Non-Goals

- Do not adopt blockchain consensus for repository mutation.
- Do not make a server, relay, seed, or hosted forge authoritative for local
  repository truth.
- Do not require a long-running node for basic offline collaboration objects.
- Do not replace Git compatibility with Git dependence.
- Do not make irreversible public storage the default for sensitive content.
- Do not claim conflict-free code semantics where the entity adapter cannot
  prove deterministic, reviewable behavior.

## Revisit Criteria

Revisit these options when one is selected for implementation, when Epoch adds
networked sync, when browser live collaboration becomes a product goal, or when
security requirements require key rotation, redaction, or maintainer identity
policy beyond the current local Ed25519 model.
