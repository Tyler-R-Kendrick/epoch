---
product: Open SWE
slug: open-swe
category: open_source_asynchronous_coding_agent_framework
primary_sources:
  - https://www.langchain.com/blog/introducing-open-swe-an-open-source-asynchronous-coding-agent
  - https://www.langchain.com/blog/open-swe-an-open-source-framework-for-internal-coding-agents
  - https://github.com/langchain-ai/open-swe
---

# Open SWE

Open SWE is LangChain's open-source asynchronous coding-agent framework. It connects to GitHub tasks, plans work, writes code, runs tests, reviews its own changes, and opens pull requests, while exposing a customizable architecture for organizations building internal coding agents.

## Competitive Relevance

- Open SWE competes less as a polished IDE and more as a reference architecture for internal agent platforms.
- It emphasizes long-running cloud workflows, GitHub issue and UI delegation, human-in-the-loop plan review, double-texting while the agent is running, subagent orchestration, and PR creation.
- The 2026 framework positioning broadens the product from hosted demo into a reusable implementation of patterns seen in internal coding agents at companies such as Stripe, Ramp, and Coinbase.
- Its LangGraph and Deep Agents foundation makes it attractive to teams already using LangChain infrastructure for observability, deployment, and agent state.

## Epoch Implications

- Open SWE's plan-review and GitHub tracking issue design makes agent intent more visible than a single final PR, but the evidence remains product-specific and not inherently signed.
- Epoch can differentiate by turning the plan, interruptions, code actions, test attempts, subagent outputs, and PR into portable provenance.
- Because Open SWE is framework-oriented, Epoch can integrate as an evidence layer for teams who want to build internal agents rather than replace their agent runtime.

## Unknowns To Track

- Open SWE is still evolving quickly, with architecture, sandbox, webhook, model, and deployment choices in motion.
- Adoption may depend on LangGraph/LangSmith affinity, Anthropic key availability, and the team's appetite for operating a framework rather than buying a finished product.
