---
product: Tahoe-LAFS
slug: tahoe-lafs
category: decentralized_secure_storage
primary_sources:
  - https://www.tahoe-lafs.org/
  - https://tahoe-lafs.readthedocs.io/en/latest/architecture.html
  - https://tahoe-lafs.readthedocs.io/en/latest/about.html
  - https://github.com/tahoe-lafs/tahoe-lafs
---

# Tahoe-LAFS

Tahoe-LAFS (the Tahoe Least-Authority File Store) is an open-source, decentralized, provider-independent secure distributed storage system. Data is stored across a grid of independent storage servers; the client encrypts and erasure-codes every file before it leaves the machine, so the servers hold only ciphertext shares they can neither read nor undetectably alter. It is the concrete answer to the availability gap Epoch flags for IPFS (ADR-0015/0016): erasure coding turns "content-addressed" into quantifiable, self-repairing durability.

## Competitive Relevance

- A file is encrypted on the client, then erasure-coded into N shares of which any k reconstruct the original; the default is 3-of-10 (10 shares, any 3 suffice), so the grid tolerates up to N−k (7 by default) server failures.
- Shares are spread across distinct storage servers on the grid, so durability is a tunable, quantifiable property of k and N rather than a hope that some node still pins the data.
- Access is governed by cryptographic capabilities ("caps"), not server-side ACLs: a read-cap decrypts and reads a file, a write-cap (for mutable files) authorizes mutation, and a verify-cap lets a party check integrity and drive repair without being able to decrypt the content.
- Caps form a diminishing chain — a write-cap attenuates to a read-cap, and a read-cap yields a verify-cap, but never the reverse — so a weaker cap can never recover a stronger one.
- Files are split into segments carried in Merkle hash trees; the cap embeds the root hash, so any corrupted or tampered share is detected at verification and the file is reconstructed from the good shares.
- "Provider-independent security" is the headline claim: because data is encrypted and Merkle-verified client-side, storage operators cannot read the content nor tamper with it undetectably, so trust in the servers is not required.
- A repairer can regenerate missing shares from the surviving ones using only a verify-cap, restoring the k-of-N redundancy without ever decrypting the file.
- Trade-offs (secondary): running a grid of storage servers is operationally heavy, encryption plus erasure coding adds performance and N/k storage overhead, and the user/operator base is small relative to mainstream storage.

## Epoch Implications

- Tahoe is the concrete counter to the IPFS availability gap ADR-0015/0016 cite: erasure coding (k-of-n) gives quantifiable durability and self-repair, a model for Epoch's explicit availability tiers (ADR-0015 Options 7/8 p2p swarm and CDN, ADR-0003 transport tiers) rather than hoping a pin still exists.
- Merkle hash trees over segments are the same primitive as Epoch's per-chunk hashes under a signed manifest root (ADR-0015 Option 2 verify pipeline): verification is segment/chunk-level and incremental, not a whole-file re-hash.
- The verify-cap — check integrity and drive repair with no ability to read — is a valuable idea for Epoch: proving a blob or chunk range is intact, or replicating it, without decrypting the plaintext, which speaks directly to confidentiality and to ADR-0016's chunk-range redaction and availability without exposing content.
- The difference is the trust anchor: Tahoe governs access with capabilities where Epoch keeps Ed25519-signed events over content-addressed manifests. Epoch should keep its signed-authorship model but borrow the read/verify capability split and erasure-coded durability for its availability layer.
