# Community Web Experience

Community Web is to Epoch what GitHub is to Git: the community experience
built on the Epoch DVCS. It is the central place where people follow the work
of others, maintainers manage the contributions to their own projects, and
communities engage together — replacing the scatter of Discord, Slack, X,
Reddit, and Stack Overflow around today's forges. Epoch's native primitives —
signed Changes, anchors, epochs, verified identity, and policy-bound agents —
surface as first-class product concepts inside the flow of community
conversation, the way Git's branches and merges became GitHub's branches and
pull requests. Participants include professional developers, citizen builders
building in the open, and agents contributing concurrently under human
oversight; the defining artifact is the epoch, a point-in-time materialization
of the project the community built, credited to everyone who took part.

Community Web is a **community-first** social coding surface inspired by Discord’s server model, with Epoch trust and ATProto network discovery.

## Canonical app shell

Community Web is the only Community Web runtime. The CanvasUI-powered creator
landing is `/`; its Enter action opens the tmux-style, keyboard-first board at
`/board.html`. `npm run dev:community-web` and the Vercel static build both serve
these same files. The unused Civic Workshop renderer is not a product surface.

A fixture board is labeled **SAMPLE STREAM** in the status chrome. It does not
replay canned posts as live traffic, does not grow Activity or unread counts
while idle, and does not present fixture subscriber numbers as live member
counts. Receipt locators (`sig:`, `intent://`, `agent-run://`) open as
inspectable objects. Jump leaves the active search query in place. Composer
letters including `j`/`k`/`R` stay in the prompt. Mute, report, and hook test
require a selected object. AT sign-in is PAR/PKCE/DPoP against an injected host
and never hashes a handle into a DID. Activity grows only from Community-store
participant events. Spaces on that board read as `sample space`. Entering from the landing
opens `#general` unless the URL names a projection or object. Live Activity from
other participants is a separate capability and is not simulated.

Livestreams are command logs, not screen-share. Spectators replay `nav.enter`,
`feed.sort`, and other action ids in their own theme. Email, legal names, private
DMs, `.env` and login fields are dropped or replaced with a fixed-width cipher
slab. Protected inputs emit no keystrokes and no character counts. Streamers can
mute input streaming (`Ctrl+Shift+.`); `.epochstreamignore` and
`.epochstreamrewrite` fail closed to those defaults. Spectators render hidden
fields as fixed-width cipher slabs (CanvasUI decrypt-reveal at passthrough `0`)
and never apply the streamer's theme. See
[ADR-0050](design-decisions/0050-command-livestream-privacy.md).

## Three planes

| Plane | Default? | What it is | Competitor analogy |
|---|---|---|---|
| **Community** | **Yes** | A place people belong to, with its own channels | Discord server |
| **Network Feed** | Discovery | Cross-community ATProto activity (follows, stars, releases, contributions) | Tangled timeline / GitHub Following / X |
| **Linked project** | Secondary | Issues / Changes for a repository hanging under a community | GitHub repo lists |

### Why communities own channels

Dev teams use Discord independent of GitHub because **culture and continuous conversation are not repository-scoped**. Epoch therefore:

1. Lists **Communities** in the rail (always).
2. Shows **Channels for the active community** (`#general`, `#showcase`, work channels, …).
3. Lists **Linked projects** under that community (optional repos).
4. Keeps a **Network Feed** for cross-community observation — not as the only home.

## Community channels

| Kind | Examples | Repo required? |
|---|---|---|
| Social | `#general`, `#showcase` | No |
| Work | `#ideas`, `#bugs`, `#support`, `#agent-runs`, `#previews`, `#governance` | Optional; forge-backed messages may attach |

Selecting an Entity on a work channel opens the signed action tray (Change,
agent, report, …).

### Power-user controls

Community Web treats the channel as a terminal-style work surface without making
the feed mouse-only. The prompt hands focus to one roving message article;
`j`/`k`, arrows, Home/End, and Enter move or open it while focus, selection,
and the current thread stay aligned.

Community objects have opaque stable IDs. Channel feeds, explicit reply trees,
DMs, Activity, search, Projection Definitions, projects, and Namespace paths
are mounted projections over the same Entities. The canonical composition is a
**hierarchical navigator + detail blade**; namespace ancestry, reply ancestry,
browser history, shell `cd -`, and Escape cancellation remain distinct actions.

Channel messages implement the APG feed model. Opening a thread reveals an APG
tree outline synchronized with a full reading article; tombstones preserve
missing or moderated ancestry without exposing forbidden actions. Prompt
completion is a manual-selection combobox: opening suggestions does not select
one, arrows do, Escape preserves the draft, and default Tab remains focus
traversal.

`cd` resolves exact Namespace paths and aliases only. `z` performs a ranked
global jump and `zi`/`/jump` opens a grouped chooser. Named Projection
Definitions retain a stable projection ID, typed Search Expression, visibility,
and total order. Mutations through them carry canonical Entity identity into
every projection.

