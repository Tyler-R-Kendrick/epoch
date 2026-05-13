---
product: Review Board
gossip_sources:
  - https://github.com/reviewboard/reviewboard/issues
  - https://groups.google.com/g/reviewboard
  - https://www.reddit.com/r/programming/comments/11w9ko/review_board_17_released/
---

# Gossip

## What People Say

Public sentiment around Review Board is usually framed by maturity: it is a known, established review system, especially for organizations that need self-hosting or multiple SCM backends. The tradeoff is that it does not get the same buzz as GitHub-native pull request workflows or newer stacked-review tools.

## Bug And Friction Themes

- GitHub issues and user forums show the usual long-lived platform concerns: installation, upgrades, integration behavior, repository configuration, and browser/UI edge cases.
- Teams adopting it must decide how review requests map to branches, tickets, and CI in their existing toolchain.
- Users accustomed to GitHub-style PRs may experience the separate review-request object as extra process.

## Product Risk For Epoch

Review Board can capture organizations that primarily want auditable review records across mixed SCMs. Those teams may not evaluate a new repository model unless it clearly improves their evidence chain.

## Opportunity For Epoch

Epoch can offer stronger cryptographic provenance under the review layer and interoperate with review systems that already preserve discussion, approval, and artifact feedback.
