# ADR-0010: Epoch Community Design System

Status: Accepted

## Context

`Epoch.Community.Web` previously rendered valid but unstyled HTML. That made
the separate Community product technically deployable while giving users no
clear visual hierarchy, no product identity, and no reusable interface contract
for future screens.

Community is not the hosting control plane. It needs to feel like a repository
collaboration product for signed history, reviews, releases, maintainers, and
public discovery. The design also has to remain small enough for the current
static renderer and strict enough that future agents do not drift back to
default browser output.

## Decision

Epoch Community now ships a product design system at the shell layer:

- root CSS custom properties for color, spacing, radius, shadows, and typography;
- a skip link and visible focus treatment for keyboard navigation;
- a restrained light interface using mist surface, ink structure, copper action,
  teal support, and gold verification signals;
- a responsive workflow rail backed by Core workflow data;
- repository cards with maintainers, topics, issue counts, change proposal
  counts, and concrete workflow links;
- an accessible signed-history SVG graph as the signature visual asset; and
- root `DESIGN.md` plus `.impeccable/design.json` so design tokens and component
  snippets are machine-readable for future UI work.

The package remains dependency-free and server-rendered. The design-system
contract is covered by a unit render test and by the Playwright-backed
`features/platform_projects.feature` browser scenario.

## Consequences

Community Web has a real visual baseline without introducing React, a CSS
framework, or a separate asset pipeline. The static HTML remains deployable
through the existing Vercel render script, and future Community UI changes can
reuse the documented tokens and component rules.

The renderer now contains more inline CSS than before. That is acceptable for
the current static package, but if Community Web grows multiple screens, the
CSS should move into a package-local stylesheet or component module while
preserving the same token contract and tests.

## Revisit Criteria

Revisit this decision when Community Web adds interactive filters, forms,
client-side routing, authenticated sessions, or a component build pipeline. At
that point, extract the shell styles into reusable components and update
`DESIGN.md`, `.impeccable/design.json`, and the Playwright scenario together.
