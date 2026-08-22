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
| Opaque expiring join links hashed at rest, redeeming to single-session observer grants | Implemented (`@epoch/community-api`) |
| Media token derivation after Epoch grant, role, policy, and consent checks | Implemented (`@epoch/community-api`, honest `unavailable` with no gateway) |
| Provider webhook ingress: raw-body verification, size and content-type bounds, session binding, dedup, command-path entry | Implemented (`@epoch/community-api`) |
| `epoch live …` CLI family, typed SDK client, WebMCP tools with secret-bearing commands withheld | Implemented (`@epoch/community-runtime`, `@epoch/cli`) |
| Community Web host/spectator UI, telemetry, moderation service | Not yet implemented |
| LiveKit adapter behind the provider-neutral port: opaque rooms, least-privilege tokens, participant removal, egress gating, webhook verification | Implemented and labelled **experimental** (`@epoch/community-api`); never validated against a live LiveKit deployment from this repository |

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
  live/livekit-media-provider.ts  optional LiveKit adapter, SDK loaded by
                              dynamic import only when credentials exist
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
| `POST /community/live/sessions/:id/join-links` | Owner mints an opaque expiring link |
| `POST /community/live/sessions/:id/media/token` | Derive a least-privilege media credential |
| `POST /community/live/provider/:kind/webhook` | Verified provider event ingress |

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

## Access at the edge

Three credentials meet the outside world, and none of them is authority.

**Join links** are bearer credentials treated like one. The secret exists only
in the response that mints it; the store keeps a SHA-256 digest, so a stolen
database yields no working links. A link is bound to one session, expires,
counts redemptions, and can be revoked. Redemption produces an opaque
single-session **observer** principal — never the issuer's identity and never a
publish grant. Every failure mode (guessed, expired, revoked, exhausted, or
valid-but-for-another-session) returns the same `404`, so the endpoint cannot
be used to probe which links exist.

**Media tokens** are derived, never asserted. Epoch decides first — the session
is live, the caller holds an active grant, the role permits those sources, the
policy enables them, and the required consent scopes are recorded — and only
then does the provider mint a short-lived credential (bounded to at most 15
minutes) carrying exactly the sources that survived those checks. Observers and
agents publish nothing by default; a camera request against an audio-only
policy is refused rather than quietly trimmed; a revoked participant gets
nothing on their next request. Semantic-only sessions have no media plane at
all, and with no gateway configured the command returns an honest `unavailable`
receipt instead of a token or a crash.

**Provider webhooks** are untrusted input until proven otherwise. Content type
and body size are checked before parsing, the signature is verified over the
raw body, the event must name a session the deployment knows, replays are
acknowledged once and re-enter nothing, and the verified result enters the
domain as a command — carrying only a digest of the body, never the body — run
as a system principal that holds no session grant and therefore can never act
as a participant.

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

## The LiveKit adapter

The adapter implements the same provider-neutral port the fake does, so nothing
above it can tell which is configured except through capability labels.

- **The SDK is optional and lazy.** `livekit-server-sdk` is imported through a
  dynamic `import()` inside the client factory, so a semantic-only deployment
  never resolves it, no browser bundle contains it, and a missing module
  degrades to a refusal rather than a boot crash.
- **Configuration is reported, never guessed.** No credentials means
  `provider-disabled`. Partial credentials means `unavailable` and every
  operation refuses — there is no weaker fallback path.
- **The label is `experimental`, not `production`.** Nothing in this repository
  has run the adapter against a live LiveKit deployment. It will stay
  `experimental` until someone does and records the result.
- **Rooms are opaque.** A room name is `epoch-<32 hex>` derived from a digest of
  the session id, so a provider dashboard learns nothing about the work.
- **Tokens can only lose privilege.** `roomJoin` is scoped to one room, the
  grant carries exactly the sources that survived the Epoch checks,
  `canPublishData` is always false, and `roomAdmin`/`roomRecord` never reach a
  browser participant. TTLs are clamped to the adapter's own ceiling regardless
  of what the caller asked for, and a token for a room bound to another session
  is not issuable.
