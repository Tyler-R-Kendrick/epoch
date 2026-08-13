# ADR-0026: The Community Visual World Is Course Line

**Status:** Superseded by [ADR-0027](0027-community-visual-world.md)
**Date:** 2026-08-04
**Supersedes:** The visual sections of root `DESIGN.md` (colors, typography, elevation, shapes) — later replaced by Community Web
**Related:** [ADR-0024](0024-community-theming-deferral.md), [ADR-0027](0027-community-visual-world.md), `PRODUCT.md`, `docs/design-explorations/redesign-2026/`

## Context

The product owner rejected the incumbent look twice, and the second rejection
named the cause precisely: two rounds of work had systematized components
without changing what the product looks like. A replacement visual world was
commissioned, along with ten candidate directions to choose from.

The ten were derived through impeccable's new-work flow, with the category rut
named and excluded — the three-column chat app the product currently is, and its
predictable opposite, the repo dashboard — as was the literal reading of the
product's own name. `concept-seed.mjs --scope direction --mode operate` then
assigned **index 4, Plate Archive**, so that the roll rather than the model's
own ranking decided what leads.

The product owner then delegated the choice back: "you figure it out."

## Decision

**The visual world is Course Line**, derived from the ISOM orienteering map
standard: a permanent legend, every ink meaning exactly one thing, and one
reserved ink carrying the course over the terrain.

### Overriding the roll

impeccable permits re-rolling the assignment only on named factual grounds —
never taste. Plate Archive fails on two:

1. **Audience identification.** `PRODUCT.md` ranks the citizen builder first,
   with a cognitive-load-sensitive profile and a time budget of minutes. Plate
   Archive is register-led: it puts an archival numbering apparatus in front of
   the conversation, so a newcomer must learn a filing system before reading a
   message. That is a direct breach of Product Principle 4 — *a newcomer must
   not meet the maintainer's control surface first.*
2. **A standing architecture decision.** Plate Archive is constitutively dark;
   its world is a dark archive and it does not survive being lightened.
   [ADR-0024](0024-community-theming-deferral.md) defers dark mode and locks
   `color-scheme: light` in exactly one generated place. Shipping Plate Archive
   means either reopening a settled decision or gutting the direction.

Course Line was **dealt by the roll as a challenger**, not ranked by me, so the
anti-convergence property the seed exists to protect is preserved. It was judged
to fuse well at deal time and is adopted on that judgement.

### Why it carries this product

- **The legend is permanent and authoritative.** ISOM teaches its own vocabulary
  by being present, not by narrating. This is the answer to a product that had
  54% of its text explaining itself: the legend replaces the explanations.
- **Every ink means exactly one thing.** This is Product Principle 3 — *state
  the truth about state* — expressed as a colour system rather than a sentence.
- **One reserved ink for the active leg.** The promote path from conversation to
  signed work is the mechanism no competitor can copy, and ISOM's discipline of
  reserving purple for the course renders it directly.
- **It is light, high-contrast, and legible at speed**, which the ranked persona
  order requires and ADR-0024 already assumes.
- **It scales to the family.** A legend and a terrain palette carry to
  Operations Web and Platform Web without renegotiation; the reserved course ink
  keeps meaning the same thing in all three.

### Adopted from other candidates

- **Almanac's "In plain words".** A plain-language restatement is available on
  work items whose vocabulary is domain-specific. The citizen builder should
  never need the glossary to know what happened.
- **Plate Archive's cross-reference discipline.** Anchors render inline against
  the thing they point at, rather than inside a collapsed disclosure.

### What is preserved

Product truth, content, function, terminology, and every constraint in
`PRODUCT.md`. The named layout rules in `DESIGN.md` §4 survive: communities own
channels, the hangout works without a repository, linked projects are secondary,
the composer never leaves. Accessibility gates are unchanged.

## Consequences

- `DESIGN.md`'s colour, typography, elevation and shape sections are replaced;
  its layout and named-rule sections are largely retained.
- Design tokens regenerate from the new frontmatter; all three web packages
  inherit the change, which is the point of the family scope.
- The incumbent copper/teal/deep-green palette is retired. It was never the
  problem in itself, but it is not this world.
- Tests asserting incumbent colour or type values must be updated deliberately
  and named in the commit that changes them.

## Revisit criteria

- Real users exist and are observed failing the legend.
- Dark mode is undeferred, which would require re-testing every ink for
  meaning-preservation on a dark ground.
- A fourth surface joins the family whose task the terrain palette cannot carry.
