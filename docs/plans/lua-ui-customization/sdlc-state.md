---
type: Reference
title: "Lua-scriptable generative UI customization — SDLC state"
description: "Initiative state for the Lua-scriptable generative UI customization system for Community Web."
tags: [epoch, plans, sdlc, lua, community-web]
---

# Lua-scriptable generative UI customization — SDLC state

- Initiative: `lua-ui-customization`
- Phase: planned
- Branches: `claude/lua-ui-customization-g87ju7` (plan and ADR-0058),
  `claude/lua-ui-customization-0p0rld` (pattern evaluation and the ADR-0059
  amendment set)

## Goal

Design, implement, test, and validate a Lua-scriptable generative UI
customization system for Epoch Community Web: a wasmoon-based sandboxed Lua
runtime behind a batch-in/batch-out capability bridge, an extended OpenUI Lang
component catalog with mandatory accessibility schema and placement policy, a
sanitized CSS tier, DTCG token overlays over the `--cw-*` board contract,
content-addressed persisted GraphQL operations, and distribution/trust as
Epoch.Extensions `view` capability citizens — all under the repository's
existing gates, with full `npm run verify` as the acceptance bar.

The complete execution prompt for the delivery run is
[`master-instructions.md`](master-instructions.md); it is self-contained and
freezes design resolutions (§3) and contracts C0–C14 (§4) ahead of dispatch.
The design commitments are recorded in
[ADR-0058](../../design-decisions/0058-lua-scriptable-generative-ui-customization.md)
and [ADR-0059](../../design-decisions/0059-social-catalog-bundles-feed-scripts-and-app-tier.md).

The cross-industry evaluation behind the scope — the expressiveness ladder, the
trust patterns, the social-surface mapping, and the audit of ADR-0058 against
both — is [`pattern-evaluation.md`](pattern-evaluation.md).

## Amendment set (ADR-0059)

Additive over ADR-0058; no frozen resolution reopened and no existing contract
clause changed:

| Amendment | Contract | Acceptance row |
|---|---|---|
| Social-primitive catalog set with gesture-only consequential actions and a host-rendered `BotCard` provenance label | C3.6–C3.8 | REQ-11 |
| Community bundles: hash-pinned members, per-kind install, bundle/member killbit | C13 | REQ-12 |
| Feed-skeleton scripts: identifier-only output, host-side hydration and permission checks | C14 | REQ-13 |
| Reserved app tier (iframe apps), named and out of scope | §3(g), no contract | none — reservation |

## Session PR set

| PR | Merge SHA | Purpose |
|---|---|---|

## Residual

- Dispatch has not occurred; this record holds the plan and its state only.
- The reserved app tier has no contract and requires its own ADR before any
  swarm builds toward it.
