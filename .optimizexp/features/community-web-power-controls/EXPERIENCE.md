# EXPERIENCE: community-web-power-controls

- experienceId: community-web-power-controls
- personaId: forge-community-power-user
- entryCommand: open `http://127.0.0.1:8787/`, enter Nightboard, and use the message list or `macro` command
- driver: web
- intent: A keyboard-first power user must navigate dense conversations and define one safe action that works through the prompt, agent tools, and voice.

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - A forge/community power user is catching up in a busy channel, then saves the repeated review-navigation sequence as an action they can run again by keyboard, agent, or voice.
2. What exact command / UI path do they take from a clean machine?
   - Open the local Epoch landing page, enter Nightboard, open a text channel, Tab into the message list, move with ArrowDown/ArrowUp or j/k, press Enter to open a thread, then type `macro set review = cd /projects/epoch/changes; view state:needs-review` and `macro run review`.
3. What do they see first? (quote expected chrome, not vibes)
   - The board shows the terminal-style channel rail, dense message rows, sticky prompt, and the `Ctrl+Space keys` affordance; the selected message has visible focus and its accessible state names the author and subject/body.
4. What would make them think they opened the wrong product?
   - A stock settings dashboard, a mouse-only chat feed, a separate macro builder, or a voice/agent action that behaves differently from the command typed in the prompt.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given a channel feed is open, when the user Tabs to the selected message and moves with ArrowDown, then focus and selection move together; when they press Enter, the selected thread opens. Given a valid named macro with existing commands and an exact voice phrase, when it is saved, then the prompt can run it, WebMCP lists a `user_` tool for it, and voice command parsing returns that same macro invocation.
6. Failure path: how do they break it, what must the product say?
   - Define an invalid name, an empty command, an unknown command, or a recursive macro; the product must refuse it with a short actionable message. A near-but-not-exact voice phrase must remain dictation or report an unknown command rather than run the wrong action.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - The Nightboard Playwright flow records real Tab/ArrowDown/Enter focus transitions, localStorage persistence across reload, WebMCP tool discovery/call, and speech parser output against `http://127.0.0.1:8787/`; axe confirms the rendered list semantics.
8. What is deliberately out of scope for this feature folder?
   - Arbitrary JavaScript, shell execution, global OS hotkey remapping, cloud skill marketplaces, speech-model installation, and cross-device synchronization.

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
- primaryCommand: `npm run nightboard:e2e`
- driver: web
- scenarios:
  - Screen-reader power user traverses messages with one roving tab stop
  - Forge power user defines and runs a safe reusable macro
  - Agentic coding power user invokes the same macro as a tool and exact voice phrase
