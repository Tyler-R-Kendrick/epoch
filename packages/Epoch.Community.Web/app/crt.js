/**
 * CRT tube pass — the landing's phosphor terminal.
 *
 * A curved photo is not a CRT. What reads as a tube is a stack of small
 * physical facts layered in one fragment pass, each of which the eye misses
 * individually and notices together:
 *
 *   geometry   per-axis barrel warp — the glass bulges more vertically
 *   grille     RGB phosphor stripes at a pitch authored in CSS pixels
 *   raster     scanlines whose count follows the screen, not the framebuffer
 *   halation   bright glyphs bleeding into the glass around them
 *   optics     radial chromatic aberration that grows toward the corners
 *   refresh    a soft bar rolling up from the beam/refresh beat mismatch
 *   room       lifted blacks and a lit surround, because a tube sits somewhere
 *
 * Everything time-driven is gated on uMotion, so reduced motion holds the tube
 * still rather than deleting it: the geometry, grille and room all survive.
 *
 * The scene is drawn to an offscreen 2D canvas; this pass is the display.
 * Installs `CW_CRT` on the global, matching the app's classic-script pattern
 * (as `value-kind.js` does); `landing.js` reads it as `window.CW_CRT`.
 */
(function (global) {
  "use strict";

  /*
   * The "terminal" tube: green phosphor, tight grille, generous gain. These are
   * the look — a drift here changes the landing's first impression, so they live
   * as one named preset instead of scattered magic numbers at the call site.
   */
  var TERMINAL = {
    /* Barrel strength per axis. Vertical > horizontal: consumer tubes bulged more
       across the short dimension, and the asymmetry is what stops it reading as a
       fisheye photo. */
    curve: [0.115, 0.165],
    /* Scanlines per CSS pixel of viewport height. */
    scanDensity: 0.44,
    /* How dark the gap between scanlines gets. */
    scanDepth: 0.30,
    /* Phosphor triad pitch in CSS pixels — one R/G/B stripe cycle. */
    triadCss: 3.2,
    /* Aperture-grille strength. Above ~0.5 the image turns to confetti. */
    grille: 0.34,
    /* Chromatic aberration scale; the shader grows it toward the corners. */
    chroma: 1.0,
    /* Rolling refresh bar brightness. */
    bar: 0.045,
    /* Mains-hum brightness wobble. */
    flicker: 0.028,
    /* Static sensor grain. */
    grain: 0.022,
    /* Corner falloff. */
    vignette: 0.58,
    /* Grille and scanlines both eat light; gain puts it back so the tube reads
       lit rather than muddy. Applied after the masks, before the bar and sheen. */
    gain: 1.34,
    /* Phosphor halation — a wide cheap tap ring, so glyphs bloom into the glass
       instead of relying on shadowBlur in the 2D scene. */
    halo: 0.10,
    /* Specular sheen on the glass, tinted by the phosphor rather than white. */
    sheen: [0.55, 1.0, 0.78],
    /* Ambient behind/around the tube. Not black — a screen sits in a room, and
       clamping the surround to black is what makes cheap CRT filters look like a
       letterbox instead of a monitor. */
    room: [0.012, 0.030, 0.022],
  };

  /* Scanline count is a property of the physical screen, so it follows CSS
     pixels. Floored so a short viewport still reads as a raster; capped so a tall
     one does not alias into a uniform grey wash. */
  var SCAN_MIN = 120;
  var SCAN_MAX = 900;
  /* Below a 2px stripe the grille stops being a grille and becomes moiré. */
  var TRIAD_MIN = 2;

  /* Power-on. A tube does not blink on: the cathode strikes, a hot line appears,
     and the raster opens vertically as beam current settles. Long enough to read
     as a machine waking, short enough that nobody waits for the page. */
  var WARM_MS = 1150;
  /* Point on the warm ramp where the raster has finished opening. The remainder
     is the beam settling, which the picture can ride through — so this, not the
     end of the ramp, is when there is something for the copy to sit on. */
  var RASTER_OPEN = 0.62;
  /* Degauss thump on chapter change — the demagnetising coil's dying wobble. */
  var DEGAUSS_MS = 720;
  /* Power-off collapse when entering the board. Brisk on purpose: this plays
     while someone is waiting to get somewhere, and a flourish that charges a
     toll on every click stops being a flourish. */
  var POWER_OFF_MS = 420;

  var UNIFORMS = [
    "uTex",
    "uRes",
    "uTime",
    "uMotion",
    "uCurve",
    "uScan",
    "uScanDepth",
    "uTriad",
    "uGrille",
    "uChroma",
    "uBar",
    "uFlicker",
    "uGrain",
    "uVignette",
    "uGain",
    "uHalo",
    "uSheen",
    "uRoom",
    "uWarm",
    "uDegauss",
  ];

  var VERTEX_SHADER = [
    "attribute vec2 aPos;",
    "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }",
  ].join("\n");

  var FRAGMENT_SHADER = [
    "precision highp float;",
    "uniform sampler2D uTex;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uMotion;",
    "uniform vec2 uCurve;",
    "uniform float uScan;",
    "uniform float uScanDepth;",
    "uniform float uTriad;",
    "uniform float uGrille;",
    "uniform float uChroma;",
    "uniform float uBar;",
    "uniform float uFlicker;",
    "uniform float uGrain;",
    "uniform float uVignette;",
    "uniform float uGain;",
    "uniform float uHalo;",
    "uniform vec3 uSheen;",
    "uniform vec3 uRoom;",
    "uniform float uWarm;",
    "uniform float uDegauss;",
    "",
    "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
    "",
    "/* Per-axis barrel warp. Scaling each axis by the OTHER axis squared bulges",
    "   the glass without the uniform radial stretch a single-k lens gives. */",
    "vec2 curve(vec2 uv){",
    "  uv = uv * 2.0 - 1.0;",
    "  vec2 o = uv.yx * uv.yx;",
    "  uv += uv * o * uCurve;",
    "  return uv * 0.5 + 0.5;",
    "}",
    "",
    "void main(){",
    "  vec2 fuv = gl_FragCoord.xy / uRes;",
    "  vec2 uv = curve(fuv);",
    "  float t = uTime;",
    "",
    "  /* Degauss: the coil's dying field drags the beam in a decaying radial",
    "     ripple. Geometry first, so the wobble bends the image rather than",
    "     smearing an already-sampled one. */",
    "  if (uDegauss > 0.001){",
    "    float ring = sin(length(uv - 0.5) * 26.0 - uDegauss * 20.0);",
    "    uv += (uv - 0.5) * ring * 0.014 * uDegauss;",
    "    uv.x += sin(uv.y * 40.0 - uDegauss * 26.0) * 0.004 * uDegauss;",
    "  }",
    "",
    "  /* Power-on. The raster opens from a line: squeezing uv.y into a band is",
    "     what makes this read as a tube striking rather than a picture fading up,",
    "     because the middle of the image is genuinely stretched across the slot. */",
    "  float open = smoothstep(0.02, " + RASTER_OPEN.toFixed(2) + ", uWarm);",
    "  float settle = 1.0 - smoothstep(0.55, 1.0, uWarm);",
    "  uv.y = (uv.y - 0.5) / max(open, 0.0012) + 0.5;",
    "  /* Vertical hold catching, damping out as the ramp finishes. */",
    "  uv.y += sin(uWarm * 34.0) * 0.030 * settle;",
    "",
    "  /* Warping pushes the corners off-texture. Fade rather than clamp, so the",
    "     tube meets the room on a soft edge instead of a smeared border pixel. */",
    "  vec2 inb = step(vec2(0.0), uv) * step(uv, vec2(1.0));",
    "  float inside = inb.x * inb.y;",
    "  vec2 ed = min(uv, 1.0 - uv);",
    "  inside *= smoothstep(0.0, 0.020, min(ed.x, ed.y));",
    "",
    "  /* Aberration grows with distance from centre: the shadow mask misconverges",
    "     at the edges of the tube, never in the middle. */",
    "  vec2 dir = uv - 0.5;",
    "  float d2 = dot(dir, dir);",
    "  vec2 ao = dir * (0.0010 + 0.0075 * d2) * uChroma * (1.0 + 3.2 * uDegauss);",
    "  vec3 col;",
    "  col.r = texture2D(uTex, uv + ao).r;",
    "  col.g = texture2D(uTex, uv).g;",
    "  col.b = texture2D(uTex, uv - ao).b;",
    "",
    "  /* Phosphor halation: six wide taps, cheaper than a real blur and enough to",
    "     make bright glyphs sit in the glass rather than on it. */",
    "  if (uHalo > 0.001){",
    "    float s = 0.0038;",
    "    vec3 wide = texture2D(uTex, uv + vec2( s, 0.0)).rgb",
    "              + texture2D(uTex, uv + vec2(-s, 0.0)).rgb",
    "              + texture2D(uTex, uv + vec2(0.0,  s)).rgb",
    "              + texture2D(uTex, uv + vec2(0.0, -s)).rgb",
    "              + texture2D(uTex, uv + vec2( s,  s) * 0.72).rgb",
    "              + texture2D(uTex, uv + vec2(-s, -s) * 0.72).rgb;",
    "    col += wide * (uHalo / 6.0);",
    "  }",
    "",
    "  /* Raster. sin² keeps the line bright and the gap dark without ringing. */",
    "  float sl = sin(uv.y * 3.14159265 * uScan + t * 4.0 * uMotion);",
    "  col *= mix(1.0 - uScanDepth, 1.0, sl * sl);",
    "",
    "  /* Aperture grille — R/G/B stripes 120° apart in device pixels. */",
    "  float gx = gl_FragCoord.x * (6.2831853 / max(uTriad, 1.0));",
    "  vec3 grille = (1.0 - uGrille) + uGrille * cos(gx + vec3(0.0, 2.094, 4.188));",
    "  col *= mix(vec3(1.0), grille, step(0.001, uGrille));",
    "  col *= uGain;",
    "",
    "  /* Refresh bar rolling up the tube. */",
    "  float bar = fract(uv.y * 0.5 - t * 0.07 * uMotion);",
    "  bar = smoothstep(0.0, 0.05, bar) * smoothstep(0.18, 0.05, bar);",
    "  col += bar * uBar * uMotion;",
    "",
    "  /* Sheen on the glass, high and slightly left, as if lit from a window. */",
    "  float sheen = smoothstep(0.55, 0.0, distance(uv, vec2(0.50, 0.15)));",
    "  col += sheen * 0.030 * uSheen;",
    "",
    "  float vig = smoothstep(0.98, 0.30, length((uv - 0.5) * vec2(1.05, 1.0)));",
    "  col *= mix(1.0 - uVignette, 1.0, vig);",
    "  col *= 1.0 - uFlicker * uMotion * sin(t * 8.0);",
    "",
    "  col += (hash(fuv + fract(t * 0.37)) - 0.5) * uGrain;",
    "",
    "  /* Beam current comes up, overshoots, and the regulator catches it. This",
    "     gain applies to the PICTURE only — the strike filament below is the",
    "     cathode itself and must not be dimmed by the picture not being there. */",
    "  col *= smoothstep(0.0, 0.16, uWarm);",
    "  col *= 1.0 + 0.85 * settle * open;",
    "",
    "  /* The strike: a hot filament across the middle of the glass while the",
    "     raster is still shut, widening and fading as the picture takes over. */",
    "  float slot = mix(190.0, 5.0, open);",
    "  float strike = exp(-pow((fuv.y - 0.5) * slot, 2.0));",
    "  col += strike * (1.0 - open) * (uSheen * 1.6 + 0.75) * 2.4;",
    "  col *= 1.0 + 0.22 * uDegauss;",
    "",
    "  /* Outside the glass is the room, lit a little by the tube itself. The floor",
    "     lift keeps blacks off zero — a powered CRT never reaches true black. */",
    "  float spill = smoothstep(0.85, 0.18, length(fuv - 0.5)) * 0.05;",
    "  vec3 room = uRoom + uSheen * spill * 0.42;",
    "  col = mix(room, col, inside);",
    "  col = max(col, uRoom * 0.34);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  function clamp(value, low, high) {
    return Math.max(low, Math.min(value, high));
  }

  /** Scanline count for a viewport this many CSS pixels tall. */
  function scanLines(cssHeight, density) {
    return clamp(cssHeight * density, SCAN_MIN, SCAN_MAX);
  }

  /**
   * Grille pitch in device pixels. Authored in CSS pixels so the stripe stays
   * the same apparent width on a 2× display instead of vanishing into the grid.
   */
  function triadPitch(bufferWidth, cssWidth, triadCss) {
    return Math.max(TRIAD_MIN, triadCss * bufferWidth / Math.max(cssWidth, 1));
  }

  /**
   * Power-on progress, 0 (cold) to 1 (struck). Reduced motion asks for
   * stillness, not for a missing screen — the tube is simply already on.
   */
  function warmAt(elapsedMs, reduce) {
    if (reduce) return 1;
    return clamp(elapsedMs / WARM_MS, 0, 1);
  }

  /**
   * Degauss strength, 1 at the thump decaying to exactly 0 once spent — so a
   * dropped frame can never leave the tube permanently wobbling.
   */
  function degaussAt(elapsedMs) {
    var t = clamp(elapsedMs / DEGAUSS_MS, 0, 1);
    return t >= 1 ? 0 : (1 - t) * (1 - t);
  }

  /** The strike run backwards: 1 (lit) collapsing to exactly 0 (dark). */
  function powerOffAt(elapsedMs) {
    var t = clamp(elapsedMs / POWER_OFF_MS, 0, 1);
    return t >= 1 ? 0 : 1 - t * t;
  }

  function compile(gl, type, src) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Build the pass, or null if this context cannot run it — the caller falls
   * back to drawing the scene straight to a 2D canvas and the page still works.
   */
  function create(gl) {
    if (!gl) return null;
    var vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return null;
    }
    var prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }
    gl.useProgram(prog);

    /* One oversized triangle covers the viewport with no seam down the diagonal
       and one fewer vertex than a quad. */
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "aPos");

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var at = {};
    for (var i = 0; i < UNIFORMS.length; i++) {
      at[UNIFORMS[i]] = gl.getUniformLocation(prog, UNIFORMS[i]);
    }

    /* Resolution-derived uniforms only change on resize. */
    var scan = scanLines(1, TERMINAL.scanDensity);
    var triad = TRIAD_MIN;
    var bufferW = 1;
    var bufferH = 1;

    return {
      resize: function (bufferWidth, bufferHeight, cssWidth, cssHeight) {
        bufferW = Math.max(1, bufferWidth);
        bufferH = Math.max(1, bufferHeight);
        scan = scanLines(cssHeight, TERMINAL.scanDensity);
        triad = triadPitch(bufferW, cssWidth, TERMINAL.triadCss);
        gl.useProgram(prog);
        gl.viewport(0, 0, bufferW, bufferH);
      },

      /**
       * Upload `source` (the offscreen scene canvas) and draw one tube frame.
       *
       * `scrub` is the landing's scroll energy, already normalised by the caller:
       * distort/chroma/scan/bloom ride progress, motion is 0 under reduced
       * motion. Scroll must read as acceleration, so each mapping is monotonic
       * in its input and clamped to the preset's ceiling.
       */
      draw: function (source, seconds, scrub) {
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        /* Scroll deepens the tube: 0.24→0.38 of distort maps to roughly 0.96×
           through 1.10× of the preset curve — felt, never cartoonish. */
        var curveScale = 0.72 + scrub.distort;
        gl.uniform1i(at.uTex, 0);
        gl.uniform2f(at.uRes, bufferW, bufferH);
        gl.uniform1f(at.uTime, seconds);
        gl.uniform1f(at.uMotion, scrub.motion);
        gl.uniform2f(at.uCurve, TERMINAL.curve[0] * curveScale, TERMINAL.curve[1] * curveScale);
        gl.uniform1f(at.uScan, scan);
        gl.uniform1f(at.uScanDepth, TERMINAL.scanDepth * clamp(scrub.scan, 0, 1));
        gl.uniform1f(at.uTriad, triad);
        gl.uniform1f(at.uGrille, TERMINAL.grille);
        gl.uniform1f(at.uChroma, TERMINAL.chroma * scrub.chroma);
        gl.uniform1f(at.uBar, TERMINAL.bar);
        gl.uniform1f(at.uFlicker, TERMINAL.flicker);
        gl.uniform1f(at.uGrain, TERMINAL.grain);
        gl.uniform1f(at.uVignette, TERMINAL.vignette);
        gl.uniform1f(at.uGain, TERMINAL.gain);
        gl.uniform1f(at.uHalo, TERMINAL.halo * (0.6 + clamp(scrub.bloom, 0, 1)));
        gl.uniform3f(at.uSheen, TERMINAL.sheen[0], TERMINAL.sheen[1], TERMINAL.sheen[2]);
        gl.uniform3f(at.uRoom, TERMINAL.room[0], TERMINAL.room[1], TERMINAL.room[2]);
        gl.uniform1f(at.uWarm, clamp(scrub.warm, 0, 1));
        gl.uniform1f(at.uDegauss, clamp(scrub.degauss, 0, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },

      dispose: function () {
        gl.deleteBuffer(buf);
        gl.deleteTexture(tex);
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      },
    };
  }

  global.CW_CRT = {
    TERMINAL: TERMINAL,
    UNIFORMS: UNIFORMS,
    VERTEX_SHADER: VERTEX_SHADER,
    FRAGMENT_SHADER: FRAGMENT_SHADER,
    scanLines: scanLines,
    triadPitch: triadPitch,
    warmAt: warmAt,
    degaussAt: degaussAt,
    powerOffAt: powerOffAt,
    WARM_MS: WARM_MS,
    RASTER_OPEN: RASTER_OPEN,
    DEGAUSS_MS: DEGAUSS_MS,
    POWER_OFF_MS: POWER_OFF_MS,
    create: create,
  };
}(globalThis));
