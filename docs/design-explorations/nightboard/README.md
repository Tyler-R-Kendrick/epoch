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

## Console

Graph, shell and diff turned out to be three thirds of one thing. The graph
showed lineage, the shell moved fast, the diff read work as work — and all three
navigated badly. They are now one experience on one model:

**The board is a filesystem.** Columns, command line and breadcrumb all address
the same paths, so clicking a folder and typing `cd` are the same operation
rather than two features that happen to agree.

```
/channels/general/003-scout-drafted-a-plan
/members/scout
/projects/civic-tuner/changes/001-scout-change-12
/epochs/13
```

A linked project owns channels of its own — `issues`, `changes`, `releases` —
because the community's rooms are where people are and a project's rooms are
where its work is. Conflating them was why `projects` felt like a dead end.

### Navigation

Miller columns, the way `ranger` and `nnn` work: a column per level, so your
whole path is on screen and "where am I" is never a question.

| | |
|---|---|
| `←→` / `hl` | move between columns |
| `↑↓` / `jk` | move within a column |
| `Enter` | descend, or open |
| `:` | command line |
| `/` or any letter | filter this column as you type |
| `v` | cycle view — graph, diff, raw |
| `Tab` | complete |

Pointer and touch are peers, not fallbacks: every entry, breadcrumb segment and
view chip is a real button, columns swipe with scroll-snap on a phone, and every
control clears the 32px floor wherever the pointer is coarse.

### The input box: CLI or AI

One box, two readings, toggled with the chip at the prompt or `Alt+A`.

**CLI** — the text is a command. Wrong input is an error, which is what a shell
owes you.

**AI** — the text is intent. It goes to an agent that interprets it into tool
calls, and a failed call is **repaired rather than rejected**: the error is fed
back once and the agent chooses again. "take me to the bug reports" lands at
`/channels/bugs` even when the first attempt guesses `/chat/bugz`.

The agent speaks [AG-UI](https://github.com/ag-ui-protocol) — the Agent-User
Interaction Protocol from CopilotKit — so the console is a plain event consumer
and does not know the agent happens to be running on the device rather than on a
server. `RUN_STARTED`, `TOOL_CALL_ARGS`, `TOOL_CALL_RESULT`, `RUN_ERROR` all
appear in the transcript, which is why a failed run is visible instead of silent.

Its tools are the console's own verbs — `navigate`, `view`, `search`, `theme`,
`load`, `say` — so the agent can do nothing you could not do by typing.

**The garden is gone as a panel.** Theming is just another tool: type
*"make everything blue"* and the board restyles, because a separate window for
changing the look was one more place to go for something you should be able to
ask for.

### The prompt has focus

The input is where you are. It holds focus on load and after every action;
`Esc` hands steering to the columns, and `i` or `:` brings it straight back.
Arrow keys take focus to the columns implicitly, so nothing needs remembering.

### The command line

- **Ghost text.** The likeliest completion appears ahead of the cursor; `→` or
  `End` accepts it.
- **Fuzzy, ranked.** `cd cgen` reaches `/channels/general`.
- **Local and global merged**, ranked together, with proximity worth 12 points
  as a tiebreaker rather than a veto.
- **`cd` resolves like completion does.** `cd bugs` and `cd tuner` work from
  anywhere; execution refusing what completion offered made the completion look
  like a liar.
- **Tab discipline**, history on `↑↓`, `cd -`.

### Views

The preview renders the selected directory or entry three ways, and the choice
is navigation state rather than a mode you get stuck in:

- **graph** — lineage as a commit graph; forks open where talk becomes signed
  work and merge at the epoch. Selecting one post shows the whole lineage with
  that node marked, because a one-node graph is not a graph.
- **diff** — every entry as a patch. One representation for talk and code is the
  product's claim stated outright.
- **raw** — plain transcript, for when structure is in the way.

## The garden

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
