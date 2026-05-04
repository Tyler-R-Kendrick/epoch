# Epoch: User Stories and Flows

This document provides the complete set of user stories for Epoch, organized by persona. Each story follows the format: **As a** [persona], **I want** [capability], **So that** [benefit]. Stories are cross-referenced to Feature IDs defined in [`features.md`](features.md).

---

## Personas

| Persona | Description |
|---|---|
| **Developer** | An individual contributor writing and committing code day-to-day |
| **Repository Owner** | A maintainer who sets up and governs a repository |
| **Team Lead** | A technical lead managing a team's workflow and quality standards |
| **External Contributor** | An open-source contributor without existing repository access |
| **Security Engineer** | A professional responsible for code integrity and access control |
| **Build / DevOps Engineer** | An engineer managing CI/CD, build systems, and infrastructure |
| **Compliance Auditor** | A non-technical or semi-technical professional verifying process |

---

## Developer Stories

### DEV-001: Create My First Commit
**As a** developer,  
**I want** to stage and commit a set of file changes with a descriptive message,  
**So that** I record a logical unit of work with clear attribution to me.

**Feature**: F-004 (Commit), F-003 (Ed25519 Identity)

**Flow:**
1. Developer edits `src/main.ts` and `README.md`.
2. Runs `epoch add src/main.ts README.md`.
3. Runs `epoch commit -m "Add login endpoint"`.
4. Epoch creates a Commit event, signs it with developer's Ed25519 key, appends to log.
5. Developer's HEAD pointer advances to the new event.

**Acceptance Criteria:**
- Commit event appears in `epoch events` output.
- Commit carries developer's public key as author.
- Commit has a valid Ed25519 signature.

---

### DEV-002: Work Offline on a Flight
**As a** developer on a long-haul flight without Wi-Fi,  
**I want** to commit, branch, and view history locally,  
**So that** I can remain fully productive without any network connection.

**Feature**: F-011 (Offline Operation)

**Flow:**
1. Developer puts laptop in airplane mode.
2. Creates branch: `epoch branch feature/auth`.
3. Makes 5 commits across 3 files.
4. Runs `epoch events` to review history.
5. On landing, runs `epoch sync origin` — all 5 commits sync.

**Acceptance Criteria:**
- All commands succeed with no network access.
- No network socket attempts are made during offline operations.
- All offline events sync correctly when connectivity is restored.

---

### DEV-003: View History of a Specific File
**As a** developer investigating a bug,  
**I want** to see every commit that changed a specific file, who made it, and when,  
**So that** I can identify which change introduced the regression.

**Feature**: F-024 (Log / History)

**Flow:**
1. Developer suspects bug is in `src/auth.ts`.
2. Runs `epoch log -- src/auth.ts`.
3. Output lists 7 commits touching that file, with event IDs, authors, dates, and messages.
4. Developer diffs two commits: `epoch diff <event-a> <event-b> -- src/auth.ts`.
5. Developer identifies the problematic change.

**Acceptance Criteria:**
- `epoch log -- <path>` returns only events affecting that path.
- Output includes event ID, author public key, timestamp, and message.
- Events are in reverse causal order (newest first).

---

### DEV-004: Create a Feature Branch and Merge It
**As a** developer,  
**I want** to create a feature branch, develop in isolation, and merge it back to main,  
**So that** in-progress work doesn't destabilize the main branch.

**Feature**: F-005 (Branch), F-007 (Three-Way Merge)

**Flow:**
1. `epoch branch feature/payment` creates branch at current HEAD.
2. Developer makes 3 commits on the feature branch.
3. Teammate makes 2 commits on `main` in the meantime.
4. Developer runs `epoch merge main` from feature branch.
5. Three-way merge applies all non-conflicting changes.
6. Developer syncs merged branch.

**Acceptance Criteria:**
- Non-overlapping changes are merged automatically.
- Merge event has two parent event IDs.
- `epoch log --graph` shows branching and merging visually.

