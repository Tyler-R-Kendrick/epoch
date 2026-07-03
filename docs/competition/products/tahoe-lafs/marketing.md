---
product: Tahoe-LAFS
marketing_sources:
  - https://www.tahoe-lafs.org/
  - https://tahoe-lafs.readthedocs.io/en/latest/architecture.html
  - https://tahoe-lafs.readthedocs.io/en/latest/about.html
  - https://github.com/tahoe-lafs/tahoe-lafs
---

# Marketing

Tahoe-LAFS is a community-driven open-source project, so its "marketing" is a positioning narrative carried by tahoe-lafs.org, the readthedocs documentation, and the GitHub project rather than a commercial campaign.

## Target Customers

- Operators and communities who need durable storage across servers they do not fully trust, individually or collectively.
- Privacy- and integrity-sensitive users who want confidentiality and tamper-evidence enforced by the client, not by a provider's promise.
- Federated or friend-to-friend grids where independent participants pool storage and none is a single point of trust or failure.
- Archival and backup use cases that value quantifiable durability (survive N−k server losses) and self-repair over raw throughput.

## Positioning

Tahoe-LAFS is positioned as "provider-independent security": the people who run the storage servers can neither read your data nor undetectably alter it, because the client encrypts and erasure-codes before upload and verifies Merkle hashes on download. The pitch is least authority — you grant exactly a read, write, or verify capability and nothing more — combined with quantifiable durability from k-of-N erasure coding spread across a grid of independent servers.

## Customer Model

- Adoption is open-source and self-hosted; the value is the software and the grid model, not a hosted service.
- Durability is a dial: operators choose k and N to trade storage overhead (N/k expansion) against how many server failures the grid survives.
- Capabilities make sharing and delegation the unit of distribution — hand out a read-cap to share, a verify-cap to let someone repair without reading.
- Repair and rebalancing keep a grid healthy over time by regenerating missing shares from survivors using only verify-caps.

## Captures

- Trust-minimized storage where servers are untrusted for both confidentiality and integrity.
- Least-authority sharing: delegate read, write, or verify independently via caps.
- Durable archival that survives multiple server losses and self-heals from surviving shares.
- Community and federated grids pooling independent operators' storage.

## Misses

- Version control: no history, branching, diff, or authorship — it is storage, not a VCS.
- Signed authorship: authority is capability possession, not a signature identifying who wrote a change.
- Turnkey convenience: standing up and operating a grid, and tuning k/N, is heavier than a single hosted bucket.
- Mainstream scale: the operator/user base is small, and the performance and storage overhead of encryption plus erasure coding is real.
