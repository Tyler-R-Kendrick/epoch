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
Do not weaken anti-slop rules in `oxlint.config.ts` to greenwash findings.

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

### Re-verify (force re-vendor)

```bash
npm run agents:install-skills
node .agents/skills/install-anti-slop/scripts/install.mjs tools/oxlint/anti-slop --force
npm view oxlint version   # pin matching oxlint + @oxlint/plugins
npm run lint:oxlint       # must exit 0; probe a synthetic `unknown` param to prove rules load
```

Do not use `--force` casually — diff the existing tree first. See
[`docs/plans/anti-slop-zero/sdlc-state.md`](plans/anti-slop-zero/sdlc-state.md)
for the latest clean-baseline evidence.

## Commands

```bash
npm run lint:oxlint      # full-tree anti-slop (required in gate:fast / CI)
npm run lint:anti-slop   # alias
npm run lint             # ESLint (required)
```