---

### DEV-005: Resolve a Merge Conflict
**As a** developer,  
**I want** to see clear conflict markers when two branches modify the same lines,  
**So that** I can make an informed decision about the correct final content.

**Feature**: F-010 (Conflict Surfacing)

**Flow:**
1. Developer runs `epoch merge feature/nav` on `main`.
2. Both branches modified `config.json` lines 42–45.
3. Epoch inserts conflict markers in `config.json`.
4. `epoch status` shows `config.json` as `conflicted`.
5. Developer edits file, removes markers, chooses correct content.
6. Runs `epoch add config.json && epoch commit -m "Merge: resolve config conflict"`.

**Acceptance Criteria:**
- Conflicted files contain `<<<<<<<`, `=======`, `>>>>>>>` markers.
- Commit is blocked until all conflicts are resolved.
- After resolution commit, `epoch status` shows clean working tree.

---

### DEV-006: Stash Work in Progress
**As a** developer mid-feature,  
**I want** to stash my uncommitted changes so I can quickly switch to fix a critical bug,  
**So that** I don't lose my work and can return to it later.

**Feature**: F-026 (Stash)

**Flow:**
1. Developer has unstaged changes in 4 files.
2. Urgent bug reported; developer runs `epoch stash`.
3. Working tree is clean; developer switches to `hotfix` branch.
4. Bug is fixed and committed.
5. Developer returns to feature branch: `epoch stash pop`.
6. Previous changes are restored.

**Acceptance Criteria:**
- `epoch stash` leaves working tree clean.
- `epoch stash pop` restores exact previous state.
- Multiple stash entries work with `epoch stash list`.

---

### DEV-007: View Changes Before Committing
**As a** developer,  
**I want** to see a diff of my uncommitted changes before creating a commit,  
**So that** I can verify I'm committing only intended changes.

**Feature**: F-023 (Diff / Patch)

**Flow:**
1. Developer edits 3 files.
2. Runs `epoch diff` (working tree vs HEAD).
3. Reviews unified diff output.
4. Realizes one file has debug code; removes it.
5. Runs `epoch diff` again to confirm only intended changes.
6. Commits.

**Acceptance Criteria:**
- `epoch diff` shows unstaged changes against HEAD.
- `epoch diff --staged` shows staged changes.
- Output is standard unified diff format.

---

### DEV-008: Tag a Release
**As a** developer releasing version 1.0,  
**I want** to create a signed tag so that users can verify the release's authenticity,  
**So that** the release is traceable to me and protected from tampering.

**Feature**: F-006 (Tag), F-017 (Event Signing)

**Flow:**
1. Developer verifies HEAD is the release commit.
2. Runs `epoch tag v1.0.0 -m "Initial stable release"`.
3. Tag event is signed with developer's Ed25519 key.
4. Tag is event synced to all peers.
5. User verifies: `epoch tag --verify v1.0.0`.

**Acceptance Criteria:**
- Tag event is signed and verifiable by any peer.
- Tags are immutable; cannot be moved without explicit force flag.
- `epoch tag --verify` outputs signer's public key and verification status.

---

### DEV-009: Bisect a Regression
**As a** developer,  
**I want** to binary-search through commit history to find the commit that introduced a bug,  
**So that** I can identify and understand the regression quickly.

**Feature**: F-024 (Log / History), F-004 (Commit)

**Flow:**
1. Bug exists in HEAD but not in `v0.9.0` tag.
2. Developer runs `epoch bisect start`.
3. Marks HEAD as bad, `v0.9.0` as good.
4. Epoch checks out midpoint commit.
5. Developer runs tests; marks good or bad.
6. After 7 iterations, Epoch identifies the culprit event.

**Acceptance Criteria:**
- `epoch bisect` correctly identifies the first bad event in O(log n) steps.
- Each step checks out the midpoint of the good/bad range.
- Result event is reported with its ID, author, and message.

