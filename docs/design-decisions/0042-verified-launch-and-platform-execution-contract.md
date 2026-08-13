# ADR-0042: Verified Launch And Platform Execution Contract

Status: Accepted; implemented

## Context

[ADR-0037](0037-extension-mechanism-and-capability-registry.md) binds consent to
an executable's SHA-256: `epoch ext trust greet` records the digest of the
binary the operator inspected, and a different binary at that path is refused.
Two gaps sit between that decision and the process actually starting.

**The digest is checked, then the path is executed.** Discovery reads the
digest, trust compares it, and `spawnSync` later resolves the same path again.
Re-reading the digest immediately before launch narrows the window to the
syscall boundary but does not close it: an attacker who can write the extension
directory can still replace the file between the final read and the exec. That
race is narrow, but it defeats the one guarantee digest binding exists to make,
so "narrow" is the wrong place to stop.

**Windows discovery and Windows execution disagree.** Discovery accepts `.exe`,
`.com`, `.cmd`, and `.bat` because Windows decides launchability by extension.
Execution calls `spawnSync(executable, args)` with no shell, and Node refuses to
spawn `.cmd` or `.bat` that way — the hardening that followed CVE-2024-27980.
So a `.cmd` extension is discovered, listed, trusted, digest-checked, and then
dies at launch with an opaque `EINVAL`. `.cmd` shims are not an edge case on
Windows; they are how most installed CLIs present themselves.

The naive repair — passing `shell: true` — hands the argument vector to the
command interpreter. Arguments come from the operator's own command line, so
this is not a privilege boundary, but it is a correctness one: paths with
spaces, `&`, or `^` stop meaning what they say.

## Decision

### Execute the bytes that were verified

Where the platform can name an open file descriptor as a path, Epoch opens the
executable once, digests the bytes through that descriptor, and executes the
descriptor rather than the path:

| Platform | Path executed |
|---|---|
| Linux | `/proc/self/fd/<n>` |
| macOS, BSD | `/dev/fd/<n>` |
| Windows, other | the resolved path, with the pre-launch re-read |

The descriptor is passed to the child through the `stdio` array so it survives
into the child's file table, and the exec path is resolved there. The file that
runs is then the file that was hashed, by construction rather than by timing —
including for `#!` scripts, where the kernel resolves the interpreter from the
same descriptor.

Where no such path exists the current behaviour stands: re-read immediately
before launch, refuse on mismatch, and record in `epoch ext show` that the
launch was path-verified rather than descriptor-verified. **The residual is
reported, not hidden.** A guarantee that silently varies by platform is worse
than one that says which platform it holds on.

### Launch `.cmd` and `.bat` through a quoted interpreter

Discovery keeps accepting them; execution stops pretending they are ordinary
programs. On Windows a `.cmd` or `.bat` extension is launched as
`cmd.exe /d /s /c` with a command line Epoch builds itself, rather than by
delegating to `shell: true`:

- every token is wrapped in `"`, unconditionally, with embedded `"` doubled;
- `/d` skips `AutoRun`, and `/s` fixes the outer-quote stripping rule so the
  quoting above is the one CMD actually applies.

Quoting is blanket rather than per-character. Inside quotes CMD already treats
`&`, `|`, `<`, `>`, `(`, and `)` as ordinary characters, so quoting everything
removes the escaping question instead of answering it once per metacharacter —
and a rule with no exceptions is a rule that cannot be applied inconsistently.

The characters quotes do *not* protect are **refused rather than escaped**: any
argument containing `%` or `!`, and any containing a newline or NUL. Percent
expansion happens while the batch file is parsed, after every escaping
mechanism available to the caller has been consumed; `!` expands the same way
when delayed expansion is on, which a machine-wide setting can enable without
this process knowing. There is no sequence that reliably passes either through.
Refusing with a specific message is honest. Quoting it and hoping is how
argument-injection bugs are written.

The refusal names the argument and says why, so an operator hitting it can
route around it rather than guess.

### Make the contract testable off-platform

Platform is injected, like the filesystem and spawn seams already are. The
launch plan — interpreter, argument vector, refusals — is built as a value and
asserted directly, so Windows quoting is covered by the Linux CI that this
repository actually runs. Only the final `spawnSync` is platform-dependent.

## Consequences

Digest binding becomes a property of the executed bytes on Linux and macOS
instead of a property of a short interval. Windows keeps the interval, and says
so.

Windows extensions distributed as `.cmd` shims work, which is most of them.
The cost is a documented argument restriction on exactly those extensions, and
a quoting routine that has to be right — which is why it is a pure function
over an argument vector with its own tests, rather than a flag passed to
`spawnSync`.

Passing a descriptor through `stdio` consumes a child file descriptor slot and
makes the extension's inherited environment marginally larger. Extensions must
not assume fd 3 is free, and they inherit a read handle to their own
executable.

## Revisit Criteria

Revisit when Node exposes `fexecve` or an equivalent, which would remove the
`/proc` and `/dev/fd` dependency; when Windows gains a descriptor-addressable
exec path; or if a sandboxed provider contract (ADR-0043) displaces enough
extension surface that Tier 1 launch stops being the sharp edge.

## Related

- [ADR-0037](0037-extension-mechanism-and-capability-registry.md)
- [ADR-0043](0043-sandboxed-capability-providers.md)
- [Extensions And Capability Providers](../extensions.md)
