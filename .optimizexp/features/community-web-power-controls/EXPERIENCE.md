# EXPERIENCE: community-web-power-controls

- experienceId: community-web-power-controls
- personaId: forge-community-power-user
- entryCommand: open `http://127.0.0.1:8787/`, enter Community Web, and use the message list or `macro` command
- driver: web
- intent: A keyboard-first power user must navigate dense conversations, recover or prime a workspace with one restart action, keep model routing cache-sticky, and expand the focused panel without losing context.

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - An agentic coding power user resumes or primes the current workspace without relearning model or restart controls.
2. What exact command / UI path do they take from a clean machine?
   - Open the local Epoch landing page, enter Community Web, press `Ctrl+U` when the bottom line offers continuation/update/workspace priming, and expand the focused panel with `z` or `Alt+Z`.
3. What do they see first? (quote expected chrome, not vibes)
   - The board shows the terminal-style channel rail, dense message rows, sticky prompt, and a bottom line naming one recommended next action plus its hotkey.
4. What would make them think they opened the wrong product?
   - A stock settings dashboard, a modal startup wizard, or a model picker that changes every turn.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given compatible startup conditions exist, Ctrl+U applies them in one restart and the bottom line advances. Given a workspace session has a route, repeated turns stay on it until policy/failure invalidates it. Given a panel has focus, expand/collapse keeps that panel and selection in context.
6. Failure path: how do they break it, what must the product say?
   - Ctrl+U inside the editor with no startup action must remain page-up; invalid continuation/update/workspace metadata must fail closed; a route may change only after explicit invalidation.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - The Community Web Playwright flow records startup detection and Ctrl+U, sticky routing, bottom-line guidance, focus-panel expansion, editor shortcut preservation, and axe results against `http://127.0.0.1:8787/`.
8. What is deliberately out of scope for this feature folder?
   - Arbitrary shell execution, package installation, live provider credentials, a bundled gateway process, self-updating binaries, and cross-device session synchronization.

## Adversarial critique (must check all)

- [x] Did not skip default entry because a secondary verb is easier
- [x] Not testing a monorepo script instead of the product binary
- [x] No When-step is only “exercise the surface” without a real command
- [x] Scores cannot be invented without reading rendered browser evidence
- [x] Persona vocabulary/asserts considered for shared paths
- [x] Security: secrets, destructive promote, network—fail-closed
- [x] Cognitive load: journey stays within persona thresholds
- [x] Confusion twin: mouse-only feed / arbitrary shell alias / duplicated agent action—covered
- [x] If this feature were the only one we ship, the persona would not still be lost

## Verdict

- accept
- primaryCommand: `npm run community-web:app:e2e`
- driver: web
- scenarios:
  - Screen-reader power user traverses messages with one roving tab stop
  - Forge power user operates every focused-post action by keyboard
  - Forge power user defines and runs a safe reusable macro
  - Agentic coding power user invokes the same macro as a tool and exact voice phrase
  - Agentic coding power user consumes compatible startup conditions with one restart
  - Agentic coding power user keeps one cache-sticky route per workspace
  - Keyboard power user expands and restores the focused panel
