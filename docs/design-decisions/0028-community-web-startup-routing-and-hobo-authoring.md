# ADR-0028: Recoverable Community Web Startup, Sticky Routing, And Deterministic HoBo Authoring

Status: Accepted

## Context

Community Web power users need to resume work from other coding-agent sessions,
apply a local update, and prime workspace defaults without three independent
startup interruptions. They also need model routing that does not move a
conversation between providers every turn and thereby discard provider prompt
cache locality. HoBo app authoring must reuse HoBo's checked templates, generated
agent docs, codegen gates, and trainable stubs instead of asking a model to invent
the application lifecycle.

The current Community Web is a static local browser app with one on-device model
transport. It has no reason to embed a gateway process or collect provider
credentials merely to choose and remember a route.

## Decision

Use one restart inbox and one workspace-affinity route:

- Host adapters may publish validated `continuation`, `update`, and `workspace`
  startup signals. The bottom line names all compatible signals; `Ctrl+U`
  applies them in the deterministic order update → workspace defaults →
  continuation and restarts once. Invalid metadata is ignored. With no pending
  startup action, `Ctrl+U` remains the file editor's page-up chord.
- Select the first eligible route once per workspace and policy version. Keep
  that route until a recoverable failure explicitly invalidates it or the policy
  version changes. Persist only route ids and policy metadata, never prompts or
  credentials.
- Carry an explicit native wire `format` in route policy. This follows
  Switchyard's warning that translating Claude traffic through an OpenAI format
  can remove Anthropic `cache_control` and silently defeat prompt caching.
- Keep transport fail-closed. The prototype records the capable fallback but
  does not call a remote provider without an installed host adapter and
  user-scoped authorization.
- Make `bo` the default HoBo builder agent. Bo retrieves generated HoBo agent
  docs, invokes one deterministic `hobo_workbench` contract for new/build/test/
  debug/up-plan, and emits a signature-preserving `"use training"` stub when
  requested logic exceeds the selected model's declared capability.

The initial local policy is deliberately small:

```json
{
  "version": "community-web-local-v1",
  "affinity": "workspace-session",
  "invalidateOn": ["policy-change", "recoverable-failure"],
  "routes": [
    { "id": "local", "model": "on-device", "format": "native" },
    { "id": "capable", "model": "switchyard/capable", "format": "auto" }
  ]
}
```

## Alternatives Compared

| Alternative | Useful policy/config surface | Decision for Community Web |
|---|---|---|
| [NVIDIA NeMo Switchyard](https://nvidia-nemo.github.io/Switchyard/) | OpenAI/Anthropic/Responses translation, coding-agent launchers, stage routing, typed profiles, and conversation affinity. | Best future local proxy seam. Reuse its affinity/native-format rules now; do not require its Python process for a static on-device route. |
| [LiteLLM](https://docs.litellm.ai/) | Broad provider normalization, retries/fallbacks, budgets, caching, and centralized gateway controls. | Strong multi-provider operations choice, but larger than the current local policy need and Python-centric. |
| [Portkey Gateway](https://portkey-docs.mintlify.dev/docs/product/ai-gateway) | Self-hosted gateway, simple/semantic cache, conditional routes, circuit breakers, budgets, and guardrails. | Appropriate when Community Web needs shared gateway operations; unnecessary for one local browser session. |
| [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) | Managed model/provider routing, fallbacks, budgets, and usage visibility. | Rejected as the built-in default because it is managed egress, not a local-first control layer. It may remain an opt-in backend. |
| Per-turn semantic/classifier routing | Potential cost/quality optimization on each request. | Rejected by default: adds latency/cost and fragments conversation/prompt-cache affinity. Consider only after measured route-quality evidence. |

## Consequences

Positive:

- One hotkey completes compatible startup work without a modal wizard.
- A stable model/system-prefix route improves provider prompt-cache opportunity
  and makes cost/egress behavior explainable.
- The same policy can later point at Switchyard, LiteLLM, Portkey, or a managed
  gateway without changing Community Web's workspace/session identity.
- HoBo authoring is reproducible and honest about unsupported logic.

Trade-offs:

- Host integrations must publish continuation and update metadata; the browser
  cannot discover arbitrary local agent state on its own.
- A sticky route may miss a cheaper model for one turn. Explicit failure or
  policy-version invalidation is the controlled escape hatch.
- The prototype's capable fallback is policy evidence, not a live cloud call.

## Revisit Criteria

Revisit when Community Web gains two live provider transports, measured routing
quality justifies stage/classifier routing, cross-device affinity is required,
or HoBo changes its generated docs/template/trainable contracts.

## Related Documents

- [Community Web](../community-web/README.md)
- [Current Design](../design.md)
- [Community Web feature scenarios](../../features/community_web_experience.feature)
- [Design Decisions Index](README.md)
