/**
 * Optional canvas FX — the board redrawn as live ASCII around the cursor.
 *
 * This wraps CanvasUI's `asciify` (canvasui.dev), which works by placing the
 * real DOM inside a canvas with the `layoutsubtree` attribute and sampling it.
 * HTML-in-canvas is behind a flag in current Chromium and absent elsewhere, so
 * the honest position is: offer it where it works, say plainly where it does
 * not, and never let its absence change the page.
 *
 * It is deliberately opt-in and off by default. The board's own ASCII
 * (NB_ASCII) carries readings and is always on; this is a lens over the whole
 * surface and carries nothing, so it has to be asked for.
 */
(function () {
  "use strict";

  var instance = null;
  var nodes = null;
  var observer = null;

  /**
   * A canvas has an intrinsic size, not a flow size, so the board would collapse
   * the moment it moved inside one. These rules make the source canvas behave
   * like the box it replaced and float the output over it without stealing
   * clicks — the DOM underneath stays the thing you interact with.
   */
  var CSS = [
    "[data-nb-fx-host]{position:relative}",
    "[data-nb-fx-host][data-fx] .nb-fx-source{display:block;width:100%;height:100%}",
    "[data-nb-fx-host][data-fx] .nb-fx-source>*{width:100%;height:100%}",
    "[data-nb-fx-host][data-fx] .nb-fx-output{position:absolute;inset:0;width:100%;height:100%;" +
    "pointer-events:none}",
  ].join("");

  function styles() {
    var el = document.getElementById("nb-fx-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "nb-fx-css";
      el.textContent = CSS;
      document.head.appendChild(el);
    }
    return el;
  }

  /** Backing stores follow the box, at device resolution, or the glyphs blur. */
  function size() {
    if (!nodes) return;
    var r = nodes.host.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    [nodes.source, nodes.output].forEach(function (c) {
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
    });
    if (instance && instance.resize) { try { instance.resize(); } catch { /* next frame */ } }
  }

  /** Can this browser actually run it? Checked, not assumed. */
  function supported() {
    return !!(window.Asciify && window.Asciify.supportsHtmlInCanvas &&
      window.Asciify.supportsHtmlInCanvas());
  }

  function reason() {
    if (!window.Asciify) return "the asciify bundle did not load";
    return supported()
      ? ""
      : "this browser has no HTML-in-canvas (Chromium needs --enable-blink-features=CanvasDrawElement)";
  }

  /**
   * Mount the effect over the board.
   *
   * The source canvas has to *contain* the live DOM, so the board is moved into
   * it rather than copied — a copy would be a screenshot that stops responding
   * to clicks, which is exactly the failure this API exists to avoid.
   */
  function enable(options) {
    if (instance) return { ok: true, already: true };
    if (!supported()) return { ok: false, reason: reason() };

    var host = document.querySelector("[data-nb-fx-host]");
    if (!host) return { ok: false, reason: "no mount point on the page" };
    styles();

    var source = document.createElement("canvas");
    source.setAttribute("layoutsubtree", "");
    source.className = "nb-fx-source";
    var output = document.createElement("canvas");
    output.className = "nb-fx-output";
    output.setAttribute("aria-hidden", "true");

    var content = host.firstElementChild;
    if (!content) return { ok: false, reason: "nothing to draw" };

    host.appendChild(source);
    source.appendChild(content);
    host.appendChild(output);
    nodes = { host: host, source: source, content: content, output: output };
    host.setAttribute("data-fx", "on");
    size();

    try {
      instance = window.Asciify.createAsciify(
        { source: source, content: content, output: output },
        // Tuned to the board rather than left at defaults: the shade ramp is
        // the same one NB_ASCII draws with, the lens is a reading-sized patch
        // (radius is a fraction of viewport height, not pixels), and coverage
        // outside it is zero so the rest of the page stays plain text.
        Object.assign({
          charset: "blocks",
          radius: 0.22,
          softness: 0.55,
          scale: 2,
          spacing: 1,
          background: "auto",
          backgroundOpacity: 1,
          strength: 1,
          baseStrength: 0,
          followSpeed: 8,
          glow: 0.2,
          aberration: 0.08,
        }, options || {}),
      );
    } catch (err) {
      disable();
      return { ok: false, reason: (err && err.message) || String(err) };
    }
    observer = new ResizeObserver(size);
    observer.observe(host);
    return { ok: true };
  }

  /** Put the DOM back exactly where it was. An FX that cannot be undone is damage. */
  function disable() {
    if (instance && instance.destroy) { try { instance.destroy(); } catch { /* already gone */ } }
    instance = null;
    if (observer) { observer.disconnect(); observer = null; }
    if (nodes) {
      nodes.host.insertBefore(nodes.content, nodes.host.firstChild);
      if (nodes.source.parentNode) nodes.source.remove();
      if (nodes.output.parentNode) nodes.output.remove();
      nodes.host.removeAttribute("data-fx");
      nodes = null;
    }
    return { ok: true };
  }

  window.NB_FX = {
    supported: supported,
    reason: reason,
    enable: enable,
    disable: disable,
    active: function () { return !!instance; },
  };
})();
