---
product: CodeSandbox
slug: codesandbox
gossip_schema: 1
sources:
  - https://www.reddit.com/r/reactjs/comments/ibvcuy/is_codesandbox_really_buggy_with_refreshes_for/
  - https://www.reddit.com/r/reactjs/comments/dj0l38/if_you_get_annoyed_that_codesandbox_is_so_slow/
  - https://www.reddit.com/r/reactjs/comments/1bzocz2/using_codesandbox_instead_of_local_for_projects/
  - https://www.tryorbye.com/products/codesandbox
---

# CodeSandbox Gossip

## Positive Sentiment

- Developers praise CodeSandbox for quick React and frontend reproductions, shareable demos, embeds, and avoiding local setup.
- The SDK and VM cloning story creates excitement for agent platforms that need isolated execution without building their own sandbox fleet.
- Design-system teams value runnable examples because the product sits close to docs, components, and live preview.

## Negative Sentiment

- Long-running community complaints mention slow projects, stuck dependency downloads, compiling loops, refresh issues, and confusion when the UI changes.
- Some users prefer local development for stronger machines, clearer files, fewer resource limits, and better offline behavior.
- Pricing and plan gaps can feel steep when the user moves from casual sandboxing to heavier private or team usage.

## Bug And Friction Themes

- Dependency resolution and compile hangs can block the "instant" promise.
- Larger projects can expose resource limits, performance degradation, or configuration differences from local machines.
- Users can struggle to understand which environment mode is active and why behavior differs from a local terminal.

## Epoch Takeaways

- Epoch should not rely on "instant sandbox" alone as evidence; the system needs durable records when builds, tests, or dependency installs fail.
- Preview-first UX is valuable, but signed history and review provenance are the differentiators for serious repository workflows.
- Forkable environment state is a useful mental model for Epoch's branch, checkpoint, and agent-review surfaces.
