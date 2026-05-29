---
product: Google Jules
slug: google-jules
category: asynchronous_github_coding_agent
primary_sources:
  - https://jules.google/
  - https://jules.google/docs/
  - https://jules.google/docs/usage-limits
  - https://jules.google/docs/cli/reference/
  - https://jules.google/docs/api/reference/
---

# Google Jules

Google Jules is an asynchronous coding agent from Google Labs that connects to GitHub, clones a repository into a Google Cloud VM, creates a plan, edits code, shows a diff, and publishes a branch or pull request. It competes with Epoch around task-level agent history, branch handoff, and the trust model for autonomous changes created outside a developer's local workspace.

## Competitive Relevance

- Jules is explicitly positioned around "coding tasks you do not want to do": bug fixes, version bumps, tests, and feature building.
- GitHub issues can be assigned through the `jules` label, making asynchronous agent work fit existing maintainer triage.
- Public limits emphasize daily and concurrent task throughput rather than IDE completion.
- Jules Tools and API surfaces move the product from a web app into terminal and workflow automation.

## Epoch Implications

- Jules proves that async branch production is becoming mainstream and easy to explain.
- Google owns the cloud VM, task planning surface, and model access, but the durable project record still lands as a Git branch or pull request.
- Epoch can differentiate by preserving plan, execution evidence, signed snapshots, and review decisions as first-class history instead of leaving them scattered across Jules, GitHub, and comments.

## Unknowns To Track

- Paid plan availability is currently tied to individual Google AI plans and @gmail.com accounts, with business upgrade paths still evolving.
- Jules model access changed from Gemini 2.5 Pro to higher-tier Gemini 3 Pro positioning in public pages; recheck before quoting model details.
