---
type: Reference
title: "Community Web startup and routing session state"
description: "SDLC state for resumable startup, sticky local routing, bottom-line actions, and focus expansion."
tags: [epoch, plans, sdlc, community-web, routing]
---

# Initiative: Community Web startup and routing

- **Phase:** closed
- **Slug:** `community-web-startup-routing`
- **Opened:** 2026-08-11
- **Host:** Codex
- **Pull request:** [#113](https://github.com/Tyler-R-Kendrick/epoch/pull/113)
- **Branch:** `agent/community-web-startup-routing`

## Goal

Give power users one recoverable startup/restart action, a cache-friendly model route, contextual bottom-line guidance, and a focus panel that can expand without losing context.

## Accepted plan

1. Detect compatible local continuation, update, and workspace-prime conditions and apply them together with `Ctrl+U`; preserve editor `Ctrl+U` when no restart is pending.
2. Keep one route sticky per workspace/session and only fail over on policy change or a recoverable backend failure. Use a Switchyard-compatible local policy shape without adding a proxy dependency.
3. Turn the status footer into a live bottom line with the recommended next action and hotkey.
4. Generalize the existing nav-collapse control into focused-panel expand/collapse.

## Rejected alternatives

- Per-turn semantic routing: rejected because it breaks conversation affinity and provider prompt-cache reuse.
- Bundling LiteLLM, Portkey, Vercel AI Gateway, or Switchyard into the static Community Web prototype: rejected because the existing on-device session only needs policy and affinity; transport belongs behind the existing model seam.

## Validation

- Failing product Gherkin and Community Web browser checks preceded implementation.
- Full verify stages passed: docs, lint, design, typecheck, structure, 152 Cucumber scenarios / 1388 steps, desktop/mobile axe, coverage, Pact, and Community Web faults; the final Community Web matrix was rerun independently after its focus synchronization fix and reported `all features hold`.
- Desktop and 390px browser captures passed adversarial persona review with no overflow or automatic fail.

## Closeout

- PR [#113](https://github.com/Tyler-R-Kendrick/epoch/pull/113) passed Quality Gates, CodeRabbit, Vercel, and a zero-thread final review sweep.
- Review uncovered ignored primary browser evidence and two shared page-readiness races; both were fixed before the final 152-scenario / 1388-step run passed.
- Squash merge `043d9244e688070d8fe243664ce16d5d24159fe6` is verified on `origin/main`.
