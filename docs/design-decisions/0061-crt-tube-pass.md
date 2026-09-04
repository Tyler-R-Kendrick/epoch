# ADR-0061: The Landing CRT Is a Tube Pass, Not a Lens Filter

**Status:** Accepted
**Date:** 2026-09-04
**Supersedes:** None
**Related:** [ADR-0012](0012-community-human-centered-design.md), root `DESIGN.md`, [`docs/community-web/README.md`](../community-web/README.md)

## Context

The Persuade landing sells Epoch through a CRT terminal. The tube is the first
thing anyone sees, so its fidelity is product surface, not decoration.

The original pass was three effects deep — a single-`k` barrel warp, a constant
radial chromatic aberration, and a vignette — plus a stack of CSS overlays for
scanlines, phosphor tint, grain and bloom. That combination reads as *a curved
photograph with lines drawn on it*, not as a powered tube, and no amount of
tuning the three knobs fixes it, because the things that actually signal "CRT"
were missing entirely:

- **No aperture grille.** The RGB phosphor stripe is the single strongest cue
  that an image is being emitted by a tube rather than displayed on a panel.
- **No halation.** Real phosphor bleeds; bright glyphs glow *into* the glass.
  `shadowBlur` on the 2D scene is not the same effect and cannot cross the
  boundary between scene elements.
- **Resolution-blind raster.** The CSS scanline layer was a fixed 2px/3px
  gradient, so line count changed with viewport size and doubled on HiDPI.
- **Black surround.** The pass multiplied by a border mask, clamping outside the
  warped image to pure black. A monitor sits in a room, and clamping the
  surround to zero is exactly what makes cheap CRT filters read as a letterbox.
- **Reduced motion deleted the tube.** The pass was only built when
  `!state.reduce`, so users who ask for less motion got a flat 2D canvas — they
  lost the design, when what they asked for was only for it to hold still.

