# Community Web (Epoch)

**Canonical Epoch Community Web app** ([ADR-0027](../design-decisions/0027-community-visual-world.md)).
Stable object/projection/navigation semantics are defined by
[ADR-0029](../design-decisions/0029-community-canonical-objects-and-projections.md)
and [ADR-0042](../design-decisions/0042-deterministic-search-and-mounted-projections.md),
with the [semantic contract](CONTRACT.md).
Root [`DESIGN.md`](../../DESIGN.md) is derived from this source tree. Impeccable
iterates on these shipped files; there is no separate legacy UI or parity target.
Surface brief: [`.impeccable-surface.md`](../../packages/Epoch.Community.Web/.impeccable-surface.md) (Operate board).
Marketing landing brief: [`.impeccable-surface-landing.md`](../../packages/Epoch.Community.Web/.impeccable-surface-landing.md).
Persuade craft runbook: [`ORCHESTRATION.md`](ORCHESTRATION.md) · live scoreboard [`progress.html`](../../packages/Epoch.Community.Web/app/progress.html).

A live board for a signed community — terminal chrome with **Epoch** branding:
a FIGlet ANSI Shadow wordmark (no border plaque, no secondary tag) that
power-on ignites, then runs a slow energy wave across solid fills (letterforms
stay intact — no ░▒▓ thrash). Behind the masthead, a canvas Tron grid-road
shimmers in place; click empty bar chrome (or focus the canvas and press
Enter/Space) to toggle restrained forward motion — off until asked.
Controls read as a TTY — `[hot]` brackets and reverse-video selection, not
rounded web pills — including sort/filter chips, Activity filters, and
masthead actions. The top bar is brand + Activity + identity — Grid is the
fixed look (no theme dropdown); no product-name billboard, experience select,
pause button, or thesis prose.

**Default entry is the marketing landing** (`index.html`): Persuade copy that
explains Epoch Community as the place developers collaborate, promote their
work, and get paid as creators — then a CTA into the Operate TUI at
`board.html`. Clicking the Epoch brand on the board returns to the landing;
`[Enter the board]` enters the TUI. In-board Following home is still Esc /
`goHome`, not the logo.

Open `/` from any static server. The landing ships prebuilt Canvas UI bundles
(`canvasui-fx.js`); rebuild after upgrading components:

```
node packages/Epoch.Community.Web/scripts/build-canvasui-landing.mjs
npm run dev:community-web
# Landing:  http://127.0.0.1:8787/
# Board:    http://127.0.0.1:8787/board.html
```

