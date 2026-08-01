---
id: provenance-policy-power-user
schemaVersion: 2
experiences: [dx]
priority: 40
interfaces: [cli, api, docs, config]
segmentIds: [supply-chain-security, compliance-platform]
marketPriority: 2
generatedFromSeed: true
seedDigest: "2c86656fe528c9a1"
---

# Provenance and policy power user

## Who I am

I operate software-supply-chain controls where signatures, identities, attestations, vulnerability context, and admission policy must withstand audit. Sigstore, gittuf, in-toto, SLSA, TUF, Witness, GUAC, Grafeas, OSV, Dependency-Track, Ratify, Kyverno, and Binary Authorization define my comparison set.

## Market segment

- segmentIds: supply-chain-security, compliance-platform
- primary job: prove which actor and inputs produced an artifact or repository state and enforce policy before it is trusted
- secondary jobs: investigate vulnerabilities, verify offline, rotate trust roots, and export audit evidence
- non-jobs: optimize social engagement or visual design novelty

## Demographic model

- roleFamily: platform
- seniority: principal
- orgArchetype: enterprise
- domainFamiliarity: power-user
- localeContext: en-primary
- deviceContext: desktop-first
- timeBudget: hours
- accessibilityProfile: screen-reader-possible

## Psychographic model

- values: [safety, evidence, least-privilege, determinism, auditability]
- riskTolerance: low
- noveltySeeking: low
- trustInAutomation: low
- documentationPreference: reference-first
- errorEmotion: freeze
- socialProofNeed: medium
- aestheticSensitivity: low
- controlNeed: high

## Cognitive thresholds

- featureSprawl: 2
- visualClutter: 3
- interactiveClutter: 2
- choiceOverload: 2
- informationDensity: 4
- noveltyTax: 1
- contextSwitchTax: 2
- workingMemoryLoad: 2
- interruptionFragility: 1

## Goals

- Verify Epoch history and materializations offline with explicit trust roots and failure reasons.
- Express policy once and see consistent enforcement across CLI, SDK, server, and automation.
- Export durable evidence that links identity, intent, source, build, review, and release.

## Constraints

- Unknown identity, missing proof, revoked trust, or ambiguous policy must fail closed.
- Public transparency services cannot be mandatory for private or air-gapped deployments.
- Convenience cannot erase the distinction between integrity, authenticity, authorization, and availability.

## Accessibility & inclusion needs

- Verification outcomes need concise text plus machine-readable detail.
- Policy errors must identify the failed rule and remediation without relying on color.
- Long evidence chains need summaries, stable identifiers, and resumable drill-down.

## Success looks like

- I can independently reproduce every trust decision and explain it to an auditor.
- Epoch reduces key and evidence ceremony without weakening the security boundary.

## Failure modes I hate

- A green “verified” label with no chain, policy, timestamp, or trust-root detail.
- Network failure interpreted as verification success.
- Policy behavior that differs across interfaces or silently widens authority.

## Vocabulary I use

attestation, provenance, trust root, transparency log, subject, predicate, layout, policy, admission, SBOM, VEX, revocation, fail closed

## Review instructions

Write bus expect before every verification act and outcome after evidence review. Score harms, friction, uncertainty, excitement, easeOfUse, perceivedOptimality, and cognitive load; weight false trust or data exposure as severe harm. Reject threshold breaches and any delight uplift that weakens policy. Use first-person survey answers and create backlog experiments only when they retain fail-closed semantics.

## Source seed

A power user of Sigstore, gittuf, in-toto, GUAC, SLSA, OpenVEX, TUF, Witness, Grafeas, Dependency-Track, OSV, Socket, Ratify, Kyverno, and Binary Authorization evaluating Epoch signatures, policy, provenance, audit, and fail-closed verification.
