---
product: Trae
design_surface: ai_native_ide_and_solo_workspace
last_researched: 2026-06-06
sources:
  - https://www.trae.ai/solo
  - https://www.trae.ai/blog/product_solo?v=1
  - https://traesolo.net/docs/solo-mode.html
  - https://traesolo.net/docs/solo-builder
---

# Trae Design

## Look and Feel

Trae's public SOLO pages use a glossy AI-product visual language: dark immersive sections, product screenshots, animated workflow claims, and repeated emphasis on a unified visual workspace. The product UI described in docs is a three-part SOLO mode: task management panel, AI chat panel, and tool panel. Public copy highlights a top-left mode switch between IDE and SOLO, browser-based select-and-edit, PRD-style planning, and integrated editor, browser, terminal, and documentation views.

## Design References

- SOLO product page: https://www.trae.ai/solo
- SOLO launch blog: https://www.trae.ai/blog/product_solo?v=1
- SOLO mode documentation: https://traesolo.net/docs/solo-mode.html
- SOLO Builder documentation: https://traesolo.net/docs/solo-builder

## Design Tokens and Visual System

Trae does not expose an open design-token package. The observed public system is a high-contrast AI workspace brand with dense product screenshots, dark backgrounds, visual mode cards, and motion/video references. The product experience appears to rely on IDE familiarity plus agent-mode panels rather than an independent open design system.

## What Differentiates the Design

- The agent is not hidden in a chat sidebar; SOLO is presented as a full workspace mode.
- Planning artifacts, TODOs, browser previews, docs, terminal output, and code are designed to be visible in one environment.
- Select-and-edit in the browser gives non-editor interaction to visual builders.
- Mobile SOLO extends the "dispatch and review anywhere" story beyond the desktop IDE.

## What Is Good

- The visual supervision model helps users understand agent progress without reading only terminal logs.
- Mode switching gives developers a way to choose between assisted IDE work and more autonomous SOLO work.
- Builder and Coder roles communicate different job boundaries.
- Product copy frames planning before code, which reduces ambiguity for app-builder scenarios.

## Where It Breaks Down

- The same breadth that makes Trae impressive can create heavy mode and plan complexity.
- Pricing, token usage, model routing, and agent orchestration are not as visually accountable as the workspace itself.
- Trust can break when telemetry, data routing, or model-identity concerns are discussed outside the UI rather than reflected in product controls.
- A glossy AI workspace may capture builders quickly but can alienate security-sensitive maintainers who want plain repository evidence.
