---
product: Sourcegraph Amp
slug: sourcegraph-amp
design_schema: 1
sources:
  - https://ampcode.com/pricing
  - https://ampcode.com/manual
  - https://ampcode.com/manual/appendix
---

# Sourcegraph Amp Design

## Look And Feel

Amp's public design is intentionally manual-first: sparse pages, dense tables of contents, terminal examples, command snippets, and capability lists. It feels more like a living operator manual than a glossy IDE landing page. That matches a product aimed at developers comfortable with CLI-first workflows.

## Design References

- Owner's Manual: agent modes, prompting, AGENTS.md, threads, tools, permissions, plugins, CLI, SDK, models, security, and chronicle.
- Pricing page: individual Amp, Teams, Enterprise, free usage, and Sourcegraph code-search packaging.
- Appendix: permissions reference, toolbox protocol, streaming JSON, service status, and workspace visibility controls.

## Differentiators

- Threads are first-class: users can save, find, reference, archive, and share agent sessions.
- Toolboxes and plugins make extension feel local and executable rather than requiring every tool to become an MCP server.
- The product is opinionated: Amp advertises that it removes features it does not use and treats model selection as internal routing.

## What Works Well

- The manual gives advanced users a lot to grab: execute mode, streaming JSON, SDK calls, plugin examples, permissions, and non-interactive environments.
- CLI and IDE integration let teams start from the terminal instead of adopting a full new editor.
- Shared threads are a useful collaboration primitive for discussing agent work.

## UX Breakdowns

- New users may find the dense manual intimidating compared with a guided app workflow.
- Cost visibility can be hard because meaningful usage depends on model routing, mode, thread length, and paid execute mode.
- Thread sharing is useful but not the same as signed, repository-native history of what changed and why.
