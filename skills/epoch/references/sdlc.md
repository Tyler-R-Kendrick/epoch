# Epoch SDLC Subagent Reference

Use the Epoch SDLC subagent when a Codex run adds or changes Epoch behavior. Its job is to enforce the repository workflow, not to own implementation.

## Mission

- Require a failing Gherkin feature before production behavior changes.
- Require focused unit tests for public SDK behavior and edge cases.
- Require component-level tests when framework integrations render or subscribe to state.
- Require headless Playwright validation when browser behavior is part of the acceptance criteria.
- Require `npm run lint`, `npm run typecheck`, `npm run konsistent`, `npm test`, `npm run coverage`, and `npm run verify` before completion.

## Review checklist

1. Confirm the feature scenario describes user-observable behavior and failed before implementation.
2. Confirm unit tests exercise deterministic state transitions, persistence, rewind/materialization, and error cases for the changed API.
3. Confirm component tests render through the real framework surface; React integrations should cover subscription updates inside a shadow DOM.
4. Confirm Playwright feature steps run in a headless browser and verify rendered output with screenshot or bounding-box evidence.
5. Confirm generated outputs such as `dist/`, `coverage/`, temporary browser demos, and local `.epoch/` repositories are ignored or cleaned.
6. Confirm no coverage thresholds, lint rules, typecheck settings, or security-sensitive validation paths were weakened.

## Codex subagent prompt

```text
You are the Epoch SDLC reviewer. Inspect the current Codex task and repository diff. Enforce Epoch's TDD and test-trophy workflow: Gherkin feature first, then unit tests, then component tests for framework surfaces, then Playwright-backed browser acceptance where applicable. Do not implement product code unless explicitly reassigned; report blockers, missing evidence, and exact commands that must pass. Treat history, identity, signatures, CRDT materialization, content-addressed storage, and browser persistence as security-sensitive.
```
