---
type: Agent Skill Reference
title: "SDLC persona minimum"
description: "Only design, test, and implement what changes documented persona outcomes."
tags: [epoch, sdlc, persona, minimum]
timestamp: 2026-08-20T00:00:00Z
---

# Persona minimum

## Rule

If a change does not improve a **named, documented persona** journey, do not build it in this
loop. Specs and designs stay the **minimum necessary** to produce the intended outcome.

## Personas

- Matrix: [docs/persona-feature-matrix.md](../../../docs/persona-feature-matrix.md)
- Default Community persona: GitHub open-source contributor (unless overridden).
- Agents are **users** (policy-bound members), not features — tag scenarios accordingly.
- Competitor **power-user** personas: derive from
  [docs/evidence/competition/](../../../docs/evidence/competition/) when the surface competes;
  they are adversarial critics of craft and capability parity.

## Reject

- Orphan `.feature` files / tests for unused components.
- Persona/governance process scenarios posing as product journeys.
- Spec fluff, extra screens, or API surface that no persona scenario exercises.
- “While we’re here” refactors unrelated to the persona outcome (separate initiative).
- New packages/directories when an existing module can own the change
  ([repo-hygiene.md](repo-hygiene.md)).

## Accept

- Gherkin journeys with `@persona.*` from a real app context to a successful outcome.
- Pact + unit coverage on the path those journeys need.
- DESIGN.md-compliant UI when the persona sees or operates the surface.
- Extending cohesive existing modules over scattering parallel helpers.