---
name: Epoch Community
description: A trust-first community interface for signed repository collaboration.
colors:
  surface: "#eef3f1"
  surface-raised: "#fbfbf8"
  ink: "#17221f"
  muted: "#5f6a65"
  line: "#cad8d2"
  accent: "#ba5e3f"
  accent-strong: "#843927"
  teal: "#2f7370"
  mint: "#d8ece5"
  gold: "#d8b765"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "44px"
  repository-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "24px"
  workflow-link:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Epoch Community

## 1. Overview

**Creative North Star: "The Signed Civic Workshop"**

Epoch Community is a product interface for people who need repository collaboration to feel accountable, local, and calm. The design should read as a working surface for maintainers: clear hierarchy, compact activity signals, visible trust structure, and enough warmth to feel public without sliding into social feed noise.

The interface rejects default browser styling, generic SaaS hero drama, decorative glass, gradient text, oversized cards, and dark terminal cosplay. It should feel like a practical community workbench where signed events, maintainers, reviews, and releases are easy to scan.

**Key Characteristics:**

- Restrained product density with generous row and card breathing room.
- Mist green surface, near-black ink, copper action accents, teal state support, and a small gold signal for verified history.
- System typography tuned for task clarity rather than brand spectacle.
- Cards are used only for repository records and workflow entry points.
- Motion is state feedback only: hover lift, focus ring, and reduced-motion compliance.

## 2. Colors

The palette is a cool civic workshop palette: mist surface, ink structure, copper action, teal support, and gold verification.

### Primary

- **Civic Ink**: The default text, primary button, brand mark, and graph rail color. It anchors the product and keeps the interface serious.
- **Copper Action**: The primary accent for action states, section eyebrows, and high-signal hover treatment. Use it sparingly.

### Secondary

- **Registry Teal**: Workflow and topic support color. It appears in the event graph and topic chips.
- **Verified Gold**: A small verification signal used only where signed history or release confidence needs emphasis.

### Neutral

- **Mist Surface**: The page background token. It prevents the app from reading as default white.
- **Raised Parchment**: The card and panel surface token. It is close to neutral, not decorative cream.
- **Quiet Muted**: Secondary text, purposes, and descriptions.
- **Ledger Line**: Borders and dividers.

### Named Rules

**The Surface Is Product Rule.** The page background must always expose the design system token, never the browser default.

**The Copper Rarity Rule.** Copper is for action and attention only. Do not use it as broad decoration or inactive chrome.

## 3. Typography

**Display Font:** System UI stack with platform-native fallbacks.
**Body Font:** System UI stack with platform-native fallbacks.
**Label/Mono Font:** System UI stack with tabular numeric features where counts appear.

**Character:** Typography is sober and operational. Display type can be large in the first viewport, but labels, cards, nav, and data stay compact and native.

### Hierarchy

- **Display** (800, 4rem, 0.95): App name in the first viewport only.
- **Headline** (800, 1.85rem, 1.1): Section titles such as repository lists.
- **Title** (800, 1.1rem, 1.2): Repository names and workflow labels.
- **Body** (400, 1rem, 1.6): Repository descriptions and explanatory copy, capped around 65ch.
- **Label** (800, 0.78rem, 0 letter spacing): Eyebrows, visibility states, topic chips, and compact UI labels.

### Named Rules

**The Product Type Rule.** Do not introduce display fonts or decorative type in Community UI. The work is the product.

## 4. Elevation

Epoch Community uses tonal layering first and shadows second. Repository cards rest flat with a border. Workflow tiles and the signed-history preview may lift on hover or sit above the surface with one low, soft shadow.

### Shadow Vocabulary

- **Low Product Lift**: Use for the signed-history panel and hoverable workflow links. It should feel like depth, not decoration.
- **Card Rest**: Repository cards use border and a one-pixel tonal shadow only.

### Named Rules

**The Flat Until Useful Rule.** Surfaces are flat at rest unless the element is a framed tool or a hoverable workflow target.

## 5. Components

### Buttons

- **Shape:** Precise rectangle with slight rounding (4px).
- **Primary:** Civic Ink background, Raised Parchment text, 44px minimum height.
- **Hover / Focus:** Copper Strong hover background for primary actions, visible 3px copper focus ring on all links and buttons.
- **Secondary / Ghost / Tertiary:** Raised surface, Ledger Line border, ink text. Use for alternate workflow links.

### Chips

- **Style:** Mist and teal tint with pill shape for repository topics.
- **State:** Chips are informational only in the current shell. Do not make them look like active filters until filtering exists.

### Cards / Containers

- **Corner Style:** Slightly rounded (8px).
- **Background:** Raised Parchment on Mist Surface.
- **Shadow Strategy:** Repository cards use Card Rest. Workflow links use Low Product Lift only on hover.
- **Border:** Ledger Line, always present.
- **Internal Padding:** 24px on repository cards, 16px on workflow links.

### Inputs / Fields

The current Community shell does not ship input controls. Future inputs must use Raised Parchment background, Ledger Line border, 4px radius, 44px minimum height, and the same copper focus ring.

### Navigation

Top navigation is compact and utility-first. The workflow rail is horizontally scrollable on small screens, grid-based on desktop, and every link carries both label and purpose.

### Signed History Graph

The graph is the signature visual. It should remain an accessible SVG with a title and description, using the palette roles directly: ink rails, teal support path, copper source node, gold verification node.

## 6. Do's and Don'ts

### Do:

- **Do** expose CSS custom properties on `:root` so browser tests and future agents can verify the design system.
- **Do** keep cards at 8px radius or below.
- **Do** use semantic landmarks, skip links, visible focus, and reduced-motion handling.
- **Do** keep repository actions concrete: Browse, View Issues, Review Changes.
- **Do** keep Community visually separate from the hosting control plane while preserving shared product discipline.

### Don't:

- **Don't** ship default browser typography, link lists, or white backgrounds.
- **Don't** use gradient text, decorative glass, side-stripe borders, or hero-metric templates.
- **Don't** add inactive saturated color, purple-blue gradients, dark terminal theming, or beige-only palettes.
- **Don't** create dead controls. If an element looks actionable, it must navigate to a route or section.
- **Don't** hide Community workflows in desktop-only navigation. Mobile users must still reach the workflow rail.
