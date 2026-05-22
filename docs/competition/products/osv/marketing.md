---
product: OSV
marketing_sources:
  - https://osv.dev/
  - https://google.github.io/osv.dev/faq/
  - https://github.com/google/osv-scanner
---

# Marketing

## Target Customers

- Open-source ecosystem maintainers and advisory database operators.
- Developers who need a free vulnerability lookup API and CLI scanner.
- Security tooling vendors that need machine-readable vulnerability data.
- CI owners who want lightweight continuous vulnerability checks.

## Positioning

OSV positions itself as an open, precise, distributed approach to vulnerability data for open source. The core pitch is machine-readable vulnerability records that map to exact packages, versions, and commits, plus tools that make the data easy to consume.

## Customer Model

OSV is open infrastructure sponsored through Google's open-source security work. It does not sell seats; value is captured through ecosystem trust, tool adoption, and downstream integrations.

## Captures

- Developers who want immediate CLI or API scanning without procurement.
- Open-source ecosystems that need a shared advisory format.
- Security platforms that want a broad open vulnerability feed.

## Misses

- Enterprises needing native ownership workflows, approvals, SLAs, and portfolio dashboards.
- Teams needing exploitability, reachability, or deployment context out of the box.
- Users who want a source-control system to prove how vulnerable code entered the repository.

## Epoch Lessons

OSV captures vulnerability intelligence. Epoch should make its repository evidence easy to query against OSV while keeping the richer source-history, actor, and materialization context that OSV deliberately does not own.
