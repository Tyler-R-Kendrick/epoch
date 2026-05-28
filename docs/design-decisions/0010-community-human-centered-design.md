# ADR-0010: Design Thinking And Human-Centered Design For Epoch Community

Status: Accepted

## Context

Epoch Community is intentionally GitHub-like in broad category: repository
discovery, issues, reviews, discussions, profiles, releases, and organization
spaces. That similarity is useful for orientation, but it is not enough for
product design.

Recent GitHub availability, security, tier, and Copilot billing changes show
that a community forge is not only a feature surface. It is a trust, cost,
security, moderation, accessibility, and resilience environment for people who
often contribute in unpaid or time-constrained contexts. Copying GitHub-shaped
features without understanding those human pressures would copy the anxiety as
well as the workflow.

## Decision

Use design thinking, user-centric design, and human-centered design as the
driving design methodologies for the Epoch Community site and related Community
package work.

The default persona for Community product decisions is **a GitHub open-source
contributor**. Community work must start from this contributor's goals, pain
points, and constraints unless a different persona is explicitly documented.

The canonical design guide is
[Epoch Community Human-Centered Design](../community-human-centered-design.md).
Community changes should begin by adding or updating persona-driven Gherkin
scenarios under `features/`, then identify:

- the persona and contribution journey;
- the design-thinking stage being validated;
- the user-centric success criteria;
- the pain point or human risk being reduced;
- the trust, cost, security, privacy, accessibility, moderation, and
  portability considerations;
- what happens when hosted dependencies, search, CI, AI assistance, or billing
  are degraded; and
- how the workflow will be validated.

## Consequences

Positive:

- Community design can stay contributor-led instead of becoming a feature clone.
- Design-thinking stages and user-centric success criteria become explicit BDD
  evidence instead of private design intent.
- Reliability, security, and billing context become part of UX definition of
  done rather than late operational caveats.
- Agent instructions and skills now have a concrete persona and checklist for
  future Community work.
- The Community package boundary remains compatible with the existing
  descriptor-only Platform Web integration.

Trade-offs:

- More Community changes require upfront research and explicit validation notes.
- Some feature ideas may be rejected even if they are familiar from other
  forges because they do not solve a documented contributor pain point.
- The primary persona is broad, so specialized personas may still be needed for
  maintainers, moderators, security responders, enterprise operators, or
  first-time learners.

## Rejected Alternatives

Clone GitHub feature parity first.

- Rejected because feature parity does not prove that Epoch solves contributor
  trust, resilience, cost, or security needs.

Treat Community as an operator-first Platform Web submodule.

- Rejected because [ADR-0008](0008-separate-platform-web-and-community.md)
  keeps hosting operations and community collaboration separate.

Document human-centered design only in prose outside the repo.

- Rejected because future agents and contributors need durable, discoverable
  instructions that `npm run docs:check` can keep reachable.

## Revisit Criteria

Revisit this decision if:

- Community introduces a materially different primary audience;
- production feedback shows the GitHub open-source contributor persona is too
  broad to guide design decisions;
- Community ships a visual product surface that needs a more detailed design
  system; or
- billing, security, availability, or moderation assumptions change enough that
  the current research signals are stale.

## Related Documents

- [Epoch Community Human-Centered Design](../community-human-centered-design.md)
- [Epoch Platform Packages](../platforms.md)
- [Current Design](../design.md)
- [Design Decisions Index](README.md)
