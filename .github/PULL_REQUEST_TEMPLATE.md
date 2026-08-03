## Summary

<!-- What changed and why? -->

## Validation

- [ ] `npm run docs:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run konsistent`
- [ ] `npm test`
- [ ] `npm run coverage`
- [ ] `npm run verify`

## Documentation

- [ ] Updated relevant README/docs/ADR/features/skill references, or explained why not applicable.
- [ ] Updated `docs/feature-scenario-inventory.md` when Gherkin scenarios changed, or explained why not applicable.
- [ ] Added new docs to `docs/README.md` or another linked index so they are not orphaned.

## Community Human-Centered Design

- [ ] For Community changes, named the persona, pain point, trust question, cost/security/privacy/accessibility/moderation/portability considerations, degraded-state behavior, and validation evidence, or explained why not applicable.
- [ ] For Community changes, named the design-thinking stage and user-centric success criteria, or explained why not applicable.
- [ ] Added or updated user-visible product behavior Gherkin scenarios under `features/`, or explained why not applicable.
- [ ] Confirmed Gherkin scenarios remain real product behavior, not agent instructions, test procedures, evidence recording, persona-only feature files, or matrix-only outlines.
- [ ] For Community visual/interaction changes: ran the **adversarial persona design critique** (pass/fail on DESIGN.md, craft, playfulness/wonder, competitive bar, a11y/honesty). Automatic fails fixed. Critique summarized below or linked.

### Adversarial persona critique (Community UI — required when shell/CSS/UX changes)

```text
Persona:
Surface:
DESIGN.md: pass|fail —
Craft: pass|fail —
Playfulness/wonder: pass|fail —
Competitive bar: pass|fail —
A11y/honesty/trust: pass|fail —
Unacceptable issues:
Delight opportunities:
```

## Security

- [ ] Considered signature, identity, path, Git, backup/restore, dependency, and secret-handling impacts.
