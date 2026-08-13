# ADR-0037: Extension Mechanism And Capability Registry

Status: Accepted (design); staged implementation

## Context

Git's extension story is one line of policy: an executable named `git-foo` on
`$PATH` becomes `git foo`. That single rule produced delta, difftastic,
git-extras, Git LFS, git-cliff, git-absorb, git-branchless, Git Town,
git-spice, git-filter-repo, Mergiraf, git-annex, git-fuzzy, git-subrepo, and
git-crypt. Epoch wants that same permissionless growth curve.

Copying the rule verbatim would contradict the rest of Epoch. Git's mechanism
has four properties Epoch cannot accept:

1. **Silent trust.** Any executable named `git-x` anywhere on `$PATH` runs with
   the user's full authority. There is no manifest, no declaration, no consent.
2. **Invisible effects.** A `merge.driver` or a clean/smudge filter can rewrite
   content that lands in history, and history records nothing about which tool
   ran, at which version, under which configuration.
3. **Command-only.** The `git-foo` rule extends the *porcelain*. Extending the
   parts that actually matter — diff engines, merge drivers, filters — happens
   through a scatter of unrelated config keys with unrelated contracts.
4. **Nondeterminism is undetectable.** Two clones with different extensions
   installed can produce different working trees from the same history, and
   nothing in the repository says so.

Epoch already has the machinery to fix all four. ADR-0034 gives principals,
attenuated grants, and budgets. ADR-0031 makes provider output an untrusted
proposal that cannot mutate canonical state. Hooks already observe lifecycle
events. The extension mechanism should be an application of those existing
contracts, not a new trust domain beside them.

## Decision

Epoch ships a **two-tier** extension model. Both tiers share one manifest, one
trust policy, and one provenance rule.

### Tier 1 — External subcommands

`epoch foo` resolves in this order:

1. a native builtin;
2. an alias in `.epoch/config.toml`;
3. an executable named `epoch-foo` in the repository extension directory
   (`.epoch/ext/bin`), the user extension directory (`~/.epoch/ext/bin`), then
   `$PATH`, in that order, first match wins.

The child process receives a stable environment contract:

| Variable | Meaning |
|---|---|
| `EPOCH_EXTENSION_API` | Integer contract version. `1` today. |
| `EPOCH_DIR` | Absolute path to the `.epoch` directory. |
| `EPOCH_ROOT` | Absolute path to the repository root. |
| `EPOCH_PREFIX` | Path from repository root to the invocation directory. |
| `EPOCH_EXTENSION_NAME` | Resolved extension name, without the `epoch-` prefix. |
| `EPOCH_EXTENSION_GRANT` | Serialized attenuated grant for this invocation, or empty when the extension runs ungranted. |

Remaining arguments are forwarded verbatim; the child's exit code is Epoch's
exit code. An extension is never consulted for a name that a builtin owns, so
adding a builtin can shadow an installed extension. `epoch ext list` reports
shadowed extensions rather than hiding them.

Unlike Git, discovery is not the same as execution. An executable found by
discovery runs only if the trust policy admits it.

### Trust policy

An extension declares itself in `epoch-extension.toml`, colocated with the
executable:

```toml
name = "difftastic"
api = 1
version = "0.65.0"
description = "Structural diff provider"
publisher = "epoch:principal:<ed25519-public-key>"
capabilities = ["syntax", "diff"]
determinism = "deterministic"    # or "advisory"
```

`.epoch/config.toml` carries the policy:

```toml
[extensions]
trust = "explicit"               # "explicit" | "signed" | "any"
allow = ["difftastic", "mergiraf"]
block = []
allow_publishers = ["epoch:principal:<ed25519-public-key>"]
```

- `explicit` (default) admits only names in `allow`.
- `signed` admits any extension whose manifest carries a valid signature from a
  principal in `allow_publishers`.
- `any` reproduces Git's behavior and must be chosen deliberately.

A discovered-but-untrusted extension is reported, never silently run and never
silently ignored. `epoch ext trust <name>` records consent as a signed
operation so the decision is auditable and syncable, not a scratch preference.

Extensions are principals. A capability an extension did not declare is a
capability it does not get, and the grant it receives is attenuated from the
invoking principal's own authority under ADR-0034. An extension cannot widen
what the user could already do.

### Tier 2 — In-process capability registry

Command extensions are the least interesting kind. The registry admits typed
providers for the capabilities that actually shape repository behavior:

| Capability | Provider contract | Consumed by |
|---|---|---|
| `command` | Subcommand implementation | CLI dispatch |
| `syntax` | Source text to typed syntax tree | Diff, merge, compression |
| `diff` | Two versions to a structured patch | `epoch diff`, review |
| `merge` | Three versions to a merge result plus conflicts | Merge Plans |
| `compression` | Object codec | Object store |
| `view` | Named-view / revset operator | View engine |
| `codec` | Foreign-representation projection | Git, forge, social, archive |
| `hook` | Lifecycle observer | Existing hook surface |

Resolution is **deterministic and total**. Providers are selected by, in order:
explicit configuration; declared match specificity (exact language, then MIME
type, then extension, then wildcard); then provider ID in lexicographic order.
Ties never resolve by load order or filesystem enumeration order. Every
capability has a builtin provider of last resort, so an unresolvable request is
a bug, not a runtime failure.

### Provenance is mandatory

This is the rule that makes the mechanism Epoch-shaped rather than Git-shaped.

When a provider's output contributes to signed state — a Revision's fragments,
a Merge Plan's resulting digest, a Review Bundle's combined tree — the event
records a provider descriptor: provider ID, version, capability, manifest
digest, and configuration digest. A verifier can therefore answer "which engine
produced this merge, and would I reproduce it?" from history alone.

Providers marked `determinism = "advisory"` may inform a human but may never
contribute to signed state. This is the same boundary ADR-0031 draws around AI
conflict proposals, generalized to every provider.

## Consequences

Epoch gets Git's permissionless extension curve without inheriting its silent
trust. The cost is real: every extension author writes a manifest, and `any`
trust exists as an escape hatch that knowingly discards the guarantee. Repos
that pin providers in configuration get reproducible diffs and merges across
clones; repos that do not still get deterministic resolution and a recorded
descriptor explaining what ran.

Making capability providers first-class also changes what "extension" means.
The interesting ecosystem contributions — a tree-sitter grammar, a structural
merge driver, a domain codec — plug into the same registry the builtins use,
which keeps builtin and extension behavior on one contract instead of two.

Epoch does not claim a sandbox. A Tier 1 extension is an ordinary child process
with the invoking user's operating-system authority; the grant attenuates
*Epoch* authority, not OS authority. Process isolation belongs to the Sandbox
provider contract and is not promoted here.

## Revisit Criteria

Revisit when a registry-backed provider needs to run inside a Sandbox with
declared filesystem and network capability, or when an extension needs to
contribute signed state directly rather than through an invoking principal.

## Related

- [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)
- [ADR-0034](0034-agent-principals-grants-and-budgets.md)
- [ADR-0038](0038-semantic-diff-merge-and-compression.md)
- [ADR-0039](0039-native-capabilities-from-the-git-extension-ecosystem.md)
- [Extensions And Capability Providers](../extensions.md)
