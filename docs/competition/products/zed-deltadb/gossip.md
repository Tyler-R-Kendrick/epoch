---
product: Zed DeltaDB
gossip_sources:
  - https://github.com/zed-industries/zed/issues/8260
  - https://github.com/zed-industries/zed/issues/24878
  - https://www.reddit.com/r/programming/comments/1o4h34t/zeds_deltadb_idea_real_problem_or_overkill/
  - https://www.reddit.com/r/ZedEditor/comments/1t5763g/were_not_building_ai_features_for_the_money/
  - https://www.reddit.com/r/ZedEditor/comments/1reti5l/are_they_prioritising_only_ai_features/
  - https://zed.dev/docs/collaboration/overview
  - https://zed.dev/docs/ai/privacy-and-security
---

# Gossip

## What People Say

Public reaction splits between excitement about preserving code intent and skepticism about recording too much. Supporters recognize the pain of lost rationale in Slack, PRs, and stale comments. Skeptics ask why Git, generated commits, PR links, notes, or better team discipline cannot solve the same problem with less machinery.

## Bug And Friction Themes

- Zed has an open collaboration documentation request asking for deeper security architecture and self-hosting details.
- Zed has an open offline-support tracking issue covering network jank across sign-in, telemetry, extension downloads, language-server startup, and assistant providers.
- Community threads worry that operation-level histories could increase noise unless the product extracts intent from transient edits and conversations.
- Some users like Zed's speed and multibuffer workflows but remain unconvinced that AI-first positioning is the right center of gravity.
- Public collaboration docs warn users to collaborate only with trusted people because project sharing grants access to local files within the shared project.

## Product Risk For Epoch

Zed can make CRDT-backed collaboration feel ordinary by hiding it inside an editor developers already use. Epoch's risk is not that DeltaDB has a published standalone protocol today; it is that Zed may own the user-facing context layer before portable repository-event systems become familiar.

## Opportunity For Epoch

Epoch can win the trust and portability flank: cryptographic author identity, editor-neutral event storage, deterministic policy, offline-first sync, and a public format that teams can audit without adopting one IDE.
