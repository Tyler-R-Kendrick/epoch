---
product: Phorge
gossip_sources:
  - https://phorge.it/
  - https://www.phacility.com/phabricator/
  - https://github.com/phacility/phabricator
  - https://forums.freebsd.org/threads/phabricator-is-no-longer-actively-maintained.82560/
  - https://discuss.getsol.us/d/6915-phabricator-is-no-longer-actively-maintained
  - https://phabricator.wikimedia.org/phame/post/view/307/from_phabricator_to_phorge/
---

# Gossip

## What People Say

Public conversation around Phorge is inseparable from Phabricator's maintenance story. When Phacility ended active maintenance in 2021, communities faced either migration pain or fork maintenance. Phorge's appeal is that it preserves a tool many teams considered uniquely capable, especially for Differential stacks and integrated project workflows.

## Design And UX Complaints

- Some users disliked Phabricator's UX even when they depended on it; complaints often cite dated interaction patterns and unfamiliar terminology.
- Moving away is hard because equivalents for stacked revisions, audit workflows, Herald rules, and integrated tasks are not always available in one replacement.
- Instance-specific customization can make "Phorge" feel different from organization to organization.

## Feature Complaints

- The strongest complaint is not one feature but ecosystem risk: the original upstream stopped active maintenance, forcing communities to evaluate migration or fork stewardship.
- Arcanist and Differential workflows can be disruptive for contributors used to pull requests.
- Keeping local patches and extensions compatible with upstream Phorge requires testing and operational attention.

## Product Risk For Epoch

Phorge shows that durable workflow depth can create long-lived loyalty even when the UX feels dated. Epoch should aim for the same durable artifact model while making migration, maintenance, and contributor onboarding less painful.
