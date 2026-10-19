# Governance

Epoch is maintained by one person. Tyler Kendrick
([@Tyler-R-Kendrick](https://github.com/Tyler-R-Kendrick)) is the BDFL
(benevolent dictator for life) of the canonical repository,
[Tyler-R-Kendrick/epoch](https://github.com/Tyler-R-Kendrick/epoch).

The project has no foundation, company, or committee. This file is the
governance record. Changes to it land on the default branch (`main`) when the
BDFL accepts them.

## Decisions

Proposed changes are pull requests. Review follows
[CONTRIBUTING.md](CONTRIBUTING.md). GitHub Actions quality gates are the bar
for what can merge.

The BDFL decides what lands on `main`: accept, ask for changes, or decline.
Discussion on issues and pull requests informs that decision. Material design
choices are recorded as ADRs under
[docs/design-decisions/](docs/design-decisions/README.md). Routine fixes do
not need an ADR.

## Committers and maintainers

Anyone may contribute by opening an issue or a pull request. Write access is
separate from authorship.

A committer has write access to the canonical repository. A maintainer may
also moderate the spaces covered by the
[Code of Conduct](CODE_OF_CONDUCT.md), handle reports under
[SECURITY.md](SECURITY.md), and publish a snapshot the BDFL has decided to
ship.

The BDFL grants committer or maintainer access to a person with a sustained
record of reviewed contributions whom the BDFL trusts with the repository.
The BDFL may revoke that access. Grant and revocation are recorded by updating
this file on `main`. This file names no committer or maintainer besides the
BDFL.

## Disputes

Raise a technical disagreement on the existing issue or pull request. Open an
issue when no thread exists yet. Conduct expectations are in the
[Code of Conduct](CODE_OF_CONDUCT.md). Maintainers may moderate issues, pull
requests, discussions, and contributions.

When discussion does not settle a technical question, the BDFL decides for
this repository. A material outcome is recorded in an ADR.

A dispute about the BDFL has no separate appeals body. The decision on this
repository stands. Epoch is MIT-licensed, so anyone may fork the project and
continue it under their own governance. A fork is a different project and
keeps its own maintainers. It does not take over the canonical repository or
the BDFL role.

Security reports stay off the public issue tracker. Follow
[SECURITY.md](SECURITY.md).

## Releases

Epoch is a pre-1.0 research prototype in active development. Accepted work
merges to `main`. Security fixes are accepted on that same development line.

Workspace packages currently declare version `0.1.0`. The root package is
private. This repository has no release branch, release manager, or automated
package publish. Install from a source checkout, as the README describes.

The BDFL may tag a commit and publish a GitHub Release when a snapshot is
worth naming. Before 1.0, a tag names that snapshot. Compatibility is not
guaranteed. Breaking changes may land on `main` without a deprecation window.

## Continuity

If the BDFL is temporarily unavailable, the repository stays as published.
People may still open issues and pull requests. No interim maintainer is
designated. Merges, releases, and governance edits wait until the BDFL
returns.

When the BDFL plans a long absence or to step down, the BDFL names a
successor or an interim maintainer by updating this file in a commit on
`main` first. That commit is the designation.

If the BDFL is permanently unavailable and this file on `main` names no
successor, nobody inherits the role. Continuity is a fork under the MIT
license. The GitHub repository `Tyler-R-Kendrick/epoch` remains with that
account. Maintainer credentials are not deposited with another person.

## Related

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [SUPPORT.md](SUPPORT.md)
- [License](LICENSE)