- **Egress cannot be pointed at an attacker.** Destinations are pre-approved
  opaque `egress-ref:` keys resolved from server configuration; a caller cannot
  name a URL, and the operator's real URL is never echoed back. With no egress
  service deployed, recording and egress are `unavailable` and refuse.
- **Webhook verification uses the official receiver** over the raw body,
  because the body-hash encoding is not public and a hand-rolled check could
  differ from the server in either direction. Events are bound to a room this
  deployment owns and deduplicated by provider event id.
- **Errors are normalized.** Provider messages are redacted of the API key and
  secret and truncated before they travel.
- **Egress output construction is deliberately unwired.** LiveKit's composite
  egress takes a typed output message whose shape depends on what an operator
  deployed and where recordings go. Guessing that shape would mean shipping an
  unvalidated construction exactly where recordings leave the trust boundary,
  so the official factory refuses and a deployment must supply an egress
  adapter before enabling it. Stopping an egress is implemented, because
  stopping something is safe to get right without a destination.

Automated tests inject client doubles for every network-touching call, so CI
never reaches a LiveKit server and no test needs credentials. The token tests
deliberately use the *real* SDK — no network required — so the assertions are
about the bytes LiveKit would actually receive.

## Adapter parity

The CLI, the SDK, WebMCP, the HTTP routes, and the browser are five spellings
of one command bus. Each translates argument shapes; none decides what a
command means or who may run it.

| Surface | Entry | Confirmation |
|---|---|---|
| CLI | `epoch live …` | `--confirm` |
| SDK | `createLiveSpaceClient(runtime)` | `{ confirmed: true }` argument |
| WebMCP | catalog-projected tools | host declares `confirmedKinds` after real interaction |
| HTTP | `POST …/commands` | `confirmed` in the body |
| Community Web | `live.*` registered actions | pointer or key origin only |

Consequences worth stating:

- **The CLI owns no Live Space state.** Sessions belong to a deployment, so
  `epoch live` forwards to the configured Community remote (`--remote` or
  `EPOCH_COMMUNITY_URL`) and prints the receipt that came back. With no remote
  configured the command still runs and still returns a receipt — one that says
  the host has no Live Space port, rather than inventing a local session that
  no spectator could ever join.
- **A terminal never holds a media credential.** There is no `epoch live media`
  verb, and the remote port refuses token issuance outright rather than
  fetching a short-lived secret into shell history.
- **WebMCP withholds the credential-bearing commands by default**
  (`live.media.issueToken`, `live.media.providerEvent`). Visibility is not
  authorization — the bus refuses them regardless — but a transport credential
  is not something to advertise to every page agent. An operator can widen or
  narrow that set explicitly.
- **An agent gets the same refusal a person gets.** An unconfirmed
  `live.session.start` comes back as `confirm` from WebMCP exactly as it does
  from the CLI; only a host that satisfied confirmation through real
  interaction can pass it on.

## Community binding

A Live Session is a canonical Community entity, not a thing that sits beside
one. `live.session.bindThread` names the single object id that `#live`,
Activity, search, a channel list, and the replay list all target — the session
is *mounted* into those projections rather than copied into each of them. The
binding is a signed `live.session.bound` event, so a rebinding is visible as
history instead of silently moving where an audience was told to look, and a
sealed session refuses to be rebound for the same reason the rest of it is
frozen.

**An annotation is a reply on that thread.** It used to be an entry in a
private array — and the body was validated and then discarded, so the surface
accepted someone's words and kept only an id. Now the words survive as a
Community record, which means they are searchable, moderatable, and visible to
every projection that already knows how to render a thread. Annotating without
a bound thread is refused rather than kept privately: an annotation with
nowhere canonical to live is exactly the parallel store this design exists to
avoid.

**A fork opens a Change.** `live.presentation.forkAt` writes a Change whose
provenance edge points back at the session's thread, and whose anchor is the
checkpoint's **presentation log head** rather than a wall-clock moment. That is
what makes "this work continues from that state" checkable: a spectator can
verify the head against the released log, where a timestamp would only be a
claim. The receipt carries the `changeId`, so a fork that opened nothing could
not pretend otherwise.

