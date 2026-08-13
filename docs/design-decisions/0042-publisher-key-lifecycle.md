# ADR-0042: Publisher Key Lifecycle

Status: Accepted; implemented

## Context

Under [ADR-0037](0037-extension-mechanism-and-capability-registry.md) a
publisher is named `epoch:principal:<base64url-spki-ed25519-key>`. The key *is*
the identity. That makes verification offline, dependency-free, and impossible
to spoof by naming — which is why `signed` trust survived review where a
metadata-only check did not.

It also means the identity has no lifecycle. A signature is valid forever. A
compromised key cannot be withdrawn. A publisher rotating to a new key becomes,
to every repository, an unrelated stranger — so `allow_publishers` must be
hand-edited in every clone that trusted them, which in practice means operators
either never rotate or paste keys they did not verify.

This is the weakest remaining claim in the extension mechanism. `signed` mode
tells an operator that an extension "is signed by an allowed publisher". Today
that sentence carries no time bound and no way to take it back.

Sigstore and TUF solve this with transparency logs and online infrastructure.
Epoch has neither, and acquiring them for an extension mechanism would be a
larger commitment than the mechanism is worth. But Epoch does have a signed,
append-only, replicating event log, which is most of what a revocation system
needs.

## Decision

### Signatures may expire

The canonical manifest gains an optional `not_after` timestamp, inside the
signed payload. A verifier past that instant treats the signature as absent —
reason `signature-expired`, distinct from `invalid-signature`, because the
remedies differ. Absent `not_after` keeps today's behaviour, so nothing existing
breaks.

Expiry converts an unbounded assertion into a renewable one. A publisher who
stops signing stops being trusted, without anyone having to notice.

### Rotation is a statement signed by the key being retired

A publisher rotates by publishing a `successor` statement — new key, timestamp,
signed by the **old** key. Any verifier already holding the old key can check
it offline and follow the chain forward. No registry, no network, no trusted
third party.

Rotation extends `allow_publishers` transitively: a repository that trusts key A
trusts key B if it holds a valid A-signed successor statement. The chain is
bounded (a configurable depth, default small) so a lost key cannot be walked
into an unbounded delegation graph.

A compromised key can of course sign a successor statement naming the attacker.
Rotation is therefore not a recovery mechanism, and this ADR does not pretend
otherwise — recovery is what revocation below is for, and revocation outranks
succession.

### Revocation is an event, and revocations sync

`epoch ext trust` deliberately does **not** sync: consenting to run a binary in
one clone must never grant execution in another. Revocation is the mirror image,
and the asymmetry is the whole design:

> A grant must not propagate, because it only ever adds authority.
> A revocation should propagate, because it only ever removes it.

So revocation is a signed Epoch event — `publisher-revoked`, carrying the
revoked key, a reason, and an effective instant — replicating through ordinary
sync like any other event. A repository that has seen the event refuses
signatures from that key, including signatures that were valid when made and
including any successor chain rooted in it.

Two origins are accepted, and they are checked independently. The difference
between them is *proof*, not severity: a statement that arrives over sync must
carry its own signature, or any peer could revoke any publisher for everyone
downstream. The operator's own file needs none, because the file is the
authority.

- **self-revocation**, signed by the revoked key itself, which anyone can
  verify and which needs no prior relationship; and
- **operator revocation**, recorded locally in `revoked_publishers` in
  `.epoch/config.toml`, for out-of-band notice where the key holder cannot or
  will not self-revoke — the case that matters most, since a compromised key's
  holder may be exactly who you are defending against.

Revoking a key takes with it every key it went on to name, or rotation would be
a way to outlive revocation: a chain is not followed through a revoked link,
and a chain rooted in a revoked key is not followed at all.

Precedence follows the rule the trust policy already uses: revocation is checked
before every allow, from either source, and no configuration mode overrides it.
`block` and revocation both subtract, and subtraction always wins.

### What an operator sees

`epoch ext show` reports which key verified a manifest, whether that key was
reached directly or through succession, when the signature expires, and whether
a revocation is on file. A trust decision an operator cannot inspect is a trust
decision they cannot audit.

## Consequences

`signed` trust becomes a claim with a duration and a withdrawal path, which is
what "signed" is normally taken to mean. The cost is three new verifiable
statement types and a rule that revocation replicates while consent does not —
a distinction that has to be explained clearly, because "trust is local" and
"revocation is global" sound contradictory until the direction of authority is
named.

Revocation propagating through sync means a repository that never syncs never
learns. That is inherent to an offline-first design and is stated rather than
engineered around; the local `revoked_publishers` list is the answer for
operators who need certainty without waiting for replication.

Expiry will strand extensions whose publishers stop signing. That is the
intended behaviour, and it is why `explicit` trust — consent to a specific
binary digest, with no publisher involved — remains the default and is
unaffected by any of this.

## Revisit Criteria

Revisit if Epoch adopts a general principal-key lifecycle under ADR-0034, in
which case publisher keys should become an instance of it rather than a parallel
mechanism; or if a transparency log becomes available that Epoch already depends
on for another reason.

## Related

- [ADR-0034](0034-agent-principals-grants-and-budgets.md)
- [ADR-0037](0037-extension-mechanism-and-capability-registry.md)
- [Extensions And Capability Providers](../extensions.md)
