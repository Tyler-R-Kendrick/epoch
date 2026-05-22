---
product: OSV
gossip_sources:
  - https://github.com/google/osv.dev/issues
  - https://github.com/google/osv-scanner/issues
  - https://www.reddit.com/r/blueteamsec/comments/zlbbp0/
  - https://www.reddit.com/r/sysadmin/comments/1i5xav3/
  - https://www.reddit.com/r/ClaudeAI/comments/1rl1cfg/
---

# Gossip

## What People Say

OSV is commonly treated as useful open infrastructure. Developers and security practitioners reference it as a practical database for dependency checks, SBOM scanning, and agent/package-install guardrails.

## Bug And Friction Themes

- Users ask for packaging, container, workflow, and integration conveniences around OSV-Scanner.
- Matching quality can be hard to reason about when package identity, distro packages, or SBOM contents do not line up with advisory data.
- Public discussions about scanner output often return to the broader problem of false positives and missing reachability context.

## Product Risk For Epoch

OSV can become the default evidence endpoint for vulnerability questions, reducing appetite for proprietary vulnerability models in a repository product.

## Opportunity For Epoch

Epoch can treat OSV as an input while preserving the stronger causal story: which actor introduced a vulnerable dependency, which version materialized it, and which review or test evidence supported remediation.
