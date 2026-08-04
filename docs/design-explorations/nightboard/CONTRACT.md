# The Nightboard Contract

The semantic layer every theme styles and no theme may change.

This is what makes the surface a zen garden: markup is fixed and authored once,
themes are CSS alone. A theme that needs a new element, a wrapper, or a changed
attribute is not a theme — it is a fork, and the garden stops working.

## The rule

**Themes may only write CSS.** They may not add markup, scripts, or network
requests. Everything a theme needs to express itself is reachable from the hooks
below, and if something is not reachable, the fix is to extend this contract for
every theme rather than to special-case one.

## Regions

Structural areas, addressed as `[data-region="…"]`. Every region is always
present, so a theme can rely on it existing even when empty.

| Region | Holds |
|---|---|
| `masthead` | Board identity, epoch state, connection state |
| `rail` | Channels, members, linked projects, legend |
| `stream` | The live feed of posts |
| `notice` | Pending-update banner (the "N new" affordance) |
| `detail` | The selected post and its signed actions |
| `composer` | Writing controls |
| `status` | The command line: keyboard hints and live status |

## Components

Addressed as `[data-c="…"]`. Components nest inside regions.

| Component | Meaning | Notable children |
|---|---|---|
| `post` | One thing that happened | `actor`, `meta`, `subject`, `body`, `anchor`, `receipt`, `actions` |
| `actor` | Who did it | `handle`, `role` |
| `meta` | When and in what state | `time`, `state` |
| `subject` | Optional strong line, for posts about an object | — |
| `body` | The message itself | — |
| `anchor` | What it points at (file, run, intent) | — |
| `receipt` | Signature and trust marks | — |
| `action` | A control on a post | — |
| `channel` | A place you can go | `label`, `count`, `unread` |
| `member` | A person or agent | `handle`, `role`, `state` |
| `project` | A linked repository | `label`, `count` |
| `legend` | The key to the inks | `entry`, `swatch`, `label` |
| `control` | A numbered exit (BBS idiom) | `key`, `label` |
| `notice` | Something arrived | `count`, `label` |

## States

Addressed as `[data-state="…"]` on the element it describes. A theme **must**
distinguish these by more than hue, because the contract carries the product's
accessibility commitment.

`open` · `needs-review` · `promoted` · `signed` · `unsigned` · `live` ·
`snapshot` · `unread` · `selected` · `pending`

## Kinds

Addressed as `[data-kind="…"]`, describing what something *is* rather than what
state it is in.

- On `post`: `person` | `agent`
- On `channel`: `social` | `work`
- On `member`: `person` | `agent`

## Token contract

Themes are expected to set these on `:root`. Defaults exist for every one, so a
theme that sets only a handful still renders coherently.

### Surface and ink

```
--nb-bg            page ground
--nb-surface       panel ground, one step from --nb-bg
--nb-ink           default text
--nb-ink-dim       secondary text
--nb-ink-faint     quietest text
--nb-rule          hairlines and box drawing
```

### Signal

```
--nb-accent        the reserved ink: the path from talk to signed work
--nb-accent-ink    text on --nb-accent
--nb-signed        verification and trust marks
--nb-live          healthy, connected
--nb-warn          snapshot, stale, degraded
--nb-danger        destructive and moderation
--nb-agent         agent participation
```

### Form

```
--nb-font          the type stack
--nb-cell          character cell width, the grid this world is built on
--nb-line          line height
--nb-radius        corner radius (0 keeps the terminal square)
--nb-glow          text-shadow for phosphor themes; `none` for flat ones
--nb-scan          background-image for scanlines; `none` for flat ones
--nb-pad           base padding step
```

## What a theme cannot do

- Change or add markup.
- Load fonts, images, or scripts from the network. The page is a single
  self-contained document under a strict CSP, and a theme that needs a CDN is
  not portable.
- Carry state in colour alone.
- Restyle `[data-region="status"]` into invisibility: the command line is how
  the surface is operated by keyboard.

## Authoring a theme with the browser's model

The page can generate a theme in the browser using Chrome's built-in Prompt API
(`LanguageModel`), which runs on-device with no key and no server. The generator
is given this contract as its schema and constrained to emit only token values,
so it cannot produce markup, scripts, or network requests even if asked.

When the API is unavailable the panel says so plainly and falls back to manual
token editing, which reaches exactly the same surface.

## Composing views with OpenUI Lang

The same contract is also an [OpenUI Lang](https://github.com/thesysdev/openui)
component library, so a model can compose views for this board and have them
stream in as they are written.

`build-openui.mjs` defines the library (`Panel`, `Post`, `Notice`, `Channel`,
`Fact`), generates the system prompt from it, and emits the library's JSON
schema. Only the parser ships to the browser — the runtime takes a JSON schema
rather than Zod, so definition and prompt generation stay at build time and the
page carries ~48KB instead of ~649KB.

Two properties matter more than the size:

- **A model can only compose what a theme can style.** The component library is
  this contract, so generated views cannot introduce an element no theme knows
  how to render. Generated and authored views use the same hooks and are themed
  identically.
- **Accountability is not optional.** `Post` requires a supervisor when its kind
  is `agent`, and the renderer prints "supervisor not stated" rather than hiding
  the omission if a model leaves it out.

Where no on-device model exists, `Copy system prompt` gives the generated prompt
for use with any external model, and the returned openui-lang renders in the
same panel.
