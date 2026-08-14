# ADR-0051: Change-Based Review Publish Is The Default

Status: Accepted; protocol helper, Change store publish, CLI submit, and Git projection implemented

## Context

GitButler's [Gerrit Mode](https://docs.gitbutler.com/features/gerrit-mode) is a
client for Gerrit: inject a `Change-Id` trailer, push to `refs/for/<target>`
instead of a matching branch, record the change identity after push, and attach
topic, hashtag, and WIP as push options.

GitHub/GitLab review is branch-based. Extra commits squash into one unified
diff. Shared history is rarely rewritten. Gerrit review is commit-based: one
review is one change, and addressing feedback means publishing a new version of
that same change.

Epoch already has that model. A `ChangeId` is stable lineage. A Revision is an
immutable patch set. A Review Bundle binds exact revisions. Shipping Gerrit Mode
as a config flag (`gitbutler.gerritMode`) would pretend this is optional. Per
[ADR-0039](0039-native-capabilities-from-the-git-extension-ecosystem.md), a
capability the model already implies is native, not an extension and not a mode.

## Decision

- Change-based review publish is the default. There is no `gerritMode` flag.
- Every Change carries a Gerrit-shaped `Change-Id` trailer
  (`I` + 40 lowercase hex) derived from the canonical `ChangeId`. The trailer is
  stable across Revisions of that Change.
- `epoch change submit` publishes the current Revision for review. It does not
  push a matching branch name. The Git review ref is `refs/for/<target>`.
- Topic, hashtag, and WIP are publish options on that submit, encoded as Gerrit
  push options (`%topic=…,hashtag=…,wip`).
- Git projection writes the `Change-Id` trailer into the projected commit. It
  never treats a pull-request branch as the review identity.
- Numeric Gerrit label votes and admin submit expressions stay unsupported.
  Epoch review evidence remains Review Bundles, recorded verdicts, and Merge
  Plans ([ADR-0030](0030-stable-changes-revisions-stacks-reviews-merges.md)).

## Escape And Consequences

Contributors who expect "open a PR against my branch name" will see a Change and
a review ref instead. That is the product. A Git remote that speaks Gerrit can
receive `refs/for/<target>` without a `commit-msg` hook. A GitHub-shaped forge
adapter remains a loss-declared projection ([ADR-0035](0035-forge-adapters-and-mirror-authority.md)).

## Revisit Criteria

Revisit if a second review dialect needs a different trailer, if Gerrit label
votes become a required interoperability surface, or if publish must become a
signed protocol event rather than a recorded Change operation.

## Coverage

- `features/cli_wasm.feature` — Contributor publishes a Change for review without a pull-request branch
- `packages/Epoch.Protocol/test/run.ts` — `PROTO-REVIEW-001`
- `test/unit/change-graph-store.test.ts`
- `test/unit/git-convergence-foundation.test.ts`
