---
product: CodeRabbit
slug: coderabbit
gossip_schema: 1
sources:
  - https://www.reddit.com/r/coderabbit/comments/1sqfd16/coderabbit_subscription_ui_is_the_worst/
  - https://www.reddit.com/r/SaaS/comments/1sqf9yr/beware_of_coderabbitai_subscriptions_charged_with/
  - https://www.reddit.com/r/coderabbit/comments/1qgzcc9/coderabbit_review_caught_logic_leak/
  - https://www.reddit.com/r/coderabbit/comments/1qo5mbs/feedback_on_coderabbit_cli/
  - https://www.reddit.com/r/devops/comments/1ojc1b6/tried_coderabbit_for_automated_code_reviews_and/
  - https://www.trustpilot.com/review/coderabbit.ai
---

# CodeRabbit Gossip

## Positive Signals

- Users report useful business-logic catches, including privacy and cross-field leaks that looked plausible in manual review.
- Community posts around Issue Planner and Autofix show that CodeRabbit is seen as part of the agentic development loop, not only a comment bot.
- Third-party benchmarks and reviews commonly include CodeRabbit as a baseline AI reviewer, which signals category visibility.

## Complaints And Friction

- Subscription cancellation and billing UX complaints appear repeatedly in Reddit and Trustpilot discussions.
- Users complain about trivial comments or noisy findings when review strictness and learnings are not tuned.
- CLI feedback includes installation and authentication friction, especially in WSL-style local developer environments.
- Pricing discussion increasingly compares CodeRabbit against cheaper PR-review clones and DIY GitHub Action plus LLM workflows.

## What Seems Buggy Or Risky

- Adaptive memory can amplify previous misunderstandings if teams teach it imprecisely.
- Per-review quotas and overage behavior can make review availability feel unpredictable during high-volume agent coding bursts.
- The most difficult production bugs may still require traces, logs, and system context beyond the pull request.

## Epoch Opportunity

Epoch can turn review memory, author intent, findings, fixes, and acceptance evidence into signed repository history. That would answer the recurring concern that AI review tools leave teams with comments and SaaS memory but not a durable, portable trust record.
