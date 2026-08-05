# Nightboard (Epoch)

A live board for a signed community — terminal chrome with **Epoch** branding:
a FIGlet ANSI Shadow wordmark (no border plaque, no secondary tag) that
power-on ignites, then runs a slow energy wave across solid fills (letterforms
stay intact — no ░▒▓ thrash). The top bar is brand + theme + Activity +
identity; no product-name billboard, experience select, pause button, or thesis
prose.

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
| `Alt+J` | Minimise / restore the terminal panel |
| `Alt+M` | Maximise / restore the terminal panel |
| `Alt+D` | Cycle terminal dock: bottom → right → left |
| `Alt+T` | New isolated workspace at default home (not current path) |
| `Alt+Z` / `z` | Collapse / expand nav panes (detail fills width) |
| `Ctrl+Space` | Intellisense + hotkey cheatsheet scoped to this workspace |
| Hold `` ` `` | Push-to-talk speech-to-text (when the browser supports it) |
| `Alt+V` | Toggle continuous dictation (when supported) |

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
/projects/community/channels/general/003-scout-drafted-a-plan
/projects/community/.agents/community-host
/projects/civic-tuner/channels/changes/001-scout-change-12
/projects/civic-tuner/.agents/install-cache
/.agents/space-steward
/dms/scout
/notifications/mentions
/members            ← roll of people/agents; open one → /dms/<handle>
```

Board root lists **projects**, **dms**, **notifications**, and **`.agents`** as
siblings (plus members) — not a second top-level channels tree. Every project
owns `channels/`, **`members/`**, and **`.agents/`**.

### Terminal file editor

When a **file** is selected (agent `instructions.md`, `agent.ts`, skills,
tools, and other text-like leaves), the detail pane is a **browser terminal
editor** — vim/neovim-shaped, with first-class pointer and touch:

| Mode | Keys |
|---|---|
| **NORMAL** | `hjkl` / arrows move · `i`/`a`/`o` insert · `v` visual · `x`/`d` delete · `g`/`G` top/bottom · `w`/`b` word |
| **INSERT** | type freely · `Esc` back to normal · `Enter` newline |
| **VISUAL** | extend selection · `d`/`x` delete · `Esc` clear |

| Pointer / touch | Action |
|---|---|
| Click / tap | Place caret |
| Double-click | Enter insert at point |
| Shift+click or drag | Visual selection |
| Wheel / swipe | Scroll buffer |
| Status line | Mode · path · `Ln:Col` · % |

Buffers stay dirty across re-selection of the same path (`state.editor.buffers`).
Status shows `NORMAL` / `INSERT` / `VISUAL` and `[+]` when modified. The chrome
hints `i insert · Esc normal · v visual · click/tap caret`.

### `.agents` (Vercel Eve)

Eve agents are directories under `.agents/` **and** members of the scope they are
declared in. Opening them from the members roll (or `/dm <id>`) starts a DM —
the same path as chatting with a person.

| Scope | Path | Members roll |
|---|---|---|
| **Board** | `/.agents/<id>/` | `/members` includes board Eve agents |
| **Project** | `/projects/<id>/.agents/<id>/` | `/projects/<id>/members` includes that project's Eve agents |

