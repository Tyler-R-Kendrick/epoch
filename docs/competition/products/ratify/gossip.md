---
product: Ratify
gossip_sources:
  - https://github.com/notaryproject/ratify/issues
  - https://www.reddit.com/r/Cybersecurity101/comments/1rczdox/whats_your_process_for_generating_sboms_for/
  - https://www.reddit.com/r/devsecops/comments/1sxx2l2/minimal_images_passed_every_cve_scan_then_a/
  - https://www.reddit.com/r/kubernetes/comments/u6idex/
---

# Gossip

## What People Say

Public supply-chain discussions often agree with Ratify's core premise: generating SBOMs or signatures is easier than enforcing them consistently in production. Admission controllers, Cosign, Notation, Gatekeeper, Kyverno, and SLSA/in-toto attestations are commonly mentioned as the runtime verification path.

## Bug And Friction Themes

- Verification can become a multi-system debugging problem across build pipelines, registries, signature storage, policy engines, and Kubernetes admission.
- On-prem and private-registry environments create extra friction around official image signatures, registry credentials, and metadata discovery.
- Teams worry that "signed" can become performative unless the signature ties back to source, builder identity, workflow, and review evidence.

## Product Risk For Epoch

If platform teams standardize on admission-time artifact checks, they may see source-history trust as optional background detail.

## Opportunity For Epoch

Epoch can provide the missing source-side explanation: which signed intent, CI event, reviewer decision, and materialized version produced the artifact that Ratify accepted or rejected.
