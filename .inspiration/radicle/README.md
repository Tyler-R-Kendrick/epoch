# Radicle

## Overview

Radicle is a peer-to-peer code collaboration platform built natively on Git. It removes the dependency on centralized forges (GitHub, GitLab, Bitbucket) by distributing repository data, issues, patches (pull requests), and code review across a gossip-based P2P network. Each participant runs a local Radicle node that stores and replicates data, exchanging it with peers over the Radicle protocol.

Identities in Radicle are cryptographic public keys, not usernames managed by a central authority. Repositories are content-addressed and signed; no single organization can alter or censor them. Radicle is particularly attractive for open-source projects that want censorship resistance, sovereignty over their infrastructure, and community-owned collaboration tooling.

---

## Features

### 1. Peer-to-Peer Code Collaboration on Git
Radicle extends Git with a P2P protocol. Repositories are shared across a network of peers without any single server being authoritative. A Radicle repository can be cloned and contributed to entirely via the local node.

### 2. No Central Authority
There is no Radicle Inc. server that holds your data. Any peer can host and replicate any repository. The network is self-organizing and censorship-resistant.

### 3. Gossip Protocol for Data Distribution
Radicle uses a gossip (epidemic) protocol to propagate repository data, patches, issues, and code review across the network. New data announced by one peer eventually reaches all interested peers.

### 4. Git-Native Integration
Radicle acts as a Git remote. Standard Git commands (`git push rad`, `git fetch rad`) interact with the Radicle network. No specialized client is required for basic operations once the node is configured.

### 5. Cryptographic Identities (Public Keys, Not Usernames)
Every Radicle identity is a keypair. The public key is the persistent, globally-unique identifier. There is no central registration or username namespace. Identities are self-sovereign.

### 6. End-to-End Verification of Data Integrity
All data in Radicle (commits, patches, issues, reviews) is signed by the author's private key and verified by all peers. Tampering with data is detectable and rejected by the network.

### 7. Offline-First Local Operation
All repository data is stored locally. Browsing history, creating commits, reviewing patches — all work without network connectivity. Sync happens when the node connects to peers.

### 8. Decentralized Social Graph
Follows, collaborator relationships, and reputation signals are stored in the Radicle data model, not a central database. The social graph is owned by users, not the platform.

### 9. Seed Nodes for Availability
Projects that need high availability (e.g., popular open-source libraries) can designate seed nodes that continuously replicate and serve the repository. Seed nodes are just well-connected peers, not privileged servers.

### 10. Local Node Runs Radicle Protocol
Every participant runs `radicle-node` locally. The node manages identity, storage, peer connections, and data replication. It exposes a local API consumed by the CLI and web frontend.

### 11. Append-Only Model (No History Erasure)
Radicle's data model is append-only. Once data is published to the network, it cannot be unilaterally deleted. This prevents history erasure but requires careful thought about what data is published.

### 12. Issues as First-Class Decentralized Objects
Issues are not stored in a central database — they are content-addressed objects signed by their creator and replicated via gossip. An issue created on one peer appears on all peers that follow the repository.

### 13. Patches (Pull Requests) as First-Class Objects
Patches are proposals to merge a branch into the default branch. Like issues, patches are signed, content-addressed, and replicated across the network. Review comments are similarly decentralized.

### 14. Code Review as a Decentralized Object
Review comments and approvals are structured data objects attached to patches. They are signed by reviewers, replicated to all peers, and verifiable without trusting any central authority.

### 15. Allow-List Access Control for Private Repos
Repositories can be configured with an allow-list of public keys that are permitted to replicate the data. This provides a mechanism for private repositories, though managing the allow-list requires coordination.

---

## User Stories / User Flows

### US-1: Hosting a Project Without GitHub
**As an** open-source maintainer,  
**I want** to host my project on a censorship-resistant platform,  
**So that** my project cannot be taken down by a third party's policy decision.

**Flow:**
1. Maintainer initializes a Radicle repository with `rad init`.
2. Repository is assigned a Radicle ID (content-addressed, based on initial commit + keypair).
3. Maintainer announces the repository; seed nodes replicate it.
4. Contributors clone via `git clone rad://<repo-id>`.
5. No centralized service is involved.

### US-2: Contributing a Patch
**As an** external contributor,  
**I want** to submit a code change for review without creating an account on a central platform,  
**So that** I can contribute pseudonymously using only my cryptographic identity.

**Flow:**
1. Contributor clones the repository via Radicle node.
2. Contributor creates a branch, commits changes, pushes branch to their local Radicle node.
3. Contributor opens a patch with `rad patch open --title "Fix memory leak"`.
4. Patch is gossiped to all peers who follow the repository.
5. Maintainer reviews and merges.

### US-3: Offline Code Review
**As a** reviewer on a remote expedition,  
**I want** to review patches and leave comments without internet access,  
**So that** I can stay productive anywhere.

