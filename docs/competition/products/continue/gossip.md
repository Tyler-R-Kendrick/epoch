---
product: Continue
slug: continue
gossip_sources:
  - https://www.reddit.com/r/LocalLLaMA/comments/1jfz31l
  - https://www.reddit.com/r/ChatGPTCoding/comments/1izkilg
  - https://www.reddit.com/r/LocalLLaMA/comments/1mqc9pr/tools_not_working_with_continue_dev_in_vscode_for/
  - https://www.reddit.com/r/cursor/comments/1f2idvw/continuedev_vs_cursor/
---

# Gossip

## Positive Signals

- Community users value Continue as an open-source, model-flexible alternative to closed IDE assistants.
- Local-model users like being able to split roles across chat, edit, apply, autocomplete, and agent workflows.
- Some teams see Continue's docs/context features and configuration transparency as stronger than black-box assistants.

## Negative Signals

- Autocomplete with local or OpenAI-compatible providers is a recurring pain point, especially when FIM endpoints and chat endpoints do not match.
- Users complain that autocomplete can be noisy, wasteful, or less polished than bundled products.
- Configuration names and docs have shifted across versions, making copied examples and generated configs easy to get wrong.

## Bug And Trust Themes

- Continue's openness creates flexibility, but also moves provider compatibility and config correctness onto the user.
- Tool policies and secrets handling are important trust controls, yet they do not by themselves prove which settings were active when a change landed.
- Team-managed agents may reduce prompt drift, but governance catalogs still need history and signed change records.

## Epoch Takeaway

Continue shows that coding-agent competition is moving toward reusable team configurations. Epoch should preserve the exact active configuration and evidence for accepted changes so governance becomes auditable history, not only a current dashboard state.
