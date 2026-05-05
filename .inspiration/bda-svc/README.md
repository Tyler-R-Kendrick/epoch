# BDA-SVC

## Overview

BDA-SVC (Blockchain Distributed Architecture for Source Version Control) is a research and enterprise-oriented approach to distributed version control that combines two complementary decentralized technologies:

- **IPFS** (InterPlanetary File System): Content-addressed, peer-to-peer storage for file contents and diffs.
- **Hyperledger Fabric**: A permissioned, enterprise-grade blockchain for recording commit metadata, access control policies, and audit trails.

In the BDA-SVC model, large code artifacts (file snapshots, diffs, binary blobs) are stored in IPFS and referenced by their content hash (CID). Commit metadata — author, timestamp, parent commit, IPFS CID of the snapshot — is written to the Hyperledger Fabric ledger via smart contracts (chaincode). The combination provides tamper-proof, auditable history (from the ledger) and efficient content-addressed storage (from IPFS).

---

## Features

### 1. Blockchain-Based Distributed Source Version Control
All commit metadata is stored on a permissioned Hyperledger Fabric blockchain. The ledger is append-only, cryptographically linked (each block references the previous), and distributed across multiple organizational nodes.

### 2. IPFS for Content-Addressed Distributed File Storage
File contents and diffs are stored in IPFS. Each unique piece of content maps to a single CID. Duplicate files across branches are automatically deduplicated; content is served from any IPFS peer that has pinned it.

### 3. Hyperledger Fabric for Permissioned Blockchain Ledger (Enterprise)
Unlike public blockchains (Ethereum, Bitcoin), Hyperledger Fabric is permissioned: only authorized organizations can join the network, propose transactions, or endorse blocks. This is suited for enterprises with regulatory requirements.

### 4. Code Snapshots and Diffs Stored in IPFS (Content Hash)
When a commit is made, the snapshot of changed files is uploaded to IPFS. The resulting CID (content identifier) is the canonical reference to that snapshot. Diffs can be generated on-the-fly by comparing snapshots.

### 5. Commit Metadata and IPFS Hashes Written to Hyperledger Fabric
The Fabric ledger stores: commit hash, author identity (X.509 certificate), timestamp, parent commit hash, IPFS CIDs for changed files, and digital signature. This provides a chain of custody.

### 6. Smart Contracts (Chaincode) Enforce Collaboration Policies
Chaincode defines the rules for valid operations: who can commit to which branch, what approval threshold is required for merges, how access control lists are updated. Rules are enforced by the Fabric network automatically.

### 7. Tamper-Proof Audit Trail of All Changes
Because Hyperledger Fabric's ledger is cryptographically linked and distributed across multiple organizations, altering historical records requires compromising a threshold of independent organizations simultaneously — computationally infeasible.

### 8. Fine-Grained Access Control (Permissioned Model)
Access control is defined in chaincode and backed by X.509 certificates issued by the consortium's Certificate Authorities. Permissions can be granted at the repository, branch, or file level.

### 9. Multi-Organization Consortium Support
BDA-SVC is designed for multi-organization consortia (e.g., automotive suppliers contributing to shared firmware, financial institutions sharing compliance code). Each organization operates its own Fabric peer and maintains an independent copy of the ledger.

### 10. Cryptographic Identity via X.509 Certificates
Each participant holds an X.509 certificate issued by a Fabric-managed Certificate Authority (CA). Certificates bind identity to an organization and are used to sign transactions.

### 11. Content Deduplication via IPFS
Because IPFS is content-addressed, identical files across different commits, branches, or repositories share a single object. This eliminates the storage waste common in naive blockchain VCS designs.

### 12. Integration with Enterprise CI/CD
Chaincode events can trigger webhooks to external CI/CD systems. The tamper-proof commit record on Fabric provides a verifiable trigger for compliant automated deployments.

---

## User Stories / User Flows

### US-1: Multi-Organization Shared Firmware Repository
**As a** lead firmware engineer at a consortium of automotive suppliers,  
**I want** all organizations' commits recorded on a shared immutable ledger,  
**So that** auditors can verify exactly which organization introduced each change.

**Flow:**
1. Engineer at Org A commits firmware change; IPFS CID generated.
2. Chaincode validates Org A's certificate and permission to write.
3. Commit transaction written to Fabric ledger, endorsed by Org A's peer.
4. Ledger updated across all consortium peers.
5. Auditor queries ledger; sees Org A identity, timestamp, IPFS CID.

### US-2: Compliant Code Review and Merge
**As a** compliance officer,  
**I want** merge operations to require cryptographic approval from at least two senior engineers,  
**So that** no single person can merge code without oversight.

**Flow:**
1. Junior engineer opens a merge request; chaincode records the intent.
2. Senior Engineer 1 reviews and signs the approval transaction.
3. Senior Engineer 2 reviews and signs.
4. Chaincode detects 2/2 approvals; merge transaction is committed to Fabric.
5. IPFS snapshot for the merged branch is updated.

