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
      --nb-bg:#03050a;--nb-surface:#070b12;--nb-ink:#c8d0d8;--nb-ink-dim:#7a8896;--nb-ink-faint:#7a8896;--nb-rule:#1a2836;
      --nb-accent:#ff2cf0;--nb-accent-ink:#000;--nb-signed:#7dff9a;--nb-live:#3dff6a;--nb-warn:#ffaa00;
      --nb-danger:#ff3355;--nb-agent:#40f0ff;
      --nb-glow:0 0 8px rgba(64,240,255,.18);
      --nb-scan:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,240,255,.03) 3px);
      --nb-cell:.62rem;--nb-radius:0;}
      body{text-shadow:var(--nb-glow)}
      .nb-bar{border-block-end-color:color-mix(in srgb,var(--nb-agent) 40%,var(--nb-rule))}`,
  },
];
