import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The CRT pass is the landing's whole first impression, and it used to be three
 * effects deep — barrel, aberration, vignette — which reads as a curved photo
 * rather than a tube. A real terminal tube is a stack: aperture grille, scanline
 * depth, phosphor halation, a rolling refresh bar, and a lit room behind the
 * glass instead of a black letterbox.
 *
 * That stack is now a module (`crt.js`) so it can be asserted rather than
 * eyeballed. The traps this closes:
 *
 *  - a uniform the pass looks up but the shader never declares. Real WebGL
 *    returns null and silently drops every write; the tube quietly loses an
 *    effect and nothing fails.
 *  - scan density and triad pitch derived in device pixels instead of CSS
 *    pixels, which makes the grille invisible on a 2× display and moiré on 1×.
 *  - reduced motion flattening the tube to nothing instead of holding it still.
 */

const ROOT = join(process.cwd(), "packages/Epoch.Community.Web/app");

type UniformValue = readonly number[];

/** Opaque GL handles. The stub never inspects them; the pass only passes them back. */
interface GlHandle {
  readonly handle: number;
}

/**
 * What `getUniformLocation` hands back: the uniform's name when the shader
 * declared it, and `null` when it did not — which is what real WebGL does, and
 * the whole point of the stub.
 */
type UniformSlot = string | null;

/** The scene canvas the pass uploads. The stub needs only its identity. */
interface SceneSource {
  readonly label: string;
}

type GlResult = GlHandle | UniformSlot | boolean | number | undefined;
type GlCall = (...args: never[]) => GlResult;
/** A WebGL context as the pass uses it: numeric enums plus entry points. */
interface GlContext {
  readonly [member: string]: GlCall | number;
}

interface CrtPass {
  readonly resize: (bufferWidth: number, bufferHeight: number, cssWidth: number, cssHeight: number) => void;
  readonly draw: (source: SceneSource, seconds: number, scrub: CrtScrub) => void;
  readonly dispose: () => void;
}

interface CrtScrub {
  readonly distort: number;
  readonly chroma: number;
  readonly scan: number;
  readonly bloom: number;
  readonly motion: number;
  readonly warm: number;
  readonly degauss: number;
}

interface CrtTerminalPreset {
  readonly curve: readonly [number, number];
  readonly scanDensity: number;
  readonly scanDepth: number;
  readonly triadCss: number;
  readonly grille: number;
  readonly chroma: number;
  readonly bar: number;
  readonly flicker: number;
  readonly grain: number;
  readonly vignette: number;
  readonly gain: number;
  readonly halo: number;
  readonly sheen: readonly [number, number, number];
  readonly room: readonly [number, number, number];
}

interface CrtModule {
  readonly TERMINAL: CrtTerminalPreset;
  readonly UNIFORMS: readonly string[];
  readonly FRAGMENT_SHADER: string;
  readonly VERTEX_SHADER: string;
  readonly scanLines: (cssHeight: number, density: number) => number;
  readonly triadPitch: (bufferWidth: number, cssWidth: number, triadCss: number) => number;
  readonly curveFor: (cssWidth: number, cssHeight: number) => readonly [number, number];
  readonly warmAt: (elapsedMs: number, reduce: boolean) => number;
  readonly degaussAt: (elapsedMs: number) => number;
  readonly powerOffAt: (elapsedMs: number) => number;
  readonly WARM_MS: number;
  readonly RASTER_OPEN: number;
  readonly STRIKE_IN: number;
  readonly DEGAUSS_MS: number;
  readonly POWER_OFF_MS: number;
  readonly create: (gl: GlContext) => CrtPass | null;
}

interface GlHealth {
  readonly linkOk?: boolean;
  readonly compileOk?: boolean;
}

