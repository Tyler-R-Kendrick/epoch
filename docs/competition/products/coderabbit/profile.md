---
product: CodeRabbit
slug: coderabbit
category: ai_code_review_and_planning_platform
primary_sources:
  - https://docs.coderabbit.ai/about/features
  - https://docs.coderabbit.ai/knowledge-base
  - https://docs.coderabbit.ai/management/plans
  - https://docs.coderabbit.ai/finishing-touches/autofix
  - https://docs.coderabbit.ai/changelog
---

# CodeRabbit

CodeRabbit is an AI-powered code review and planning platform for pull requests, IDEs, CLIs, Slack, and issue-planning workflows. It competes with Epoch around the review stage of agent-authored code: it tries to turn repository history, team learnings, issue context, rules, and external knowledge into review comments, coding plans, and fix handoffs before merge.

## Competitive Relevance

- CodeRabbit is no longer just a PR summarizer; the current docs position it as review, planning, IDE feedback, CLI review, Slack agent, and autofix infrastructure.
- The knowledge base reads repo rules, prior pull requests, team feedback, linked issues, MCP servers, web search, and multi-repo context.
- Autofix collects unresolved review findings, applies changes, and runs a setup/build verification step before delivering a change.
- Pricing now combines per-user plans, rolling review limits, and optional usage-based overage for high-volume review loops.

## Epoch Implications

- CodeRabbit validates the need for a review-native evidence layer after AI agents create code faster than humans can inspect it.
- Its memory and planning features overlap with Epoch's opportunity to preserve signed, replayable intent and review evidence in repository history.
- Epoch can differentiate by making review decisions and agent handoffs content-addressed and portable instead of SaaS-retained knowledge.

## Unknowns To Track

- Recheck plan names, review limits, and usage add-on pricing before quoting exact economics.
- Track how CodeRabbit handles false positives, stale learnings, and data-retention opt-out for regulated teams.
