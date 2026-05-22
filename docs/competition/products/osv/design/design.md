---
product: OSV
design_sources:
  - https://osv.dev/
  - https://google.github.io/osv-scanner/output/
  - https://google.github.io/osv.dev/faq/
  - https://github.com/google/osv-scanner
---

# Design

## Look And Feel

OSV uses a search-and-reference design. The public site foregrounds vulnerability search, API examples, ecosystem counts, schema examples, scanner commands, remediation commands, and screenshots of HTML or GitHub Action output. The experience is closer to infrastructure documentation than a commercial security dashboard.

## Open Design Assets

- OSV.dev exposes the public search UI, API examples, schema examples, and ecosystem list.
- OSV-Scanner docs show terminal, JSON, SARIF, HTML, and GitHub workflow output paths.
- GitHub repositories provide implementation, issue trackers, release notes, and development history.

## Differentiators

- The schema maps vulnerabilities to package versions and commit hashes, which is more precise than generic CVE text for many open-source ecosystems.
- The API-first model keeps the product usable from scripts, CI, scanners, and other services.
- OSV-Scanner is intentionally developer-operable: lockfiles, SBOMs, images, and directories can all be scanned without a large platform rollout.

## What Works

- Developers can quickly search a vulnerability, call the API, or run a CLI scanner.
- The open schema encourages ecosystem adoption and third-party tooling.
- GitHub workflow support makes continuous scanning easy for teams already using GitHub Actions.

## UX Breakdowns

- The public site is useful for lookup but does not provide rich portfolio governance, ownership, or remediation workflow by itself.
- Users still need to understand package identity, lockfiles, SBOM quality, and transitive dependency context.
- Raw vulnerability matches can remain noisy without reachability, exploitability, and deployment evidence.

## Epoch Design Lessons

Epoch should treat vulnerability lookup as a reusable evidence service, not a closed feature. The differentiated UI should connect OSV-style matches to source revisions, materialized versions, and review decisions.
