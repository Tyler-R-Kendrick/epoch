---
product: SWE-agent
slug: swe-agent
category: research_first_github_issue_fixing_agent
primary_sources:
  - https://swe-agent.com/latest/
  - https://github.com/SWE-agent/SWE-agent
  - https://github.com/SWE-agent/mini-swe-agent
  - https://swe-agent.com/latest/usage/trajectories/
---

# SWE-agent

SWE-agent is an open-source research-first software-engineering agent that uses a language model to operate tools, inspect repositories, edit code, run tests, and resolve real GitHub issues. The project now recommends mini-swe-agent for most current development because it preserves performance while reducing complexity.

## Competitive Relevance

- SWE-agent is one of the canonical open-source references for autonomous GitHub issue fixing and SWE-bench-style evaluation.
- It competes for researchers, benchmark builders, and advanced developers who want configurable agent loops rather than a hosted product.
- Its design emphasizes an Agent-Computer Interface, YAML configuration, trajectories, model choice, and reproducible experiments.
- mini-swe-agent makes the same category more approachable by proving a small implementation can perform competitively.

## Epoch Implications

- SWE-agent validates that trajectories are important competitive artifacts: agent actions, outputs, and results need to be inspectable after a run.
- Epoch can differentiate by making those trajectories signed, content-addressed, linked to commits, and useful for governance outside a research folder.
- The research-first posture shows that replayability and evidence quality are product features, not just compliance extras.

## Unknowns To Track

- SWE-agent's center of gravity is shifting toward mini-swe-agent, so documentation and user expectations may diverge.
- Benchmark performance does not automatically translate to maintainer trust in real repositories with messy issues, flaky tests, secrets, and project-specific norms.
