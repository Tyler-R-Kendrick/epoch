---
product: Google Binary Authorization
gossip_sources:
  - https://www.reddit.com/r/googlecloud/comments/1sjszdx/6_nuances_of_binary_authorization_that_are_hard/
  - https://www.reddit.com/r/googlecloud/comments/1gvngq9/binary_authorisation/
  - https://www.reddit.com/r/devsecops/comments/1sxx2l2/minimal_images_passed_every_cve_scan_then_a/
  - https://www.reddit.com/r/devops/comments/1qnnqby/applying_provenance_to_kubernetes_manifests/
---

# Gossip

## What People Say

Binary Authorization is respected as a serious managed deployment gate, but practitioners describe the real work as architecture and IAM separation: deployer, attestor, attestation, and key ownership must be designed deliberately. Recent community discussion also notes that it supports key Google runtimes but is not a universal compute-wide control.

## Bug And Friction Themes

- The setup can feel underexplained because secure deployments may need multiple projects, attestors, keys, IAM boundaries, and CI handoffs.
- Cloud-specific support limits make it less useful for heterogeneous infrastructure.
- Teams still struggle with the larger provenance loop: signing, SBOMs, source commit identity, builder identity, and runtime validation need to line up.

## Product Risk For Epoch

Google Cloud can absorb deployment trust requirements into the platform bill, reducing demand for a separate repository trust product among GKE and Cloud Run users.

## Opportunity For Epoch

Epoch can be the portable evidence source behind Binary Authorization: signed source intent, review, CI, materialized version, image digest, and attestation export.