---

### DEV-010: Use a Worktree for Parallel Development
**As a** developer,  
**I want** to check out two branches in separate directories simultaneously,  
**So that** I can run both and compare behavior without switching branches.

**Feature**: F-027 (Worktrees)

**Flow:**
1. Developer runs `epoch worktree add ../epoch-v2 feature/v2`.
2. `../epoch-v2` directory contains the `feature/v2` working tree.
3. Developer runs the application in both directories simultaneously.
4. Changes committed in either worktree appear in the shared event log.

**Acceptance Criteria:**
- Both worktrees share the same object store.
- Each worktree has independent HEAD and index.
- Commits from either worktree appear in `epoch events` from any worktree.

---

### DEV-011: Merge JSON Files Without Conflicts
**As a** developer,  
**I want** concurrent modifications to `package.json` by two teammates to merge without conflict,  
**So that** routine dependency additions don't cause merge conflicts.

**Feature**: F-008 (CRDT Merge), F-009 (CRDT Extension API)

**Flow:**
1. Developer A adds `"react": "^18"` to `package.json` dependencies.
2. Developer B adds `"lodash": "^4"` to the same file concurrently.
3. A JSON map CRDT definition is registered for `package.json`.
4. On merge, CRDT engine merges both key additions without conflict.
5. Result contains both `react` and `lodash`.

**Acceptance Criteria:**
- JSON merge CRDT is registered and active for `*.json` entity types.
- Non-overlapping key additions always merge automatically.
- Conflicting values for the same key surface a conflict.

---

## Repository Owner Stories

### OWNER-001: Initialize a New Repository
**As a** repository owner,  
**I want** to create a new Epoch repository and configure its access control,  
**So that** I have a secure, governed repository to share with my team.

**Feature**: F-016 (Access Control), F-003 (Ed25519 Identity)

**Flow:**
1. Owner runs `epoch init my-project`.
2. Epoch creates local event log, object store, and owner keypair (if not existing).
3. Owner adds teammates' public keys: `epoch access grant <pubkey> write`.
4. Access control events are signed and appended to the log.
5. Repository is ready to share.

**Acceptance Criteria:**
- `epoch init` creates all required directories and files.
- Owner has `admin` permission automatically.
- `epoch access list` shows current access control list.

---

### OWNER-002: Revoke a Contributor's Access
**As a** repository owner,  
**I want** to revoke a former employee's write access immediately,  
**So that** they cannot publish new events after they leave the team.

**Feature**: F-016 (Access Control)

**Flow:**
1. Owner runs `epoch access revoke <former-employee-pubkey> write`.
2. Revocation event is signed and event synced to all peers.
3. All peers update their local access control projection.
4. Former employee's publish attempts are rejected.

**Acceptance Criteria:**
- Revocation takes effect within one event sync round (< 30 seconds).
- Events signed by the revoked key after the revocation event are rejected.
- Historical events from the revoked key remain valid.

---

### OWNER-003: Configure Seed Nodes
**As a** repository owner,  
**I want** to designate a seed node for my repository,  
**So that** contributors worldwide can clone it even when my node is offline.

**Feature**: F-014 (Seed Nodes)

**Flow:**
1. Owner provisions a seed node and installs Epoch.
2. Runs `epoch remote add seed epoch://<seed-node-address>`.
3. Seed node is configured to follow the repository.
4. Owner syncs with seed: `epoch sync seed`.
5. Contributors clone from seed.

**Acceptance Criteria:**
- Seed node replicates all future events automatically via convergence repair.
- Clones from seed succeed when owner node is offline.
- Seed node is listed in repository metadata.

---

### OWNER-004: Register a CRDT Definition for a Custom File Type
**As a** repository owner,  
**I want** to register a CRDT merge definition for our proprietary `.schema` files,  
**So that** developers never get merge conflicts on schema files.

