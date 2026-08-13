/**
 * Built-in board theme. Grid is the only shipped look — a lit Tron terminal
 * on black. Additional palettes were cut; the dropdown that switched them is
 * gone. Agents switch looks via `theme_use` / `theme_set` (legacy `/theme`
 * still resolves but is not in slash autocomplete).
 *
 * A theme is token values plus, at most, a few rules reaching the hooks in
 * CONTRACT.md. None loads a font, an image, or a script.
 */
window.CW_THEMES = [
  {
    id: "grid",
    name: "Grid",
    note: "Tron grid on terminal black — magenta chrome, cyan agents, CRT scan.",
    css: `:root{
      --cw-bg:#03050a;--cw-surface:#070b12;--cw-ink:#c8d0d8;--cw-ink-dim:#7a8896;--cw-ink-faint:#7a8896;--cw-rule:#1a2836;
      --cw-accent:#ff2cf0;--cw-accent-ink:#000;--cw-signed:#7dff9a;--cw-live:#3dff6a;--cw-warn:#ffaa00;
      --cw-danger:#ff3355;--cw-agent:#40f0ff;
      --cw-glow:0 0 8px rgba(64,240,255,.18);
      --cw-scan:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,240,255,.03) 3px);
      --cw-cell:.62rem;--cw-radius:0;}
      body{text-shadow:var(--cw-glow)}
      .cw-bar{border-block-end-color:color-mix(in srgb,var(--cw-agent) 40%,var(--cw-rule))}`,
  },
];
