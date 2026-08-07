"use strict";
var NB_CanvasUI = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // docs/design-explorations/nightboard/.canvasui-fx-entry.ts
  var canvasui_fx_entry_exports = {};
  __export(canvasui_fx_entry_exports, {
    asciifySupported: () => supportsHtmlInCanvas,
    createAsciify: () => createAsciify,
    createDecryptReveal: () => createDecryptReveal,
    createGlitch: () => createGlitch,
    createVHS: () => createVHS,
    decryptSupported: () => supportsHtmlInCanvas2,
    glitchSupported: () => supportsHtmlInCanvas3,
    vhsSupported: () => supportsHtmlInCanvas4
  });

  // components/canvasui/AsciifyVanilla.ts
  var CHARSETS = {
    ascii: [
      0,
      128,
      131200,
      14336,
      459200,
      469440,
      4357252,
      18157905,
      11512810,
      15724526
    ],
    blocks: [0, 328e3, 22041621, 22369621, 11512810, 33554431],
    binary: [0, 4591758, 15324974]
  };
  var MAX_GLYPHS = 16;
  var FALLBACK_CAPTURE_DELAY = 500;
  var DEFAULTS = {
    radius: 0.4,
    softness: 1,
    scale: 2,
    spacing: 1,
    charset: "ascii",
    glyphs: [],
    background: [0, 0, 0],
    backgroundOpacity: 0,
    contrast: 1,
    brightness: 0,
    invert: 0,
    strength: 1,
    baseStrength: 0,
    followSpeed: 3,
    glow: 0.75,
    aberration: 0.75
  };
  var VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
  var FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uContentOffset;
uniform vec2 uResolution;
uniform float uGlyphPx;
uniform float uSpacing;
uniform uint uGlyphs[${MAX_GLYPHS}];
uniform int uGlyphCount;
uniform float uRadius;
uniform float uSoftness;
uniform vec2 uPointer;
uniform float uActive;
uniform vec3 uBg;
uniform float uBackingLum;
uniform float uBgOpacity;
uniform float uLod;
uniform float uContrast;
uniform float uBrightness;
uniform float uInvert;
uniform float uStrength;
uniform float uBase;
uniform float uMaxX;
uniform sampler2D uTextMask;
uniform float uDotPx;
uniform float uDotLod;
uniform float uGlowAmt;
uniform float uAberration;

#define S(a, b, t) smoothstep(a, b, t)

float glyphBit (int index, ivec2 p) {
  if (p.x < 0 || p.x > 4 || p.y < 0 || p.y > 4) return 0.0;
  uint bits = uGlyphs[index];
  return float((bits >> uint((4 - p.x) + 5 * p.y)) & 1u);
}

