# Nightboard Persuade landing — orchestration runbook

Live scoreboard: [`progress.html`](progress.html) (serve with the exploration).
Surface brief: [`.impeccable-surface-landing.md`](.impeccable-surface-landing.md).

This runbook implements the improved master prompt: iterate the **existing**
static Persuade landing under Nightboard Grid. Do **not** recreate it as a
Higgsfield Worker / A4 film site.

## Authority (in order)

1. Root [`DESIGN.md`](../../../DESIGN.md) + [ADR-0027](../../design-decisions/0027-community-visual-world-nightboard.md)
2. [`.impeccable-surface-landing.md`](.impeccable-surface-landing.md)
3. [`docs/community-human-centered-design.md`](../../community-human-centered-design.md) adversarial critique protocol
4. User frontend craft rules only where they do not contradict `DESIGN.md`
5. Higgsfield website skill **only** for optional OG/cover stills — never `higgsfield website create` for this surface

## Surface

| Path | Role |
|---|---|
| `index.html` / `/` | Persuade marketing landing |
| `landing.css` / `landing.js` | Landing motion + CRT + chapters |
| `board.html` | Operate TUI (CRT must not bleed here) |
| `progress.html` | Live piece scoreboard for this runbook |
| `ascii.js` | FIGlet Epoch brand |

Serve:

```bash
python3 -m http.server 8902 --directory docs/design-explorations/nightboard
# Landing:  http://127.0.0.1:8902/
# Progress: http://127.0.0.1:8902/progress.html
# Board:    http://127.0.0.1:8902/board.html
```

Or: `node docs/design-explorations/nightboard/serve.mjs`

## Canvas UI MCP (component registry)

