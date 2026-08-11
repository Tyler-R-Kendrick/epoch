# Adversarial Design Critique — Community Web

Screenshots and DOM measurements for both critique rounds live beside this
file: `baseline/` is the product before the redesign, `after/` is the shipped
build. The run copy under `.optimizexp/runs/` is gitignored, so this is the
durable record.

**Regenerate `after/` as the last step of any change.** Round 2 caught captures
that did not depict the shipped build because they were generated mid-change;
evidence that contradicts the product is worse than no evidence.


**Personas:** designer (primary), junior-mobile-designer (supporting)
**Surfaces:** community, network, issues, changes @ 1440x960 and 390x844
**Evidence:** docs/evidence/design-critique/{baseline,after}/ + measurements.json
**Prerequisites:** token-conformance pass, zero open defects — craft scorable.

## Round 1 verdict — FAIL, 0 of 8 automatic-fail conditions clear

32 findings (7 P0, 16 P1, 9 P2). The composer was not sticky on any viewport
and sat ~100px below the fold on a phone; mobile spent 83-85% of the first
screen on chrome; Approve shipped as a 28px reaction chip identical to "wave";
#general said "no repository required" five times in one viewport above 375px
of void; liveness was declared eight times and contradicted itself.

## Round 2 verdict — FAIL, 3 of 8 clear

The reviewer refused the evidence package and re-rendered the build, proving
the captures did not depict what shipped (generated mid-change). Score:
21 resolved, 2 partial, 7 not resolved, 2 regressed.

Cleared in round 2: Lifeless product (one row primitive, real type scale),
AI-slop tells (radius inventory 4px/2px only, zero 999px, vanity counts gone),
Trust theater (provenance behind one disclosure).

## Round 3 — findings worked after round 2

- [x] Empty states rendered 32px wide inside a 1192px pane: .row-state landed
      in the row primitive's avatar column. Now 468px. Invisible in evidence
      because the capture fixture is never empty.
- [x] Mobile rail was still four horizontal scrollers clipping mid-word with
      six of nine channels behind a sideways swipe, while the comment above
      claimed it was a vertical list. It is now.
- [x] Live banner shipped in the warning treatment reserved for degraded
      states; the mint live style existed and was never applied.
- [x] Primary actions were 32px against the DESIGN token's 36px because
      element-level rules predating the four-treatment system overrode it.
- [x] Reactions rendered as borderless ghosts against the bordered-control rule.
- [x] Family: three primary-action colours (ink/copper/green) and 32/40/32
      heights under a commit titled "one product family". One of each now.
- [x] Composer present on every plane (measured 97px on community, network and
      repo), disabled with a reason where posting is not possible.
- [x] Dead CSS describing a removed product: .api-banner-live,
      .dev-feed-action height, first-run strip rules.
- [x] Evidence regenerated as the final step; measurements match the build.

## Measured, baseline to now

  controls under 32px      3 / 6 / 28 per plane  ->  0 on all eight captures
  smallest control         14-15px               ->  32px
  primary action height    28px                  ->  36px
  row text origin          42.4 / 40.4 / 18.4px  ->  one per viewport, 4 planes
  mobile chrome            83-85%                ->  12-13%
  rail groups self-clipping                      ->  0
  visible text (mobile community)  1308 chars    ->  ~790

## Known residual (not claimed as fixed)

- Feed void on a sparsely populated #general: the channel-origin marker was
  added but a one-message channel still leaves substantial white space.
- Signed-action discoverability: the row title is the affordance and carries
  an accessible name, but there is no persistent non-hover indicator.
- Dev-feed row height spread remains ~2x, driven by whether an item has a body
  and one or two actions.
- Repo-plane h1 is still the repo slug; the breadcrumb carries the community.

## Canonical Nightboard promotion — PASS (2026-08-10)

The reviewed change does not redesign Nightboard; it removes the superseded
Civic Workshop local/deployment entrypoints so the already-approved Nightboard
landing and board are the product users actually receive.

Persona: `@persona.github_open_source_contributor` / GitHub open-source contributor
Surface: `/` → `/board.html`
DESIGN.md north star check: **pass** — the shipped route is now the Grid world instead of Course Line.
Craft (hierarchy, density, typography, color rarity): **pass** — desktop and mobile inspection preserved the FIGlet hierarchy, cyan/magenta rarity, and character-grid density.
Playfulness / wonder (craft delight, not slop): **pass** — CanvasUI decrypt/glitch/VHS wiring and the grid road are loaded from the canonical build.
Competitive bar: **pass** — the first action is the explicit Enter-the-board journey, followed by the keyboard collaboration surface rather than a generic forge shell.
Accessibility / honesty / trust legibility: **pass** — the user journey asserts the landing, CanvasUI runtime, board mount, grid road, and keyboard cue; axe remains a required gate.
Unacceptable issues: none.
Delight opportunities: keep the source single; do not recreate a parallel package renderer.

Persona: `@persona.maintainer` / maintainer
Surface: `/board.html`
DESIGN.md north star check: **pass** — the tmux-style board is the only app entrypoint.
Craft (hierarchy, density, typography, color rarity): **pass** — the family palette audit is clean after removing six stale Course Line manifest colors and four off-ramp type literals.
Playfulness / wonder (craft delight, not slop): **pass** — onboarding teaches the keyboard model in the board itself without replacing the working surface.
Competitive bar: **pass** — dense channels, activity, status, and first-keys help communicate a real operating place rather than gray moderation chrome.
Accessibility / honesty / trust legibility: **pass** — first-visit controls expose Esc and Ctrl+Space, and no legacy route can present contradictory live/snapshot UI.
Unacceptable issues: none.
Delight opportunities: preserve the direct brand-to-landing and Esc-to-home exits.

Evidence: `.optimizexp/audits/token-conformance.json` (0 findings),
`.optimizexp/defects.json` (no open defects),
`features/community_web_experience.feature`,
`test/features/community_web_experience_steps.ts`, and
`docs/evidence/nightboard/`. The deterministic Impeccable detector returned no
findings for `docs/design-explorations/nightboard/index.html`; rendered DOM and
desktop/mobile screenshots were inspected from the local canonical server.