float hash21 (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 sampleFringe (vec2 uv, float lod, vec2 off) {
  vec4 c = textureLod(uContent, uv, lod);
  c.r = textureLod(uContent, uv + off, lod).r;
  c.b = textureLod(uContent, uv - off, lod).b;
  return c;
}

void main () {
  vec2 uv = vUv;

  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  float cellPx = (5.0 + 2.0 * uSpacing) * uGlyphPx;
  vec2 frag = uv * uResolution;
  vec2 cell = floor(frag / cellPx);
  vec2 cellUv = (cell + 0.5) * cellPx / uResolution;

  float aspect = uResolution.x / uResolution.y;
  float dist = length((cellUv - uPointer) * vec2(aspect, 1.0));
  float radius = max(uRadius * uActive, 1e-4);
  float inner = radius * (1.0 - clamp(uSoftness, 0.0, 1.0));
  float lens = (1.0 - S(inner, radius, dist)) * uActive;
  float mask = clamp(max(lens, clamp(uBase, 0.0, 1.0)), 0.0, 1.0)
    * clamp(uStrength, 0.0, 1.0);

  float apply = mask < 0.003 ? 0.0 : step(hash21(cell), mask);

  if (apply < 0.5) {
    outColor = vec4(0.0);
    return;
  }

  vec2 textureUv = vec2(cellUv.x, 1.0 - cellUv.y) + uContentOffset;
  if (textureUv.x < 0.001 || textureUv.x > uMaxX - 0.002 ||
      textureUv.y < 0.001 || textureUv.y > 0.999) {
    outColor = vec4(0.0);
    return;
  }

  vec2 lensDir = (cellUv - uPointer) * vec2(aspect, 1.0);
  float fringeAmp = max(uActive, S(0.0, 0.25, uBase));
  vec2 fringe = normalize(lensDir + 1e-5)
    * clamp(uAberration, 0.0, 1.0) * 0.005
    * S(uRadius * 0.15, uRadius, dist) * fringeAmp;
  fringe = vec2(fringe.x / aspect, -fringe.y);

  float textness = texture(uTextMask, vec2(cellUv.x, 1.0 - cellUv.y)).r;

  if (textness > 0.4) {
    vec2 dotIdx = floor(frag / uDotPx);
    vec2 dotUv = (dotIdx + 0.5) * uDotPx / uResolution;
    vec2 flippedUv = clamp(
      vec2(dotUv.x, 1.0 - dotUv.y) + uContentOffset,
      vec2(0.001), vec2(uMaxX - 0.002, 0.999));
    vec4 ink = sampleFringe(flippedUv, uDotLod, fringe);
    float inkLum = dot(ink.rgb, vec3(0.299, 0.587, 0.114));
    float density = abs(inkLum - uBackingLum);
    density = clamp((density - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
    density = mix(density, 1.0 - density, clamp(uInvert, 0.0, 1.0));
    float d = length(frag - (dotIdx + 0.5) * uDotPx) / (uDotPx * 0.5);
    float reach = sqrt(density);
    float on = (1.0 - S(reach - 0.3, reach + 0.2, d)) * step(0.03, density);
    vec3 inkColor = clamp(
      uBg + (ink.rgb - uBg) / max(abs(inkLum - uBackingLum), 0.2),
      0.0, 1.0);
    vec4 soft = sampleFringe(flippedUv, uDotLod + 2.5, fringe);
    float softLum = dot(soft.rgb, vec3(0.299, 0.587, 0.114));
    float halo = clamp(abs(softLum - uBackingLum) * 2.2, 0.0, 1.0)
      * clamp(uGlowAmt, 0.0, 1.0) * 0.55;
    vec3 haloColor = clamp(
      uBg + (soft.rgb - uBg) / max(abs(softLum - uBackingLum), 0.2),
      0.0, 1.0);
    vec3 col = mix(haloColor, inkColor, on);
    float alpha = ink.a
      * max(mix(clamp(uBgOpacity, 0.0, 1.0), 1.0, on), halo * (1.0 - on));
    outColor = vec4(col * alpha, alpha);
    return;
  }

  vec4 pixel = sampleFringe(textureUv, uLod, fringe);

  float lum = dot(pixel.rgb, vec3(0.299, 0.587, 0.114));
  float amount = abs(lum - uBackingLum);
  amount = clamp((amount - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  amount = mix(amount, 1.0 - amount, clamp(uInvert, 0.0, 1.0));

  int index = min(int(amount * float(uGlyphCount)), uGlyphCount - 1);

  ivec2 local = ivec2(floor((frag - cell * cellPx) / uGlyphPx));
  int pad = int(uSpacing);
  float on = glyphBit(index, ivec2(local.x - pad, local.y - pad));

  vec3 glyphColor = clamp(
    uBg + (pixel.rgb - uBg) / max(abs(lum - uBackingLum), 0.2),
    0.0, 1.0);
  vec3 col = mix(uBg, glyphColor, on);
  float alpha = pixel.a * mix(clamp(uBgOpacity, 0.0, 1.0), 1.0, on);
  outColor = vec4(col * alpha, alpha);
}`;
  function supportsHtmlInCanvas() {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    return Boolean(
      ctx && typeof ctx.drawElementImage === "function" && typeof probe.requestPaint === "function"
    );
  }
  function intersectFallbackRects(first, second) {
    return {
      left: Math.max(first.left, second.left),
      top: Math.max(first.top, second.top),
      right: Math.min(first.right, second.right),
      bottom: Math.min(first.bottom, second.bottom)
    };
  }
  function paintFallbackSnapshot(content, canvas) {
    const rootRect = content.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rootRect.width * dpr));
    const height = Math.max(1, Math.round(rootRect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas is unavailable");
    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
    ctx.scale(dpr, dpr);
    const rootClip = {
      left: rootRect.left,
      top: rootRect.top,
      right: rootRect.right,
      bottom: rootRect.bottom
    };
    const states = /* @__PURE__ */ new WeakMap();
    function resolveState(element) {
      const cached = states.get(element);
      if (cached) return cached;
      const parent = element.parentElement;
      const parentState = parent && content.contains(parent) ? resolveState(parent) : null;
      const style = getComputedStyle(element);
      const ownOpacity = Number.parseFloat(style.opacity);
      const opacity = (parentState?.opacity ?? 1) * (Number.isFinite(ownOpacity) ? ownOpacity : 1);
      const visible = (parentState?.visible ?? true) && style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && opacity > 0;
      const clip = parentState?.childrenClip ?? rootClip;
      const rect = element.getBoundingClientRect();
      const childrenClip = { ...clip };
      if (style.overflowX !== "visible") {
        childrenClip.left = Math.max(childrenClip.left, rect.left);
        childrenClip.right = Math.min(childrenClip.right, rect.right);
      }
      if (style.overflowY !== "visible") {
        childrenClip.top = Math.max(childrenClip.top, rect.top);
        childrenClip.bottom = Math.min(childrenClip.bottom, rect.bottom);
      }
      const state = { style, visible, opacity, clip, childrenClip };
      states.set(element, state);
      return state;
    }
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT);
    let current = walker.currentNode;
    while (current) {
      const element = current;
      const rect = element.getBoundingClientRect();
      const state = resolveState(element);
      const visibleRect = intersectFallbackRects(rect, state.clip);
      if (state.visible && visibleRect.right > visibleRect.left && visibleRect.bottom > visibleRect.top) {
        const { style } = state;
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          state.clip.left - rootRect.left,
          state.clip.top - rootRect.top,
          state.clip.right - state.clip.left,
          state.clip.bottom - state.clip.top
        );
        ctx.clip();
        ctx.globalAlpha = state.opacity;
        const x = rect.left - rootRect.left;
        const y = rect.top - rootRect.top;
        if (style.backgroundColor !== "transparent") {
          ctx.fillStyle = style.backgroundColor;
          ctx.fillRect(x, y, rect.width, rect.height);
        }
        paintFallbackMedia(ctx, element, style, rect, rootRect);
        paintFallbackText(ctx, element, style, rootRect);
        paintFallbackBorders(ctx, style, rect, rootRect);
        ctx.restore();
      }
      current = walker.nextNode();
    }
    ctx.globalAlpha = 1;
  }
  function paintFallbackMedia(ctx, element, style, rect, rootRect) {
    const drawable = element instanceof HTMLImageElement ? element.complete && element.naturalWidth > 0 ? element : null : element instanceof HTMLCanvasElement ? element : element instanceof HTMLVideoElement && element.readyState >= 2 ? element : null;
    if (!drawable) return;
    if (!isFallbackMediaOriginClean(drawable)) return;
    const sourceWidth = drawable instanceof HTMLImageElement ? drawable.naturalWidth : drawable instanceof HTMLVideoElement ? drawable.videoWidth : drawable.width;
    const sourceHeight = drawable instanceof HTMLImageElement ? drawable.naturalHeight : drawable instanceof HTMLVideoElement ? drawable.videoHeight : drawable.height;
    if (!(sourceWidth > 0 && sourceHeight > 0)) return;
    let sourceX = 0;
    let sourceY = 0;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let targetX = rect.left - rootRect.left;
    let targetY = rect.top - rootRect.top;
    let targetWidth = rect.width;
    let targetHeight = rect.height;
    const [positionX, positionY] = resolveObjectPosition(style.objectPosition);
    if (style.objectFit === "cover") {
      const scale = Math.max(
        rect.width / sourceWidth,
        rect.height / sourceHeight
      );
      cropWidth = rect.width / scale;
      cropHeight = rect.height / scale;
      sourceX = (sourceWidth - cropWidth) * positionX;
      sourceY = (sourceHeight - cropHeight) * positionY;
    } else if (style.objectFit === "contain" || style.objectFit === "scale-down") {
      const containScale = Math.min(
        rect.width / sourceWidth,
        rect.height / sourceHeight,
        style.objectFit === "scale-down" ? 1 : Number.POSITIVE_INFINITY
      );
      targetWidth = sourceWidth * containScale;
      targetHeight = sourceHeight * containScale;
      targetX += (rect.width - targetWidth) * positionX;
      targetY += (rect.height - targetHeight) * positionY;
    }
    try {
      ctx.drawImage(
        drawable,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        targetX,
        targetY,
        targetWidth,
        targetHeight
      );
    } catch {
    }
  }
  function isFallbackMediaOriginClean(drawable) {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const ctx = probe.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    try {
      ctx.drawImage(drawable, 0, 0, 1, 1);
      ctx.getImageData(0, 0, 1, 1);
      return true;
    } catch {
      return false;
    }
  }
  function resolveObjectPosition(position) {
    const [x = "50%", y = "50%"] = position.split(/\s+/);
    return [
      resolvePositionValue(x, "left", "right"),
      resolvePositionValue(y, "top", "bottom")
    ];
  }
  function resolvePositionValue(value, start, end) {
    if (value === start) return 0;
    if (value === end) return 1;
    if (value === "center") return 0.5;
    if (value.endsWith("%")) {
      return Math.min(1, Math.max(0, Number.parseFloat(value) / 100));
    }
    return 0.5;
  }
  function paintFallbackText(ctx, element, style, rootRect) {
    const textNodes = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );
    if (textNodes.length === 0) return;
    ctx.fillStyle = style.color;
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) {
      ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    }
    const textAlign = style.textAlign === "center" || style.textAlign === "right" || style.textAlign === "start" || style.textAlign === "end" ? style.textAlign : "left";
    const direction = style.direction === "rtl" ? "rtl" : "ltr";
    ctx.textAlign = textAlign;
    ctx.direction = direction;
    const whiteSpace = style.whiteSpace;
    const preservesNewlines = whiteSpace === "pre" || whiteSpace === "pre-wrap" || whiteSpace === "pre-line" || whiteSpace === "break-spaces";
    const preservesSpaces = preservesNewlines && whiteSpace !== "pre-line";
    const anchor = textAlign === "center" ? 0.5 : textAlign === "right" || textAlign === "end" && direction === "ltr" || textAlign === "start" && direction === "rtl" ? 1 : 0;
    function transform(text) {
      if (style.textTransform === "uppercase") return text.toUpperCase();
      if (style.textTransform === "lowercase") return text.toLowerCase();
      return text;
    }
    function drawAcrossRects(text, rects) {
      const visible = rects.filter(
        (rect) => rect.right > rootRect.left && rect.left < rootRect.right && rect.bottom > rootRect.top && rect.top < rootRect.bottom
      );
      if (visible.length === 0) return;
      const totalWidth = visible.reduce((sum, rect) => sum + rect.width, 0);
      let offset = 0;
      for (let index = 0; index < visible.length; index++) {
        const rect = visible[index];
        const remaining = text.length - offset;
        if (remaining <= 0) break;
        const count = index === visible.length - 1 ? remaining : Math.min(
          remaining,
          Math.max(1, Math.round(text.length * rect.width / totalWidth))
        );
        const slice = text.slice(offset, offset + count);
        offset += count;
        const line = preservesSpaces ? slice : slice.trim();
        if (!line.trim()) continue;
        const x = rect.left - rootRect.left + rect.width * anchor;
        const metrics = ctx.measureText(line);
        const ascent = metrics.fontBoundingBoxAscent ?? 0;
        const descent = metrics.fontBoundingBoxDescent ?? 0;
        const y = ascent > 0 ? rect.top - rootRect.top + (rect.height - ascent - descent) / 2 + ascent : rect.bottom - rootRect.top - rect.height * 0.2;
        ctx.fillText(line, x, y, Math.max(rect.width, 1));
      }
    }
    for (const node of textNodes) {
      const raw = node.textContent ?? "";
      const range = document.createRange();
      if (preservesNewlines) {
        let position = 0;
        for (const part of raw.split("\n")) {
          const start = position;
          position += part.length + 1;
          if (!part.trim()) continue;
          range.setStart(node, start);
          range.setEnd(node, start + part.length);
          const text2 = transform(
            preservesSpaces ? part : part.replace(/\s+/g, " ").trim()
          );
          drawAcrossRects(text2, Array.from(range.getClientRects()));
        }
        continue;
      }
      const text = transform(raw.replace(/\s+/g, " ").trim());
      if (!text) continue;
      range.selectNodeContents(node);
      drawAcrossRects(text, Array.from(range.getClientRects()));
    }
  }
  function paintFallbackBorders(ctx, style, rect, rootRect) {
    const x = rect.left - rootRect.left;
    const y = rect.top - rootRect.top;
    const top = Number.parseFloat(style.borderTopWidth);
    const right = Number.parseFloat(style.borderRightWidth);
    const bottom = Number.parseFloat(style.borderBottomWidth);
    const left = Number.parseFloat(style.borderLeftWidth);
    if (top > 0) {
      ctx.fillStyle = style.borderTopColor;
      ctx.fillRect(x, y, rect.width, top);
    }
    if (right > 0) {
      ctx.fillStyle = style.borderRightColor;
      ctx.fillRect(x + rect.width - right, y, right, rect.height);
    }
    if (bottom > 0) {
      ctx.fillStyle = style.borderBottomColor;
      ctx.fillRect(x, y + rect.height - bottom, rect.width, bottom);
    }
    if (left > 0) {
      ctx.fillStyle = style.borderLeftColor;
      ctx.fillRect(x, y, left, rect.height);
    }
  }
  function createAsciify(elements, options = {}) {
    try {
      return initializeAsciify(elements, options);
    } catch (error) {
      console.error("Asciify initialization failed:", error);
      return null;
    }
  }
  function initializeAsciify(elements, options) {
    const config = { ...DEFAULTS, ...options };
    const { source, content, output } = elements;
    const gl = output.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: true
    });
    if (!gl || gl.isContextLost()) return null;
    const sourceCtx = source.getContext("2d");
    const paintable = source;
    const htmlInCanvas = Boolean(
      sourceCtx && typeof sourceCtx.drawElementImage === "function" && typeof paintable.requestPaint === "function"
    );
    let destroyed = false;
    let contentDirty = false;
    let wake = () => {
    };
    let fallbackSource = null;
    let fallbackCaptureTimer = 0;
    let fallbackCaptureDeadline = 0;
    let fallbackScrollCaptureTimer = 0;
    let capturedScrollLeft = 0;
    let capturedScrollTop = 0;
    let fallbackErrorLogged = false;
    let textureUploadErrorLogged = false;
    if (htmlInCanvas) {
      paintable.onpaint = () => {
        try {
          sourceCtx.reset();
          sourceCtx.drawElementImage(content, 0, 0);
          contentDirty = true;
          scheduleTextMask();
          wake();
        } catch {
        }
      };
    }
    function queueFallbackCapture(immediate = false) {
      if (htmlInCanvas || destroyed) return;
      const delay = immediate ? 0 : FALLBACK_CAPTURE_DELAY;
      const deadline = performance.now() + delay;
      if (fallbackCaptureTimer && fallbackCaptureDeadline <= deadline) return;
      window.clearTimeout(fallbackCaptureTimer);
      fallbackCaptureDeadline = deadline;
      fallbackCaptureTimer = window.setTimeout(captureFallback, delay);
    }
    function captureFallback() {
      window.clearTimeout(fallbackCaptureTimer);
      window.clearTimeout(fallbackScrollCaptureTimer);
      fallbackCaptureTimer = 0;
      fallbackScrollCaptureTimer = 0;
      try {
        paintFallbackSnapshot(content, source);
        if (destroyed) return;
        fallbackSource = source;
        capturedScrollLeft = content.scrollLeft;
        capturedScrollTop = content.scrollTop;
        contentDirty = true;
        fallbackErrorLogged = false;
        scheduleTextMask();
        wake();
      } catch (error) {
        if (!destroyed && !fallbackErrorLogged) {
          fallbackErrorLogged = true;
          console.warn("Asciify could not capture its HTML fallback:", error);
        }
      }
    }
    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || "Unknown shader error";
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }
    const vertexShader = compile(gl.VERTEX_SHADER, VERT);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unknown program link error";
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(message);
    }
    const uniforms = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const contentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    let contentMaxX = 1;
    const textMaskTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    const MASK_SCALE = 0.25;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    let maskDirty = false;
    let maskTimer = 0;
    let maskStamp = 0;
    function buildTextMask() {
      if (!maskCtx) return;
      const bounds = output.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width * MASK_SCALE));
      const height = Math.max(1, Math.round(bounds.height * MASK_SCALE));
      if (maskCanvas.width !== width || maskCanvas.height !== height) {
        maskCanvas.width = width;
        maskCanvas.height = height;
      }
      maskCtx.clearRect(0, 0, width, height);
      maskCtx.fillStyle = "#fff";
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while (node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement;
        if (!parent || parent.checkVisibility && !parent.checkVisibility()) {
          continue;
        }
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (r.width < 1 || r.height < 1) continue;
          if (r.bottom < bounds.top || r.top > bounds.bottom) continue;
          maskCtx.fillRect(
            (r.left - bounds.left - 1) * MASK_SCALE,
            (r.top - bounds.top - 1) * MASK_SCALE,
            (r.width + 2) * MASK_SCALE,
            (r.height + 2) * MASK_SCALE
          );
        }
      }
      const fields = content.querySelectorAll("input, textarea, select");
      for (let i = 0; i < fields.length; i++) {
        const r = fields[i].getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.bottom < bounds.top || r.top > bounds.bottom) continue;
        maskCtx.fillRect(
          (r.left - bounds.left) * MASK_SCALE,
          (r.top - bounds.top) * MASK_SCALE,
          r.width * MASK_SCALE,
          r.height * MASK_SCALE
        );
      }
      maskDirty = true;
    }
    function scheduleTextMask() {
      if (maskTimer) return;
      const wait = Math.max(0, 120 - (performance.now() - maskStamp));
      maskTimer = window.setTimeout(() => {
        maskTimer = 0;
        maskStamp = performance.now();
        buildTextMask();
        start();
      }, wait);
    }
    function syncCanvasSize() {
      let changed = false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(output.clientWidth * dpr));
      const height = Math.max(1, Math.round(output.clientHeight * dpr));
      if (output.width !== width || output.height !== height) {
        output.width = width;
        output.height = height;
        changed = true;
      }
      contentMaxX = Math.min(
        1,
        Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1))
      );
      if (htmlInCanvas) {
        const cssWidth = Math.max(1, Math.round(source.clientWidth));
        const cssHeight = Math.max(1, Math.round(source.clientHeight));
        if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
          source.width = cssWidth * dpr;
          source.height = cssHeight * dpr;
          changed = true;
        }
        paintable.requestPaint();
      }
      return changed;
    }
    syncCanvasSize();
    let backingRgb = [1, 1, 1];
    let backingLum = 1;
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const probeCtx = probe.getContext("2d", { willReadFrequently: true });
    function syncBacking() {
      backingRgb = [1, 1, 1];
      if (probeCtx) {
        let el = content;
        while (el) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "transparent") {
            probeCtx.clearRect(0, 0, 1, 1);
            probeCtx.fillStyle = bg;
            probeCtx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
            if (a > 0) {
              backingRgb = [r / 255, g / 255, b / 255];
              break;
            }
          }
          el = el.parentElement;
        }
      }
      backingLum = 0.299 * backingRgb[0] + 0.587 * backingRgb[1] + 0.114 * backingRgb[2];
    }
    syncBacking();
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, target: 0 };
    const glyphData = new Uint32Array(MAX_GLYPHS);
    function resolveGlyphs() {
      const ramp = config.glyphs.length > 1 ? config.glyphs : CHARSETS[config.charset] ?? CHARSETS.ascii;
      const count = Math.min(ramp.length, MAX_GLYPHS);
      glyphData.fill(0);
      for (let i = 0; i < count; i++) glyphData[i] = ramp[i] >>> 0;
      return count;
    }
    function uploadContent() {
      const bitmap = htmlInCanvas ? source : fallbackSource;
      if (!bitmap || !contentDirty) return;
      contentDirty = false;
      try {
        gl.bindTexture(gl.TEXTURE_2D, contentTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          bitmap
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        textureUploadErrorLogged = false;
      } catch (error) {
        if (!textureUploadErrorLogged) {
          textureUploadErrorLogged = true;
          console.warn("Asciify could not upload its content texture:", error);
        }
      }
    }
    function uploadMask() {
      if (!maskDirty) return;
      maskDirty = false;
      gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        maskCanvas
      );
    }
    function render() {
      uploadContent();
      uploadMask();
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.uniform1i(uniforms.uContent, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
      gl.uniform1i(uniforms.uTextMask, 1);
      gl.uniform2f(
        uniforms.uContentOffset,
        htmlInCanvas ? 0 : (content.scrollLeft - capturedScrollLeft) / Math.max(content.clientWidth, 1),
        htmlInCanvas ? 0 : (content.scrollTop - capturedScrollTop) / Math.max(content.clientHeight, 1)
      );
      gl.uniform2f(uniforms.uResolution, output.width, output.height);
      const dpr = output.width / Math.max(output.clientWidth, 1);
      const glyphCss = Math.max(config.scale, 0.5);
      const dotCss = Math.max(1.25, glyphCss * 0.75);
      const texelsPerCss = htmlInCanvas ? dpr : source.width / Math.max(content.clientWidth, 1);
      gl.uniform1f(uniforms.uDotPx, dotCss * dpr);
      gl.uniform1f(
        uniforms.uDotLod,
        Math.max(0, Math.log2(dotCss * Math.max(texelsPerCss, 0.25) / dpr) - 1)
      );
      gl.uniform1f(uniforms.uGlowAmt, config.glow);
      gl.uniform1f(uniforms.uAberration, config.aberration);
      const spacing = Math.round(Math.min(Math.max(config.spacing, 0), 3));
      gl.uniform1f(uniforms.uGlyphPx, glyphCss * dpr);
      gl.uniform1f(uniforms.uSpacing, spacing);
      gl.uniform1f(
        uniforms.uLod,
        Math.max(0, Math.log2((5 + 2 * spacing) * glyphCss) - 1)
      );
      const glyphCount = resolveGlyphs();
      gl.uniform1uiv(uniforms["uGlyphs[0]"], glyphData);
      gl.uniform1i(uniforms.uGlyphCount, glyphCount);
      gl.uniform1f(uniforms.uRadius, Math.max(config.radius, 0.01));
      gl.uniform1f(uniforms.uSoftness, config.softness);
      gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
      gl.uniform1f(uniforms.uActive, pointer.active);
      const bg = config.background === "auto" ? backingRgb : config.background;
      gl.uniform3f(uniforms.uBg, bg[0], bg[1], bg[2]);
      gl.uniform1f(uniforms.uBackingLum, backingLum);
      gl.uniform1f(uniforms.uBgOpacity, config.backgroundOpacity);
      gl.uniform1f(uniforms.uContrast, Math.max(config.contrast, 0));
      gl.uniform1f(uniforms.uBrightness, config.brightness);
      gl.uniform1f(uniforms.uInvert, config.invert);
      gl.uniform1f(uniforms.uStrength, config.strength);
      gl.uniform1f(uniforms.uBase, config.baseStrength);
      gl.uniform1f(uniforms.uMaxX, contentMaxX);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, output.width, output.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    let raf = 0;
    let lastTime = performance.now();
    let running = false;
    let visible = true;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    function frame(now) {
      if (destroyed) return;
      if (!visible) {
        running = false;
        return;
      }
      const delta = Math.min((now - lastTime) / 1e3, 1 / 30);
      lastTime = now;
      const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * Math.max(config.followSpeed, 0.5));
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      pointer.active += (pointer.target - pointer.active) * ease;
      const settled = Math.abs(pointer.tx - pointer.x) < 5e-4 && Math.abs(pointer.ty - pointer.y) < 5e-4 && Math.abs(pointer.target - pointer.active) < 1e-3;
      if (settled) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
        pointer.active = pointer.target;
      }
      render();
      if (settled && !contentDirty) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (destroyed || running || !visible) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
    wake = start;
    queueFallbackCapture(true);
    start();
    function onMotionChange() {
      reducedMotion = motionQuery.matches;
      start();
    }
    motionQuery.addEventListener("change", onMotionChange);
    let themeTimer = 0;
    function onThemeShift() {
      syncBacking();
      start();
      window.clearTimeout(themeTimer);
      themeTimer = window.setTimeout(() => {
        syncBacking();
        queueFallbackCapture();
        start();
      }, 300);
    }
    const themeObserver = new MutationObserver(onThemeShift);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    });
    const schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    schemeQuery.addEventListener("change", onThemeShift);
    const observer = new ResizeObserver(() => {
      if (syncCanvasSize()) queueFallbackCapture();
      start();
    });
    observer.observe(output);
    observer.observe(content);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) start();
    });
    intersection.observe(output);
    const listenTarget = output.parentElement ?? output;
    const contentObserver = htmlInCanvas ? null : new MutationObserver(() => queueFallbackCapture());
    contentObserver?.observe(content, {
      attributes: true,
      attributeFilter: ["class", "hidden", "src", "srcset", "style"],
      characterData: true,
      childList: true,
      subtree: true
    });
    function onContentScroll() {
      if (htmlInCanvas || destroyed) return;
      window.clearTimeout(fallbackScrollCaptureTimer);
      fallbackScrollCaptureTimer = window.setTimeout(
        captureFallback,
        FALLBACK_CAPTURE_DELAY
      );
      start();
    }
    function onFallbackVisualChange() {
      queueFallbackCapture();
    }
    if (!htmlInCanvas) {
      content.addEventListener("scroll", onContentScroll, {
        capture: true,
        passive: true
      });
      content.addEventListener("load", onFallbackVisualChange, true);
      content.addEventListener("loadeddata", onFallbackVisualChange, true);
      content.addEventListener("focusin", onFallbackVisualChange, true);
      content.addEventListener("focusout", onFallbackVisualChange, true);
      content.addEventListener("input", onFallbackVisualChange, true);
      content.addEventListener("change", onFallbackVisualChange, true);
      content.addEventListener("transitionend", onFallbackVisualChange, true);
      content.addEventListener("transitioncancel", onFallbackVisualChange, true);
      content.addEventListener("animationend", onFallbackVisualChange, true);
      document.fonts?.addEventListener("loadingdone", onFallbackVisualChange);
    }
    function onPointerMove(event) {
      const rect = output.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointer.ty = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
      pointer.target = 1;
      queueFallbackCapture();
      start();
    }
    function onPointerLeave() {
      pointer.target = 0;
      queueFallbackCapture();
      start();
    }
    listenTarget.addEventListener("pointermove", onPointerMove);
    listenTarget.addEventListener("pointerleave", onPointerLeave);
    content.addEventListener("scroll", scheduleTextMask, {
      capture: true,
      passive: true
    });
    return {
      setOptions(next) {
        let changed = false;
        for (const [key, value] of Object.entries(next)) {
          const prev = config[key];
          if (Array.isArray(value) && Array.isArray(prev)) {
            if (value.length !== prev.length || value.some((item, i) => item !== prev[i])) {
              changed = true;
              break;
            }
          } else if (prev !== value) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          Object.assign(config, next);
          return;
        }
        Object.assign(config, next);
        syncBacking();
        scheduleTextMask();
        start();
      },
      resize() {
        syncCanvasSize();
        syncBacking();
        queueFallbackCapture();
        scheduleTextMask();
        start();
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        window.clearTimeout(themeTimer);
        window.clearTimeout(fallbackCaptureTimer);
        window.clearTimeout(fallbackScrollCaptureTimer);
        window.clearTimeout(maskTimer);
        observer.disconnect();
        intersection.disconnect();
        themeObserver.disconnect();
        contentObserver?.disconnect();
        schemeQuery.removeEventListener("change", onThemeShift);
        motionQuery.removeEventListener("change", onMotionChange);
        listenTarget.removeEventListener("pointermove", onPointerMove);
        listenTarget.removeEventListener("pointerleave", onPointerLeave);
        content.removeEventListener("scroll", onContentScroll, true);
        content.removeEventListener("scroll", scheduleTextMask, {
          capture: true
        });
        content.removeEventListener("load", onFallbackVisualChange, true);
        content.removeEventListener("loadeddata", onFallbackVisualChange, true);
        content.removeEventListener("focusin", onFallbackVisualChange, true);
        content.removeEventListener("focusout", onFallbackVisualChange, true);
        content.removeEventListener("input", onFallbackVisualChange, true);
        content.removeEventListener("change", onFallbackVisualChange, true);
        content.removeEventListener(
          "transitionend",
          onFallbackVisualChange,
          true
        );
        content.removeEventListener(
          "transitioncancel",
          onFallbackVisualChange,
          true
        );
        content.removeEventListener("animationend", onFallbackVisualChange, true);
        document.fonts?.removeEventListener(
          "loadingdone",
          onFallbackVisualChange
        );
        gl.deleteTexture(contentTexture);
        gl.deleteTexture(textMaskTexture);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(quad);
        if (htmlInCanvas) paintable.onpaint = null;
      }
    };
  }

  // components/canvasui/DecryptRevealVanilla.ts
  var PRINTABLE_ASCII = Array.from(
    { length: 95 },
    (_, i) => String.fromCharCode(32 + i)
  ).join("");
  var DEFAULTS2 = {
    radius: 400,
    softness: 0.5,
    cell: 10,
    aspect: 0.75,
    charset: PRINTABLE_ASCII,
    colored: 1,
    color: "#4ade80",
    brightness: 1,
    legibility: 1,
    contrast: 1,
    exposure: 1,
    scramble: 0.1,
    scrambleSpeed: 6,
    edgeWidth: 0.2,
    edgeFlicker: 1,
    edgeGlow: 2,
    edgeTint: 0.75,
    aberration: 10,
    passthrough: 0.15,
    threshold: 0.025,
    background: "#000000",
    smoothing: 0.2
  };
  var ATLAS_CELL = 64;
  var ATLAS_PAD = 8;
  var MAX_GLYPHS2 = 255;
  var INNER_CIRCLES = [
    [0.28, 0.26],
    [0.72, 0.14],
    [0.28, 0.56],
    [0.72, 0.44],
    [0.28, 0.86],
    [0.72, 0.74]
  ];
  var VERT2 = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
  var CELL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uShapes;
uniform vec2 uContentRes;
uniform vec2 uCellPx;
uniform int uGlyphCount;
uniform float uContrast;
uniform float uExposure;
uniform float uThreshold;
uniform vec3 uBg;

const vec2 INNER[6] = vec2[6](
  vec2(0.28, 0.26), vec2(0.72, 0.14),
  vec2(0.28, 0.56), vec2(0.72, 0.44),
  vec2(0.28, 0.86), vec2(0.72, 0.74)
);
const vec2 OUTER[10] = vec2[10](
  vec2(0.28, -0.2), vec2(0.72, -0.2),
  vec2(-0.22, 0.25), vec2(1.22, 0.25),
  vec2(-0.22, 0.5), vec2(1.22, 0.5),
  vec2(-0.22, 0.75), vec2(1.22, 0.75),
  vec2(0.28, 1.2), vec2(0.72, 1.2)
);
const vec2 RING[6] = vec2[6](
  vec2(1.0, 0.0), vec2(0.5, 0.8660254), vec2(-0.5, 0.8660254),
  vec2(-1.0, 0.0), vec2(-0.5, -0.8660254), vec2(0.5, -0.8660254)
);

vec2 cellBase;

vec4 fetchTap (vec2 p) {
  vec2 uv = p / uContentRes;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uContent, uv);
}

vec4 sampleCircle (vec2 c) {
  vec2 middle = cellBase + c * uCellPx;
  float r = uCellPx.y * 0.161;
  vec4 acc = fetchTap(middle);
  for (int k = 0; k < 6; k++) acc += fetchTap(middle + RING[k] * r);
  return acc / 7.0;
}

float tapLevel (vec4 t) {
  vec3 straight = t.rgb / max(t.a, 1e-4);
  return dot(abs(straight - uBg), vec3(0.299, 0.587, 0.114)) * t.a;
}

float circleSig (vec4 acc) {
  return clamp(tapLevel(acc) * uExposure, 0.0, 1.0);
}

float dirContrast (float value, float ext) {
  float peak = max(value, ext);
  if (peak < 1e-4) return value;
  return pow(value / peak, uContrast) * peak;
}

void main () {
  cellBase = floor(gl_FragCoord.xy) * uCellPx;
  float v[6];
  vec3 colAcc = vec3(0.0);
  float alphaAcc = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 acc = sampleCircle(INNER[i]);
    v[i] = circleSig(acc);
    colAcc += acc.rgb;
    alphaAcc += acc.a;
  }
  float e[10];
  for (int i = 0; i < 10; i++) e[i] = circleSig(sampleCircle(OUTER[i]));
  v[0] = dirContrast(v[0], max(max(e[0], e[1]), max(e[2], e[4])));
  v[1] = dirContrast(v[1], max(max(e[0], e[1]), max(e[3], e[5])));
  v[2] = dirContrast(v[2], max(e[2], max(e[4], e[6])));
  v[3] = dirContrast(v[3], max(e[3], max(e[5], e[7])));
  v[4] = dirContrast(v[4], max(max(e[4], e[6]), max(e[8], e[9])));
  v[5] = dirContrast(v[5], max(max(e[5], e[7]), max(e[8], e[9])));
  float gm[6];
  for (int i = 0; i < 6; i++) gm[i] = 0.0;
  float levSum = 0.0;
  float inkLev = 0.0;
  vec3 inkCol = vec3(0.0);
  int nx = int(clamp(uCellPx.x, 6.0, 20.0));
  int ny = int(clamp(uCellPx.y, 8.0, 32.0));
  float fx = float(nx - 1);
  float fy = float(ny - 1);
  for (int gy = 0; gy < ny; gy++) {
    for (int gx = 0; gx < nx; gx++) {
      vec2 p = vec2(float(gx) / fx, float(gy) / fy);
      vec4 t = fetchTap(cellBase + p * uCellPx);
      float lev = tapLevel(t);
      int idx = (p.y < 0.41 ? 0 : (p.y < 0.71 ? 2 : 4)) + (p.x < 0.5 ? 0 : 1);
      gm[idx] = max(gm[idx], lev);
      levSum += lev;
      if (lev > inkLev) {
        inkLev = lev;
        inkCol = t.rgb / max(t.a, 1e-4);
      }
    }
  }
  inkLev *= uExposure;
  for (int i = 0; i < 6; i++)
    v[i] = max(v[i], clamp(gm[i] * uExposure, 0.0, 1.0));
  float peak = max(max(max(v[0], v[1]), max(v[2], v[3])), max(v[4], v[5]));
  vec3 avgCol = colAcc / max(alphaAcc, 1e-4);
  if (peak < uThreshold) {
    outColor = vec4(avgCol, 0.0);
    return;
  }
  float mean = levSum * uExposure / float(nx * ny);
  float sharp = inkLev / max(mean, 1e-4);
  float solid = smoothstep(uThreshold, uThreshold * 1.6, inkLev);
  float lift = smoothstep(1.5, 3.0, sharp) * solid;
  float lifted = mix(peak, 1.0, lift);
  for (int i = 0; i < 6; i++)
    v[i] = pow(min(v[i] / max(peak, 1e-4), 1.0), uContrast) * lifted;
  vec3 cellCol = mix(avgCol, inkCol, lift);
  int best = 0;
  float bestD = 1e9;
  for (int g = 0; g < uGlyphCount; g++) {
    float d = 0.0;
    for (int i = 0; i < 6; i++) {
      float diff = v[i] - texelFetch(uShapes, ivec2(i, g), 0).r;
      d += diff * diff;
    }
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  outColor = vec4(cellCol, float(best) / 255.0);
}`;
  var MAIN_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uCellPx;
uniform vec2 uGrid;
uniform vec2 uAtlasGrid;
uniform vec2 uAtlasPad;
uniform vec2 uAtlasInner;
uniform int uGlyphCount;
uniform vec2 uPointer;
uniform float uActive;
uniform float uRadius;
uniform float uSoftness;
uniform float uColored;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uLegibility;
uniform float uScramble;
uniform float uScrambleSpeed;
uniform float uEdgeWidth;
uniform float uEdgeFlicker;
uniform float uEdgeGlow;
uniform float uEdgeTint;
uniform float uAberration;
uniform float uPassthrough;
uniform vec3 uBg;
uniform float uTime;
uniform float uMaxX;
uniform float uCrisp;

float hash (vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec4 samp (vec2 p) {
  vec2 uv = p / uRes;
  uv = clamp(uv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
  return texture(uContent, uv);
}

void main () {
  vec2 pc = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  if (pc.x > uMaxX * uRes.x) {
    outColor = vec4(0.0);
    return;
  }
  if (uCrisp > 0.5) {
    outColor = samp(pc);
    return;
  }

  float dist = length(pc - uPointer);
  float radius = max(uRadius, 1.0);
  float inner = radius * (1.0 - clamp(uSoftness, 0.02, 1.0));
  float e = (1.0 - smoothstep(inner, radius, dist)) * uActive;

  float bandW = max(radius * clamp(uEdgeWidth, 0.0, 1.0) * 0.5, 6.0);
  float bandD = dist - mix(inner, radius, 0.5);
  float ring = exp(-bandD * bandD / (2.0 * bandW * bandW)) * uActive;

  vec2 dir = (pc - uPointer) / max(dist, 1e-3);
  float ca = uAberration * ring;
  vec4 rC = samp(pc);
  vec3 real = vec3(samp(pc + dir * ca).r, rC.g, samp(pc - dir * ca).b);

  vec2 cellPos = pc * uDpr / uCellPx;
  vec2 cell = clamp(floor(cellPos), vec2(0.0), uGrid - 1.0);
  vec4 info = texelFetch(uCells, ivec2(cell), 0);
  float glyph = floor(info.a * 255.0 + 0.5);

  float rerollP = clamp(uScramble * 0.35 + ring * uEdgeFlicker, 0.0, 1.0);
  float speed = max(uScrambleSpeed, 0.001) * (1.0 + ring * 2.5);
  float ft = floor(uTime * speed);
  float swap = step(1.0 - rerollP, hash(cell * 3.3 + vec2(ft * 0.717, ft * 0.523)))
    * step(0.5, glyph);
  float pick = hash(cell + vec2(ft * 0.613, ft * 0.831));
  glyph = mix(glyph, floor(pick * float(uGlyphCount - 1)) + 1.0, swap);

  vec2 local = clamp(cellPos - cell, 0.0, 1.0);
  float gx = mod(glyph, uAtlasGrid.x);
  float gy = floor(glyph / uAtlasGrid.x);
  vec2 atlasUv = vec2(
    (gx + uAtlasPad.x + local.x * uAtlasInner.x) / uAtlasGrid.x,
    (gy + uAtlasPad.y + local.y * uAtlasInner.y) / uAtlasGrid.y
  );
  vec2 atlasStep = uAtlasInner / uAtlasGrid;
  float mask = textureGrad(
    uAtlas,
    atlasUv,
    dFdx(cellPos) * atlasStep,
    dFdy(cellPos) * atlasStep
  ).a * step(0.5, glyph);

  vec3 cellCol = info.rgb;
  vec3 lw = vec3(0.299, 0.587, 0.114);
  vec3 dev = cellCol - uBg;
  float mag = dot(abs(dev), lw);
  float target = clamp(uLegibility, 0.0, 1.0) * 0.75;
  float boost = clamp(target / max(mag, 0.01), 1.0, 32.0);
  vec3 vivid = clamp(uBg + dev * boost, 0.0, 1.0);
  float vividMag = dot(abs(vivid - uBg), lw);
  vec3 ink = mix(vec3(1.0), vec3(0.06), step(0.5, dot(uBg, lw)));
  vivid = mix(vivid, ink, clamp((target - vividMag) / max(target, 1e-3), 0.0, 1.0));
  float cellSig = clamp(mag * 1.6, 0.0, 1.0);
  vec3 mono = uColor * mix(0.35, 1.2, cellSig);
  vec3 glyphColor = mix(mono, vivid, clamp(uColored, 0.0, 1.0));
  glyphColor = clamp(uBg + (glyphColor - uBg) * uBrightness, 0.0, 1.0);
  float cellLum = dot(vivid, lw);
  glyphColor = mix(
    glyphColor,
    uColor * max(uBrightness, 1.0) * (0.6 + cellLum),
    ring * clamp(uEdgeTint, 0.0, 1.0)
  );
  glyphColor = clamp(
    uBg + (glyphColor - uBg) * (1.0 + ring * uEdgeGlow * 1.6),
    0.0,
    1.0
  );

  vec3 base = mix(uBg, real, clamp(uPassthrough, 0.0, 1.0));
  vec3 encrypted = mix(base, glyphColor, mask);
  vec3 col = mix(encrypted, real, e);
  float alpha = mix(max(rC.a, mask), rC.a, e);
  outColor = vec4(col, alpha);
}`;
  var colorProbe = null;
  function parseColor(input) {
    if (typeof document === "undefined") return [0, 0, 0];
    if (!colorProbe) {
      const probe = document.createElement("canvas");
      probe.width = 1;
      probe.height = 1;
      colorProbe = probe.getContext("2d", { willReadFrequently: true });
    }
    if (!colorProbe) return [0, 0, 0];
    colorProbe.fillStyle = "#000000";
    colorProbe.fillStyle = input;
    colorProbe.clearRect(0, 0, 1, 1);
    colorProbe.fillRect(0, 0, 1, 1);
    const data = colorProbe.getImageData(0, 0, 1, 1).data;
    return [data[0] / 255, data[1] / 255, data[2] / 255];
  }
  function buildGlyphList(charset) {
    const seen = /* @__PURE__ */ new Set([" "]);
    const glyphs = [" "];
    for (const ch of charset) {
      if (glyphs.length >= MAX_GLYPHS2) break;
      if (ch === "\n" || ch === "\r" || ch === "	" || seen.has(ch)) continue;
      seen.add(ch);
      glyphs.push(ch);
    }
    return glyphs;
  }
  function glyphShapes(image, cols, cellW, cellH, count) {
    const vectors = new Float32Array(count * 6);
    const radius = cellH * 0.26;
    const padW = cellW + ATLAS_PAD * 2;
    const padH = cellH + ATLAS_PAD * 2;
    for (let g = 0; g < count; g++) {
      const originX = g % cols * padW + ATLAS_PAD;
      const originY = Math.floor(g / cols) * padH + ATLAS_PAD;
      for (let c = 0; c < 6; c++) {
        const cx = INNER_CIRCLES[c][0] * cellW;
        const cy = INNER_CIRCLES[c][1] * cellH;
        let sum = 0;
        let total = 0;
        for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
          for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            if (dx * dx + dy * dy > radius * radius) continue;
            total += 1;
            if (x < -ATLAS_PAD || y < -ATLAS_PAD || x >= cellW + ATLAS_PAD || y >= cellH + ATLAS_PAD)
              continue;
            sum += image.data[((originY + y) * image.width + originX + x) * 4 + 3];
          }
        }
        vectors[g * 6 + c] = total ? sum / (total * 255) : 0;
      }
    }
    for (let c = 0; c < 6; c++) {
      let peak = 0;
      for (let g = 0; g < count; g++) {
        peak = Math.max(peak, vectors[g * 6 + c]);
      }
      if (peak > 0) {
        for (let g = 0; g < count; g++) vectors[g * 6 + c] /= peak;
      }
    }
    return vectors;
  }
  function clampAspect(aspect) {
    return Math.min(Math.max(aspect || DEFAULTS2.aspect, 0.35), 1.25);
  }
  function supportsHtmlInCanvas2() {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    return Boolean(
      ctx && typeof ctx.drawElementImage === "function" && typeof probe.requestPaint === "function"
    );
  }
  function createDecryptReveal(elements, options = {}) {
    const config = { ...DEFAULTS2, ...options };
    const { source, content, output } = elements;
    const gl = output.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false
    });
    if (!gl || gl.isContextLost()) return null;
    const sourceCtx = source.getContext("2d");
    const paintable = source;
    const htmlInCanvas = Boolean(
      sourceCtx && typeof sourceCtx.drawElementImage === "function" && typeof paintable.requestPaint === "function"
    );
    let contentDirty = false;
    let cellsDirty = true;
    let wake = () => {
    };
    if (htmlInCanvas) {
      paintable.onpaint = () => {
        try {
          sourceCtx.reset();
          sourceCtx.drawElementImage(content, 0, 0);
          contentDirty = true;
          wake();
        } catch {
        }
      };
    }
    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(
          "DecryptReveal shader error:",
          gl.getShaderInfoLog(shader)
        );
      }
      return shader;
    }
    function link(frag) {
      const vs = compile(gl.VERTEX_SHADER, VERT2);
      const fs = compile(gl.FRAGMENT_SHADER, frag);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i);
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
      }
      return { program, vs, fs, uniforms };
    }
    const cellPass = link(CELL_FRAG);
    const mainPass = link(MAIN_FRAG);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function makeTexture(filter) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }
    const contentTexture = makeTexture(gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    const cellTexture = makeTexture(gl.NEAREST);
    const cellFbo = gl.createFramebuffer();
    let cellCols = 0;
    let cellRows = 0;
    const shapeTexture = makeTexture(gl.NEAREST);
    const atlasTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let glyphCount = 0;
    let atlasCols = 1;
    let atlasRows = 1;
    let atlasPad = [0, 0];
    let atlasInner = [1, 1];
    let builtCharset = "";
    let builtAspect = 0;
    function rebuildAtlas() {
      const aspect = clampAspect(config.aspect);
      if (builtCharset === config.charset && builtAspect === aspect) return;
      const glyphs = buildGlyphList(config.charset);
      const cellH = ATLAS_CELL;
      const cellW = Math.max(Math.round(cellH * aspect), 8);
      const padW = cellW + ATLAS_PAD * 2;
      const padH = cellH + ATLAS_PAD * 2;
      const cols = Math.ceil(Math.sqrt(glyphs.length));
      const rows = Math.ceil(glyphs.length / cols);
      const surface = document.createElement("canvas");
      surface.width = cols * padW;
      surface.height = rows * padH;
      const ctx = surface.getContext("2d");
      if (!ctx) return;
      builtCharset = config.charset;
      builtAspect = aspect;
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontPx = Math.floor(Math.min(cellH * 0.92, cellW / 0.58));
      ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      for (let g = 0; g < glyphs.length; g++) {
        ctx.fillText(
          glyphs[g],
          g % cols * padW + padW / 2,
          Math.floor(g / cols) * padH + padH / 2
        );
      }
      const image = ctx.getImageData(0, 0, surface.width, surface.height);
      const vectors = glyphShapes(image, cols, cellW, cellH, glyphs.length);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        surface
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R32F,
        6,
        glyphs.length,
        0,
        gl.RED,
        gl.FLOAT,
        vectors
      );
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      glyphCount = glyphs.length;
      atlasCols = cols;
      atlasRows = rows;
      atlasPad = [ATLAS_PAD / padW, ATLAS_PAD / padH];
      atlasInner = [cellW / padW, cellH / padH];
      cellsDirty = true;
    }
    let contentMaxX = 1;
    function cellSizePx(dpr) {
      const h = Math.min(Math.max(config.cell, 4), 40) * dpr;
      return [h * clampAspect(config.aspect), h];
    }
    function syncCanvasSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(output.clientWidth * dpr));
      const height = Math.max(1, Math.round(output.clientHeight * dpr));
      if (output.width !== width || output.height !== height) {
        output.width = width;
        output.height = height;
      }
      contentMaxX = Math.min(
        1,
        Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1))
      );
      if (htmlInCanvas) {
        const cssWidth = Math.max(1, Math.round(source.clientWidth));
        const cssHeight = Math.max(1, Math.round(source.clientHeight));
        if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
          source.width = cssWidth * dpr;
          source.height = cssHeight * dpr;
        }
        paintable.requestPaint();
      }
      cellsDirty = true;
    }
    function syncCellGrid() {
      const dpr = output.width / Math.max(output.clientWidth, 1);
      const [cw, ch] = cellSizePx(dpr);
      const cols = Math.max(Math.ceil(output.width / cw), 1);
      const rows = Math.max(Math.ceil(output.height / ch), 1);
      if (cols === cellCols && rows === cellRows) return;
      cellCols = cols;
      cellRows = rows;
      gl.bindTexture(gl.TEXTURE_2D, cellTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        cols,
        rows,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, cellFbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        cellTexture,
        0
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      cellsDirty = true;
    }
    const pointer = {
      x: -1e5,
      y: -1e5,
      tx: -1e5,
      ty: -1e5,
      active: 0,
      target: 0
    };
    let time = 0;
    let bgKey = "";
    let bg = [0, 0, 0];
    let colorKey = "";
    let fg = [0.29, 0.87, 0.5];
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    rebuildAtlas();
    syncCanvasSize();
    function uploadContent() {
      if (!htmlInCanvas || !contentDirty) return;
      contentDirty = false;
      cellsDirty = true;
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
    }
    function renderCells() {
      if (!cellsDirty) return;
      cellsDirty = false;
      const dpr = output.width / Math.max(output.clientWidth, 1);
      const [cw, ch] = cellSizePx(dpr);
      const u = cellPass.uniforms;
      gl.useProgram(cellPass.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.uniform1i(u.uContent, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
      gl.uniform1i(u.uShapes, 1);
      gl.uniform2f(u.uContentRes, output.width, output.height);
      gl.uniform2f(u.uCellPx, cw, ch);
      gl.uniform1i(u.uGlyphCount, glyphCount);
      gl.uniform1f(u.uContrast, Math.min(Math.max(config.contrast, 0.3), 3));
      gl.uniform1f(u.uExposure, Math.min(Math.max(config.exposure, 0.2), 3));
      gl.uniform1f(u.uThreshold, Math.max(config.threshold, 5e-3));
      gl.uniform3f(u.uBg, bg[0], bg[1], bg[2]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cellFbo);
      gl.viewport(0, 0, cellCols, cellRows);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    function render() {
      uploadContent();
      if (config.background !== bgKey) {
        bgKey = config.background;
        bg = parseColor(config.background);
        cellsDirty = true;
      }
      if (config.color !== colorKey) {
        colorKey = config.color;
        fg = parseColor(config.color);
      }
      rebuildAtlas();
      syncCellGrid();
      renderCells();
      const w = Math.max(output.clientWidth, 1);
      const h = Math.max(output.clientHeight, 1);
      const dpr = output.width / w;
      const [cw, ch] = cellSizePx(dpr);
      const u = mainPass.uniforms;
      gl.useProgram(mainPass.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.uniform1i(u.uContent, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cellTexture);
      gl.uniform1i(u.uCells, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.uniform1i(u.uAtlas, 2);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uDpr, dpr);
      gl.uniform2f(u.uCellPx, cw, ch);
      gl.uniform2f(u.uGrid, cellCols, cellRows);
      gl.uniform2f(u.uAtlasGrid, atlasCols, atlasRows);
      gl.uniform2f(u.uAtlasPad, atlasPad[0], atlasPad[1]);
      gl.uniform2f(u.uAtlasInner, atlasInner[0], atlasInner[1]);
      gl.uniform1i(u.uGlyphCount, glyphCount);
      gl.uniform2f(u.uPointer, pointer.x, pointer.y);
      gl.uniform1f(u.uActive, pointer.active);
      gl.uniform1f(u.uRadius, Math.max(config.radius, 1));
      gl.uniform1f(u.uSoftness, config.softness);
      gl.uniform1f(u.uColored, config.colored);
      gl.uniform3f(u.uColor, fg[0], fg[1], fg[2]);
      gl.uniform1f(u.uBrightness, Math.min(Math.max(config.brightness, 0.2), 3));
      gl.uniform1f(u.uLegibility, Math.min(Math.max(config.legibility, 0), 1));
      gl.uniform1f(u.uScramble, Math.min(Math.max(config.scramble, 0), 1));
      gl.uniform1f(
        u.uScrambleSpeed,
        Math.min(Math.max(config.scrambleSpeed, 0), 30)
      );
      gl.uniform1f(u.uEdgeWidth, config.edgeWidth);
      gl.uniform1f(u.uEdgeFlicker, Math.min(Math.max(config.edgeFlicker, 0), 1));
      gl.uniform1f(u.uEdgeGlow, Math.min(Math.max(config.edgeGlow, 0), 3));
      gl.uniform1f(u.uEdgeTint, config.edgeTint);
      gl.uniform1f(u.uAberration, Math.max(config.aberration, 0));
      gl.uniform1f(u.uPassthrough, config.passthrough);
      gl.uniform3f(u.uBg, bg[0], bg[1], bg[2]);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uMaxX, contentMaxX);
      gl.uniform1f(u.uCrisp, reducedMotion || !htmlInCanvas ? 1 : 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, output.width, output.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    let raf = 0;
    let lastTime = performance.now();
    let destroyed = false;
    let running = false;
    let visible = true;
    function frame(now) {
      if (destroyed) return;
      if (!visible) {
        running = false;
        return;
      }
      const delta = Math.min((now - lastTime) / 1e3, 1 / 30);
      lastTime = now;
      time += delta;
      const tau = Math.max(config.smoothing, 1e-4);
      const k = reducedMotion ? 1 : 1 - Math.exp(-delta / tau);
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;
      pointer.active += (pointer.target - pointer.active) * k;
      render();
      const settled = Math.abs(pointer.tx - pointer.x) < 0.1 && Math.abs(pointer.ty - pointer.y) < 0.1 && Math.abs(pointer.target - pointer.active) < 1e-3;
      const churning = config.scramble > 0 && config.scrambleSpeed > 0 || pointer.active > 1e-3 && config.edgeFlicker > 0;
      if (settled && !contentDirty && (reducedMotion || !htmlInCanvas || !churning)) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
        pointer.active = pointer.target;
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (destroyed || running || !visible) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
    wake = start;
    start();
    function onMotionChange() {
      reducedMotion = motionQuery.matches;
      start();
    }
    motionQuery.addEventListener("change", onMotionChange);
    const observer = new ResizeObserver(() => {
      syncCanvasSize();
      start();
    });
    observer.observe(output);
    observer.observe(content);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) start();
    });
    intersection.observe(output);
    const listenTarget = output.parentElement ?? output;
    function onPointerMove(event) {
      const rect = output.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (pointer.target === 0 && pointer.active < 1e-3) {
        pointer.x = x;
        pointer.y = y;
      }
      pointer.tx = x;
      pointer.ty = y;
      pointer.target = 1;
      start();
    }
    function onPointerLeave() {
      pointer.target = 0;
      start();
    }
    listenTarget.addEventListener("pointermove", onPointerMove);
    listenTarget.addEventListener("pointerleave", onPointerLeave);
    return {
      setOptions(next) {
        let changed = false;
        for (const [key, value] of Object.entries(next)) {
          if (typeof value === "function") continue;
          if (config[key] !== value) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          Object.assign(config, next);
          return;
        }
        const prev = {
          cell: config.cell,
          aspect: config.aspect,
          contrast: config.contrast,
          exposure: config.exposure,
          threshold: config.threshold
        };
        Object.assign(config, next);
        if (config.cell !== prev.cell || config.aspect !== prev.aspect || config.contrast !== prev.contrast || config.exposure !== prev.exposure || config.threshold !== prev.threshold) {
          cellsDirty = true;
        }
        start();
      },
      resize() {
        syncCanvasSize();
        start();
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        intersection.disconnect();
        motionQuery.removeEventListener("change", onMotionChange);
        listenTarget.removeEventListener("pointermove", onPointerMove);
        listenTarget.removeEventListener("pointerleave", onPointerLeave);
        gl.deleteTexture(contentTexture);
        gl.deleteTexture(cellTexture);
        gl.deleteTexture(shapeTexture);
        gl.deleteTexture(atlasTexture);
        gl.deleteFramebuffer(cellFbo);
        gl.deleteProgram(cellPass.program);
        gl.deleteShader(cellPass.vs);
        gl.deleteShader(cellPass.fs);
        gl.deleteProgram(mainPass.program);
        gl.deleteShader(mainPass.vs);
        gl.deleteShader(mainPass.fs);
        gl.deleteBuffer(quad);
        if (htmlInCanvas) paintable.onpaint = null;
      }
    };
  }

  // components/canvasui/GlitchVanilla.ts
  var DEFAULTS3 = {
    intensity: 1,
    interval: 3,
    duration: 0.4,
    slices: 24,
    shift: 30,
    rgbShift: 4,
    blocks: 0.5,
    noise: 0.35
  };
  var VERT3 = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
  var FRAG2 = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uSeed;
uniform float uAmp;
uniform float uSlices;
uniform float uShift;
uniform float uRgbShift;
uniform float uBlocks;
uniform float uNoise;
uniform float uMaxX;

float hash12 (vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec4 page (vec2 p) {
  p.x = clamp(p.x, 0.0005, uMaxX - 0.0005);
  p.y = clamp(p.y, 0.0005, 0.9995);
  return texture(uContent, vec2(p.x, 1.0 - p.y));
}

void main () {
  vec2 uv = vUv;
  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  float e = uAmp;
  vec2 guv = uv;

  if (e > 0.001) {
    float band = floor(uv.y * uSlices);
    float pick = hash12(vec2(band, uSeed));
    float tear = step(1.0 - 0.3 * min(e, 1.0), pick);
    float dir = hash12(vec2(band, uSeed + 13.0)) * 2.0 - 1.0;
    guv.x += tear * dir * e * uShift / uResolution.x;

    float sub = floor(uv.y * uSlices * 7.0);
    float micro = hash12(vec2(sub, uSeed + 29.0));
    guv.x += (micro - 0.5) * e * uNoise * 3.0 / uResolution.x;

    vec2 cell = floor(guv * vec2(10.0, uSlices * 0.5));
    float br = hash12(cell + uSeed * 0.0173);
    if (br > 1.0 - 0.14 * uBlocks * min(e, 1.0)) {
      vec2 jump = vec2(
        hash12(cell + uSeed + 3.1) - 0.5,
        hash12(cell + uSeed + 7.7) - 0.5
      );
      guv += jump * vec2(0.08, 0.02) * e;
    }
  }

  float split = uRgbShift * e / uResolution.x;
  vec4 c = page(guv);
  float r = page(guv + vec2(split, 0.0)).r;
  float b = page(guv - vec2(split, 0.0)).b;
  vec4 col = vec4(r, c.g, b, c.a);

  if (e > 0.001 && uNoise > 0.001) {
    float grain = hash12(vUv * uResolution + uSeed * 5.3) - 0.5;
    float row = floor(vUv.y * uResolution.y);
    float flicker = hash12(vec2(row, uSeed + 41.0));
    float lines = step(0.985 - 0.01 * uNoise * e, flicker);
    col.rgb += (grain * 0.22 + lines * 0.35) * uNoise * min(e, 1.0) * col.a;
  }

  outColor = vec4(clamp(col.rgb, 0.0, 1.0) * col.a, col.a);
}`;
  function supportsHtmlInCanvas3() {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    return Boolean(
      ctx && typeof ctx.drawElementImage === "function" && typeof probe.requestPaint === "function"
    );
  }
  function createGlitch(elements, options = {}) {
    const config = { ...DEFAULTS3, ...options };
    const { source, content, output } = elements;
    const gl = output.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: true
    });
    if (!gl || gl.isContextLost()) return null;
    const sourceCtx = source.getContext("2d");
    const paintable = source;
    const htmlInCanvas = Boolean(
      sourceCtx && typeof sourceCtx.drawElementImage === "function" && typeof paintable.requestPaint === "function"
    );
    let contentDirty = false;
    let wake = () => {
    };
    if (htmlInCanvas) {
      paintable.onpaint = () => {
        try {
          sourceCtx.reset();
          sourceCtx.drawElementImage(content, 0, 0);
          contentDirty = true;
          wake();
        } catch {
        }
      };
    }
    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Glitch shader error:", gl.getShaderInfoLog(shader));
      }
      return shader;
    }
    const vertexShader = compile(gl.VERTEX_SHADER, VERT3);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG2);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const contentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    let contentMaxX = 1;
    function syncCanvasSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(output.clientWidth * dpr));
      const height = Math.max(1, Math.round(output.clientHeight * dpr));
      if (output.width !== width || output.height !== height) {
        output.width = width;
        output.height = height;
      }
      contentMaxX = Math.min(
        1,
        Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1))
      );
      if (htmlInCanvas) {
        const cssWidth = Math.max(1, Math.round(source.clientWidth));
        const cssHeight = Math.max(1, Math.round(source.clientHeight));
        if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
          source.width = cssWidth * dpr;
          source.height = cssHeight * dpr;
        }
        paintable.requestPaint();
      }
    }
    syncCanvasSize();
    function uploadContent() {
      if (!htmlInCanvas || !contentDirty) return;
      contentDirty = false;
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
    }
    let time = 0;
    let burstAt = 0.6;
    let burstSeed = 1;
    let envelope = 0;
    function advanceTimeline(delta) {
      time += delta;
      if (config.interval <= 0) {
        envelope = 1;
        return;
      }
      const sinceBurst = time - burstAt;
      const duration = Math.max(config.duration, 0.05);
      if (sinceBurst >= 0 && sinceBurst < duration) {
        const tail = 1 - Math.pow(sinceBurst / duration, 2);
        envelope = tail * (0.7 + 0.3 * hash(burstSeed + Math.floor(time * 24)));
      } else {
        envelope = 0;
        if (sinceBurst >= duration) {
          burstAt = time + Math.max(config.interval, 0.3) * (0.75 + 0.5 * Math.random());
          burstSeed = Math.floor(Math.random() * 1e3);
        }
      }
    }
    function hash(n) {
      const s = Math.sin(n * 127.1) * 43758.5453;
      return s - Math.floor(s);
    }
    function render() {
      uploadContent();
      const dpr = output.width / Math.max(output.clientWidth, 1);
      const amp = envelope * Math.max(config.intensity, 0);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.uniform1i(uniforms.uContent, 0);
      gl.uniform2f(uniforms.uResolution, output.width, output.height);
      gl.uniform1f(uniforms.uSeed, Math.floor(time * 24) + burstSeed);
      gl.uniform1f(uniforms.uAmp, amp);
      gl.uniform1f(uniforms.uSlices, Math.max(config.slices, 3));
      gl.uniform1f(uniforms.uShift, Math.max(config.shift, 0) * dpr);
      gl.uniform1f(uniforms.uRgbShift, Math.max(config.rgbShift, 0) * dpr);
      gl.uniform1f(uniforms.uBlocks, Math.min(Math.max(config.blocks, 0), 1));
      gl.uniform1f(uniforms.uNoise, Math.min(Math.max(config.noise, 0), 1));
      gl.uniform1f(uniforms.uMaxX, contentMaxX);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, output.width, output.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    let raf = 0;
    let lastTime = performance.now();
    let destroyed = false;
    let running = false;
    let visible = true;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    function frame(now) {
      if (destroyed) return;
      if (!visible) {
        running = false;
        return;
      }
      const delta = Math.min(Math.max((now - lastTime) / 1e3, 0), 1 / 30);
      lastTime = now;
      const wasActive = envelope > 0;
      if (!reducedMotion) advanceTimeline(delta);
      else envelope = 0;
      if (envelope > 0 || wasActive || contentDirty) render();
      if (reducedMotion && !contentDirty) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (destroyed || running || !visible) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
    wake = start;
    start();
    function onMotionChange() {
      reducedMotion = motionQuery.matches;
      start();
    }
    motionQuery.addEventListener("change", onMotionChange);
    const observer = new ResizeObserver(() => {
      syncCanvasSize();
      start();
    });
    observer.observe(output);
    observer.observe(content);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) start();
    });
    intersection.observe(output);
    return {
      setOptions(next) {
        if (!Object.entries(next).some(
          ([key, value]) => config[key] !== value
        ))
          return;
        Object.assign(config, next);
        start();
      },
      burst() {
        burstAt = time;
        burstSeed = Math.floor(Math.random() * 1e3);
        start();
      },
      resize() {
        syncCanvasSize();
        start();
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        intersection.disconnect();
        motionQuery.removeEventListener("change", onMotionChange);
        gl.deleteTexture(contentTexture);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(quad);
        if (htmlInCanvas) paintable.onpaint = null;
      }
    };
  }

  // components/canvasui/VHSVanilla.ts
  var DEFAULTS4 = {
    speed: 0.5,
    wave: 1,
    jitter: 0.25,
    crease: 0.1,
    switching: 0.05,
    switchingHeight: 0.02,
    bloom: 0.4,
    aberration: 2,
    acBeat: 1,
    grain: 0.1,
    scanlines: 0.1,
    vignette: 0,
    barrel: 0,
    saturation: 1,
    exposure: 1
  };
  var VERT4 = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
  var FRAG3 = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uTime;
