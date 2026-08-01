# EXPERIENCE: community-web-responsive-craft

- experienceId: community-web-responsive-craft-builder
- personaId: app-builder-design-power-user
- entryCommand: open `http://127.0.0.1:4173/community` at desktop and narrow viewports
- driver: web
- intent: A high-aesthetic-sensitivity builder judges the actual rendered composition, not DESIGN.md promises.

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - A Figma/Replit/Lovable/v0 power user is deciding whether this prototype is visually intentional and handoff-ready at desktop, mobile, zoom, keyboard, and reduced-motion settings.
2. What exact command / UI path do they take from a clean machine?
   - Run `npm run vercel:community-web`; open `/community` at 1440x900 and 390x844, inspect at 200% zoom, tab through controls, and emulate reduced motion.
3. What do they see first? (quote expected chrome, not vibes)
   - A dark orientation rail and light working feed with readable hierarchy, restrained copper/teal/gold signals, rectangular controls, no overflow, no giant dead space, and no browser-default artifacts.
4. What would make them think they opened the wrong product?
   - Generic generated-dashboard spacing, card soup, clipped text, unstyled focus, tiny touch targets, fake badges, mobile content buried below a full desktop rail, or a polished screenshot that cannot survive interaction.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given the live seeded shell, when the persona inspects desktop and narrow layouts and opens a selected-message tray, then hierarchy and spacing remain coherent, key controls meet the documented size floor, and provenance stays readable without dominating content.
6. Failure path: how do they break it, what must the product say?
   - At 200% zoom and keyboard-only navigation, every control must stay reachable with visible focus and no horizontal clipping; reduced-motion mode must introduce no animated dependence.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - Reviewed browser video plus full-page screenshots at both viewports and annotated focus screenshots, with computed viewport/overflow measurements in capture metadata.
8. What is deliberately out of scope for this feature folder?
   - Brand redesign, new illustration, dark mode, production content strategy, and new navigation capabilities.

## Adversarial critique (must check all)

- [x] Did not skip default entry because a secondary verb is easier to automate
- [x] Not testing a monorepo script instead of the product binary
- [x] No When-step is only “exercise the surface” without a real command
- [x] Scores cannot be invented without reading rendered browser evidence
- [x] Persona vocabulary/asserts considered for shared paths
- [x] Security: secrets, destructive promote, network—fail-closed
- [x] Cognitive load: journey stays within persona thresholds
- [x] Confusion twin: polished mockup / usable responsive product—covered
- [x] If this feature were the only one we ship, the persona would not still be lost

## Verdict

- accept
- primaryCommand: `npm run vercel:community-web`
- driver: web
- scenarios:
  - Design power user audits desktop visual hierarchy and action detail
  - Design power user audits narrow layout and touch targets
  - Design power user audits zoom focus and reduced motion
