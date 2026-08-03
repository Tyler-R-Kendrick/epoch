# Community Web Content Design

Voice, microcopy, and state-copy rules for Epoch Community surfaces. This is
the written half of DESIGN.md: the tokens say how the workshop looks, this
says how it speaks. Owned by the `product-designer` persona; reviewed under
the Adversarial Design Critique Protocol
([community-human-centered-design.md](community-human-centered-design.md)).

## Voice

Epoch Community speaks like a **calm colleague in a signed workshop**: plain,
specific, warm without performing. It never speaks like a brand, a lawyer, or
a game.

- **Plain over clever.** "No signed receipts yet" — never "It's quiet in
  here! 🎉".
- **Specific over vague.** Name the object and the state: "Snapshot ·
  communities", "2 signers · derived from receipts".
- **Honest over reassuring.** If state is sample, stale, or unverified, the
  copy says so in the sentence, not in a tooltip. Honesty copy is a product
  feature (see the honesty banner), not an apology.
- **Non-blaming.** Errors describe what happened and the next action; they
  never scold ("you failed to…") or shame reporters and reported members
  alike in moderation copy.
- **No idiom locks.** Copy must survive translation and non-native reading:
  no puns, no pop-culture, no "oops/whoops/yikes".

## State copy templates

Every list surface (message feed, dev feed, issues, changes, agents, search)
uses the three-state system. Each state names the object, the truth, and the
next verb.

| State | Template | Example |
|---|---|---|
| Empty (inviting) | `No <objects> yet. <verb invitation>.` | "No messages in #showcase yet. Share what you're building." |
| Empty (honest-degraded) | `<Truth>. <recovery action>.` | "Snapshot mode — live messages unavailable. Reconnect EPOCH_COMMUNITY_API_URL, reload this page, then retry." |
| Loading | `Loading <objects>…` (only when genuinely async; never fake latency) | "Loading change proposals…" |
| Error | `<What failed> — <why if known>. <next action>.` | "Message not sent — the API rejected the signature. Check your session and retry." |
| Zero results (search) | `No receipts match "<query>". <scope reminder>.` | "No receipts match "goose". Search covers messages, intents, harness labels, and promote receipts in this community." |

Rules:

- Empty states always contain a verb the reader can act on now; an empty
  state without a next action is a failed state.
- Degraded copy is plainspoken and complete in one reading — the reader
  should never need to open a doc to know what to do next.
- Counts are real or absent. Never render invented numbers ("4 here") —
  derive from receipts or say nothing (DESIGN.md: no fake presence).

## Trust and receipt language

- "Signed", "receipt", "anchor", "intent", "proposal" are product nouns —
  use them consistently, never synonyms ("verified message", "proof card").
- State suffixes follow the pattern `<state> · <qualifier>`:
  "open · human review required", "live API session · AT OAuth not linked",
  "sample · working".
- Gold/verified language is reserved for actually verified history — copy
  must never claim verification the signature layer did not perform
  (auto-fail: trust theater).

## Moderation copy

- Reports acknowledge receipt and state: "Report recorded as a signed
  receipt. A moderator will review; you can follow its state here."
- Outcomes are communicable to real people: no legalese, no shaming, no
  "violation detected" machine voice.
- Copy addressed to the reported party describes the norm and the action,
  not the person.

## Where copy lives

Server templates and the client runtime must render identical strings —
duplicated copy is drift (see the renderer-parity test). Shared strings
belong in one module consumed by both sides; the decomposition plan places
them in `view/` templates and `model/channels.ts` topics.
