---
product: Aider
slug: aider
gossip_sources:
  - https://www.reddit.com/r/ChatGPTCoding/comments/1jksv9t/aider_079_context_feature/
  - https://www.reddit.com/r/LLMDevs/comments/1o680tv
  - https://www.reddit.com/r/GithubCopilot/comments/1j4xs61
  - https://www.reddit.com/r/ChatGPTCoding/comments/1kr875w
---

# Gossip

## Positive Signals

- Developers praise Aider's automatic commits, `/undo`, and Git-native safety net compared with editor agents that leave a larger opaque working tree.
- BYOK and local-model support are viewed as attractive by users who want control over model choice and marginal token cost.
- Community comments often frame Aider as a better fit for experienced developers who can deliberately choose files, prompts, branches, and tests.

## Negative Signals

- Users complain that context selection can become tedious in complex codebases, especially when many files must be named or summarized.
- Some reports describe bad model edits, truncated files, or changes applied to the wrong area, requiring manual review despite the Git safety net.
- The project has visible issue and pull-request volume, and community requests for better session resume, system prompts, or richer UI can outpace maintainer attention.

## Bug And Trust Themes

- Aider's trust model depends on Git review discipline. If users accept auto-commits casually, the safety net becomes history clutter rather than evidence.
- Context-cost tradeoffs are visible and empowering for experts, but they also make every large task feel like a manual context-management exercise.
- The core gap for Epoch is provenance: Aider commits code, but it does not produce a portable signed record of why the agent changed it and which evidence passed.

## Epoch Takeaway

Aider validates Git-native agent workflows. Epoch should absorb the good part - commits as a familiar review unit - while adding signed prompt, context, command, and verification evidence around those commits.
