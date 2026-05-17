---
product: SLSA
design_sources:
  - https://slsa.dev/spec/latest/
  - https://slsa.dev/spec/v1.2/build-track-basics
  - https://slsa.dev/spec/v1.2-rc1/tracks
  - https://github.com/slsa-framework/slsa
---

# Design

## Look And Feel

SLSA is a specification product, so its design is the design of a vocabulary, documentation hierarchy, tables, tracks, and levels. The public site uses plain technical documentation with track pages, requirements, terminology, and implementation guidance. The user experience is not a dashboard; it is a shared map that lets teams compare current controls to target assurance levels.

## Open Design Assets

- The specification pages are public and versioned.
- GitHub hosts the website, specification content, issue tracker, community process, and governance materials.
- No app screenshots or design-token package are central to the product; the key artifact is the spec structure itself.

## Differentiators

- The track-and-level model turns a complex security domain into a memorable progression.
- SLSA separates build, source, and emerging build-environment concerns, which helps teams reason about different trust boundaries.
- The docs explicitly target multiple audiences: producers, consumers, ecosystems, and infrastructure providers.

## What Works

- A maturity ladder gives executives and security teams a way to set goals without debating every control from first principles.
- The provenance vocabulary is concrete enough for tools to generate and verify evidence.
- Versioned specs create stability while still allowing the framework to evolve.

## UX Breakdowns

- Users can confuse old SLSA level language with newer track-specific versions, especially when blog posts and tools lag the current spec.
- The framework can feel abstract until a specific CI provider or package ecosystem shows exactly how to generate and verify provenance.
- Higher assurance levels expose organizational work, not just tooling work, so implementation can stall on process and ownership questions.

## Epoch Design Lessons

Epoch should provide a simple assurance map for repository history. Users should see what evidence exists, what assurance level it supports, and which missing controls prevent stronger trust claims.
