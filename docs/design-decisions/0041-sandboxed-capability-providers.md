# ADR-0041: Sandboxed Capability Providers

Status: Accepted; implemented for `syntax`

## Context

[ADR-0037](0037-extension-mechanism-and-capability-registry.md) describes two
tiers. Tier 1 — external `epoch-*` subcommands — is implemented. Tier 2 — typed
in-process providers for `syntax`, `diff`, `merge`, `compression`, `view`,
`codec`, and `hook` — has a registry, deterministic resolution, and a seam on
`createSyntaxRegistry` that accepts extension-supplied providers. Nothing fills
that seam. No shipped extension can displace a builtin, and the documentation
says so rather than implying otherwise.

The seam was left empty deliberately, because the obvious way to fill it is
wrong. Loading provider code by `import()` would give an extension the full
authority of the Epoch process — strictly more than Tier 1, where the extension
is at least a separate process with its own memory. It would also break
`@epoch/semantic`'s browser-safe constraint, since a provider that can `require`
Node built-ins cannot run in the Community Web surface.

Tier 2 is also where the stakes are highest. A `command` extension produces
output a human reads. A `syntax` provider decides what a diff *says changed*,
what a merge produces, and what a conflict is scoped to — and under ADR-0037's
provenance rule, that output is recorded in signed state. A provider that is
nondeterministic, or that reads the filesystem, corrupts evidence rather than
inconveniencing a user.

Epoch has no sandbox. ADR-0037 states that as a non-goal and points at a future
Sandbox provider contract. That non-goal is defensible for Tier 1, where the
extension is an ordinary child process holding the invoking user's OS authority
and the operator consented to exactly that. It is not defensible for Tier 2,
where the whole point is to run someone else's code inside a decision that
produces signed evidence.

## Decision

**Capability providers are WebAssembly modules, not host code.** The provider
ABI is a `.wasm` module beside the manifest, declared by a `provides` table:

```toml
name = "difftastic"
api = 1
capabilities = ["syntax"]
determinism = "deterministic"

[[provides]]
capability = "syntax"
module = "difftastic-syntax.wasm"
language = "typescript"
module_sha256 = "9f2c…"
extensions = [".ts", ".tsx"]
```

`module` is a file name resolved beside the manifest, never a path, and
`module_sha256` is required: a module whose bytes are not bound is a module
nobody consented to, and shaping signed evidence is exactly what it would be
doing. The canonical manifest covers every declaration, so signing the manifest
transitively binds every module — the rule that already binds the executable.

At equal match specificity a shipped provider outranks the builtin for the same
language. That ordering *is* the displacement ADR-0037 promised; without it the
winner was decided by whichever ID sorted first, which is not a decision anyone
made. It is deliberately the opposite of subcommand resolution, where a builtin
shadows an extension: a native command must not be silently replaced, while a
provider is the thing extensions exist to improve.

The module is instantiated with **one import: memory the host owns**. It cannot
open a file, read a clock, obtain entropy, or reach the network, because nothing
in its environment offers those. This is not a policy that must be enforced; it
is the absence of a capability, which is the only kind of sandbox that does not
eventually leak.

Memory is imported rather than module-defined so the ceiling belongs to the
host: `WebAssembly.Memory` with a `maximum` is enforced by the engine, where a
module declaring its own limits would only be asked to behave.

The ABI is deliberately small:

| Export | Purpose |
|---|---|
| `epoch_abi_version() -> i32` | Contract version; mismatched modules are refused. |
| `alloc(len: i32) -> i32` | Host allocates guest memory for the input. |
| `parse(ptr: i32, len: i32) -> i32` | Source text in, canonical JSON syntax tree out. |

