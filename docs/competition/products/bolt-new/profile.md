---
product: Bolt.new
slug: bolt-new
category: browser_fullstack_agent
primary_sources:
  - https://github.com/stackblitz/bolt.new
  - https://support.bolt.new/building/using-bolt/projects-files
  - https://support.bolt.new/
---

# Bolt.new

Bolt.new is StackBlitz's browser-based AI app builder. It combines prompt-driven code generation with WebContainers so users can install packages, run full-stack JavaScript apps, edit files, preview output, and deploy without local setup. It competes with Epoch by making the browser workspace itself the place where generated app history, runtime state, and deployment decisions happen.

## Competitive Relevance

- Bolt.new's open-source repository describes a web development agent that can prompt, run, edit, and deploy full-stack applications.
- WebContainers give Bolt a differentiator over chat-only tools because generated code can execute immediately in the browser.
- Users can open public GitHub repositories in Bolt by prefixing GitHub URLs and can export projects through StackBlitz.
- The product captures viral "build an app in minutes" demand while exposing users to token and persistence risks.

## Epoch Implications

- In-browser execution creates valuable evidence: installed packages, terminal output, preview state, generated files, and deployment commands.
- Epoch can differentiate by recording which prompt produced which workspace state, which runtime errors were fixed, and which repository export or sync action made the work durable.
- Bolt's open-source agent stack is a useful reference for how prompt, code, terminal, and preview events can be structured.

## Unknowns To Track

- How Bolt V2, StackBlitz sync, GitHub integration, and hosted deployment evolve for production teams.
- Whether token accounting and browser runtime constraints become less painful for large multi-file apps.
