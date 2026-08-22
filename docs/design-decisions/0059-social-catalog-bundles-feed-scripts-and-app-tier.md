# ADR-0059: Social catalog, community bundles, feed-skeleton scripts, and a reserved app tier

- Status: Proposed
- Date: 2026-08-22

## Context

[ADR-0058](0058-lua-scriptable-generative-ui-customization.md) fixed the
architecture for Lua-scriptable generative UI customization of Community Web:
a pooled wasmoon runtime, a batch-in/batch-out capability bridge, an extended
OpenUI catalog with mandatory accessibility fields and placement policy, a
sanitized CSS tier, DTCG `--cw-*` token overlays, persisted GraphQL operations,
and distribution as advisory `view`-kind Epoch.Extensions citizens. Its
contracts C0–C12 live in
[`docs/plans/lua-ui-customization/master-instructions.md`](../plans/lua-ui-customization/master-instructions.md)
and are additive-only.

A cross-industry evaluation of scripted and generative customization —
recorded in
[`docs/plans/lua-ui-customization/pattern-evaluation.md`](../plans/lua-ui-customization/pattern-evaluation.md)
— audited that architecture against the patterns other ecosystems converged on
(sandboxed game addons, editor scripting, streaming and chat extension tiers,
agent-surface app sandboxes, design-token pipelines, user-CSS safety,
persisted-operation doctrine, marketplace governance, and programmable social
graphs). The audit found the runtime, bridge, trust boundary, style tier, token
tier, and accessibility floor already correct and in need of no revision.

It found four residual gaps, all of them social rather than structural:

1. The catalog is specified structurally but names no social components, so the
   experiences Community Web actually offers — micro-post feed, community
   channels, question-and-answer, live sessions, bots — have nothing to compose
   from. The shipped catalog is six generic components (`Panel`, `Post`,
   `Notice`, `Channel`, `Fact`, `Theme`).
2. There is no shareable bundle. The evidence is consistent across ecosystems
   that the packaged bundle (theme plus scripts plus configuration) is
   simultaneously the growth unit and the risk unit; Epoch has distribution for
   individual scripts but no unit a community can share as its whole look.
3. Scripts can customize a view but cannot rank one. Members ask for
   community-authored feeds early, and the safe pattern for it — the script
   returns identifiers only and the platform hydrates and permission-checks —
   is not in the contracts.
4. The tier ladder has no top. Reviewed, isolated third-party apps are the
   fourth rung every comparable ecosystem eventually built; ADR-0058 names no
   slot for it, so the first proposal would arrive as an architectural
   surprise.

ADR-0058's own "Revisit when" clause directs new scope to a new decision record
rather than an edit, which is what this record is.

## Decision

1. **Social-primitive catalog.** Extend the C3 catalog, through the existing
   `scripts/build-openui.mjs` generator, with a named social set: `PostCard`,
   `ThreadView`, `ChannelList`, `ChatLine`, `AnswerBlock`, `VoteControls`,
   `LivePanel`, `BotCard`, `EmbedCard`, and `UserLine`. Each declares complete
   accessibility fields and its allowed `placementClass` set like every other
   catalog component. Consequential affordances (vote, accept answer, follow,
   repost, compose, send) exist only as intent proposals committed by a member
   gesture on platform chrome; `BotCard` carries a non-removable AI provenance
   label. Credential, payment, and permission surfaces remain `blocked` and
   unplaceable. Recorded as contract clauses C3.6–C3.8.

2. **Community bundles.** Add contract C13: a signed bundle manifest that
   aggregates a token overlay, a CSS-tier artifact, scripts, and a bot roster
   as content-hash-pinned members. A bundle is an Epoch.Extensions citizen and
   installs each member through the existing C4 manifest and C9 trust
   machinery — publisher identity, signing, staged rollout, reputation. The
   killbit operates at both bundle and member granularity, and a killed member
   leaves a tombstone at its installed position exactly as a killed script
   does. No second distribution system.

3. **Feed-skeleton scripts.** Add contract C14: a `view`-kind script may
   implement a skeleton interface returning a ranked list of identifiers per
   dispatch, under the same C2 batch rules as spec mutation. The host hydrates
   those identifiers through its own persisted operations and applies blocks,
   labels, and permission checks after hydration. The script never receives
   hydrated content it did not already have in its snapshot, and skeleton
   output stays advisory-tier: it orders what a member can already see and can
   never widen visibility.

4. **Reserved app tier.** Name a fourth customization tier — reviewed,
   sandboxed-iframe apps on a platform-controlled origin, with a message
   bridge instead of DOM access, host-minted scoped identity, declared network
   egress, and the persisted-operation set as their entire query surface. This
   is a reservation in the same sense as ADR-0058's Luau adapter slot: no
   implementation is authorized by this record, and claiming the slot requires
   its own ADR.

## Consequences

- The customization ladder is complete and legible: token overlays, themes,
  scripts, and a named future app tier, with promotion paths between rungs and
  one manifest, signing, and store pipeline across all of them.
- Generated and scripted UI can finally compose the product's real social
  surfaces, which also means the accessibility and placement gates now apply to
  the components members will actually use rather than to generic containers.
- Bundles concentrate both value and risk in one artifact. Content-hash pinning
  and member-granular killbits are load-bearing consequences, not bookkeeping,
  and the store's install preview must show what a bundle contains before it is
  accepted.
- Community-authored ranking becomes possible without granting query power, at
  the cost of a hydration path the host must own and permission-check on every
  dispatch.
- Contracts C13 and C14 add acceptance rows REQ-11 through REQ-13 to the
  execution plan's matrix; the initiative's acceptance bar remains a full
  `npm run verify`.

## Revisit when

- The reserved app tier is claimed; that requires its own ADR covering
  sandboxing, review, egress policy, and identity.
- Skeleton scripts are asked to rank content the requesting member cannot
  already see, which would change the advisory-tier semantics and needs a new
  decision rather than a contract amendment.
- Bundle membership grows beyond overlays, CSS artifacts, scripts, and bot
  rosters.
- The social catalog set needs components whose consequential actions cannot be
  expressed as gesture-committed intent proposals.
