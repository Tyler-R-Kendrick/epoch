# ADR-0059: Live Spaces — Signed Semantic Live Sessions Over Spaces

Status: Accepted; semantic-only core implemented (protocol events, Core store, publication engine, presentation log, command family, provider-neutral media ports with disabled/fake providers)

## Context

Epoch already ships the two halves a public live session needs: Spaces
(ADR-0043) provide shared, signed, joinable workspaces with grants, budgets,
consent-gated capture, and per-turn receipts; command livestream privacy
(ADR-0050) provides sanitized command envelopes instead of pixels. What is
missing is the connective tissue: a signed session lifecycle bound to an
existing Space, a publication policy that is fail-closed enough for a public
network, deterministic ordering and recovery for spectators, and a path from
"I watched this" to "I forked this exact state and proposed a Change".

The broad "multiplayer editor + voice + public audience" bundle is already
occupied (Zed channels and Delta). The defensible wedge is provenance:
public development as a signed, governed, replayable event graph a spectator
can inspect, verify, annotate, fork at an exact checkpoint, and continue.

The prior stream-policy implementation was not safe enough for a public
network: argument rewriting was shallow (nested objects and arrays could
carry secrets), user-supplied JavaScript regular expressions could backtrack
catastrophically, ignore-rule negation could in principle fight the deny
defaults, unknown action IDs were not modeled, and no sequence, delay queue,
duplicate suppression, or gap recovery existed.

## Decision

- A **Live Session** is a publication and audience session bound to one
  existing `Space` and its View. It is not a new history primitive, not a
  new branch/frontier model, and not a replacement for Space membership or
  grants. Five new validated protocol events carry it in the same signed
  history: `live.session.created` (with `sessionKind: "live"` for domain
  separation from capture sessions), `live.session.lifecycle`,
  `live.session.policy`, `live.session.consent`, `live.session.sealed`.
- `SignedLiveSessionStore` (`@epoch/core`) composes over `SignedSpaceStore`:
  Space owners manage lifecycle, any active participant records consent,
  observers hold no lifecycle authority, `start` requires recorded
  semantic-capture consent against the current policy digest, sealing hashes
  the replay manifest, and a sealed session refuses every further mutation.
  Everything reconstructs deterministically from events.
- The **publication policy** (`@epoch/community-runtime`) is a normalized,
  bounded, digested allow-list. Publication starts from nothing visible.
  Contradictory security modes are refused at normalization: `semantic-only`
  with media, `private-e2ee` with provider recording/egress, public
  synchronized audio without captions. Policy replacement is classified
  `narrowing`/`widening`/`mixed`; widening requires explicit confirmation
  and clears recorded consent; narrowing applies immediately and invalidates
  queued-but-unreleased envelopes.
- The **sanitizer** is total, recursive, and bounded: JSON shapes only;
  accessors, class prototypes, symbols, cycles, `__proto__`/`constructor`/
  `prototype` keys, over-deep or oversized payloads, bigints, and non-finite
  numbers all fail closed with reason codes that never carry the refused
  value. Secret-named keys (normalized against case/separator/Unicode
  disguises) and secret-shaped values (bearer tokens, PEM blocks) drop the
  envelope as `immutable-deny`. The immutable deny baseline for paths is
  evaluated before, and independently of, user rules — negation cannot touch
  it. User rewrite rules are a literal/glob language; regular-expression
  constructs are refused at compile time, so no attacker-authored pattern
  executes in the publication hot path.
- The **presentation log** assigns a monotonic sequence at release; sequence
  is the only ordering authority (wall time is informational, media time is
  never canonical). The delay queue holds source references and re-sanitizes
  against the current policy at release; the queue is bounded and overflow
  fails closed into a degraded health state. Spectator projections
  deduplicate by sequence + payload digest, quarantine conflicting
  duplicates, report gaps, and resynchronize from a checkpoint plus deltas.
  Replay decisions are confined to `presentation-local`/`read-only-query`
  effects from an explicit stream-safe action catalog whose default is deny;
  host theme preferences never replay into a spectator's view.
- `live.presentation.forkAt` accepts a checkpoint, never a media timestamp,
  and refuses unverified, unauthorized, unavailable, or policy-prohibited
  state. A successful fork records provenance back to session + checkpoint.
- All `live.*` commands ride the existing command bus (ADR-0049) as
  extensions: same capability checks, same confirmation rules (start, end,
  seal, configure, grant, revoke confirm explicitly), same receipt schema
  from web, prompt, WebMCP, CLI, and SDK. Handler outcomes may now be
  promises; the bus awaits both shapes compatibly. A missing application
  port yields an honest `unavailable` receipt, not a crash.
- **Media is optional and subordinate.** `@epoch/community-api` defines a
  provider-neutral server port plus `disabled` and deterministic `fake`
  providers (injected clock, failure injection, idempotent operations,
  webhook verification with content-type/size/signature/room-binding/dedup
  checks, opaque `egress-ref:` destinations only). Capability labels are
  honest: `provider-disabled`, `sample`, `unavailable` — never `production`
  for a fake. E2EE modes refuse provider recording, egress, and server
  transcription; the caption gate blocks public synchronized audio/video
  without a ready live-caption provider (WCAG 2.2 SC 1.2.4).

## What this ADR does not claim

- No LiveKit adapter ships yet; `livekit` is a declared provider kind only.
  No third-party media SDK was added, and no test requires a network.
- No hosted transport (SSE/WebSocket routes), Community Web UI surface,
  telemetry pipeline, or moderation service ships in this slice; the
  browser-safe engines and ports they will compose are what shipped.
- Transport encryption is not E2EE; released public bytes cannot be
  recalled; retention controls delete controlled copies only. Consent
  records are evidence, not a universal legal conclusion.

## Consequences

- The semantic-only flow is a complete local product with no third-party
  credentials, and every mutation already flows through one command path,
  so the hosted API, web surfaces, and a real LiveKit adapter can be added
  behind the existing ports without new authority models.
- The stream-policy v1 surface (`sanitizeStreamCommand` et al.) remains for
  the existing board livestream; Live Spaces use the hardened engine. Both
  fail closed; convergence of the board adapter onto the new engine is the
  revisit path.

## Revisit criteria

- Before shipping a hosted Live Space transport, revisit connection
  authentication, origin allow-lists, rate limits, and join-link hashing
  against the threat model in [docs/live-spaces.md](../live-spaces.md).
- Before enabling a real media provider, review its SDK dependency,
  token-issuance path (server-only, least-privilege, short TTL), webhook
  verification, and revocation semantics against the provider-neutral
  contract tests.
- If the Community Web board adapter migrates to the hardened engine,
  update ADR-0050's implementation record.
