# git-warp

## Overview

git-warp refers to advanced DVCS (Distributed Version Control System) research concepts built on and extending Git's object model. The name also encompasses **git-warp-time**, a practical tool for restoring file modification timestamps after a `git clone` or `git checkout` (which normally sets all file timestamps to the current time, losing the original commit timestamps).

More broadly, git-warp as a concept explores how Git's DAG-based, content-addressed, immutable history model can be extended with CRDT-based conflict resolution, improved peer-to-peer distribution, and richer collaboration semantics — while preserving the properties that make Git powerful: offline-first operation, cryptographic integrity, and fast branching.

---

## Features

### 1. Distributed Version Control with No Single Point of Failure
Every clone is a full repository. There is no "master" server whose failure prevents collaboration. Any peer can serve as an origin; peers can sync directly with each other.

### 2. Immutable Cryptographic History (Content-Addressed Objects)
Every object (blob, tree, commit) is identified by the SHA hash of its content. History cannot be silently altered: changing any content changes all downstream hashes. This provides a cryptographic audit trail.

### 3. Fast, Lightweight Branching and Merging
Branches are pointers to commit objects; creating a branch is O(1). Merging uses the three-way merge algorithm with a common ancestor. Branching/merging overhead is negligible even for large repositories.

### 4. Offline-First Local Operations
Commits, branches, diffs, logs, and merges all operate on the local object store without network access. Network is only required for push/pull with remote peers.

### 5. DAG-Based Object Model (Commits, Trees, Blobs)
The commit graph is a Directed Acyclic Graph. Each commit references zero or more parent commits, enabling branching and merging. Trees reference blobs and other trees, forming a content-addressed filesystem snapshot.

### 6. Multiple Collaboration Models
Git supports centralized remote (GitHub), fork/PR workflows, peer-to-peer bundle sharing, and email-based patch workflows. This flexibility allows teams of any size and structure to collaborate.

### 7. Hooks and Automation
Pre-commit, post-commit, pre-push, post-receive, and many other hooks allow arbitrary automation to be triggered at lifecycle events. This is the foundation for CI/CD, linting, and deployment pipelines.

### 8. Extensions for CRDT-Based Conflict Resolution
Research and tooling exists (e.g., `git-automerge`, semantic merge tools) that augment Git's three-way merge with structured or CRDT-aware merge strategies for specific file types (JSON, YAML, source code ASTs).

### 9. Stash and Worktrees
Git's stash allows work-in-progress to be shelved without committing. Worktrees allow multiple working directories to share a single object store, enabling parallel work on multiple branches.

### 10. Reflog for Local Recovery
Even after a `git reset --hard` or accidental branch deletion, the reflog preserves a local record of all HEAD movements, enabling recovery of seemingly lost commits.

### 11. Shallow Clones and Partial Clones
For large repositories, shallow clones (truncated history) and partial clones (omitting large blobs) allow efficient access to recent history without downloading the full object database.

### 12. git-warp-time: Timestamp Restoration
The `git-warp-time` tool restores original file modification timestamps from commit metadata after a clone or checkout. This is critical for build systems that use file timestamps (make, CMake) to determine what needs recompilation.

### 13. Signed Tags and Commits (GPG / SSH)
Tags and commits can be cryptographically signed with GPG or SSH keys, providing non-repudiation and tamper detection at the commit level.

### 14. Submodule and Subtree Composition
Large projects can be composed from multiple repositories using submodules (by reference) or subtrees (by inclusion). This enables monorepo and polyrepo hybrid strategies.

---

## User Stories / User Flows

### US-1: Recovering Timestamps After Clone
**As a** build engineer,  
**I want** file modification timestamps to reflect when each file was last committed,  
**So that** incremental build systems don't unnecessarily recompile unchanged files.

**Flow:**
1. CI pipeline runs `git clone`.
2. `git-warp-time` traverses commit history and sets each file's mtime to its last-commit timestamp.
3. Build system (`make`) detects no changes (timestamps predate build artifacts).
4. Only genuinely changed files are recompiled.

### US-2: Offline Feature Development
**As a** developer on a flight,  
**I want** to commit, branch, and merge code without internet access,  
**So that** I can be productive anywhere.

**Flow:**
1. Developer creates `feature/login` branch locally.
2. Developer makes several commits, runs tests locally.
3. On landing, developer pushes to remote origin.
4. CI pipeline picks up the branch.

### US-3: Fork and Pull Request Workflow
**As an** external contributor,  
**I want** to fork a repository, make changes, and submit them for review,  
**So that** I can contribute to a project I don't have write access to.

