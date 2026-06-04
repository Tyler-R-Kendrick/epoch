---
product: Sentry Seer
slug: sentry-seer
category: telemetry_grounded_ai_debugging_and_review_agent
primary_sources:
  - https://docs.sentry.io/product/ai-in-sentry/seer
  - https://sentry.io/changelog/seer-sentrys-ai-debugger-is-generally-available/
  - https://sentry.io/changelog/seer-now-debugs-in-every-stage-of-development/
  - https://sentry.zendesk.com/hc/en-us/articles/46380974525723-How-is-Seer-billed-and-how-do-I-predict-costs
  - https://sentry.zendesk.com/hc/en-us/articles/39872578968603-Will-Seer-create-PRs-automatically
---

# Sentry Seer

Sentry Seer is Sentry's AI debugging agent for issue triage, root cause analysis, code review, and automated fixes. It competes with Epoch from a different direction than PR-only review bots: Seer uses runtime telemetry, stack traces, spans, logs, profiles, commits, and code mappings to decide whether a change is actionable and can open pull requests.

## Competitive Relevance

- Seer grounds fixes in production and pre-production telemetry rather than only source diffs.
- It can scan issues, score actionability, identify root causes, suggest fixes, generate patches, and open pull requests automatically when configured.
- Sentry has expanded Seer into code review and local development, not only post-incident debugging.
- Pricing is framed as a flat active-contributor model, currently documented as a monthly charge for contributors who open at least two PRs in connected repositories.

## Epoch Implications

- Seer shows that review evidence is strongest when linked to runtime behavior, not just code shape.
- The active-contributor model avoids per-review anxiety but creates scope questions around public forks and connected repositories.
- Epoch can differentiate by attaching runtime evidence, root-cause reasoning, patches, and merge decisions to the repository's history.

## Unknowns To Track

- Recheck Seer pricing and regional availability because Sentry AI feature policies and billing docs have changed over time.
- Track how Seer code review output differs from issue-fix output in real pull requests.