Persuade landing wires Canvas UI decrypt (hero brand + E01 What body) /
hero+theater glitch / VHS
([decrypt/reveal](https://canvasui.dev/docs/components/decrypt-reveal) on E01
decodes the product thesis when that chapter enters).
(`landing-fx.js`). Html-in-canvas effects need Chrome’s flag or origin trial and
fail soft; terminal chapter flashes work without it.

### The CRT tube

The landing renders inside a CRT. The scene canvas draws to an offscreen 2D
buffer and the display canvas is a single-pass tube shader — `crt.js`, installing
`window.CW_CRT` — layering barrel geometry, radial aberration, phosphor
halation, scanlines, an aperture grille, gain, a rolling refresh bar, glass
sheen, vignette, flicker, grain, and a lit room behind the glass. The look lives
in one `TERMINAL` preset; scan count and grille pitch derive from **CSS** pixels
so the raster follows the screen rather than the framebuffer.

Every time-driven term is gated on `uMotion`, so `prefers-reduced-motion` gets
the tube **held still** rather than removed. Where WebGL is unavailable the pass
returns `null`, the scene draws straight to 2D, and the CSS overlay stack
(`.cw-crt-scan`, `.cw-crt-phosphor`, `.cw-crt-bloom`, …) remains the fallback
tube; under `[data-crt-pass="webgl"]` those layers step back so they do not
double the shader.

Copy stays real DOM, so the shader never rasters it. `.cw-crt-face` is the one
static tube layer above the copy, multiplying the same triad pitch and scanline
beat over everything inside the bezel so the page reads as one screen. It costs
the lede **11.5:1 → 8.95:1** against the contract’s 7:1 floor, which is why its
strength is capped by assertion — see
[ADR-0061](../design-decisions/0061-crt-tube-pass.md).

The tube also has a life cycle. It **strikes** on first paint (the raster opens
from a hot filament over ~1.15s, and the copy arrives with the picture rather
than floating over a half-open screen), **degausses** when a chapter lands (a
decaying ripple and aberration surge), and **powers down** on the way into the
board (the raster collapses, the lamp drops to standby, then the browser
navigates — capped at 420ms, with a timer guaranteeing arrival even if frames
stop). Motion carries **phosphor persistence**: the scene composites into a
decaying buffer that the tube samples, so bright things trail. All of it is
gated on reduced motion, which gets a tube already struck and perfectly still.

## What it is

The Community Web direction from the ten explorations, built for real rather than
mocked: a character-grid terminal board where everything is a text screen with
numbered exits, presence is scarce enough to be an event, and the whole surface
is operable from the keyboard.

It is a **dev community default**. The vocabulary — channels, receipts, signed
Changes, agent runs under a named supervisor — is the product's, and the form is
the one that community already reads fluently.

## The workspace region

The board is an Epoch participant. On load `workspace.js` opens a local Epoch
workspace, ensures the default `.epoch` project — the project that owns the
interface this browser renders — and fills the static harness region from that
project's head revision.

The region is markup this page ships:

| Slot | Where | Accepts |
|---|---|---|
| `shell.workspace-status` | status footer | status components (max 3) |
| `board.context-panel` | harness region | panel or status components (max 4) |
| `board.recovery` | harness region | the recovery controls (max 1) |

A dynamic revision may place allowlisted components into those slots and set
allowlisted theme tokens. It cannot add a slot, move the region, restyle it,
register a tool, or run code: the vocabulary it is parsed into cannot express
any of that. When the head revision fails validation the harness renders itself,
says why, and keeps the recovery controls exactly where they always are.

### Storage and identity

The workspace lives in IndexedDB, read once into memory at open and persisted
through a write queue. `CW_WORKSPACE.storage()` reports the store kind, schema
version, how many entries were migrated from the old `localStorage` workspace,
pending writes, and the last persistence error; `flush()` waits for the queue and
`export()` returns the whole namespace for handoff. Each device holds a
non-extractable WebCrypto key and a stable `did:epoch:` actor derived from its
public half.

### Composing

`Compose interface` in the workspace region opens the compose panel: a prompt
box, a streaming OpenUI preview, the openui-lang source, and the theme garden —
generation, manual token editing, contrast checking, and DESIGN.md export.
`Propose to my interface` records what is there as a revision on the `compose`
proposal view and shows the semantic diff; `Accept this change` merges it.
Discarding leaves the proposal in the ledger, because deciding against something
is part of an interface's history.

The workspace commands are also registered as WebMCP tools, so a browser agent
reads and proposes against the same workspace the page renders — and is refused
the same way at the same boundary. `CW_APP.toolStatus()` reports what the
browser actually accepted rather than what the page attempted.

`window.CW_WORKSPACE` exposes `start`, `execute`, `status`, `project`, and
`harness` for the console and the page's own agent. Every mutation goes through
the shared command bus, so the receipt the board shows is the receipt
`epoch ui …` prints.


## Live, in the way that matters

New posts arrive but never move the ground under you. They queue for the
**open channel or space feed**, a sticky notice in that feed says how many are
waiting, and they merge only when you ask (`R` or the notice):

```
[ 3 ] new posts — press R to load
```

Leave the feed (thread, another channel, home) and the notice hides with it —
the queue stays keyed to that feed until you return and load. It is not page
chrome.

If you were already at the tail, merging follows the tail. If you were reading
something further up, you stay exactly where you were. A feed that reflows while
you are mid-sentence is the thing this pattern exists to prevent, and it is the
reason the notice is a queue rather than a courtesy.

Posts arriving in a channel you are not reading raise that channel's unread
count instead of interrupting.

## Operating it

Default chords below are the **epoch** loadout. Edit `/keymap.toml` in the VFS
(or run `keymap use <id>`) to swap loadouts:
`vim`, `yazi`, `emacs` (C-n/p/f/b · C-g cancel · M-x prompt), and
`lazygit` (j/k · `/` filter · `x` discard · `c` compose · `y` yank).
Active loadout persists locally; leaving a dirty keymap.toml buffer applies it.

| Key | Does |
|---|---|
| `R` / `r` | Load queued posts for the open feed |
| `J` / `K` or arrows | Move through the focused surface — VFS list when the navigator owns focus, or the message list when the detail feed owns focus |
| `→` / `←` on the **navigator** | Enter the selected directory/channel, or return to the parent VFS scope (first `←` from messages returns to the navigator) |
| `→` / `←` on a **focused message** | In a thread: the right margin cues replies — `→` expands or opens the first child. The left branch margin expands/collapses that chain on click; `←` collapses an open chain, then walks to the parent / channel feed / navigator. From the channel feed, `→` / Enter opens the thread. Message-ID directories stay on `cd`, not on arrows |
| `u` / `d` on a message | Upvote / downvote (epoch); vim / yazi / emacs / lazygit use `+` / `-` |
| `a` / `f` on a message | Open reactions / fold its reply chain |
| `r` / `Shift+R` on a message | Reply / repost |
| `s` / `y` on a message | Share an HTTPS contextual link / copy the optimized thread |
| `PageUp` / `PageDown` | Page within a tall message first, then jump to the previous / next message |
| `Home` / `End` | First / last visible message |
| `1`–`9` | Open a post by its number |
| `Esc` | Home feed (or leave columns for the prompt) |
| `Tab` / `Shift+Tab` | Yield between the last board context (navigator / message) and the prompt. Message and nav use one roving tab stop each — arrows and chords operate inside them. Completion uses arrows + Enter (or Right/End ghost accept), not Tab |
| `[view]` | Fold open the Lucene feed query (power; not always on) |
| `T` / `t` | Re-apply Grid theme |
| `G` | Open the garden |
| `?` | Key help |
| `keymap` / `/keymap` | List or activate a `/keymap.toml` loadout |
| `Alt+T` | New isolated workspace tab (default home) |
| `Enter` (in channel) | Publish a new post (CLI) or stage an inline AI draft |
| `Enter` (after reply) | CLI: publish under that post (visible in thread). AI: stage **inline** pending draft — Enter commit · Esc reject · `e` edit. Never auto-opens agent chat |
| `Enter` (in nav) | AI/tools act in the current path scope |
| `Alt+Z` / `z` | Expand / restore the **focused panel** without changing its selection |
| `Ctrl+U` | Apply compatible update, workspace-default, and agent-session continuation signals in one restart; remains editor page-up when none are pending |
| `Ctrl+Space` | Intellisense + hotkey cheatsheet for the **focused component** (also always on the status bar as `[Ctrl+Space] keys`). **First visit** opens this sheet automatically so keyboard navigation is the obvious default — Esc dismisses and remembers. |
| Right-click | Themed context menu: **Prompt…**, **Copy** (optimized paste format for chats/posts/messages), + learned actions; ↑/↓ moves, Home/End jumps, Enter runs, Esc closes and restores focus |
| Drag-select text | Copies the highlight to the clipboard (paths, messages, session output) — classic TTY select-to-copy; click still navigates when there is no selection |
| `y` | Yank / copy the focused post, channel feed, or session chat (same optimized format) |
| Hold `` ` `` | Push-to-talk speech (when on-device STT model is ready); channel-voice transmit when joined in PTT mode |
| `Alt+V` | Toggle continuous listening (when on-device STT is ready) |
| `Alt+Shift+V` | Cycle voice mode: default / dictation / commands |
| `Ctrl+Shift+M` | Mute / unmute while in a voice channel |
| `/voice` | Join / leave / mute / deafen / PTT·VAD for channel voice |
| `macro` / `skill` | Define, list, run, voice-bind, or delete a safe reusable action |

Everything is clickable too: channels, members, projects, posts, and the signed
actions on each post. **Right-click** any control for a Grid-themed menu:
**Prompt…** binds that control’s id/name as chips above the agent input; **Copy**
pastes an optimized plain-text snapshot (thread, channel feed, DM, or session
chat) for agents and docs; below that, up to three actions the Epoch agent
pre-generates from how you use the board. Every post exposes adjacent **reply**,
**repost**, **share**, and **copy** actions plus vote, reaction, and fold controls;
their hotkeys are declared to assistive technology and repeated in the focused
component sheet. Session blades expose **copy** for the full chat.

### User-defined actions

Power users define one action and reuse it everywhere:

```text
macro set review = cd /projects/community/channels/general; view state:needs-review
macro voice review = start review
macro run review
```

`skill` is an alias for `macro`. Definitions persist in local storage,
autocomplete from the prompt, and register automatically as WebMCP tools named
`user_<name>`, which makes them custom agent skills without a second plugin
format. Voice phrases are exact matches to the same action. Definitions can
only compose commands already registered in Community Web; arbitrary JavaScript,
shell commands, and recursive macros are rejected.

The semantic surface every theme styles is [CONTRACT.md](CONTRACT.md).

## Console

Graph, shell and diff turned out to be three thirds of one thing. The graph
showed lineage, the shell moved fast, the diff read work as work — and all three
navigated badly. They are now one experience on one model:

**The board mounts a filesystem-like namespace over canonical Community
objects.** The hierarchical navigator, command line, and breadcrumb address the
same projection paths, while stable object IDs and explicit reply relations
remain independent of aliases. Clicking a namespace entry and deterministic
`cd` therefore invoke the same navigation action without making the path the
object's identity.

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
DM with **messages as the default pane**. A **messages · profile** toggle
switches to a GitHub-style profile description (bio, facts, pinned projects) in
the same dense TUI styling — not a web card.

### Activity (MS Teams-style notifications)

`/notifications` is an Activity feed for:

- **Mentions of you** (`@you` in channels or DMs)
- **Subscriptions** you watch (channels, topics, members, projects)
- **Custom hooks** you subscribe to (app events → Activity + browser alerts)

Filters (`all` · `mentions` · `subscribed` · `hooks`) are **terminal nav
leaves**, same idea as channels: the navigator stays on the filter list, and
notification cards live in the detail pane — individual items are not VFS
children. Unread items badge the **Activity** control in the bar; open a card
(or press Open) to jump to the source and mark it read. **Dismiss** (or `d`)
clears unread without opening — same dismiss verb as the home feed and DM
alerts. `/notifications` / `/activity` open the feed from the prompt.
Subscriptions live in fixture data (`CW_DATA.subscriptions`).

#### Custom event hooks

Hooks let you subscribe to named app events and broadcast matches through
Activity (and the browser Notification API when granted). Implementation:
`hooks.js` (`CW_HOOKS`).

| Event | When it fires |
|---|---|
| `post.created` | Live stream (or publish) lands a post |
| `mention.you` | Body mentions `@you` or your handle |
| `reaction.added` | You apply an ASCII reaction (`+1`, `eyes`, …) |
| `dm.received` | A DM-shaped payload lands |
| `subscription.matched` | Watched channel/topic/member traffic |
| `identity.changed` | Claim, sign-in, or sign-out |
| `space.joined` | You join or switch space |
| `query.matched` | Payload matches the hook’s Lucene/field filter |

Optional `match` filter: empty (all), `field:value` (`channel:bugs`, `who:scout`,
`key:+1`), free text, or a Lucene-style query when `CW_QUERY` is available.

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

Defaults ship in `CW_DATA.hooks` (e.g. new posts in `#bugs`, mentions, `+1`
reactions, cache talk). Config and fired items persist in `localStorage`
(`cw-hooks`, `cw-hooks-fired`). Private mode fails soft.

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

