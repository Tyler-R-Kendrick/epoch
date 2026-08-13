# Community Web Evidence

This folder stores browser evidence for the Community Web design exploration.

- [`axe.json`](axe.json) records the axe-core accessibility run (WCAG 2.1 A/AA)
  at 1440×960 and 390×844, produced by `npm run community-web:app:a11y`. Serious and
  critical violations fail the gate; the file is the falsifiable evidence for
  keyboard and screen-reader accessibility of the TUI board.
