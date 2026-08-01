# EXPERIENCE: community-web-first-use

- experienceId: community-web-first-use-forge
- personaId: forge-community-power-user
- entryCommand: `npm run vercel:community-web`, then open `http://127.0.0.1:4173/community`
- driver: web
- intent: Cold entry must orient a forge/community expert before asking them to decode Epoch-specific trust concepts.

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - A GitHub/GitLab/Discord/Tangled power user wants to identify where they are, which community and channel are active, whether data is live, what people are discussing, and how to participate.
2. What exact command / UI path do they take from a clean machine?
   - Run `npm run vercel:community-web`; navigate directly to `http://127.0.0.1:4173/community` in a fresh browser context at 1440x900.
3. What do they see first? (quote expected chrome, not vibes)
   - The first viewport must visibly include “Epoch”, the active community “Epoch Civic Workshop”, “# general”, an explicit live/snapshot banner, a readable message feed, and the “Message #general” composer.
4. What would make them think they opened the wrong product?
   - A generic dashboard, a repository-only issue list, a Discord clone with no signed-work context, unlabeled sample data, or a mostly empty canvas with internal implementation terms.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given the local Community API is seeded, when the persona opens `/community`, then the full desktop shell is visible without clipping and its rail, channel context, messages, honesty state, and composer form a coherent reading order.
6. Failure path: how do they break it, what must the product say?
   - Open the rendered snapshot without a reachable API; the product must say “Snapshot” or “offline”, keep useful sample content, and avoid implying mutations are live.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - A Playwright web recording from the OptimizeXP harness plus reviewed full-page frames, captured from the live local URL after the server health check passes.
8. What is deliberately out of scope for this feature folder?
   - Account creation, production authentication, repository cloning, moderation, and mutation success are covered elsewhere.

## Adversarial critique (must check all)

- [x] Did not skip default entry because a secondary verb is easier to automate
- [x] Not testing a monorepo script instead of the product binary
- [x] No When-step is only “exercise the surface” without a real command
- [x] Scores cannot be invented without reading rendered browser evidence
- [x] Persona vocabulary/asserts considered for shared paths
- [x] Security: secrets, destructive promote, network—fail-closed
- [x] Cognitive load: journey stays within persona thresholds
- [x] Confusion twin: stock UI / wrong product / unlabeled demo—covered
- [x] If this feature were the only one we ship, the persona would not still be lost

## Verdict

- accept
- primaryCommand: `npm run vercel:community-web`
- driver: web
- scenarios:
  - Forge power user orients from a cold desktop entry
  - Forge power user recognizes honest snapshot fallback
  - Design power user judges the first viewport hierarchy
