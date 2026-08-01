---
product: Telegram
design_sources:
  - https://telegram.org/
  - https://core.telegram.org/
  - Public Telegram Desktop / iOS / Android UI observation
  - Theme token community references (windowBg, dialogsBg, msgIn/Out)
last_researched: 2026-08-01
---

# Design

## Look And Feel

Telegram is a **content-first messenger** with minimal chrome and maximum message throughput. The default product feels fast, open, and lightly themed: large circular avatars, soft incoming/outgoing bubbles, a simple chat list, and almost no permanent secondary navigation.

Visual character:

- Chat list (dialogs) on the left (desktop) or full-screen (mobile); conversation fills the rest.
- Message bubbles: outgoing often tinted brand-blue; incoming soft gray/white.
- Large touch targets; generous bubble padding; readable body ~16–17px on mobile.
- Floating or minimal composer; media and stickers are first-class.
- Brand blue ≈ `#2AABEE` / `#0088CC` family as the single strong accent.
- Dark themes use deep navy/charcoal (`#0E1621` class) rather than pure black.

## Design Rules (Extracted)

1. **Content over chrome.** Almost every pixel is either a dialog row or a message.
2. **One accent color.** Blue drives primary actions, links, and outgoing emphasis.
3. **Bubbles encode direction.** Shape and fill tell you "mine vs theirs" without labels.
4. **Speed is a visual property.** Instant transitions, light shadows, no heavy panels.
5. **Avatar as identity.** Large circular faces replace dense role/meta stacks.
6. **List → conversation.** Two-pane on desktop; single-pane stack on mobile.
7. **Mute decoration.** No glass, gradients on chrome, or marketing hero patterns inside chat.
8. **Theming is user-owned.** Themes are first-class; product stays flexible.
9. **Touch-first spacing.** Even on desktop, hit targets stay generous.
10. **Unread is a simple badge.** Counts and bold titles — no elaborate status systems.

## Token Notes (Observed)

| Role | Typical treatment |
|---|---|
| Brand / accent | `#2AABEE` / `#0088CC` blue |
| Dialog list bg | White or deep `#17212B` |
| Chat bg | Soft pattern or solid `#0E1621` / light gray |
| Outgoing bubble | Brand-blue tint |
| Incoming bubble | Neutral gray/white |
| Radius | Large on bubbles (12–18px), circular avatars |
| Elevation | Soft, low shadows; not material-card heavy |

## Differentiators

- Extreme simplicity relative to Slack/Discord.
- Bubble model reads as personal messaging, not workplace.
- Theme marketplace makes visual identity user-customizable.

## What Works

- Near-zero learning curve for chat.
- Fast perceived performance and low visual noise.
- Strong brand recognition via blue + paper-plane mark.

## UX Breakdowns

- Bubble model poorly fits long-form work artifacts (patches, intents, reviews).
- Weak information hierarchy for multi-role collaboration (maintainer vs agent vs reporter).
- Desktop power workflows (search, multi-account, folders) can still feel secondary.
- Theming freedom can produce inconsistent third-party skins.

## Epoch Steal / Reject

| Steal | Reject |
|---|---|
| Content-first, low chrome | Message bubbles for work artifacts |
| Single restrained accent discipline | Circular avatar dominance over role meta |
| Instant feedback on send/actions | Sticker/media-first visual center |
| Generous but clean touch targets | Pure personal-chat mental model |
