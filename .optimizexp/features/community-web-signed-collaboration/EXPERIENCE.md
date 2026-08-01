# EXPERIENCE: community-web-signed-collaboration

- experienceId: community-web-signed-collaboration-forge
- personaId: forge-community-power-user
- entryCommand: open `/community`, choose `#ideas`, select the dashboard-widget message, and activate `Mark intent`
- driver: web
- intent: Signed collaboration must be more inspectable than a badge and safer than an optimistic chat action.

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - A forge maintainer wants to inspect a proposal-bearing conversation, understand its actor and provenance, promote it to an intent, and know whether human review remains authoritative.
2. What exact command / UI path do they take from a clean machine?
   - Run `npm run vercel:community-web`; open `/community`; activate `#ideas`; select “Dashboard widget should group revenue by region”; inspect the tray; activate `Mark intent`, then `Request agent`.
3. What do they see first? (quote expected chrome, not vibes)
   - The selected row exposes “Anchor”, “Signature”, “Intent”, named action buttons, and an adjacent status sentence; the message remains visibly selected.
4. What would make them think they opened the wrong product?
   - Decorative “signed” chrome with no details, jargon-only anchors, duplicate action rows, ambiguous success, an agent action that implies automatic merge, or a failure that leaves mutation state unclear.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given the live API has seeded repository activity, when the maintainer selects the idea and marks intent, then the tray visibly ties the action to the selected conversation and reports the created proposal; requesting an agent explicitly says human review is required.
6. Failure path: how do they break it, what must the product say?
   - Run in snapshot/offline mode and activate a mutation; the interface must fail closed, preserve the message, identify that the action was not recorded, and present a concrete recovery path.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - A continuous Playwright recording of selection, tray expansion, intent request, agent request, and offline failure, with visible status text and local API request evidence.
8. What is deliberately out of scope for this feature folder?
   - Agent execution details, merge review, legal hold, identity enrollment, and cryptographic verification internals.

## Adversarial critique (must check all)

- [x] Did not skip default entry because a secondary verb is easier to automate
- [x] Not testing a monorepo script instead of the product binary
- [x] No When-step is only “exercise the surface” without a real command
- [x] Scores cannot be invented without reading rendered browser evidence
- [x] Persona vocabulary/asserts considered for shared paths
- [x] Security: secrets, destructive promote, network—fail-closed
- [x] Cognitive load: journey stays within persona thresholds
- [x] Confusion twin: decorative signature / inspectable provenance—covered
- [x] If this feature were the only one we ship, the persona would not still be lost

## Verdict

- accept
- primaryCommand: `npm run vercel:community-web`
- driver: web
- scenarios:
  - Forge power user promotes a selected idea with inspectable provenance
  - Forge power user sees agent review authority and offline recovery
