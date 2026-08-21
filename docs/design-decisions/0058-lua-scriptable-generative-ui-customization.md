# ADR-0058: Lua-scriptable generative UI customization for Community Web

- Status: Proposed
- Date: 2026-08-21

## Context

Community Web's theme contract (`docs/community-web/CONTRACT.md`) fixes markup
and lets themes write CSS only. Separately, the repository already ships
generative UI (OpenUI Lang catalog + `{root, elements}` spec rendered into the
same `[data-c]` markup) and a WASM capability-provider sandbox
(`packages/Epoch.Extensions`, ADR-0045) with an unclaimed `"view"` capability
kind and an `advisory` tier that may never contribute to signed state.

The next step — user- and community-authored scripted/generative
customization — concentrates risk in the distribution channel rather than the
sandbox (the lesson of mod-store and browser-extension supply-chain
incidents), and in placement of trust-bearing UI rather than content filtering
(payment/permission/credential prompts must be unplaceable, not merely
filtered). Execution economics (worker spawn cost, per-call RPC overhead) and
quota enforcement (guest code swallowing host kill signals via raw
`pcall`/`xpcall`) are the known failure modes of naive Lua embedding.

The full execution plan, adversarial critique record, and contracts C0–C12
live in
[`docs/plans/lua-ui-customization/master-instructions.md`](../plans/lua-ui-customization/master-instructions.md).

## Decision

1. **Runtime.** wasmoon (Lua 5.4 → WASM) is the default `LuaRuntimeAdapter`;
   a Luau→WASM adapter slot is reserved; fengari serves SSR-preview only.
   Execution runs on a prewarmed 1–2 worker pool with per-script sandboxed
   states (never worker-per-script). Raw `pcall`/`xpcall` are shadowed so
   quota-kill is unswallowable. The dialect is pinned in the script manifest.
2. **Wire format.** Extend the existing OpenUI Lang catalog plus the repo's
   local `{root, elements}` spec convention; place the spec behind an internal
   abstraction module so a later A2UI adapter is additive. No new npm
   dependency.
3. **Tokens.** DTCG 2025.10 sparse overlays in a `com.epoch.*` `$extensions`
   namespace, ≤~40 user-editable semantic tokens targeting `--cw-*` only;
   `DESIGN.md` frontmatter remains the platform token source of truth; the
   `Epoch.DesignTokens` generator resolves overlays; the WCAG AA floor reuses
   the existing `app/theme.js` contrast check.
4. **CONTRACT.md amendment (planned).** Amend to a customization-tier model:
   Tier 1 themes (CSS only — existing text preserved verbatim), Tier 2 token
   overlays (DTCG → `--cw-*`), Tier 3 scripts (emit specs/intents only; never
   CSS/DOM/network), plus a "What a script cannot do" sibling list.
5. **Packaging.** New `packages/Epoch.Community.Scripting` hosts the runtime;
   scripts are Epoch.Extensions citizens claiming the `"view"` capability kind
   at the `advisory` tier, reusing manifests, signing, publisher lifecycle
   (ADR-0046), trust, and store. No second distribution system.
6. **Persisted GraphQL.** Additive `scripts/build-persisted-ops.mjs` with
   `--check` byte verification (the repo's deterministic-artifact pattern)
   emitting a content-addressed operation manifest; scripts reference only
   operation hashes declared in their manifest; the dynamic in-browser engine
   remains for interactive use.

## Consequences

- Customization is tiered: CSS (verbatim Tier 1), token overlays, and scripts
  each have a distinct, enforceable authority ceiling.
- Trust decisions concentrate at the extension store (publisher identity,
  per-version killbit + tombstone + notify, staged rollout, reputation tiers),
  matching where the real attacks occur.
- "UI proposes, gesture commits": scripts and models emit intent proposals;
  only user gestures on platform chrome commit them; blocked placement classes
  are refused by the renderer.
- The Community Web CSP posture, today asserted only in CONTRACT.md prose,
  must be implemented for real as part of this work.

## Revisit when

- An A2UI (or other spec) adapter is proposed against the abstraction module.
- The Luau→WASM adapter slot is claimed, or wasmoon proves unsuitable.
- Tier 3 authority needs to grow beyond spec/intent emission — that requires a
  new ADR, not an edit of this one.