uniform float uWave;
uniform float uJitter;
uniform float uCrease;
uniform float uSwitching;
uniform float uSwitchHeight;
uniform float uBloom;
uniform float uAberration;
uniform float uAcBeat;
uniform float uGrain;
uniform float uScanlines;
uniform float uVignette;
uniform float uSaturation;
uniform float uExposure;
uniform float uBarrel;
uniform vec3 uBezel;
uniform float uCreaseNoise;
uniform float uMaxX;

#define PI 3.14159265

float hash (vec2 v) {
  return fract(sin(dot(v, vec2(89.44, 19.36))) * 22189.22);
}

float iHash (vec2 v, vec2 r) {
  float h00 = hash(floor(v * r + vec2(0.0, 0.0)) / r);
  float h10 = hash(floor(v * r + vec2(1.0, 0.0)) / r);
  float h01 = hash(floor(v * r + vec2(0.0, 1.0)) / r);
  float h11 = hash(floor(v * r + vec2(1.0, 1.0)) / r);
  vec2 ip = smoothstep(vec2(0.0), vec2(1.0), mod(v * r, 1.0));
  return (h00 * (1.0 - ip.x) + h10 * ip.x) * (1.0 - ip.y)
    + (h01 * (1.0 - ip.x) + h11 * ip.x) * ip.y;
}