Pushed ids are remembered in `localStorage` (`cw-notif-pushed`) so the tray is
not spammed on every reload.

### Navigation

**One nav blade + one detail blade** — the root nav is **reused and reloaded**,
never cloned into a stack of path-segment columns.

- **Nav** is a navbar for the current path: only that branch’s first-level
  subnodes (plus optional one-level peek via `+` / Space on directories)
- **Channels are terminal nav nodes** — opening a channel addresses it for the
  detail feed and compose, but the **navbar stays on the parent channels list**
  (siblings stay visible). Posts and replies are explored only in **detail**
- **Enter / →** — `→` / Enter slides into a directory or **channel**, opens a
  marked feed post’s **thread** in detail, or the editor for files. Reply compose
  starts when **Tab** focuses the prompt while a post detail is open.
  Channels open into the message feed (`:` / `i` / Tab to write); DMs ready the
  prompt; dirs slide in
- **Click** selects and **previews** (dirs → children, channels → **feed** in
  detail) without changing the nav path; double-click activates like Enter.
  Click a post in **detail** to open its thread
- **← / × / Backspace** reloads nav at the parent (breadcrumb owns depth)
- **Detail** shows the selection (feed, thread, editor, agent, DM, …). Closing it
  does **not** remove the pane or expand nav — it shows the **home feed**:
  dense scrolling rows with toggles for **following** (people you follow,
  **rolled up by identity** — one card per person showing their latest post,
  with **Dismiss** / **Mark read**; dismissing pulls the next post from that
  person or widens the window / merges the live stream when the stack runs
  low), **announcements** (Discord-style long-form posts, collapsible, expanded by
  default), **featured** projects (README summary + optional excerpt), and
  **creators** (bio snippet + ASCII contribution sparkline). Each tab carries
  an unread count; opening a row marks it read
