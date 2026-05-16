---
product: gittuf
design_sources:
  - https://gittuf.dev/documentation
  - https://gittuf.dev/documentation/contributors
  - https://gittuf.dev/documentation/maintainers/policy
  - https://gittuf.dev/documentation/developers/design
---

# Design

## Look And Feel

gittuf is documentation-first and CLI-first. Its public design uses a technical documentation site organized by user role: consumers verify repositories, contributors record and verify pushes, maintainers define policy, and developers study the internals. The product's interaction design is policy commands, repository metadata, and verification feedback rather than a graphical collaboration surface.

## Open Design Assets

- The documentation site exposes role-based flows and policy concepts.
- The developer design docs explain independent verification, policy guardrails, protected activity logs, and system-agnostic Git compatibility.
- No screenshot-heavy app surface or public token package was found for this pass.

## Differentiators

- The role-based docs acknowledge that repository security has different actors with different jobs.
- Policy metadata lives in the repository, which makes verification feel closer to Git history than to a hosted admin panel.
- The design deliberately removes the forge as the only enforcement and audit point.

## What Works

- Security concepts are mapped to repository-native actions, which should help experienced Git users understand the blast radius.
- Consumers can verify without needing admin access to the hosting platform.
- Maintainers get granular branch, tag, file, principal, and delegated policy concepts that resemble real enterprise controls.

## UX Breakdowns

- The product asks users to learn a dense trust model before they see much visual payoff.
- CLI-first policy authoring can be hard for teams that already struggle to maintain GitHub or GitLab branch protections consistently.
- Because gittuf is independent of forges, it must explain how its checks relate to existing pull request, approval, and CI workflows.

## Epoch Design Lessons

Epoch should pair repository-native trust metadata with clearer visualization than a pure policy CLI. The differentiator should be not just that evidence exists, but that teams can understand who did what, under which policy, and why a version is trustworthy.
