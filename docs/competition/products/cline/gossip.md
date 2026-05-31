---
product: Cline
slug: cline
gossip_sources:
  - https://www.reddit.com/r/CLine/comments/1kuh5ds
  - https://www.reddit.com/r/Jetbrains/comments/1njmcfg/cline_ai_coding_agent_now_supports_all_jetbrains/
  - https://www.reddit.com/r/ChatGPTCoding/comments/1hhuz18/why_on_earth_do_people_use_cline_when_it_costs_so/
  - https://www.reddit.com/r/ChatGPTCoding/comments/1srii5o/cline_and_roo_code_are_dying_projects_alternatives/
---

# Gossip

## Positive Signals

- Users value Cline's direct API access, model choice, visible context, and ability to avoid opaque subscription caps.
- Plan/Act, checkpoints, browser use, and MCP support are commonly cited as meaningful differentiators from simpler chat assistants.
- The open-source implementation and visible tool calls help security-minded teams reason about what the agent can do.

## Negative Signals

- Usage-based inference creates cost anxiety, especially on large tasks where repeated full-context calls consume expensive model tokens.
- Community threads report bugs, ignored issues, rough JetBrains plugin behavior, and concerns about project momentum compared with forks or alternatives.
- Users often need external context-management habits, smaller tasks, or manual planning to avoid runaway context windows.

## Bug And Trust Themes

- Cline's transparency makes cost and context problems visible, but visibility does not eliminate them.
- Checkpoints reduce fear of file damage, yet users still need to review diffs, run tests, and decide what becomes durable Git history.
- Enterprise trust claims depend on local processing, provider controls, and audit dashboards; Epoch can complement that with signed repository evidence.

## Epoch Takeaway

Cline shows the value of per-tool-step recovery and visible authority boundaries. Epoch should make similar checkpoints and approvals durable across tools, editors, and commits instead of leaving them inside a task transcript.