The record store itself is a server seam (`LiveCommunityBinding`), implemented
in the Community API over the real entity store. A surface with no store
configured gets `unavailable` with a reason — never a private array.

## The board as host

Community Web hosts through the same bus and adds nothing of its own. The
panel asks and reports; every decision it displays was made underneath it.

**Preflight is the product, not a nicety.** The failure mode of a Live Space is
silent and unrecoverable: a pixel stream leaks by showing, but this leaks by
publishing an action whose arguments carry something the host forgot was in
scope, to an audience that has already copied it. So the board runs the same
policy object and the same sanitizer configuration the publisher will use
after start, and renders the result as the allow-list a spectator would
actually receive. Denials are listed before allowances, because a host reading
the report is looking for the thing that should not be in it.

**The safety chrome is static.** The region, its heading, and the standing
statement — *published actions and allowed paths, never your screen, never
your keystrokes; released bytes cannot be recalled* — live in `board.html`
beside the recovery controls, not in a `data-cw-slot`. A slot is filled from a
manifest, and a manifest a model wrote could place nothing there. What is
published, and to whom, is not a layout question.

**Controls follow the lifecycle a receipt reported.** A control the current
state does not permit is absent rather than disabled: a greyed Start beside a
failing preflight invites a second click, and the honest statement is that
there is nothing to click yet. Start and end take confirmation from a pointer
or keyboard origin only — an agent reaching the same action through WebMCP
arrives with a different origin and gets the bus's confirmation refusal,
because an audience appearing is a decision a person makes.

**A browser with no deployment says so.** A Live Session is signed against a
Space that a deployment owns, so the board is a client of one or it is not
hosting at all. There is no in-memory stand-in, deliberately: a local fake
would look identical to the real thing right up to the moment someone believed
an audience was watching. With no port configured the command family is still
registered and answers `unavailable` with the reason, and the panel shows that
reason and offers no controls. A missing command would be indistinguishable
from a broken page.

## The board as spectator

A spectator cannot verify anything for themselves. They did not choose the
allow-list, cannot see what was dropped, and have no way to tell a quiet
stream from a broken one. The only thing the surface owes them is an honest
account of its own state.

**A hole is named, never filled.** When an envelope arrives out of order the
projection reports a gap, and the board renders the missing range in its own
announced region rather than as a line in the feed — a reader scanning a list
would scroll past it and believe the stream was whole. The applied sequence
does not advance past a hole, and the early envelope is held rather than shown
out of order. Recovery is an explicit resync from a checkpoint the host
recorded, which also states where the reader now is: a resync notice without a
position leaves them guessing whether it worked, which is the question they
resynced to answer.

**Every outcome is recorded, including the ones with no content.** A duplicate,
a quarantined envelope, and an action skipped because it was the host's own
view preference each appear in the feed, dimmer than content but never absent.
"Nothing arrived" and "three things arrived and were refused" must not look the
same.

**The host's view preferences stay the host's.** Replay eligibility is decided
by the shared projection, and a `view-preference` action is shown as skipped
rather than applied — replaying it would reach into a spectator's page and
change it on the host's behalf.

**Accessibility.** The released feed is a `role="log"` with
`aria-live="polite"`, so each release is announced without stealing focus from
whatever is being read; `assertive` would interrupt on every action. The gap
notice is a `role="status"`. Both live in `board.html` beside the host panel
and outside the morph mount, so no generated revision can remove them or
reword what they say about holes.

## Moderation, operations, telemetry

Three surfaces owed to people who are not the host. They share one file
(`live/moderation.ts`) because they share one rule: none of them may overstate
what the system did.

**A report is not a recall.** `report` records who raised what, and its receipt
carries `releasedThroughSequence` alongside a `cannotUndo` list. Once anything
has been released that list is never empty — it says in the operator's own
words that released envelopes are already public, that spectators may hold
copies, and that they cannot be recalled. This is stated in the same receipt as
the effect rather than in documentation a responder can skip, because a
reporter who believes the bytes were pulled back stops chasing the copies that
still exist.

