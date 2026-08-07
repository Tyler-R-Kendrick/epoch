/**
 * Persuade landing — CRT tube immersion + scroll-scrub Grid ride.
 *
 * Scroll model (shader.se): fixed viewport stage; tall track inside an
 * overflow scroller; progress scrubs the world (chapters, floor, CRT energy).
 * Reduced motion: snap chapters, no lerp, flattened CRT.
 */
(function () {
  "use strict";

  var body = document.body;
  if (!body || !body.hasAttribute("data-landing")) return;

  var CYCLE = 7800;
  /* Creator loop: collaborate → promote work → get paid (fixture demo). */
  var PHASE = { build: 0, showcase: 2200, "earn…": 4200, earn: 6400 };
  var CHAPTERS = [
    { id: "hero", jump: "hero", start: 0, end: 0.18 },
    { id: "what", jump: "nb-what", start: 0.18, end: 0.38 },
    { id: "how", jump: "nb-how", start: 0.38, end: 0.58 },
    { id: "who", jump: "nb-who", start: 0.58, end: 0.78 },
    { id: "board", jump: "nb-board", start: 0.78, end: 1.01 },
  ];
  /*
   * Motion thesis (Persuade ride):
   *  - Focal: ease-out scene dissolve, then a settle hold so the arrival can be read.
   *  - Continuity: CRT/grid still scrub with progress; chapters dissolve from→to only.
   *  - Feedback: data-scene-settle marks the hold (wheel/keys gated; rail/Home/End free).
   */
  var SNAP_ADJACENT_S = 0.58;
  var SNAP_JUMP_S = 0.42;
  /* Hold after land — blocks accidental next notch (trackpad inertia / double-tap). */
  var SCENE_SETTLE_MS = 720;

  var state = {
    reduce: false,
    visible: true,
    cycTimer: 0,
    scroll: 0,
    scrollSmooth: 0,
    chapter: "hero",
    pointerX: 0.5,
    pointerY: 0.5,
    theaterMs: 0,
    theaterPaused: false,
    theaterDragging: false,
    driveBoost: 0,
    canvasFailed: false,
    rideRaf: 0,
    snapAnimating: false,
    snapFrom: null,
    snapTo: null,
    snapStart: 0,
    snapEnd: 0,
    snapElapsed: 0,
    snapDuration: SNAP_ADJACENT_S,
    snapDir: 0,
    sceneSettleUntil: 0,
  };

  function easeOutCubic(t) {
    var u = Math.min(1, Math.max(0, t));
    return 1 - Math.pow(1 - u, 3);
  }

  function chapterIndex(id) {
    var i;
    for (i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].id === id || CHAPTERS[i].jump === id) return i;
    }
    return 0;
  }

  function chapterFromProgress(p) {
    var i;
    for (i = 0; i < CHAPTERS.length; i++) {
      if (p >= CHAPTERS[i].start && p < CHAPTERS[i].end) return CHAPTERS[i].id;
    }
    return "board";
  }

  function progressForChapter(id) {
    var i;
    for (i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].id === id || CHAPTERS[i].jump === id) {
        var ch = CHAPTERS[i];
        var end = Math.min(ch.end, 1);
        /* Land mid-chapter so the panel is fully weighted, not on an edge. */
        return ch.start + (end - ch.start) * 0.45;
      }
    }
    return 0;
  }

  function resolveChapterId(id) {
    if (!id || id === "hero") return "hero";
    if (id === "nb-what" || id === "what") return "what";
    if (id === "nb-how" || id === "how") return "how";
    if (id === "nb-who" || id === "who") return "who";
    if (id === "nb-board" || id === "board") return "board";
    return id;
  }

  function prefersReduce() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      return false;
    }
  }

  function setStatus(msg, force) {
    if (state.canvasFailed && !force) return;
    var el = document.querySelector("[data-landing-status]");
    if (el) el.textContent = msg || "";
  }

  function goDay(reason) {
    if (state.cycTimer) {
      window.clearTimeout(state.cycTimer);
      state.cycTimer = 0;
    }
    body.setAttribute("data-cyc", "day");
    body.removeAttribute("data-boot");
    setStatus(reason || "");
  }

  function themeColor(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch {
      return fallback;
    }
  }

  function withAlpha(color, a) {
    if (!color) return "rgba(64,240,255," + a + ")";
    if (color.charAt(0) === "#" && (color.length === 7 || color.length === 4)) {
      var h = color.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16) + "," + a + ")";
    }
    var m = String(color).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (m) return "rgba(" + m[1] + "," + m[2] + "," + m[3] + "," + a + ")";
    return color;
  }

  function phaseAt(ms) {
    if (ms < 2200) return "build";
    if (ms < 4200) return "showcase";
    if (ms < 6400) return "earn…";
    return "earn";
  }

  function seekPhase(name) {
    var key = name;
    if (key === "collaborate" || key === "talk") key = "build";
    if (key === "promote" || key === "show") key = "showcase";
    if (key === "paid" || key === "pay" || key === "receipt") key = "earn";
    state.theaterMs = PHASE[key] != null ? PHASE[key] : PHASE.build;
    state.theaterPaused = true;
    syncTheaterUi();
    setStatus("Demo seek: " + (key === "earn…" ? "earn" : key) + " — press Play to resume.");
  }

  function syncTheaterUi() {
    var phaseEl = document.querySelector("[data-theater-phase]");
    var scrub = document.querySelector("[data-theater-scrub]");
    var toggle = document.querySelector("[data-theater-toggle]");
    var phase = phaseAt(state.theaterMs);
    if (phaseEl) phaseEl.textContent = phase === "earn…" ? "earn" : phase;
    if (scrub && !state.theaterDragging) scrub.value = String(Math.round((state.theaterMs / CYCLE) * 100));
    if (toggle) {
      toggle.textContent = state.theaterPaused ? "Play" : "Pause";
      toggle.setAttribute("aria-pressed", state.theaterPaused ? "false" : "true");
    }
    document.querySelectorAll("[data-seek-phase]").forEach(function (btn) {
      var step = btn.getAttribute("data-seek-phase");
      var on =
        (step === "build" && phase === "build") ||
        (step === "showcase" && phase === "showcase") ||
        (step === "earn" && (phase === "earn" || phase === "earn…"));
      btn.setAttribute("aria-current", on ? "true" : "false");
      var li = btn.closest("li");
      if (li) li.setAttribute("data-active", on ? "1" : "0");
    });
  }

  function paintBrand() {
    var el = document.querySelector("[data-landing-brand]");
    if (!el || !window.NB_ASCII || !window.NB_ASCII.brandHtml) return;
    el.innerHTML = window.NB_ASCII.brandHtml({ phase: state.reduce ? "idle" : "boot" });
    if (!state.reduce) {
      window.setTimeout(function () {
        el.innerHTML = window.NB_ASCII.brandHtml({ phase: "idle" });
      }, 1100);
    }
  }

  function applyThemeTokens() {
    var themes = window.NB_THEMES;
    if (!themes || !themes.length) return;
    var style = document.createElement("style");
    style.setAttribute("data-landing-theme", "1");
    style.textContent = themes[0].css || "";
    document.head.appendChild(style);
  }

  function runCyc() {
    if (state.reduce) {
      goDay("");
      return;
    }
    var phases = ["horizon", "dawn", "day"];
    var i = 0;
    body.setAttribute("data-cyc", phases[0]);
    body.setAttribute("data-boot", "1");
    setStatus("Grid warming — Esc or Skip intro.");
    var tick = function () {
      i += 1;
      if (i >= phases.length) {
        body.removeAttribute("data-boot");
        setStatus("Continue through the Grid — or enter the board.");
        return;
      }
      body.setAttribute("data-cyc", phases[i]);
      if (i === phases.length - 1) {
        body.removeAttribute("data-boot");
        setStatus("Continue through the Grid — or enter the board.");
      } else {
        state.cycTimer = window.setTimeout(tick, 820);
      }
    };
    state.cycTimer = window.setTimeout(tick, 480);
  }

  function jumpTo(id) {
    animateToChapter(resolveChapterId(id));
  }

  function clearSnap(opts) {
    var armSettle = !opts || opts.settle !== false;
    state.snapAnimating = false;
    state.snapFrom = null;
    state.snapTo = null;
    state.snapElapsed = 0;
    body.removeAttribute("data-ride-snap");
    if (armSettle && !state.reduce) {
      state.sceneSettleUntil = performance.now() + SCENE_SETTLE_MS;
      body.setAttribute("data-scene-settle", "1");
    }
  }

  function clearSceneSettle() {
    state.sceneSettleUntil = 0;
    body.removeAttribute("data-scene-settle");
  }

  function inSceneSettle() {
    if (state.reduce || !state.sceneSettleUntil) return false;
    if (performance.now() < state.sceneSettleUntil) return true;
    clearSceneSettle();
    return false;
  }

  function dominantChapter() {
    if (state.snapAnimating && state.snapFrom && state.snapTo) {
      var t = state.snapDuration > 0 ? state.snapElapsed / state.snapDuration : 1;
      return easeOutCubic(t) >= 0.45 ? state.snapTo : state.snapFrom;
    }
    return state.chapter || chapterFromProgress(state.scrollSmooth);
  }

  function animateToChapter(id) {
    var scroller = document.querySelector("[data-ride-track]");
    var toId = resolveChapterId(id);
    var target = progressForChapter(toId);
    if (!scroller) {
      window.scrollTo({ top: 0, behavior: state.reduce ? "auto" : "smooth" });
      return;
    }
    var max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    if (state.reduce) {
      scroller.scrollTop = target * max;
      state.scroll = target;
      state.scrollSmooth = target;
      clearSnap({ settle: false });
      clearSceneSettle();
      applyScrollVisuals(target, target);
      return;
    }
    /* Rail / Home / End may interrupt; wheel/keys never call this while locked. */
    clearSceneSettle();
    var fromId = dominantChapter();
    var fromProgress = state.scrollSmooth;
    if (state.snapAnimating && state.snapTo === toId && Math.abs(target - state.snapEnd) < 0.0005) {
      return;
    }
    if (Math.abs(target - fromProgress) < 0.001 && fromId === toId) {
      scroller.scrollTop = target * max;
      state.scroll = target;
      state.scrollSmooth = target;
      clearSnap({ settle: true });
      applyScrollVisuals(target, target);
      return;
    }
    var dist = Math.abs(chapterIndex(toId) - chapterIndex(fromId));
    state.snapAnimating = true;
    state.snapFrom = fromId;
    state.snapTo = toId;
    state.snapStart = fromProgress;
    state.snapEnd = target;
    state.snapElapsed = 0;
    state.snapDuration = dist <= 1 ? SNAP_ADJACENT_S : SNAP_JUMP_S;
    state.snapDir = target >= fromProgress ? 1 : -1;
    body.setAttribute("data-ride-snap", "1");
    if (typeof body._nbEnsureRideLoop === "function") body._nbEnsureRideLoop();
  }

  function sectionInputLocked() {
    /* One scene per gesture: ignore wheel/keys for the whole cut + settle.
       Mid-flight retarget was stacking hero→board on a single trackpad flick. */
    return !!(state.snapAnimating || inSceneSettle());
  }

  function goSection(dir) {
    if (sectionInputLocked()) return false;
    var idx = chapterIndex(dominantChapter());
    var next = idx + (dir > 0 ? 1 : -1);
    if (next < 0 || next >= CHAPTERS.length) return false;
    animateToChapter(CHAPTERS[next].id);
    return true;
  }

  function chapterWeight(p, ch) {
    var start = ch.start;
    var end = Math.min(ch.end, 1);
    var edge = 0.045;
    if (p >= start && p < end) return 1;
    if (p >= start - edge && p < start) return (p - (start - edge)) / edge;
    if (p >= end && p < end + edge) return 1 - (p - end) / edge;
    return 0;
  }

  function syncRail(best) {
    document.querySelectorAll("[data-jump]").forEach(function (dot) {
      var id = dot.getAttribute("data-jump");
      var on =
        (best === "hero" && id === "hero") ||
        (best === "what" && id === "nb-what") ||
        (best === "how" && id === "nb-how") ||
        (best === "who" && id === "nb-who") ||
        (best === "board" && id === "nb-board");
      dot.setAttribute("aria-current", on ? "true" : "false");
    });
    if (best === "how") {
      var steps = document.querySelector("[data-landing-steps]");
      var loopCard = document.querySelector("[data-landing-receipt]");
      if (steps) steps.setAttribute("data-lit", "1");
      if (loopCard) loopCard.setAttribute("data-signed", "1");
    }
  }

  function paintChapterWeights(best, weightForId) {
    if (best !== state.chapter) {
      state.chapter = best;
      body.setAttribute("data-chapter", best);
      state.driveBoost = Math.min(1.4, state.driveBoost + 0.85);
    }
    document.querySelectorAll("[data-ride-chapter]").forEach(function (panel) {
      var id = panel.getAttribute("data-ride-chapter");
      var on = id === best;
      var w = weightForId(id);
      if (state.reduce) w = on ? 1 : 0;
      /* Soft floor so the active scene stays readable without forcing dual ghosts. */
      if (on && w > 0.55) w = Math.max(w, 0.92);
      panel.setAttribute("data-active", on ? "1" : "0");
      panel.setAttribute("data-weight", w > 0.04 ? "1" : "0");
      panel.style.setProperty("--nb-chapter-w", String(Math.max(0, Math.min(1, w))));
      if (on) panel.setAttribute("data-inview", "1");
      else panel.removeAttribute("data-inview");
    });
    syncRail(best);
  }

  function syncRideChapter(best, smooth) {
    var blend = typeof smooth === "number" ? smooth : state.scrollSmooth;
    /* Scene snap: only the departing + arriving chapters share the dissolve. */
    if (state.snapAnimating && state.snapFrom && state.snapTo && !state.reduce) {
      var t = state.snapDuration > 0 ? state.snapElapsed / state.snapDuration : 1;
      var e = easeOutCubic(t);
      var fromId = state.snapFrom;
      var toId = state.snapTo;
      var active = e >= 0.45 ? toId : fromId;
      paintChapterWeights(active, function (id) {
        if (id === toId && id === fromId) return 1;
        if (id === toId) return e;
        if (id === fromId) return 1 - e;
        return 0;
      });
      return;
    }
    paintChapterWeights(best, function (id) {
      var ch = null;
      var i;
      for (i = 0; i < CHAPTERS.length; i++) {
        if (CHAPTERS[i].id === id) {
          ch = CHAPTERS[i];
          break;
        }
      }
      return ch ? chapterWeight(blend, ch) : 0;
    });
  }

  function applyScrollVisuals(raw, smooth) {
    var fill = document.querySelector("[data-scroll-fill]");
    var hint = document.querySelector("[data-scroll-hint]");
    var p = smooth;
    body.style.setProperty("--nb-scroll", String(raw));
    body.style.setProperty("--nb-scroll-smooth", String(smooth));
    if (fill) fill.style.transform = "scaleY(" + raw + ")";
    if (hint) hint.setAttribute("data-gone", raw > 0.04 ? "1" : "0");
    /* Lens strength rides CSS vars — WebGL CRT reads them; no SVG attr thrash. */
    body.style.setProperty("--nb-crt-distort", String((0.24 + p * 0.14).toFixed(4)));
    body.style.setProperty("--nb-crt-chroma", String((1.2 + p * 1.0).toFixed(3)));
    body.style.setProperty("--nb-crt-scan", String(0.55 + p * 0.45));
    body.style.setProperty("--nb-crt-bloom", String(0.48 + p * 0.5));
    body.style.setProperty("--nb-crt-roll", String((6.8 - p * 3.2).toFixed(2)) + "s");
    body.style.setProperty("--nb-world-y", String((-1.2 * p).toFixed(3)) + "vh");
    body.style.setProperty("--nb-world-scale", String((1 + p * 0.02).toFixed(4)));
    /* Chapters follow raw scrub for rail; weights blend on smooth progress. */
    syncRideChapter(chapterFromProgress(raw), smooth);
  }

  function wireScroll() {
    var scroller = document.querySelector("[data-ride-track]");
    var panels = Array.prototype.slice.call(document.querySelectorAll("[data-ride-chapter]"));
    var lastRideTs = 0;
    var wheelLockUntil = 0;
    var wheelAccum = 0;
    var wheelGestureTimer = 0;
    var touchStartY = 0;
    var touchActive = false;
    var WHEEL_STEP = 48;

    function readProgress() {
      if (!scroller) return 0;
      var max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      return Math.min(1, Math.max(0, scroller.scrollTop / max));
    }

    var writingProgress = false;
    function writeProgress(p) {
      if (!scroller) return;
      var max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      var clamped = Math.min(1, Math.max(0, p));
      writingProgress = true;
      scroller.scrollTop = clamped * max;
      writingProgress = false;
      state.scroll = clamped;
    }

    function paintChrome(raw) {
      var fill = document.querySelector("[data-scroll-fill]");
      var hint = document.querySelector("[data-scroll-hint]");
      body.style.setProperty("--nb-scroll", String(raw));
      if (fill) fill.style.transform = "scaleY(" + raw + ")";
      if (hint) hint.setAttribute("data-gone", raw > 0.04 ? "1" : "0");
    }

    function onScroll() {
      /* Programmatic writeProgress must not fight the ride clock. */
      if (writingProgress) return;
      /* Scroller is overflow:hidden; only writeProgress moves it. Ignore ghosts. */
      if (state.snapAnimating || inSceneSettle()) return;
      var raw = readProgress();
      if (Math.abs(raw - state.scroll) > 0.002) {
        writeProgress(state.scroll);
      }
    }

    function tickRide(now) {
      state.rideRaf = 0;
      var dt;
      if (!lastRideTs) {
        lastRideTs = now;
        dt = 1 / 60;
      } else {
        dt = Math.min(0.05, Math.max(0, (now - lastRideTs) / 1000));
        lastRideTs = now;
      }

      if (state.snapAnimating && state.snapTo && !state.reduce) {
        state.snapElapsed += dt;
        var t = state.snapDuration > 0 ? state.snapElapsed / state.snapDuration : 1;
        var e = easeOutCubic(t);
        var next = state.snapStart + (state.snapEnd - state.snapStart) * e;
        if (t >= 1) {
          next = state.snapEnd;
          clearSnap({ settle: true });
        }
        writeProgress(next);
        state.scrollSmooth = next;
        applyScrollVisuals(next, next);
      } else if (state.reduce) {
        state.scroll = readProgress();
        state.scrollSmooth = state.scroll;
        applyScrollVisuals(state.scroll, state.scroll);
      } else {
        if (state.sceneSettleUntil && performance.now() >= state.sceneSettleUntil) {
          clearSceneSettle();
        }
        var raw = readProgress();
        if (raw !== state.scroll) {
          state.scroll = raw;
          paintChrome(raw);
        }
        /* Free scrub only when not snapping — keep a tight follow. */
        var k = 1 - Math.exp(-dt * 28);
        state.scrollSmooth += (state.scroll - state.scrollSmooth) * k;
        if (Math.abs(state.scroll - state.scrollSmooth) < 0.00015) {
          state.scrollSmooth = state.scroll;
        }
        applyScrollVisuals(state.scroll, state.scrollSmooth);
      }

      if (!document.hidden) {
        state.rideRaf = window.requestAnimationFrame(tickRide);
      }
    }

    function ensureRideLoop() {
      if (state.rideRaf) return;
      state.rideRaf = window.requestAnimationFrame(tickRide);
    }

    function setProgress(p) {
      clearSnap({ settle: false });
      clearSceneSettle();
      writeProgress(p);
      state.scrollSmooth = state.scroll;
      onScroll();
      applyScrollVisuals(state.scroll, state.scrollSmooth);
      ensureRideLoop();
    }

    function requestSection(dir) {
      var now = performance.now();
      if (sectionInputLocked()) return;
      if (now < wheelLockUntil) return;
      if (goSection(dir)) {
        /* Hard gate until this scene's cut+settle can finish (~1.3s). */
        wheelLockUntil = now + Math.round((SNAP_ADJACENT_S + SCENE_SETTLE_MS / 1000) * 1000);
        wheelAccum = 0;
        ensureRideLoop();
      }
    }

    function onWheelIntent(deltaY, deltaX) {
      if (sectionInputLocked()) {
        wheelAccum = 0;
        return;
      }
      var dominant = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
      if (Math.abs(dominant) < 1) return;
      wheelAccum += dominant;
      if (wheelGestureTimer) window.clearTimeout(wheelGestureTimer);
      wheelGestureTimer = window.setTimeout(function () {
        wheelAccum = 0;
        wheelGestureTimer = 0;
      }, 180);
      if (Math.abs(wheelAccum) < WHEEL_STEP) return;
      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      requestSection(dir);
    }

    onScroll();
    applyScrollVisuals(state.scroll, state.scrollSmooth);
    if (scroller) {
      scroller.addEventListener("scroll", function () {
        onScroll();
        ensureRideLoop();
      }, { passive: true });
    }

    /* Wheel: one scene cut per intent — theater scrub uses drag/range, not wheel. */
    window.addEventListener(
      "wheel",
      function (ev) {
        if (!scroller) return;
        if (
          ev.target &&
          ev.target.closest &&
          ev.target.closest("input, textarea, select, .nb-theater-scrub, .nb-theater-btn")
        ) {
          return;
        }
        var panel = ev.target && ev.target.closest && ev.target.closest(".nb-ride-chapter[data-active='1']");
        if (panel && panel.scrollHeight > panel.clientHeight + 4) {
          var atTop = panel.scrollTop <= 0 && ev.deltaY < 0;
          var atBot = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2 && ev.deltaY > 0;
          if (!atTop && !atBot && ev.deltaY !== 0) return;
        }
        if (Math.abs(ev.deltaY) < 1 && Math.abs(ev.deltaX) < 1) return;
        ev.preventDefault();
        /* Always consume — never let the tall ride track free-scroll to the end. */
        onWheelIntent(ev.deltaY, ev.deltaX);
      },
      { passive: false }
    );

    window.addEventListener(
      "touchstart",
      function (ev) {
        if (!ev.touches || !ev.touches[0]) return;
        if (ev.target && ev.target.closest && ev.target.closest("[data-landing-theater], input, textarea, select")) {
          return;
        }
        touchActive = true;
        touchStartY = ev.touches[0].clientY;
      },
      { passive: true }
    );
    window.addEventListener(
      "touchend",
      function (ev) {
        if (!touchActive) return;
        touchActive = false;
        var t = ev.changedTouches && ev.changedTouches[0];
        if (!t) return;
        var dy = touchStartY - t.clientY;
        if (Math.abs(dy) < 48) return;
        requestSection(dy > 0 ? 1 : -1);
      },
      { passive: true }
    );

    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) ensureRideLoop();
    });
    panels.forEach(function (p) {
      p.addEventListener("pointerenter", function () {
        if (state.reduce) return;
        state.driveBoost = Math.min(1.25, state.driveBoost + 0.45);
      });
    });
    ensureRideLoop();
    syncRideChapter("hero", 0);
    body._nbSetRideProgress = setProgress;
    body._nbEnsureRideLoop = ensureRideLoop;
    body._nbGoSection = goSection;
    body._nbAnimateToChapter = animateToChapter;
  }

  function wireControl() {
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && body.getAttribute("data-cyc") !== "day") {
        ev.preventDefault();
        goDay("Intro skipped.");
        return;
      }
      var tag = ev.target && ev.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (ev.target && ev.target.isContentEditable)) {
        return;
      }
      /* Section navigation — fixed-velocity snaps (same path as wheel). */
      var navKey =
        ev.key === "ArrowDown" ||
        ev.key === "ArrowRight" ||
        ev.key === "PageDown" ||
        ev.key === "j" ||
        ev.key === "J" ||
        (ev.key === " " && !(ev.target && ev.target.hasAttribute && ev.target.hasAttribute("data-landing-theater"))) ||
        ev.key === "ArrowUp" ||
        ev.key === "ArrowLeft" ||
        ev.key === "PageUp" ||
        ev.key === "k" ||
        ev.key === "K" ||
        ev.key === "Home" ||
        ev.key === "End";
      if (navKey) {
        if (ev.key === "Home") {
          ev.preventDefault();
          animateToChapter("hero");
          return;
        }
        if (ev.key === "End") {
          ev.preventDefault();
          animateToChapter("board");
          return;
        }
        var dir =
          ev.key === "ArrowDown" ||
          ev.key === "ArrowRight" ||
          ev.key === "PageDown" ||
          ev.key === "j" ||
          ev.key === "J" ||
          ev.key === " "
            ? 1
            : -1;
        if (goSection(dir)) {
          ev.preventDefault();
          if (typeof body._nbEnsureRideLoop === "function") body._nbEnsureRideLoop();
        } else {
          ev.preventDefault();
        }
        return;
      }
      if (ev.key === "1") seekPhase("build");
      if (ev.key === "2") seekPhase("showcase");
      if (ev.key === "3") seekPhase("earn");
      if (ev.key === " " && ev.target && ev.target.hasAttribute && ev.target.hasAttribute("data-landing-theater")) {
        ev.preventDefault();
        state.theaterPaused = !state.theaterPaused;
        syncTheaterUi();
      }
    });

    var skip = document.querySelector("[data-skip-intro]");
    if (skip) skip.addEventListener("click", function () { goDay("Intro skipped."); });

    document.querySelectorAll("[data-jump]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        jumpTo(btn.getAttribute("data-jump"));
      });
    });

    document.querySelectorAll("[data-seek-phase]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        seekPhase(btn.getAttribute("data-seek-phase"));
        var how = document.getElementById("nb-how");
        if (how) {
          var steps = document.querySelector("[data-landing-steps]");
          if (steps) steps.setAttribute("data-lit", "1");
          var loopCard = document.querySelector("[data-landing-receipt]");
          if (loopCard && btn.getAttribute("data-seek-phase") === "earn") {
            loopCard.setAttribute("data-signed", "1");
          }
        }
      });
    });

    var toggle = document.querySelector("[data-theater-toggle]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        state.theaterPaused = !state.theaterPaused;
        syncTheaterUi();
        setStatus(state.theaterPaused ? "Demo paused." : "Demo playing.");
      });
    }

    var scrub = document.querySelector("[data-theater-scrub]");
    if (scrub) {
      scrub.addEventListener("pointerdown", function () { state.theaterDragging = true; state.theaterPaused = true; });
      scrub.addEventListener("pointerup", function () { state.theaterDragging = false; syncTheaterUi(); });
      scrub.addEventListener("input", function () {
        state.theaterMs = (Number(scrub.value) / 100) * CYCLE;
        state.theaterPaused = true;
        syncTheaterUi();
      });
    }

    window.addEventListener("pointermove", function (ev) {
      state.pointerX = ev.clientX / Math.max(1, window.innerWidth);
      state.pointerY = ev.clientY / Math.max(1, window.innerHeight);
    });

    document.addEventListener("visibilitychange", function () {
      state.visible = document.visibilityState !== "hidden";
    });

    wirePlaneCatalog();
  }

  var PLANE_PREVIEW = {
    channels:
      "┌ Epoch Community ───────────────────────────────┐\n" +
      "│ #creators  #showcase  · following · projects   │\n" +
      "│────────────────────────────────────────────────│\n" +
      "│ maya     shipping garden@0.3            live   │\n" +
      "│ rio  ✓   collab on CRT lens             open   │\n" +
      "│ scout    tipped the release             paid*  │\n" +
      "│ *sample earnings                               │\n" +
      "└────────────────────────────────────────────────┘",
    network:
      "┌ Promote · showcase feed ───────────────────────┐\n" +
      "│ maya · nightboard-garden@0.3            live   │\n" +
      "│ rio starred your CRT lens drop          hot    │\n" +
      "│ scout followed @maya                    new    │\n" +
      "│ showcase · follow · release                    │\n" +
      "└────────────────────────────────────────────────┘",
    projects:
      "┌ Projects · community/epoch ────────────────────┐\n" +
      "│ #128  garden release notes              open   │\n" +
      "│ CP-09 CRT lens pass                     review │\n" +
      "│ #119  showcase feed                     done ✓ │\n" +
      "│ issues + proposals                             │\n" +
      "└────────────────────────────────────────────────┘",
  };

  function wirePlaneCatalog() {
    var preview = document.querySelector("[data-landing-preview]");
    var rows = document.querySelectorAll("[data-plane]");
    if (!preview || !rows.length) return;

    rows.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var plane = btn.getAttribute("data-plane") || "channels";
        rows.forEach(function (r) {
          r.setAttribute("aria-pressed", r === btn ? "true" : "false");
        });
        preview.setAttribute("data-plane-preview", plane);
        if (PLANE_PREVIEW[plane]) preview.textContent = PLANE_PREVIEW[plane];
        setStatus(plane);
      });
    });
  }

  function wireTheaterPointer() {
    var canvas = document.querySelector("[data-landing-theater]");
    if (!canvas) return;

    function scrubFromEvent(ev) {
      var rect = canvas.getBoundingClientRect();
      var x = (ev.clientX - rect.left) / Math.max(1, rect.width);
      state.theaterMs = Math.min(CYCLE - 1, Math.max(0, x * CYCLE));
      state.theaterPaused = true;
      syncTheaterUi();
    }

    canvas.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      canvas.setPointerCapture(ev.pointerId);
      state.theaterDragging = true;
      scrubFromEvent(ev);
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!state.theaterDragging) return;
      scrubFromEvent(ev);
      state.driveBoost = Math.min(1.2, state.driveBoost + 0.08);
    });
    canvas.addEventListener("pointerup", function () {
      state.theaterDragging = false;
    });
    canvas.addEventListener("dblclick", function () {
      state.theaterPaused = !state.theaterPaused;
      syncTheaterUi();
    });
  }

  function startGrid() {
    var canvas = document.querySelector("[data-landing-grid]");
    if (!canvas || !canvas.getContext) {
      setStatus("Grid canvas unavailable — enter the board for the TUI.", true);
      state.canvasFailed = true;
      return;
    }

    var drive = 0;
    var shimmer = 0;
    var last = 0;
    var stars = null;
    var beams = null;
    var scene = document.createElement("canvas");
    var sctx = scene.getContext("2d", { alpha: false });
    if (!sctx) {
      canvas.setAttribute("data-canvas-failed", "1");
      state.canvasFailed = true;
      setStatus("Grid drawing unavailable in this browser — enter the board anyway.", true);
      return;
    }

    /* shader.se-grade CRT: WebGL barrel lens + chromatic aberration + vignette.
       Scene draws to an offscreen 2D buffer; the display canvas is the CRT pass. */
    var gl = null;
    var crt = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      gl = null;
    }

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    function buildCrt() {
      if (!gl) return null;
      var vs = compile(
        gl.VERTEX_SHADER,
        "attribute vec2 aPos; varying vec2 vUv; void main(){ vUv=aPos*0.5+0.5; gl_Position=vec4(aPos,0.0,1.0); }"
      );
      var fs = compile(
        gl.FRAGMENT_SHADER,
        [
          "precision mediump float;",
          "varying vec2 vUv;",
          "uniform sampler2D uTex;",
          "uniform vec2 uRes;",
          "uniform float uDistort;",
          "uniform float uBorders;",
          "uniform float uChroma;",
          "uniform float uVignette;",
          "uniform float uTime;",
          "vec2 barrel(vec2 uv, float k){",
          "  vec2 c = uv - 0.5;",
          "  float r2 = dot(c,c);",
          "  return c * (1.0 + k * r2) + 0.5;",
          "}",
          "float borderMask(vec2 uv, float soft){",
          "  vec2 e = smoothstep(0.0, soft, uv) * (1.0 - smoothstep(1.0 - soft, 1.0, uv));",
          "  return e.x * e.y;",
          "}",
          "void main(){",
          "  float k = uDistort;",
          "  vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);",
          "  vec2 c = (vUv - 0.5) * aspect;",
          "  float r2 = dot(c, c);",
          "  vec2 warped = c * (1.0 + k * r2);",
          "  vec2 uv = warped / aspect + 0.5;",
          "  float soft = mix(0.018, 0.09, uBorders);",
          "  float mask = borderMask(uv, soft);",
          "  vec2 dir = length(c) > 0.0001 ? normalize(c) : vec2(0.0);",
          "  float ca = uChroma * 0.0042 * (1.0 + r2 * 3.4);",
          "  vec2 off = dir * ca;",
          "  vec2 uvR = ((c + off) * (1.0 + k * r2)) / aspect + 0.5;",
          "  vec2 uvG = uv;",
          "  vec2 uvB = ((c - off) * (1.0 + k * r2)) / aspect + 0.5;",
          "  float rCh = texture2D(uTex, uvR).r;",
          "  float gCh = texture2D(uTex, uvG).g;",
          "  float bCh = texture2D(uTex, uvB).b;",
          "  vec3 col = vec3(rCh, gCh, bCh);",
          "  float scan = 0.9 + 0.1 * sin((vUv.y * uRes.y + uTime * 36.0) * 3.14159);",
          "  col *= scan;",
          "  float vig = smoothstep(uVignette + 0.62, uVignette * 0.28, length(c));",
          "  col *= mix(0.28, 1.0, vig);",
          "  float grain = fract(sin(dot(vUv * uRes + uTime, vec2(12.9898,78.233))) * 43758.5453);",
          "  col += (grain - 0.5) * 0.028;",
          "  col = mix(col, col * vec3(0.92, 1.05, 1.08), 0.18);",
          "  col *= mask;",
          "  gl_FragColor = vec4(col, 1.0);",
          "}",
        ].join("\n")
      );
      if (!vs || !fs) return null;
      var prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return {
        prog: prog,
        buf: buf,
        tex: tex,
        aPos: gl.getAttribLocation(prog, "aPos"),
        uTex: gl.getUniformLocation(prog, "uTex"),
        uRes: gl.getUniformLocation(prog, "uRes"),
        uDistort: gl.getUniformLocation(prog, "uDistort"),
        uBorders: gl.getUniformLocation(prog, "uBorders"),
        uChroma: gl.getUniformLocation(prog, "uChroma"),
        uVignette: gl.getUniformLocation(prog, "uVignette"),
        uTime: gl.getUniformLocation(prog, "uTime"),
      };
    }

    if (!state.reduce) crt = buildCrt();
    var drawCtx = crt ? sctx : canvas.getContext("2d");
    if (!drawCtx) {
      canvas.setAttribute("data-canvas-failed", "1");
      state.canvasFailed = true;
      setStatus("Grid drawing unavailable in this browser — enter the board anyway.", true);
      return;
    }
    if (crt) {
      canvas.setAttribute("data-crt-webgl", "1");
      body.setAttribute("data-crt-pass", "webgl");
    }

    function seed(w, h, horizon) {
      stars = [];
      var n = Math.max(18, Math.floor(w / 48));
      for (var i = 0; i < n; i++) {
        stars.push({
          x: (i * 97 + 41) % Math.max(1, w),
          y: 4 + ((i * 53) % Math.max(1, horizon - 8)),
          r: i % 4 === 0 ? 1.35 : 0.7,
          phase: (i * 0.13) % 1,
        });
      }
      beams = [];
      for (var b = 0; b < 5; b++) {
        beams.push({ x: w * (0.18 + b * 0.16), phase: b * 0.2, w: 18 + b * 6 });
      }
    }

    function pulse(phase, p) {
      var d = Math.abs(((p - phase) % 1 + 1.5) % 1 - 0.5);
      return Math.max(0, 1 - d * 4.2);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, state.reduce ? 1 : 1.75);
      var w = window.innerWidth;
      var h = window.innerHeight;
      var bw = Math.floor(w * dpr);
      var bh = Math.floor(h * dpr);
      scene.width = bw;
      scene.height = bh;
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!crt && drawCtx !== sctx) drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (crt) {
        gl.viewport(0, 0, bw, bh);
      }
      seed(w, h, h * 0.48);
    }

    function chapterSpeed() {
      var ch = state.chapter;
      if (ch === "how") return 0.28;
      if (ch === "what") return 0.16;
      if (ch === "who") return 0.12;
      if (ch === "board") return 0.2;
      return body.getAttribute("data-cyc") === "day" ? 0.1 : 0.22;
    }

    function paintScene(ctx, w, h) {
      var agent = themeColor("--nb-agent", "#40f0ff");
      var accent = themeColor("--nb-accent", "#ff2cf0");
      var signed = themeColor("--nb-signed", "#7dff9a");
      var horizon = h * (0.4 + state.scrollSmooth * 0.16);
      var cx = w * (0.5 + (state.pointerX - 0.5) * (0.08 + state.scrollSmooth * 0.04));

      var packet =
        state.chapter === "how"
          ? (phaseAt(state.theaterMs) === "build"
              ? accent
              : phaseAt(state.theaterMs).indexOf("earn") === 0
                ? signed
                : agent)
          : agent;

      ctx.fillStyle = "#03050a";
      ctx.fillRect(0, 0, w, h);

      var sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, withAlpha(accent, 0.07));
      sky.addColorStop(0.55, withAlpha(agent, 0.05));
      sky.addColorStop(1, withAlpha(agent, 0.02));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon);

      if (!stars) seed(w, h, horizon);
      for (var si = 0; si < stars.length; si++) {
        var st = stars[si];
        ctx.fillStyle = withAlpha(agent, 0.1 + 0.35 * pulse(shimmer, st.phase));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }

      var sunY = horizon - 2;
      var sunR = Math.min(78, w * 0.065);
      var sun = ctx.createRadialGradient(cx, sunY, 0, cx, sunY, sunR * 2.6);
      sun.addColorStop(0, withAlpha(accent, 0.5));
      sun.addColorStop(0.35, withAlpha(agent, 0.24));
      sun.addColorStop(1, withAlpha(agent, 0));
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(cx, sunY, sunR * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(accent, 0.58);
      ctx.beginPath();
      ctx.arc(cx, sunY, sunR * 0.34, 0, Math.PI * 2);
      ctx.fill();

      for (var bi = 0; bi < beams.length; bi++) {
        var bm = beams[bi];
        var ba = 0.035 + 0.06 * pulse(shimmer, bm.phase);
        var bg = ctx.createLinearGradient(bm.x, 0, bm.x, horizon);
        bg.addColorStop(0, withAlpha(agent, 0));
        bg.addColorStop(0.7, withAlpha(agent, ba));
        bg.addColorStop(1, withAlpha(accent, ba * 0.65));
        ctx.fillStyle = bg;
        ctx.fillRect(bm.x - bm.w / 2, 0, bm.w, horizon);
      }

      ctx.strokeStyle = withAlpha(agent, 0.38 + 0.15 * Math.sin(shimmer * Math.PI * 2));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      var ground = ctx.createLinearGradient(0, horizon, 0, h);
      ground.addColorStop(0, withAlpha(agent, 0.045));
      ground.addColorStop(1, withAlpha(agent, 0.14));
      ctx.fillStyle = ground;
      ctx.fillRect(0, horizon, w, h - horizon);

      var fog = ctx.createLinearGradient(0, horizon - 40, 0, horizon + (h - horizon) * 0.55);
      fog.addColorStop(0, withAlpha(agent, 0));
      fog.addColorStop(0.35, withAlpha(agent, 0.07 + state.driveBoost * 0.04));
      fog.addColorStop(0.7, withAlpha(accent, 0.03));
      fog.addColorStop(1, withAlpha(agent, 0));
      ctx.fillStyle = fog;
      ctx.fillRect(0, horizon - 40, w, (h - horizon) * 0.55 + 40);

      var rows = 22 + Math.floor(state.scrollSmooth * 10);
      for (var r = 0; r < rows; r++) {
        var u = (r + (state.reduce ? 0 : drive * rows)) / rows;
        var e = u * u;
        var y = horizon + e * (h - horizon);
        ctx.strokeStyle = withAlpha(agent, 0.12 + 0.28 * pulse(shimmer, u) * (0.55 + state.scrollSmooth * 0.45));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      var cols = 16 + Math.floor(state.scrollSmooth * 6);
      for (var c = -cols; c <= cols; c++) {
        var edgeX = cx + c * (w / (cols * (1.05 - state.scrollSmooth * 0.08)));
        var depth = Math.abs(c) / cols;
        ctx.strokeStyle = withAlpha(agent, (0.1 + 0.18 * (1 - depth)) * (0.7 + state.scrollSmooth * 0.4));
        ctx.beginPath();
        ctx.moveTo(cx, horizon);
        ctx.lineTo(edgeX, h + 30);
        ctx.stroke();
      }

      ctx.strokeStyle = withAlpha(accent, 0.24);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, horizon);
      ctx.lineTo(cx, h);
      ctx.stroke();

      if (!state.reduce) {
        var nPack = 4 + Math.floor(state.driveBoost * 4);
        for (var p = 0; p < nPack; p++) {
          var pu = (drive + p / nPack) % 1;
          var pe = pu * pu;
          var py = horizon + pe * (h - horizon);
          var ph = 7 + pe * 34;
          ctx.fillStyle = withAlpha(packet, (0.18 + state.driveBoost * 0.12) * (1 - pe));
          ctx.fillRect(cx - ph / 2, py, ph, 2.5);
        }
      }
    }

    function blitCrt(ts) {
      gl.useProgram(crt.prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, crt.buf);
      gl.enableVertexAttribArray(crt.aPos);
      gl.vertexAttribPointer(crt.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, crt.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
      gl.uniform1i(crt.uTex, 0);
      gl.uniform2f(crt.uRes, canvas.width, canvas.height);
      var distort = parseFloat(body.style.getPropertyValue("--nb-crt-distort")) || 0.16;
      var chroma = parseFloat(body.style.getPropertyValue("--nb-crt-chroma")) || 1.0;
      gl.uniform1f(crt.uDistort, state.reduce ? 0.04 : distort);
      gl.uniform1f(crt.uBorders, 1.0);
      gl.uniform1f(crt.uChroma, state.reduce ? 0.2 : chroma);
      gl.uniform1f(crt.uVignette, 0.42);
      gl.uniform1f(crt.uTime, ts * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function draw(ts) {
      if (!state.visible) {
        requestAnimationFrame(draw);
        return;
      }
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (!last) last = ts;
      var dt = Math.min(48, ts - last) / 1000;
      last = ts;

      if (!state.reduce) {
        shimmer = (shimmer + dt * (0.25 + state.scrollSmooth * 0.55)) % 1;
        state.driveBoost = Math.max(0, state.driveBoost - dt * 0.35);
        /* dt-accurate drive advance lives partly in paintScene; sync here too */
        var speed = chapterSpeed() + state.scrollSmooth * 0.55 + state.driveBoost;
        drive = (drive + dt * speed) % 1;
      }

      if (crt) {
        paintScene(sctx, w, h);
        blitCrt(ts);
      } else {
        paintScene(drawCtx, w, h);
      }

      if (!state.reduce) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", function () {
      resize();
      if (state.reduce) draw(performance.now());
    });
    requestAnimationFrame(draw);
  }

  function startTheater() {
    var canvas = document.querySelector("[data-landing-theater]");

    function failTheater(msg) {
      if (canvas) {
        canvas.setAttribute("data-canvas-failed", "1");
        canvas.setAttribute("aria-label", "Creator loop demo unavailable");
      }
      var cap = document.querySelector(".nb-landing-theater-cap");
      if (cap) {
        cap.textContent =
          "Demo canvas unavailable in this browser — fixtures below still explain the loop.";
      }
      state.canvasFailed = true;
      setStatus(msg, true);
    }

    if (!canvas || !canvas.getContext) {
      failTheater("Creator demo canvas missing — use How steps and enter the board.");
      return;
    }
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      failTheater("Creator demo unavailable here — How steps still seek the story; enter the board.");
      return;
    }
    var t0 = 0;
    var last = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(280, Math.floor(rect.width));
      var h = Math.max(180, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas._lw = w;
      canvas._lh = h;
    }

    function drawFrame(ms) {
      var w = canvas._lw || 520;
      var h = canvas._lh || 280;
      var agent = themeColor("--nb-agent", "#40f0ff");
      var accent = themeColor("--nb-accent", "#ff2cf0");
      var ink = themeColor("--nb-ink", "#c8c8c8");
      var dim = themeColor("--nb-ink-dim", "#8a8a8a");
      var signed = themeColor("--nb-signed", "#7dff9a");
      var surface = themeColor("--nb-surface", "#0a0a0a");
      var phase = phaseAt(ms);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = withAlpha(surface, 0.94);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = withAlpha(agent, 0.035);
      for (var y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

      // CRT curvature hint inside theater
      var vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.font = "12px " + (themeColor("--nb-font", "ui-monospace") || "monospace");
      ctx.textBaseline = "top";

      var lines = [
        { c: dim, t: "┌─ #creators ─────────────────────────┐" },
        { c: ink, t: "│ maya                                  │" },
      ];
      var msg = "shipping garden@0.3 with rio";
      var typed = Math.min(msg.length, Math.floor((ms / 1800) * msg.length));
      if (phase === "build") {
        lines.push({ c: ink, t: "│   " + msg.slice(0, typed) + (typed < msg.length ? "▌" : "") + " ".repeat(Math.max(0, 34 - typed - (typed < msg.length ? 1 : 0))) + "│" });
        lines.push({ c: accent, t: "│                   [ collaborating ]  │" });
      } else if (phase === "showcase") {
        lines.push({ c: ink, t: "│   " + msg + " ".repeat(Math.max(0, 34 - msg.length)) + "│" });
        lines.push({ c: accent, t: "│   » promote work → showcase          │" });
        lines.push({ c: dim, t: "│     release · profile · followers    │" });
      } else if (phase === "earn…") {
        lines.push({ c: ink, t: "│   " + msg + " ".repeat(Math.max(0, 34 - msg.length)) + "│" });
        lines.push({ c: agent, t: "│   creator payout · settling          │" });
        var bar = Math.floor(((ms - 4200) / 2200) * 12);
        lines.push({ c: agent, t: "│   [" + "█".repeat(Math.max(0, bar)) + "·".repeat(Math.max(0, 12 - bar)) + "]                  │" });
      } else {
        lines.push({ c: ink, t: "│   " + msg + " ".repeat(Math.max(0, 34 - msg.length)) + "│" });
        lines.push({ c: signed, t: "│   ✓ paid · creator earnings*         │" });
        lines.push({ c: signed, t: "│   *fixture — not a live payout       │" });
      }
      lines.push({ c: dim, t: "└──────────────────────────────────────┘" });

      var lineH = 18;
      var startY = Math.max(12, (h - lines.length * lineH) / 2);
      for (var i = 0; i < lines.length; i++) {
        ctx.fillStyle = lines[i].c;
        ctx.fillText(lines[i].t, 14, startY + i * lineH);
      }

      var rail = phase === "build" ? accent : phase === "showcase" ? agent : signed;
      ctx.fillStyle = withAlpha(rail, 0.85);
      ctx.fillRect(0, 0, 3, h);

      if (phase === "earn" && !state.reduce) {
        ctx.strokeStyle = withAlpha(signed, 0.12 + 0.1 * Math.sin((ms / 400) * Math.PI));
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, w - 8, h - 8);
      }

      // Scrub playhead
      var px = (ms / CYCLE) * w;
      ctx.fillStyle = withAlpha(agent, 0.55);
      ctx.fillRect(px - 1, 0, 2, h);
    }

    function loop(ts) {
      if (!state.visible && !state.reduce) {
        requestAnimationFrame(loop);
        return;
      }
      if (!t0) t0 = ts;
      if (!last) last = ts;
      var dt = Math.min(48, ts - last);
      last = ts;
      if (!state.reduce && !state.theaterPaused && !state.theaterDragging) {
        state.theaterMs = (state.theaterMs + dt) % CYCLE;
      }
      if (state.reduce) state.theaterMs = CYCLE - 1;
      drawFrame(state.theaterMs);
      syncTheaterUi();
      if (!state.reduce) requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener("resize", function () {
      resize();
      drawFrame(state.theaterMs);
    });
    requestAnimationFrame(loop);
  }

  state.reduce = prefersReduce();
  applyThemeTokens();
  paintBrand();
  wireControl();
  wireScroll();
  wireTheaterPointer();
  runCyc();
  startGrid();
  startTheater();
  syncTheaterUi();

  if (!state.reduce) {
    window.setTimeout(function () { body.removeAttribute("data-boot"); }, 2200);
  } else {
    body.removeAttribute("data-boot");
  }
})();
