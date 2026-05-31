---
product: Aider
slug: aider
design_sources:
  - https://aider.chat/
  - https://aider.chat/docs/usage.html
  - https://aider.chat/docs/git.html
  - https://aider.chat/docs/usage/watch.html
---

# Design

## Look And Feel

Aider's product design is terminal-first. The primary user interface is a command prompt, streaming diffs, slash commands, token/context feedback, Git status, and plain-text transcripts. The public website uses a simple documentation-led design: large headline, install commands, product video, metric chips, and feature cards for model support, repo maps, Git integration, IDE comments, voice, linting, testing, images, and web pages.

## Open Design Artifacts

- Aider publishes documentation pages, CLI examples, transcripts, release notes, and videos rather than a formal design system or token package.
- The visible design contract is the terminal prompt plus file diffs, in-chat commands, Git commits, `/undo`, `/diff`, `/test`, `/run`, convention files, and watch-file comments.
- There is no standalone open design-token package for a graphical Aider UI.

## Differentiators

- The UX leans into tools developers already trust: terminal, Git, diffs, linters, tests, and editor comments.
- Automatic Git commits make the safety model legible without inventing a new checkpoint surface.
- Watch-file comments let users drive the terminal agent from any editor by writing `AI!` or `AI?` comments in context.
- The documentation is unusually concrete about model selection, token costs, repo maps, linting, and failure recovery.

## What Works Well

- The terminal UI is fast, low ceremony, scriptable, and editor-neutral.
- Git commits, `/undo`, and `/diff` give experienced developers a familiar review and rollback loop.
- The repo-map and explicit file-add model make context control visible instead of hiding it behind an opaque index.

## Where It Breaks Down

- The product asks users to manage context, model selection, API keys, token costs, and files in chat; that can be too much for GUI-oriented or junior developers.
- Automatic commits are useful but can clutter local history if users do not curate branches carefully.
- The lack of a rich visual diff/review surface means large multi-file changes can be harder to understand than in IDE-native or web PR tools.
