---
product: Amazon Q Developer
slug: amazon-q-developer
design_schema: 1
sources:
  - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/
  - https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/amazon-q-for-github.html
  - https://aws.amazon.com/q/developer/
---

# Amazon Q Developer Design

## Look And Feel

Q Developer inherits AWS's utilitarian console language: dense documentation, structured tables, service-oriented navigation, and task panels inside IDE extensions. Public screenshots emphasize chat panels, issue summaries, threaded review comments, and AWS-branded setup flows rather than an expressive standalone editor.

## Design References

- Product screenshots: AWS Q Developer marketing and documentation pages for IDE chat, GitHub app setup, and review workflows.
- Open design cues: AWS docs expose quotas, setup steps, IAM/Identity Center distinctions, and GitHub app behavior in a highly structured information architecture.
- Design tokens: no public Q Developer token package is advertised; visual language follows AWS console and toolkit conventions.

## Differentiators

- AWS identity, billing, and policy primitives are part of the product design, which makes Q feel operationally serious for cloud teams.
- The GitHub app flow turns agent development and code review into normal repository events: labels, slash commands, PR comments, summaries, and generated fixes.
- Java transformation provides a wizard-like modernization flow with build validation and downloadable diffs rather than only chat-generated suggestions.

## What Works Well

- The interface is predictable for teams already living in AWS and GitHub.
- Review defaults are pragmatic: changed code can be reviewed first, while users can ask for file, project, or repository review.
- Transformation limits and quotas are explicit enough for operators to plan usage, even when the model is more complex than a flat seat license.

## UX Breakdowns

- The product surface is fragmented across IDE plugins, CLI, AWS console pages, GitHub app comments, and documentation.
- Identity paths differ by Builder ID, IAM user, IAM Identity Center, and GitHub app installation, which creates setup confusion.
- Review and transformation evidence is useful but not inherently durable as project history; teams still need their own audit layer for accepted agent work.