The reference for the target look is the "terminal" CRT background on
[threeui.com](https://threeui.com/backgrounds/crt/terminal).

## Decision

1. **The tube is a module, not an inline shader.**
   `packages/Epoch.Community.Web/app/crt.js` installs `CW_CRT` on the global
   (the app's classic-script pattern, as `value-kind.js` does; `landing.js`
   reads it as `window.CW_CRT`) exposing the preset, the shader sources, the
   derivation helpers, the life-cycle ramps, and a `create(gl)` factory.
   `landing.js` no longer carries a copy of the fragment shader.

   The move is what makes the effect testable at all: a GLSL string inside an
   IIFE can only be reviewed by eye, and "eye" is precisely the faculty that
   missed a missing grille for the life of the previous implementation.

2. **The stack is one fragment pass over the scene buffer**, in this order:
   per-axis barrel geometry → radial aberration → phosphor halation → scanlines
   → aperture grille → gain → refresh bar → glass sheen → vignette → flicker →
   grain → room composite. Each stage is a named uniform in the `TERMINAL`
   preset, so the look is one reviewable object rather than magic numbers spread
   across a call site.

3. **Screen-derived quantities are derived from CSS pixels, framebuffer
   quantities from device pixels.** Scanline count follows viewport height
   (`scanLines`, clamped 120–900); grille pitch is authored at 3.2 CSS px and
   converted to device pixels (`triadPitch`, floored at 2). Getting this
   backwards is invisible on the developer's display and wrong on everyone
   else's, which is why both are pure functions with their own assertions.

4. **Reduced motion holds the tube still; it does not remove it.** Every
   time-driven term (`scanline crawl`, refresh bar, flicker) is gated on
   `uMotion`, and the landing passes `motion: 0` under `prefers-reduced-motion`.
   Geometry, grille, halation and room survive. The pass is now built
   unconditionally, and the reduced-motion branch renders one static frame.

5. **Outside the glass is a room, and black is lifted.** The surround is the
   preset's `room` colour plus tube spill, and the final colour is floored at
   `uRoom * 0.34`. A powered CRT never reaches true black.

6. **One static face layer sits above the copy.** The shader can only raster
   what it draws, and the landing's copy is real DOM — selectable, and readable
   by assistive tech — so it never enters the scene texture. Left alone the
   headline floats above the screen instead of sitting on it. `.cw-crt-face`
   multiplies the same triad pitch and scanline beat over everything inside the
   bezel, at `z-index: 7` (above copy, below the chassis ring).

7. **The CSS overlay stack becomes the non-WebGL fallback and steps back under
   the shader.** Under `[data-crt-pass="webgl"]` the vignette, bloom and
   phosphor layers drop to a thin coat of glass. At full strength the CSS
   vignette alone crushes the corners past the shader's lifted black, undoing
   decision 5.

8. **The tube has a life cycle, not just a look.** Three one-shot events, each
   a pure function in `crt.js` so the timing is testable rather than eyeballed:

   - **Power-on** (`warmAt`, 1150ms). The raster opens from a line. The shader
     squeezes `uv.y` by the opening height, so the middle of the image is
     genuinely stretched across the slot while a hot filament burns across the
     glass and beam current overshoots before settling. A fade-in is not a
     power-on; the squeeze is what makes it read as a tube striking.
   - **Degauss** (`degaussAt`, 720ms). Arriving at a chapter thumps the tube
     with a decaying radial ripple, an aberration surge and a brightness lift —
     the demagnetising coil's dying field. The ride already surges here; this
     is the same event felt through the glass.
   - **Power-off** (`powerOffAt`, 420ms). Entering the board collapses the
     raster and puts the lamp on standby before the browser navigates.

   All three are gated: reduced motion starts fully struck and never degausses.

9. **Phosphor persistence.** P22 phosphor keeps glowing after the beam moves
   on, which is why motion on a CRT trails rather than cuts. The scene is
   composited into a persistence buffer — decay the previous frame, then
   `lighten` the new one over it — and the tube samples *that*, so trails ride
   through the whole optical stack. Chosen over a feedback FBO because it is a
   few lines of 2D canvas, and over additive blending because `lighten` cannot
   accumulate past the source and therefore cannot blow out. The decay constant
   is per-unit-time, not per-frame, so trail length does not change with frame
   rate.

10. **The copy waits for the picture.** Letting DOM text sit at full brightness
    over a half-open raster is the tell that the effect is a costume. While the
    tube strikes, the two content elements in the stage are held at opacity 0
    and arrive with the raster. The CSS glass stack rides the same ramp through
    `--cw-crt-warm`, because phosphor tint, bloom and sheen are all reflections
    of a picture that does not exist yet.

11. **Chassis furniture.** An etched model line and a lit power lamp on the
    bezel. The lamp comes on before the tube warms and drops to standby on the
    way out — the order a real monitor does it in. Both are `aria-hidden` and
    `pointer-events: none`.

## Consequences

**The face layer costs contrast, and the budget is spent.** Measured on the
rendered lede paragraph, the copy goes from **11.46:1 to 10.21:1** against the
Community Web contract's **7:1** body floor. That is real headroom consumed for
an aesthetic effect. It is accepted because the remaining margin is ~3.2 points
and the alternative — copy that visibly does not belong to the screen behind it
— undercuts the whole premise of the landing. The strength is pinned by an
assertion at `opacity <= 0.3` rather than left to judgement, so the next person
who reaches for "a bit more CRT" fails a test instead of shipping 6.4:1.

**Motion above copy is forbidden.** The face is static by rule, not by
oversight: an animated raster over live text fights the reader rather than the
scene. The assertion covers this too.

**The preset is pinned, which makes drift a test failure.** Changing the look is
now a deliberate edit to named values with a failing test to update, not a
silent tweak. This is the intended cost.

**Measuring it correctly matters.** The figure is taken from the rendered page
with the strike *finished* — `data-crt-warm` cleared, `--cw-crt-warm` at 1, copy
at full opacity — because `requestAnimationFrame` is throttled in headless
browsers and a naive screenshot lands on a frame where the copy is still gated.
An earlier pass of this work reported 8.95:1 from exactly that mistake. Assert
the settled state before reading pixels.

**The copy gate is the sharpest edge in this change.** Holding the page's copy
at opacity 0 for just over a second is a real cost, and a bug there is a blank
page rather than a missing flourish. Three things bound it: the rule is scoped
to `[data-crt-pass="webgl"]`, so a browser that never runs the shader can never
be blanked; the attribute is cleared on the first frame that finds the raster
open, so a backgrounded tab returns readable; and reduced motion never sets it
at all. Assertions cover the scoping and the clear.

**A flourish on a CTA must never become a toll.** The power-off runs on the way
into the board, so it is capped at 420ms by an assertion, skipped under reduced
motion, skipped for modified clicks (open-in-new-tab keeps native behaviour),
and — because `requestAnimationFrame` stops in a background tab — navigation is
guaranteed by a timer rather than by the animation finishing.

**Fallbacks stay honest.** A context that cannot compile or link yields `null`
and the landing draws the scene straight to a 2D canvas; the CSS overlays remain
as the non-WebGL tube. Nothing about the page's content depends on WebGL.

## Alternatives considered

- **Keep tuning the three-effect pass.** Rejected: the missing cues are
  structural, not parametric. There is no value of `uDistort` that produces an
  aperture grille.

- **Render the copy into the scene canvas so the shader rasters it too.** This
  is what the reference implementation does, and it gives a perfectly unified
  image. Rejected: it would make the landing's headline and body copy invisible
  to assistive technology, unselectable, and unindexable. Text stays DOM; the
  face layer buys most of the cohesion at a measured contrast cost.

- **Take the reference component as a dependency.** Rejected: it is a React
  component in a Three.js-oriented registry, and the landing is a dependency-free
  classic script drawing a scroll-scrubbed scene it owns. The valuable part is
  the technique — which stages, in which order, with which magnitudes — and that
  is what was reproduced.

- **Drop the CSS overlay stack entirely now that the shader is richer.**
  Rejected: it is the only tube left when WebGL is unavailable.
