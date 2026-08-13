/**
 * Community Web 16-bit iconography pack.
 *
 * Pixel-art icons on a 24×24 grid, rendered with `currentColor` so chrome
 * themes tint them. Source: pixelarticons (MIT) — https://pixelarticons.com
 * Vendored paths only; display at 16×16 with image-rendering: pixelated.
 */
(function () {
  "use strict";

  /** Inline SVG shell — fill inherits from the control's color. */
  function svg(path, opts) {
    opts = opts || {};
    var label = opts.label || "";
    return '<svg class="cw-ico" xmlns="http://www.w3.org/2000/svg" width="16" height="16"' +
      ' viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"' +
      (label ? ' role="img" aria-label="' + label + '"' : "") + ">" +
      path +
      "</svg>";
  }

  // pixelarticons `mic` — free set, MIT (Gerrit Halfmann).
  var MIC_PATH =
    '<path d="M10 2h4v2h-4zM8 4h2v10H8zm2 10h4v2h-4zm4-10h2v10h-2zM4 10h2v6H4zm2 6h2v2H6zm2 2h8v2H8zm8-2h2v2h-2zm2-6h2v6h-2zm-7 10h2v2h-2z"/>';

  // pixelarticons `mic-off` — listening / muted mark when STT is live.
  var MIC_OFF_PATH =
    '<path d="M10 2h4v2h-4zM8 8h2v6H8zm2 6h4v2h-4zm4-10h2v6h-2zM4 10h2v6H4zm2 6h2v2H6zm2 2h8v2H8zm8-2h2v2h-2zm-2-2h2v2h-2zm-2-2h2v2h-2zm-2-2h2v2h-2z"/>' +
    '<path d="M8 8h2v2H8zM6 6h2v2H6zM4 4h2v2H4zM2 2h2v2H2zm16 16h2v2h-2zm2 2h2v2h-2zm-2-10h2v4h-2zm-7 10h2v2h-2z"/>';

  function mic(opts) {
    opts = opts || {};
    return svg(opts.off ? MIC_OFF_PATH : MIC_PATH, {
      label: opts.label || (opts.off ? "microphone off" : "microphone"),
    });
  }

  window.CW_ICONS = {
    pack: "pixelarticons",
    grid: 24,
    display: 16,
    mic: mic,
    svg: svg,
  };
})();
