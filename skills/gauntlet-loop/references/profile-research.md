# Research and design-document profile

## When to load this file

Load this reference after `gauntlet profile select research`, or whenever a
campaign produces research findings, analyses, or design documents whose
claims must survive verification. It is self-contained.

## What the profile models

The profile configuration is `assets/profiles/research.yaml`
(`profile_id: profile:research`). Structure is canonical before prose: the
claims graph and chronology ledger are edited sources of truth, the prose
draft is the canonical text, and the final document is a rendering.

| Node | Role | Purpose |
|---|---|---|
| `question-scope` | normative | Question, scope, audience, non-goals, evidence standard. |
| `source-reference-pack` | normative | Verified sources with provenance, access date, freshness, rights, snippet digests. |
| `claims-graph` | canonical | Typed claims (fact/inference/speculation/recommendation) with support/contradiction edges. |
| `chronology-entity-ledger` | canonical | Who/what changed state when, per source; catches anachronisms. |
| `evidence-map` | derived | Claim-to-source coverage, including negative evidence. |
| `counterclaims` | evaluative | Adversarial hypotheses; the research analogue of counterexamples. |
| `outline` | derived | Sections mapped to the claims they present. |
| `prose-draft` | canonical | Editable prose; every assertion carries a claim reference. |
| `citation-ledger` | derived | Citation → reference-pack entry → exact snippet. |
| `fact-check-observations` | observational | Holdout/independent fact-check results, append-only. |
| `final-document` | derived | Rendered output of the frozen draft. |

| Transform | What it protects |
|---|---|
| `edge:sources-to-evidence-map` | Mapped snippets exist verbatim in source digests; negative evidence kept. |
| `edge:claims-to-outline` | Every section references at least one claim. |
| `edge:outline-to-draft` | Claim-type labels survive into prose; no unreferenced assertions. |
| `edge:draft-to-citation-ledger` | Deterministic re-extraction; citations point at sources, not citations. |
| `edge:claims-to-fact-checks` | Holdout cases stay sealed from drafting. |
| `edge:draft-to-final` | Rendered text matches the frozen draft digest. |

## Evaluator templates

- `citation-fidelity` (`evaluator:citation-fidelity`, L4) — every citation
  resolves to a verified reference-pack entry; quoted snippets exist
  verbatim in the stored source digest; no citation points at another
  citation. Catches citation laundering and quote drift.
- `claim-evidence-coverage` (`evaluator:claim-evidence-coverage`, L4) —
  sourced facts have at least one verified source; contradictions are
  resolved or explicitly carried; claim-type labels are present. Catches
  inference dressed up as fact and silently dropped counter-evidence.

## Pitfalls specific to this profile

- **Separate sourced fact, inference, speculation, and recommendation.**
  The claim type is data, not tone. Prefer primary sources for technical
  claims where available. A confident sentence with no claim reference is
  a counterexample, not a style preference.
- **Citation fidelity, no laundering.** Cite the source you actually read;
  never cite a summary's citation as if you verified the original. Preserve
  exact raw source snippets (within legal/copyright limits) so fidelity is
  checkable later.
- **Detect contradictions; keep negative evidence.** Sources that disagree
  with your thesis go in the evidence map and counterclaims, not in the
  bin. Contradiction edges in the claims graph must be resolved or
  explicitly carried into the document as open questions.
- **Generated references are not normative until verified.** A model-drafted
  source entry stays outside the reference pack until provenance, access
  date, and rights are confirmed. Record source freshness so stale claims
  can be re-verified when the topic moves.

## Example spec fragment

```yaml
normative:
  hard_invariants:
    - every sourced-fact claim cites a verified reference-pack entry
    - no citation resolves to another citation
  target_dimensions:
    - claim-coverage
    - contradiction-resolution-rate
  protected_dimensions:
    - citation-fidelity
    - sourced-fact-vs-inference-separation
    - chronology-consistency
  human_only_judgments:
    - editorial voice and publication decision
evaluators:
  hard:
    - evaluator:citation-fidelity
  deterministic:
    - evaluator:claim-evidence-coverage
splits:
  promotion_manifest: .gauntlet/datasets/promotion/manifest.yaml  # sealed fact-check cases
```

Typical flow: `gauntlet spec init` → merge the fragment →
`gauntlet spec validate` → `gauntlet spec freeze` →
`gauntlet campaign start` → iterate with
`gauntlet experiment propose/fork/run/compare` (each candidate is a revised
claims graph/draft) → `gauntlet evaluate search`, then
`gauntlet evaluate promotion` against sealed fact-check cases →
`gauntlet promote plan/apply`.
