# ADR-0029: Community Canonical Objects, Mounted Projections, And Explicit Navigation

Status: Accepted

## Context

Nightboard historically derived useful post aliases from visible order and
content, then used the same path structure for object identity, namespace
navigation, and reply ancestry. That made a reorder look like a new object,
made a message both a leaf and a container, and blurred `cd ..`, reply parent,
browser Back, shell `cd -`, fuzzy jump, and Escape. Built-in commands, keys,
voice phrases, and WebMCP tools also risked describing the same behavior in
independent catalogs.

The filesystem metaphor remains valuable. Plan 9 namespaces show the coherent
boundary: a hierarchy is a mounted view for a user or process, not the ontology
of the objects being mounted.

## Decision

Community Core owns immutable opaque object references, explicit relations,
projection specifications, navigation operations, normalized queries, and
action descriptors. Nightboard consumes the generated browser artifact from
that implementation.

- `objectId` never derives from author, body, title, order, alias, path, or
  mutable channel name. Optional AT URIs identify federated records and
  revisions/CIDs identify exact content; neither replaces local object IDs.
- HTTPS is the share surface. Canonical links identify an object, contextual
  links add a projection, and exact links add a revision. Private content and
  content-derived aliases never enter routes, history, notifications, or action
  events. Pre-release slug paths and `nightboard:` locators are not public API;
  persisted schema migration may resolve them once into canonical links.
- Channels, threads, DMs, Activity, following, search, Projection Definitions,
  projects, and Namespace paths are projections over one object graph. A
  Projection Entry has an alias, contextual parent, order, and capabilities
  without changing its target Entity.
- Reply ancestry uses explicit IDs. Missing, deleted, moderated, unavailable,
  and unauthorized ancestors remain typed tombstones; children are never
  silently reparented.
- The filesystem adapter exposes a message as an enterable capability object:
  its default representation is readable and its virtual `body.md`, metadata,
  replies, backlinks, and receipts are listable.
- `cd` is exact and deterministic. Ranked global jump is `z`; `zi` and `/jump`
  expose an explicit grouped chooser when ambiguity remains.
- Browser history records meaningful locations. Focus, selection, detail,
  thread root, reading anchor, previous shell location, and interaction layers
  are separate state. Escape invokes only `cancel.topLayer`.
- One action registry generates commands, slash aliases, key/help hints, exact
  voice phrases, and WebMCP tools. Availability, permission, validation,
  execution, and privacy-safe diagnostics occur once.
- Projection Definitions persist a typed Search Expression, stable projection
  ID, order, label, visibility, and declarative hierarchy. Authorization is
  applied before results, counts, paths, collisions, or shared definition
  metadata leave the boundary.
- The channel list follows the APG feed pattern, thread topology follows the APG
  tree-view pattern with an adjacent reading article, and prompt completion
  follows manual-selection combobox behavior. The visual composition is a
  **hierarchical navigator + detail blade**, not one column per path level.

## Rejected Alternatives

- Ordinal, author, title, body, slug, path, or sort-derived identity.
- Treating every message only as a file or only as a directory.
- One hierarchy as the canonical social/reply graph.
- Inferring reply relations from aliases or paths, or reparenting orphans.
- Silent fuzzy fallback inside `cd` or `board_navigate`.
- Independent command, slash, key, voice, and MCP implementations.
- Route, focus, selection, or reading-anchor state based on list indexes.
- Escape as a hidden cascade for ancestry, history, and cancellation.
- A public route containing raw private query or message content.

## Consequences

Stable identity survives movement, editing, federation, and projection. The
filesystem metaphor becomes an honest namespace adapter, graph operations stay
coherent through moderation or missing data, and every invocation surface has
one permission boundary. Persisted schema migrations and generated-artifact
freshness checks become required release gates. Migrations do not preserve
duplicate pre-release APIs.

The model adds explicit references and projection metadata, but avoids a new
public URI scheme and new runtime dependency. Static/offline Nightboard remains
deployable.

## Primary References

- [Plan 9 namespaces](https://9p.io/sys/doc/names.html)
- [Plan 9 nntpfs](https://9p.io/magic/man2html/4/nntpfs)
- [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322.html)
- [Gnus thread navigation](https://www.gnu.org/software/emacs/manual/html_mono/gnus.html)
  and [MH-E threading](https://www.gnu.org/software/emacs/manual/html_node/mh-e/Threading.html)
- [Atom stable entry IDs](https://www.rfc-editor.org/rfc/rfc4287.html)
- [AT URI scheme](https://atproto.com/specs/at-uri-scheme)
- [ActivityStreams Core](https://www.w3.org/TR/activitystreams-core/)
  and [Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/)
- [Newsboat query feeds](https://newsboat.org/releases/2.44/docs/newsboat.html)
- [zoxide](https://github.com/ajeetdsouza/zoxide) and [fzf](https://github.com/junegunn/fzf)
- [APG feed](https://www.w3.org/WAI/ARIA/apg/patterns/feed/), [tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/), and [combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

## Related Documents

- [Nightboard semantic contract](../design-explorations/nightboard/CONTRACT.md)
- [Nightboard parity evidence](../evidence/nightboard-navigation-projection-parity/README.md)
- [Community Web experience](../community-web-experience.md)
- [ADR-0027: Nightboard visual world](0027-community-visual-world-nightboard.md)
- [ADR-0042: deterministic search and mounted projections](0042-deterministic-search-and-mounted-projections.md)
