# Community Web feed/thread nav + receipt chrome

Persona-visible Community Web changes from the 2026-08-20 session:

1. **Roots-only channel feeds** — replies open in a thread view, not inline under the channel list.
2. **Single-column threads** — one APG tree (no outline/reading split).
3. **Receipt locators** — `sig:…` / `intent://…` keep Bracket Rule chrome + `--cw-signed`, gated by `community-web:app:design-lint`.

## Replay

```bash
npm run gate:commit
npm run community-web:app:design-lint
CW_E2E=NAV- npm run community-web:app:e2e
```

## Artifacts

- Critique: `docs/evidence/community-web-app-navigation-projection-parity/adversarial-critique.md`
- Design gate: `scripts/lint-community-web-app-design.mjs`
- Agent memory: `.cursor/rules/community-web-receipt-chips.mdc`
