/**
 * Header Tron grid-road — faint neon landscape behind the masthead.
 *
 * Idle: static perspective with a soft shimmer along the lines.
 * Click the canvas (empty bar chrome) to toggle forward motion.
 * Motion stays minimal; prefers-reduced-motion never drives.
 */
(function () {
  "use strict";

  var canvas = null;
  var ctx = null;
  var raf = 0;
  var moving = false;
  var reduce = false;
  var drive = 0;
  var shimmer = 0;
  var lastTs = 0;
  var resizeObs = null;
  var stars = null;

  function prefersReduce() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      return false;
    }
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
    if (!color) return "rgba(0,229,255," + a + ")";
    if (color.charAt(0) === "#" && (color.length === 7 || color.length === 4)) {
      var r, g, b;
      if (color.length === 4) {
        r = parseInt(color.charAt(1) + color.charAt(1), 16);
        g = parseInt(color.charAt(2) + color.charAt(2), 16);
        b = parseInt(color.charAt(3) + color.charAt(3), 16);
      } else {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      }
      return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }
    var m = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (m) return "rgba(" + m[1] + "," + m[2] + "," + m[3] + "," + a + ")";
    return color;
  }

  function seedStars(w, h, horizonY) {
    var n = Math.max(6, Math.floor(w / 90));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: (i * 97 + 41) % Math.max(1, w),
        y: 2 + ((i * 53) % Math.max(1, horizonY - 4)),
        r: i % 3 === 0 ? 1.1 : 0.7,
        phase: (i * 0.17) % 1,
      });
    }
  }

  function size() {
    if (!canvas) return;
    var parent = canvas.parentElement;
    if (!parent) return;
    var r = parent.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(r.width));
    var h = Math.max(1, Math.floor(r.height));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars(w, h, Math.max(4, h * 0.34));
    }
  }

  /** depth u ∈ [0,1] (horizon→near) → screen y and half-width of road. */
  function project(u, w, h, horizonY) {
    var e = u * u;
    var y = horizonY + e * (h - horizonY);
    var half = (0.06 + e * 0.55) * w;
    return { y: y, half: half };
  }

  /** Travelling brightness bump along parameter p ∈ [0,1]. */
  function shimmerPulse(phase, p) {
    var d = Math.abs(((p - phase) % 1 + 1.5) % 1 - 0.5);
    return 0.65 + 0.9 * Math.max(0, 1 - d * 4.5);
  }

  function draw(ts) {
    if (!canvas || !ctx) return;
    size();
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (w < 2 || h < 2) return;

    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;

    if (moving && !reduce) {
      drive = (drive + dt * 0.18) % 1;
    }
    shimmer = (shimmer + dt * (moving ? 0.28 : 0.42)) % 1;

    var cyan = themeColor("--cw-agent", "#00e5ff");
    var mag = themeColor("--cw-accent", "#ff2bd6");
    var horizonY = Math.max(4, h * 0.34);
    var cx = w * 0.52;

    ctx.clearRect(0, 0, w, h);

    var sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, withAlpha(mag, 0.03));
    sky.addColorStop(1, withAlpha(cyan, 0.02));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizonY);

    if (!stars) seedStars(w, h, horizonY);
    for (var si = 0; si < stars.length; si++) {
      var st = stars[si];
      var sa = 0.12 + 0.2 * shimmerPulse(shimmer, st.phase);
      ctx.fillStyle = withAlpha(cyan, sa);
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    var ground = ctx.createLinearGradient(0, horizonY, 0, h);
    ground.addColorStop(0, withAlpha(cyan, 0.015));
    ground.addColorStop(1, withAlpha(cyan, 0.05));
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.save();
    ctx.strokeStyle = withAlpha(cyan, 0.18 + 0.1 * Math.sin(shimmer * Math.PI * 2));
    ctx.lineWidth = 1;
    ctx.shadowColor = withAlpha(cyan, 0.4);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, horizonY);
    ctx.lineTo(w * 0.92, horizonY);
    ctx.stroke();
    ctx.restore();

    var spokeOffsets = [-0.95, -0.62, -0.38, 0.38, 0.62, 0.95];
    for (var s = 0; s < spokeOffsets.length; s++) {
      var ox = spokeOffsets[s];
      var edgeX = cx + ox * w * 0.48;
      var shim = shimmerPulse(shimmer, (s + 0.5) / spokeOffsets.length);
      var col = Math.abs(ox) > 0.7 ? mag : cyan;
      ctx.save();
      ctx.strokeStyle = withAlpha(col, (0.05 + Math.abs(ox) * 0.04) * shim);
      ctx.lineWidth = 1;
      ctx.shadowColor = withAlpha(col, 0.18 * shim);
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(cx, horizonY);
      ctx.lineTo(edgeX, h);
      ctx.stroke();
      ctx.restore();
    }

    drawEdge(-1, cyan, w, h, horizonY, cx);
    drawEdge(1, cyan, w, h, horizonY, cx);

    var bands = 9;
    for (var i = 0; i < bands; i++) {
      var u = ((i + 0.5) / bands + (moving && !reduce ? drive : 0.12)) % 1;
      if (u < 0.05) continue;
      var p = project(u, w, h, horizonY);
      var shimH = shimmerPulse(shimmer, u);
      var a = (0.04 + u * 0.16) * shimH;
      ctx.save();
      ctx.strokeStyle = withAlpha(cyan, a);
      ctx.lineWidth = u > 0.75 ? 1.2 : 1;
      ctx.shadowColor = withAlpha(cyan, 0.22 * shimH);
      ctx.shadowBlur = 2 + u * 5;
      ctx.beginPath();
      ctx.moveTo(cx - p.half, p.y);
      ctx.lineTo(cx + p.half, p.y);
      ctx.stroke();
      if (i % 3 === 1) {
        ctx.strokeStyle = withAlpha(mag, a * 0.4);
        ctx.shadowColor = withAlpha(mag, 0.12 * shimH);
        ctx.beginPath();
        ctx.moveTo(cx - p.half * 0.28, p.y);
        ctx.lineTo(cx + p.half * 0.28, p.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (moving && !reduce) {
      ctx.save();
      ctx.strokeStyle = withAlpha(cyan, 0.12);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 12]);
      ctx.lineDashOffset = -drive * 48;
      ctx.beginPath();
      ctx.moveTo(cx, horizonY + 2);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEdge(side, color, w, h, horizonY, cx) {
    var near = project(1, w, h, horizonY);
    var shim = shimmerPulse(shimmer, side > 0 ? 0.3 : 0.7);
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.22 * shim);
    ctx.lineWidth = 1.35;
    ctx.shadowColor = withAlpha(color, 0.4 * shim);
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.moveTo(cx, horizonY);
    ctx.lineTo(cx + side * near.half, h);
    ctx.stroke();
    ctx.restore();
  }

  function frame(ts) {
    draw(ts);
    raf = requestAnimationFrame(frame);
  }

  function setMoving(on) {
    moving = !!on && !reduce;
    if (canvas) {
      canvas.dataset.moving = moving ? "true" : "false";
      canvas.setAttribute("aria-pressed", moving ? "true" : "false");
      canvas.title = moving
        ? "Pause grid-road motion"
        : "Play grid-road motion";
    }
  }

  function onClick(ev) {
    if (ev.target !== canvas) return;
    setMoving(!moving);
  }

  function onKey(ev) {
    if (ev.target !== canvas) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      setMoving(!moving);
    }
  }

  function start() {
    canvas = document.querySelector("[data-gridroad]");
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    reduce = prefersReduce();
    canvas.dataset.moving = "false";
    canvas.setAttribute("role", "button");
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("aria-pressed", "false");
    canvas.setAttribute(
      "aria-label",
      "Tron grid-road backdrop. Activate to toggle forward motion.",
    );
    canvas.title = "Play grid-road motion";

    size();
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("keydown", onKey);

    if (!globalThis.CW_VALUE.isUndefined(window.ResizeObserver)) {
      resizeObs = new window.ResizeObserver(function () {
        size();
      });
      resizeObs.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener("resize", size);
    }

    if (reduce) {
      size();
      draw(performance.now());
      return;
    }
    raf = requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        lastTs = 0;
      } else if (!reduce && !raf) {
        raf = requestAnimationFrame(frame);
      }
    });
  }

  window.CW_GRIDROAD = {
    start: start,
    isMoving: function () {
      return moving;
    },
    setMoving: setMoving,
  };
})();
