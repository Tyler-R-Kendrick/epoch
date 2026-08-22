# Live Spaces

A **Live Space** is a signed live session bound to an existing Epoch
[Space](design-decisions/0043-spaces-shared-signed-workspaces.md): one View
selects what an audience may see, publication is a fail-closed allow-list of
sanitized semantic actions, spectators verify and replay released state in
their own view, and work a session produces continues as normal signed Epoch
history. Voice and visual media are optional attachments to that canonical
semantic session — never its source of truth.

See [ADR-0059](design-decisions/0059-live-spaces-semantic-sessions.md) for
the decision record, and [`features/live_spaces.feature`](../features/live_spaces.feature)
for the executable persona journeys.

## What ships today

| Capability | State |
|---|---|
| Signed session lifecycle over an existing Space (`draft → lobby → live ⇄ paused → ended → sealed`) | Implemented (`SignedLiveSessionStore`, `@epoch/core`) |
| Protocol events `live.session.{created,lifecycle,policy,consent,sealed}` with strict body validation and JSON Schema | Implemented (`@epoch/protocol`) |
| Normalized, bounded, digested publication policy with security-mode contradiction refusal | Implemented (`@epoch/community-runtime`) |
| Recursive fail-closed sanitizer, immutable deny baseline, constrained rewrite rules | Implemented (`@epoch/community-runtime`) |
| Deterministic presentation log: sequence authority, bounded delay queue, checkpoints, duplicate/gap handling, read-only replay decisions, exact-point fork eligibility | Implemented (`@epoch/community-runtime`) |
| `live.*` command family on the shared command bus with receipts, confirmation, and capability checks | Implemented (`@epoch/community-runtime`) |
| Local in-memory semantic-only application port (no credentials, no network) | Implemented (`createLocalLiveSpacePort`) |
| Provider-neutral media + caption ports; `disabled` and deterministic `fake` providers; E2EE/recording refusal; caption gate | Implemented (`@epoch/community-api`) |
| Semantic transport port, deterministic in-memory transport, spectator client with gap recovery and bounded reconnect | Implemented (`@epoch/community-runtime`) |
| Hosted HTTP surface: session/command routes, checkpoint and event paging, SSE stream with `Last-Event-ID` resume, origin allow-list, rate limits, bounded subscribers | Implemented (`@epoch/community-api`) |
| Community Web host/spectator UI, telemetry, moderation service | Not yet implemented |
| LiveKit adapter | Not implemented; `livekit` is a declared provider kind only, and no media SDK dependency exists |

`semantic-only` is a complete product: every scenario, test, and command in
this slice runs with the media provider disabled and no third-party
credentials.

## Architecture

```
@epoch/protocol      live.session.* event validation + JSON Schema
@epoch/core          SignedLiveSessionStore over SignedSpaceStore
                     (authority = Space grants; reconstruction from events)
@epoch/community-runtime  (browser-safe)
  live/contracts.ts           states, visibility, security modes, policy
                              normalization + digest, change classification
  live/publication-policy.ts  immutable deny baseline, recursive sanitizer,
                              constrained rewrite rules, preflight
  live/presentation-log.ts    publisher, delay queue, checkpoints, spectator
                              projection, replay decisions, fork eligibility
  live/commands.ts            LiveSpaceApplicationPort + local port +
                              command-bus extensions
  live/transport.ts           transport port, deterministic in-memory
                              transport, spectator client (late join, gap
                              recovery, bounded reconnect)
@epoch/community-api  (server-capable)
  live/media-provider.ts      provider-neutral media/caption ports,
                              disabled + fake providers, mode compatibility
  live/live-session-service.ts  hub fan-out with a per-session broadcast
                              cursor; every read and write is a bus command
  live/live-routes.ts         fetch handler: sessions, commands, join,
                              checkpoint, events, SSE stream
```

## Hosted transport

The HTTP surface is an adapter: it enforces transport-level bounds the domain
cannot see, then hands everything to the shared command bus.