/** A WebGL stub that records every uniform write by name. */
function fakeGl(health: GlHealth = {}) {
  const writes: Record<string, UniformValue> = {};
  const sources: string[] = [];
  let drawCount = 0;
  let deletedCount = 0;
  const handle = (): GlHandle => ({ handle: 1 });
  const record = (slot: UniformSlot, ...values: number[]): undefined => {
    // A slot is null exactly when the shader never declared that uniform; real
    // WebGL drops those writes silently, so the stub drops them too and the
    // "written every frame" assertions below notice the hole.
    if (slot !== null) writes[slot] = values;
    return undefined;
  };
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    TEXTURE_2D: 7,
    TEXTURE0: 8,
    TEXTURE_WRAP_S: 9,
    TEXTURE_WRAP_T: 10,
    TEXTURE_MIN_FILTER: 11,
    TEXTURE_MAG_FILTER: 12,
    CLAMP_TO_EDGE: 13,
    LINEAR: 14,
    RGBA: 15,
    UNSIGNED_BYTE: 16,
    FLOAT: 17,
    TRIANGLES: 18,
    TRIANGLE_STRIP: 19,
    UNPACK_FLIP_Y_WEBGL: 20,
    createShader: handle,
    shaderSource: (_shader: GlHandle, src: string): number => sources.push(src),
    compileShader: (): undefined => undefined,
    getShaderParameter: (): boolean => health.compileOk !== false,
    getShaderInfoLog: (): number => 0,
    deleteShader: (): undefined => undefined,
    createProgram: handle,
    attachShader: (): undefined => undefined,
    linkProgram: (): undefined => undefined,
    getProgramParameter: (): boolean => health.linkOk !== false,
    getProgramInfoLog: (): number => 0,
    deleteProgram: (): undefined => { deletedCount += 1; return undefined; },
    useProgram: (): undefined => undefined,
    createBuffer: handle,
    bindBuffer: (): undefined => undefined,
    bufferData: (): undefined => undefined,
    deleteBuffer: (): undefined => { deletedCount += 1; return undefined; },
    createTexture: handle,
    bindTexture: (): undefined => undefined,
    texParameteri: (): undefined => undefined,
    texImage2D: (): undefined => undefined,
    deleteTexture: (): undefined => { deletedCount += 1; return undefined; },
    pixelStorei: (): undefined => undefined,
    activeTexture: (): undefined => undefined,
    viewport: (): undefined => undefined,
    getAttribLocation: (): number => 0,
    enableVertexAttribArray: (): undefined => undefined,
    vertexAttribPointer: (): undefined => undefined,
    getUniformLocation: (_program: GlHandle, name: string): UniformSlot => {
      // Real WebGL returns null for a uniform the shader never declared (or one
      // the compiler stripped as unused). Mirror that exactly — it is the bug
      // this suite exists to catch.
      const src = sources.join("\n");
      return new RegExp(`\\buniform\\s+\\w+\\s+${name}\\b`).test(src) ? name : null;
    },
    uniform1i: record,
    uniform1f: record,
    uniform2f: record,
    uniform3f: record,
    drawArrays: (): undefined => { drawCount += 1; return undefined; },
  } satisfies GlContext;
  return {
    gl,
    writes,
    draws: () => drawCount,
    deleted: () => deletedCount,
  };
}

interface CrtHost {
  CW_CRT?: CrtModule;
}

function loadCrt(): CrtModule {
  // Classic app scripts install their namespace on the global (value-kind.js
  // does the same); evaluate crt.js against the real globalThis and read it back.
  const source = readFileSync(join(ROOT, "crt.js"), "utf8");
  new Function(source)();
  // SAFETY: crt.js installs CW_CRT on globalThis; the throw below covers the
  // case where it did not.
  const host = globalThis as CrtHost;
  if (!host.CW_CRT) throw new Error("crt.js did not install CW_CRT on the global");
  return host.CW_CRT;
}

function scrub(overrides: Partial<CrtScrub> = {}): CrtScrub {
  return {
    distort: 0.24, chroma: 1.2, scan: 0.55, bloom: 0.48, motion: 1,
    warm: 1, degauss: 0, ...overrides,
  };
}