**Flow:**
1. Contributor forks the repository (full clone under their namespace).
2. Contributor creates a branch, makes changes, pushes to fork.
3. Contributor opens a pull request targeting the upstream repo.
4. Maintainer reviews, requests changes, and merges when satisfied.

### US-4: Semantic Merge for Structured Files
**As a** developer,  
**I want** merge conflicts in JSON configuration files to be resolved automatically based on structure,  
**So that** I don't have to manually resolve trivial conflicts caused by unrelated changes to the same file.

**Flow:**
1. Developer A adds a key to `config.json`; Developer B adds a different key.
2. Three-way merge at the text level would conflict.
3. CRDT-aware merge tool parses JSON, identifies non-overlapping key additions.
4. Merge succeeds automatically; both keys are present in the result.

### US-5: Bisecting a Performance Regression
**As a** developer,  
**I want** to binary-search through commit history to find which commit introduced a bug,  
**So that** I can quickly identify and revert the problematic change.

**Flow:**
1. Developer knows bug exists in HEAD but not in a tag from 3 months ago.
2. `git bisect start` marks good and bad commits.
3. Git checks out the midpoint commit; developer runs tests.
4. Developer marks it good or bad; Git bisects again.
5. After O(log n) iterations, the culprit commit is identified.

### US-6: Cryptographic Verification of Release Tag
**As a** security engineer,  
**I want** to verify that a release tag was signed by a trusted maintainer,  
**So that** I can confirm the release has not been tampered with.

**Flow:**
1. Developer runs `git tag --verify v2.0.0`.
2. Git checks GPG or SSH signature on the tag object.
3. Signature is valid and matches a trusted key in the keyring.
4. Developer proceeds with confidence.

---

## Known Issues and Limitations

### 1. Merge Conflicts Require Manual Resolution
Git's three-way merge is line-based. When two branches modify the same lines, Git cannot automatically determine the correct merge. Developers must manually resolve conflicts, which can be error-prone and time-consuming.

### 2. No Real-Time Collaboration Built-In
Git is an asynchronous collaboration tool. There is no mechanism for seeing another developer's work-in-progress in real time without an external tool (live share, pair programming plugins, etc.).

### 3. Large Binary Files Are Problematic
Git stores every version of every file in the object database. Binary files (images, audio, compiled artifacts) that change frequently cause the `.git` directory to balloon in size. Git LFS is a partial workaround but adds operational complexity.

### 4. SHA-1 Collision Concerns (Transitioning to SHA-256)
Git historically used SHA-1 for object addressing. While no practical exploit targeting Git's use of SHA-1 is publicly known, the transition to SHA-256 (underway but not yet ubiquitous) adds migration complexity.

### 5. History Rewriting Can Cause Team Confusion
Commands like `git rebase`, `git commit --amend`, and `git push --force` rewrite history, changing commit hashes. Force-pushing to a shared branch invalidates colleagues' local references, causing confusion and potential data loss.

### 6. No Native Decentralized Identity
Git commit metadata (author name, email) is self-reported and unverified by default. Anyone can set any author name. GPG/SSH signing provides cryptographic identity but is not enforced by the protocol.

### 7. Submodule Complexity
Git submodules have a reputation for being confusing and error-prone. Detached HEAD states, forgotten submodule updates, and recursive clone requirements are common pain points.

### 8. No Built-In Access Control
Git the protocol has no concept of who can read or write what. Access control is entirely delegated to the hosting layer (GitHub permissions, SSH authorized_keys, etc.).

### 9. Steep Learning Curve
The conceptual model (staging area, index, reflog, rebasing) is notoriously difficult for newcomers. Mistakes (lost commits, accidental resets) are common before developers internalize the object model.

### 10. No Native Issues, CI, or Code Review
Git itself is purely version control. All the features modern developers expect (issues, PRs, CI pipelines, code review) are provided by separate hosting platforms, not the protocol.

---

## References

- **Git Official Documentation**: [https://git-scm.com/doc](https://git-scm.com/doc)
- **git-warp-time**: Tool for restoring file timestamps from Git history — available on various Linux distributions as `git-restore-mtime`.
- **Pro Git Book**: [https://git-scm.com/book/en/v2](https://git-scm.com/book/en/v2) — Comprehensive free reference.
- **SHA-1 Transition to SHA-256**: [https://git-scm.com/docs/hash-function-transition](https://git-scm.com/docs/hash-function-transition)
- **Git LFS**: [https://git-lfs.github.com/](https://git-lfs.github.com/)
- **Semantic Merge**: [https://www.semanticmerge.com/](https://www.semanticmerge.com/) — Structured merge tool.
- **Automerge / Semantic Diff Research**: Augmenting Git merges with CRDT and AST-aware diffing.
- **Radicle**: Decentralized Git forge that extends the Git protocol with P2P distribution.
