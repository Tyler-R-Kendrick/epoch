---
product: IPFS
marketing_sources:
  - https://docs.ipfs.tech/concepts/content-addressing/
  - https://docs.ipfs.tech/concepts/lifecycle/
  - https://ipfs.github.io/pinning-services-api-spec/
---

# Marketing

IPFS is an open protocol and project, so its "marketing" is an adoption and positioning narrative carried by the IPFS docs, the multiformats standards, and the surrounding ecosystem (pinning services, gateways, Filecoin).

## Target Customers

- Builders of decentralized applications who want content-addressed, verifiable storage instead of location-addressed URLs.
- Publishers of datasets, web content, and NFT/media assets who want durable, deduplicated, tamper-evident references.
- Infrastructure teams building content-delivery, archival, or peer-to-peer sync systems on an open addressing standard.
- Web3 and data-provenance projects that need self-verifying identifiers.

## Positioning

IPFS positions itself as the content-addressed successor to location-addressed HTTP: reference data by what it is (a CID) rather than where it lives. The messaging emphasizes verifiability, deduplication, and resilience against a single origin. Persistence and hosting incentives are positioned separately, largely via pinning services and the Filecoin incentive layer, which is where the availability story is quietly delegated.

## Customer Model

- Adoption is open-source and ecosystem-driven rather than a single-vendor sales motion.
- Persistence is monetized and operationalized by third parties through the standardized Pinning Services API and by Filecoin's storage-incentive market.
- Gateways lower the barrier by letting ordinary HTTP clients resolve CIDs without running a node.
- Value accrues across an ecosystem of node operators, pinning providers, and gateway hosts.

## Captures

- Integrity- and provenance-sensitive use cases that benefit from self-verifying CIDs.
- Deduplicating publishers whose content overlaps heavily across versions or files.
- Decentralized apps that want an open, standardized addressing layer.
- Users who pair IPFS with a pinning service or Filecoin to solve persistence.

## Misses

- Guaranteed availability out of the box: unpinned content is garbage-collected, which surprises users repeatedly.
- Confidential or access-controlled content: the model is oriented to public, discoverable data.
- Reachability-sensitive users behind restrictive NAT, where possession does not imply retrievability.
- Teams needing mutable, signed, collaborative history rather than fixed content references, the gap an Epoch-style DVCS fills.
