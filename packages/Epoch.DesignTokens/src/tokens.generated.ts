// GENERATED — do not edit; npm run tokens:generate
// Source of truth: DESIGN.md frontmatter (colors, typography, rounded, spacing).

export const epochTokens = {
  colors: {
    primary: "#03050a",
    secondary: "#7a8896",
    tertiary: "#ff2cf0",
    neutral: "#03050a",
    surface: "#070b12",
    "surface-raised": "#0c121c",
    "surface-sunken": "#020408",
    ink: "#c8d0d8",
    "ink-soft": "#a0aab4",
    "ink-faint": "#7a8896",
    muted: "#7a8896",
    line: "#1a2836",
    "line-strong": "#2a3c50",
    accent: "#ff2cf0",
    "accent-strong": "#ff66f5",
    "accent-ink": "#000000",
    agent: "#40f0ff",
    signed: "#f0e050",
    live: "#3dff6a",
    warn: "#ffaa00",
    danger: "#ff3355",
    control: "#ff2cf0",
    gold: "#f0e050",
    teal: "#40f0ff",
    "teal-deep": "#1a90a0",
    rail: "#070b12",
    "rail-text": "#c8d0d8",
    "rail-muted": "#7a8896",
    "rail-hover": "#0c121c",
    "rail-active": "#0c121c",
    "rail-line": "#1a2836",
    success: "#3dff6a",
    "warning-bg": "#1a1400",
    "warning-ink": "#ffaa00",
    "warning-line": "#ffaa00",
    avatar: "#0c121c",
    "avatar-ink": "#c8d0d8",
    runnable: "#0c121c",
    rough: "#1a2836",
    "rough-strong": "#2a3c50",
    "open-land": "#f0e050",
    "open-land-strong": "#f0e050",
    marsh: "#40f0ff",
    "marsh-strong": "#1a90a0",
    mint: "#3dff6a",
    "mint-strong": "#3dff6a",
    "out-of-bounds": "#ff3355",
  },
  typography: {
    display: {
      fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace",
      fontSize: "1.25rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "0.02em",
    },
    headline: {
      fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace",
      fontSize: "1rem",
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "0em",
    },
    title: {
      fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace",
      fontSize: "0.875rem",
      fontWeight: 700,
      lineHeight: 1.35,
      letterSpacing: "0em",
    },
    body: {
      fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace",
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0em",
    },
    label: {
      fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace",
      fontSize: "0.8125rem",
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "0.04em",
    },
    meta: {
      fontFamily: "ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace",
      fontSize: "0.75rem",
      fontWeight: 500,
      lineHeight: 1.35,
      letterSpacing: "0em",
    },
  },
  rounded: {
    none: "0px",
    xs: "0px",
    sm: "0px",
    md: "0px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
  },
} as const;

export const epochTokensCss: string = `:root {
  color-scheme: light;
  --epoch-color-primary: #03050a;
  --epoch-color-secondary: #7a8896;
  --epoch-color-tertiary: #ff2cf0;
  --epoch-color-neutral: #03050a;
  --epoch-color-surface: #070b12;
  --epoch-color-surface-raised: #0c121c;
  --epoch-color-surface-sunken: #020408;
  --epoch-color-ink: #c8d0d8;
  --epoch-color-ink-soft: #a0aab4;
  --epoch-color-ink-faint: #7a8896;
  --epoch-color-muted: #7a8896;
  --epoch-color-line: #1a2836;
  --epoch-color-line-strong: #2a3c50;
  --epoch-color-accent: #ff2cf0;
  --epoch-color-accent-strong: #ff66f5;
  --epoch-color-accent-ink: #000000;
  --epoch-color-agent: #40f0ff;
  --epoch-color-signed: #f0e050;
  --epoch-color-live: #3dff6a;
  --epoch-color-warn: #ffaa00;
  --epoch-color-danger: #ff3355;
  --epoch-color-control: #ff2cf0;
  --epoch-color-gold: #f0e050;
  --epoch-color-teal: #40f0ff;
  --epoch-color-teal-deep: #1a90a0;
  --epoch-color-rail: #070b12;
  --epoch-color-rail-text: #c8d0d8;
  --epoch-color-rail-muted: #7a8896;
  --epoch-color-rail-hover: #0c121c;
  --epoch-color-rail-active: #0c121c;
  --epoch-color-rail-line: #1a2836;
  --epoch-color-success: #3dff6a;
  --epoch-color-warning-bg: #1a1400;
  --epoch-color-warning-ink: #ffaa00;
  --epoch-color-warning-line: #ffaa00;
  --epoch-color-avatar: #0c121c;
  --epoch-color-avatar-ink: #c8d0d8;
  --epoch-color-runnable: #0c121c;
  --epoch-color-rough: #1a2836;
  --epoch-color-rough-strong: #2a3c50;
  --epoch-color-open-land: #f0e050;
  --epoch-color-open-land-strong: #f0e050;
  --epoch-color-marsh: #40f0ff;
  --epoch-color-marsh-strong: #1a90a0;
  --epoch-color-mint: #3dff6a;
  --epoch-color-mint-strong: #3dff6a;
  --epoch-color-out-of-bounds: #ff3355;
  --epoch-radius-xs: 0px;
  --epoch-radius-sm: 0px;
  --epoch-radius-md: 0px;
  --epoch-space-xs: 4px;
  --epoch-space-sm: 8px;
  --epoch-space-md: 12px;
  --epoch-space-lg: 16px;
  --epoch-space-xl: 24px;
  --epoch-space-xxl: 32px;
  --epoch-font-ui: ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace;
  --epoch-font-mono: ui-monospace, Cascadia Mono, DejaVu Sans Mono, Consolas, monospace;
  --epoch-type-display-size: 1.25rem;
  --epoch-type-display-weight: 700;
  --epoch-type-display-leading: 1.2;
  --epoch-type-display-tracking: 0.02em;
  --epoch-type-headline-size: 1rem;
  --epoch-type-headline-weight: 700;
  --epoch-type-headline-leading: 1.3;
  --epoch-type-headline-tracking: 0em;
  --epoch-type-title-size: 0.875rem;
  --epoch-type-title-weight: 700;
  --epoch-type-title-leading: 1.35;
  --epoch-type-title-tracking: 0em;
  --epoch-type-body-size: 0.875rem;
  --epoch-type-body-weight: 400;
  --epoch-type-body-leading: 1.5;
  --epoch-type-body-tracking: 0em;
  --epoch-type-label-size: 0.8125rem;
  --epoch-type-label-weight: 700;
  --epoch-type-label-leading: 1.3;
  --epoch-type-label-tracking: 0.04em;
  --epoch-type-meta-size: 0.75rem;
  --epoch-type-meta-weight: 500;
  --epoch-type-meta-leading: 1.35;
  --epoch-type-meta-tracking: 0em;
}`;
