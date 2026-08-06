---
score: 28
p0: 0
p1: 2
p2: 3
mode: operate
timestamp: 2026-08-06T01-19-35Z
slug: docs-design-explorations-nightboard-index-html
---
# Nightboard critique (Impeccable)

**Provenance:** Assessment A + B via isolated sub-agents. Live URL `http://127.0.0.1:8902/`.

## Verdict

Nightboard is highly product-specific (filesystem board, signed promote, TUI chrome). Heuristics **28/40**. Detector CLI clean on static HTML; live inject reported 54 anti-patterns — most intentional Grid neon/density false positives. Real risks: `text-occlusion` on prompt/sigil, mobile blade squeeze (addressed this iteration).

## Strengths

1. Keyboard-first is real (numbers, j/k, Ctrl+Space, scoped prompt).
2. Honest signed/promoted state language.
3. Character-native craft (brackets, nest rails, braille sigils) — not generic dark SaaS.

## Priority backlog

| Pri | Issue | Status |
|---|---|---|
| P1 | Mobile two-column squeeze (list max-width beat narrow MQ) | Fixed — 100% single-blade ranger |
| P1 | First-run AI fetch copy reads as fault | Fixed — invite + Alt+A cli fork |
| P2 | `[Alerts blocked]` danger signal | Fixed — warn + `Allow alerts` |
| P2 | Full reaction row glow budget | Open |
| P2 | Lucene view bar always visible | Open |

## Heuristics

Visibility 3 · Match 3 · Control 3 · Consistency 3 · Prevention 2 · Recognition 2 · Flexibility 4 · Minimalist 2 · Recovery 3 · Help 3 → **28/40**

## Detector (Assessment B)

- CLI `detect.mjs` on index.html / directory: exit 0, 0 findings
- Live inject: 54 findings; treat `ai-color-palette`, neon glow, undersized HUD as expected for Grid
- Likely real: text-occlusion (sigil under prompt), clipped-overflow on mount

## Persona red flags

Mobile was not keyboard-first until ranger fix. Lucene bar intimidates. Anonymous vs Activity compete in masthead.

## Provocative questions

1. Default mobile to single-blade until Enter? (now CSS-forced full-width pages)
2. Collapse FIGlet after boot to reclaim thread space?
3. Hide Lucene until `/view` or pin?
