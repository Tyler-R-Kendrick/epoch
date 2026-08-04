// GENERATED — do not edit; npm run tokens:generate
// Source of truth: DESIGN.md frontmatter (colors, typography, rounded, spacing).

export const epochTokens = {
  colors: {
    primary: "#0f1614",
    secondary: "#5c6762",
    tertiary: "#b4532f",
    neutral: "#ecefea",
    surface: "#ecefea",
    "surface-raised": "#ffffff",
    "surface-sunken": "#dfe4dd",
    ink: "#0f1614",
    "ink-soft": "#2d3531",
    "ink-faint": "#a0aaa4",
    muted: "#5c6762",
    line: "#d2d9d2",
    "line-strong": "#a6b1a8",
    accent: "#b4532f",
    "accent-strong": "#8f3f28",
    teal: "#2a6f6c",
    "teal-deep": "#215955",
    "teal-hover": "#32807c",
    mint: "#d5ebe3",
    "mint-strong": "#b7d8c8",
    gold: "#c9a24a",
    avatar: "#1f3d34",
    "avatar-ink": "#e8f3ee",
    rail: "#101714",
    "rail-text": "#d7e2dc",
    "rail-muted": "#8fa099",
    "rail-hover": "#1a2420",
    "rail-active": "#24322c",
    "rail-line": "#1c2622",
    success: "#1a5c3e",
    "warning-bg": "#fff6df",
    "warning-ink": "#5b4420",
    "warning-line": "#e0c991",
  },
  typography: {
    display: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "2.5rem",
      fontWeight: 750,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
    },
    headline: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "1.375rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.015em",
    },
    title: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "1.0625rem",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "0em",
    },
    body: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "0.9375rem",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0em",
    },
    label: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "0.8125rem",
      fontWeight: 650,
      lineHeight: 1.2,
      letterSpacing: "0em",
    },
    meta: {
      fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace",
      fontSize: "0.72rem",
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: "0em",
    },
  },
  rounded: {
    xs: "2px",
    sm: "4px",
    md: "8px",
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
  --epoch-color-primary: #0f1614;
  --epoch-color-secondary: #5c6762;
  --epoch-color-tertiary: #b4532f;
  --epoch-color-neutral: #ecefea;
  --epoch-color-surface: #ecefea;
  --epoch-color-surface-raised: #ffffff;
  --epoch-color-surface-sunken: #dfe4dd;
  --epoch-color-ink: #0f1614;
  --epoch-color-ink-soft: #2d3531;
  --epoch-color-ink-faint: #a0aaa4;
  --epoch-color-muted: #5c6762;
  --epoch-color-line: #d2d9d2;
  --epoch-color-line-strong: #a6b1a8;
  --epoch-color-accent: #b4532f;
  --epoch-color-accent-strong: #8f3f28;
  --epoch-color-teal: #2a6f6c;
  --epoch-color-teal-deep: #215955;
  --epoch-color-teal-hover: #32807c;
  --epoch-color-mint: #d5ebe3;
  --epoch-color-mint-strong: #b7d8c8;
  --epoch-color-gold: #c9a24a;
  --epoch-color-avatar: #1f3d34;
  --epoch-color-avatar-ink: #e8f3ee;
  --epoch-color-rail: #101714;
  --epoch-color-rail-text: #d7e2dc;
  --epoch-color-rail-muted: #8fa099;
  --epoch-color-rail-hover: #1a2420;
  --epoch-color-rail-active: #24322c;
  --epoch-color-rail-line: #1c2622;
  --epoch-color-success: #1a5c3e;
  --epoch-color-warning-bg: #fff6df;
  --epoch-color-warning-ink: #5b4420;
  --epoch-color-warning-line: #e0c991;
  --epoch-radius-xs: 2px;
  --epoch-radius-sm: 4px;
  --epoch-radius-md: 8px;
  --epoch-space-xs: 4px;
  --epoch-space-sm: 8px;
  --epoch-space-md: 12px;
  --epoch-space-lg: 16px;
  --epoch-space-xl: 24px;
  --epoch-space-xxl: 32px;
  --epoch-font-ui: -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif;
  --epoch-font-mono: ui-monospace, Cascadia Mono, Consolas, monospace;
  --epoch-type-display-size: 2.5rem;
  --epoch-type-display-weight: 750;
  --epoch-type-display-leading: 1.05;
  --epoch-type-display-tracking: -0.02em;
  --epoch-type-headline-size: 1.375rem;
  --epoch-type-headline-weight: 700;
  --epoch-type-headline-leading: 1.2;
  --epoch-type-headline-tracking: -0.015em;
  --epoch-type-title-size: 1.0625rem;
  --epoch-type-title-weight: 700;
  --epoch-type-title-leading: 1.25;
  --epoch-type-title-tracking: 0em;
  --epoch-type-body-size: 0.9375rem;
  --epoch-type-body-weight: 400;
  --epoch-type-body-leading: 1.5;
  --epoch-type-body-tracking: 0em;
  --epoch-type-label-size: 0.8125rem;
  --epoch-type-label-weight: 650;
  --epoch-type-label-leading: 1.2;
  --epoch-type-label-tracking: 0em;
  --epoch-type-meta-size: 0.72rem;
  --epoch-type-meta-weight: 500;
  --epoch-type-meta-leading: 1.3;
  --epoch-type-meta-tracking: 0em;
}`;