**Feature**: F-009 (CRDT Extension API)

**Flow:**
1. Owner writes a CRDT definition implementing `CRDTDefinition<string>` for `*.schema`.
2. Publishes it as an npm package.
3. In `epoch.config.ts`: `epoch.registerCRDT(require('@company/epoch-schema-crdt'))`.
4. Configuration event is committed and event synced.
5. All peers apply the CRDT definition on next schema file merge.

**Acceptance Criteria:**
- CRDT definition is versioned and stored in repository config.
- All peers with the config automatically use the definition for merges.
- Invalid definitions (wrong interface) are rejected at registration.

---

### OWNER-005: Export Repository for Archival
**As a** repository owner,  
**I want** to export my Epoch repository as a standard Git repository,  
**So that** I can archive it on a Git-compatible forge without losing history.

**Feature**: F-029 (Git Compatibility Layer)

**Flow:**
1. Owner runs `epoch export-git ./archive.git`.
2. Epoch converts all Commit events to Git commits, preserving messages and authorship.
3. Ed25519 signatures are stored as commit notes.
4. Archive is archived to GitHub for long-term storage.

**Acceptance Criteria:**
- All commits appear in the exported Git repository.
- Commit messages and timestamps are preserved.
- Merge commits produce correct two-parent Git merge commits.

---

## Team Lead Stories

### LEAD-001: Enforce Linting Before Every Commit
**As a** team lead,  
**I want** a pre-commit hook that runs `eslint` and blocks the commit on failure,  
**So that** no unlinted code is ever committed to the repository.

**Feature**: F-025 (Hooks)

**Flow:**
1. Team lead creates `.epoch/hooks/pre-commit` with ESLint invocation.
2. Makes the script executable.
3. Developer commits; hook runs ESLint.
4. If ESLint fails, commit is aborted with error output.
5. Developer fixes lint errors; retries commit.

**Acceptance Criteria:**
- Pre-commit hook is invoked before every `epoch record`.
- Non-zero exit from hook aborts the commit.
- Hook receives staged file list as environment variable.

---

### LEAD-002: Run Integration Tests on Every Push
**As a** team lead,  
**I want** a post-sync hook on the seed node that triggers CI tests,  
**So that** test results are available for every synced branch.

**Feature**: F-025 (Hooks), F-014 (Seed Nodes)

**Flow:**
1. Lead configures `post-sync` hook on seed node.
2. Hook calls CI API with synced branch and event ID.
3. CI pipeline runs tests and posts results.
4. Results are visible to all developers.

**Acceptance Criteria:**
- `post-sync` hook fires after every successful sync with the seed.
- Hook environment includes the synced branch name and new event ID.

---

### LEAD-003: Review a Patch Before Merging
**As a** team lead,  
**I want** to review a contributor's patch proposal before it is merged to main,  
**So that** I can verify code quality and correctness.

**Feature**: F-030 (Issues and Patches)

**Flow:**
1. Contributor opens patch: `epoch patch open --title "Fix auth race condition"`.
2. Patch event is event synced; lead's node receives it.
3. Lead reviews diff: `epoch patch diff <patch-id>`.
4. Lead posts review comment: `epoch patch comment <patch-id> "Please add tests"`.
5. Contributor syncs new events addressing feedback.
6. Lead approves: `epoch patch accept <patch-id>`.
7. Epoch merges the patch branch to main.

**Acceptance Criteria:**
- Patch and review events are signed by their respective authors.
- Patch diff shows all changes relative to the target branch.
- Patch acceptance triggers a merge event.

---

### LEAD-004: Verify Team Members' Commit Signatures
**As a** team lead,  
**I want** to verify that all commits on `main` are signed by authorized team members,  
**So that** I can confirm only approved contributors have modified production code.

**Feature**: F-017 (Event Signing), F-018 (Tamper Detection)

