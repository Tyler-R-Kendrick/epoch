---
product: Sourcegraph Amp
slug: sourcegraph-amp
gossip_schema: 1
sources:
  - https://www.reddit.com/r/AmpCode/comments/1r74v37/how_are_we_supposed_to_use_amp_now/
  - https://www.reddit.com/r/AmpCode/comments/1obcodc
  - https://www.reddit.com/r/cursor/comments/1kpin6e/tried_amp_sourcegraphs_new_ai_coding_agent_heres/
  - https://www.reddit.com/r/vibecoding/comments/1sp1w9v/flowing_with_agents_with_Beyang_Liu_CTO_of_Sourcegraph/
---

# Sourcegraph Amp Gossip

## What People Like

- Users report strong results when Amp is given an implementation plan and allowed to work through subagents or handoffs.
- Developers like the CLI-native feel and the ability to work without adopting a different editor.
- The "agent flow" conversation around avoiding babysitting resonates with teams trying to supervise longer tasks.

## Repeated Complaints

- Cost anxiety appears often because agentic work can consume paid credits quickly.
- Users ask how Sourcegraph expects them to use Amp in practice, which suggests the workflow model is powerful but still forming.
- Some community members remain frustrated by Sourcegraph's shift from Cody packaging to Amp.

## Bugs And Friction

- Reports of indentation or formatting mistakes in languages such as Python and YAML show that agent edits still need deterministic checks.
- Shared threads help with collaboration, but they can become another place where rationale lives outside the repository.
- Model routing as an implementation detail simplifies UX but can make cost and behavior harder to predict.

## Epoch Takeaway

Amp's thread model is promising, but agent memory should not be stranded in a tool. Epoch should let teams preserve the parts of a thread that matter as signed, reviewable project history.
