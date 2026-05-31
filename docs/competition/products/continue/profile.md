---
product: Continue
slug: continue
category: configurable_ai_code_assistant_and_agent_platform
primary_sources:
  - https://docs.continue.dev/features/agent/quick-start
  - https://docs.continue.dev/features/agent/how-it-works
  - https://docs.continue.dev/guides/configuring-models-rules-tools
  - https://www.continue.dev/pricing
---

# Continue

Continue is an open-source AI code assistant and agent platform for IDE extensions, CLI/TUI, headless agents, and team-managed configurations. It combines Chat, Plan, Agent, Edit, Autocomplete, rules, model roles, MCP tools, reusable configs, secrets, and Mission Control governance.

## Competitive Relevance

- Continue competes for teams that want AI coding agents as reusable, governed configuration rather than only a single local chat session.
- Its model/rule/tool block system overlaps Epoch's need to preserve which agent instructions, tools, secrets, and model roles shaped a change.
- Plan mode and Agent mode mirror the read-only versus mutating authority boundary used by other coding agents.
- Pricing now targets pay-as-you-go agent usage, team-shared private agents, controlled agent catalogs, SSO, BYOK, invoicing, and SLA.

## Epoch Implications

- Continue's strongest lesson for Epoch is configuration provenance: the same repository change can mean different things depending on which agent, rules, model roles, MCP tools, and secrets were active.
- Epoch can differentiate by recording those active configuration blocks and tool policies as signed evidence next to accepted code and history.
- Continue's organization-level governance captures team buyers, while Epoch can capture downstream auditors who need portable proof of what happened.

## Unknowns To Track

- Continue's docs and product names are changing quickly as Hub/Mission Control and agent surfaces evolve.
- Local model, autocomplete, and provider compatibility issues remain common community friction points.
