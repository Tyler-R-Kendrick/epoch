# Community Web feed/thread nav + receipt chrome

Persona-visible Community Web changes from the 2026-08-20 session:

1. **Standard social nav** — channel feeds show roots-only posts with reply counts; threads are a single-column APG tree (no outline/reading split).
2. **Receipt locators** — `sig:…` / `intent://…` buttons keep Bracket Rule chrome + `--cw-signed` (never native UA button chrome), gated by `community-web:app:design-lint`.

## Replay

```bash
npm run gate:commit
npm run community-web:app:design-lint
CW_E2E=NAV- npm run community-web:app:e2e
# or broader:
npm run community-web:app:parity
```

## Personas

- `@persona.github_open_source_contributor`
- Maintainer / screen-reader power user (thread topology)

## Artifacts

- Adversarial critique (updated): [`../community-web-app-navigation-projection-parity/adversarial-critique.md`](../community-web-app-navigation-projection-parity/adversarial-critique.md)
- Parity pack: [`../community-web-app-navigation-projection-parity/README.md`](../community-web-app-navigation-projection-parity/README.md)
- Design gate: `scripts/lint-community-web-app-design.mjs`
- Agent memory: `.cursor/rules/community-web-receipt-chips.mdc`

Trace/video: not recorded this session — gates + e2e + design lint are the executable proof.
