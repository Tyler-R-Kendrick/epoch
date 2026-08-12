# Frontier Version-Control Convergence

Epoch now models stable logical changes separately from immutable signed revisions. Stacks pin exact revisions and hard dependencies; review bundles weave those revisions without rewriting them; merge plans require a dependency-closed selection, exact gate evidence, an unchanged target, and resolved conflicts. Squash projection flattens Git while retaining Epoch revision provenance.

The additive protocol schemas are browser-safe in `@epoch/protocol`. Existing event bytes remain unchanged. A legacy intent projects to `epoch:change:legacy:<event-id>` and stays addressable through the compatibility façade. New repository operations can select explicit causal parents through `appendWithParents`; the legacy `append` behavior remains available.

The CLI exposes graph, stack, split, weave, merge, conflict, operation, workspace, mirror, agent, forge, SWHID, and archive command families. JSON output returns stable typed error codes. Capabilities that lack an installed or configured adapter fail with `unsupported-capability`; they do not claim success.

See the accepted decisions [0030](design-decisions/0030-stable-changes-revisions-stacks-reviews-merges.md), [0031](design-decisions/0031-durable-conflicts-and-conservative-commutation.md), and [0036](design-decisions/0036-swhids-and-software-heritage-archival.md).