Every moderation action `evaluateLiveModeration` knows about — pause, revoke a
participant, end the session, quarantine an action id — is forward-looking.
None of them reaches an audience's machine, and the outcome names the future it
restrains rather than implying a past it repairs. A sealed session reports
`applied: false` with no effects at all: there is nothing further to restrain,
and reporting a quiet success would be the same lie as a spinner that never
resolves.

**Operations health is worst-first.** `live.session.operations` is a read-only
command (`live.session.read`) that projects one session's standing: lifecycle,
released sequence, quarantine count, and the media and caption labels exactly
as the providers declared them. The overall label is the *least* reassuring
component, never an average, so a disabled media provider cannot be smoothed
into a green panel by a healthy transport. A label the projection does not
recognise is treated as the worst case — guessing "probably fine" about an
unknown provider state is how an operations panel starts lying.

The projection carries no principal ids, no paths, and no action arguments. It
is delivered to browsers, and the fastest way to leak a session's content is to
put it on a dashboard. A feature scenario publishes a secret-bearing action
into a session and asserts the serialized projection contains neither the
secret, nor the published path, nor the host's principal id.

**Telemetry answers "is the feature working", not "what did that person do".**
`liveTelemetryRecord` returns a closed, enumerated shape: lifecycle, released
count, quarantined count, participant count, gap count, media label. The fields
are enumerated rather than copied from a session, so adding a field to a
session can never widen telemetry by accident. There is deliberately no session
id: a session id plus a timestamp is a re-identifier, linking a person's
activity across records that were supposed to be aggregate.

## Cross-surface proof

Three lanes, each proving something the others cannot.

**Contract (Pact).** The CLI's Live Space port is a real consumer of the
deployment's live routes, so it drives a consumer-driven contract
(`Epoch.CLI.LiveSpaceClient` → `Epoch.Community.API`) rather than a hand-rolled
request nobody ships. Four interactions pin the parts a surface would silently
misread: where the receipt lives on a read, that the command kind travels in
the body rather than the path, that a refusal is a 403 carrying the
deployment's own reason instead of a transport error, and — by declaring no
interaction for it at all — that asking for a media credential never reaches
the network. If the port ever did reach for that route, the mock server would
record an unexpected request and fail. Provider verification composes the live
routes and the Community API handler on one server, exactly as a deployment
mounts them.

**Property (fast-check).** Two invariants that hand-written cases cannot
cover, because both are about inputs nobody thought of:

- *Nothing an author typed reaches an audience if the policy denies it.* The
  generator emits arguments up to three levels deep, mixing ordinary values
  with credentials under keys that read as harmless. The assertion is over the
  serialized envelope set and the quarantine records, not over named fields — a
  leak that arrives somewhere nobody thought to check is the leak worth
  catching.
- *A reader is never silently behind.* For any permutation of a released set,
  with duplicates and drops, the reader's reported position equals the
  contiguous run it actually received, nothing is applied twice, and anything
  past a hole is held rather than discarded or applied.

The first property found a real defect on its first run, described below.

**Characterization (Verify-style goldens).** Seven `.verified.json` goldens
under `test/verify/verified/` pin the shapes that are promises to something
outside this process: the signed-history vocabulary, the command authority
surface (`capability`, `readOnly`, `requiresConfirmation` per command), the
normalized policy and its digest, the immutable deny baseline, the released
envelope and checkpoint, the two payloads that leave the trust boundary
(operations projection and telemetry record), and the `cannotUndo` wording.

Unit tests assert a rule holds; these assert a shape has not moved. They catch
the failure where every test still passes and yet a previously signed session
no longer verifies, a read command has quietly become a write, or a field
nobody meant to publish is on a dashboard. Refresh with
`EPOCH_UPDATE_VERIFIED=1` and read the diff before accepting it — a golden
accepted unread is worse than no golden, because it launders the change.

**Mutation.** `npm run mutation:live-spaces` weakens one guarantee at a time —
drops `**/.env` from the immutable deny baseline, ignores secret key names,
ignores secret value shapes, accepts unverified captures, blinds the spectator
to gaps, un-idempotents the checkpoint, and re-permits observers to publish and
to checkpoint — rebuilds, and requires the Live Spaces suites to fail each time.
All eight are killed.