**Flow:**
1. Lead runs `epoch verify --branch main`.
2. Epoch checks every commit event's Ed25519 signature.
3. Epoch cross-references signers with the access control list.
4. Report shows each commit's verification status.
5. Any unsigned or unauthorized commit is flagged.

**Acceptance Criteria:**
- Every commit on `main` is verified against its author's public key.
- Commits from keys not in the access control list are flagged.
- `epoch verify` exits non-zero if any invalid commit is found.

---

### LEAD-005: Review Concurrent Text Edits Resolved by CRDT
**As a** team lead,  
**I want** to audit how CRDT resolved a concurrent edit,  
**So that** I can verify the automated merge produced the semantically correct result.

**Feature**: F-008 (CRDT Merge), F-024 (Log / History)

**Flow:**
1. Two developers edited the same file concurrently.
2. CRDT merged them automatically.
3. Lead runs `epoch log --show-merges`.
4. Lead inspects the merge event to see both parent events and the merged result.
5. Lead reviews diff of each parent against the merged result.

**Acceptance Criteria:**
- Merge events reference both causal parent event IDs.
- `epoch diff <parent-a> <merge-event>` and `epoch diff <parent-b> <merge-event>` are both functional.

---

## External Contributor Stories

### EXT-001: Clone a Repository Without an Account
**As an** external contributor,  
**I want** to clone an Epoch repository using only the Epoch node software,  
**So that** I can contribute without creating an account on any third-party platform.

**Feature**: F-015 (Explicit Event Sync), F-003 (Ed25519 Identity)

**Flow:**
1. Contributor installs Epoch; generates an Ed25519 keypair automatically.
2. Runs `epoch clone epoch://<repo-address>`.
3. Repository clones to local node.
4. Contributor begins working.

**Acceptance Criteria:**
- `epoch clone` completes without prompting for a username or password.
- Contributor identity is established via locally-generated keypair.
- Clone is fully functional for local operations.

---

### EXT-002: Submit a Patch for Review
**As an** external contributor,  
**I want** to submit a code change as a patch proposal,  
**So that** the maintainer can review and potentially merge my contribution.

**Feature**: F-030 (Issues and Patches)

**Flow:**
1. Contributor creates branch, makes changes, syncs branch to their public node.
2. Runs `epoch patch open --target main --title "Fix null pointer in parser"`.
3. Patch event is event synced; maintainer's node receives it.
4. Maintainer reviews and responds.

**Acceptance Criteria:**
- Patch is identifiable by a unique event ID.
- Patch event is signed with contributor's Ed25519 key.
- Maintainer can diff, comment, and accept/reject the patch.

---

### EXT-003: Receive Feedback Offline
**As an** external contributor traveling,  
**I want** to receive review comments on my patch when I reconnect,  
**So that** I don't miss feedback due to connectivity gaps.

**Feature**: F-011 (Offline Operation), F-012 (Event Sync)

**Flow:**
1. Contributor disconnects from network.
2. Maintainer posts review comments while contributor is offline.
3. Comment events are event synced and queued.
4. Contributor reconnects; event sync delivers all queued events.
5. Contributor reads feedback.

**Acceptance Criteria:**
- Comment events delivered after contributor reconnects.
- Events are not lost during connectivity gaps.
- Contributor's node shows all comments after sync.

---

### EXT-004: Open an Issue Without Write Access
**As an** external contributor,  
**I want** to open an issue on a repository I can only read,  
**So that** I can report a bug without needing write access.

**Feature**: F-030 (Issues and Patches), F-016 (Access Control)

**Flow:**
1. Contributor has `read` permission on the repository.
2. Runs `epoch issue open --title "Crash on empty input"`.
3. Issue event is signed with contributor's key and event synced.
4. Maintainer's node receives the issue.
5. Maintainer can label, comment, and close the issue.

**Acceptance Criteria:**
- Issue creation succeeds with `read` permission.
- Issue event is signed and verifiable.
- Maintainer receives the issue via event sync.

