---
product: OpenVEX
design_sources:
  - https://github.com/openvex/spec
  - https://github.com/openvex/vexctl
  - https://github.com/openvex
---

# Design

## Look And Feel

OpenVEX is a specification-and-tooling product. Its design surface is minimal JSON-LD, GitHub-hosted specs, command-line generation, and scanner integration. The experience is intentionally plain: produce a precise exploitability statement, attach it to a product or artifact, and let downstream tools suppress or explain alerts.

## Open Design Assets

- The OpenVEX spec, JSON schema, namespace files, and examples are public on GitHub.
- `vexctl` exposes the practical CLI flow for creating, applying, merging, and attesting VEX metadata.
- No dedicated visual UI or design-token package was found; the design is the compact document model and CLI workflow.

## Differentiators

- Minimality is the primary differentiator: OpenVEX tries to capture the required exploitability statement without forcing a specific SBOM format.
- The status model turns vulnerability triage into structured data that scanners can consume.
- The tooling acknowledges real workflows such as creating, transforming, and attesting VEX documents.

## What Works

- The format is small enough for producers to understand and generate.
- SBOM independence avoids binding exploitability statements to a single inventory format.
- CLI tooling fits release and security automation where vulnerability decisions are already made.

## UX Breakdowns

- Users still need to understand product identifiers, vulnerability IDs, status meaning, timestamps, authorship, and discovery conventions.
- Minimal fields can create pressure for extensions when teams want severity, CVSS, risk scoring, richer justification, or workflow state.
- Scanner compatibility varies, so a valid OpenVEX document may still require conversion before it affects existing vulnerability-management tools.

## Epoch Design Lessons

Epoch should make security decisions explainable without bloating the core history model. A compact external evidence format can work if Epoch keeps strong links back to the exact source version, test evidence, and actor decision that justified the statement.
