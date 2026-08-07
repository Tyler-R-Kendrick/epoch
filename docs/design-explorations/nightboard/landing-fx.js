/**
 * Landing Canvas UI orchestration (ES module).
 *
 * Hosts (no nested html-in-canvas):
 *   [data-fx="decrypt"]  — hero brand + E01 What body (cipher → reveal)
 *   [data-fx="glitch"]   — hero copy + promote theater
 *   [data-fx="asciify"]  — optional chapter lens (when hosted)
 *   [data-fx="vhs"]      — board preview plate
 *
 * Terminal typewriter runs always (no Canvas UI / flag required).
 * Html-in-canvas effects fail soft when unsupported.
 */

function bootLandingFx() {
  var body = document.body;
  if (!body || !body.hasAttribute("data-landing")) return;

  var reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch {
    reduce = false;
  }

  var CSS = [
    "[data-fx]{position:relative;isolation:isolate}",
    "[data-fx][data-fx-on]{min-height:0}",
    "[data-fx][data-fx-on] .nb-fx-source{display:block;width:100%;height:100%;max-width:100%}",
    "[data-fx][data-fx-on] .nb-fx-output{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4}",
    "[data-term-slot]{min-height:1.15em}",
    ".nb-term-cursor{display:inline-block;width:.55ch;margin-left:.08ch;height:1em;background:var(--nb-agent,#40f0ff);animation:nb-term-blink 1.05s steps(1) infinite;vertical-align:-.05em}",
    "[data-term-flash]{animation:nb-term-flash .42s steps(2) both}",
    "@keyframes nb-term-blink{50%{opacity:0}}",
    "@keyframes nb-term-flash{0%{opacity:.35;filter:brightness(1.4)}100%{opacity:1;filter:none}}",
    "@media (prefers-reduced-motion:reduce){.nb-term-cursor{animation:none;opacity:.65}[data-term-flash]{animation:none}}",
    "body[data-canvasui='fallback'] [data-fx]{/* native DOM stays readable */}",
  ].join("");

  function injectCss() {
    if (document.getElementById("nb-landing-fx-css")) return;
    var el = document.createElement("style");
    el.id = "nb-landing-fx-css";
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function htmlOk(api, key) {
    if (!api || typeof api[key] !== "function") return false;
    try {
      return !!api[key]();
    } catch {
      return false;
    }
  }

  function mountTrio(host) {
    var content = host.querySelector("[data-fx-content]") || host.firstElementChild;
    if (!content) return null;
    if (host.getAttribute("data-fx-on") === "1") {
      return {
        host: host,
        source: host.querySelector(".nb-fx-source"),
        content: content,
        output: host.querySelector(".nb-fx-output"),
      };
    }
    var source = document.createElement("canvas");
    source.setAttribute("layoutsubtree", "");
    source.className = "nb-fx-source";
    var output = document.createElement("canvas");
    output.className = "nb-fx-output";
    output.setAttribute("aria-hidden", "true");
    host.insertBefore(source, content);
    source.appendChild(content);
    host.appendChild(output);
    host.setAttribute("data-fx-on", "1");
    return { host: host, source: source, content: content, output: output };
  }

  function sizeTrio(nodes) {
    if (!nodes || !nodes.host) return;
    var r = nodes.host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    [nodes.source, nodes.output].forEach(function (c) {
      if (!c) return;
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    });
  }

  /* ── Terminal typewriter ────────────────────────────────────────────── */

  function typewrite(el, text, cps) {
    if (!el) return;
    var full = text == null ? el.getAttribute("data-term") || "" : text;
    if (!full) {
      full = el.textContent || "";
      el.setAttribute("data-term", full);
    }
    el.setAttribute("data-term-done", "0");
    if (reduce) {
      el.textContent = full;
      el.setAttribute("data-term-done", "1");
      return;
    }
    el.textContent = "";
    var i = 0;
    var cursor = document.createElement("span");
    cursor.className = "nb-term-cursor";
    cursor.setAttribute("aria-hidden", "true");
    el.appendChild(cursor);
    var speed = cps || 48;
    var timer = window.setInterval(function () {
      if (i >= full.length) {
        window.clearInterval(timer);
        el.textContent = full;
        el.setAttribute("data-term-done", "1");
        return;
      }
      el.insertBefore(document.createTextNode(full.charAt(i)), cursor);
      i += 1;
    }, Math.max(10, Math.round(1000 / speed)));
  }

  /**
   * Hero title: three lines, each typed character-by-character with a flashing
   * underscore cursor before advancing to the next line.
   */
  function typeHeadline() {
    var h1 = document.querySelector("[data-headline-type]");
    if (!h1) return;
    var lines = Array.prototype.slice.call(h1.querySelectorAll("[data-type-line]"));
    if (!lines.length) return;
    var cancelled = false;

    function fillAll() {
      cancelled = true;
      lines.forEach(function (line) {
        line.textContent = line.getAttribute("data-type-line") || "";
      });
      var old = h1.querySelector(".nb-headline-cursor");
      if (old) old.remove();
      var cursor = document.createElement("span");
      cursor.className = "nb-headline-cursor";
      cursor.setAttribute("aria-hidden", "true");
      cursor.textContent = "_";
      if (lines.length) lines[lines.length - 1].appendChild(cursor);
      h1.setAttribute("data-headline-done", "1");
    }

    if (reduce) {
      fillAll();
      return;
    }

    h1.setAttribute("data-headline-done", "0");
    lines.forEach(function (line) { line.textContent = ""; });

    var cursor = document.createElement("span");
    cursor.className = "nb-headline-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.textContent = "_";

    var lineIndex = 0;
    var charIndex = 0;
    var cps = Number(h1.getAttribute("data-headline-cps")) || 36;
    var gapMs = Number(h1.getAttribute("data-headline-gap")) || 280;
    var tickMs = Math.max(28, Math.round(1000 / cps));

    function placeCursor(line) {
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      line.appendChild(cursor);
    }

    function finish() {
      if (cancelled) return;
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      /* Leave a blinking cursor at the end of the last line. */
      if (lines.length) {
        lines[lines.length - 1].appendChild(cursor);
      }
      h1.setAttribute("data-headline-done", "1");
    }

    function typeNext() {
      if (cancelled) return;
      if (lineIndex >= lines.length) {
        finish();
        return;
      }
      var line = lines[lineIndex];
      var full = line.getAttribute("data-type-line") || "";
      placeCursor(line);
      if (charIndex >= full.length) {
        lineIndex += 1;
        charIndex = 0;
        window.setTimeout(typeNext, gapMs);
        return;
      }
      line.insertBefore(document.createTextNode(full.charAt(charIndex)), cursor);
      charIndex += 1;
      window.setTimeout(typeNext, tickMs);
    }

    var skip = document.querySelector("[data-skip-intro]");
    if (skip) {
      skip.addEventListener("click", function () {
        if (h1.getAttribute("data-headline-done") !== "1") fillAll();
      }, { once: true });
    }

    typeNext();
  }

  function wireTerminalBoot() {
    typeHeadline();
    document.querySelectorAll("[data-term-boot]").forEach(function (el) {
      if (!el.getAttribute("data-term")) {
        el.setAttribute("data-term", el.textContent || "");
      }
      typewrite(el, el.getAttribute("data-term"), Number(el.getAttribute("data-term-cps")) || 52);
    });
  }

  function retypeActiveChapter() {
    var panel = document.querySelector(".nb-ride-chapter[data-active='1']");
    if (!panel) return;
    panel.querySelectorAll("[data-term-replay]").forEach(function (el) {
      /* Skip rich markup titles (case codes); flash instead of flattening HTML. */
      if (el.children.length && !el.getAttribute("data-term")) {
        el.setAttribute("data-term-flash", "1");
        window.setTimeout(function () {
          el.removeAttribute("data-term-flash");
        }, 420);
        return;
      }
      if (!el.getAttribute("data-term")) {
        el.setAttribute("data-term", el.textContent || "");
      }
      typewrite(el, el.getAttribute("data-term"), Number(el.getAttribute("data-term-cps")) || 58);
    });
  }

  /* ── Effect mounts ──────────────────────────────────────────────────── */

  var instances = [];
  var glitchInst = null;
  var glitchInsts = [];
  var decryptByRole = {};
  var vhsInst = null;
  var modes = [];
  var whatRevealTimer = 0;

  function track(inst) {
    if (inst) instances.push(inst);
    return inst;
  }

  /**
   * Mount a Canvas UI effect on every matching host (glitch can appear on
   * hero + theater). Returns instances that successfully started.
   */
  function startFxHosts(selector, kind, factory) {
    var hosts = Array.prototype.slice.call(document.querySelectorAll(selector));
    var started = [];
    hosts.forEach(function (host) {
      var nodes = mountTrio(host);
      if (!nodes) return;
      sizeTrio(nodes);
      var inst = factory(nodes, host);
      if (!inst) {
        try {
          host.insertBefore(nodes.content, nodes.source);
          if (nodes.source.parentNode) nodes.source.parentNode.removeChild(nodes.source);
          if (nodes.output.parentNode) nodes.output.parentNode.removeChild(nodes.output);
          host.removeAttribute("data-fx-on");
        } catch {
          /* ignore */
        }
        return;
      }
      host.setAttribute("data-fx-kind", kind);
      if (modes.indexOf(kind) === -1) modes.push(kind);
      track(inst);
      started.push({ nodes: nodes, inst: inst, host: host });
    });
    return started;
  }

  function startFxHost(selector, kind, factory) {
    var started = startFxHosts(selector, kind, function (nodes) {
      return factory(nodes);
    });
    return started[0] || null;
  }

  function glitchOptionsFromHost(host) {
    function num(name, fallback) {
      var raw = host.getAttribute(name);
      if (raw == null || raw === "") return fallback;
      var n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    }
    return {
      intensity: num("data-glitch-intensity", 0.8),
      interval: num("data-glitch-interval", 3.2),
      duration: num("data-glitch-duration", 0.32),
      slices: num("data-glitch-slices", 20),
      shift: num("data-glitch-shift", 18),
      rgbShift: num("data-glitch-rgb", 3.5),
      blocks: num("data-glitch-blocks", 0.35),
      noise: num("data-glitch-noise", 0.28),
    };
  }

  function decryptOptionsFromHost(host) {
    function num(name, fallback) {
      var raw = host.getAttribute(name);
      if (raw == null || raw === "") return fallback;
      var n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    }
    var role = host.getAttribute("data-decrypt-role") || "default";
    var base = role === "what"
      ? {
        radius: 220,
        softness: 0.55,
        cell: 8,
        color: "#40f0ff",
        colored: 0.85,
        passthrough: 0.04,
        scramble: 0.42,
        scrambleSpeed: 13,
        edgeGlow: 2.4,
        edgeTint: 0.8,
        aberration: 4,
        background: "#03050a",
        smoothing: 0.12,
      }
      : {
        radius: 480,
        softness: 0.52,
        cell: 9,
        color: "#40f0ff",
        colored: 0.9,
        passthrough: 0.1,
        scramble: 0.24,
        scrambleSpeed: 11,
        edgeGlow: 2.1,
        edgeTint: 0.75,
        aberration: 5,
        background: "#03050a",
        smoothing: 0.14,
      };
    return Object.assign(base, {
      radius: num("data-decrypt-radius", base.radius),
      passthrough: num("data-decrypt-passthrough", base.passthrough),
      scramble: num("data-decrypt-scramble", base.scramble),
      cell: num("data-decrypt-cell", base.cell),
      scrambleSpeed: num("data-decrypt-speed", base.scrambleSpeed),
    });
  }

  function startPageEffects() {
    var api = window.NB_CanvasUI;
    if (!api || reduce) {
      body.setAttribute("data-canvasui", reduce ? "reduced" : "missing");
      return;
    }

    if (htmlOk(api, "decryptSupported") && typeof api.createDecryptReveal === "function") {
      var decrypts = startFxHosts('[data-fx="decrypt"]', "decrypt", function (nodes, host) {
        return api.createDecryptReveal(nodes, decryptOptionsFromHost(host));
      });
      decryptByRole = {};
      decrypts.forEach(function (d) {
        var role = d.host.getAttribute("data-decrypt-role") || "default";
        decryptByRole[role] = d.inst;
      });

      /* Hero brand settles toward readable after first paint. */
      if (decryptByRole.hero) {
        window.setTimeout(function () {
          if (decryptByRole.hero && decryptByRole.hero.setOptions) {
            decryptByRole.hero.setOptions({ passthrough: 0.68, scramble: 0.05, radius: 820 });
          }
        }, 1200);
      }
    }

    if (htmlOk(api, "asciifySupported") && typeof api.createAsciify === "function") {
      startFxHost('[data-fx="asciify"]', "asciify", function (nodes) {
        return api.createAsciify(nodes, {
          charset: "blocks",
          radius: 0.22,
          softness: 0.55,
          scale: 2,
          strength: 0.9,
          baseStrength: 0,
          followSpeed: 8,
          glow: 0.5,
          aberration: 0.35,
          background: [3 / 255, 5 / 255, 10 / 255],
          backgroundOpacity: 1,
        });
      });
    }

    if (htmlOk(api, "glitchSupported") && typeof api.createGlitch === "function") {
      var glitches = startFxHosts('[data-fx="glitch"]', "glitch", function (nodes, host) {
        return api.createGlitch(nodes, glitchOptionsFromHost(host));
      });
      glitchInsts = glitches.map(function (g) { return g.inst; });
      glitchInst = glitchInsts[0] || null;
    }

    if (htmlOk(api, "vhsSupported") && typeof api.createVHS === "function") {
      var v = startFxHost('[data-fx="vhs"]', "vhs", function (nodes) {
        return api.createVHS(nodes, {
          speed: 0.4,
          wave: 0.5,
          jitter: 0.16,
          crease: 0.07,
          switching: 0.05,
          bloom: 0.3,
          aberration: 1.4,
          grain: 0.14,
          scanlines: 0.16,
          vignette: 0.22,
          barrel: 0.1,
          saturation: 0.94,
          exposure: 1.02,
        });
      });
      if (v) vhsInst = v.inst;
    }

    body.setAttribute("data-canvasui", modes.length ? modes.join("+") : "fallback");

    window.addEventListener("resize", function () {
      instances.forEach(function (inst) {
        if (inst && inst.resize) {
          try {
            inst.resize();
          } catch {
            /* ignore */
          }
        }
      });
      document.querySelectorAll("[data-fx][data-fx-on]").forEach(function (host) {
        var source = host.querySelector(".nb-fx-source");
        var output = host.querySelector(".nb-fx-output");
        if (source && output) sizeTrio({ host: host, source: source, output: output });
      });
    });
  }

  function burstGlitches() {
    (glitchInsts.length ? glitchInsts : (glitchInst ? [glitchInst] : [])).forEach(function (inst) {
      if (inst && inst.burst) {
        try { inst.burst(); } catch { /* ignore */ }
      }
    });
  }

  /** E01: cipher the product thesis, then reveal what Epoch Community is. */
  function revealWhatBody() {
    var inst = decryptByRole.what;
    if (!inst || !inst.setOptions) return;
    if (whatRevealTimer) {
      window.clearTimeout(whatRevealTimer);
      whatRevealTimer = 0;
    }
    inst.setOptions({
      passthrough: 0.03,
      scramble: 0.48,
      radius: 160,
      scrambleSpeed: 16,
      edgeGlow: 2.6,
    });
    whatRevealTimer = window.setTimeout(function () {
      if (!decryptByRole.what || !decryptByRole.what.setOptions) return;
      decryptByRole.what.setOptions({
        passthrough: 0.72,
        scramble: 0.04,
        radius: 720,
        scrambleSpeed: 5,
        edgeGlow: 1.4,
      });
      whatRevealTimer = 0;
    }, 900);
  }

  function onChapterChange(chapter) {
    retypeActiveChapter();
    if (reduce) return;

    if (decryptByRole.hero && decryptByRole.hero.setOptions && chapter === "hero") {
      decryptByRole.hero.setOptions({ passthrough: 0.06, scramble: 0.32, radius: 260, scrambleSpeed: 14 });
      window.setTimeout(function () {
        if (decryptByRole.hero && decryptByRole.hero.setOptions) {
          decryptByRole.hero.setOptions({ passthrough: 0.68, scramble: 0.05, radius: 820, scrambleSpeed: 6 });
        }
      }, 380);
    }

    if (chapter === "what") revealWhatBody();

    burstGlitches();

    if (vhsInst && vhsInst.setOptions && chapter === "board") {
      vhsInst.setOptions({ wave: 1.05, grain: 0.24, switching: 0.14 });
      window.setTimeout(function () {
        if (vhsInst && vhsInst.setOptions) {
          vhsInst.setOptions({ wave: 0.5, grain: 0.14, switching: 0.05 });
        }
      }, 850);
    }
  }

  function watchChapters() {
    var last = body.getAttribute("data-chapter") || "hero";
    var obs = new MutationObserver(function () {
      var ch = body.getAttribute("data-chapter") || "hero";
      if (ch === last) return;
      last = ch;
      onChapterChange(ch);
    });
    obs.observe(body, { attributes: true, attributeFilter: ["data-chapter"] });
  }

  injectCss();
  wireTerminalBoot();
  startPageEffects();
  watchChapters();
  body.setAttribute("data-landing-fx-ready", "1");
}

bootLandingFx();
