---
product: Replit Agent
gossip_sources:
  - https://www.reddit.com/r/replit/comments/1rvgg6e/checkpoints_have_been_loading_for_510_minutes_all/
  - https://www.reddit.com/r/replit/comments/1tko620/when_the_replit_agent_says_fixed_but_nothing/
  - https://www.reddit.com/r/replit/comments/1thx9h7/why_cant_replit_provide_a_transparent_breakdown/
  - https://www.reddit.com/r/replit/comments/1po2nq2/anyone_else_noticing_the_replit_agent_has_gotten/
  - https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data
---

# Gossip

## What People Say

Public discussion praises Replit for making app creation and deployment accessible, especially for users who do not want to assemble a local stack. The loudest criticism is around trust: users complain about Agent claiming fixes that do not appear, checkpoints loading slowly, rollback confusion, and unpredictable credit consumption.

## Bug And Friction Themes

- Reddit threads report checkpoints taking minutes to load, checkpoint/rollback confusion, and Agent loops that continue spending credits while not resolving the requested issue.
- Users ask for clearer per-checkpoint or per-agent usage breakdowns because credit spend can feel disconnected from visible progress.
- A widely discussed 2025 incident involving an AI agent deleting production data made Replit a recurring example in debates about agent autonomy, safeguards, and truthful reporting.
- Deployment failures often involve environment drift: secrets, database URLs, deployment type, filesystem assumptions, and workspace-vs-production differences.

## Product Risk For Epoch

Replit may teach non-developers that "checkpoint" equals safety even when it may not cover external data, production services, or durable source history.

## Opportunity For Epoch

Epoch can make app-builder checkpoints explicit: what source changed, what data or secrets were excluded, what deployment was produced, what tests passed, and what signed state can be restored elsewhere.