Nightboard uses Canvas UI vanilla effects ([installation](https://canvasui.dev/docs/installation),
[MCP](https://canvasui.dev/docs/mcp)). Repo setup:

1. `.cursor/mcp.json` — shadcn MCP server (`npx shadcn@latest mcp`)
2. Root `components.json` — pins `@canvas-ui` → `https://canvasui.dev/r/{name}.json`
3. Installed sources under `components/canvasui/*.ts` (typed vanilla)
4. Dependencies: `shadcn` (dev)

Enable the **shadcn** MCP server in Cursor Settings (green dot), then restart Cursor if needed.
Some effects need Chrome’s html-in-canvas flag or an origin trial — see the installation docs.
Prefer `*-vanilla` items for this static exploration:

| Effect | Registry item | Installed as |
|---|---|---|
| Asciify | `@canvas-ui/asciify-vanilla` | `components/canvasui/AsciifyVanilla.ts` (+ legacy `asciify.js` IIFE) |
| Decrypt reveal | `@canvas-ui/decrypt-reveal-vanilla` | `components/canvasui/DecryptRevealVanilla.ts` |
| Glitch | `@canvas-ui/glitch-vanilla` | `components/canvasui/GlitchVanilla.ts` |
| VHS | `@canvas-ui/vhs-vanilla` | `components/canvasui/VHSVanilla.ts` |

```bash
npx shadcn@latest add @canvas-ui/<name>-vanilla --yes
npx shadcn@latest search @canvas-ui --query glitch
# Rebuild landing IIFE bundles after component upgrades:
node docs/design-explorations/nightboard/build-canvasui-landing.mjs
```

Landing wiring (Persuade `/`):

| Host | Effect | File |
|---|---|---|
| `[data-fx="decrypt"]` hero brand | Decrypt reveal ([docs](https://canvasui.dev/docs/components/decrypt-reveal)) | `landing-fx.js` + `canvasui-fx.js` |
| `[data-fx="glitch"]` hero copy | Glitch bursts ([docs](https://canvasui.dev/docs/components/glitch)) | same |
| `[data-fx="decrypt"]` E01 What body | Decrypt → reveal product thesis | same |
| `[data-fx="glitch"]` theater | Glitch bursts | same |
| `[data-fx="vhs"]` board preview | VHS tape | same |

Html-in-canvas effects need Chrome’s flag / origin trial; they fail soft to readable DOM.
Terminal typewriter (`data-term-boot` / `data-term-replay`) always runs.

## Job

Persuade a developer that Epoch Community is where they collaborate, promote
their work, and get paid as creators (collaborate → promote → earn). Atmosphere
never replaces the argument. No fake social proof or live payout claims.
Honesty note required. CTA never opacity-gated. Do not pitch “promote message →
intent → receipt” as the marketing thesis.

## Visual world (locked)

- Void `#03050a`; magenta `#ff2cf0`; cyan agent `#40f0ff`; gold signed `#f0e050` for verification only
- Radius 0; monospace stack; no pills / glass / gradient text / Inter / purple-indigo SaaS
- Inspiration **roles** (not mashup):
  - [shader.se](https://www.shader.se/) — scroll storytelling + CRT tactility
  - Matrix / Tron — Grid material
  - Blade Runner — density / atmosphere budget
  - CursorUI — precise interactive chrome
  - [aino.agency](https://aino.agency/) — coded case index → `E##` / `P##` in Grid

## Anti-slop bans

No Inter/Geist, no three equal feature cards, no fake metrics/testimonials, no
emoji icons, no eyebrow kickers, no opacity-gated CTA, no Operate-chrome CRT bleed.

## Piece taxonomy

| ID | Piece | Primary files | Judge against |
|---|---|---|---|
| P1 | CRT material | `index.html` CRT nodes, `landing.css` | shader.se glass/scan/bezel tactility |
| P2 | Driving Grid floor | `landing.js` canvas, CSS cyc | Tron floor energy + chapter coupling |
| P3 | Epoch FIGlet brand | `ascii.js`, brand CSS | Brand-first hero; monospace intact |
| P4 | Hero argument + CTA | hero copy in `index.html` | Product truth; CTA never gated |
| P5 | Promote theater | theater canvas + scrub/seek | Interactive density without clutter |
| P6 | Case rail E00–E04 | rail HTML/CSS/JS | Aino index craft in Grid |
| P7 | What/How/Who panels | section HTML/CSS | One job per section; no eyebrows |
| P8 | Board plane catalog | P01–P03 + preview | Recognition before enter |
| P9 | Reduced-motion / perf / focus | JS + CSS media | Audit floor |
| P10 | Coherence integrator | whole landing | One composition; family with board |

## Master prompt (paste for orchestrator)

```text
ROLE: Orchestrator for Epoch Nightboard Persuade landing (NOT a greenfield Higgsfield site).

AUTHORITY (in order):
1. DESIGN.md + ADR-0027 Nightboard Grid
2. docs/design-explorations/nightboard/.impeccable-surface-landing.md
3. docs/community-human-centered-design.md adversarial critique protocol
4. User frontend craft rules only where they do not contradict DESIGN.md
5. Higgsfield website skill ONLY if generating optional OG/cover stills — never recreate this landing as a Worker/A4 film

SURFACE:
- Edit: docs/design-explorations/nightboard/{index.html,landing.css,landing.js} (+ ascii.js if brand)
- Serve static: python3 -m http.server …/nightboard  (or existing serve.mjs)
- Operate board at board.html must remain character-first; CRT is landing-only

JOB:
Persuade a developer that Epoch Community is where they collaborate, promote
their work, and get paid as creators. Atmosphere never replaces the argument.
No fake social proof or live payout claims. Honesty note required. Do not pitch
promote-message → intent → receipt as the marketing thesis.

VISUAL WORLD (locked — do not “improve” away):
- Void #03050a; magenta #ff2cf0; cyan agent #40f0ff; gold signed #f0e050 for verification only
- Radius 0; monospace stack; no pills/glass/gradient text/Inter/purple-indigo SaaS
- Inspiration ROLES (not mashup): shader.se = scroll storytelling + CRT tactility;
  Matrix/Tron = Grid material; Blade Runner = density/atmosphere budget;
  CursorUI = precise interactive chrome; aino.agency = coded case index → E##/P## in Grid

ANTI-SLOP BANS:
No Inter/Geist, no 3 equal feature cards, no fake metrics/testimonials, no emoji icons,
no eyebrow kickers, no opacity-gated CTA, no Operate chrome CRT bleed

ORCHESTRATION:
1. Write/update docs/design-explorations/nightboard/progress.html (simple live scoreboard:
   piece id, status, last critic score, biggest gap, wave #, links to localhost landing).
2. Fan out BUILDER sub-agents one piece at a time (or parallel only if file ownership disjoint).
3. After each builder claims done: spawn FRESH CRITIC with ZERO builder summary.
   Critic inputs: live URL, desktop+mobile screenshots, DOM probes, shader.se open in
   second tab for craft-axis comparison only.
4. Critic output MUST be:
   - pass|fail per HCD template
   - craft-axis table vs shader.se (tactile CRT / scroll story / density / playfulness)
   - single biggest gap if any axis loses
   - whether builder may stop this piece
5. Builder resumes ONLY on fail with that one gap as the brief. Max 3 builder↔critic
   rounds per piece per wave; then escalate to orchestrator.
6. Between waves: one COHERENCE agent (P10) with fresh context; whole-page screenshots only.
7. /loop dynamic heartbeat: wake when progress.html changes OR every 15–20m fallback.
   STOP when: all pieces critic-pass AND Impeccable Persuade score ≥ 30/32 (or documented
   n/a heuristics) AND gate:push + NB_E2E=landing: e2e green AND HCD automatic fails clear.
   Do NOT loop on “wow forever.”

GATES BEFORE “DONE”:
- npm run gate:push
- NB_E2E=landing: node docs/design-explorations/nightboard/e2e.mjs
- /impeccable critique on landing (Assessment A+B isolated); persist snapshot
- Adversarial HCD note in progress.html or design note
- prefers-reduced-motion verified

HIGGSFIELD (optional lane):
If OG/cover assets needed: higgsfield generate … only; honor Nightboard tokens;
do not higgsfield website create for this exploration.
```

## Critic protocol (harsh but falsifiable)

1. Open ours + [shader.se](https://www.shader.se/) side by side.
2. Score only shared craft axes (1–5): CRT material, scroll curiosity reward,
   atmospheric density without clutter, interactive aliveness, typographic discipline.
3. If ours loses any axis: name **one** gap; fail piece; send builder back.
4. If ours wins or ties all axes **and** product job is clear: pass.
5. Never accept builder prose as evidence. Screenshots + DOM only.
6. Automatic fail if any HCD ban triggers (slop, honesty, `DESIGN.md` violation).

After a wave’s fixes: one confirm Impeccable critique — not infinite polish.

## HCD critique template

```text
Persona: @persona.github_open_source_contributor
Surface: nightboard Persuade landing (/)
DESIGN.md north star check: pass | fail — <why>
Craft (hierarchy, density, typography, color rarity): pass | fail — <why>
Playfulness / wonder (craft delight, not slop): pass | fail — <why>
Competitive bar (craft axes vs shader.se): pass | fail — <why>
Accessibility / honesty / trust legibility: pass | fail — <why>
Unacceptable issues (must fix before merge):
- ...
Delight opportunities (should fix this pass if cheap):
- ...
```

## Stop criteria

All of:

- Every piece in `progress.html` is `pass` (or `n/a` with reason)
- Impeccable Persuade score ≥ 30/32 (heuristics 7 & 10 may be n/a)
- `npm run gate:push` green
- `NB_E2E=landing: node docs/design-explorations/nightboard/e2e.mjs` green
- HCD automatic fails clear
- `prefers-reduced-motion` verified

## Gates cheat sheet

```bash
npm run gate:push
NB_E2E=landing: node docs/design-explorations/nightboard/e2e.mjs
```

## Out of scope

- Replacing Nightboard with a Higgsfield A4 film marketing site
- Inventing adoption metrics or fake social proof
- Restyling the Operate board as CRT chrome
