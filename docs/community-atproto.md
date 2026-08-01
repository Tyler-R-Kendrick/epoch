# Community ATProto

Design status: implemented MVP in `@epoch/atproto` (mock PDS, federation
service). Normative product boundary:
[ADR-0020](design-decisions/0020-community-federation-atproto-git-proxy.md).

## Modes

| Mode | Behavior |
|---|---|
| `disabled` | All social ops throw `FeatureDisabledError` (`feature_disabled`) |
| `local-only` | Profiles/follows/stars/repos in process memory; no PDS writes |
| `federated` | Public objects written to PDS via `PdsTransport` |

## Lexicons (`org.epoch.*`)

- `org.epoch.actor.profile`
- `org.epoch.graph.follow`
- `org.epoch.feed.star`
- `org.epoch.repo` (includes `gitCloneUrl`, `epochSyncUrl`)
- `org.epoch.issue` / `org.epoch.issue.comment`
- `org.epoch.proposal` / `org.epoch.proposal.review`

## Private publish gate

Any attempt to federate non-`public` visibility fails with
`PrivatePublishError`. Private issues may exist locally without AT URIs.

## Legal hold

`FederatedCommunity.legalHoldExport()` returns AT URIs and mock PDS record
snapshots for federated objects and moderation reports.

## Git clone URL

Public repo cards set `gitCloneUrl` from the configured Git proxy base
(see [Git Compatibility Proxy](git-compatibility-proxy.md)).
