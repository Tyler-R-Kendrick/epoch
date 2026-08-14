# ADR-0050: Command Livestream Privacy

Status: Accepted; policy engine and Community Web board adapter implemented

## Context

Community Web livestreams are a creator surface. A pixel or keystroke share
would show whatever is on the streamer's screen: a legal name in a compose
box, an email in a reply, a `.env` buffer, a login dialog, a private org, or
a DM. Spectators did not consent to receive that, and creators did not consent
to publish it.

A second failure mode is visual lock-in. If the stream is a recording of the
streamer's theme, a spectator who wrote their own view still watches the
streamer's chrome. That fights the product rule that Community objects are
replayed through the viewer's projections.

## Decision

- Livestreams carry command envelopes `{ t, actorId, actionId, args, path? }`,
  never pixels, keystrokes, or character counts.
- `@epoch/community-runtime` owns the fail-closed policy:
  `sanitizeStreamCommand` emits, drops, or rewrites; `replayStreamCommand`
  applies public actions and skips view preferences.
- Spectators replay those commands in their own theme, tokens, and view.
  `theme.*` is a view preference and is never applied from a foreign stream.
- Protected inputs — password fields, one-time codes, `[data-stream-protect]`,
  the auth dialog, and ignored paths — emit nothing. The streamer hotkey
  `stream.protect` (`Ctrl+Shift+.`) mutes input actions until toggled off.
- `.epochstreamignore` uses gitignore-shaped globs and is merged with defaults
  (`.env`, keys, `dms/**`, `**/private/**`, secrets). Negation with `!` works.
- `.epochstreamrewrite` uses `name = /regex/flags → cipher|drop`. Cipher
  replacements are fixed-width obscure ASCII (`STREAM_CIPHER_WIDTH` 12) so they
  are not a length oracle. Invalid patterns are ignored; defaults still apply.
  Emails are rewritten by default.
- Spectator chrome may render cipher slabs with a CanvasUI decrypt-reveal host
  at passthrough `0`. The slab never decrypts for a spectator.

## Escape And Consequences

The policy lives in the shared runtime, so CLI, WebMCP, and the board cannot
drift. A custom spectator view still cannot recover dropped envelopes or invert
a cipher token: the original bytes never left the streamer.

Workspace ignore/rewrite files are creator-authored. They cannot un-hide the
defaults. A missing file is not an allow-all.

## Revisit Criteria

Revisit when live multi-user Activity starts shipping command logs over the
network, when a second client needs a different envelope schema, or if a
cipher token is shown to be invertible from session salt plus alphabet.

## Coverage

- `features/community_web_experience.feature` spectator replay, mute, and local
  theme scenarios
- `test/unit/community-stream-policy.test.ts`
- Community Web `STREAM-001` / `STREAM-002` / `STREAM-003` e2e