---

### EXT-005: Verify Repository Integrity Before Trusting Code
**As an** external contributor evaluating a library,  
**I want** to verify the event log's integrity before trusting the code,  
**So that** I can be confident the repository hasn't been tampered with.

**Feature**: F-018 (Tamper Detection), F-017 (Event Signing)

**Flow:**
1. Contributor clones the repository.
2. Runs `epoch verify`.
3. Epoch checks every event's signature and causal chain.
4. Output confirms: "1,247 events verified. No anomalies detected."
5. Contributor proceeds with confidence.

**Acceptance Criteria:**
- `epoch verify` checks all event signatures.
- Tampered or unsigned events are reported.
- Exit code is non-zero if any anomaly is found.

---

## Security Engineer Stories

### SEC-001: Rotate a Compromised Key
**As a** security engineer,  
**I want** to rotate a developer's Ed25519 key after their laptop was stolen,  
**So that** the stolen key cannot be used to impersonate the developer.

**Feature**: F-019 (Key Rotation)

**Flow:**
1. Developer generates a new keypair on a new machine.
2. Uses secondary authentication to prove identity to the team.
3. Repository owner emits a `KeyRotation` event signed with the old key (if available) or admin key.
4. Rotation event is event synced; all peers reject events signed with the old key.

**Acceptance Criteria:**
- `KeyRotation` event is event synced and applied within one convergence repair cycle.
- Events signed with old key after rotation timestamp are rejected.
- Historical events signed with old key remain valid.

---

### SEC-002: Detect a Forked or Tampered Event Log
**As a** security engineer,  
**I want** to detect if a peer is serving a tampered version of the event log,  
**So that** I can identify and isolate malicious or compromised nodes.

**Feature**: F-018 (Tamper Detection)

**Flow:**
1. Suspicious peer event syncs events with mismatched hashes.
2. Receiving node computes SHA-256 of event payload; compares to event ID.
3. Mismatch detected; event is rejected and peer is flagged.
4. Alert is raised; security team investigates.

**Acceptance Criteria:**
- Every received event is hash-verified before acceptance.
- Events failing hash verification are silently dropped (not stored).
- Optional: peer reputation tracking for repeated tamper attempts.

---

### SEC-003: Audit Access Control Changes
**As a** security engineer,  
**I want** to view the full history of access control changes for a repository,  
**So that** I can identify unauthorized permission escalations.

**Feature**: F-016 (Access Control), F-024 (Log / History)

**Flow:**
1. Security engineer runs `epoch log --type=AccessControl`.
2. All access grant/revoke events are listed with author, timestamp, and signature.
3. Engineer verifies all grants were made by `admin` keys.
4. Any unauthorized grant would appear as an anomaly (signed by a non-admin key).

**Acceptance Criteria:**
- `epoch log --type=<event-type>` filters log by event type.
- Access control events include grantor's key, grantee's key, and permission level.
- Unauthorized grants are detectable via access control policy check.

---

## Build / DevOps Engineer Stories

### DEVOPS-001: Restore File Timestamps After Clone
**As a** build engineer,  
**I want** file modification timestamps to reflect their last commit after a CI clone,  
**So that** `make` and similar tools don't recompile unchanged files.

**Feature**: F-028 (Timestamp Restoration)

**Flow:**
1. CI pipeline runs `epoch clone <repo>`.
2. Post-checkout, CI runs `epoch restore-times`.
3. All file mtimes are set to their last-modifying event's timestamp.
4. `make` compares file timestamps to object timestamps; skips unchanged files.

**Acceptance Criteria:**
- `epoch restore-times` sets each file's mtime to the last event that modified it.
- Performance: completes in O(files) not O(files × events).
- Works correctly with shallow clones.

---

