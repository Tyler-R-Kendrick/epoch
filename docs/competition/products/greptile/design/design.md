---
product: Greptile
slug: greptile
design_schema: 1
sources:
  - https://www.greptile.com/
  - https://www.greptile.com/docs/api-reference
  - https://www.greptile.com/docs/code-review-bot/greptile-json
  - https://www.greptile.com/pricing
---

# Greptile Design

## Look And Feel

Greptile's marketing surface is bold and focused: large claims about being "The AI Code Reviewer", customer logos, bug examples, step-by-step review diagrams, and cards for custom rules, learning, Fix in IDE, MCP, Claude Code plugin, and `/greploop`. The docs are more utilitarian, with Mintlify-style navigation, configuration tables, and clear setup steps.

## Design References

- Open design docs: no public design-token package was found.
- Screenshots and examples: marketing shows PR examples and named bug catches; docs include review summaries, comments, and configuration examples.
- Configuration surface: `greptile.json` exposes review triggers, strictness, status checks, AI-fix prompts, branches, paths, and scoped context.

## Differentiators

- Greptile's visual story centers on whole-repo graph context rather than generic LLM review.
- The "central validation layer" framing is strong because it positions Greptile as a checkpoint for every coding agent.
- Fix handoff to multiple agent products is a practical design move: Greptile does not need to own every editor or agent surface.

## What Works Well

- The homepage explains the core model in three simple steps: index the repo, review with agents, learn over time.
- Public pricing is easier to parse than many enterprise-first AI tools.
- Repository-local configuration makes behavior reviewable by maintainers.

## UX Breakdowns

- The marketing claims are aggressive and can create skepticism if teams see false positives or noisy comments.
- Usage-based overage puts cognitive load on teams with bursty agent-generated PR volume.
- The graph-index concept is powerful but opaque; users still need to trust how the product maps repository context to each finding.
