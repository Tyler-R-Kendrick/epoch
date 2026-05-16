---
product: Sigstore
marketing_sources:
  - https://sigstore.dev/
  - https://docs.sigstore.dev/
  - https://openssf.org/
---

# Marketing

## Target Customers

- Open-source maintainers who need signing without painful key management.
- Platform and DevSecOps teams that want artifact provenance in CI/CD, container registries, and package publishing.
- Security-conscious consumers who need verifiable publisher identity and tamper-evidence before deploying software.

## Positioning

Sigstore positions itself as open, easy software signing for the supply chain. The pitch is not a full repository replacement; it is the missing trust layer for artifacts and releases, with keyless identity and transparency as the adoption unlock.

## Customer Model

Sigstore is an open-source public-good ecosystem under OpenSSF rather than a conventional SaaS product. Commercial value is captured indirectly by vendors that integrate, operate, support, or build policy layers around Sigstore-compatible signing and verification.

## Captures

- Teams that already ship through CI/CD and want provenance without changing their source-control workflow.
- Open-source communities that prefer foundation-governed infrastructure over a proprietary trust provider.
- Container-heavy organizations that can attach signatures and attestations to existing registry flows.

## Misses

- Teams seeking a full collaboration, history, review, or repository data model.
- Users who need highly visual history exploration rather than CLI and metadata verification.
- Organizations that cannot depend on public services and are not ready to operate private signing infrastructure.

## Epoch Lessons

Sigstore captures "can I trust this artifact?" Epoch should capture "can I trust this repository history and all of the actor events that produced it?"
