---
product: Augment Code
slug: augment-code
design_schema: 1
sources:
  - https://www.augmentcode.com/pricing/
  - https://docs.augmentcode.com/context-services/mcp/overview
  - https://www.augmentcode.com/resources/code-review-benchmark
---

# Augment Code Design

## Look And Feel

Augment presents itself as a polished enterprise developer platform: dark marketing sections, benchmark charts, product screenshots, dense pricing tables, and docs pages organized by context services, code review, GitHub integration, and agent setup. The feel is technical, performance-oriented, and confident.

## Design References

- Public screenshots: code-review benchmark pages, pricing comparison, Context Engine MCP setup pages, and docs examples.
- Design tokens: no public token package is exposed.
- Open design docs: docs pages expose configuration formats, MCP setup, local versus remote indexing, and review-guideline YAML.

## Differentiators

- The Context Engine is visually and narratively elevated above the agent UI. Augment sells "better context" as the product, not just "better chat."
- The MCP page has strong interoperability design: Claude Code, Codex, Cursor, Zed, GitHub Copilot, OpenCode, Kiro, Roo Code, Droid, and Gemini CLI are all framed as valid clients.
- Review-guideline docs make repository rules concrete through YAML, severity levels, glob scopes, AGENTS.md, and CLAUDE.md discovery.

## What Works Well

- The docs are practical: local indexing versus remote indexing is explained in terms of active development versus codebase understanding.
- Pricing tables make credit allowances and top-ups visible before purchase.
- The code-review benchmark page gives buyers a concrete quality lens: recall, precision, cross-file context, and false-positive reduction.

## UX Breakdowns

- Credit usage can feel abstract because context queries, code review, prompt enhancement, compression, and agent work all consume the same unit.
- Benchmark-heavy design risks overclaiming if users cannot map the sample PR set to their own codebase.
- Users who only want the Context Engine may find the full platform packaging heavier than needed.