**Flow:**
1. Reviewer syncs patches before going offline.
2. Offline, reviewer reads code and creates review comments locally.
3. On reconnect, comments are gossiped to the network.
4. Patch author sees all comments.

### US-4: Verifying Commit Authenticity
**As a** security-conscious maintainer,  
**I want** to verify that a merged commit was signed by its stated author,  
**So that** I can be confident no one impersonated a trusted contributor.

**Flow:**
1. Maintainer queries the commit's Radicle signature.
2. Signature is checked against the contributor's public key (Radicle identity).
3. Verification passes; commit is authentic.

### US-5: Following a Popular Library
**As a** developer,  
**I want** to follow a library's Radicle repository so I receive updates automatically,  
**So that** I stay up to date without polling a central forge.

**Flow:**
1. Developer runs `rad follow <repo-id>`.
2. Local Radicle node subscribes to gossip for that repository.
3. New commits, patches, and issues replicate to the developer's node.
4. Developer browses updates in the Radicle web frontend or CLI.

### US-6: Running a Seed Node for High Availability
**As an** infrastructure engineer for a popular open-source project,  
**I want** to run a seed node that continuously replicates the project repository,  
**So that** contributors worldwide can always clone it even when the maintainer's node is offline.

**Flow:**
1. Engineer provisions a server and installs `radicle-node`.
2. Seed node is configured to follow the project's Radicle ID.
3. Seed node peers with the maintainer's node and replicates data.
4. Contributors worldwide clone from the seed node with consistent availability.

### US-7: Decentralized Issue Tracking
**As a** project maintainer,  
**I want** to manage issues without depending on a third-party issue tracker,  
**So that** issue history is preserved even if a hosting service shuts down.

**Flow:**
1. Contributor opens an issue with `rad issue open`.
2. Issue is signed with contributor's key and gossiped.
3. Maintainer comments and labels the issue.
4. All activity is stored locally on all peers' nodes.

---

## Known Issues and Limitations

### 1. No CI/CD Pipeline Integration
Radicle has no native CI/CD system. Running tests on patches requires integration with external tools (custom scripts, CI runners that watch the Radicle gossip). This is a significant gap compared to GitHub Actions or GitLab CI.

### 2. Web Frontend Largely Read-Only
The Radicle web interface provides a read-only view of repositories, issues, and patches. Most write operations (opening patches, commenting) require the CLI and a running local node.

### 3. No Project Management Tools
Milestones, project boards, wikis, release pages — all the project management features of GitHub/GitLab are absent. Teams need separate tools for these workflows.

### 4. Smaller Ecosystem Than GitHub/GitLab
The total number of projects, contributors, and integrations on Radicle is orders of magnitude smaller than GitHub. Discovery, community, and collaboration opportunities are correspondingly limited.

### 5. Learning Curve with Cryptographic Identities and Node Management
Setting up a Radicle node, managing keypairs, understanding the gossip topology, and troubleshooting peer connectivity is significantly more complex than creating a GitHub account.

### 6. Private Repositories Are Harder to Manage
Public key allow-lists must be manually maintained. There is no fine-grained permission model (read-only collaborators, teams, roles). Managing access for a large team is operationally burdensome.

### 7. Data Only Available While Peers Are Seeding
If no online peer has a repository, it cannot be cloned. Unlike GitHub's 24/7 availability, Radicle requires at least one peer (or seed node) to be online and reachable.

### 8. Linux and macOS Only (No Windows)
The Radicle node and CLI do not officially support Windows. This excludes a significant portion of developers and limits adoption in Windows-centric organizations.

### 9. Evolving Security Model
The append-only model means accidentally published sensitive data (credentials, private keys in commits) cannot be expunged from the network. There is no equivalent of GitHub's secret scanning or history-rewriting tools that propagate to all forks.

### 10. No Package Registries
npm, PyPI, crates.io, and similar registries are not part of the Radicle ecosystem. Publishing and consuming packages requires separate infrastructure.

### 11. Gossip Convergence Is Not Instantaneous
Data propagates via epidemic broadcast; all peers converge eventually, but there is no hard real-time guarantee. In practice, convergence may take minutes depending on network topology and peer availability.

---

## References

- **Radicle Official Site**: [https://radicle.xyz](https://radicle.xyz)
- **Radicle GitHub**: [https://github.com/radicle-dev](https://github.com/radicle-dev)
- **Radicle Whitepaper**: Available at [https://radicle.xyz/](https://radicle.xyz/)
- **Heartwood (Radicle Protocol v2)**: The current Radicle protocol implementation.
- **Local-First Software** (Ink & Switch): [https://www.inkandswitch.com/local-first/](https://www.inkandswitch.com/local-first/)
- **Secure Scuttlebutt**: Gossip protocol inspiration for decentralized social applications.
- **GoatDB**: Comparable approach (local-first, cryptographic signing) for databases.
