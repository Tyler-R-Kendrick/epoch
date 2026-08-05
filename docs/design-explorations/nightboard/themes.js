/**
 * Two themes, kept because they were the two that earned it.
 *
 * Eight others shipped and were cut: they were palette variations of one
 * another, which is exactly the criticism that produced this rewrite. Nightboard
 * is the lit terminal and Line Printer is the printed one — the two ends of the
 * range this product actually needs, and the two the contract has to survive.
 *
 * A theme is token values plus, at most, a few rules reaching the hooks in
 * CONTRACT.md. None loads a font, an image, or a script.
 */
window.NB_THEMES = [
  {
    id: "nightboard",
    name: "Grid",
    note: "Tron grid on terminal black — magenta chrome, cyan agents, CRT scan.",
    css: `:root{
      --nb-bg:#03050a;--nb-surface:#070b12;--nb-ink:#c8d0d8;--nb-ink-dim:#7a8896;--nb-ink-faint:#4a5560;--nb-rule:#1a2836;
      --nb-accent:#ff2cf0;--nb-accent-ink:#000;--nb-signed:#f0e050;--nb-live:#3dff6a;--nb-warn:#ffaa00;
      --nb-danger:#ff3355;--nb-agent:#40f0ff;
      --nb-glow:0 0 8px rgba(64,240,255,.18);
      --nb-scan:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,240,255,.03) 3px);
      --nb-cell:.62rem;--nb-radius:0;}
      body{text-shadow:var(--nb-glow)}
      .nb-bar{border-block-end-color:color-mix(in srgb,var(--nb-agent) 40%,var(--nb-rule))}`,
  },
  {
    id: "tape",
    name: "Line Printer",
    note: "Fanfold on a tractor feed: alternating bands, rules that look struck rather than drawn.",
    css: `:root{
      --nb-bg:#eceadf;--nb-surface:#e2dfd0;--nb-ink:#232019;--nb-ink-dim:#565044;--nb-ink-faint:#8a8375;--nb-rule:#b9b3a1;
      --nb-accent:#1f4fa3;--nb-accent-ink:#fff;--nb-signed:#7a5c12;--nb-live:#2f6b3a;--nb-warn:#8a5a0c;
      --nb-danger:#9e2b20;--nb-agent:#4a3f8a;--nb-glow:none;--nb-scan:none;--nb-cell:.6rem;}
      [data-c="post"]:nth-child(odd){background:rgba(0,0,0,.045)}
      [data-c="post"]{border-block-end-style:dotted}
      .nb-brand{box-shadow:none;border:0;background:transparent}
      .nb-brand::before{display:none}
      .nb-brand-fig{
        color:var(--nb-ink);-webkit-text-fill-color:var(--nb-ink);background:none;filter:none;animation:none!important}
      .nb-brand-tag{display:none}
      .nb-brand-scan{display:none}`,
  },
];