### DEVOPS-002: Trigger CI on Event Sync Events
**As a** DevOps engineer,  
**I want** a post-sync hook on the seed node to trigger CI when a branch is synced,  
**So that** automated tests run on every branch update.

**Feature**: F-025 (Hooks), F-014 (Seed Nodes)

**Flow:**
1. Engineer writes `post-sync` hook that calls CI webhook with branch and event ID.
2. Hook is deployed to seed node.
3. Developer syncs branch; seed node event syncs the events.
4. `post-sync` fires; CI webhook is called.
5. CI fetches the branch from seed node and runs tests.

**Acceptance Criteria:**
- `post-sync` hook fires on every sync received by seed node.
- Hook environment includes `EPOCH_BRANCH`, `EPOCH_EVENT_ID`, `EPOCH_AUTHOR`.

---

### DEVOPS-003: Migrate Existing Git Repository to Epoch
**As a** DevOps engineer,  
**I want** to migrate our existing Git repository to Epoch without losing history,  
**So that** the team can adopt Epoch while retaining full commit history.

**Feature**: F-029 (Git Compatibility Layer)

**Flow:**
1. Engineer runs `epoch import-git ./legacy-repo`.
2. Epoch converts all Git commits to Epoch events.
3. Branches, tags, and merge commits are preserved.
4. Engineer verifies: `epoch events` shows complete history.
5. Team switches to Epoch; legacy Git remote is archived.

**Acceptance Criteria:**
- All commits are imported as Epoch events.
- Branches and tags are preserved.
- Merge commit parents are correctly represented.
- Original commit timestamps are preserved as event timestamps.

---

## Compliance Auditor Stories

### AUDIT-001: Generate a Full Audit Trail
**As a** compliance auditor,  
**I want** a complete, immutable record of every change to the codebase over the past year,  
**So that** I can satisfy regulatory requirements for software change management.

**Feature**: F-001 (Event Log), F-017 (Event Signing), F-024 (Log / History)

**Flow:**
1. Auditor runs `epoch log --since=2024-01-01 --until=2024-12-31 --format=json > audit.json`.
2. Each entry contains: event ID, event type, author public key, timestamp, signature, message.
3. Auditor runs `epoch verify` to confirm all signatures are valid.
4. Audit report is generated from `audit.json`.

**Acceptance Criteria:**
- `epoch events` supports `--since` and `--until` date filters.
- `--format=json` outputs machine-readable JSON.
- `epoch verify` confirms all events are signed by their claimed authors.

---

### AUDIT-002: Verify No Unauthorized Merges to Main
**As a** compliance auditor,  
**I want** to verify that all merges to the `main` branch were approved by authorized reviewers,  
**So that** I can confirm the change management process was followed.

**Feature**: F-030 (Issues and Patches), F-017 (Event Signing)

**Flow:**
1. Auditor queries all Merge events on `main` branch.
2. For each merge, auditor checks the corresponding Patch approval events.
3. Approval events are verified to be signed by authorized reviewer keys.
4. Merges without valid approvals are flagged.

**Acceptance Criteria:**
- Merge events are linked to their originating patch proposals.
- Patch approval events are signed and verifiable.
- `epoch audit-merges --branch=main` produces a report of merge approvals.

---

### AUDIT-003: Verify Identity of Each Committer
**As a** compliance auditor,  
**I want** to map each commit's Ed25519 public key to a known employee,  
**So that** I can confirm all code changes are attributable to authorized personnel.

**Feature**: F-003 (Ed25519 Identity), F-017 (Event Signing)

**Flow:**
1. Security team maintains a directory: `{public_key: employee_name}`.
2. Auditor queries `epoch log --format=json` and maps each author key.
3. Any commit from an unknown key is flagged for investigation.

**Acceptance Criteria:**
- Every commit event contains the author's Ed25519 public key.
- Public keys are stable identifiers (don't change without a `KeyRotation` event).
- `KeyRotation` events are themselves in the audit log with timestamps.
