---
product: Greptile
slug: greptile
category: graph_indexed_ai_code_review_agent
primary_sources:
  - https://www.greptile.com/
  - https://www.greptile.com/docs/api-reference
  - https://www.greptile.com/docs/code-review-bot/greptile-json
  - https://www.greptile.com/pricing
  - https://www.greptile.com/blog/greptile-v4
---

# Greptile

Greptile is an AI code review agent that builds a graph index of a repository, reviews pull requests with whole-codebase context, learns team standards from comments, and hands findings to coding agents such as Claude Code, Codex, Cursor, and Devin. It competes with Epoch around the "central validation layer" for AI-authored code.

## Competitive Relevance

- Greptile explicitly positions itself as an AI code reviewer for codebases where diff-only review is insufficient.
- The product emphasizes graph indexing, parallel review agents, custom rules, repository-specific `greptile.json`, status checks, and "Fix in X" handoff to coding agents.
- Pricing is transparent but usage-sensitive: Pro includes 50 reviews per seat per month and then charges per additional review.
- Enterprise messaging includes self-hosting, air-gapped deployment, SSO, audit logs, support, and compliance.

## Epoch Implications

- Greptile validates the category thesis that AI-generated code needs independent validation before merge.
- Its graph index competes with Epoch's opportunity to make dependency, history, and provenance context available at review time.
- Epoch can differentiate by making validation evidence replayable from repository state instead of leaving it inside a vendor graph.

## Unknowns To Track

- Recheck Greptile's pricing because it changed materially in 2026 and community reaction focuses on usage economics.
- Track TREX and testing-agent availability because autonomous test generation could strengthen Greptile's validation story.