| Route | Purpose |
|---|---|
| `POST /community/live/sessions` | Create a session bound to an existing Space |
| `GET /community/live/sessions/:id` | Session state, policy digest, participants |
| `POST /community/live/sessions/:id/commands` | Any `live.*` command; returns the receipt |
| `POST /community/live/sessions/:id/join` | Scoped observer join |
| `GET /community/live/sessions/:id/presentation/checkpoint` | Late-join checkpoint plus deltas |
| `GET /community/live/sessions/:id/presentation/events?after=&limit=` | Keyset paging by sequence |
| `GET /community/live/sessions/:id/presentation/stream` | SSE with `Last-Event-ID` resume |

Controls that live in the route layer rather than the domain:

- **Exact origin allow-list.** A near-miss origin is a miss; the check runs
  before any authorization work.
- **Command scoping.** Only `live.*` kinds are accepted, and `live.media.*`
  is refused outright — secret-bearing provider operations get dedicated,
  separately authorized routes, never the generic command endpoint.
- **Rate limits** per principal and method, on an injected clock.
- **Bounded subscribers** per session and in total. At the bound a stream is
  refused with `503` and an explicit `refused` frame, never silently starved
  of events a client would not know it was missing.
- **No existence oracle.** An unreadable session, a malformed id, and a
  session that never existed all return the same `404` body.
- **Cursor-based resume.** `Last-Event-ID` is the envelope sequence, so a
  reconnecting spectator names exactly what it has and receives exactly what
  it missed.

The spectator client owns the other half: it hydrates from a checkpoint,
applies deltas through the verifying projection, refetches the exact missing
range when a gap appears, and reconnects on bounded exponential backoff with
jitter — giving up visibly after a bounded number of attempts rather than
retrying forever.

Latency is whatever the deployment's SSE path costs: released envelopes are
pushed to open subscribers as the releasing command completes, with no polling
interval in between. Publication delay, when configured, is a deliberate policy
choice applied before release — not transport lag.

Canonical authority never moves: signed Epoch events, Views, grants, and
receipts stay canonical; transports, browser memory, and media rooms are
projections. A transport never decides trust, and membership never
substitutes for authority — joining a session grants observation only, and a
request for a capability is recorded evidence, never a grant.

## Security modes

| Mode | Semantic projection | Media | Provider recording/egress |
|---|---|---|---|
| `semantic-only` | authorized and signed | none | refused |
| `private-e2ee` | private projection | E2EE | refused — the provider cannot read E2EE media, and no trusted keyed processor is modeled |
| `private-recordable` | private projection | transport-encrypted | allowed after consent |
| `public-broadcast` | public projection | optional public media | allowed after consent, captions, and opaque destination preflight |

Contradictory combinations are refused at policy normalization, not warned
about. Public synchronized audio/video cannot start without a ready live
caption provider (WCAG 2.2 SC 1.2.4). Transport encryption is never labeled
E2EE.

## Publication security engine

- **Allow-list first.** The publisher starts from nothing visible: a path
  must match an allowed pattern and an action must be both catalog
  stream-safe and policy allow-listed.
- **Immutable deny baseline.** `.env` and variants, key/certificate files,
  credentials and secrets directories, DMs, and private paths are evaluated
  before user rules; negation applies only to user-added rules and can never
  re-enable a baseline denial.
- **Recursive sanitization.** JSON shapes only, bounded depth (12), keys
  (128/object), array elements (512), string length (8 KiB), and canonical
  size (64 KiB). Accessors, foreign prototypes, symbol keys, cycles,
  prototype-key smuggling, bigints, and non-finite numbers fail closed.
  Secret-named keys (case/separator/Unicode-normalized) and secret-shaped
  values (bearer tokens, PEM blocks) drop the envelope.
- **Constrained rewrite rules.** `name = literal-or-glob → cipher|drop`.
  Regular-expression syntax is refused at compile time, so no
  attacker-authored pattern is ever executed. Cipher slabs are fixed-width
  (no length oracle); the number and placement of matches within a string is
  still observable, which is a documented leakage property — prefer `drop`
  for values whose presence is itself sensitive. Session salts must be
  unpredictable and are never published to spectators.
- **Structured decisions.** Every refusal is `drop`/`quarantine` with a
  reason code (`immutable-deny`, `not-in-presentation-view`,
  `action-not-stream-safe`, `payload-too-large`, `depth-exceeded`,
  `unsafe-object-shape`, `policy-stale`, `unverified-source`,
  `sequence-conflict`, `queue-overflow`, …) that never carries the refused
  value.
