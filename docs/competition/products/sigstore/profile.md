---
product: Sigstore
slug: sigstore
category: artifact_provenance
primary_sources:
  - https://sigstore.dev/
  - https://docs.sigstore.dev/
  - https://docs.sigstore.dev/about/tooling/
  - https://docs.sigstore.dev/about/security/
  - https://docs.sigstore.dev/cosign/signing/overview/
---

# Sigstore

Sigstore is an open-source software-signing ecosystem that makes artifact signatures, identity-bound certificates, and transparency-log verification easier to adopt. Its main components include Cosign for signing and verification, Fulcio for short-lived signing certificates, Rekor for transparency-log entries, and TUF-delivered trust roots.

## Competitive Relevance

- Sigstore competes with Epoch's trust story by making signed artifact provenance practical without asking developers to manage long-lived keys.
- Rekor's transparency log is an adjacent answer to tamper-evident history: it records proof that a signature existed and can be verified later.
- Cosign and GitHub Actions integrations make provenance part of existing CI and registry flows instead of a separate repository system.
- Sigstore's public-good framing gives it credibility with open-source maintainers who may distrust proprietary attestation platforms.

## Epoch Implications

- Epoch should treat key management and verification ergonomics as product features, not implementation details.
- Epoch can differentiate by signing and preserving source-history events, actor intent, and repository materialization evidence, not only release artifacts.
- Sigstore shows that trust primitives win adoption when they are hidden behind simple developer commands and CI defaults.

## Unknowns To Track

- Enterprise private deployments, offline verification, and regulated environments may require different defaults than the public Sigstore service.
- The ecosystem is broader than one UI or CLI, so user experience varies by registry, CI provider, language package manager, and verifier.
