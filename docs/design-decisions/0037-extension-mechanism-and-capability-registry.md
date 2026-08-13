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

An extension declares itself in a manifest colocated with the executable:

```toml
name = "difftastic"
api = 1
version = "0.65.0"
description = "Structural diff provider"
publisher = "epoch:principal:<base64url-spki-ed25519-key>"
capabilities = ["syntax", "diff"]
determinism = "deterministic"    # or "advisory"
executable_sha256 = "<sha256 of the executable>"
signature = "ed25519:<base64>"
```

The manifest is named for its extension (`epoch-difftastic.toml` beside
`epoch-difftastic`) rather than shared per directory, since one manifest
declares one `name` and a bin directory holds many extensions.

`.epoch/config.toml` carries the policy:

```toml
[extensions]
trust = "explicit"               # "explicit" | "signed" | "any"
allow = ["difftastic", "mergiraf"]
block = []
allow_publishers = ["epoch:principal:<ed25519-public-key>"]
```

- `explicit` (default) admits only names in `allow`.
- `signed` admits an extension only when its Ed25519 signature verifies against
  a principal in `allow_publishers`, over a canonical manifest that includes the
  executable's SHA-256. `publisher` is manifest input, so naming an allowed key
  narrows which key may have signed; only verification grants trust, and the
  embedded digest binds the signature to the binary.
- `any` reproduces Git's behavior and must be chosen deliberately.

A discovered-but-untrusted extension is reported, never silently run and never
silently ignored. `epoch ext trust <name>` records consent as a signed operation
so the decision is auditable. The record is auditable but the grant is
deliberately *not* syncable: consenting to run a binary in one clone must never
grant execution in another, where the binary on `$PATH` is a different file.

`epoch ext untrust <name>` is the inverse and must actually revoke. Removing the
name from `allow` is not enough, because `signed` and `any` admit extensions
that were never in `allow`; `untrust` therefore records the name in `block`,
which wins in every mode, and `trust` clears it again.

#### Configuration is read; consent is stored separately

Hand-authored policy and recorded consent are different kinds of data, so they
live in different files. `.epoch/config.toml` is operator-owned and Epoch only
reads it. `.epoch/ext/trust.json` is machine-owned: Epoch rewrites it whole and
atomically, and no human is expected to edit it.

This is a correction, and the reason is worth recording. The first
implementation wrote consent back into the `[extensions]` table by editing TOML
lines in place. That required deciding which spellings name the same table and
escaping every value written back, and it produced four separate defects in
review — a duplicate `allow` key against multi-line arrays, a duplicate table
against comment-suffixed headers, an injection through unescaped names, and two
further table spellings (quoted, then `\u`-escaped) that the check did not
recognize. Each fix addressed the spelling that had been found; the next one
always existed. The mechanism was wrong, not its parameters: a component that
gates process execution should not contain a partial TOML writer.

A store that cannot be parsed is an error rather than an empty store. Reading
corruption as "no entries" would silently drop `block`, so damage to the file
would widen the policy; an unreadable store instead trusts nothing.

#### Consent binds to the executable

`ext trust` records the SHA-256 of the binary it consented to, and a changed
binary does not inherit that grant — it is refused with an instruction to
re-consent. A name-only allow list trusts whatever later occupies the path, and
an upgrade is indistinguishable from a substitution. Epoch cannot tell them
apart either, so it asks the operator, on the model of SSH's `known_hosts`.

An `allow` entry written by hand in configuration stays name-only: an operator
listing a name there is deliberately choosing the looser guarantee, and the two
are distinguishable in the trust decision (`allowed-by-consent` versus
`allowed-by-name`).

The digest is read during discovery and re-read immediately before launch. That
narrows, but does not close, the window in which a binary could be swapped after
the check — closing it entirely needs execution by file descriptor, which Node
does not expose. A swap that loses the race is refused.

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