Agents are **directories of files** ([vercel/eve](https://github.com/vercel/eve)):

| Level | Path | Applies to |
|---|---|---|
| **Board** | `/.agents/<id>/` | The whole space |
| **Project** | `/projects/<id>/.agents/<id>/` | That project only |

Each agent directory looks like:

```
.agents/space-steward/
  instructions.md   # always-on system prompt
  agent.ts          # model / runtime config
  skills/           # markdown playbooks
  tools/            # typed tool stubs
```

Board-level agents (e.g. Space Steward, Activity Relay) apply space-wide and
appear on `/members`. Project-level agents (e.g. Install Cache on civic/tuner)
stay scoped to that repo’s work and appear on that project’s members roll.
Opening an agent directory shows its scope, model, skills, tools, and
instructions; opening the agent as a **member** opens `/dms/<id>` so you can
chat with them.

**Direct messages** are 1:1 threads under `/dms/<handle>`. Opening a **member**
from the board roll or a project roster (or `/dm scout` / `/msg`) lands on that
DM thread, not a profile card.

### Activity (MS Teams-style notifications)

`/notifications` is an Activity feed for:

- **Mentions of you** (`@you` in channels or DMs)
- **Subscriptions** you watch (channels, topics, members, projects)
- **Custom hooks** you subscribe to (app events → Activity + browser alerts)

Filters: `all` · `mentions` · `subscribed` · `hooks`. Unread items badge the
**Activity** control in the bar; open a card (or press Open) to jump to the
source and mark it read. `/notifications` / `/activity` open the feed from the
prompt. Subscriptions live in fixture data (`NB_DATA.subscriptions`).

#### Custom event hooks

Hooks let you subscribe to named app events and broadcast matches through
Activity (and the browser Notification API when granted). Implementation:
`hooks.js` (`NB_HOOKS`).

| Event | When it fires |
|---|---|
| `post.created` | Live stream (or publish) lands a post |
| `mention.you` | Body mentions `@you` or your handle |
| `reaction.added` | You apply an emoji reaction |
| `dm.received` | A DM-shaped payload lands |
| `subscription.matched` | Watched channel/topic/member traffic |
| `identity.changed` | Claim, Bluesky login, or sign-out |
| `space.joined` | You join or switch space |
| `query.matched` | Payload matches the hook’s Lucene/field filter |

Optional `match` filter: empty (all), `field:value` (`channel:bugs`, `who:scout`,
`key:+1`), free text, or a Lucene-style query when `NB_QUERY` is available.

| Prompt | Effect |
|---|---|
| `/hooks` | List hooks (enabled · match · label) |
| `/hooks events` | Event catalog |
| `/hooks add <event> [match]` | Subscribe (notify on) |
| `/hooks rm <id>` | Remove |
| `/hooks on\|off <id>` | Enable / disable |
| `/hooks test [event]` | Fire a sample → `/notifications/hooks` |
| `/hooks open` | Open the Hooks Activity filter |
| `/hooks reset` | Restore fixture defaults |

Defaults ship in `NB_DATA.hooks` (e.g. new posts in `#bugs`, mentions, `+1`
reactions, cache talk). Config and fired items persist in `localStorage`
(`nb-hooks`, `nb-hooks-fired`). Private mode fails soft.

#### Browser Notification API

When the browser exposes `window.Notification`, Activity also pushes OS/browser
alerts:

- **Enable alerts** (bar or Activity header) requests permission from a user
  gesture; `/notifications enable` does the same from the prompt
- Granted sessions deliver unread items that have not yet been pushed, and live
  stream matches (mention / subscription / **hook**) fire as they land
- Clicking a browser notification focuses the tab and opens the source
- Denied / unsupported fail soft — the in-page feed still works
- `/notifications test` sends a sample alert when permission is granted
- `/hooks test` exercises the hook → Activity → browser path end to end

Pushed ids are remembered in `localStorage` (`nb-notif-pushed`) so the tray is
not spammed on every reload.

### Navigation

**One nav blade + one detail blade** — the root nav is **reused and reloaded**,
never cloned into a stack of path-segment columns.

- **Nav** is a navbar for the current path: only that branch’s first-level
  subnodes (plus optional one-level peek via `+` / Space)
- **Enter / →** reloads the same nav into the selected directory
- **← / × / Backspace** reloads nav at the parent (breadcrumb owns depth)
- **Detail** shows the selection (thread, editor, agent, DM, …)
- Tree icons are only **`+` / `−`** (expand/collapse). Leaves keep a blank
  spacer — no dots or arrows. A trailing count is a plain number when a dir
  has children

| | |
|---|---|
| `←` / `h` | reload nav at parent |
| `→` / `l` | reload nav into selected dir; on a text leaf, open detail and **activate the editor** (files, posts/messages) |
| `↑↓` / `jk` | move within the nav list |
| `Enter` | open dir (reload nav) or file/thread detail |
| `Space` | expand / collapse **one level** under the cursor |
| `+` / `−` | same expand / collapse (pointer) |
| `Backspace` / `<<` on nav | back to parent — reload nav |
| `Esc` / `×` on detail / `Backspace` on detail | **close detail pane** (nav fills the row) |
| `:` | command line |
| `/` or any letter | filter the nav list |
| `v` | cycle sort — hot, new, top, best |
| `z` / `Alt+Z` | collapse / expand **nav** (detail fills the row) |
| `Tab` | complete |

#### Collapsible nav

When **detail** has content, the single nav blade can **collapse to a thin rail**:

- **—** on the nav header, or **▭** on detail, collapses nav
- Collapsed rail keeps the current folder title; click expands
- Opening a file/post does **not** auto-collapse — nav stays open so you can keep navigating
- `z` / `Alt+Z` toggles (session-only — never traps you after reload)

Pointer and touch are peers, not fallbacks: every entry, breadcrumb segment and
sort chip is a real button, blades swipe with scroll-snap on a phone, and every
control clears the 32px floor wherever the pointer is coarse.

### The input box: AI or CLI

One box, two readings. **AI is the default**; `Alt+A` or the chip at the prompt
switches.

**Slash commands** — in ai (chat) mode, type `/` for intellisense: `/go`,
`/sort`, `/theme`, `/load`, `/help`, and friends. They run locally like CLI
verbs and never go to the model. Tab completes paths and sort modes the same
way the shell does.

**CLI** — the text is a command. Wrong input is an error, which is what a shell
owes you.

**AI** — the text is intent. It goes to an agent that interprets it into tool
calls, and a failed call is **repaired rather than rejected**: the error is fed
back once and the agent chooses again. "take me to the bug reports" lands at
`/channels/bugs` even when the first attempt guesses `/chat/bugz`.

**AI mode is a superset of CLI, not a replacement.** Anything that is already a
valid command runs directly — sending `cd ..` to a model is slower, less
reliable, and fails outright while the model is still downloading.
Interpretation is for input that needs it.

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

### The model is acquired once

The session is warmed at load and **reused for every turn**. The first version
opened and destroyed one per message, so every message paid the full startup
cost.

Chrome refuses `LanguageModel.create()` without a user gesture while the model
still needs downloading — *"Requires a user gesture when availability is
downloading or downloadable"*. So on a first visit the board says it needs one
fetch and starts on your first keypress or click; on every visit after,
availability reports `available` and it warms with no interaction. The download
itself lives in the browser profile, so it survives reloads.

If warming fails, the status line names the reason and the board drops to CLI
mode rather than leaving AI on and silently broken.

**Testing note.** Playwright's bundled Chromium ships a *placeholder*
`LanguageModel`: `create()` resolves, `downloadprogress` fires, and `prompt()`
returns "On-device model is not available in Chromium, this API is just a
placeholder". Every AI-mode result in the fault suite is therefore against an
injected mock, and real behaviour needs Chrome with the model present.

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
- **Smart markers** mid-input, Discord/Slack style:
  - `@` mentions people and agents on the board (`@maya`, `@scout`)
  - `#` tags trending topics and channel short-names (`#draft-persistence`,
    `#bugs`)
  - Tab / Enter accepts (with a trailing space); a fully typed token sends as
    written. Markers are extensible in `complete.js` (`MARKER_SPECS`).
- **Speech-to-text** when the browser exposes `SpeechRecognition` /
  `webkitSpeechRecognition` (otherwise the mic and hotkeys are absent):
  - Mic control uses the **16-bit iconography pack** (`icons.js` /
    [pixelarticons](https://pixelarticons.com) `mic`, 16×16 pixelated)
  - **Hold `` ` ``** — Discord-style push-to-talk; listen while held, commit on
    release
  - **Alt+V** — toggle continuous dictation (voice-activity analogue)
  - **Esc** or the mic button — stop; permission denials fail soft
- **Arrows belong to the menu when it is open.** `↑↓` walk the candidates and
  `Enter` accepts the highlighted one; they only mean history when there is
  nothing to choose between.
- **Tab discipline**, `cd -`, and `..` completes.

## The GraphQL API

Everything queryable sits behind one schema — channels, posts, members,
projects, dms — so the agent asks the data what exists instead of being told
in a prompt that drifts from it.

```graphql
{ posts(state: "needs-review") { path author { handle } } }
{ member(handle: "scout") { role detail posts { subject } } }
{ project(slug: "civic-tuner") { channels { name posts { subject } } } }
{ dms { peer kind unread messages { body path } } }
{ dm(peer: "scout") { path messageCount member { role } } }
{ listPath(path: "/dms") { name kind hint } }
```

It is graphql-js rather than a hand-rolled resolver: 178KB buys real validation
(`Cannot query field "nope" on type "Query"`, with positions) and introspection.
Introspection is the point — a schema that describes itself cannot go stale the
way a hand-written tool list does, and the agent can ask for it with
`graph_schema` before writing a query.

## WebMCP tools

Every capability the surface has is registered as a
[WebMCP](https://github.com/webmachinelearning/webmcp) tool through
`document.modelContext.registerTool`:

`board_navigate` · `board_list` · `board_where` · `view_set` · `sort_set` · `stream_load` ·
`stream_pause` · `theme_set` · `theme_use` · `graph_query` · `graph_schema` ·
`fx_asciify`

WebMCP is a W3C proposal and is not shipping in any browser, so the page
registers against the native object when it exists and against an identical
local registry when it does not — same descriptors, same call shape, same
results. A browser agent picks up the native ones; the chat here uses the
registry. Neither knows which it got.

**Every tool calls the console's own verb.** A tool that reimplements what a
button does is a second implementation to keep in sync; these share one, so if
the button breaks the tool breaks with it, which is correct.

**The chat's vocabulary is the registry.** Nothing is hand-listed in the agent:
a component that registers a tool becomes usable by chat immediately, and one
that stops registering disappears from the agent's vocabulary in the same
motion. Asking *"what needs review?"* runs a GraphQL query; *"sort by new"*
calls `sort_set`; *"make everything blue"* calls `theme_set` — all through the
same registry a browser agent would use.

### Thread tree

The preview is always a **comment tree** (Reddit grammar). Sort changes order,
not costume:

- **Nest rails** — one vertical bar per ancestor depth. Click a bar (or `−`/`+`)
  to collapse that chain and everything under it.
- **Votes** — upvote / downvote on every comment; score is local to the session.
- **Reactions** — GitHub/Slack-style emoji pills on every comment: `+1`, `-1`,
  `eyes`, `rocket`, `heart`, `laugh`, `hooray`, `thinking`. Click a pill to
  toggle yours; **+** opens the picker. Fixture posts ship seed counts; your
  reactions persist with page state.
- **Reply** — arms the prompt as `reply to @handle: …`.
- **Feed views (Lucene-style)** — more robust than thumbs-up ranking alone.
  Named projections (`hot`, `needs review`, `agents`, `signed`, `reacted`, …)
  and a free-form query bar:

  ```
  state:needs-review
  who:maya AND has:anchor
  kind:agent -state:signed sort:new
  body:cache OR react:+1 sort:top
  "cold install"
  ```

  Fields: `who` `state` `channel` `subject` `body` `kind` `has` `react`
  `score` `sort`. Boolean: `AND` (default), `OR`, `NOT`/`-`, groups `(…)`.
  `/view <query>` or `/q` from the prompt; `?` on the feed bar prints help.
  Matching keeps parent posts so threads stay coherent.
- **Share** — copies a `nightboard:` link for the current place.

## Drawing with characters

The retro-futurism is earned by **drawing with characters**, not by wearing a CRT
filter. Everything `ascii.js` renders encodes something the board actually knows,
so if the reading goes the glyphs go with it:

- **Channel sparklines** (`▁▂▄█`) — when the conversation in a channel happened,
  bucketed, so a column tells you where activity is before you read a name. A
  channel with fewer than four posts, or one whose line comes out flat, draws
  nothing: a bar that cannot vary is a badge pretending to be a chart.
- **The epoch gauge** (`[█████████···]`) — how much of the epoch has landed,
  on the cold-start banner and status readings.
- **Receipt sigils** (`⡽⠸⢛⠀`) — the signature folded into four braille cells.
  A hash is unreadable and a checkmark says nothing; a mark gives a receipt a
  *shape*, so two that differ look different. Braille rather than shade blocks
  because a dotted cell reads as a code where a shaded one reads as a rendering
  fault.
- **Diff rules and transcript branches** (`── @@ 09:05 @@ … ─────`, `└─`) —
  structure drawn the way a terminal draws it.
- **The cold-start banner** — stated once at boot, and every line in it is a fact
  the board can assert: its name, the epoch, and how many tools really
  registered.

It is all plain text in the DOM, so it themes with the tokens, copies as text,
and costs nothing.

### Markdown + colour-coded tables

Transcript and post bodies go through `NB_ASCII.formatBody`:

- **Markdown subset** — headings, lists, quotes, fenced code, `**bold**` /
  `*em*` / `` `code` ``, `@mentions`, `#topics`, links, and pipe tables
- **Tables** render as **box-drawn ASCII** (`┌─┬─┐`) with colour classes:
  header ink uses accent, rules are faint, cells follow body/dim tokens
- **Plain multi-line ASCII** still colourises box edges, block gauges, and
  braille sigils so banners and gauges stay readable without full markdown

Themes style via `.nb-md-*` classes (no hard-coded colours). `/spaces` prints a
markdown table of relays so the transcript exercises the path.

### Attachments (file upload for chat context)

The prompt accepts **files as chat context** — same idea as attaching a file in
a messaging app before you send:

| How | What happens |
|---|---|
| **Paperclip** (`+` / count) | Opens the system file picker (multi-select) |
| **Drag & drop** | Drop onto the terminal / prompt region |
| **Paste** | Paste an image or file while the prompt is focused |
| `/attach` | `open` · `list` · `clear` from the prompt |

Staged files show as chips above the input (remove one with ×, or **clear**).
On send (AI, CLI, or slash), attachments:

1. Appear on the user transcript line as chips
2. Are inlined into agent context as a terminal-honest block (`[attachments…]`)
   — **text** files include content (capped), **images** note type/size (+ small
   preview thumb in the tray), **binaries** contribute name/type only

Limits (exploration): max **8** files, **2 MiB** read per file, **32k** chars of
text inlined. Oversized files still stage as name-only chips with an error mark.
Nothing is uploaded to a server — reads stay in the page.

API: `NB_ATTACH` (`readFiles`, `composeInput`, `formatContext`) and
`NB_APP.addAttachmentFiles` / `clearAttachments`.

### Link preview cards (ASCII / terminal)

Links in post bodies and transcript lines unfurl into a **reusable ASCII preview
card** — generated summary, box-drawn frame, themeable classes. No network
fetch: the exploration builds a deterministic summary from the URL (plus a small
catalog for well-known docs/repos).

```
┌─ █ REPO · GitHub ─────────────────────┐
│ AG-UI Protocol                        │
│ Agent–User Interaction Protocol for   │
│ in-browser agents and tools.          │
│ github.com/ag-ui-protocol             │
└───────────────────────────────────────┘
```

API (`NB_ASCII`):

| Call | Result |
|---|---|
| `linkPreview(url)` | HTML `<article class="nb-link-preview">` card |
| `linkPreview(url, { asHtml: false })` | Plain ASCII frame |
| `summarizeLink(url)` | `{ title, description, site, kind, … }` |
| `extractLinks(text)` | Unique safe links from markdown + bare URLs |
| `formatBody(text)` | Body HTML **plus** preview cards for every link |

Kinds: `repo` · `docs` · `board` · `identity` · `relay` · `link`. Board paths
(`/projects/…`, `nightboard:…`) navigate in-app via `data-goto`; external
`https://` opens in a new tab. Scout’s cache plan post in `#general` carries
sample links so the cards show up without typing.

### The canvas lens (optional)

`fx_asciify` wraps [CanvasUI](https://canvasui.dev)'s `asciify`, which redraws
the whole surface as live ASCII in a radius around the cursor while the HTML
underneath stays interactive. It needs HTML-in-canvas (`<canvas layoutsubtree>`),
which is flag-gated — `--enable-blink-features=CanvasDrawElement` in Chromium and
absent elsewhere. So it is off by default, capability-checked before it mounts,
and **reports failure rather than returning ok for an effect that did nothing**;
a fault case holds that line. Turning it off puts the DOM back exactly where it
was.

Unlike the glyphs above, the lens carries no information — which is why it has to
be asked for.

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

## Rendering is morphing, not replacing

Every state change used to redraw the board with `innerHTML`. That is the
cheapest thing to write and the most expensive thing to ship: every node died
on every live tick, so scroll positions reset, hover states vanished, the input
needed a caret-restoration dance, and no animation could ever be seen running —
a restarted animation is an invisible one. The nine-second stream tick made the
whole surface glitch on schedule.

`morph.js` replaces that with keyed DOM morphing: the renderer still produces
one HTML string, but it is diffed against the live tree and only what differs
is touched. Posts are keyed by id and listings by name, so a post arriving is
*one inserted node* — which is what makes its arrival animation possible — and
everything else is left alone. Events are delegated once at boot (with
persistent nodes, per-render listeners would stack), focus never scrolls the
frame (`preventScroll`, everywhere), and selection scrolling moves only the
column's own pane, never the page.

Motion follows one rule: it exists only where it carries meaning — a post
arriving, the marked node breathing once after a jump — sits behind
`prefers-reduced-motion`, and nothing animates forever. The fault suite holds
the load-bearing properties: a live tick keeps the surface, the caret and the
animation; a new post animates in while the rest of the board does not.

One coherent responsive strategy: three miller columns at desk width, listing
plus preview at mid width, and swipe pages with scroll-snap on a phone. The
frame itself never scrolls as a page — every scrolling surface is a named pane.

## Durable page state, profile, and spaces

Page state is durable across reloads. The **Profile** button defaults to
**Anonymous** in the home Slack-style **space** (workspace). Anonymous sessions
are fine when the space allows guests.

| Auth state | Meaning |
|---|---|
| `guest` | Anonymous principal in a guest-friendly space |
| `claimed` | Signed in to a space with a local handle (same principal kept) |
| `atproto` | Signed in via Bluesky-style ATProto (handle → mock `did:plc`) |
| `denied` | Space or policy requires sign-in — read-only until Profile → Sign in |

### Spaces = Relays + Workspaces + Subreddits

A **space** is three familiar things in one joinable unit:

| Lens | Feels like | What you get |
|---|---|---|
| **Relay** | Block/Buzz · Nostr | Event endpoint (`wss://…`), protocol, connected/idle, read/write |
| **Workspace** | Slack | Membership, guests vs members-only, channels, linked projects |
| **Subreddit** | Reddit | `r/…` slug, subscribers, rules, topical **feed** |

Fixture spaces:

| Space | Guests | Relay | Role |
|---|---|---|---|
| EPOCH CIVIC WORKSHOP (`r/civic-workshop`) | yes | connected | Home community |
| Agent Lab (`r/agent-lab`) | yes | connected | Humans + agents |
| Tuner Crew (`r/tuner-crew`) | no | idle until sign-in | Private crew + projects |

Browse at `/spaces`, open a hub (`/spaces/agent-lab`) for **feed / channels / projects / relay / about**. Profile menu joins a space and (mock) connects its relay. `/space agent-lab` joins; members-only spaces open sign-in. `/spaces` lists relays + sub counts.

Board furniture is snapshotted under `nb-board-state` for the same principal.
Slash surface also includes `/whoami`, `/logout`.

## The furniture

Polish that had been missing, each piece done the terminal way:

- **Scrollbars take the theme's ink** — thin, square, trackless, on both
  engines. A scrollbar is a position marker, not a component.
- **Panes resize; nav collapses to rails.** The terminal sash is the pane's own
  control: drag resizes (pointer events — mouse, touch and pen are one path),
  double-click or Enter collapses and reopens, arrow keys nudge. Nav list blades
  collapse to thin path **rails** (`z` / `Alt+Z`, or — / ▭ on the header) so
  detail can claim the width when you choose to read full-width. Rails stay
  clickable; opening a post does not auto-collapse — nav stays open for further
  navigation. Collapse is session-only so a reload never traps you. Terminal
  dock layout still persists as furniture.
- **The terminal is a VS Code panel.** Workspace tabs, sash, dock / maximise /
  minimise actions. Drag the sash to resize height (bottom dock) or width
  (side dock). `Alt+J` minimises, `Alt+M` maximises, `Alt+D` cycles dock
  position through bottom → right → left. `Alt+T` (or `+`) opens a new
  terminal tab — an **isolated virtual worktree** with its own path, preview,
  folds, transcript, history, detail pane and attachments. New tabs land at
  the default home channel; they never inherit the previous tab’s scope.
  Click a tab to restore a minimised panel or switch workspaces. Side docks
  fall back to bottom under mid width so a phone never carries two thin
  vertical strips.
- **Transcript identity is a who-rail.** `you` and `agent` share a fixed left
  column so turns line up; system output sits under an empty rail. Tool calls
  and supplemental detail collapse by default under the agent (`▸ navigate ·
  path`) and expand on click — the one-line summary stays honest when closed.
- **Conversations are Reddit-style trees.** `re:` names the parent; replies nest
  under what they answer with clickable nest rails and `±` fold controls.
  Votes and reply sit on every comment. Sort is hot/new/top/best, not a view
  costume.
- **A channel shows what it is before what it contains**: name, kind, post
  count, unread, its activity sparkline and last word, as one line of facts
  above the conversation — both when selecting it from `/channels` and while
  standing inside it.

Panes and folds are deliberately *not* WebMCP tools: they are furniture around
the board, not capabilities of it. The registry stays the set of things an
agent can truthfully do to the board's content.

## Enforced, not asserted

`test/unit/nightboard-themes.test.ts` runs in `npm test` and holds every theme
to the contract: themes, unique ids, no external resources, body ink at 7:1
and dim ink at 4.5:1 against their own ground, and the reserved accent
distinguishable from every state ink. It also exercises durable guest identity,
claim continuity, ATProto mock login, and board-state round-trip from
`session.js`.

It earned its place immediately. Two themes shipped below the floor — Breadbin
at 6.0:1 and Solar Night at 5.6:1 — and IBM CGA used one magenta for accent,
warn and danger, which made its legend impossible to read truthfully. All three
were found by the test rather than by looking.

## Fixtures

Every person, channel and post is fictional, and `incoming` is a scripted
sequence rather than activity. `PRODUCT.md` records that this product has no
real users, no analytics and no production deployment, so nothing here implies
otherwise.
