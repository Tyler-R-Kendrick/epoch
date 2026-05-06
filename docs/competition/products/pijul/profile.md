---
product: Pijul
slug: pijul
category: patch_theory_dvcs
primary_sources:
  - https://pijul.org/
  - https://pijul.org/manual/why_pijul.html
  - https://pijul.org/manual/conflicts.html
  - https://nest.pijul.com/pijul/pijul/discussions
---

# Pijul

Pijul is a patch-theory DVCS built around commutative changes and first-class conflicts. It overlaps Epoch on alternative merge semantics and the idea that independent changes should compose without conventional Git history surgery.

## Competitive Relevance

- Pijul's core differentiator is mathematical change commutation.
- It argues that merge correctness and first-class conflicts are better primitives than snapshot-based branch workflows.
- Its adoption challenge is maturity, ecosystem, and performance perception compared with Git.

## Epoch Implications

- Epoch should borrow the clarity of "conflict resolution is itself a change" for signed intent/rejection events.
- Epoch should avoid overpromising "no conflicts"; Pijul's messaging is careful that unknown order should surface as a conflict.

