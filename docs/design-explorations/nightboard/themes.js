/**
 * Ten themes, all of them Nightboard.
 *
 * These are variants of one world rather than ten unrelated worlds: same
 * character grid, same numbered exits, same command line. What changes is the
 * phosphor — the palette, the glow, the scan, the cell size and the rhythm.
 * That is the point of a zen garden, and it is also the honest test of the
 * contract: if a theme needs markup, the contract is wrong.
 *
 * Every theme is token values plus, at most, a few rules that reach the hooks in
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
    id: "phosphor",
    name: "Green Phosphor",
    note: "A P1 tube at 2 a.m.: one hue, real bloom, scanlines you can feel.",
    css: `:root{
      --nb-bg:#020a04;--nb-surface:#05170a;--nb-ink:#5dfb9a;--nb-ink-dim:#2f9d5f;--nb-ink-faint:#1c6b3f;--nb-rule:#123d22;
      --nb-accent:#b6ffcf;--nb-accent-ink:#02150a;--nb-signed:#a9ff6a;--nb-live:#5dfb9a;--nb-warn:#d8ff5d;
      --nb-danger:#ff8f6a;--nb-agent:#8affc8;
      --nb-glow:0 0 6px rgba(93,251,154,.45);--nb-radius:0;
      --nb-scan:repeating-linear-gradient(180deg,rgba(0,0,0,.34) 0 1px,transparent 1px 3px);}`,
  },
  {
    id: "amber",
    name: "Amber CRT",
    note: "The kinder monochrome. Warm, lower contrast, easier for a long watch.",
    css: `:root{
      --nb-bg:#140c02;--nb-surface:#1d1204;--nb-ink:#ffb440;--nb-ink-dim:#b57a24;--nb-ink-faint:#7d5316;--nb-rule:#3a2609;
      --nb-accent:#ffe0a3;--nb-accent-ink:#1a1002;--nb-signed:#ffd166;--nb-live:#c8e06a;--nb-warn:#ff9a3c;
      --nb-danger:#ff7a5c;--nb-agent:#ffd9a0;
      --nb-glow:0 0 5px rgba(255,180,64,.4);
      --nb-scan:repeating-linear-gradient(180deg,rgba(0,0,0,.3) 0 1px,transparent 1px 3px);}`,
  },
  {
    id: "cga",
    name: "IBM CGA",
    note: "Text mode, not the four-colour graphics palette: sixteen inks, cyan chrome, magenta reserved.",
    css: `:root{
      --nb-bg:#000;--nb-surface:#000;--nb-ink:#fff;--nb-ink-dim:#55ffff;--nb-ink-faint:#00a8a8;--nb-rule:#00a8a8;
      --nb-accent:#ff55ff;--nb-accent-ink:#000;--nb-signed:#ffff55;--nb-live:#55ff55;--nb-warn:#ffaa00;
      --nb-danger:#ff5555;--nb-agent:#55ffff;--nb-glow:none;--nb-scan:none;--nb-cell:.66rem;}
      [data-c="post"]{border-block-end-style:dashed}`,
  },
  {
    id: "c64",
    name: "Breadbin",
    note: "A home computer on a portable telly: violet ground, a printed border, chunky cells.",
    css: `:root{
      --nb-bg:#40318d;--nb-surface:#4a3ba0;--nb-ink:#e8e5ff;--nb-ink-dim:#c5bfff;--nb-ink-faint:#a49cf0;--nb-rule:#6f66c4;
      --nb-accent:#fff45c;--nb-accent-ink:#2a2170;--nb-signed:#fff45c;--nb-live:#8ef58a;--nb-warn:#ffb46b;
      --nb-danger:#ff8a8a;--nb-agent:#8ee8ff;--nb-glow:none;--nb-scan:none;--nb-cell:.72rem;--nb-line:1.6;}
      [data-region="stream"],[data-region="rail"]{border-color:#7d75d0}
      [data-c="post"]{border-block-end-color:#5b52b4}`,
  },
  {
    id: "teletext",
    name: "Teletext",
    note: "Broadcast pages: saturated primaries on true black, blocky and unafraid.",
    css: `:root{
      --nb-bg:#000;--nb-surface:#101010;--nb-ink:#fff;--nb-ink-dim:#00ff00;--nb-ink-faint:#008a8a;--nb-rule:#1f1f1f;
      --nb-accent:#ff00ff;--nb-accent-ink:#000;--nb-signed:#ffff00;--nb-live:#00ff00;--nb-warn:#ffff00;
      --nb-danger:#ff0000;--nb-agent:#00ffff;--nb-glow:none;--nb-scan:none;--nb-cell:.7rem;--nb-line:1.55;}
      .nb-group-label{background:#0000aa;color:#fff}
      [data-c="notice"]{background:#aa0000;color:#fff}`,
  },
  {
    id: "paperwhite",
    name: "Paper Terminal",
    note: "The board printed rather than lit — for daylight, and for anyone the glow tires.",
    css: `:root{
      --nb-bg:#f4f2ea;--nb-surface:#eae7dc;--nb-ink:#1a1a17;--nb-ink-dim:#5a5a52;--nb-ink-faint:#8b8b80;--nb-rule:#cfccbf;
      --nb-accent:#a300a3;--nb-accent-ink:#fff;--nb-signed:#8a6d1f;--nb-live:#1f6f5c;--nb-warn:#8a5a0c;
      --nb-danger:#b0281c;--nb-agent:#1c5f80;--nb-glow:none;--nb-scan:none;}`,
  },
  {
    id: "solar",
    name: "Solar Night",
    note: "Muted, low-contrast, tuned for hours rather than minutes.",
    css: `:root{
      --nb-bg:#002b36;--nb-surface:#073642;--nb-ink:#cbd4d4;--nb-ink-dim:#9aa8a8;--nb-ink-faint:#6d8189;--nb-rule:#0d4a58;
      --nb-accent:#d33682;--nb-accent-ink:#002b36;--nb-signed:#b58900;--nb-live:#859900;--nb-warn:#cb4b16;
      --nb-danger:#dc322f;--nb-agent:#2aa198;--nb-glow:none;--nb-scan:none;}`,
  },
  {
    id: "hivis",
    name: "High Contrast",
    note: "Maximum separation and no ornament, for low vision and bright rooms.",
    css: `:root{
      --nb-bg:#000;--nb-surface:#000;--nb-ink:#fff;--nb-ink-dim:#e0e0e0;--nb-ink-faint:#bdbdbd;--nb-rule:#fff;
      --nb-accent:#ffff00;--nb-accent-ink:#000;--nb-signed:#ffff00;--nb-live:#00ff00;--nb-warn:#ffaa00;
      --nb-danger:#ff4040;--nb-agent:#00ffff;--nb-glow:none;--nb-scan:none;--nb-line:1.65;}
      body{font-size:15px}
      [data-c="post"]{border-block-end-width:2px}
      [data-c="action"]{border-width:2px}`,
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
