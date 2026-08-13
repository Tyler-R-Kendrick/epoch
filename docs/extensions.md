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

**Implementation status.** Tier 1 is implemented end to end: discovery, trust,
and dispatch. Tier 2 is implemented as far as the registry and its resolution
order; the builtins already register through it rather than being consulted
directly, and `createSyntaxRegistry` accepts extension-supplied providers. What
does not exist yet is the loader that turns a trusted `syntax`-capable
extension into an in-process provider, so today no shipped extension can
actually displace a builtin. The seam is deliberate — displacement is a change
of behavior in signed evidence, and it should not land before provenance
recording does.

## Discovery is not execution

This is the deliberate departure from Git. Any executable named `git-foo` on
`$PATH` becomes a Git command with the user's full authority, with no
declaration and no consent. In Epoch an extension is discovered, reported, and
then run only if policy admits it.

```console
$ epoch ext list
name    state                     source      version  capabilities  executable
greet   untrusted (not-allowed)   repository  1.0.0    command       .epoch/ext/bin/epoch-greet

$ epoch greet
extension 'greet' is installed but not trusted; run 'epoch ext trust greet' to allow it
```

An extension that is installed but not trusted is never silently run and never
silently ignored.

## Manifest

Every extension ships a manifest named for itself beside its executable —
`epoch-difftastic.toml` next to `epoch-difftastic`. The manifest is
per-executable rather than per-directory because it declares a single `name`,
and one bin directory holds many `epoch-*` binaries:

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

`executable_sha256` and `signature` are optional under `explicit` trust and
required under `signed`. A manifest carrying a signature without a digest is
rejected outright: a signature that does not cover the binary is worse than no
signature, because it looks like a guarantee.

Parsing is fail-closed. An unparsable manifest, an unknown capability, a
mismatched name, or an unsupported `api` yields no extension rather than a
partially trusted one. A capability an extension did not declare is a
capability it does not get.

`determinism = "advisory"` marks a provider that may inform a human but may
never contribute to signed state. This is the [ADR-0031](design-decisions/0031-durable-conflicts-and-conservative-commutation.md)
boundary around AI conflict proposals, generalized to every provider.

## Trust policy

Operator policy lives in the `[extensions]` table of `.epoch/config.toml`:

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
| `signed` | Any extension whose manifest carries a signature that **verifies** against a principal in `allow_publishers`. |
| `any` | Any extension with a valid manifest. Reproduces Git's permissiveness; choose it deliberately. |

`block` always wins, in every mode. A missing or invalid manifest is never
trusted, including under `any` — the manifest is what declares which
capabilities the extension is asking for, so there is nothing to consent to
without one.

### What `signed` actually checks

`publisher` and `signature` are both manifest fields, and a manifest is
attacker-controlled input. Naming an allowlisted publisher therefore proves
nothing on its own; it only narrows *which key is permitted to have signed*.
Trust is granted only after all of the following hold:

1. `publisher` is present and listed in `allow_publishers`;
2. the manifest declares `executable_sha256`, and it matches the SHA-256 of the
   executable actually on disk;
3. the Ed25519 signature verifies, using the key carried in the publisher
   identifier, over the canonical manifest.

Because the canonical manifest includes `executable_sha256`, signing the
manifest transitively binds the binary: a valid signed manifest cannot be
paired with a swapped executable. Any failure is reported with a specific
reason (`publisher-not-allowed`, `executable-mismatch`, `invalid-signature`)
and the extension does not run.

### Configuration is read, consent is recorded

These are different kinds of data and they live in different files.

`.epoch/config.toml` is **hand-authored and read-only to Epoch**. Humans choose
the trust mode, pin publishers, and block names there; no Epoch command rewrites
it.

`.epoch/ext/trust.json` is **machine-owned**. `ext trust` and `ext untrust`
write it, whole, atomically, and no human is expected to edit it:

```json
{
  "allow": [{ "executableSha256": "9f2c…", "name": "greet" }],
  "block": [],
  "version": 1
}
```

Splitting them removes a class of defect rather than another instance of one.
Editing TOML in place means re-deriving which spellings name the same table —
`[extensions]`, `["extensions"]`, `["extensions"]` — and escaping every
value written back; getting any of it wrong corrupts the file that decides
whether an external process runs. A whole-file JSON document is parsed and
serialized by the platform and has no such surface.

A store that cannot be parsed is an error, never an empty store: reading
corruption as "no entries" would drop the `block` list, so damage would widen
the policy instead of narrowing it. An unreadable store trusts nothing, whatever
the configured mode.

### Consent binds to the binary

`ext trust greet` records the SHA-256 of the executable it consented to. If that
binary is later replaced, the grant does **not** transfer:

```console
$ epoch greet
extension 'greet' has changed since you trusted it; re-run 'epoch ext trust greet' to consent to the new binary
```

This is the substantive departure from Git, and from a plain allow list. A
name-only grant trusts whatever later occupies the path — an upgrade and a
substitution look identical to it. Epoch cannot tell those apart either, so it
asks the one party who can. The model is SSH's `known_hosts`, not `$PATH`.

An `allow` entry written by hand in `.epoch/config.toml` is deliberately *not*
digest-bound: an operator who lists a name there is choosing the looser
guarantee, and the two sources are distinguishable in `ext show`
(`allowed-by-consent` versus `allowed-by-name`).

`ext untrust` revokes rather than merely un-listing. It records the name in
`block`, because `signed` and `any` admit extensions that were never allowed by
name and removing an absent entry would revoke nothing while reporting success.
`block` is the union of both files, and it is checked before every allow, so
neither file can override the other's revocation.

Trust never syncs. Consenting in one clone grants nothing in another, where
`epoch-foo` on `$PATH` is a different file.

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

```text
note: builtin 'diff' shadows /usr/local/bin/epoch-diff
```

This is the mitigation for Epoch's deliberately large native surface
(ADR-0039): every native capability is implemented on the same registry, so an
extension can displace it, and any preemption is visible.

## Platform notes

Executability is decided per platform. On POSIX systems discovery requires an
execute bit; on Windows it accepts `.exe`, `.com`, `.cmd`, and `.bat`, because
Windows carries no POSIX mode bits and decides launchability by extension.

## Boundaries

Epoch does not claim a sandbox for extensions. A Tier 1 extension is an
ordinary child process holding the invoking user's operating-system authority.
The grant attenuates *Epoch* authority, not OS authority. Process, filesystem,
and network isolation belong to the Sandbox provider contract in
[workspace providers](workspace-providers.md) and are not promoted here.

## Commands

See the [CLI Reference](cli.md) for `epoch ext list`, `show`, `trust`, and
`untrust`.
