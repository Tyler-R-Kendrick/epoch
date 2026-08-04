// GENERATED — do not edit; npm run tokens:generate
// Source of truth: DESIGN.md frontmatter (colors, typography, rounded, spacing).

export const epochTokens = {
  colors: {
    primary: "#1a1a17",
    secondary: "#5f6058",
    tertiary: "#a300a3",
    neutral: "#f4f2ea",
    surface: "#f4f2ea",
    "surface-raised": "#ffffff",
    "surface-sunken": "#e6e3d7",
    ink: "#1a1a17",
    "ink-soft": "#33342d",
    "ink-faint": "#8d8e84",
    muted: "#5f6058",
    line: "#d5d2c4",
    "line-strong": "#a8a596",
    accent: "#a300a3",
    "accent-strong": "#7a007a",
    runnable: "#ffffff",
    rough: "#cde3bb",
    "rough-strong": "#9dc384",
    "open-land": "#f8ea9f",
    "open-land-strong": "#e0cc63",
    marsh: "#a5d8ec",
    "marsh-strong": "#6bb6d6",
    contour: "#a8703c",
    "contour-soft": "#d8b48c",
    "out-of-bounds": "#e03a2f",
    control: "#a300a3",
    gold: "#b8860b",
    teal: "#1f6f5c",
    "teal-deep": "#175346",
    "teal-hover": "#268a72",
    mint: "#d4ebe0",
    "mint-strong": "#a9d4c1",
    avatar: "#2b2b26",
    "avatar-ink": "#f4f2ea",
    rail: "#f4f2ea",
    "rail-text": "#1a1a17",
    "rail-muted": "#5f6058",
    "rail-hover": "#e9e6db",
    "rail-active": "#ffffff",
    "rail-line": "#d5d2c4",
    success: "#1f6f5c",
    "warning-bg": "#fdf3d4",
    "warning-ink": "#6b4e0c",
    "warning-line": "#d8b44a",
  },
  typography: {
    display: {
      fontFamily: "'Helvetica Neue', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "2.25rem",
      fontWeight: 750,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
    },
    headline: {
      fontFamily: "'Helvetica Neue', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "1.3125rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.015em",
    },
    title: {
      fontFamily: "'Helvetica Neue', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "1.0625rem",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "0em",
    },
    body: {
      fontFamily: "'Helvetica Neue', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "0.9375rem",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0em",
    },
    label: {
      fontFamily: "'Helvetica Neue', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif",
      fontSize: "0.8125rem",
      fontWeight: 650,
      lineHeight: 1.2,
      letterSpacing: "0.06em",
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
  --epoch-color-primary: #1a1a17;
  --epoch-color-secondary: #5f6058;
  --epoch-color-tertiary: #a300a3;
  --epoch-color-neutral: #f4f2ea;
  --epoch-color-surface: #f4f2ea;
  --epoch-color-surface-raised: #ffffff;
  --epoch-color-surface-sunken: #e6e3d7;
  --epoch-color-ink: #1a1a17;
  --epoch-color-ink-soft: #33342d;
  --epoch-color-ink-faint: #8d8e84;
  --epoch-color-muted: #5f6058;
  --epoch-color-line: #d5d2c4;
  --epoch-color-line-strong: #a8a596;
  --epoch-color-accent: #a300a3;
  --epoch-color-accent-strong: #7a007a;
  --epoch-color-runnable: #ffffff;
  --epoch-color-rough: #cde3bb;
  --epoch-color-rough-strong: #9dc384;
  --epoch-color-open-land: #f8ea9f;
  --epoch-color-open-land-strong: #e0cc63;
  --epoch-color-marsh: #a5d8ec;
  --epoch-color-marsh-strong: #6bb6d6;
  --epoch-color-contour: #a8703c;
  --epoch-color-contour-soft: #d8b48c;
  --epoch-color-out-of-bounds: #e03a2f;
  --epoch-color-control: #a300a3;
  --epoch-color-gold: #b8860b;
  --epoch-color-teal: #1f6f5c;
  --epoch-color-teal-deep: #175346;
  --epoch-color-teal-hover: #268a72;
  --epoch-color-mint: #d4ebe0;
  --epoch-color-mint-strong: #a9d4c1;
  --epoch-color-avatar: #2b2b26;
  --epoch-color-avatar-ink: #f4f2ea;
  --epoch-color-rail: #f4f2ea;
  --epoch-color-rail-text: #1a1a17;
  --epoch-color-rail-muted: #5f6058;
  --epoch-color-rail-hover: #e9e6db;
  --epoch-color-rail-active: #ffffff;
  --epoch-color-rail-line: #d5d2c4;
  --epoch-color-success: #1f6f5c;
  --epoch-color-warning-bg: #fdf3d4;
  --epoch-color-warning-ink: #6b4e0c;
  --epoch-color-warning-line: #d8b44a;
  --epoch-radius-xs: 2px;
  --epoch-radius-sm: 4px;
  --epoch-radius-md: 8px;
  --epoch-space-xs: 4px;
  --epoch-space-sm: 8px;
  --epoch-space-md: 12px;
  --epoch-space-lg: 16px;
  --epoch-space-xl: 24px;
  --epoch-space-xxl: 32px;
  --epoch-font-ui: 'Helvetica Neue', Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif;
  --epoch-font-mono: ui-monospace, Cascadia Mono, Consolas, monospace;
  --epoch-type-display-size: 2.25rem;
  --epoch-type-display-weight: 750;
  --epoch-type-display-leading: 1.05;
  --epoch-type-display-tracking: -0.02em;
  --epoch-type-headline-size: 1.3125rem;
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
  --epoch-type-label-tracking: 0.06em;
  --epoch-type-meta-size: 0.72rem;
  --epoch-type-meta-weight: 500;
  --epoch-type-meta-leading: 1.3;
  --epoch-type-meta-tracking: 0em;
}`;
