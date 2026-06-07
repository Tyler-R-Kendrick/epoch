---
product: Figma Make
slug: figma-make
design_sources:
  - https://www.figma.com/make/
  - https://developers.figma.com/docs/code/intro-to-figma-make/
  - https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits
  - https://help.figma.com/hc/en-us/articles/36400680326551-Select-an-AI-model-to-use-in-Figma-Make
  - https://help.figma.com/hc/en-us/articles/31304586129559-Publish-update-or-unpublish-a-functional-prototype-or-web-app
---

# Design

## Look And Feel

Figma Make feels like an extension of the Figma canvas: prompt panel, generated preview, direct visual edits, code view, reusable design context, Make settings, and publishing controls live near the design artifacts users already understand. The public product pages use Figma's bright, gallery-like visual language and showcase community-generated prototypes as evidence of creative breadth.

## Open Design Artifacts

- Figma's product and developer docs define Make as AI chat, code editor, functional prototype, web app, package context, design-system context, and publishable artifact.
- Make kits document the design-token and component-system boundary: npm packages, Figma variables/styles, and written guidelines.
- Publish settings expose title, description, language, analytics ID, search exclusion, favicon, access control, social image, and custom head/body code.
- Model selector docs show Figma Make as a credit-metered, multi-model generation surface.

## Differentiators

- The design source is first-class: users can start from Figma frames, libraries, variables, styles, and Make kits.
- The output remains close to designers through direct editing and copy-to-design-layer workflows.
- MCP connectors turn product docs, issues, PRs, and workspace data into app-generation context.
- Publishing settings make the prototype feel like a shareable app instead of only a canvas experiment.

## What Works Well

- Designers can keep brand and component context in the same workspace where generation happens.
- Product teams can explore many high-fidelity directions before engineering commits to implementation.
- Make kits reduce the "generic AI UI" problem by providing real product components and usage guidelines.
- Connector permissions create an admin-visible governance point for external data.

## Where It Breaks Down

- Credit use and model choice can become hard to predict when users iterate visually and through prompts.
- Design-native confidence can hide backend, data, deployment, and security complexity.
- Connector context is powerful but raises trust questions when private docs, issues, or code guide generation.
- Moving from a convincing functional prototype to maintainable production code still needs engineering evidence.
