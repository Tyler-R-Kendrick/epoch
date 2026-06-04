---
product: GitHub Copilot Code Review
slug: github-copilot-code-review
category: github_native_agentic_code_review
primary_sources:
  - https://docs.github.com/en/copilot/concepts/agents/code-review
  - https://docs.github.com/en/copilot/how-tos/agents/copilot-code-review/using-copilot-code-review
  - https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
  - https://github.blog/changelog/2026-04-27-github-copilot-code-review-will-start-consuming-github-actions-minutes-on-june-1-2026
  - https://github.blog/changelog/2026-06-01-updates-to-github-copilot-billing-and-plans
---

# GitHub Copilot Code Review

GitHub Copilot Code Review is GitHub's native AI reviewer for pull requests and local code changes. It competes with Epoch at the point where AI-generated changes become pull requests: review comments, summaries, automatic review assignment, agentic context gathering, billing attribution, and integration with GitHub's branch protection and Actions model.

## Competitive Relevance

- Copilot can be requested manually from GitHub and editor surfaces or configured for automatic pull request review.
- The reviewer runs on agentic tool-calling infrastructure, so it can gather repository context instead of only reading a diff.
- From June 1, 2026, code review consumes both GitHub AI Credits and GitHub Actions minutes, making review a visible cost center.
- GitHub's advantage is native placement: the review appears inside the repository, pull request, branch policy, and Actions ecosystem.

## Epoch Implications

- GitHub proves that AI review is becoming a default part of the forge, not only a third-party bot.
- The pricing and attribution backlash highlights a gap for explicit, repository-native evidence of which agent acted, what it read, and why the run cost what it cost.
- Epoch can differentiate by keeping review evidence portable and signed instead of coupling it to GitHub account billing and hidden agent infrastructure.

## Unknowns To Track

- Recheck AI Credits pricing, model multipliers, and Actions-minute behavior because the June 2026 billing rollout is actively changing user sentiment.
- Track how automatic review settings interact with protected branches, forked PRs, and organization budget controls.
