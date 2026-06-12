---
product: SWE-agent
slug: swe-agent
design_sources:
  - https://swe-agent.com/latest/
  - https://github.com/SWE-agent/SWE-agent
  - https://swe-agent.com/latest/usage/trajectories/
---

# Design

## Look And Feel

SWE-agent is documentation and CLI first. The public surface is a technical docs site, GitHub repository, benchmark framing, configuration files, command examples, and output trajectories. It does not try to look like an IDE or developer social surface.

## Open Design Artifacts

- Public docs expose architecture, tools, CLI usage, configuration, environments, model setup, and trajectory output files.
- GitHub README and repository structure show the research implementation and project status.
- Trajectory folders are a core artifact: they store experiment results from agent invocations and make runs inspectable after execution.

## Differentiators

- The Agent-Computer Interface and benchmark heritage differentiate SWE-agent from chat-oriented products.
- A single YAML-governed configuration makes experiments easier to reproduce and compare.
- mini-swe-agent's minimal implementation differentiates by showing how little surface area is required for a strong issue-fixing loop.

## What Works Well

- The product is honest about being hackable and research-oriented.
- Trajectory output gives researchers a native way to inspect what happened during a run.
- The docs foreground model choice and custom tasks rather than hiding agent mechanics.

## Where It Breaks Down

- The experience is not optimized for ordinary maintainers who want polished review, notification, and governance workflows.
- Configuration and environment setup can be more demanding than assigning a hosted cloud agent to an issue.
- Trajectories are useful evidence, but they are not automatically signed, normalized for long-term project history, or attached to the accepted commit as durable provenance.
