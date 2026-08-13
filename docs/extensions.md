# Extensions And Capability Providers

Epoch is extensible the way Git is extensible, without inheriting the parts of
Git's mechanism that conflict with signed history. The decision is
[ADR-0037](design-decisions/0037-extension-mechanism-and-capability-registry.md);
what is native rather than extensible is
[ADR-0039](design-decisions/0039-native-capabilities-from-the-git-extension-ecosystem.md).

## The two tiers

**Tier 1 — external subcommands.** `epoch foo` runs `epoch-foo`, discovered in
`.epoch/ext/bin`, then `~/.epoch/ext/bin`, then `$PATH`. First match wins, so a
repository-local extension overrides a globally installed one.

**Tier 2 — capability providers.** In-process, typed providers for the
capabilities that actually shape repository behavior: `command`, `syntax`,
`diff`, `merge`, `compression`, `view`, `codec`, and `hook`. Builtins and
extensions implement the same interfaces, so a grammar-backed syntax provider
can displace a builtin without a fork.

## Discovery is not execution

This is the deliberate departure from Git. Any executable named `git-foo` on
`$PATH` becomes a Git command with the user's full authority, with no
declaration and no consent. In Epoch an extension is discovered, reported, and
then run only if policy admits it.

```
$ epoch ext list
name    state                     source      version  capabilities  executable
greet   untrusted (not-allowed)   repository  1.0.0    command       .epoch/ext/bin/epoch-greet

$ epoch greet
extension 'greet' is installed but not trusted; run 'epoch ext trust greet' to allow it
```

An extension that is installed but not trusted is never silently run and never
silently ignored.

## Manifest

Every extension ships `epoch-extension.toml` beside its executable:

```toml
name = "difftastic"
api = 1
version = "0.65.0"
description = "Structural diff provider"
publisher = "epoch:principal:<ed25519-public-key>"
capabilities = ["syntax", "diff"]
determinism = "deterministic"    # or "advisory"
```

Parsing is fail-closed. An unparsable manifest, an unknown capability, a
mismatched name, or an unsupported `api` yields no extension rather than a
partially trusted one. A capability an extension did not declare is a
capability it does not get.

`determinism = "advisory"` marks a provider that may inform a human but may
never contribute to signed state. This is the [ADR-0031](design-decisions/0031-durable-conflicts-and-conservative-commutation.md)
boundary around AI conflict proposals, generalized to every provider.

## Trust policy

Policy lives in the `[extensions]` table of `.epoch/config.toml`:

```toml
[extensions]
trust = "explicit"               # "explicit" | "signed" | "any"
allow = ["difftastic", "mergiraf"]
block = []
allow_publishers = ["epoch:principal:<ed25519-public-key>"]
```

| Mode | Admits |
|---|---|
| `explicit` (default) | Only names listed in `allow`. |
| `signed` | Any extension whose manifest is signed by a principal in `allow_publishers`. |
| `any` | Any extension with a valid manifest. Reproduces Git's permissiveness; choose it deliberately. |

`block` always wins, in every mode. A missing or invalid manifest is never
trusted, including under `any` — the manifest is what declares which
capabilities the extension is asking for, so there is nothing to consent to
without one.

Extensions are principals. The grant an extension receives is attenuated from
the invoking principal's authority under
[ADR-0034](design-decisions/0034-agent-principals-grants-and-budgets.md); an
extension cannot widen what the user could already do.

## Environment contract

A trusted external subcommand receives its arguments verbatim and this
environment. Its exit code becomes Epoch's exit code.

| Variable | Meaning |
|---|---|
| `EPOCH_EXTENSION_API` | Contract version. `1` today. |
| `EPOCH_DIR` | Absolute path to the `.epoch` directory. |
| `EPOCH_ROOT` | Absolute path to the repository root. |
| `EPOCH_PREFIX` | Path from the repository root to the invocation directory. |
| `EPOCH_EXTENSION_NAME` | Resolved name, without the `epoch-` prefix. |
| `EPOCH_EXTENSION_GRANT` | Serialized attenuated grant, or empty when ungranted. |

These values override any inherited variable of the same name, so a stale
`EPOCH_DIR` in the caller's environment cannot mislead an extension.

## Deterministic resolution

A capability resolves by, in order:

1. an explicit pin in configuration;
2. match specificity — exact language, then MIME type, then file extension, then wildcard;
3. provider ID, lexicographically.

Registration order and filesystem enumeration order never decide the winner.
Every capability has a builtin provider of last resort, so a request is never
unresolvable. A repository that pins its providers gets byte-identical diffs
and merges across clones; one that does not still gets deterministic
resolution.

## Provenance is mandatory

When a provider's output contributes to signed state — a Revision's fragments,
a Merge Plan's resulting digest, a Review Bundle's combined tree — the event
records a provider descriptor:

```json
{
  "providerId": "epoch.syntax.json",
  "capability": "syntax",
  "version": "1.0.0",
  "source": "extension",
  "determinism": "deterministic",
  "manifestDigest": "…",
  "configDigest": "…"
}
```

Git records nothing about which merge driver or clean/smudge filter shaped
content. This descriptor is what lets a verifier answer "which engine produced
this merge, and would I reproduce it?" from history alone.

## Shadowing

Builtins always win. Adding a native command shadows an installed extension of
the same name, and `epoch ext list` reports that rather than hiding it:

```
note: builtin 'diff' shadows /usr/local/bin/epoch-diff
```

This is the mitigation for Epoch's deliberately large native surface
(ADR-0039): every native capability is implemented on the same registry, so an
extension can displace it, and any preemption is visible.

## Boundaries

Epoch does not claim a sandbox for extensions. A Tier 1 extension is an
ordinary child process holding the invoking user's operating-system authority.
The grant attenuates *Epoch* authority, not OS authority. Process, filesystem,
and network isolation belong to the Sandbox provider contract in
[workspace providers](workspace-providers.md) and are not promoted here.

## Commands

See the [CLI Reference](cli.md) for `epoch ext list`, `show`, `trust`, and
`untrust`.
