---
product: Kiro
slug: kiro
gossip_sources:
  - https://github.com/kirodotdev/Kiro/issues/2171
  - https://github.com/kirodotdev/Kiro/issues/1720
  - https://github.com/kirodotdev/Kiro/issues/7212
  - https://www.reddit.com/r/kiroIDE/comments/1m61w1l
  - https://www.reddit.com/r/kiroIDE/comments/1mxb2oa
  - https://aws.amazon.com/security/security-bulletins/AWS-2025-019/
---

# Gossip

## Positive Signals

- Developers respond to the spec-first model because it gives agent work more structure than pure chat prompts.
- Public examples praise Kiro for turning requirements into implementation plans, running task workflows, and automating repetitive test or documentation work through hooks.
- The product has unusually clear vocabulary around steering, hooks, subagents, and credits, which helps teams discuss agent governance.

## Negative Signals

- GitHub issues and Reddit threads show frustration around usage limits, unclear reset timing, throttling, and metering bugs that consumed more requests than users expected.
- Some users view the spec flow as friction when they only need a small bug fix or localized edit.
- Prompt injection and agent security concerns around Kiro and Amazon Q Developer keep AWS agent tools under scrutiny.

## Bug And Trust Themes

- Credit exhaustion is a workflow blocker when agents stop mid-task or retry against a hard usage window.
- Background hooks and subagents can create hidden work unless the product exposes exact event, prompt, file, and command trails.
- AWS-scale trust can become a liability when users expect stronger security disclosure and guardrails than smaller vendors provide.

## Epoch Takeaway

Kiro proves that agentic development artifacts can be more structured than chat. Epoch should treat requirements, specs, tasks, hooks, and agent execution as first-class provenance inputs so teams can audit not only what changed, but why the agent believed the change was authorized.