- **Preflight = production.** `live.session.preflight` reports exactly what
  the audience projection will contain using the same policy object and
  sanitizer the publisher uses after start. Start refuses while preflight
  errors remain.

## Ordering, recovery, replay, fork

- `sequence` (assigned at release) is the only ordering authority. Wall
  clocks are informational; media playback positions are never canonical.
- The delayed-release queue holds unsent source references and re-sanitizes
  each entry against the policy in force at release; narrowing invalidates
  queued entries; pause freezes release; overflow fails closed and degrades
  session health.
- Spectators deduplicate by sequence + payload digest, quarantine
  conflicting duplicates and cross-session envelopes, report gaps, and
  resynchronize from a checkpoint plus deltas. A late joiner receives a
  checkpoint, not unbounded history.
- Replay is confined to a disposable presentation projection: only
  catalog-listed `presentation-local`/`read-only-query` actions apply,
  unknown and privileged actions never execute, and host theme preferences
  never override the spectator's own.
- `forkAt` accepts a checkpoint id — a media timestamp is not a branch
  point — verifies authority and availability, and records provenance from
  the new work back to the session and checkpoint.

## Threat model summary

| Threat | Control | Test |
|---|---|---|
| Accidental secret publication (top-level, nested, array, value-shaped) | recursive sanitizer + secret key/value detection | `test/unit/live-spaces-policy.test.ts` |
| `.env`/baseline negation | immutable baseline evaluated before user rules | policy unit tests + `features/live_spaces.feature` |
| Prototype pollution / getter execution / cycles / class smuggling | shape rejection, descriptor-based traversal, cycle set | policy unit tests |
| Regex denial of service via user rules | literal/glob-only rule language; regex syntax refused at compile | policy unit tests |
| Oversized/deep payloads | explicit bounds, fail closed | policy unit tests |
| Unknown/privileged action replay | default-deny catalog; `never-replay`; replay decision gate | log unit tests + feature scenarios |
| Stale/widened policy race | digest-referenced envelopes; widening confirmation + consent reset; narrowing queue invalidation | log unit tests |
| Forged/conflicting envelopes | payload digest verification; sequence-conflict quarantine | log unit tests |
| Membership-as-authority / request-as-grant | observer-only joins; requests recorded, never granted; revocation refuses next action | commands unit tests + feature scenarios |
| Sealed-history tampering | sealed sessions refuse all mutation; manifest hashed | core unit tests |
| E2EE downgrade / recording without consent | mode compatibility refusal; consent scopes in preflight | media tests + policy tests |
| Webhook forgery/replay | content-type, size, signature, room binding, dedup in provider port | `packages/Epoch.Community.API/test/live-media.test.mjs` |
| Egress SSRF / arbitrary destinations | opaque `egress-ref:` references only, at policy and provider layers | media tests |
| Queue/memory exhaustion | bounded queues and quarantine ledgers; overflow → degraded | log unit tests |

Threats that belong to the not-yet-implemented hosted transport (connection
flooding, join-link guessing, SSE credential leakage, cross-session token
replay against a real provider) are recorded as revisit criteria in
ADR-0059 and must be addressed before that surface ships.

## Honest limitations

- Released public bytes may be copied by spectators and **cannot be
  recalled**; revocation and retention stop future access and delete
  controlled copies only. Pre-publication filtering is the boundary.
- Consent records are signed evidence, not a universal legal conclusion for
  every jurisdiction.
- The fixed-width cipher hides value length but not the presence or count of
  matches inside a string.
- The fake media provider demonstrates the contract; it proves nothing about
  a production provider's behavior. No LiveKit smoke test exists because no
  LiveKit adapter exists.

## Configuration

The semantic-only core requires no configuration and no credentials. The
media provider selection is an injection decision for the composing host
(`disabled` today by default; `fake` for tests). No environment variable
enables a network media path, because none ships yet; when a hosted API and
provider adapter land, their flags and secret references must follow the
repository's existing secret-reference conventions and default to
`provider-disabled`.
