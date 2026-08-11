---
type: Reference
title: "Nightboard startup and HoBo workbench session state"
description: "SDLC state for resumable startup, sticky local routing, deterministic HoBo authoring, bottom-line actions, and focus expansion."
tags: [epoch, plans, sdlc, nightboard, hobo, routing]
---

# Initiative: Nightboard startup and HoBo workbench

- **Phase:** closed
- **Slug:** `nightboard-startup-hobo`
- **Opened:** 2026-08-11
- **Host:** Codex
- **Pull request:** [#113](https://github.com/Tyler-R-Kendrick/epoch/pull/113)
- **Branch:** `agent/nightboard-startup-hobo`

## Goal

Give power users one recoverable startup/restart action, a cache-friendly model route, a deterministic HoBo app loop, contextual bottom-line guidance, and a focus panel that can expand without losing context.

## Accepted plan

1. Detect compatible local continuation, update, and workspace-prime conditions and apply them together with `Ctrl+U`; preserve editor `Ctrl+U` when no restart is pending.
2. Keep one route sticky per workspace/session and only fail over on policy change or a recoverable backend failure. Use a Switchyard-compatible local policy shape without adding a proxy dependency.
3. Reuse HoBo's offline scaffold, generated agent-doc, build/test/debug/up, and trainable-stub contracts in the default `bo` agent and workbench commands.
4. Turn the status footer into a live bottom line with the recommended next action and hotkey.
5. Generalize the existing nav-collapse control into focused-panel expand/collapse.

## Rejected alternatives

- Per-turn semantic routing: rejected because it breaks conversation affinity and provider prompt-cache reuse.
- Bundling LiteLLM, Portkey, Vercel AI Gateway, or Switchyard into the static Nightboard prototype: rejected because the existing on-device session only needs policy and affinity; transport belongs behind the existing model seam.
- Free-form LLM HoBo code generation: rejected because HoBo already defines contract-backed templates, generated docs, freshness gates, and trainable stubs.

## Validation

- Failing product Gherkin and Nightboard browser checks preceded implementation.
- Full verify stages passed: docs, lint, design, typecheck, structure, 152 Cucumber scenarios / 1388 steps, desktop/mobile axe, coverage, Pact, and Nightboard faults; the final Nightboard matrix was rerun independently after its focus synchronization fix and reported `all features hold`.
- Desktop and 390px browser captures passed adversarial persona review with no overflow or automatic fail.

## Closeout

- PR [#113](https://github.com/Tyler-R-Kendrick/epoch/pull/113) passed Quality Gates, CodeRabbit, Vercel, and a zero-thread final review sweep.
- Review uncovered ignored primary browser evidence and two shared page-readiness races; both were fixed before the final 152-scenario / 1388-step run passed.
- Squash merge `043d9244e688070d8fe243664ce16d5d24159fe6` is verified on `origin/main`.
