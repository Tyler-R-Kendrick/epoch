---
product: Aider
slug: aider
category: terminal_git_native_coding_agent
primary_sources:
  - https://aider.chat/
  - https://aider.chat/docs/usage.html
  - https://aider.chat/docs/git.html
  - https://aider.chat/docs/repomap.html
---

# Aider

Aider is an open-source AI pair programmer that runs in a terminal against a local Git repository. It connects to cloud and local models, builds a repository map for context, edits selected files, runs lint and test feedback loops, and automatically commits its changes with generated commit messages.

## Competitive Relevance

- Aider competes for developers who want AI coding help without adopting a new IDE, hosted workspace, or bundled subscription.
- The product's strongest overlap with Epoch is its Git-native work loop: AI changes become reviewable commits, and users can undo or inspect them with ordinary Git tools.
- Its repo map, convention files, `/test`, `/run`, watch-files, voice, image, and web-page context features make it more than a simple chat wrapper.
- Aider's BYOK and local-model posture captures privacy-sensitive and cost-sensitive developers who distrust opaque subscription quotas.

## Epoch Implications

- Aider proves that frequent, agent-authored commits are a compelling trust primitive, but the commit does not preserve prompt, context, model, approval, lint, and test evidence as durable signed provenance.
- Epoch can differentiate by turning a terminal agent's prompt, repo-map inputs, file hashes, command outputs, and accepted commits into portable evidence that survives outside the local chat session.
- Aider's explicit Git integration makes it a good reference competitor for showing how Epoch can improve ordinary Git history without forcing a new editor.

## Unknowns To Track

- Aider's model quality and economics depend heavily on external providers, API pricing, and local-model capability.
- Large-repository context selection, open issue volume, and session-resume ergonomics remain important adoption risks.