Coverage measures which lines ran. This measures whether anything would have
noticed them running differently, which is the distinction that matters for a
publication filter: a test can execute every branch of a rule without asserting
the rule holds. A surviving mutant is a guarantee nothing is really testing.

**Scenario (Gherkin) and unit tests** carry the cases with a named persona
behind them. Nothing here replaces those; the generated lanes exist because a
security filter is only as good as the shapes it has seen.

### What the characterization lane found

Reading the command-catalog golden showed `live.presentation.checkpoint`
declaring `capability: "live.presentation.read"` while `readOnly: false`. Its
handler gated on "is an active participant", where publishing rejects
observers outright — so an observer could append checkpoints to a session they
were only watching, into the log spectators resync and fork from, with no bound
on how many. A checkpoint is a mark in the shared stream, not a private reading
position, so it is now authorized exactly like a publication.

Fixing that surfaced a second defect in the same command. The checkpoint id is
derived from the stream position — session, sequence, log head — so marking one
position twice collides by construction, and the second marking used to be
appended anyway with a later offset. An already-issued checkpoint's content
therefore changed underneath anything that had recorded it, and the sealed
manifest listed the same id twice. Marking a position that is already marked
now returns the existing checkpoint; advancing the stream is what makes a new
one.

**Chaos / fault injection.** `packages/Epoch.Community.API/test/chaos-live.test.mjs`
asks what one broken participant can do to everyone else: a spectator whose
socket died mid-write, publishes racing, a subscriber flood, a session torn
down with envelopes in flight, a callback that unsubscribes or subscribes
during delivery. The rule under test is containment — one spectator's failure
is one spectator's problem.

### What the chaos lane found

Fan-out delivered in a bare loop, so a spectator callback that threw aborted
it. An SSE writer whose client has vanished throws on the next write, and that
one throw meant every subscriber after it in the set lost that envelope and
every later one — while the broadcast cursor had already advanced past them, so
nothing redelivered. One dead peer silently truncated the session for everybody.

A subscriber that cannot receive is now removed, told why, and the fan-out
continues. Iteration runs over a snapshot, so removing one — or a callback that
subscribes another — cannot change who sees the envelope currently in flight.

The race the lane was also written to catch turned out not to exist: two
publishes in flight at once, and twelve, each deliver every envelope exactly
once in sequence order.

### What the property lane found

The value-shaped secret check recognised exactly two things: a PEM private-key
block and a `Bearer` header. Everything else relied on `isSecretKeyName`,
which reads the *key* a value was filed under. A credential filed under an
honest label (`apiKey`, `token`) was refused; the same credential filed under
`view` or `note` was published.

The property published an AWS access key id under `view` and the stream
released it. `containsSecretMaterial` now also refuses the vendor formats that
carry their own prefix and enough entropy after it to be unambiguous — AWS
access key ids, GitHub tokens, `sk-` style keys, Slack tokens, Google API keys,
signed JWTs — and any PEM-armoured private key, not only the ones spelled
"PRIVATE KEY".

It stays deliberately narrow. A pattern loose enough to catch every possible
credential also eats ordinary prose, and a filter that swallows a session's
legitimate content gets turned off, which protects nobody. Key-name matching
remains the primary defence; this is the second line for when the label lies.

### What review of the pattern compiler found

Path patterns are compiled to a regular expression by turning wildcards into
placeholders, escaping what remains, then expanding the placeholders. `?` was
not in either set, so it survived escaping and reached the compiled expression
as a quantifier over the preceding character.

The effect was worst in the direction that matters. A deny rule spelled
`**/secret?.txt`, written to hide `secrets.txt`, compiled to `secret?` —
"secre" followed by an optional "t" — so it released the file it named and hid
`secre.txt` instead. A deny rule that fails open on its own subject is worse
than no rule, because the author believes the file is covered.

`?` is now a single-character glob and, like `*`, never spans a separator. The
unit test asserts both directions, including the deny-path consequence, and a
mutant that removes the placeholder step is killed by that test.

