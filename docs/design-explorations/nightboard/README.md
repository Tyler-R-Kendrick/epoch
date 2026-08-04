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

## The garden

Markup is fixed and authored once; **themes are CSS alone**. The full semantic
surface is in [CONTRACT.md](CONTRACT.md) — regions, components, states, kinds,
and the token contract. A theme that needs new markup is not a theme, and that
constraint is what makes the garden work.

Ten themes ship, all of them Nightboard: same grid, same exits, same command
line, different phosphor.

`Nightboard` · `Green Phosphor` · `Amber CRT` · `IBM CGA` · `Breadbin` ·
`Teletext` · `Paper Terminal` · `Solar Night` · `High Contrast` · `Line Printer`

### Generating one

The garden panel generates a theme **on your device** using Chrome's built-in
Prompt API (`LanguageModel`). No key, no server, nothing leaves the page.

The model is constrained by a JSON schema to emit token values only, so it
cannot return markup, a script, or a URL even when asked. Output is then checked
again here — schema-shaped is not the same as safe — and a generated theme whose
body text falls below 4.5:1 on its own ground is refused rather than applied.

The API reports four states, and the panel says which one you are in:
`available`, `downloading`, `downloadable` (supported, model not fetched yet),
and unavailable. Where it is unavailable the panel says so plainly, and manual
token editing reaches exactly the same surface.

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