Share distinguishes current-origin HTTPS canonical, contextual, and exact
revision links. URLs, browser history, notifications, and action diagnostics
carry stable IDs rather than private message text or content-derived aliases.

Users can save a deterministic action with
`macro set <name> = <command>; <command>` (or the `skill` alias), bind an exact
spoken phrase with `macro voice <name> = <phrase>`, and run it with
`macro run <name>`. Each saved action automatically registers as a
`user_<name>` WebMCP tool, so prompt, agent, and voice use one definition.
Actions may compose only Community Web's registered commands; arbitrary script or
shell execution is rejected.

## Network Feed tabs

Following · Network · Contributions — verb-led ATProto/contribution cards with trust meta. Primary CTA may open a community channel or a linked project.

## Honesty

| Mode | Meaning |
|---|---|
| Live community | Channels are community-owned; linked projects supply issues/changes |
| Snapshot | Labeled demo communities/channels; intent promotion fail-closed |
| Network snapshot/live | Cross-community AT graph labeled as sample or live |

## Competitive wedge

> Belong to a signed community → talk in community channels → promote work into linked-repo Changes → agents + human review.

Do not replace Discord with forge-only chrome. Do not abandon signed Changes
for pure chat.

## Search And Projection Workbench

Nightboard remains a hierarchical navigator plus detail blade. Search adds
Query, Results, Explain, and History modes inside that composition; Projection
editing adds Definition, Tree Preview, Namespace Diff, Explain, and Validation.
The same action registry owns keyboard, prompt, slash, voice, GraphQL-host, and
MCP entry points. Global search is distinct from current-list filtering, and
explicit local fuzzy filtering never changes the Search Expression.

Every result shows snapshot and source completeness. Saving creates a
Projection Definition, not a copied result list. Mount preview shows scope,
`replace`/`before`/`after` ordering, shadows, stable collisions, and recovery
before mutation. `/.epoch/default` remains reachable when a definition is
invalid. AI is absent from ordinary execution and can only propose a visible
artifact through an explicit action.

See [Community Search And Projections](community-search-projections.md).

## Persona bar (adversarial)

Community Web must pass [adversarial persona critique](community-human-centered-design.md#adversarial-design-critique-protocol).
The Change Graph workbench critique is recorded in the
[package design note](../packages/Epoch.Community.Web/CONVERGENCE-UX-CRITIQUE.md).
The convergence workbench critique is recorded with its implementation in
[`packages/Epoch.Community.Web/CONVERGENCE-UX-CRITIQUE.md`](../packages/Epoch.Community.Web/CONVERGENCE-UX-CRITIQUE.md).
Personas treat **lifeless styling**, **missing craft delight / wonder**, and
**DESIGN.md philosophy drift** as product defects — not taste preferences.

See:

- [community-channels-comparison.md](competition/community-channels-comparison.md)
- [dev-feed-comparison.md](competition/dev-feed-comparison.md)
- [Discord design](competition/products/discord/design/design.md)
- [DESIGN.md](../DESIGN.md)

## Evidence

Features: [`features/community_web_experience.feature`](../features/community_web_experience.feature).  
Browser evidence notes: [`docs/evidence/community-web/README.md`](evidence/community-web/README.md).  
Screenshots: [`docs/evidence/design-screenshots/`](evidence/design-screenshots/README.md).
Navigation/projection parity: [`docs/evidence/community-web-app-navigation-projection-parity/`](evidence/community-web-app-navigation-projection-parity/README.md).

## AI-native rooms (Block Buzz)

Agent membership, in-stream multi-agent work, and receipt-oriented collaboration: see [docs/competition/ai-native-room-concepts.md](competition/ai-native-room-concepts.md) and evidence under [docs/evidence/competition/block-buzz/](evidence/competition/block-buzz/).

## Experience gap scorecard

Competitive dimensions (belong, discover, identity, share, promote, agents-as-members, receipts, honesty, craft, persistence) are tracked in [community-web-experience-gap-scorecard.md](community-web-experience-gap-scorecard.md) and `.optimizexp/competitive/community-web-dimensions.json`. OptimizeXP Community Web runs must update that scorecard — see `skills/optimizexp/references/competitive-coverage.md`.
The convergence workbench adds stable multi-head revision browsing, atomic
split, Review Bundle navigation, dependency-closed partial merge, squash
provenance, stale-review blocking, durable conflict resolution, partial replica
hydration, forge fidelity, sponsored-agent budgets, and public/private archive
decisions. At mobile width and 200% zoom, keyboard tree/list focus identifies
the same selected change and revision without horizontal page overflow.

These views consume canonical Core/Protocol contracts. They do not derive
identity from labels or paths, trust AI proposals before acceptance, describe a
promise as resident data, or claim that an adapter offers a native service it
does not implement. See [Change Graph And Operation History](change-graph.md).
