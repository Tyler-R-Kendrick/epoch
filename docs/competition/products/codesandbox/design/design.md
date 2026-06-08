---
product: CodeSandbox
slug: codesandbox
design_schema: 1
sources:
  - https://codesandbox.io/sdk
  - https://codesandbox.io/blog/codesandbox-sdk
  - https://codesandbox.io/blog/a-unified-codesandbox-experience
---

# CodeSandbox Design

## Look And Feel

CodeSandbox combines a web IDE heritage with a newer developer-platform landing page. Public SDK pages use a dark, technical presentation with code samples, use-case blocks, and infrastructure capability claims. The editor story emphasizes minimal chrome, live preview, quick starts, and shareable URLs, while the SDK story emphasizes API control and sandbox lifecycle primitives.

## Design References

- SDK landing page: API examples for sandbox creation, forking, Python execution, and hibernation.
- SDK release article: browser-session and preview embedding examples for product builders.
- Unified experience article: dashboard, repositories, sandboxes, cloud sandboxes, synced sandboxes, VS Code, iOS, and web editor flows.

## Differentiators

- The design bridges human IDE and programmatic sandbox API instead of treating them as separate products.
- Fork, snapshot, hibernate, resume, and preview are visible concepts, which makes environment lifecycle easy to reason about.
- Live preview remains central to the product identity even as the infrastructure moves toward AI agents and evals.

## What Works Well

- Code examples make the SDK value concrete in seconds.
- Shareable URLs and live preview are strong collaboration primitives for teaching, debugging, demos, and review.
- The product can serve both a human developer opening an editor and an AI platform spinning up sandboxes at scale.

## UX Breakdowns

- The product history spans browser sandboxes, cloud sandboxes, repositories, synced sandboxes, SDKs, and Together AI integration, which can blur the primary path.
- Advanced environment configuration, secrets, snapshots, and SDK use require more platform understanding than the older quick-demo use case.
- Users working on large or unusual projects may hit performance, dependency, or compatibility limits before they understand which sandbox mode they are in.