### US-3: Verifying the Build Provenance of a Release
**As a** security officer,  
**I want** to trace a deployed binary back to the exact commit and IPFS snapshot it was built from,  
**So that** I can detect supply chain attacks.

**Flow:**
1. Officer retrieves build artifact hash from deployment record.
2. Fabric ledger is queried for the commit transaction that references this IPFS CID.
3. Commit transaction shows author certificate, timestamp, parent commit.
4. Chain of custody is complete and cryptographically verified.

### US-4: Consortium Access Control Update
**As a** consortium administrator,  
**I want** to add a new organization to the repository with read-only access,  
**So that** they can audit the codebase without write permissions.

**Flow:**
1. Admin submits chaincode transaction: `grantAccess(org=NewOrg, repo=firmware, permission=read)`.
2. Existing consortium members endorse the transaction (per governance policy).
3. New Org's peer joins the Fabric channel; receives ledger history.
4. New Org can clone from IPFS using CIDs from ledger but cannot commit.

### US-5: Detecting Unauthorized Changes
**As a** security auditor,  
**I want** to verify that no commits were added to the ledger outside the normal review process,  
**So that** I can certify the codebase's integrity.

**Flow:**
1. Auditor queries all commit transactions in the last quarter.
2. Each transaction shows endorsers (must include required orgs per policy).
3. Any transaction lacking required endorsements would be invalid and not on-chain.
4. Auditor confirms all commits followed the approved workflow.

### US-6: Content Availability Check
**As a** developer,  
**I want** to verify that IPFS content for all commits is available before archiving,  
**So that** I don't have an audit trail pointing to unavailable content.

**Flow:**
1. Admin runs a script querying all IPFS CIDs from Fabric ledger.
2. Script pings IPFS network for each CID; records availability.
3. Missing CIDs are re-pinned from backup nodes.
4. Availability report shows 100% content reachable.

---

## Known Issues and Limitations

### 1. Extremely Complex Setup and Operations
Hyperledger Fabric requires Certificate Authorities, ordering services, channel configuration, chaincode deployment, and peer management. Setting up a minimal network takes days; a production deployment requires dedicated DevOps expertise.

### 2. Hyperledger Fabric Requires Certificate Authorities and Ordering Services
Every Fabric network needs a Membership Service Provider (MSP) with CAs and at least one ordering service (Raft, Kafka). These are additional infrastructure components with their own operational requirements.

### 3. IPFS Has Content Availability Issues
IPFS data is only available while at least one node is pinning it. If all nodes that pinned a particular CID go offline, the content becomes temporarily or permanently unavailable. This breaks the immutability promise of the audit trail.

### 4. High Operational Overhead
Running a multi-organization Fabric network, managing IPFS pinning services, upgrading chaincode, and handling organizational churn are all significant ongoing operational burdens.

### 5. Poor Developer Experience Compared to Git
There is no `git-style` command-line interface. Developers must interact with Fabric APIs, manage IPFS uploads, and understand the permissioned model. The learning curve is steep.

### 6. Not Suited for Rapid Iteration
Fabric transaction finality takes seconds. Writing every commit to the blockchain is incompatible with fast development workflows where developers commit dozens of times per day.

### 7. Chaincode Upgrades Require Governance Process
Updating the smart contract (chaincode) logic requires consensus from the consortium. A simple bug fix in the merge policy might require weeks of organizational coordination.

### 8. Performance Limited by Blockchain Consensus
Fabric's consensus mechanism (Raft ordering service) limits throughput and adds latency. High-frequency operations (many commits per second across the consortium) will saturate the ordering service.

### 9. No Real-Time Collaboration
Like Git, BDA-SVC is an asynchronous collaboration tool. There is no mechanism for real-time concurrent editing or live code review.

### 10. IPFS Pinning Governance
Deciding which nodes are responsible for pinning which IPFS content requires separate governance. Without a pinning agreement, content may become unavailable even though the ledger references it.

### 11. Not Designed for Public Open-Source
Hyperledger Fabric's permissioned model is incompatible with open, anonymous contributions. A public permissionless equivalent would require a different blockchain (e.g., Ethereum) with the associated cost and scalability issues.

---

## References

- **Hyperledger Fabric**: [https://hyperledger-fabric.readthedocs.io/](https://hyperledger-fabric.readthedocs.io/)
- **IPFS Documentation**: [https://docs.ipfs.tech/](https://docs.ipfs.tech/)
- **Hyperledger Fabric Chaincode**: [https://hyperledger-fabric.readthedocs.io/en/release-2.5/chaincode4ade.html](https://hyperledger-fabric.readthedocs.io/en/release-2.5/chaincode4ade.html)
- **Content Identifier (CID) Specification**: [https://github.com/multiformats/cid](https://github.com/multiformats/cid)
- **SolGit**: Simpler public-blockchain-based VCS concept.
- **Radicle**: Decentralized Git without blockchain overhead — lighter alternative for similar goals.
- **BDA-SVC Research Papers**: Academic literature on blockchain-based software configuration management.
