# ADR-0010: Community Web Dogfoods Epoch Site History

## Status

Accepted

## Context

`Epoch.Community.Web` previously rendered a static community page from API data,
but the site build itself did not use Epoch. That undercut the product claim
that meaningful application changes should be branchable, mergeable,
versionable, verifiable, and recoverable from signed history.

## Decision

Community Web exposes `materializeCommunityWebSiteWithEpoch()`. The helper
stages the rendered site in an `EpochRepository`, records the initial shell,
creates a draft view for site copy/history changes, records the branched site
change, approves it, promotes the draft view back to `main`, records a rollback
target, creates a signed version, materializes that version to deployable static
files, and exports the repository snapshot next to the output.

The Vercel render script uses this helper, so the public Community site build is
produced from the same Epoch primitives the product asks users to trust.

## Consequences

- Community Web now depends on `@epoch/core` in addition to
  `@epoch/community-core`.
- Generated deploy output includes an `epoch-version.json` manifest,
  `community/epoch-site-history.json`, and
  `community/epoch-repository.json` for audit and recovery.
- Platform Web still imports Community only as a deployment descriptor; the
  hosting control-plane boundary remains unchanged.
- The exported repository snapshot is build evidence, not a secret store, and
  should not include private credentials or unreviewed generated files.

## Revisit Criteria

Revisit this decision when Community Web has a persistent server-side repository
for real site editing, when the exported snapshot grows too large for static
deployment, or when `EpochRepository` gains a browser-native materialization
path that can replace the Node build-time helper.
