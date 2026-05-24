---
product: BuildBuddy
design_sources:
  - https://www.buildbuddy.io/
  - https://www.buildbuddy.io/remote-execution/
  - https://www.buildbuddy.io/docs/remote-bazel/
  - https://www.buildbuddy.io/pricing/
---

# Design

## Look And Feel

BuildBuddy uses a developer-infrastructure dashboard style: dark-on-light marketing pages, terminal snippets, invocation links, tables, timing views, action explorers, cache statistics, and execution details. The product screenshots emphasize concrete build artifacts rather than abstract brand illustration.

## Open Design Assets

- Public product pages expose screenshots for the BuildBuddy Enterprise Bazel Results UI, remote execution, live action view, action explorer, and action timeline.
- Public docs are screenshot-heavy for setup and troubleshooting flows, especially Remote Bazel and remote execution.
- No public reusable design-token package was found in the reviewed sources.

## Differentiators

- The results UI is the design center: BuildBuddy makes Bazel build history feel inspectable through invocation links, test logs, timing profile, cache stats, invocation diffing, trends, test grid, and action explorer surfaces.
- Remote execution pages pair terminal output with UI evidence, reinforcing that the product is both command-line-native and dashboard-native.
- BuildBuddy's design differentiates by explaining cache/execution mechanics with operational detail instead of hiding the build system behind generic "fast CI" cards.

## What Works

- Deep action inspection is strong for teams debugging cache misses, non-deterministic inputs, slow actions, and remote-execution failures.
- Shareable build links turn build debugging into a collaborative workflow instead of a local log paste.
- The combination of terminal examples and UI screenshots respects Bazel users who already trust CLI output.

## UX Breakdowns

- The UI is strongest for Bazel-literate teams; non-Bazel users may find REAPI, action cache, execution logs, and runner snapshots too specialized.
- Remote cache and recycled-runner behavior can be hard to reason about when cache TTL, action-cache write permissions, credentials, or snapshot eviction prevent expected reuse.
- Dense build diagnostics can become another observability surface that teams must govern, retain, and explain.

## Epoch Design Lessons

- Epoch should expose signed history, derived artifacts, cache keys, and verification evidence in one inspectable chain.
- Cache-hit and cache-miss explanations need first-class UX, not just debug logs.
- Any remote execution or agent workflow should make local snapshot, credentials, and cache-retention boundaries visible.
