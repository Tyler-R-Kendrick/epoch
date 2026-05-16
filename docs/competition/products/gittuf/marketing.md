---
product: gittuf
marketing_sources:
  - https://openssf.org/projects/gittuf/
  - https://openssf.org/blog/2025/06/06/from-sandbox-to-incubating-gittufs-next-step-in-open-source-security/
  - https://gittuf.dev/documentation
---

# Marketing

## Target Customers

- Open-source projects and foundations that need stronger repository integrity than forge settings alone provide.
- Security teams worried about compromised source-control platforms, malicious pushes, weakened branch protection, and tampered audit logs.
- Developers and maintainers who need a Git-compatible security layer rather than a migration to a new forge.

## Positioning

gittuf positions itself as platform-agnostic Git security. The core claim is that policy, authorization, and activity verification should be independently checkable from repository data, not only trusted because a central forge says the controls were applied.

## Customer Model

gittuf is an OpenSSF open-source project. Value is captured through ecosystem adoption, integrations, enterprise security programs, and potential vendor support around policy management and verification.

## Captures

- Teams that already know Git but want stronger assurances around who can change protected content.
- Organizations that distrust any single forge as the complete root of trust.
- Security researchers and supply-chain teams building toward SLSA-style source integrity.

## Misses

- Teams looking for a polished graphical source-control product.
- Developers who mainly want easier branching, review, or local task management.
- Organizations that prefer managed SaaS controls and do not want to operate or explain repository-local security metadata.

## Epoch Lessons

gittuf captures the repository-policy layer. Epoch should either interoperate with this style of evidence or make its own policy and activity proof easier to use and easier to inspect.
