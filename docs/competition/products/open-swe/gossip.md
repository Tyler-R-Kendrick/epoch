---
product: Open SWE
slug: open-swe
gossip_sources:
  - https://github.com/langchain-ai/open-swe/issues/1116
  - https://github.com/langchain-ai/open-swe/issues/1180
  - https://github.com/langchain-ai/open-swe/issues/1094
  - https://github.com/langchain-ai/open-swe/issues/847
  - https://www.reddit.com/r/ExperiencedDevs/comments/1nfzhqd/anyone_experimenting_with_ai_agents_that_pick_up/
---

# Gossip

## Positive Signals

- Developers looking for agents that pick up GitHub issues and open PRs describe exactly the asynchronous teammate workflow Open SWE is designed to support.
- LangChain's launch narrative resonates with teams that see IDE copilots as too synchronous for backlog work.
- The open repository and framework posture make it easier for internal platform teams to inspect and adapt the workflow.

## Negative Signals

- GitHub issues show stability and setup concerns around sandbox creation, model authentication, fallback models, webhook token handling, and PR title/description conventions.
- Some users report that issue, PR, and chat comments can lead to duplicated or extraneous work with long runtimes.
- Feature requests for custom agent frameworks and richer MCP/model/sandbox configuration show pressure against tight coupling to the default architecture.

## Bug And Trust Themes

- Asynchronous agents need strong resume and checkpoint behavior; stale sandbox state or missing API keys erode confidence quickly.
- Human-in-the-loop controls are useful only if the final PR remains traceable to the accepted plan and subsequent user interventions.
- Framework flexibility can become governance ambiguity unless teams record which model, sandbox, prompt, and webhook path produced each artifact.

## Epoch Takeaway

Open SWE is a useful competitor because it exposes the internal-agent architecture teams may build themselves. Epoch should offer the provenance layer those teams would otherwise have to design after the agent already ships code.
