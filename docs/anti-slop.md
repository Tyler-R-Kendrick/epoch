# Anti-slop (Oxlint)

Epoch vendors [anti-slop](https://github.com/dmmulroy/anti-slop) as Oxlint rules
that reject low-evidence TypeScript and JavaScript patterns. See
[ADR-0056](design-decisions/0056-anti-slop-oxlint.md).

## Layout

| Path | Role |
|---|---|
| `tools/oxlint/anti-slop/` | Vendored plugin (generic rules; Effect plugin present but not registered) |
| `oxlint.config.ts` | Registers the plugin, ignores agent harness trees, enables every generic rule at `error` |
| `npm run lint:oxlint` | Runs Oxlint / anti-slop |

`npm run lint:oxlint` is part of `gate:fast` and the CI Lint job alongside ESLint.
`sdlc gate` / `sdlc finish` require a clean anti-slop run (do not weaken rules in
`oxlint.config.ts` to greenwash findings).

## Agent hosts

Skill trees under `.agents/`, `.claude/skills/`, and `.grok/` are gitignored.
Restore the install skill for the hosts this repository uses:

```bash
npm run agents:install-skills
# equivalent:
npx skills add dmmulroy/anti-slop --skill install-anti-slop \
  --agent claude-code --agent cursor --agent codex --agent grok -y --copy
```

Ask an agent to follow the `install-anti-slop` skill when re-vendoring or
reconfiguring the plugin.

## Commands

```bash
npm run lint:oxlint      # full-tree anti-slop (required in gate:fast / CI)
npm run lint:anti-slop   # alias
npm run lint             # ESLint (required)
```
