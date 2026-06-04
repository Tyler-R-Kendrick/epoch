---
product: GitHub Copilot Code Review
slug: github-copilot-code-review
gossip_schema: 1
sources:
  - https://www.reddit.com/r/GithubCopilot/comments/1tvjhm1/i_wholeheartedly_recommend_to_everyone_to_turn/
  - https://www.reddit.com/r/GithubCopilot/comments/1ttdq2f/well_how_is_the_new_pricing/
  - https://www.reddit.com/r/github/comments/1tv7zuq/pov_youre_still_using_github_copilot_after_june/
  - https://arstechnica.com/ai/2026/06/ai-costs-how-much-github-copilot-users-react-to-new-usage-based-pricing-system/
  - https://www.techradar.com/pro/this-is-horrific-github-kills-copilot-pull-request-ads-after-user-backlash
  - https://www.techradar.com/pro/that-is-unacceptable-in-a-professional-development-workflow-microsoft-acts-after-vs-code-gives-copilot-credit-for-work-a-human-developer-did
---

# GitHub Copilot Code Review Gossip

## Positive Signals

- Developers like that Copilot review is available in the same GitHub pull request where review already happens.
- Native availability means many teams will try Copilot review before evaluating a third-party AI reviewer.
- GitHub's agentic review architecture is seen as stronger than simple diff-only bots when repository context matters.

## Complaints And Friction

- June 2026 usage-based billing created immediate anxiety about code review consuming large portions of included credits.
- Reddit users warn each other to disable automatic review when it burns credits or runs unexpectedly.
- Users also object to AI acting invisibly in trusted GitHub surfaces, including prior backlash around pull request product tips and incorrect Copilot authorship attribution.

## What Seems Buggy Or Risky

- Automatic review can feel like hidden spend when it triggers on branches or pull requests users did not intend to review.
- The two-part cost model makes it hard to explain why one review consumed a specific amount.
- If Copilot comments are superficial or noisy, the native placement makes the annoyance feel like part of GitHub itself.

## Epoch Opportunity

Epoch can make AI review runs explicit artifacts: what changed, what context was read, which model reviewed, what it cost, and which human accepted the result. That is the trust layer missing from native but opaque AI review.
