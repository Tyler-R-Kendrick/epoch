---
product: in-toto
gossip_sources:
  - https://github.com/in-toto/in-toto/issues
  - https://github.com/in-toto/attestation/issues
  - https://www.reddit.com/r/cybersecurity/comments/1p7ekew/
  - https://www.reddit.com/r/devops/comments/oimf1e/
---

# Gossip

## What People Say

Public sentiment around supply-chain security is urgent but skeptical. Security practitioners recognize that provenance and attestations matter, while developers often worry that the tooling adds ceremony without reducing day-to-day risk unless it is integrated into existing workflows.

## Bug And Friction Themes

- GitHub issues show the usual standard-and-reference-implementation friction: metadata compatibility, command behavior, dependency support, documentation clarity, and integration questions.
- Community discussion around supply-chain security often focuses less on one tool and more on the fatigue of managing dependencies, CI secrets, package compromises, and unclear responsibility.
- in-toto's biggest UX challenge is not whether the model is rigorous; it is whether teams can produce correct layouts and make verification failures actionable.

## Product Risk For Epoch

If customers ask for standards-compliant attestations first, Epoch's native history format may be judged by how easily it exports to or verifies against in-toto-style metadata.

## Opportunity For Epoch

Epoch can make the pre-build source and actor history easier to capture, then generate in-toto-compatible evidence for the release pipeline instead of forcing teams to duplicate provenance work.
