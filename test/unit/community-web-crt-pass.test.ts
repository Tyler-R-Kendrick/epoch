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
  return { distort: 0.24, chroma: 1.2, scan: 0.55, bloom: 0.48, motion: 1, ...overrides };
}

const SCENE: SceneSource = { label: "scene-canvas" };

export async function runCommunityWebCrtPassTests(): Promise<void> {
  const crt = loadCrt();

  // The terminal variant is the design being reproduced. These numbers are the
  // look; drifting one silently changes the landing's first impression, so they
  // are pinned rather than left as magic numbers in a shader call site.
  assert.deepEqual(crt.TERMINAL.curve, [0.115, 0.165], "tube curves more vertically than horizontally");
  assert.equal(crt.TERMINAL.scanDensity, 0.44);
  assert.equal(crt.TERMINAL.scanDepth, 0.3);
  assert.equal(crt.TERMINAL.triadCss, 3.2);
  assert.equal(crt.TERMINAL.grille, 0.34);
  assert.equal(crt.TERMINAL.gain, 1.34, "grille and scanlines eat light; gain puts it back");
  assert.equal(crt.TERMINAL.halo, 0.1);
  assert.deepEqual(crt.TERMINAL.sheen, [0.55, 1, 0.78], "glass sheen is phosphor green, not white");
  assert.deepEqual(crt.TERMINAL.room, [0.012, 0.03, 0.022], "outside the tube is a lit room, not black");

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

  // Measured on the rendered lede: the face costs 11.5:1 → 8.95:1. That is the
  // whole budget against the contract's 7:1 body floor, so the strength is
  // capped here rather than left to whoever next reaches for "a bit more CRT".
  const faceOpacity = /opacity:\s*([\d.]+)/.exec(face[1]);
  assert.ok(faceOpacity, ".cw-crt-face pins an explicit opacity");
  assert.ok(
    Number(faceOpacity[1]) <= 0.3,
    `face opacity ${faceOpacity[1]} exceeds 0.3; measured contrast headroom over the 7:1 floor is gone past that`,
  );
}
