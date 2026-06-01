---
product: Bolt.new
slug: bolt-new
design_sources:
  - https://github.com/stackblitz/bolt.new
  - https://support.bolt.new/building/using-bolt/projects-files
---

# Design

## Look And Feel

Bolt.new looks like a browser-native development cockpit: prompt/chat input, file explorer, code editor, terminal/runtime output, package installation, live preview, StackBlitz project identity, GitHub import/export, and deployment actions. The key design move is keeping the entire build loop inside one browser tab.

## Open Design Artifacts

- The public `stackblitz/bolt.new` repository documents the product model and open-source agent stack.
- Help docs describe project management, StackBlitz handoff, project IDs, public GitHub repository import, and GitHub version-control paths.
- Community screenshots and reviews consistently show the split between chat instructions, editable code, and a live app preview.

## Differentiators

- WebContainers let users run Node.js, install packages, and preview full-stack JavaScript apps without a local environment.
- The UI makes runtime feedback immediate, which encourages rapid prompt-debug-prompt loops.
- GitHub URL import makes existing public repositories feel one click away from an AI editing session.

## What Works Well

- The design reduces local setup friction for new projects, demos, and framework exploration.
- Side-by-side code and preview make generated changes more inspectable than prompt-only app builders.
- Open-source availability gives technical users a way to understand or fork the agent stack.

## Where It Breaks Down

- Browser runtime and token limits become more visible as projects grow beyond simple prototypes.
- Fast visible previews can create false confidence when persistence, auth, payments, tests, and production deployment are not independently verified.
- When files revert, sync stalls, or generated changes do not persist, the UI can leave users unsure whether chat, editor, runtime, or GitHub is authoritative.
