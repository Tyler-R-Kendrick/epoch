# EXPERIENCE: community-web-search-projections

- experienceId: community-web-search-projections
- personaId: github-power-user
- entryCommand: run `npm run dev:community-web`, open `/board.html`, and press `Ctrl+F`
- driver: web
- intent: A contributor searches registered sources, explains matches, saves and mounts a safe projection, and recovers through the immutable namespace

## Rubber-duck (explain to a new teammate)

1. Who is the persona and what are they trying to finish in the next 2 minutes?
   - A forge contributor needs to find review-ready work across registered sources, understand incomplete results, save the exact deterministic query as a projection, mount it, and return to a safe namespace after an invalid edit.
2. What exact command / UI path do they take from a clean machine?
   - Run `npm run dev:community-web`, open `/board.html`, press `Ctrl+F`, enter `state:needs-review`, inspect Explain, save the query, preview and mount it, then navigate to `/.epoch/default`.
3. What do they see first? (quote expected chrome, not vibes)
   - The Nightboard detail blade opens a `Query` workbench with registry-backed completion, a visible canonical-query preview, result completeness, and contextual key help.
4. What would make them think they opened the wrong product?
   - A separate database-client page, hidden AI execution, path-derived IDs, silent missing sources, or a custom root that removes the recovery namespace.
5. Happy path: step-by-step (Given/When/Then in prose first).
   - Given registered sources with authorized objects, when the contributor runs a typed query, then deterministic results and source completeness appear. When they inspect a hit, the Explain tab identifies matching fields without leaking hidden objects. When they save, preview, and mount the projection, the same canonical target remains identifiable at every occurrence and keyboard focus follows the occurrence identity.
6. Failure path: how do they break it, what must the product say?
   - Enter an invalid operator and then save a cyclic projection. The editor must identify the exact span or JSON pointer, refuse execution/mounting without partial recovery, preserve the invalid definition for export, and keep `/.epoch/default` reachable.
7. What evidence will prove a human/agent actually ran this? (driver + command)
   - A continuous Playwright recording from `npm run dev:community-web`, plus the accessibility tree, focused API/CLI transcripts, and conformance outputs tied to this run.
8. What is deliberately out of scope for this feature folder?
   - Semantic/vector search, arbitrary SQL, regex, custom scripts, default AI, speculative external adapters, and a new visual shell.

## Adversarial critique (must check all)

- [x] Did not skip default entry because a secondary verb is easier to automate
- [x] Not testing a monorepo script instead of the product binary
- [x] No When-step is only “exercise the surface” without a real command
- [x] Scores cannot be invented without reading stdout/TUI
- [x] Persona vocabulary/asserts considered for shared paths
- [x] Security: secrets, destructive promote, network—fail-closed
- [x] Cognitive load: journey stays within persona thresholds
- [x] Confusion twin: stock UI / wrong binary / wrong verb—covered
- [x] If this feature were the only one we ship, the persona would not still be lost

## Verdict

- accept
- primaryCommand: `npm run dev:community-web`
- driver: web
- scenarios:
  - Contributor searches every authorized source and sees explicit completeness
  - Maintainer explains a match and saves the deterministic query as a projection
  - Contributor previews, mounts, and navigates duplicate object occurrences without identity drift
  - Contributor recovers from an invalid projection through the immutable namespace
  - Screen-reader contributor completes search and projection work by keyboard
