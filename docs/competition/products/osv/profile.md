---
product: OSV
slug: osv
category: vulnerability_intelligence
primary_sources:
  - https://osv.dev/
  - https://google.github.io/osv.dev/faq/
  - https://github.com/google/osv.dev
  - https://github.com/google/osv-scanner
---

# OSV

OSV is an open vulnerability database, schema, API, and scanner ecosystem for open-source packages and commits. OSV.dev aggregates vulnerability databases that use the OSV schema, while OSV-Scanner checks lockfiles, SBOMs, directories, commits, and container images against that data.

## Competitive Relevance

- OSV competes with Epoch's evidence model by making commit and package-version vulnerability lookup widely available.
- It gives developers and CI systems a direct API and CLI path for vulnerability evidence without adopting a larger governance platform.
- Its schema can become the common vulnerability vocabulary that downstream security tools expect.
- Its GitHub workflows pressure source platforms to surface risk during pull requests and recurring scans.

## Epoch Implications

- Epoch should preserve commit, package, SBOM, and materialized-version identifiers in ways OSV-style scanners can query.
- Epoch can differentiate by showing the source-history context behind vulnerable dependencies, not only the vulnerability match.
- OSV's open API model suggests Epoch should avoid closed evidence formats.

## Unknowns To Track

- OSV quality depends on upstream advisory databases, ecosystem coverage, and precise package or commit mapping.
- Vulnerability matching still needs exploitability and reachability context to avoid alert fatigue.
