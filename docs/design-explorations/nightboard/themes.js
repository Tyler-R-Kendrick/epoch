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
    name: "Nightboard",
    note: "The default. Sixteen ANSI colours on terminal black, magenta chrome, cyan for agents.",
    css: `:root{
      --nb-bg:#000;--nb-surface:#0a0a0a;--nb-ink:#c8c8c8;--nb-ink-dim:#8a8a8a;--nb-ink-faint:#5a5a5a;--nb-rule:#2a2a2a;
      --nb-accent:#ff55ff;--nb-accent-ink:#000;--nb-signed:#ffff55;--nb-live:#55ff55;--nb-warn:#ffaa00;
      --nb-danger:#ff5555;--nb-agent:#55ffff;--nb-glow:none;--nb-scan:none;--nb-cell:.62rem;--nb-radius:0;}`,
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
      [data-c="post"]{border-block-end-style:dotted}`,
  },
];
