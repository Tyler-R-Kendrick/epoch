# Visual semantic-mirror example

A tiny, fully synthetic fixture (no model calls) showing why a left-facing
view is **not** a blind horizontal flip of the right-facing pixels, and how
the `chirality-attachment-invariant` evaluator template
(`assets/evaluator-templates/chirality-attachment-invariant.yaml`) catches
the difference.

## Files

- `entity-ledger.yaml` — the semantic identity ledger for character `bo`:
  the bindle prop is carried by `hand.R` with grip `grip.bindle`, the hair
  part is on the semantic **left**, and `unqualified_horizontal_pixel_flip`
  is a forbidden transform.
- `naive-flip.landmarks.json` — landmarks re-detected on a naive horizontal
  pixel flip of the right-facing view. The image *looks* plausible, but the
  mirror turned the character's right hand into a left hand: the bindle is
  now attached to `hand.L` and the hair part reads as `right`. The file
  also records the forbidden transform that produced it.
- `chirality-aware.landmarks.json` — landmarks from a chirality-aware
  left-facing derivation (the character is re-posed/re-rendered facing
  left). Same silhouette, same landmark positions, but the bindle stays in
  `hand.R` and the hair part stays `left`, matching the ledger.

## The key observation

The two landmark files have **identical geometry** — every named landmark
sits at the same image position, so a silhouette or pixel-level comparison
cannot tell them apart. They differ exactly in the chirality-sensitive
semantic fields:

| Field | Ledger | Naive flip | Chirality-aware |
|---|---|---|---|
| `attachments.bindle` | `hand.R` | `hand.L` ✗ | `hand.R` ✓ |
| `features.hair_part.semantic_side` | `left` | `right` ✗ | `left` ✓ |
| `derived_by` | — | forbidden transform ✗ | allowed ✓ |

## How the evaluator catches it

A cross-representation invariant checker loads the ledger and each derived
view's landmarks, then asserts:

1. every attachment side matches `features.<prop>.carried_by` in the
   ledger;
2. every declared asymmetry (here `hair_part`) matches its ledger side;
3. the view's `derived_by` transform is not in `forbidden_transforms`.

The naive flip fails all three checks; the chirality-aware version passes
all three. `scripts/tests/unit/test_profiles.py` implements this checker
deterministically against these exact files.