### What review of the edge found

Two things, neither of which a lane would have caught, because both are about
code that was never wrong on any input a test supplies.

The rate limiter is keyed by principal, and the principal set is not bounded —
a join link mints a fresh opaque `liveguest_…` id on every redemption. Its
bucket map was only ever written, never swept: overwriting on next use reclaims
a key that is seen again, which a one-shot guest principal never is. Someone
holding one valid link could grow the limiter's own memory, one request at a
time, for the life of the process. Expired buckets are now swept on an
amortised schedule, and the sweep is exported so a test asserts it directly
rather than inferring it from memory it cannot observe.

Join-link redemption also carried a constant-time comparison that compared a
value with itself recomputed — always true, never taken — under a comment
claiming there was "no content-dependent comparison anywhere in the path". The
actual lookup is a hash-map get, which offers no such guarantee. The real
defence is that lookup happens on a digest, so the stored value is not a usable
credential and the compared value is not the secret. The dead line is gone and
the comment now says that instead. A comparison that advertises a property it
does not provide is worse than no comparison, because it stops people looking.

## Honest limitations

- Path patterns support `*`, `**`, and `?`. There is no character-class or
  brace syntax, and no way to express "not this" inside a single pattern —
  negation exists only as a separate `!`-prefixed rule, which the immutable
  baseline ignores by design.
- Value-shaped secret detection covers named vendor formats and PEM blocks
  only. A bespoke or unprefixed credential — a raw password, an internal token
  with no distinguishing shape — is caught by its key name or not at all.
  Pre-publication policy, not pattern matching, is the boundary that holds.
- The property lane runs a bounded number of cases per seed. It raises
  confidence; it is not a proof, and a passing run is not evidence that no
  counterexample exists.
- Moderation is forward-looking only. Pause, revoke, end and quarantine
  restrain what happens next; nothing in this feature reaches a spectator's
  machine, and the receipts say so rather than implying otherwise.
- `live.session.operations` reports the local port's own view. It has no
  cross-deployment aggregation and no history, so it answers "how is this
  session standing right now", not "how has this deployment behaved".
- The telemetry record is built but not emitted anywhere. No exporter, sink, or
  sampling policy ships, so today it is a shape with tests, not a pipeline.
- Released public bytes may be copied by spectators and **cannot be
  recalled**; revocation and retention stop future access and delete
  controlled copies only. Pre-publication filtering is the boundary.
- Consent records are signed evidence, not a universal legal conclusion for
  every jurisdiction.
- The fixed-width cipher hides value length but not the presence or count of
  matches inside a string.
- The fake media provider demonstrates the contract; it proves nothing about a
  production provider's behavior.
- The LiveKit adapter is `experimental`. Its token minting and webhook
  verification are exercised against the official SDK, but no automated test
  reaches a running LiveKit server, so end-to-end media delivery, participant
  removal, and egress remain unvalidated here. A manual smoke procedure against
  a real deployment is required before any deployment relabels it.
- Self-hosted LiveKit egress is a separate operational dependency. Until an
  operator deploys it, recording and egress report `unavailable` and refuse.
- Bookmarks remain session-local. Unlike annotations and forks they are a
  reader's private position, not a contribution, so they are not Community
  records and no projection shows them.
- The board hosts against a configured deployment only. No deployment is
  configured in the shipped page, so the honest steady state of Community Web
  today is `unavailable` — the panel is real and the refusal is real, but no
  browser has yet hosted a session end to end.
- The spectator surface renders a projection it is fed. Subscribing it to a
  live transport needs a configured deployment, which the shipped page does not
  have, so today it is driven by envelopes handed to it rather than by a socket.
  Sealed-manifest replay is not on the board yet either; both reach the same
  bus from the CLI and SDK.

## Configuration

The semantic-only core requires no configuration and no credentials. The
media provider selection is an injection decision for the composing host
(`disabled` today by default; `fake` for tests). No environment variable
enables a network media path, because none ships yet; when a hosted API and
provider adapter land, their flags and secret references must follow the
repository's existing secret-reference conventions and default to
`provider-disabled`.
