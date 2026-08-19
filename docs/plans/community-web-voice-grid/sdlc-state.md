# Community Web voice tray + Grid polish — SDLC State

## Phase

Closed — 2026-08-19 via `/sdlc finish`.

## Session PRs

| Layer | PR | Merge SHA |
|---|---|---|
| Voice tray, Gherkin/e2e, Grid detector/designmd cleanup | [#155](https://github.com/Tyler-R-Kendrick/epoch/pull/155) | `48d8b393da2345260bef203fdff4321206c8c367` |

## Product

Lounge voice stays disconnectable after changing rooms: a pinned connections strip (not a sibling that fell off the console grid) carries room name, roster, RTT, push-to-speak, mute/deafen, and disconnect. One live room at a time.

## Design

Community Web Grid: no kicker eyebrows, reverse-video selection, 1px error boxes, DESIGN.md components reference every color so `designmd lint` is warning-clean.

## Verification

- Local `npm run gate:fast` green (Node 22).
- #155 Quality Gates all passed, including Test, Coverage, Community Web e2e, and XMPP Prosody harness.
- Impeccable detector `[]` on the changed Community Web surfaces.

## Residual

- Engine still replaces the current voice room on join (one live connection).
- Window blur releases channel-voice PTT (`endVoicePtt` on `blur` in `app.js`); pointer/key release and pointercancel also release.
- Sibling Platform/Ops Web kickers remain outside this Grid surface.
