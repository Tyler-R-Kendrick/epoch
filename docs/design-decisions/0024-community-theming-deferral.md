# ADR-0024: Community Web Theming — Token-Inversion-Ready, Dark Mode Deferred

**Status:** Accepted
**Date:** 2026-08-03
**Supersedes:** None
**Related:** [ADR-0010](0010-epoch-community-design-system.md) (design system), root `DESIGN.md`, `packages/Epoch.DesignTokens`

## Context

Community Web ships light-only: `color-scheme: light` is hard-declared and no
`prefers-color-scheme` rules exist anywhere in the community code. Until now
this was a silent gap rather than a decision — the design-system reference
lists undeclared theming as an "uncertainty smell" (agents invent theming
because docs never ruled on it), while `community-web-responsive-craft`
names dark mode a non-goal without saying why or when that changes.

DESIGN.md's refusal list bans "dark terminal cosplay" and "pure-black social
fatigue," but that refuses a *bad* dark theme, not theming itself. Competitor
bars (Bluesky, GitHub, Discord) all ship dark modes.

## Decision

1. **Dark mode is explicitly deferred, not silently absent.** The light-only
   lock is now a declared decision that lives in exactly one place: the
   generated `epochTokensCss` from `@epoch/design-tokens` declares
   `color-scheme: light`. No other file may declare a color-scheme.
2. **The token layer must stay inversion-ready.** All color in the web
   surfaces flows through semantic `--epoch-color-*` custom properties
   generated from DESIGN.md frontmatter. The token names are role-named
   (surface, ink, line, rail, accent), never lightness-named — nothing may be
   called `--epoch-color-white` — so a future dark theme is a second value
   set behind the same names, not a rewrite.
3. **The inversion recipe is recorded now** so the future change is bounded:
   - add a `colors-dark` map to DESIGN.md frontmatter (same keys as `colors`);
   - teach `generate-tokens.mjs` to emit it under
     `@media (prefers-color-scheme: dark)` plus `:root[data-theme="dark"]`
     overrides, and flip `color-scheme` to `light dark`;
   - dark values must preserve the named rules (Copper Rarity, Trust Color,
     gold-only-for-verification) and refuse pure-black surfaces;
   - the token-conformance audit and design-council review gate the palette
     before any dimension claims craft credit for it.

## Why defer

Shipping dark mode now would double the visual QA surface of every pending
architecture PR (decomposition, client extraction, CSS extraction) for zero
competitive-scorecard credit, while the prerequisite — a single generated
token layer actually consumed by all surfaces — is the same work either way.
Sequencing the token layer first makes dark mode a data change later instead
of a second hand-maintained stylesheet.

## Revisit criteria

Implement dark mode when either: (a) the `craft` dimension reaches `proven`
on the current light theme and the token layer is consumed by Community, Ops,
and Platform Web with zero structural audit findings; or (b) user-facing
feedback names dark mode a switching blocker. The implementation must follow
the recipe above and pass a design-council run.
