---
product: Daytona
gossip_sources:
  - https://www.reddit.com/r/AI_Agents/comments/1sh2x4p/i_compared_sandbox_options_for_ai_agents_heres_my/
  - https://www.reddit.com/r/AI_Agents/comments/1rudh8k/sandboxes_are_the_biggest_bottleneck_for_ai/
  - https://www.reddit.com/r/LangChain/comments/1sr60mz/sandbox_pricing_calculator_vercel_vs_freestyle_daytona_e2b_modal/
  - https://www.daytona.io/changelog/sandbox-activity-and-resource-limits
---

# Gossip

## Public Sentiment

Public AI-agent infrastructure discussion increasingly treats sandboxing as a bottleneck: teams want safe execution, but they argue about startup latency, persistence, operating-system access, provider lock-in, and whether the unit economics work at scale.

## What People Like

- Daytona is frequently mentioned alongside E2B, Modal, Vercel Sandbox, Freestyle, and custom microVM systems as a serious sandbox option.
- Stateful environments, snapshots, and computer-use capabilities address common complaints that ephemeral code interpreters lose context.
- Dashboard spending and activity features answer the practical question of which agent workload is burning money.

## Complaints And Friction

- Sandbox APIs vary by provider, making portability difficult when teams want to switch for pricing, compliance, or feature reasons.
- Usage-based sandbox costs can surprise builders when agents loop, idle, or run heavy workloads.
- GUI automation is valuable but fragile because real applications expose inconsistent accessibility trees and visual states.

## Bug And UX Themes

- Recent Daytona changelog items show active fixes around proxy path handling, SDK errors, quota responses, Python WebSocket handling, and dashboard pagination.
- The category's broader pain points are stale sandbox state, cold starts, missing persistence, noisy screenshots, and unclear resource limits.
- Private-alpha OS support means some advertised computer-use workflows are not generally available yet.

## Epoch Takeaway

The runtime layer is becoming crowded. Epoch should avoid competing only on sandbox mechanics and instead make sandbox work verifiable, replayable, and reviewable as part of repository history.
