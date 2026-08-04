---
type: Reference
title: "Community Web design redesign initiative state"
description: "SDLC state for the Community Web visual and interaction redesign, the adversarial critique rounds that drove it, and the review-process changes that made criticism possible."
tags: [epoch, plans, sdlc, design, critique, community]
---

# Initiative: Community Web visual and interaction redesign

- **Phase:** closed (`/sdlc finish` 2026-08-03)
- **Slug:** `community-design-redesign`
- **Opened:** 2026-08-03
- **Branch:** `community-experience-redesign`
- **Host:** Claude Code

## Goal

The previous session was **rejected by the user**: it rebuilt infrastructure and added
features at the edges without changing the design. The before/after pixel diff measured
~10% of pixels differing and described it as "glyph and hairline shifts of 1–3px" — a
precise measurement of nothing having visually changed.

The user named three hypotheses: personas not critical enough, a review process that does
not promote criticism, or criticisms not actually being fixed. All three were confirmed,
downstream of a fourth: **the apparatus had never been switched on.**

## Why criticism had never landed (forensics)

- The seven design personas appear in **zero** completed runs; only competitor
  feature-parity personas ever ran.
- Every `scores.json` gave **byte-identical integers to all ten personas** across five
  iterations — one author filling a matrix, not a panel.
- The metrics cannot represent "ugly": a visually incoherent screen that is safe, fast and
  unambiguous scores 0/0/0 on harm.
- The two aesthetic instruments (`hcd.aestheticAndMinimalistDesign`, the `cognitive.*`
  channels) are fully specified and had **0% utilization**.
- Every persona threshold was an **anti-uplift veto**, never a standing-state fail, so
  existing badness was structurally invisible.
- `review.json` had **no field for a defect**; 9 of 10 reviews were self-reviews, and a
  measured 28px control was cited *as grounds for acceptance*.
- The Adversarial Design Critique Protocol — mandated in `DESIGN.md`, `AGENTS.md` and the
  PR template — had been executed **zero times**.

## Process landed

Standing-state fail bars with numbers in the design personas; `defects[]` plus
self-review detection in the evidence review schema; score-divergence validation;
the design critique required as a run artifact with a verdict and an attributed persona;
`cognitive` block required for UX runs.

## Product landed

Three critique rounds drove the work. Round 1: FAIL, 0 of 8 automatic-fail conditions
clear, 32 findings. Round 2: FAIL, 3 of 8 clear — and the reviewer refused the evidence
package, re-rendered the build, and proved the captures did not depict what shipped.
Round 3 worked those findings and regenerated evidence last.

Designed in Figma first (tokens, six-level type scale, desktop and mobile frames):
<https://www.figma.com/design/3Bw8JiHxUOfi0VP5L8h3NF>

| Measure | Before | After |
|---|---|---|
| Controls under 32px | 3 / 6 / 28 per plane | 0 on all eight captures |
| Smallest control | 14–15px | 32px |
| Primary action height | 28px | 36px |
| Row components | 3 (164 / 59–133 / 83px) | 1 primitive |
| Row text origin | 42.4 / 40.4 / 18.4px | one per viewport, all four planes |
| Button treatments | 13 | 4 |
| Mobile chrome before content | 83–85% | 12–13% |
| Explanation + status share of text | 54.2% | text budget enforced by test |

Shell: composer sticky and present on every plane; rail is a vertical sheet on phones;
one state chip replaces eight liveness statements; honesty band only when degraded.
Family: one primary-action colour, one radius scale, one control height across Community,
Operations and Platform Web; the `--ops-*` alias layer that inverted "accent" is deleted.

## Validation

`npm run verify` green — docs, lint, design:lint, design:audit (zero findings, enforcing),
typecheck, konsistent, build, unit, 20 cucumber scenarios, axe (zero violations), coverage,
pact.

## Residual (next initiative — not unfinished merge)

- Sparse-channel void: the channel-origin marker landed, but a one-message channel still
  leaves substantial white space.
- Signed-action discoverability: the row title carries an accessible name but there is no
  persistent non-hover affordance.
- Dev-feed row height spread remains ~2×, driven by body and action-count variance.
- Repo-plane `h1` is still the repo slug; the breadcrumb carries the community.
- Motion and iconography specs, i18n execution, dark mode (deferred by ADR-0024).

## Delivery decisions

- Evidence must be regenerated as the **last** step of a change. Round 2 caught captures
  that contradicted the shipped build because they were generated mid-change.
- Test assertions that encoded the old design were updated deliberately and named in the
  commits that changed them (snapshot banner copy, stacked-header contract, narrow-screen
  rail contract, navigation overflow contract).

## Review closeout (PR #94)

CodeRabbit raised ten inline findings after the redesign landed on the branch. All ten
were confirmed and fixed in `4a894f9`; all four threads that survived to the final push
are replied to and resolved. Two are worth recording because they are the same failure
class this initiative was opened to fix:

- **`model/feed.ts` labelled seeded fixtures `source: "api"` on the live path**, three
  lines below a comment promising live mode never mixes demos into product activity —
  and the unit test asserted that dishonest contract. Both corrected: repository-derived
  rows are `api`, fixtures stay visible and stay `snapshot`.
- **The render-parity search gate only grepped the bundle for a helper name**, which a
  dead or renamed-but-diverged reference would pass. It now boots the shipped document
  in jsdom and compares what the runtime hides against what the helper matches.

Also corrected in the harness the initiative added: `lintScoreDivergence` rejected the
converged harm floor, which is the documented terminal state of a successful run, and
`capture-evidence --mode review` dropped the `defects`/`authoredBy` fields whose
validation it was meant to satisfy. Both now have tests covering both directions.
