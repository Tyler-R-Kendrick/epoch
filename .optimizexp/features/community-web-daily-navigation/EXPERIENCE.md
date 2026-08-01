# EXPERIENCE: community-web-daily-navigation

- experienceId: community-web-daily-navigation-forge
- personaId: forge-community-power-user
- entryCommand: open `http://127.0.0.1:4173/community` and use rail navigation
- driver: web
- intent: A daily forge/community user must move among places without losing selection or mistaking discovery for home.

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - A maintainer is catching up: scan `#general`, open Network Feed, inspect a linked project’s issues, switch communities, and return to a conversation.
2. What exact command / UI path do they take from a clean machine?
   - Run `npm run vercel:community-web`, open `/community`, then activate `Network Feed`, `Epoch Civic Workshop`, `epoch/epoch`, `Issues`, `Agent Guild`, and its `# agent-runs` channel.
3. What do they see first? (quote expected chrome, not vibes)
   - The rail shows “Network Feed”, “Communities”, “Channels”, and “Linked projects”; the active item has both visual and `aria-pressed` state while the main heading names the selected context.
4. What would make them think they opened the wrong product?
   - Repository controls replacing community places, hidden state changes, every item appearing selected, headings that lag the rail, or controls that silently do nothing.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given the shell starts in `Epoch Civic Workshop / #general`, when the persona traverses discovery, linked repository, and another community, then each transition updates the heading, subheading, visible panel, selected state, and useful content without a page reload.
6. Failure path: how do they break it, what must the product say?
   - Repeat the journey at 390x844 and with keyboard-only input; navigation must remain reachable, focus visible, content not clipped, and the active context understandable after the rail stacks.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - A continuous Playwright recording at desktop plus an ordered narrow-viewport capture showing actual clicks, focus movement, selected states, and resulting panels.
8. What is deliberately out of scope for this feature folder?
   - Deep-link persistence across reload, browser history integration, search, notification counts, and server-side pagination.

## Adversarial critique (must check all)

- [x] Did not skip default entry because a secondary verb is easier to automate
- [x] Not testing a monorepo script instead of the product binary
- [x] No When-step is only “exercise the surface” without a real command
- [x] Scores cannot be invented without reading rendered browser evidence
- [x] Persona vocabulary/asserts considered for shared paths
- [x] Security: secrets, destructive promote, network—fail-closed
- [x] Cognitive load: journey stays within persona thresholds
- [x] Confusion twin: discovery / community / linked project—covered
- [x] If this feature were the only one we ship, the persona would not still be lost

## Verdict

- accept
- primaryCommand: `npm run vercel:community-web`
- driver: web
- scenarios:
  - Forge power user traverses community network and repository planes
  - Forge power user navigates the stacked narrow layout by keyboard
