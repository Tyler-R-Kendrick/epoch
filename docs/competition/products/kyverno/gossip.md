---
product: Kyverno
gossip_sources:
  - https://www.reddit.com/r/kubernetes/comments/1jrch91/
  - https://www.reddit.com/r/kubernetes/comments/1amkpme/
  - https://www.reddit.com/r/kubernetes/comments/123pmwy/
  - https://www.reddit.com/r/devsecops/comments/1t4fg1h/why_do_our_docker_security_checks_pass_in_dev_but/
---

# Gossip

## What People Say

Kyverno is often praised as easier to adopt than policy engines that require a separate policy language, especially for Kubernetes teams that already manage YAML. In image-signing conversations, it is commonly named alongside OPA Gatekeeper, Cosign, and admission-controller preflight testing.

## Bug And Friction Themes

- Users still struggle with private registries, image metadata access, and signature lookup behavior.
- Policy exceptions and templating can become complex as organizations scale from examples to many teams.
- Developers get frustrated when CI scans pass but production admission policy blocks the deployment later.

## Product Risk For Epoch

Kyverno can make signed artifact admission feel sufficient, especially for platform teams whose main risk is "what runs in the cluster."

## Opportunity For Epoch

Epoch can make Kyverno decisions less surprising by replaying admission policies against signed versions before deploy and by storing the policy result as repository evidence.
