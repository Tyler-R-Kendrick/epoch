---
product: OpenHands
slug: openhands
gossip_sources:
  - https://www.reddit.com/r/LocalLLaMA/comments/1ksfos8/why_has_no_one_been_talking_about_open_hands_so/
  - https://github.com/All-Hands-AI/OpenHands/issues/7473
  - https://github.com/All-Hands-AI/OpenHands/issues/5450
  - https://github.com/All-Hands-AI/OpenHands/issues/6560
  - https://github.com/All-Hands-AI/OpenHands/issues/8497
---

# Gossip

## Positive Signals

- Developers praise OpenHands for being capable, open source, model-flexible, and more controllable than many proprietary agents.
- Community discussion frames it as underrated relative to its GitHub stars and benchmark visibility.
- Enterprise-friendly users like the possibility of local or self-hosted agents rather than a black-box cloud worker.

## Negative Signals

- Some public discussion says the documentation and onboarding can lag the product's ambition.
- GitHub resolver issues show practical workflow friction: multiple pull requests for one session, review-request routing, draft-PR compatibility with GitHub plan limits, and setup-script execution problems.
- The platform can feel more like infrastructure than a finished end-user assistant, especially when model keys, runtime setup, and repo-specific configuration are involved.

## Bug And Trust Themes

- The GitHub resolver's PR behavior is trust-sensitive because extra or retitled pull requests make it harder for maintainers to connect agent work to the original issue.
- Setup and plan-limit edge cases become user-experience failures because they happen at the moment the user expects an autonomous agent to remove toil.
- The lack of one signed execution timeline leaves reviewers reconstructing trust from GitHub comments, CI logs, and agent output.

## Epoch Takeaway

OpenHands proves the open, governable coding-agent platform is a real category. Epoch should compete by making every OpenHands-style run replayable, attributable, and policy-verifiable across the issue-to-PR lifecycle.