const SCENE: SceneSource = { label: "scene-canvas" };

export async function runCommunityWebCrtPassTests(): Promise<void> {
  const crt = loadCrt();

  // The terminal variant is the design being reproduced. These numbers are the
  // look; drifting one silently changes the landing's first impression, so they
  // are pinned rather than left as magic numbers in a shader call site.
  // Above the reference preset's [0.115, 0.165] on purpose: that is tuned for a
  // small demo box, and the same normalized curve over a full-viewport hero
  // subtends far less angle and reads flat. The asymmetry is the load-bearing
  // part — a tube bulges more across its short dimension.
  assert.deepEqual(crt.TERMINAL.curve, [0.155, 0.215], "tube curves more vertically than horizontally");
  assert.ok(crt.TERMINAL.curve[1] > crt.TERMINAL.curve[0], "vertical bulge exceeds horizontal");
  assert.equal(crt.TERMINAL.scanDensity, 0.44);
  assert.equal(crt.TERMINAL.scanDepth, 0.3);
  assert.equal(crt.TERMINAL.triadCss, 3.2);
  assert.equal(crt.TERMINAL.grille, 0.34);
  assert.equal(crt.TERMINAL.gain, 1.34, "grille and scanlines eat light; gain puts it back");
  assert.equal(crt.TERMINAL.halo, 0.1);
  assert.deepEqual(crt.TERMINAL.sheen, [0.55, 1, 0.78], "glass sheen is phosphor green, not white");
  assert.deepEqual(crt.TERMINAL.room, [0.012, 0.03, 0.022], "outside the tube is a lit room, not black");

  // Barrel strength has to follow the viewport's shape. The preset is normalized
  // to UV, which quietly assumes a landscape screen: applied as-is to a 390x844
  // phone it puts 91px of bow across a 390px width and the tube reads as a dome.
  const desktop = crt.curveFor(1280, 800);
  assert.deepEqual(
    [desktop[0], desktop[1]],
    [crt.TERMINAL.curve[0], crt.TERMINAL.curve[1]],
    "the preset's own shape (1280x800) is returned untouched",
  );

  const portrait = crt.curveFor(390, 844);
  assert.ok(portrait[0] > portrait[1], "on a portrait viewport the short axis is x, so x bulges more");
  const landscape = crt.curveFor(1280, 800);
  assert.ok(landscape[1] > landscape[0], "on a landscape viewport the short axis is y");

  // Damping: the further from the calibrated shape, the weaker the curve, and
  // never stronger than the preset in either axis on any viewport.
  for (const [w, h] of [[390, 844], [1680, 620], [834, 1112], [1920, 1080], [320, 1400], [3000, 400]]) {
    const c = crt.curveFor(w, h);
    const ceiling = Math.max(crt.TERMINAL.curve[0], crt.TERMINAL.curve[1]);
    assert.ok(c[0] > 0 && c[1] > 0, `curve stays positive at ${w}x${h}`);
    assert.ok(
      c[0] <= ceiling + 1e-9 && c[1] <= ceiling + 1e-9,
      `curve at ${w}x${h} exceeds the preset ceiling`,
    );
    // The bow of the horizontal edges, as a fraction of the width they span.
    // Past roughly a fifth the tube stops reading as a tube and becomes a lens.
    const topBow = (c[1] * h) / 2 / w;
    assert.ok(topBow < 0.2, `top-edge bow at ${w}x${h} is ${(topBow * 100).toFixed(0)}% of width`);
  }

  // Scan count is a property of the physical screen, so it is derived from CSS
  // pixels. Clamped low so a short viewport still reads as a raster, and high so
  // a tall one does not alias into a grey wash.
  assert.equal(crt.scanLines(1000, 0.44), 440);
  assert.equal(crt.scanLines(100, 0.44), 120, "short viewports floor at 120 lines");
  assert.equal(crt.scanLines(4000, 0.44), 900, "tall viewports cap at 900 lines");

  // Triad pitch is authored in CSS pixels and drawn in device pixels: on a 2×
  // display the stripe must be twice as many device pixels wide, or the grille
  // disappears into the pixel grid.
  assert.equal(crt.triadPitch(2000, 1000, 3.2), 6.4, "grille pitch scales with device pixel ratio");
  assert.equal(crt.triadPitch(1000, 1000, 3.2), 3.2);
  assert.equal(crt.triadPitch(100, 1000, 3.2), 2, "pitch never drops below a 2px stripe");

  // A GLSL compile error cannot be caught by a stub that always reports success,
  // and it costs a full browser round trip to find. `cast` is the one that
  // actually bit: a perfectly ordinary variable name, and a reserved word in
  // GLSL ES 1.00, so the shader failed to link and the tube silently fell back
  // to plain 2D. Check declared names against the reserved list here, where it
  // is free, instead of in a headless browser.
  const GLSL_ES_RESERVED = new Set([
    "asm", "class", "union", "enum", "typedef", "template", "this", "packed",
    "goto", "switch", "default", "inline", "noinline", "volatile", "public",
    "static", "extern", "external", "interface", "long", "short", "double",
    "half", "fixed", "unsigned", "superp", "input", "output", "sizeof", "cast",
    "namespace", "using", "sampler1D", "sampler3D", "sampler1DShadow",
    "sampler2DShadow", "sampler2DRect", "sampler3DRect", "sampler2DRectShadow",
  ]);
  const declared = [...crt.FRAGMENT_SHADER.matchAll(
    /\b(?:float|int|bool|vec2|vec3|vec4|ivec2|ivec3|ivec4|bvec2|bvec3|bvec4|mat2|mat3|mat4)\s+([A-Za-z_]\w*)/g,
  )].map((m) => m[1]);
  assert.ok(declared.length > 10, "the declaration scan actually found variables");
  const reserved = declared.filter((name) => GLSL_ES_RESERVED.has(name));
  assert.deepEqual(
    reserved,
    [],
    `shader declares GLSL ES reserved word(s): ${reserved.join(", ")} — the shader will not compile`,
  );

  // Every uniform the pass resolves must exist in the shader. The stub returns
  // null for undeclared names exactly like real WebGL, so a typo fails here
  // instead of silently dropping an effect on the landing page.
  const built = fakeGl();
  const pass = crt.create(built.gl);
  assert.ok(pass, "pass builds against a healthy context");
  for (const name of crt.UNIFORMS) {
    assert.match(
      crt.FRAGMENT_SHADER + crt.VERTEX_SHADER,
      new RegExp(`\\buniform\\s+\\w+\\s+${name}\\b`),
      `shader declares ${name}`,
    );
  }

  // The full stack has to reach the GPU. A pass that builds but never writes
  // grille, halation or room colour is the old three-effect tube wearing a new
  // module's name.
  pass.resize(2000, 1200, 1000, 600);
  pass.draw(SCENE, 3.5, scrub());
  const writes = built.writes;
  for (const name of crt.UNIFORMS) {
    assert.ok(name in writes, `${name} is written every frame`);
  }
  assert.deepEqual(writes.uRes, [2000, 1200]);
  assert.deepEqual(writes.uScan, [crt.scanLines(600, crt.TERMINAL.scanDensity)]);
  assert.deepEqual(writes.uTriad, [crt.triadPitch(2000, 1000, crt.TERMINAL.triadCss)]);
  assert.deepEqual(writes.uGrille, [crt.TERMINAL.grille]);
  assert.deepEqual(writes.uGain, [crt.TERMINAL.gain]);
  assert.deepEqual(writes.uRoom, [...crt.TERMINAL.room]);
  assert.deepEqual(writes.uSheen, [...crt.TERMINAL.sheen]);
  assert.deepEqual(writes.uTime, [3.5]);
  assert.equal(built.draws(), 1, "one full-screen triangle per frame");

  // The landing scrubs tube energy with scroll. More scroll must mean more
  // curve, more aberration, deeper scanlines and more bloom — monotonically, or
  // the ride reads as noise rather than acceleration.
  const calm = fakeGl();
  const calmPass = crt.create(calm.gl);
  assert.ok(calmPass);
  calmPass.resize(1000, 600, 1000, 600);
  calmPass.draw(SCENE, 1, scrub({ distort: 0.24, chroma: 1.2, scan: 0.55, bloom: 0.48 }));
  const calmCurve = calm.writes.uCurve;
  const calmChroma = calm.writes.uChroma;
  const calmDepth = calm.writes.uScanDepth;
  const calmHalo = calm.writes.uHalo;

  const hot = fakeGl();
  const hotPass = crt.create(hot.gl);
  assert.ok(hotPass);
  hotPass.resize(1000, 600, 1000, 600);
  hotPass.draw(SCENE, 1, scrub({ distort: 0.38, chroma: 2.2, scan: 1, bloom: 0.98 }));
  assert.ok(hot.writes.uCurve[0] > calmCurve[0], "scroll deepens tube curve");
  assert.ok(hot.writes.uCurve[1] > calmCurve[1]);
  assert.ok(hot.writes.uChroma[0] > calmChroma[0], "scroll widens aberration");
  assert.ok(hot.writes.uScanDepth[0] > calmDepth[0], "scroll deepens scanlines");
  assert.ok(hot.writes.uHalo[0] > calmHalo[0], "scroll blooms the phosphor");
  assert.ok(
    hot.writes.uScanDepth[0] <= crt.TERMINAL.scanDepth + 1e-9,
    "scanline depth never exceeds the preset floor of light",
  );

  // Reduced motion holds the tube still; it does not delete it. Every animated
  // term is gated on uMotion, so the geometry, grille and room survive at 0.
  const still = fakeGl();
  const stillPass = crt.create(still.gl);
  assert.ok(stillPass);
  stillPass.resize(1000, 600, 1000, 600);
  stillPass.draw(SCENE, 9, scrub({ motion: 0 }));
  assert.deepEqual(still.writes.uMotion, [0], "reduced motion stops time-driven terms");
  assert.ok(still.writes.uCurve[0] > 0, "reduced motion keeps the tube shape");
  assert.deepEqual(still.writes.uGrille, [crt.TERMINAL.grille], "reduced motion keeps the grille");
  assert.deepEqual(still.writes.uRoom, [...crt.TERMINAL.room], "reduced motion keeps the room lit");
  for (const animated of ["uBar", "uFlicker"]) {
    assert.match(
      crt.FRAGMENT_SHADER,
      new RegExp(`${animated}\\s*\\*\\s*uMotion|uMotion\\s*\\*\\s*${animated}`),
      `${animated} is gated on uMotion so reduced motion actually stills it`,
    );
  }

  // A context that cannot compile or link must yield null rather than a
  // half-built pass — the landing falls back to plain 2D and still renders.
  assert.equal(crt.create(fakeGl({ compileOk: false }).gl), null, "compile failure degrades to null");
  assert.equal(crt.create(fakeGl({ linkOk: false }).gl), null, "link failure degrades to null");

  // Disposal returns the buffer, texture, program and both shaders.
  const owned = fakeGl();
  const ownedPass = crt.create(owned.gl);
  assert.ok(ownedPass);
  ownedPass.dispose();
  assert.ok(owned.deleted() >= 3, "dispose releases buffer, texture and program");

  // ---------------------------------------------------------------------
  // Power-on. A tube does not blink on: the raster strikes as a hot line and
  // opens vertically while the beam current settles. That is a one-shot ramp,
  // so it lives as a pure function rather than frame state nobody can test.
  // ---------------------------------------------------------------------
  assert.equal(crt.warmAt(0, false), 0, "cold at t=0");
  assert.equal(crt.warmAt(crt.WARM_MS, false), 1, "fully struck by WARM_MS");
  assert.equal(crt.warmAt(crt.WARM_MS * 4, false), 1, "never overshoots past 1");
  assert.ok(
    crt.warmAt(crt.WARM_MS * 0.5, false) > 0 && crt.warmAt(crt.WARM_MS * 0.5, false) < 1,
    "mid-ramp is partial",
  );
  assert.ok(
    crt.warmAt(crt.WARM_MS * 0.25, false) < crt.warmAt(crt.WARM_MS * 0.75, false),
    "warm-up is monotonic",
  );
  // Reduced motion asks for stillness, not for a missing screen: the tube is
  // simply already on, with no strike to watch.
  assert.equal(crt.warmAt(0, true), 1, "reduced motion starts fully struck");

  // Degauss: the chapter-change thump decays to nothing and stays there, so a
  // missed frame can never leave the tube permanently wobbling.
  assert.equal(crt.degaussAt(0), 1, "a fresh degauss is at full strength");
  assert.equal(crt.degaussAt(crt.DEGAUSS_MS), 0, "spent by DEGAUSS_MS");
  assert.equal(crt.degaussAt(crt.DEGAUSS_MS * 3), 0, "never revives");
  assert.ok(
    crt.degaussAt(crt.DEGAUSS_MS * 0.25) > crt.degaussAt(crt.DEGAUSS_MS * 0.75),
    "degauss decays rather than grows",
  );

  // Power-off is the strike run backwards: the raster collapses to a line and
  // goes out. It must reach exactly 0 and stay there, and it must be brisk —
  // this runs while someone is waiting to get into the board.
  assert.equal(crt.powerOffAt(0), 1, "still lit at the moment of the click");
  assert.equal(crt.powerOffAt(crt.POWER_OFF_MS), 0, "fully dark by POWER_OFF_MS");
  assert.equal(crt.powerOffAt(crt.POWER_OFF_MS * 5), 0, "stays dark");
  assert.ok(
    crt.powerOffAt(crt.POWER_OFF_MS * 0.25) > crt.powerOffAt(crt.POWER_OFF_MS * 0.75),
    "collapse is monotonic",
  );
  // Power-off runs the strike backwards, so whatever the filament does at
  // warm 0 is the last thing anyone sees of this page. It has to be nothing:
  // the picture gain already zeroes the image there, and an ungated filament
  // term would leave the tube showing a lit line instead of going dark.
  assert.ok(
    crt.STRIKE_IN > 0 && crt.STRIKE_IN < crt.RASTER_OPEN,
    "the filament ramps in before the raster opens, and is out at warm 0",
  );
  assert.match(
    crt.FRAGMENT_SHADER,
    new RegExp(`strike[^;]*smoothstep\\(0\\.0,\\s*${crt.STRIKE_IN.toFixed(2)},\\s*uWarm\\)`),
    "the strike filament is gated on uWarm so power-off ends dark",
  );

  assert.ok(
    crt.POWER_OFF_MS <= 460,
    `power-off is ${crt.POWER_OFF_MS}ms; past ~460ms a flourish becomes a toll on every click`,
  );

  // Both reach the GPU, and both are clamped: a caller handing over a stale or
  // out-of-range value must not be able to freeze the tube mid-strike.
  const lit = fakeGl();
  const litPass = crt.create(lit.gl);
  assert.ok(litPass);
  litPass.resize(1000, 600, 1000, 600);
  litPass.draw(SCENE, 1, scrub({ warm: 0.4, degauss: 0.6 }));
  assert.deepEqual(lit.writes.uWarm, [0.4]);
  assert.deepEqual(lit.writes.uDegauss, [0.6]);
  litPass.draw(SCENE, 1, scrub({ warm: 9, degauss: -3 }));
  assert.deepEqual(lit.writes.uWarm, [1], "warm clamps to 1");
  assert.deepEqual(lit.writes.uDegauss, [0], "degauss clamps to 0");

  // The strike must actually squeeze the raster, not just dim it — a fade-in is
  // not a power-on. The shader remaps uv.y by the opening height.
  assert.match(crt.FRAGMENT_SHADER, /uWarm/, "shader reads uWarm");
  assert.match(crt.FRAGMENT_SHADER, /uDegauss/, "shader reads uDegauss");

  // The landing must actually consume the module rather than keeping a second
  // copy of the shader inline.
  const landing = readFileSync(join(ROOT, "landing.js"), "utf8");
  assert.match(landing, /CW_CRT/, "landing.js builds its tube from the shared CRT module");
  assert.ok(
    !/gl_FragColor/.test(landing),
    "landing.js no longer carries its own copy of the fragment shader",
  );
  const index = readFileSync(join(ROOT, "index.html"), "utf8");
  assert.ok(
    index.indexOf("crt.js") !== -1 && index.indexOf("crt.js") < index.indexOf("landing.js"),
    "crt.js loads before landing.js",
  );

  // The shader can only raster the scene canvas. Copy is DOM, so one static face
  // layer above it carries the same grille and scanline beat — otherwise the
  // headline floats above the screen instead of sitting on it.
  assert.match(index, /class="cw-crt-face"/, "a glass face layer sits above the copy");
  const css = readFileSync(join(ROOT, "landing.css"), "utf8");
  const face = /\.cw-crt-face\s*\{([^}]*)\}/.exec(css);
  assert.ok(face, "landing.css styles .cw-crt-face");
  assert.match(face[1], /mix-blend-mode:\s*multiply/, "the face multiplies over copy rather than painting on it");
  assert.match(face[1], /pointer-events:\s*none/, "the face never eats a click");
  assert.ok(!/animation/.test(face[1]), "the face is static — motion above copy fights the text");

  // Measured on the rendered lede, with the strike finished and the page
  // verifiably settled: the face costs 11.46:1 → 10.21:1 against the contract's
  // 7:1 body floor. Capped here rather than left to whoever next reaches for
  // "a bit more CRT" — the headroom is real but it is not unlimited.
  // Phosphor persistence. The tube samples a decayed composite, not the raw
  // scene — without `lighten` the buffer would accumulate instead of glow.
  assert.match(landing, /globalCompositeOperation\s*=\s*"lighten"/, "afterglow composites with lighten");
  assert.match(landing, /crt\.draw\(gctx \? glow : scene/, "the tube samples the persistence buffer");

  // Chassis furniture is decoration: it must never be announced or clickable.
  assert.match(index, /class="cw-crt-plate"[^>]*aria-hidden="true"/, "the chassis plate is decorative");
  assert.match(index, /class="cw-crt-led"/, "the power lamp exists");
  const plate = /\.cw-crt-plate\s*\{([^}]*)\}/.exec(css);
  assert.ok(plate, "landing.css styles .cw-crt-plate");
  assert.match(plate[1], /pointer-events:\s*none/, "the plate never eats a click");

  // The strike hides the copy. That is only safe because it is scoped to the
  // WebGL pass and always cleared — a page that keeps its copy at opacity 0 is
  // a blank page, so the gate must not apply where no strike will ever run.
  assert.match(
    css,
    /\.cw-landing\[data-crt-pass="webgl"\]\[data-crt-warm\][^{]*\.cw-landing-page/,
    "the copy gate is scoped to the WebGL pass, so a fallback page is never blanked",
  );
  assert.match(landing, /removeAttribute\("data-crt-warm"\)/, "the copy gate is always cleared");
  // Hiding the copy is only safe if something other than the animation can put
  // it back. requestAnimationFrame stops in hidden tabs and throttled embeds,
  // and every one of those would otherwise strand the page blank — so the
  // un-hide is owned by a timer, and the timer also abandons the strike.
  const gate = landing.slice(landing.indexOf('setAttribute("data-crt-warm"'));
  assert.match(gate.slice(0, 1200), /setTimeout\(/, "a timer, not a frame, guarantees the copy returns");
  assert.match(gate.slice(0, 1200), /warmGiveUp\s*=\s*true/, "abandoning the strike also restores the picture");
  assert.match(landing, /warmAt\([^)]*state\.reduce \|\| warmGiveUp\)/, "an abandoned strike reports fully warm");
  // The copy is released when the raster finishes opening, not when the ramp
  // ends — the rest is beam settling, which the picture rides through. Holding
  // the page blank for that tail is a tax on every visit for no extra realism.
  assert.ok(
    crt.RASTER_OPEN > 0 && crt.RASTER_OPEN < 1,
    "the raster opens before the warm ramp ends",
  );
  assert.match(
    landing,
    /tube\.warm < window\.CW_CRT\.RASTER_OPEN/,
    "the copy gate releases at raster-open, not at the end of the ramp",
  );

  // A WebGL context is not a promise: a GPU reset, driver hiccup or mobile tab
  // eviction takes it away mid-run and every later draw throws, which would kill
  // the render loop and freeze the page on its last frame. `canvasui-fx.js` in
  // this app already guards its contexts; this one has to as well.
  assert.match(landing, /webglcontextlost/, "the tube stands down when its context is lost");
  assert.match(
    landing,
    /ev\.preventDefault\(\)[\s\S]{0,120}loseTube\(\)/,
    "the loss is default-prevented so the canvas stays eligible for restore",
  );
  const lose = landing.slice(landing.indexOf("function loseTube"));
  assert.match(lose.slice(0, 500), /removeAttribute\("data-crt-pass"\)/, "standing down restores the CSS tube");
  assert.match(lose.slice(0, 500), /removeAttribute\("data-crt-warm"\)/, "standing down releases the copy");
  assert.match(
    landing,
    /try \{\s*crt\.draw\([^}]*\}\s*catch\s*\{[\s\S]{0,160}loseTube\(\)/,
    "anything the tube throws is terminal for the tube, not for the page",
  );

  // Persistence is motion. Reduced motion has none, so the second full-size
  // canvas is not allocated and copied into every frame for nothing.
  assert.match(
    landing,
    /var glow = state\.reduce \? null : document\.createElement\("canvas"\)/,
    "no persistence buffer is allocated when motion is unwelcome",
  );

  // Power-off must never be able to strand someone on the landing: rAF stops in
  // a background tab, so a timer — not the animation — is what navigates.
  const enterHandler = landing.slice(landing.indexOf("cw-landing-enter[href]"));
  assert.match(
    enterHandler.slice(0, 1400),
    /setTimeout\(leave/,
    "a timer guarantees navigation even if frames stop",
  );
  assert.match(
    enterHandler.slice(0, 1400),
    /metaKey|ctrlKey/,
    "modified clicks (open in new tab) keep their native behaviour",
  );
  // Two visible CTAs enter the board. They are the same affordance, so only one
  // of them powering the tube down would read as a bug rather than a flourish.
  assert.match(
    landing,
    /querySelectorAll\("a\.cw-landing-enter\[href\]"\)/,
    "every board CTA powers the tube down, not just the hero one",
  );
  assert.ok(
    (index.match(/class="cw-landing-enter"/g) ?? []).length >= 2,
    "the markup really does carry more than one board CTA",
  );

  // The warm custom property is written on change only: after the strike it is
  // a constant, and a style write every frame for the life of the page is waste.
  assert.match(landing, /lastWarmCss/, "--cw-crt-warm is written only when it changes");

  const faceOpacity = /opacity:\s*([\d.]+)/.exec(face[1]);
  assert.ok(faceOpacity, ".cw-crt-face pins an explicit opacity");
  assert.ok(
    Number(faceOpacity[1]) <= 0.3,
    `face opacity ${faceOpacity[1]} exceeds 0.3; measured contrast headroom over the 7:1 floor is gone past that`,
  );
}
