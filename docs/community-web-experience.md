# Community Web Experience

Community Web is to Epoch what GitHub is to Git: the community experience
built on the Epoch DVCS. It is the central place where people follow the work
of others, maintainers manage the contributions to their own projects, and
communities engage together — replacing the scatter of Discord, Slack, X,
Reddit, and Stack Overflow around today's forges. Epoch's native primitives —
signed intents, anchors, epochs, verified identity, and policy-bound agents —
surface as first-class product concepts inside the flow of community
conversation, the way Git's branches and merges became GitHub's branches and
pull requests. Participants include professional developers, citizen builders
building in the open, and agents contributing concurrently under human
oversight; the defining artifact is the epoch, a point-in-time materialization
of the project the community built, credited to everyone who took part.

Community Web is a **community-first** social coding surface inspired by Discord’s server model, with Epoch trust and ATProto network discovery.

## Canonical app shell

Nightboard is the only Community Web runtime. The CanvasUI-powered creator
landing is `/`; its Enter action opens the tmux-style, keyboard-first board at
`/board.html`. `npm run dev:community-web` and the Vercel static build both serve
these same files. The former Civic Workshop document renderer remains a library
compatibility surface only and is not locally served or deployed.

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

Selecting a message on a work channel still opens the signed action tray (intent, agent, report, …).

### Power-user controls

Nightboard treats the channel as a terminal-style work surface without making
the feed mouse-only. The prompt hands focus to one roving message article;
`j`/`k`, arrows, Home/End, and Enter move or open it while focus, selection,
and the current thread stay aligned.

Users can save a deterministic action with
`macro set <name> = <command>; <command>` (or the `skill` alias), bind an exact
spoken phrase with `macro voice <name> = <phrase>`, and run it with
`macro run <name>`. Each saved action automatically registers as a
`user_<name>` WebMCP tool, so prompt, agent, and voice use one definition.
Actions may compose only Nightboard's registered commands; arbitrary script or
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

> Belong to a signed community → talk in community channels → promote work into linked-repo intents → agents + human review.

Do not replace Discord with forge-only chrome. Do not abandon signed intents for pure chat.

## Persona bar (adversarial)

Community Web must pass [adversarial persona critique](community-human-centered-design.md#adversarial-design-critique-protocol).
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

## AI-native rooms (Block Buzz)

Agent membership, in-stream multi-agent work, and receipt-oriented collaboration: see [docs/competition/ai-native-room-concepts.md](competition/ai-native-room-concepts.md) and evidence under [docs/evidence/competition/block-buzz/](evidence/competition/block-buzz/).

## Experience gap scorecard

Competitive dimensions (belong, discover, identity, share, promote, agents-as-members, receipts, honesty, craft, persistence) are tracked in [community-web-experience-gap-scorecard.md](community-web-experience-gap-scorecard.md) and `.optimizexp/competitive/community-web-dimensions.json`. OptimizeXP Community Web runs must update that scorecard — see `skills/optimizexp/references/competitive-coverage.md`.
