# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ranked, confirmed with the product owner. One interface serves all three; it is
legible to the first by default and reveals power to the second in context,
rather than being three products.

1. **Citizen builder (primary).** Building in the open without deep
   version-control fluency. Contributes ideas, writing, design, translations,
   testing, and sometimes code. Needs contribution paths that do not require git
   vocabulary, equal credit for non-code work, plain-language trust signals, and
   confidence that experimenting cannot break the real project.
2. **Maintainer (secondary).** Holds stewardship, review, moderation, and
   release responsibility, and now also supervises agent participants
   contributing concurrently. Needs review clarity, moderation transparency,
   contribution-volume control from humans and agents, project-health signal,
   and reduced burnout.
3. **Community member (tertiary).** Follows projects and people, asks and
   answers questions, attends events, celebrates releases, and may never
   contribute a change. Needs one central place for community life instead of
   scattered chat and social apps, followable work-in-progress, welcoming
   discussion norms, and visible milestones.

Two further audiences are real but not design leads: platform operators
deploying Community for an org, and security/compliance responders accountable
for signing evidence and incident response.

## Product Purpose

Epoch is a signed, event-driven distributed version control system — a
successor to Git. **Epoch.Community.Web is to Epoch what GitHub is to Git**: the
community experience built on the DVCS.

It exists because developers already talk about their work everywhere except
where the work lives — chat in Discord and Slack, announcements on X, questions
that used to go to Stack Overflow, long-form on Reddit. Today's forges suit none
of those interactions, and they make following a person's in-progress work,
welcoming non-code contributors, and celebrating a release as a community
milestone harder than it should be.

Success is that a conversation can become signed work without leaving the place
the conversation happened, and that the person who contributed the idea is
credited as visibly as the person who wrote the code.

## Positioning

The mechanism a neighboring product cannot truthfully copy: **conversation and
work share one substrate, and the link between them is cryptographic rather than
editorial.** A message can be promoted to a signed intent that carries its own
provenance — who said it, what it anchored to, who reviewed it — and that
lineage is verifiable rather than a rendered breadcrumb.

Slack and Discord own the conversation but cannot sign work. GitHub and GitLab
own the work but treat conversation as commentary attached to it. Neither can
claim the promotion path without adopting a signed event log underneath.

The defining artifact is the **epoch**: a point-in-time materialization of what
the community built, credited to everyone who took part. It gives the product
its name.

## Operating Context

- **Communities own channels.** A community space owns social and work channels;
  no repository is required to talk in `#general` or `#showcase`. Repositories
  appear under a community as *linked projects*, secondary to the hangout.
- **Three planes.** Community (default home, channels), Network Feed
  (cross-community ATProto discovery — follows, stars, releases, contributions),
  and Linked project (issues and change proposals for a repository).
- **Agents are members, not features.** Policy-bound agents participate in
  channels under a named human supervisor and a declared harness. Human review
  is required before agent work merges.
- **Identity is portable.** ATProto handles and DIDs; an Epoch session and an AT
  OAuth link are separate facts and the product must not conflate them.
- **Degraded operation is normal.** The app runs against a live Community API or
  falls back to snapshot data, and must state which without ambiguity.
- **Sibling apps.** Operations Web (moderation and operator surfaces) and
  Platform Web (control plane that deploys Community Web) are separate apps in
  the same family and are in scope for a shared design language.

## Capabilities and Constraints

Confirmed and shipping:

- Channel feed with composer, receipt search across channels in a community,
  message selection with a signed action tray (mark intent, request agent,
  accept answer, docs patch, report), provenance disclosure, promote-to-intent
  with receipts, moderation queue, unread watermarks, deep links.
- Issues and change proposals for a linked repository; approve-change flow.
- Network feed tabs (following / all / contributions).
- Canonical Nightboard browser app with a CanvasUI creator landing and a
  tmux-style, keyboard-first collaboration board.

Technical constraints that bind design:

- The canonical app is a static multi-file Nightboard runtime. The local server
  and Vercel build copy the same source files; a second rendered shell is not an
  allowed entrypoint.
- Accessibility is gated: axe-core must be clean at 1440×960 and 390×844.
- Behavior is specified in executable Gherkin; scenarios are the contract.

Undecided on purpose: theming beyond Nightboard Grid, i18n execution.
Dark product UI is allowed for Nightboard under ADR-0027 (amends ADR-0024).

## Brand Commitments

- Names are binding: **Epoch**, **Epoch.Community.Web**, and the **epoch** as
  the credited materialization artifact. Product vocabulary — intent, anchor,
  receipt, signer, promote, linked project, member agent — is established and
  should be treated as terminology, not copy to reword.
- **Honesty is the brand.** The product must never present sample or snapshot
  content as live activity, never imply an identity link it does not have, and
  never claim review that did not happen. This constrains visual design: state
  must be legible, not decorative.
- **Visual world is Nightboard (Grid)** — Tron-inspired keyboard-first TUI.
  Living reference: `docs/design-explorations/nightboard/`. Contract:
  [ADR-0027](docs/design-decisions/0027-community-visual-world-nightboard.md).
  Course Line (ADR-0026) is superseded and archived. Nightboard is the shipped
  Community Web runtime; Impeccable iterates directly on those files.

## Evidence on Hand

- **Committed visual reference:** `docs/design-explorations/nightboard/`
  (keyboard-first Tron/TUI board). Older explorations under
  `docs/design-explorations/` remain historical.
- Design contract and named rules: `DESIGN.md` (Nightboard / ADR-0027).
- Persona records: `docs/persona-feature-matrix.md`, `.optimizexp/personas/`.
- Human-centered design method and critique protocol:
  `docs/community-human-centered-design.md`.
- Running application with seeded data: `node scripts/serve-community-web-local.mjs`.
- Accessibility evidence: `docs/evidence/community-web/axe.json`.

Absences that must not be fabricated: there are **no real users, no usage
analytics, no testimonials, and no production deployment**. All people,
communities, repositories, and conversations in the product are fictional
fixtures. Any design that implies adoption, activity volume, or social proof
would be inventing evidence.

## Product Principles

1. **Conversation is the product; work is what it becomes.** The path from a
   message to signed work is the thing being designed. Anything that makes the
   hangout feel like a lobby in front of a forge is wrong.
2. **Credit the contribution, not the commit.** An idea, a test, a translation,
   and a patch are all contributions and should be equally representable.
3. **State the truth about state.** Live versus snapshot, signed versus
   unsigned, reviewed versus unreviewed, human versus agent — each must be
   legible without being narrated.
4. **Power is revealed, not removed.** A newcomer must not meet the
   maintainer's control surface first, and a maintainer must not have to leave
   to find it.
5. **Agents are accountable members.** Agent participation always shows its
   supervisor and its review requirement; it is never rendered as automation
   happening off-screen.

## Accessibility & Inclusion

- WCAG 2.1 AA is the gate, enforced by axe-core at desktop and mobile viewports
  on every change.
- Color must never be the only carrier of state (live/stale, signed/unsigned,
  moderation).
- Touch targets: 32px floor, 36px for primary actions.
- Reduced motion and zoom must be honored; content text must wrap rather than
  clip at narrow widths.
- Cognitive-load sensitivity is a stated persona need: the primary user has
  minutes, not hours, and low tolerance for jargon.