float noise (vec2 v) {
  float sum = 0.0;
  float s = 2.0;
  for (int i = 1; i < 7; i++) {
    sum += iHash(v + vec2(i), vec2(2.0 * s)) / s;
    s *= 2.0;
  }
  return sum;
}

vec4 tape (vec2 p) {
  p.x = clamp(p.x, 0.0005, uMaxX - 0.0005);
  p.y = clamp(p.y, 0.0005, 0.9995);
  return texture(uContent, vec2(p.x, 1.0 - p.y));
}

void main () {
  vec2 uv = vUv;
  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  float edgeMask = 1.0;
  if (uBarrel > 0.0) {
    vec2 c = vec2(uv.x / uMaxX, uv.y) * 2.0 - 1.0;
    c *= 1.0 + uBarrel * 0.15 * dot(c, c);
    float m = max(abs(c.x), abs(c.y));
    edgeMask = 1.0 - smoothstep(1.0 - 0.12 * uBarrel, 1.0, m);
    if (edgeMask <= 0.0) {
      outColor = vec4(uBezel, 1.0);
      return;
    }
    uv = vec2((c.x * 0.5 + 0.5) * uMaxX, c.y * 0.5 + 0.5);
  }

  vec2 uvn = uv;
  float t = uTime;

  float lineNoise = 0.0;
  if (uJitter + uCrease + uSwitching > 0.0) {
    lineNoise = noise(vec2(uvn.y * 100.0, t * 10.0));
  }

  if (uWave > 0.0) {
    uvn.x += (noise(vec2(uvn.y, t)) - 0.5) * 0.005 * uWave;
  }
  uvn.x += (lineNoise - 0.5) * 0.01 * uJitter;

  float tcPhase = clamp(
    (sin(uvn.y * 8.0 - t * PI * 1.2) - 0.92) * uCreaseNoise,
    0.0, 0.01
  ) * 10.0 * uCrease;
  float tcNoise = max(lineNoise - 0.5, 0.0);
  uvn.x -= tcNoise * tcPhase;

  float snPhase = smoothstep(max(uSwitchHeight, 1e-4), 0.0, uvn.y) * uSwitching;
  uvn.y += snPhase * 0.3;
  uvn.x += snPhase * ((lineNoise - 0.5) * 0.2);

  vec4 base = tape(uvn);
  vec3 col = base.rgb;
  col *= 1.0 - tcPhase;

  col = mix(col, col.yzx, clamp(snPhase, 0.0, 1.0));

  if (uBloom > 0.0) {
    float px = uAberration / max(uResolution.x, 1.0);
    vec3 bloomSum = vec3(0.0);
    for (int i = -8; i <= 2; i++) {
      vec3 s = tape(uvn + vec2(float(i) * px, 0.0)).rgb;
      if (i >= -4) bloomSum.r += s.r;
      if (i >= -6 && i <= 0) bloomSum.g += s.g;
      if (i <= -2) bloomSum.b += s.b;
    }
    bloomSum *= 0.1;

    col = mix(col, (col + bloomSum) / 1.7, clamp(uBloom, 0.0, 1.0));
  }

  if (uAcBeat > 0.0) {
    col *= 1.0 + clamp(
      noise(vec2(0.0, uv.y + t * 0.2)) * 0.6 - 0.25, 0.0, 0.1
    ) * uAcBeat;
  }

  float g = hash(uv * uResolution + fract(t) * vec2(127.1, 311.7)) - 0.5;
  col += g * uGrain;

  float scan = sin(uv.y * uResolution.y * PI) * 0.5;
  col *= 1.0 - uScanlines * 0.35 * scan;

  vec2 vd = (uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  col *= 1.0 - uVignette * smoothstep(0.4, 1.1, length(vd));

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, clamp(uSaturation, 0.0, 2.0));

  col *= uExposure;

  float alpha = max(base.a, clamp(snPhase + tcPhase, 0.0, 1.0));

  if (uBarrel > 0.0) {
    col = mix(uBezel, col, edgeMask);
    alpha = 1.0;
  }
  outColor = vec4(col, alpha);
}`;
  function supportsHtmlInCanvas4() {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    return Boolean(
      ctx && typeof ctx.drawElementImage === "function" && typeof probe.requestPaint === "function"
    );
  }
  function createVHS(elements, options = {}) {
    const config = { ...DEFAULTS4, ...options };
    const { source, content, output } = elements;
    const gl = output.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false
    });
    if (!gl || gl.isContextLost()) return null;
    const sourceCtx = source.getContext("2d");
    const paintable = source;
    const htmlInCanvas = Boolean(
      sourceCtx && typeof sourceCtx.drawElementImage === "function" && typeof paintable.requestPaint === "function"
    );
    let contentDirty = false;
    let wake = () => {
    };
    if (htmlInCanvas) {
      paintable.onpaint = () => {
        try {
          sourceCtx.reset();
          sourceCtx.drawElementImage(content, 0, 0);
          contentDirty = true;
          wake();
        } catch {
        }
      };
    }
    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("VHS shader error:", gl.getShaderInfoLog(shader));
      }
      return shader;
    }
    const vertexShader = compile(gl.VERTEX_SHADER, VERT4);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG3);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const contentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    let contentMaxX = 1;
    let bezel = [0, 0, 0];
    const bezelProbe = document.createElement("canvas");
    bezelProbe.width = bezelProbe.height = 1;
    const bezelCtx = bezelProbe.getContext("2d", { willReadFrequently: true });
    function syncBezelColor() {
      if (!bezelCtx) return;
      let el = content;
      while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "transparent") {
          bezelCtx.clearRect(0, 0, 1, 1);
          bezelCtx.fillStyle = bg;
          bezelCtx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = bezelCtx.getImageData(0, 0, 1, 1).data;
          if (a > 0) {
            bezel = [r / 255, g / 255, b / 255];
            return;
          }
        }
        el = el.parentElement;
      }
      bezel = [0, 0, 0];
    }
    function syncCanvasSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(output.clientWidth * dpr));
      const height = Math.max(1, Math.round(output.clientHeight * dpr));
      if (output.width !== width || output.height !== height) {
        output.width = width;
        output.height = height;
      }
      contentMaxX = Math.min(
        1,
        Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1))
      );
      if (htmlInCanvas) {
        const cssWidth = Math.max(1, Math.round(source.clientWidth));
        const cssHeight = Math.max(1, Math.round(source.clientHeight));
        if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
          source.width = cssWidth * dpr;
          source.height = cssHeight * dpr;
        }
        paintable.requestPaint();
      }
    }
    syncCanvasSize();
    syncBezelColor();
    function uploadContent() {
      if (!htmlInCanvas || !contentDirty) return;
      contentDirty = false;
      syncBezelColor();
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
    }
    let time = 0;
    const fract = (x) => x - Math.floor(x);
    const hash2 = (x, y) => fract(Math.sin(x * 89.44 + y * 19.36) * 22189.22);
    const smooth01 = (x) => x * x * (3 - 2 * x);
    function iHashCpu(vx, vy, r) {
      const fx = Math.floor(vx * r);
      const fy = Math.floor(vy * r);
      const h00 = hash2(fx / r, fy / r);
      const h10 = hash2((fx + 1) / r, fy / r);
      const h01 = hash2(fx / r, (fy + 1) / r);
      const h11 = hash2((fx + 1) / r, (fy + 1) / r);
      const ix = smooth01(fract(vx * r));
      const iy = smooth01(fract(vy * r));
      return (h00 * (1 - ix) + h10 * ix) * (1 - iy) + (h01 * (1 - ix) + h11 * ix) * iy;
    }
    function noiseCpu(vx, vy) {
      let sum = 0;
      let s = 2;
      for (let i = 1; i < 7; i++) {
        sum += iHashCpu(vx + i, vy + i, 2 * s) / s;
        s *= 2;
      }
      return sum;
    }
    function render() {
      uploadContent();
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.uniform1i(uniforms.uContent, 0);
      gl.uniform2f(uniforms.uResolution, output.width, output.height);
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform1f(uniforms.uWave, Math.max(config.wave, 0));
      gl.uniform1f(uniforms.uJitter, Math.max(config.jitter, 0));
      gl.uniform1f(uniforms.uCrease, Math.max(config.crease, 0));
      gl.uniform1f(uniforms.uSwitching, Math.max(config.switching, 0));
      gl.uniform1f(uniforms.uSwitchHeight, Math.max(config.switchingHeight, 0));
      gl.uniform1f(uniforms.uBloom, config.bloom);
      const dpr = output.width / Math.max(output.clientWidth, 1);
      gl.uniform1f(uniforms.uAberration, Math.max(config.aberration, 0) * dpr);
      gl.uniform1f(uniforms.uAcBeat, Math.max(config.acBeat, 0));
      gl.uniform1f(uniforms.uGrain, Math.max(config.grain, 0));
      gl.uniform1f(uniforms.uScanlines, Math.max(config.scanlines, 0));
      gl.uniform1f(uniforms.uVignette, Math.max(config.vignette, 0));
      gl.uniform1f(uniforms.uBarrel, Math.max(config.barrel, 0));
      gl.uniform3f(uniforms.uBezel, bezel[0], bezel[1], bezel[2]);
      gl.uniform1f(uniforms.uCreaseNoise, noiseCpu(time, time));
      gl.uniform1f(uniforms.uSaturation, config.saturation);
      gl.uniform1f(uniforms.uExposure, Math.max(config.exposure, 0));
      gl.uniform1f(uniforms.uMaxX, contentMaxX);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, output.width, output.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    let raf = 0;
    let lastTime = performance.now();
    let destroyed = false;
    let running = false;
    let visible = true;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    function frame(now) {
      if (destroyed) return;
      if (!visible) {
        running = false;
        return;
      }
      const delta = Math.min((now - lastTime) / 1e3, 1 / 30);
      lastTime = now;
      if (!reducedMotion) time += delta * config.speed;
      render();
      if (reducedMotion && !contentDirty) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (destroyed || running || !visible) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
    wake = start;
    start();
    function onMotionChange() {
      reducedMotion = motionQuery.matches;
      start();
    }
    motionQuery.addEventListener("change", onMotionChange);
    const observer = new ResizeObserver(() => {
      syncCanvasSize();
      start();
    });
    observer.observe(output);
    observer.observe(content);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) start();
    });
    intersection.observe(output);
    return {
      setOptions(next) {
        if (!Object.entries(next).some(
          ([key, value]) => config[key] !== value
        ))
          return;
        Object.assign(config, next);
        start();
      },
      resize() {
        syncCanvasSize();
        start();
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        intersection.disconnect();
        motionQuery.removeEventListener("change", onMotionChange);
        gl.deleteTexture(contentTexture);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(quad);
        if (htmlInCanvas) paintable.onpaint = null;
      }
    };
  }
  return __toCommonJS(canvasui_fx_entry_exports);
})();
