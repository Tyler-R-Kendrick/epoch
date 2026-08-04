# Nightboard

A live board for a signed community, and a zen garden for theming it.

Open `index.html` from any static server. Nothing here needs a build step or a
network connection.

```
python3 -m http.server 8902 --directory docs/design-explorations/nightboard
```

## What it is

The Nightboard direction from the ten explorations, built for real rather than
mocked: a character-grid terminal board where everything is a text screen with
numbered exits, presence is scarce enough to be an event, and the whole surface
is operable from the keyboard.

It is a **dev community default**. The vocabulary — channels, receipts, signed
intents, agent runs under a named supervisor — is the product's, and the form is
the one that community already reads fluently.

## Live, in the way that matters

New posts arrive but never move the ground under you. They queue, a notice says
how many are waiting, and they merge only when you ask:

```
[ 3 ] new posts — press R to load
```

If you were already at the tail, merging follows the tail. If you were reading
something further up, you stay exactly where you were. A feed that reflows while
you are mid-sentence is the thing this pattern exists to prevent, and it is the
reason the notice is a queue rather than a courtesy.

Posts arriving in a channel you are not reading raise that channel's unread
count instead of interrupting.

## Operating it

| Key | Does |
|---|---|
| `R` | Load queued posts |
| `J` / `K` or arrows | Move through the stream |
| `1`–`9` | Open a post by its number |
| `Esc` | Close the detail panel |
| `T` | Next theme |
| `G` | Open the garden |
| `?` | Key help |

Everything is clickable too: channels, members, projects, posts, and the signed
actions on each post.

The semantic surface every theme styles is [CONTRACT.md](CONTRACT.md).

## Ten experiences, not ten skins

The previous version was one shell in ten palettes — same rail, same stream,
same keys — and calling that ten designs was wrong. An experience now owns its
own markup **and its own navigation**; what it inherits is the vocabulary
(`CONTRACT.md`) and the tokens, so themes still apply across all of them.

| # | Experience | What leads | How you move |
|---|---|---|---|
| 1 | **Graph** | A commit graph; forks open when talk becomes work | walk nodes and lanes |
| 2 | **Scrub** | A time axis with a playhead | drag time |
| 3 | **Esper** | One artefact, full bleed | descend through depth |
| 4 | **Rain** | Every channel as a falling column | pick a column |
| 5 | **Panes** | A multiplexer workspace | split and focus |
| 6 | **Sweep** | A radar: bearing is channel, radius is recency | rotate a bearing |
| 7 | **Tape** | One horizontal strip of the whole day | scrub laterally |
| 8 | **Shell** | The board mounted as a filesystem | `cd`, `ls`, `cat`, `tail -f` |
| 9 | **Diff** | Every post as a patch | step hunks |
| 10 | **Orbit** | Members as bodies around the epoch | traverse the system |

Switch with the picker or `[` / `]`. Themes and experiences are independent:
any of the ten themes applies to any of the ten experiences.

`Graph` draws its spine rather than typing it — box-drawing characters cannot
connect across rows of different heights, and a column of unjoined dots reads as
a bulleted list, which is the one thing that design must not look like.

`Esper` uses a real atmosphere plate generated with the **higgsfield CLI**
(`flux_2`), downsampled from 1.3MB to 4KB. It is the only raster in the set:
depth-of-field haze is the one thing CSS cannot fake convincingly, and
everything else is cheaper and sharper drawn.

## The garden

### Generating one

Describe a theme and it **streams in through OpenUI Lang**, on device, via
Chrome's built-in Prompt API. No key, no server, nothing leaves the page.

Colours apply **as they arrive**. Every field is optional and a partial answer
layers over the current theme, so a truncated or half-understood response still
produces something usable instead of nothing. `Export to DESIGN.md` writes the
live tokens back out as frontmatter.

#### Assume it fails

The first version assumed a session opens, a prompt returns, and output parses.
All three are optimistic, and when any failed the panel just sat there looking
idle — which is the worst outcome, because you cannot tell *thinking* from
*broken*.

- **Streaming everywhere.** Both panels use `promptStreaming`, and both hand the
  parser a true delta rather than the transcript so far.
- **The download talks.** `downloadprogress` can fire rarely or not at all until
  it completes, so a heartbeat reports elapsed time alongside it and says why
  the wait is silent. Percentages are normalised because `loaded` has shipped as
  both 0–1 and 0–100.
- **Transient faults retry** with backoff — eviction, quota, busy sessions. A
  malformed answer does not retry: it would produce the same answer and waste
  your battery.
- **A stall watchdog** reports after 25s of no tokens, because a hung stream
  otherwise looks exactly like a slow one, forever.
- **Cancel** aborts the session mid-stream.
- **Failures say what the model actually said**, truncated, rather than a bare
  "failed".

Run the fault suite — it injects a mock model to make each of these actually
happen, because resilience that has never been made to fail is a claim:

```
npm run nightboard:faults
```

It covers: a silent download, a 0–100 progress scale, a transient failure that
retries and succeeds, a permanent failure, a truncated stream, a whole-text
stream that must not double, multi-chunk delta streaming, cancellation, and an
unavailable model.

That last-but-two case exists because it caught a real bug: I was feeding the
streaming parser the accumulated transcript instead of the next chunk, so
anything arriving in more than one chunk produced nothing at all. Single-chunk
tests passed and hid it — which is exactly the shape of the failure reported
against the first version.

## Composing views — OpenUI Lang

[OpenUI Lang](https://github.com/thesysdev/openui) (`thesysdev/openui`) is a
streaming-first DSL for model-generated UI. The garden's second panel uses it:
describe a view, and it streams in as the model writes it.

The parser yields a usable tree at **every chunk**, with `partial` marking the
element still being written, which is what makes it appear progressively rather
than arriving as a finished blob.

`build-openui.mjs` defines the component library — which *is* the Nightboard
contract — generates the system prompt from it, and emits the library JSON
schema. Only the parser ships: the runtime takes a JSON schema rather than Zod,
so the page carries **48KB instead of 649KB**. lang-core imports Zod at module
top level, so the build aliases it to a stub that throws rather than no-ops; if
a future version does reach Zod at runtime, it fails loudly instead of
misbehaving quietly.

Two properties matter more than the size:

- **A model can only compose what a theme can style.** Generated views use the
  same semantic hooks as authored ones, so every theme styles them for free and
  no model can introduce an element the garden cannot render.
- **Accountability is not optional.** `Post` requires a supervisor when its kind
  is `agent`; if a model omits it the renderer prints "supervisor not stated"
  rather than hiding the gap.

Without an on-device model, **Copy system prompt** gives the generated prompt for
any external model, and pasted openui-lang renders in the same panel.

Rebuild after changing the library:

```
node docs/design-explorations/nightboard/build-openui.mjs
```

## Enforced, not asserted

`test/unit/nightboard-themes.test.ts` runs in `npm test` and holds every theme
to the contract: ten themes, unique ids, no external resources, body ink at 7:1
and dim ink at 4.5:1 against their own ground, and the reserved accent
distinguishable from every state ink.

It earned its place immediately. Two themes shipped below the floor — Breadbin
at 6.0:1 and Solar Night at 5.6:1 — and IBM CGA used one magenta for accent,
warn and danger, which made its legend impossible to read truthfully. All three
were found by the test rather than by looking.

## Fixtures

Every person, channel and post is fictional, and `incoming` is a scripted
sequence rather than activity. `PRODUCT.md` records that this product has no
real users, no analytics and no production deployment, so nothing here implies
otherwise.
