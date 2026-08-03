# Community Web Evidence

This folder stores browser evidence for the Community Web channel experience.

- [`community_web.feature.json`](community_web.feature.json) records the Cucumber scenario run.
- [`community_web.webm`](community_web.webm) records the Playwright browser session.
- [`axe.json`](axe.json) records the axe-core accessibility run (WCAG 2.1 A/AA)
  at 1440×960 and 390×844, produced by `npm run a11y:community-web`. Serious and
  critical violations fail the gate; the file is the falsifiable evidence the
  screen-reader persona reviews instead of a screenshot.
