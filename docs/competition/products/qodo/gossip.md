---
product: Qodo
slug: qodo
gossip_schema: 1
sources:
  - https://www.reddit.com/r/qodo/comments/1iej4w8
  - https://www.reddit.com/r/qodo/comments/1n6ehrs
  - https://www.reddit.com/r/ClaudeCode/comments/1rs4jzw/has_anyone_tried_the_new_PR_review_thats_supposedly_costing_25_per_PR/
  - https://arxiv.org/abs/2604.03196
---

# Qodo Gossip

## What People Like

- Qodo inherited goodwill from the open PR-Agent / Qodo Merge style of command-driven review.
- Users interested in review agents like the idea of catching duplicate logic and cross-repo issues before merge.
- Qodo's cost and quality comparisons get attention because teams are nervous about expensive AI review loops.

## Repeated Complaints

- Buyers are skeptical of vendor quality claims and ask whether hosted review is worth more than a custom Claude/Codex review command.
- Product renaming from PR-Agent to Qodo Merge to Qodo v2 creates some discoverability friction.
- Credit and per-review cost comparisons are hard because PR size, context depth, and model choice change the economics.

## Bugs And Friction

- Review agents can add load instead of reducing it if comments are noisy, duplicated, or hard to verify.
- Pull-request comments can become disconnected from final merge decisions when commits are amended or force-pushed.
- Independent studies of code review agents are emerging, which may pressure Qodo and similar tools to prove precision and recall with reproducible methodology.

## Epoch Takeaway

Qodo is a useful warning: review comments are not enough. Epoch should make review state part of the signed record of a change, so future maintainers know what was checked, fixed, waived, and merged.
