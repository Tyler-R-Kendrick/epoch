---
type: Reference
title: "Customization pattern evaluation — Lua, generative UI, styles, and tokens"
description: "Cross-industry evaluation of scripted and generative UI customization patterns (WoW, Neovim/Luau, editors, Twitch, Discord, MCP Apps, ATProto, token pipelines, persisted GraphQL) mapped onto Epoch Community Web's social surfaces and audited against ADR-0058."
tags: [epoch, plans, community-web, lua, generative-ui, design-tokens, graphql]
---

# Customization pattern evaluation

This document evaluates how other industries let communities customize a
product's interface, and maps the durable patterns onto Epoch Community Web:
Lua scripting, generative UI over the OpenUI catalog, style customization
(CSS/SCSS/LESS), and design-token overlays, all reading a static GraphQL API
and serving a social experience that spans micro-posts, community channels,
question-and-answer, live sessions, and bots.

It is an evaluation, not an execution plan. The delivery contracts live in
[`master-instructions.md`](master-instructions.md); the design commitments live
in [ADR-0058](../../design-decisions/0058-lua-scriptable-generative-ui-customization.md)
and [ADR-0060](../../design-decisions/0060-social-catalog-bundles-feed-scripts-and-app-tier.md).
Where this document identifies a gap in the frozen plan, the closing amendment
is named in [§5](#5-audit-of-adr-0058-against-the-patterns).

## 1. The expressiveness ladder

Four unrelated industries, across roughly two decades, independently arrived at
the same four rungs. Each rung buys expressiveness with a specific, named loss
of authority.

| Rung | What the author writes | World of Warcraft | Editors (Neovim, VS Code) | Streaming and chat (Twitch, Discord) | Agent surfaces (MCP Apps, A2UI) | Social protocols (ATProto) |
|---|---|---|---|---|---|---|
| T0 — data | Values only, no logic | Saved-variable settings | `settings.json`, colorschemes | Panel configuration | Design-token themes | Preference records |
| T1 — declarative spec | A tree of approved components | XML frame templates | Theme files, snippet definitions | Panel slots | A2UI / json-render catalog specs | Lexicon records |
| T2 — sandboxed script | Logic against a capability API | Lua addons with taint and secure templates | Lua (`vim.*`), extension APIs | — | Catalog action handlers | Feed generators, labelers |
| T3 — isolated app | Arbitrary code behind an origin boundary | — | Language servers, remote extensions | Twitch Extensions, Discord Activities | MCP Apps double-iframe sandbox | Independent AppViews |

Two properties hold at every rung and in every industry:

- **Authority falls as expressiveness rises.** A T1 spec cannot invent a
  component; a T2 script cannot commit a consequential action; a T3 app cannot
  reach the host's DOM, only a message bridge.
- **The rungs are one system, not four features.** The systems that grew
  healthy ecosystems let an author climb: a color tweak becomes a shared theme,
  a theme becomes a packaged widget, a widget becomes a script. The systems
  that bolted rungs on reactively produced an unsupported underground instead
  (the Discord client-mod scene is the standing example: a refusal to support
  theming produced a third-party mod ecosystem with real malware in it).

### How Epoch instantiates the ladder

Community Web already fixes markup and lets themes write CSS only
(`docs/community-web/CONTRACT.md`). ADR-0058 turns that single rule into a
tier model, which is this ladder in Epoch's vocabulary:

| Epoch tier | Rung | Authority ceiling | Where it is specified |
|---|---|---|---|
| Tier 1 — themes | T1-ish (CSS only) | May style; may not add markup, read state, or reach the network | CONTRACT.md, preserved verbatim |
| Tier 2 — token overlays | T0 | Sparse DTCG overlays onto `--cw-*` only; never platform `--epoch-color-*`; WCAG AA floor is not waivable | ADR-0058 §3(c), contract C6 |
| Tier 3 — scripts | T2 | Emits UI specs and intent proposals only; never CSS, DOM, network, or signed state | ADR-0058 §3(d)/(e), contracts C1–C4 |
| Reserved — apps | T3 | Not built. Reviewed, sandboxed-iframe apps with declared egress | ADR-0060, reservation only |

The promotion path is the point: a member edits tokens in the existing theme
surface, packages the result as a Tier 2 overlay, adds a Tier 3 script when
behavior is needed, and — if the app tier is ever claimed — graduates to an
isolated app. One manifest format, one signing pipeline, one store across all
of it (ADR-0058 §3(e)).

## 2. Trust architecture: the patterns worth copying

### 2.1 The generator proposes; the host disposes

Every system that trusted the producer of UI eventually lost; every system that
enforced in the renderer held. WoW's twenty-year lineage is the clearest
version: since 2005 its consequential actions have required a hardware event,
and its secure templates let addon code *describe* an action that trusted code
*performs* at gesture time. Modern catalog-based generative UI reaches the same
place from the other direction — an agent may only name components that already
exist in the host's catalog.

Epoch's form of the rule is stated in ADR-0058: scripts and models emit intent
proposals; only a user gesture on platform chrome commits one through the frozen
action registry. This single rule resolves most of the open questions in
generative social UI at once, including the "generative phishing" class, where
a model places a convincing credential or payment prompt: in Epoch such
placements are a refused `placementClass`, not a filtered string (contract C3,
C8).

### 2.2 The distribution channel is the attack surface

The recorded incidents cluster in the sharing channel, not in sandbox escapes:
compromised publisher accounts shipping a poisoned *update* under a trusted
name, a popular styling extension quietly sold and repurposed as spyware, mod
distribution channels compromised at the CDN. Meanwhile the growth engine of
every healthy ecosystem is a shareable bundle — a distro, an import string, a
starter pack. The same artifact carries both properties.

The consequences Epoch inherits are concrete, and are already the ADR-0058
posture: reuse the extension store rather than building a second distribution
system; sign manifests; pin members by content hash; ship a per-version killbit
that leaves a tombstone at the installed position and notifies; stage rollouts;
derive reputation from publisher history. What ADR-0058 lacked was the *bundle*
as a first-class unit; ADR-0060 adds it.

### 2.3 A static GraphQL API is a governance object, not a performance trick

The apparent tension in the brief — a static API under a generative UI —
dissolves once the persisted-operation registry is recognized as the same kind
of object as a component catalog or a capability manifest: an enumerated,
versioned, revocable allowlist. Generated UI and untrusted scripts then consume
data through a binding contract (operation hash, typed result shape, cache
profile) instead of ad-hoc query power.

That framing makes "static" a property of *governance*, not of freshness. Live
behavior comes from the realtime fabric already in the repo
([ADR-0054](../../design-decisions/0054-nats-realtime-fabric.md)): the query
plane stays enumerable while channel messages, presence, and live sessions
arrive as events the host pushes into the snapshot the script sees.

### 2.4 Context-dependent trust beats binary permissions

WoW needed opaque "secret values" because trust varies by situation: the same
addon may know a thing out of combat and must not in an encounter. Social
platforms have the same shape — a live session, a moderation crisis, a payment
flow. Binary allow/deny cannot express it, and static approval prompts decay
into rubber-stamping when they fire on everything.

Epoch's answer is already in contract C8: host context reaches scripts as
opaque boolean predicates, never raw identity or content strings, and approval
is risk-tiered so reversible actions do not interrupt while irreversible ones
do — with approval-rate telemetry feeding reputation, so an operator who
approves everything is visible in data rather than assumed diligent.

### 2.5 Accessibility is the unguarded flank

No generative-UI specification surveyed mandates accessibility properties, and
automated linting covers only a portion of the relevant success criteria. Every
ecosystem treated accessibility as an afterthought until it was forced. The
structural fix is to make the properties unskippable at the schema level: a
catalog component without complete accessibility fields cannot be emitted at
all, over a platform floor (contrast, focus, keyboard, target size, reduced
motion) that a theme, overlay, or script cannot waive. That is contract C3 plus
C10, and it is the right shape.

### 2.6 Governance is a launch-time commitment

Once members build identity on customization, changing the capability surface
becomes a political event. Systems that retracted expressiveness — or announced
a restriction without shipping the replacement in the same release — paid for
it in trust, including from members who depended on the removed capability for
accessibility. Contract C11's capability-floor charter, stability tiers, and
two-notice deprecation policy exist for this reason and should be published
with the first script, not after.

## 3. Style and token customization

The style tier is where the historical incidents are most specific, and the
mitigations are correspondingly precise:

- **Every CSS exfiltration technique bottoms out in one primitive**: attacker
  controlled CSS causing an attacker-visible network request. Remove or
  first-party-proxy `url()` and `@import` and the class dies. Contract C5.1.
- **Serialization is itself an injection boundary.** Compiled user CSS ships as
  external `text/css`, never as inline style built from user data (C5.1).
- **Containment is now a platform primitive**: `@scope` plus `@layer` with
  `overflow: clip` gives a real cascade contract between platform chrome and
  member styling instead of a naming convention (C5.2).
- **Preprocessors are an authoring convenience only.** SCSS and LESS compile
  server-side into the same sanitized, byte-verified artifact; no preprocessor
  ships to the browser (C5.4).

For tokens, the industry has converged on themes-as-data: sparse overlay
documents in DTCG format, resolved server-side into scoped CSS custom
properties, with the editable surface deliberately capped at a few dozen
semantic tokens rather than the whole palette. Epoch's version keeps
`DESIGN.md` frontmatter as the platform source of truth and lets overlays
target `--cw-*` only (C6), which preserves the machine-checked design system
while still giving communities a real identity.

## 4. Mapping the social experience onto the customization surface

The brief names six social experiences. Each already has a home in Community
Web's three planes (`docs/community-web-experience.md`) or in the candidate
surfaces under [`docs/design-explorations/`](../../design-explorations/00-foundation.md).
The catalog today ships six components — `Panel`, `Post`, `Notice`, `Channel`,
`Fact`, `Theme` (generated into `app/openui-library.js`). The social set below
is the ADR-0060 extension.

| Social experience | Community Web home | Catalog components | Gesture-gated intents | Data plane | Realtime |
|---|---|---|---|---|---|
| Micro-posts, follows, reposts | Network Feed plane | `Panel`, `PostCard`, `UserLine`, `EmbedCard` | follow, repost, quote, compose | Persisted feed and profile operations | Feed events |
| Community channels and chat | Community plane (`#general`, work channels) | `ChannelList`, `ChatLine`, `Panel` | send message, join channel, mute | Persisted channel and roster operations | `channel.message`, `channel.presence` |
| Question and answer | Answers surface (`design-explorations/04-answers`) | `AnswerBlock`, `VoteControls`, `ThreadView` | vote, accept answer, comment | Persisted question and answer operations | Thread events |
| Long-form and media cards | Feed and community surfaces | `EmbedCard`, `PostCard` | open link, save | Persisted embed metadata operations | — |
| Bots as first-class actors | AI-native rooms, feed, channels | `BotCard` (mandatory AI provenance label), `ChatLine` | invoke bot, report bot | Persisted bot-profile operations | Bot event stream |
| Live sessions | Command-log livestreams ([ADR-0050](../../design-decisions/0050-command-livestream-privacy.md)) | `LivePanel`, `ChatLine` | join session, follow streamer | Persisted live-session operations | Live command replay |

Three constraints hold across every row, and they are what make the table safe:

1. Every listed intent is a *proposal*. A script or model composing
   `VoteControls` does not cast a vote; it renders an affordance the platform
   commits when a member presses it.
2. Credential, payment, and permission surfaces appear in no row. They are
   platform chrome, refused to scripts and models by placement class.
3. Bot output travels the same catalog, the same lint, and the same sandbox as
   member scripts. Bots are authors with scoped identities (contract C9.5), not
   a parallel system — which halves the surface that has to be defended.

### 4.1 Community algorithms without arbitrary queries

The one social capability the ladder above does not reach is ranking: members
want to author feeds, not just decorate them. The pattern that solves this
without handing scripts query power comes from ATProto feed generators — the
script returns a ranked list of identifiers, and the platform hydrates the
content and applies blocks, labels, and permissions afterward. The skeleton
boundary is the security boundary, and it composes exactly with the batch
bridge Epoch already specifies. ADR-0060 adds it as contract C14.

## 5. Audit of ADR-0058 against the patterns

| Pattern | Status in the frozen plan | Residual gap | Closed by |
|---|---|---|---|
| Removal-based sandbox, pooled workers, unswallowable quota kill | Covered — C1, including `pcall`/`xpcall` shadowing | None | — |
| Batch-in/batch-out bridge economics | Covered — C2, one round trip per dispatch | None | — |
| Catalog-constrained generation with mandatory a11y and placement policy | Covered structurally — C3 | Catalog has no named social components | ADR-0060 §1 (C3.6–C3.8) |
| Style tier without exfiltration vectors | Covered — C5 | None | — |
| Themes as sparse token data | Covered — C6 | None | — |
| Persisted operations as governance object | Covered — C7 | None | — |
| Distribution as the primary attack surface | Covered — C4, C9 | No shareable bundle unit | ADR-0060 §2 (C13) |
| Context-dependent trust, risk-tiered approval | Covered — C8 | None | — |
| Non-waivable accessibility floor | Covered — C10 | None | — |
| Capability-floor charter, stability tiers, deprecation | Covered — C11 | None | — |
| Bots as authors through one pipeline | Covered — C9.5 | Bot roster is not part of a shareable bundle | ADR-0060 §2 (C13) |
| Programmable ranking (skeleton/hydration) | Not covered | Scripts cannot author feeds | ADR-0060 §3 (C14) |
| Reviewed isolated app tier | Not covered | No named future rung | ADR-0060 §4 (reservation) |

Two findings are worth stating plainly. First, the frozen plan is already the
right architecture for the hard parts — the runtime, the bridge, the trust
boundary, and the accessibility floor need no revision. Second, its gaps are
all *social*: the plan describes how to customize a surface safely without yet
describing the surfaces being customized, the unit communities actually share,
or the ranking members will ask for first. ADR-0060 closes those three and
names the fourth rung so the ladder has a top.

## 6. Where this could still go wrong

- **Homogenization.** Catalog-constrained generation makes every generated
  surface look alike. The token tier is the antidote, which is an argument for
  spending the editable-token budget on identity-bearing tokens.
- **Bundle sprawl.** A bundle that installs a theme, four scripts, and three
  bots in one gesture is exactly the artifact whose compromise hurts most. The
  content-hash pinning and per-member killbit in C13 are load-bearing, not
  bookkeeping.
- **Platform-authored AI in community space.** The strongest negative result in
  the surveyed material is a platform's own AI feature injected into community
  surfaces without consent and rapidly becoming one of the most blocked
  accounts on its network. Whatever Epoch ships in the bot tier should be
  opt-in per community by default.
- **Approval fatigue.** Risk-tiered approval is specified; if it is
  implemented as a universal confirmation step it will fail in the measured
  way. The telemetry in C8.4 exists to detect that, and should be watched.

## 7. Sources of the underlying research

The comparative material behind this evaluation was gathered outside the
repository (industry postmortems, platform documentation, and specification
texts for WoW addon confinement, Luau sandboxing, browser Lua runtimes,
declarative generative-UI formats, sandboxed-iframe app tiers, design-token
formats, user-CSS safety, persisted GraphQL doctrine, marketplace governance,
and ATProto programmability). Claims that this document turns into repository
commitments appear in ADR-0060 and the contracts it adds; claims that remain
context are stated here as context, and no gate depends on them.