- **Shared verbs:** default `d` = **Dismiss**, `m` = **Mark read**, `esc` =
  leave/close (not dismiss). Same dismiss chord on home following stacks, other
  home tabs, Activity / notifications, and DM alerts — remappable via
  `/keymap.toml` (vim: `x` dismiss; yazi: `d`/`x` trash; lazygit: `x` discard;
  emacs: `C-k` kill/dismiss)
- On following: dismiss removes the cursor card; mark-read keeps it visible
- Tree expand/collapse marks are only **`+` / `−`**. Leaves keep a blank
  spacer — no dots or arrows. A trailing count is a plain number when a dir
  has children.
- Every VFS nav row wears a **type glyph** from the 16-bit
  [pixelarticons](https://pixelarticons.com) pack (`icons.js` / `CW_ICONS.vfs`):
  folder, `#` channel, headphone (voice), file, robot (agent), mail (DM),
  bell (notifications), `keymap.toml` (script), and so on. Icons are
  `currentColor`, pixelated at 14×14 — never emoji.
- **`/keymap.toml`** at the board root edits loadouts
  (`epoch`, `vim`, `yazi`, `emacs`, `lazygit`, …).
  `keymap use emacs` / `keymap use lazygit` swaps chords; the help sheet and
  action registry rebind with the active loadout.

| | |
|---|---|
| `←` / `h` | when the **navigator** owns focus: reload nav at parent; when a **thread** is open: close it to the channel feed; when the **channel feed** owns focus: return keyboard to the navigator (detail stays as preview); from **home feed** (detail focused), focus the nav sidebar |
| `→` / `l` | when the **navigator** owns focus: reload nav into selected **dir**, or open/hand focus to a **channel** message feed (navbar stays on the channels list); when already addressing that channel, hand keyboard to messages; on a marked feed post in **detail**, open its **thread** (path stays the channel — no message-ID panes); on other text files, open the editor; on **home feed** (detail focused), open the current row |
| `↑↓` / `jk` | move within the focused surface — nav list (**preview** updates), home-feed rows (when home owns focus), or previous/next post in the **detail** channel feed / thread |
| `Enter` | **Activate** the preview — open a **channel** into the message feed (keyboard stays on messages; `:` / `i` / Tab write), post **thread**, editor, or slide into dir; on home, open the current row |
| `Tab` | yield to the prompt from the board; from the prompt, restore the last navigator/message context. Arms a reply when leaving post detail |
| `Shift+Tab` | same yield/restore as Tab from the prompt |
| `d` | **Dismiss** — home stack / Activity / notification / DM alert under the cursor |
| `m` | **Mark read** — home feed (keep in stack, clear unread) |
| `e` | open the terminal editor for the selected file/post |
| `[` / `]` | on home feed, cycle tabs (following · announcements · featured · creators) |
| `Space` | expand / collapse **one level** under the cursor (directories only — not channels) |
| `+` / `−` | same expand / collapse (pointer) |
| `Backspace` / `<<` on nav | back to parent — reload nav |
| `Esc` / `[esc]` / `Backspace` on detail | leave a **thread** for the channel feed; from the feed, return to **Home feed**; then columns → prompt |
| click a post in **detail** | open that **thread** in the detail pane (posts are not listed in the nav under a channel) |
| `:` | command line |
| `/` | start filtering the **nav** list (nav must own focus) |
| `v` | cycle sort — hot, new, top (and any views you pin with `[+]`) |
| `z` / `Alt+Z` | expand / restore the **focused panel** |

#### Focused-panel expansion

Every nav, detail, session, and editor blade exposes the same TUICR-style focus control:

- **▭** or `z` / `Alt+Z` expands the blade that actually owns focus
- **▣** or the same hotkey restores the prior blade layout
- cursor, message mark, editor buffer, and scroll context stay attached to that blade
- expansion is session-only, so reload cannot strand a hidden panel

Pointer and touch are peers, not fallbacks: every entry, breadcrumb segment and
sort chip is a real button, blades swipe with scroll-snap on a phone, and every
control clears the 32px floor wherever the pointer is coarse.

### The input box: AI or CLI

One box, two readings. **AI is the default**; `Alt+A` or the chip at the prompt
switches.

### Startup and routing

The status footer is the **bottom line**: it always ends with one recommended
next action and its hotkey. A host adapter can publish validated local signals
for a resumable Claude/Codex/Grok session, an available Community Web update, or
unapplied workspace defaults. The footer combines compatible signals behind
`Ctrl+U`; one restart applies update → defaults → continuation. Static browser
code does not scan arbitrary host files, and malformed signals are ignored.

`CW_ROUTE` selects once per workspace and policy version, then keeps that model
route until an explicit recoverable failure or policy-version change. This is a
Switchyard-compatible policy seam with native provider `format` preserved for
prompt caching; no remote route runs without a host adapter and user-scoped
authorization. See [ADR-0028](../design-decisions/0028-community-web-startup-and-routing.md).

**Slash commands** — in ai (chat) mode, type `/` for intellisense. The catalogue
is **static**: `/go`, `/search`, `/sort`, `/mode`, `/dm`, `/help`, `/attach`,
and friends do not change with focus. **`/act`** is the exception — its
arguments are context-bound (reply on a post, create a channel under
`…/channels`, voice in a lounge, share the current path). Type bare `/act` to
list what works here. Context verbs like `/reply` are not in autocomplete
(agents may still resolve them). Hotkeys such as **Ctrl+Space** (keys) are not
mirrored as slash verbs. **`/mode ai|cli`** switches prompt interpretation
(`Alt+A` still toggles). Terminal shell verbs (`cd`, `ls`, …) are not slash
commands — use cli mode. Theming is `theme_set` / `theme_use` (legacy `/theme`
resolves for agents only).

**CLI** — the text is a command. Wrong input is an error, which is what a shell
owes you. While you type, the prompt shows **fish-style ghost preview** and
**syntax highlighting** (verb, path, sort, query fields) plus a suggestions menu.
Focusing the prompt (click or Tab) claims keyboard ownership from the VFS —
Tab / Shift+Tab from the prompt restores the last board context.
↑↓ walk autocomplete candidates (or history when the menu is closed) and do not
move the navigator.

**AI** — the text is intent. It goes to an agent that interprets it into tool
calls, and a failed call is **repaired rather than rejected**: the error is fed
back once and the agent chooses again. "take me to the bug reports" lands at
`/channels/bugs` even when the first attempt guesses `/chat/bugz`. Without an
on-device model, AI mode still stages **inline** compose drafts (commit / edit /
reject) without opening agent chat; agent turns fail closed until a model is available.

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

**`/search` / `search` / `board_search`** — Lucene search across every feed,
project room, channel, DM, and path. Same query grammar as feed `/view`
(`who:`, `state:`, `body:`, `kind:`, …). CLI mode runs it directly; AI mode
accepts `/search …` or bare `search …` as a command, and also registers
`board_search` as a WebMCP tool / Space Steward skill so natural language
(“find cache talk”, “what needs review?”) does not require typing the slash.

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
- **Messages are hidden directories.** `cd p3` resolves the message ID to its
  reply chain, and each completion row pairs the ID with its title/body summary.
- **`cd` browsing is transactional.** Moving through path candidates paints the
  destination as `[preview]`; `Esc` restores the original context and `Enter`
  commits the selected path.
- **Smart markers** mid-input, Discord/Slack style:
  - `@` mentions people and agents on the board (`@maya`, `@scout`)
  - `#` tags trending topics and channel short-names (`#draft-persistence`,
    `#bugs`)

### Adversarial design critique — message directory navigation

Persona: `@persona.slack_power_user`
Surface: `/board.html` message list, prompt completion, and path breadcrumb
DESIGN.md north star check: pass — message paths stay inside the existing TTY surface and use stateful teal/gold accents without pills, glass, or gradient text (`DESIGN.md`; `.optimizexp/audits/token-conformance.json`).
Craft (hierarchy, density, typography, color rarity): pass — ID, summary, selected row, breadcrumb, and preview transaction remain distinct at scan density (`console.js`; `e2e.mjs`).
Playfulness / wonder (craft delight, not slop): pass — drilling into a message makes the filesystem metaphor tangible, while the preview badge communicates reversible motion (`app.js`; `e2e.mjs`).
Competitive bar (vs Discord/Slack/X/Bluesky/Tangled where relevant): pass — arrows, IDs, summaries, and transactional preview match power-user command palettes without hiding keyboard state (`features/community_web_experience.feature`; `e2e.mjs`).
Accessibility / honesty / trust legibility: pass — focused articles are keyboard-addressable; preview, accepted, and cancelled states are explicit; no reviewed-surface defects remain (`docs/evidence/community-web-app/axe.json`; `.optimizexp/defects.json`; `e2e.mjs`).
Unacceptable issues (must fix before merge):
- None.
Delight opportunities (should fix this pass if cheap):
- None.

Persona: `@persona.github_open_source_contributor`
Surface: `/board.html` message list, prompt completion, and path breadcrumb
DESIGN.md north star check: pass — the interaction reads as one crafted terminal product, not added web chrome (`DESIGN.md`; `.optimizexp/audits/token-conformance.json`).
Craft (hierarchy, density, typography, color rarity): pass — summaries disambiguate terse IDs and the breadcrumb makes reply ancestry legible (`console.js`; `e2e.mjs`).
Playfulness / wonder (craft delight, not slop): pass — reversible path travel gives the signed community thread a memorable, purposeful filesystem character (`app.js`; `e2e.mjs`).
Competitive bar (vs Discord/Slack/X/Bluesky/Tangled where relevant): pass — message browsing keeps Slack-class keyboard speed while exposing stable linkable context (`features/community_web_experience.feature`; `e2e.mjs`).
Accessibility / honesty / trust legibility: pass — DOM focus, path state, preview rollback, and commit are asserted in browser automation and the standing ledger is clear (`docs/evidence/community-web-app/axe.json`; `.optimizexp/defects.json`; `e2e.mjs`).
Unacceptable issues (must fix before merge):
- None.
Delight opportunities (should fix this pass if cheap):
- None.
  - Tab accepts (with a trailing space); Enter always submits/sends as typed.
    Markers are extensible in `complete.js` (`MARKER_SPECS`).
- **Speech-to-text** uses an **on-device** quantized model (Microsoft Edge’s
  local `SpeechRecognition` pack via `processLocally` +
  `SpeechRecognition.available` / `.install`). Cloud-only Web Speech and
  Grok/xAI STT APIs are **not** the backend — voice stays off until a local
  model reports **available**.
  - The **mic is always visible**. When unsupported or still downloading it
    is muted with a status tag (`off` / `fetch` / `dl…`) and a title that
    explains why; hold `` ` ``, Alt+V, and listen only work once ready
  - First visit may need **one download** (gesture: click the mic or any
    key) — same pattern as the Prompt API model warm
  - Prefer **Microsoft Edge** (Canary/Dev) with *Speech Recognition with
    on-device model*. Chrome/Chromium may expose `available`/`install` stubs
    that are unsafe to probe — Community Web treats those as unavailable rather
    than crashing the tab
  - Mic control uses the **16-bit iconography pack** (`icons.js` /
    [pixelarticons](https://pixelarticons.com), MIT). The same pack supplies
    VFS nav type glyphs via `CW_ICONS.vfs` (folder, hash, headphone, file,
    robot, …) plus root `/keymap.toml`, rendered 14×14 pixelated with
    `currentColor`. Board chords swap via loadouts in that file
    (`keymap use vim` / `yazi` / `emacs` / `lazygit`).
  - **Hold `` ` ``** — Discord-style push-to-talk; listen while held, commit on
    release
  - **Alt+V** — toggle continuous listening (voice-activity analogue)
  - **Alt+Shift+V** (or the `[default]` chip next to the mic) — cycle **voice
    intent mode**, matching Windows Voice Access / macOS Voice Control:
    - **default** — wake prefixes (`computer …`, `command …`, `hey epoch …`)
      or the spoken grammar run as commands; everything else is dictation
    - **dictation** — every phrase is text in the prompt
    - **commands** — every phrase is a command (unrecognized fails soft)
  - Spoken mode switches: `"commands mode"`, `"dictation mode"`, `"default mode"`
  - Discoverability: say **`"what can I say?"`** (lists the grammar in the
    transcript). Examples: `"computer go to bugs"`, `"search needs review"`,
    `"sort by new"`, a saved macro phrase such as `"start review"`, `"send"`,
    `"stop listening"`
  - **Esc** or the mic button — stop; permission denials fail soft
- **Channel voice** (Discord-parity, same-origin mesh for the exploration):
  - Dedicated rooms under community channels: **`lounge`**, **`standup`**
    (`kind: voice` — no text backlog; join from the channel or `/voice join`)
  - **WebRTC** mesh with **BroadcastChannel** signaling (stand-in for Discord’s
    voice WebSocket). Media is Opus-preferred @ 48&nbsp;kHz with echo cancel /
    noise suppress / AGC and an interactive `AudioContext` for VAD
  - Persistent **voice dock** above the compose foot while connected: roster,
    speaking indicators, **mute** / **deafen**, **VAD ↔ PTT**, leave, and
    candidate-pair **RTT** from `getStats`
  - **Hold `` ` ``** transmits while input mode is PTT (takes priority over
    speech-to-text PTT). **Ctrl+Shift+M** toggles mute
  - Slash: `/voice join [channel]`, `leave`, `mute`, `deafen`, `ptt`, `vad`,
    `status`. WebMCP: `board_voice_join` / `board_voice_leave` / `board_voice_mute`
  - Open a second tab on the same origin to prove peer audio; without mic
    permission join fails soft
- **Arrows belong to the menu when it is open.** `↑↓` walk the candidates;
  `→` drills into the highlighted `cd` directory and `←` returns to the prior
  typeahead level, keeping the prompt, child candidates, and context preview in
  sync. **Tab** (or click) accepts the highlighted one. **Enter always submits**
  the typed line — autocomplete never steals it. On an empty prompt (menu
  closed), `↑↓` walk command history even though a full verb catalogue exists
  in completion state.
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

`board_navigate` · `board_list` · `board_where` · `board_search` · `board_post` ·
`board_create_channel` · `board_create_project` · `view_set` · `sort_set` · `stream_load` ·
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
motion. Asking *"what needs review?"* runs `board_search` (or a GraphQL query); *"sort by new"*
calls `sort_set`; *"make everything blue"* calls `theme_set` — all through the
same registry a browser agent would use.

### Thread tree

The preview is always a **comment tree** (Reddit grammar). Sort changes order,
not costume:

- **Nest rails** — one `|` column per ancestor depth. Click a rail (or `[-]`/`[+]`)
  to collapse that chain and everything under it.
- **Votes** — `[+]` / `[-]` on every comment; score is local to the session.
- **Reactions** — terminal marks as `[+1 3]`, `[eyes 2]`, … — never emoji or
  round pills. Keys: `+1`, `-1`, `eyes`, `rocket`, `heart`, `laugh`, `tada`,
  `thinking`. Click to toggle yours; `[+]` opens the picker. Fixture posts ship
  seed counts; your reactions persist with page state.
- **Reply** — `[reply]` or `/act reply` arms compose as reply scope. The label
  above the prompt shows `[reply @handle · id]`.
  - **CLI mode** — type the body and press Enter; the reply publishes under the
    parent and stays visible in the open thread (mark + focus on the new message).
  - **AI mode** — Enter stages a **pending inline reply** under the parent
    (looks like a real message with `commit` / `edit` / `reject`). It does **not**
    open the session/agent chat pane. Commit with Enter, reject with Esc, edit
    with `e`. When an on-device model is available, the same inline draft can
    rewrite from your intent while you keep commit/reject control.
- **Compose scopes** — channel → new post; DM → dm message; nav at
  `…/channels` or `/projects` → create tools / AI stay in that project.

### Adversarial design critique — message ←→ navigation

Persona: `@persona.slack_power_user`
Surface: `/board.html` channel feed and thread detail keyboard
DESIGN.md north star check: pass — ←→ match reading levels (thread ↔ feed ↔ nav), not a second VFS of message IDs (`DESIGN.md`; `app.js`).
Craft (hierarchy, density, typography, color rarity): pass — one detail pane; status says “thread · ← feed”; navigator stays on channels (`e2e.mjs`).
Playfulness / wonder (craft delight, not slop): pass — open/close feels like Slack/Discord threads, while `cd` still exposes message directories for power users (`docs/community-web/README.md`).
Competitive bar (vs Discord/Slack/X/Bluesky/Tangled where relevant): pass — arrows never dump `body.md` / `replies` panes mid-browse (`e2e.mjs`).
Accessibility / honesty / trust legibility: pass — Enter/→ open the same thread; Esc/Backspace/`←` share the leave ladder; outline → still expands when needed (`features/community_web_experience.feature`).
Unacceptable issues (must fix before merge):
- None.
Delight opportunities (should fix this pass if cheap):
- None.

### Adversarial design critique — reply compose and AI inline draft

Persona: `@persona.slack_power_user`
Surface: `/board.html` reply arming, inline pending reply under parent (not session blade)
DESIGN.md north star check: pass — pending draft is a real nest reply with commit/edit/reject acts, not a separate pane or agent chat (`DESIGN.md`; `console.js`).
Craft (hierarchy, density, typography, color rarity): pass — one job under the parent; pending rail marks draft vs published (`app.js`; `e2e.mjs`).
Playfulness / wonder (craft delight, not slop): pass — AI rewrite is a reversible inline commit, not a silent publish or chat dump (`features/community_web_experience.feature`; `e2e.mjs`).
Competitive bar (vs Discord/Slack/X/Bluesky/Tangled where relevant): pass — CLI posts immediately; AI matches “draft then send” in-thread without auto-opening agent chat (`docs/community-web/README.md`).
Accessibility / honesty / trust legibility: pass — Enter/Esc/`e` and labeled commit/reject buttons share outcomes; session blade stays closed unless the user opens it (`e2e.mjs`).
Unacceptable issues (must fix before merge):
- None.
Delight opportunities (should fix this pass if cheap):
- None.
- **Feed views (Lucene-style)** — more robust than thumbs-up ranking alone.
  Named projections (`hot`, `new`, `top` by default; pin more with `[+]`)
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
- **Share** — defaults to the current-origin HTTPS contextual link; its menu
  distinguishes canonical, contextual, and exact-revision links.

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

### Markdown + colour-coded tables + syntax highlighting

Transcript and post bodies go through `CW_ASCII.formatBody`:

- **Markdown subset (Discord-flavoured)** — headings, lists, `>` / `>>>` quotes,
  fenced code, `**bold**` / `***bold italic***` / `*em*` / `__underline__` /
  `~~strike~~` / `||spoiler||` (click to reveal) / `` `code` ``, `@mentions`,
  `#topics`, links, and pipe tables
- **Message chrome** — votes, reactions, fold, and actions are ASCII brackets
  (`[+]`, `[eyes 2]`, `[reply]`), not circles or emoji. Braille receipt sigils
  stay.
- **Syntax highlighting** — fenced blocks are token-coloured via `CW_SYNTAX`
  (js/ts, json, graphql, shell, css, html, markdown, diff, lucene, …). Bare
  JSON blobs in the transcript get the same treatment. The terminal file editor
  highlights `.ts` / `.js` / `.md` / … lines in place. Classes are `.cw-tok-*`
  on theme tokens — no Prism/Shiki dependency.
- **Tables** render as **box-drawn ASCII** (`┌─┬─┐`) with colour classes:
  header ink uses accent, rules are faint, cells follow body/dim tokens
- **Plain multi-line ASCII** still colourises box edges, block gauges, and
  braille sigils so banners and gauges stay readable without full markdown

Themes style via `.cw-md-*` / `.cw-tok-*` classes (no hard-coded colours). `/space`
opens the spaces catalogue so you can pick one from the list.

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

API: `CW_ATTACH` (`readFiles`, `composeInput`, `formatContext`) and
`CW_APP.addAttachmentFiles` / `clearAttachments`.

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

API (`CW_ASCII`):

| Call | Result |
|---|---|
| `linkPreview(url)` | HTML `<article class="cw-link-preview">` card |
| `linkPreview(url, { asHtml: false })` | Plain ASCII frame |
| `summarizeLink(url)` | `{ title, description, site, kind, … }` |
| `extractLinks(text)` | Unique safe links from markdown + bare URLs |
| `formatBody(text)` | Body HTML **plus** preview cards for every link |

Kinds: `repo` · `docs` · `board` · `identity` · `relay` · `link`. Board paths
(`/projects/…`, `community:…`) navigate in-app via `data-goto`; external
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
npm run community-web:app:faults
npm run community-web:app:e2e
npm run community-web:app:a11y
npm run community-web:app:a11y-lint
```

Accessibility: the board is keyboard-first (skip link, banner/main/contentinfo
landmarks, ARIA tablist for workspaces, combobox + listbox for the prompt).
`npm run community-web:app:a11y` runs axe-core at desktop and mobile and fails on
serious/critical findings; evidence is written to
[`docs/evidence/community-web-app/axe.json`](../evidence/community-web-app/axe.json).
`npm run community-web:app:a11y-lint` is the static companion gate for string-built
HTML that jsx-a11y cannot see.

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

`build-openui.mjs` defines the component library — which *is* the Community Web
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
node packages/Epoch.Community.Web/scripts/build-openui.mjs
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

One coherent responsive strategy: hierarchical navigator + detail blade at desk
width, stacked outline + reading pane at mid width, and swipeable named panes
with scroll-snap on a phone. This is not one column per path level. The frame
itself never scrolls as a page — every scrolling surface is a named pane.

## Durable page state, profile, and spaces

Page state is durable across reloads. The **Profile** button defaults to
**Anonymous** in the home **space**. Anonymous sessions are fine when the space
allows guests.

| Auth state | Meaning |
|---|---|
| `guest` | Anonymous principal in a guest-friendly space |
| `claimed` | Signed in to a space with a local handle (same principal kept) |
| `atproto` | Signed in with a portable handle |
| `denied` | Space or policy requires sign-in — read-only until Profile → Sign in |

### Spaces

A **space** is a joinable board: membership, a topical **feed**, **channels**,
and linked **projects**. Anonymous guests can browse guest-friendly spaces;
sign-in claims a handle in that space.

Fixture spaces:

| Space | Guests | Role |
|---|---|---|
| EPOCH CIVIC WORKSHOP (`r/civic-workshop`) | yes | Home community |
| Agent Lab (`r/agent-lab`) | yes | Humans + agents |
| Tuner Crew (`r/tuner-crew`) | no | Private crew + projects |

Browse at `/spaces`, or run **`/space`** to open that catalogue as a select list.
Open a hub (`/spaces/agent-lab`) for **feed / channels / projects / about**.
Profile menu joins a space. `/space agent-lab` joins by id; members-only spaces
open sign-in.

Board furniture is snapshotted under `cw-board-state` for the same principal.
Slash surface also includes `/whoami`, `/logout`.

## The furniture

Polish that had been missing, each piece done the terminal way:

- **Scrollbars take the theme's ink** — thin, square, trackless, on both
  engines. A scrollbar is a position marker, not a component.
- **Panes resize; focus expands in place.** The terminal sash is the pane's own
  control: drag resizes (pointer events — mouse, touch and pen are one path),
  double-click or Enter collapses and reopens, arrow keys nudge. `z` / `Alt+Z`
  expands the focused nav, detail, session, or editor blade; the same action
  restores the layout without changing selection. Expansion is session-only.
- **The whole page is the TUI.** There is no separate dockable terminal window
  and no foot transcript strip. Workspace tabs (`Alt+T` / `+`) are isolated
  virtual worktrees — each has its own path, folds, session log, history, detail
  pane and attachments. New tabs land at the default home channel. The prompt at
  the foot is compose-only (scoped to the active blade): **reply** posts under
  the armed message in CLI mode (and keeps the new reply visible in the open
  thread); in AI mode Enter stages an inline pending reply under that message
  with commit/edit/reject — it does **not** open the session/agent chat pane.
  A **channel** creates a new top-level post, a **DM** sends
  to that thread, and **nav** scopes `board_create_channel` /
  `board_create_project` (and the AI) to the current path. Compose scope is
  labelled above the input. CLI/AI session output lands in a **dedicated
  session blade** (third pane) when there is useful transcript — the blade is
  **closed by default** at boot and opens only when you expand it or when an
  explicit agent turn / command transcript needs it; board compose and AI
  reply drafts stay in the thread. The chat
  formats as a scannable log: **you / agent / sys** who-rail, turn breaks between
  speakers, mode chips above your message, and collapsible tool rows nested under
  the agent. Close it with **[esc]**
  on the session header (or Esc while that chat owns focus); the transcript
  stays until `clear`, and the next command or agent turn reopens the pane.
  When a submit is **inconclusive** (for
  example `@maya …` on the home feed or other non-DM/channel/reply compose
  scope, a failed `board_post`, or no on-device model), that session blade
  becomes the **active** pane (`data-active`) so you can see the tip and
  iterate — `@handle` alone does **not** send a DM; use `/dm @maya` or open
  their thread first. The home feed is not a leftover-channel compose surface.
- **Transcript identity is a who-rail.** `you` and `agent` share a fixed left
  column so turns line up; system output sits under an empty rail. Tool calls
  and supplemental detail collapse by default under the agent (`> navigate ·
  path`) and expand on click — the one-line summary stays honest when closed.
- **Conversations are Reddit-style trees.** `re:` names the parent; replies nest
  under what they answer with clickable nest gutters (hover highlights the
  margin; click collapses that ancestor), a left branch margin to expand/collapse
  the focused chain, and a right child margin that cues more replies and drills
  in with `→`. Focus chrome marks only the selected message row — never the
  whole detail pane or nested replies. Votes and reply sit on every comment.
  Feed sort defaults to Reddit's three — hot / new / top — on the feed pane
  only; pin more with `[+]`. Not a view costume.
- **A channel shows what it is before what it contains**: name, kind, post
  count, unread, its activity sparkline and last word, as one line of facts
  above the conversation — both when selecting it from `/channels` and while
  standing inside it.

Panes and folds are deliberately *not* WebMCP tools: they are furniture around
the board, not capabilities of it. The registry stays the set of things an
agent can truthfully do to the board's content.

## Enforced, not asserted

`test/unit/community-web-app-themes.test.ts` runs in `npm test` and holds every theme
to the contract: themes, unique ids, no external resources, body ink at 7:1
and dim ink at 4.5:1 against their own ground, and the reserved accent
distinguishable from every state ink. It also exercises durable guest identity,
claim continuity, portable-handle sign-in, and board-state round-trip from
`session.js`.

It earned its place immediately. Two themes shipped below the floor — Breadbin
at 6.0:1 and Solar Night at 5.6:1 — and IBM CGA used one magenta for accent,
warn and danger, which made its legend impossible to read truthfully. All three
were found by the test rather than by looking.

## Realtime fabric handoff

NATS fabric CONNECT is **complementary** to board auth
([ADR-0054](../design-decisions/0054-nats-realtime-fabric.md), [nats.md](../nats.md)).
`nats-fabric.js` (`CW_NATS_FABRIC`) attaches only when
`window.CW_FABRIC_CONFIG.endpoint` is set **and** a non-guest identity has a
Platform-backed ticket path (`platformSessionId` / `platformApiTokenId` /
`fabricSecret`, with an injectable mint). Guests never claim broad fabric
access; status stays honest (“realtime requires sign-in”). Fabric failure does
not open session or agent chat. Unit coverage:
`packages/Epoch.Community.Web/test/nats-fabric.test.mjs`.

## Fixtures

Every person, channel and post is fictional, and `incoming` is a scripted
sequence rather than activity. `PRODUCT.md` records that this product has no
real users, no analytics and no production deployment, so nothing here implies
otherwise.