`parse` returns a pointer to an 8-byte `{pointer, length}` record addressing
UTF-8 JSON. Input and output cross the boundary as UTF-8 in linear memory, and
node offsets are **UTF-8 byte offsets**, which the host maps to the UTF-16 code
units `SyntaxNode` uses — refusing a boundary that falls inside a character
rather than rounding it into a wrong span. The result is
the canonical JSON encoding of the same `SyntaxNode` shape builtin providers
produce, so a WASM provider and a builtin are interchangeable to `semanticDiff`,
`semanticMerge`, and `planCompression` without either knowing which it got.

Each parse gets a fresh instance. Compilation happens once, because it is the
expensive step, but a module that kept state in its linear memory between calls
could answer differently the second time it is asked the same question — which
would defeat the reproducibility the recorded digest exists to buy. Validating
the output does not restore determinism; only starting from the same state does.

### Determinism is structural, and its exceptions are named

A WASM module with no ambient imports is deterministic by construction, with
three exceptions worth stating rather than discovering: NaN bit patterns may
vary between engines, `memory.grow` may fail differently under different limits,
and a module may not terminate.

Epoch answers the second with a fixed memory ceiling, recorded in the provider
descriptor, and bounds the decoded result by node count and tree depth so a
module cannot exhaust the host through its output.

**It does not answer the third, and says so.** Terminating a running module
needs instruction-level fuel accounting that the platform's `WebAssembly` API
does not expose; a hostile module can therefore hang the process. That is the
same exposure a Tier 1 subcommand already carries, and it is bounded by the same
thing: the operator consented to this specific module by digest. The sandbox
removes *authority*, not the ability to waste time. Claiming otherwise would be
the more dangerous error.

Because the module is content-addressed, `manifestDigest` in the
`ProviderDescriptor` gains real force: two clones resolving the same provider
digest run the same bytes under the same limits, so "would I reproduce this
merge?" is answerable from the recorded evidence rather than from trust in a
version string.

### Trust reuses Tier 1, unchanged

A provider module is an artifact beside an extension, so it inherits the
mechanism already built: the manifest declares it, `executable_sha256` binds it,
`epoch ext trust` consents to a specific module, and a changed module loses that
consent. No second trust system.

Providers marked `determinism = "advisory"` are excluded from any resolution
feeding signed state, as ADR-0031 already requires. Advisory providers are the
one place a subprocess-backed provider is admissible: it can inform a human
without the reproducibility the WASM contract exists to guarantee.

### What this does not cover

`command` capability stays Tier 1. A subcommand's job is to have effects — write
files, call networks, drive a terminal — and a sandbox that permits that is not
a sandbox. The tiers are separated on exactly that line: Tier 1 acts with the
operator's authority and says so; Tier 2 computes and is given nothing.

## Consequences

Epoch can finally accept the ecosystem contributions ADR-0039 identified as
genuinely pluggable — a tree-sitter grammar, a structural merge driver — without
handing them the process. The claim that an extension can displace a builtin
becomes true, and true under a sandbox rather than in spite of one.

The cost lands on extension authors: a provider must compile to WASM, which
rules out shelling out to an existing binary and makes some ports non-trivial.
That cost is the point. A provider that cannot be expressed without ambient
authority is a provider whose output should not be shaping signed evidence.

The host gains a WASM runtime dependency in the CLI. `@epoch/semantic` stays
free of it: the engine keeps taking `SyntaxProvider` values and never learns
where they came from, which is what keeps it browser-safe and what lets the same
provider run in the Community Web surface.

## Revisit Criteria

Revisit when the Component Model and WASI Preview 2 are stable enough to replace
the hand-rolled ABI with typed interfaces; when a runtime with instruction-level
fuel accounting is available, which would let a non-terminating module be
stopped rather than merely bounded in memory; or when a capability appears whose
provider genuinely requires I/O and cannot be advisory.

## Related

- [ADR-0031](0031-durable-conflicts-and-conservative-commutation.md)
- [ADR-0037](0037-extension-mechanism-and-capability-registry.md)
- [ADR-0038](0038-semantic-diff-merge-and-compression.md)
- [ADR-0040](0040-verified-launch-and-platform-execution-contract.md)
