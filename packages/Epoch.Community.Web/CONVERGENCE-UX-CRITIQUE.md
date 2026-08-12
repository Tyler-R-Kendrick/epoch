# Convergence Workbench Adversarial Design Critique

Date: 2026-08-11
Scope: Community change-graph and review-bundle surfaces

This scoped note records the product critique that shaped the implementation. It
is intended to be linked from the conductor-owned convergence documentation; it
does not replace the repository architecture or feature registries.

## Verdict

Conditional pass after the changes below. The feature is deliberately a compact
Grid-native hierarchical navigator plus detail blade. It does not add a generic
SaaS dashboard to Nightboard, and no AI proposal is presented as accepted work.

## GitHub open-source contributor

Rejected: a flat change list would hide dependency direction, make partial merge
surprising, and turn an ambiguous split into destructive guesswork.

Changed: the workbench renders stable changes as a keyboard-navigable tree with
visible revision identities. Split is atomic and fail-closed. Partial merge first
shows the dependency-closed set and requires confirmation. Copy-on-write storage
is named separately from execution isolation, so “workspace” does not overpromise
a sandbox.

## Maintainer

Rejected: a cumulative diff without individual drilling loses review context;
green approval copied from an older revision is unsafe; squash without source
provenance erases why a change exists.

Changed: combined and individual review modes share one selected change. The gate
matrix labels passing, stale, failing, and missing states in text. Stale approval
blocks merge. Squash records source change and revision identities. Merge and
conflict resolution state required authority and confirmation before execution.

## Screen-reader power user

Rejected: connector lines and color alone do not communicate graph topology; a
wide gate table or two-pane layout can become unreachable at zoom/mobile; focus
may drift from the detail blade.

Changed: change navigation uses tree/treeitem levels, sibling positions, set
sizes, selection, and one roving tab stop. Keyboard movement synchronizes the
selected tree item and labeled detail article. The gate table sits in a named
scroll region, the layout stacks at narrow widths, primary controls meet the
44-pixel target, and a Playwright test covers keyboard traversal, mobile width,
200% zoom, and serious/critical axe findings.

## Security and compliance responder

Rejected: missing promised objects labeled “corrupt” create false incidents;
support bundles can leak private sessions; public archival and force/grant/budget
controls cannot be one-click actions; AI conflict output must not inherit human
trust styling.

Changed: Operations separates availability from integrity and shows quarantine,
checkpoint, retry, mirror drift, residency, fidelity loss, SWHID, and archive
state independently. The support-bundle contract is redacted. Merge, force,
grant, budget, and public archive controls expose required authority and explicit
confirmation. AI resolution remains visibly `untrusted-proposal`; private/raw
sessions are absent from forge and archive payloads.

## Craft and cognitive load

Rejected: adding cards, badges, and product-specific colors would dilute Grid and
increase scanning cost.

Changed: the view consumes existing Epoch design tokens, square corners,
monospace typography, lane glyphs, and restrained state ink. Context stays in one
topology/detail relationship, while advanced operational facts use labeled lists
and definitions rather than decorative widgets. Reduced-motion behavior is
preserved and no capsule/pill styling was introduced.
