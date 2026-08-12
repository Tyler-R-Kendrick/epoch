# Frontier Version-Control And Forge Dossier

Research labels in this dossier are deliberately strict:

- **Official** describes only a claim in the linked primary source.
- **Implemented experiment** describes an executable Epoch mapping or fixture.
- **Epoch inference** is a design conclusion, not an external product claim.
- **Unsupported** names a boundary Epoch does not ship.

Primary sources were accessed 2026-08-11.

## Rift

- **Official:** Fixed Point Labs presents Rift as its cloud development
  environment. [Product site](https://fixedlabs.dev/)
- **Implemented experiment:** Epoch can produce an explicit opt-in launch spec
  with validated argument arrays and no hooks.
- **Epoch inference:** residency, materialization, storage, and execution must
  stay separate even when a remote environment presents them together.
- **Unsupported:** no Rift SDK integration, native workspace provider, remote
  lifecycle manager, or isolation claim. The current execution mode is
  `in-process`.

## Jujutsu (jj)

- **Official:** jj records repository operations so concurrent command results
  can be reconciled, and exposes an operation log for recovery.
  [Concurrency](https://jj-vcs.github.io/jj/latest/technical/concurrency/),
  [operation log](https://docs.jj-vcs.dev/latest/operation-log/)
- **Implemented experiment:** an immutable header plus change identity maps to
  a stable Epoch change revision; the CLI also has a local-only operation DAG.
- **Epoch inference:** stable logical changes should not be derived from branch
  names or mutable descriptions.
- **Unsupported:** Epoch does not host jj's native operation store or wire
  protocol.

## Pijul

- **Official:** Pijul describes changes as first-class and conflict behavior as
  a consequence of its patch theory.
  [Why Pijul](https://pijul.org/manual/why_pijul),
  [conflicts](https://pijul.org/manual/conflicts.html)
- **Implemented experiment:** Epoch has explicit change/revision identities,
  durable conflict objects, and conservative commutation tests.
- **Epoch inference:** commute only when independence is proven; preserve a
  conflict instead of guessing an order.
- **Unsupported:** no Pijul repository format, channel protocol, native command
  adapter, or Pijul/Eden-style filesystem is shipped.

## Graphite

- **Official:** Graphite organizes dependent changes into stacked branches and
  provides restacking workflows. [Overview](https://graphite.com/docs/get-started),
  [restacking](https://graphite.com/docs/restack-branches)
- **Implemented experiment:** a linear Graphite fixture maps to typed Epoch
  stack edges and deterministic dependency closure.
- **Epoch inference:** stack identity and ordering should be explicit rather
  than inferred from branch-name conventions.
- **Unsupported:** no Graphite account, hosted workflow, or API adapter.

## GitButler

- **Official:** GitButler presents multiple virtual branches in one working
  directory. [Overview](https://docs.gitbutler.com/overview)
- **Implemented experiment:** a parallel GitButler fixture maps to independent
  Epoch changes without forcing a linear stack.
- **Epoch inference:** workspace projection and change dependency are separate
  graphs.
- **Unsupported:** no native GitButler workspace, project file, or sync host.

## Radicle

- **Official:** Radicle documents a peer-to-peer protocol for Git collaboration.
  [Protocol guide](https://radicle.xyz/guides/protocol/)
- **Implemented experiment:** `@epoch/forge` declares a public record codec
  boundary and reports structured loss.
- **Epoch inference:** peer identity/transport and canonical repository
  authority must not be conflated.
- **Unsupported:** no Radicle node, gossip transport, seed, or collaboration
  service.

## F3

- **Official:** F3 defines a forge-data interchange format.
  [F3 specification](https://f3.forgefriends.org/)
- **Implemented experiment:** Epoch implements a deterministic public
  issue/change/comment/release JSON codec for the declared v4.0 profile and
  quarantines malformed or unsupported input.
- **Epoch inference:** loss reports are part of the interchange result, not
  logging trivia.
- **Unsupported:** no native F3 server, live forge transport, or archive
  extraction service.

## ForgeFed

- **Official:** ForgeFed is an ActivityPub-based federation specification for
  software forges. [Specification](https://forgefed.org/spec/)
- **Implemented experiment:** Epoch implements a public Ticket/MergeRequest
  record subset against the documented branch snapshot.
- **Epoch inference:** capability metadata must identify the exact snapshot and
  transport availability.
- **Unsupported:** `transport: none`; no ActivityPub delivery. Comment and
  release export fail closed.

## Software Heritage

- **Official:** Software Heritage persistent identifiers use the SWHID syntax
  to identify archived source-code objects.
  [Persistent identifiers](https://docs.softwareheritage.org/devel/swh-model/persistent-identifiers.html)
- **Implemented experiment:** Epoch parses/computes SWHID v1.2 for content,
  directory, revision, release, and snapshot objects and provides an injected,
  public-only Save Code Now client.
- **Epoch inference:** a local SWHID is useful independently of remote archival
  success; archival needs a separately verified receipt.
- **Unsupported:** no bundled archive service or default live network transport.

## Git Protocol Reference

Epoch's bounded Git profile is grounded in the official
[protocol-v2 documentation](https://git-scm.com/docs/protocol-v2) and
[partial-clone documentation](https://git-scm.com/docs/partial-clone).
`filter` is advertised only when promisor behavior is configured and tested;
promised omission is not silently treated as corruption or successful
materialization.
