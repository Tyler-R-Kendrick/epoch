import { epochTokensCss } from "@epoch/design-tokens";

export function communityStyles(): string {
  return `${epochTokensCss}

    :root {
      --epoch-shadow-low: 0 1px 0 rgba(15, 22, 20, 0.04);
      --rail-width: 15.5rem;
      font-family: var(--epoch-font-ui);
      font-size: 16px;
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
    }

    * { box-sizing: border-box; }
    [hidden] { display: none !important; }

    html, body {
      margin: 0;
      height: 100%;
    }

    body {
      min-width: 320px;
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    a { color: inherit; text-decoration: none; }
    a:hover { color: var(--epoch-color-accent-strong); }
    a:focus-visible,
    button:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 2px;
    }

    .skip-link {
      position: fixed;
      inset-block-start: var(--epoch-space-lg);
      inset-inline-start: var(--epoch-space-lg);
      z-index: 20;
      padding: var(--epoch-space-md) var(--epoch-space-lg);
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      transform: translateY(-160%);
    }
    .skip-link:focus-visible { transform: none; }

    #epoch-community {
      display: grid;
      grid-template-columns: var(--rail-width) minmax(0, 1fr);
      height: 100vh;
      min-height: 100vh;
      background: var(--epoch-color-surface);
    }

    /* Order-independent, like .feed-shell. The positional template
       (auto auto auto auto 1fr auto) assumed six children forever: hiding the
       workspace chrome on the Network plane shifted every child up a track, so
       the status block inherited the 1fr row and stretched, leaving ~384px of
       orphaned black. */
    .channel-rail {
      display: flex;
      flex-direction: column;
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-md) var(--epoch-space-sm);
      border-inline-end: 1px solid var(--epoch-color-rail-line);
      background: var(--epoch-color-rail);
      color: var(--epoch-color-rail-text);
      overflow: hidden;
    }
    .channel-rail > * {
      flex: none;
    }
    .channel-rail > .community-workspace-chrome {
      flex: 1 1 auto;
      min-height: 0;
    }
    .rail-section-label {
      padding: var(--epoch-space-xs) var(--epoch-space-sm) 0.1rem;
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .community-list,
    .repo-list {
      display: grid;
      align-content: start;
      gap: 0.1rem;
      min-width: 0;
      max-height: 7.5rem;
      overflow-y: auto;
    }
    .community-workspace-chrome {
      display: flex;
      flex-direction: column;
      gap: var(--epoch-space-sm);
      min-height: 0;
      overflow: hidden;
    }
    .community-workspace-chrome .channel-list {
      /* Scrolls within the rail and takes the space the fixed sections do not
         need. The fade tells you the list continues; a row sliced in half at the
         boundary reads as a layout accident instead. */
      flex: 1 1 auto;
      min-height: 6rem;
      overflow-y: auto;
      mask-image: linear-gradient(to bottom, black calc(100% - 1.1rem), transparent 100%);
    }
    .product-mode-list {
      border-block-end: 1px solid var(--epoch-color-rail-line);
      padding-block-end: var(--epoch-space-sm);
    }
    /* The control circle, not a side-tab: orienteering marks a control with a
       ring you run to, and the shape is what carries the meaning. */
    .community-button[aria-pressed="true"]::before,
    .channel-button[aria-pressed="true"]::before {
      content: "";
      position: absolute;
      inset-inline-start: 0.3rem;
      inset-block-start: 50%;
      translate: 0 -50%;
      width: 0.5rem;
      height: 0.5rem;
      border: 2px solid var(--epoch-color-control);
      border-radius: 50%;
    }
    .community-button[aria-pressed="true"],
    .channel-button[aria-pressed="true"] { padding-inline: 1.5rem var(--epoch-space-sm); }
    .repo-surface-list {
      border-block-start: 1px solid var(--epoch-color-rail-line);
      padding-block-start: var(--epoch-space-xs);
    }

    .brand {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--epoch-space-sm);
      align-items: center;
      padding: var(--epoch-space-xs) var(--epoch-space-sm) var(--epoch-space-xs);
      color: inherit;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 1.85rem;
      height: 1.85rem;
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-avatar);
      color: var(--epoch-color-avatar-ink);
      font-size: var(--epoch-type-meta-size);
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .brand-text { display: grid; gap: 0.05rem; min-width: 0; }
    .brand-name {
      font-size: var(--epoch-type-body-size);
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    }

    .surface-list,
    .channel-list {
      display: grid;
      align-content: start;
      gap: 0.1rem;
      min-width: 0;
    }
    .channel-list { overflow-y: auto; }
    .surface-list {
      padding-block-end: var(--epoch-space-sm);
      margin-block-end: 0.1rem;
      border-block-end: 1px solid var(--epoch-color-rail-line);
    }
    .surface-button,
    .channel-button {
      position: relative;
      display: flex;
      width: 100%;
      min-height: 2rem;
      align-items: center;
      justify-content: space-between;
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-xs) var(--epoch-space-sm);
      border: 0;
      border-radius: var(--epoch-radius-sm);
      background: transparent;
      color: var(--epoch-color-rail-muted);
      cursor: pointer;
      font: inherit;
      font-size: var(--epoch-type-body-size);
      font-weight: 500;
      text-align: start;
    }
    .surface-button:hover,
    .channel-button:hover {
      background: var(--epoch-color-rail-hover);
      color: var(--epoch-color-rail-text);
    }
    .surface-button[aria-pressed="true"],
    .channel-button[aria-pressed="true"] {
      background: var(--epoch-color-rail-active);
      color: var(--epoch-color-ink);
      font-weight: 700;
      box-shadow: inset 0 0 0 1px var(--epoch-color-line);
    }
    .channel-button-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-list {
      /* Capped like the community list. Agents are members you check on, not
         the thing you navigate with; channels get the rail's spare height. */
      flex: none;
      max-height: 6.5rem;
      overflow-y: auto;
      display: grid;
      gap: var(--epoch-space-xs);
      padding: 0 var(--epoch-space-xs) var(--epoch-space-sm);
    }
    .agent-member {
      /* Agent rows are navigation, not labels: they carry the same touch floor
         as every other control (they were 26px). */
      min-height: 2rem;
    }
    .agent-meta {
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 500;
      /* One line: the rail is narrow, and "needs-review" breaking at its
         hyphen read as a layout accident. The full value stays in the
         button's accessible name. */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-list-empty {
      margin: 0;
      padding: var(--epoch-space-xs) var(--epoch-space-sm);
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
    }
    .avatar-agent {
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
      font-size: var(--epoch-type-meta-size);
    }
    .agent-harness,
    .agent-managed-by {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 600;
    }
    .agent-harness {
      padding: 0.05rem var(--epoch-space-xs);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-surface-sunken);
    }
    .message-artifact-card {
      display: grid;
      gap: var(--epoch-space-xs);
      margin: var(--epoch-space-sm) 0;
      padding: var(--epoch-space-sm) var(--epoch-space-sm);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
    }
    .message-artifact-kind {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .message-artifact-link {
      color: var(--epoch-color-teal);
      font-size: var(--epoch-type-label-size);
      font-weight: 650;
      text-decoration: none;
    }
    .message-artifact-link:hover {
      text-decoration: underline;
    }
    .agent-working-status {
      /* Was a full-width sunken slab louder than the primary action beside it. */
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-meta-weight);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-working-status[data-agent-sample="true"] {
      color: var(--epoch-color-muted);
      border-color: var(--epoch-color-line);
      background: var(--epoch-color-surface-sunken);
    }
    .agent-working-status[data-agent-live="true"] {
      color: var(--epoch-color-success);
    }
    .channel-count {
      flex: 0 0 auto;
      min-width: 1.25rem;
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
    .surface-button[aria-pressed="true"] .channel-count,
    .channel-button[aria-pressed="true"] .channel-count {
      color: var(--epoch-color-rail-text);
    }

    .rail-status {
      display: flex;
      align-items: center;
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-sm) var(--epoch-space-sm);
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-label-size);
      font-weight: 600;
      border-block-start: 1px solid var(--epoch-color-rail-line);
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-success);
    }
    .status-dot-muted { background: var(--epoch-color-gold); }

    .feed-shell {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      background: var(--epoch-color-surface-raised);
    }
    /* Chrome keeps its content height and the visible stage absorbs the rest.
       Order-independent on purpose: a positional grid template silently gave
       the flexible row to the toolbar the first time a banner was added. */
    .feed-shell > * {
      flex: none;
    }
    .feed-shell > .surface-stage {
      flex: 1 1 auto;
      min-height: 0;
    }

    .feed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--epoch-space-lg);
      padding: var(--epoch-space-md) 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .feed-heading { min-width: 0; }
    .feed-header h1 {
      max-width: none;
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .feed-repo {
      margin: 0.1rem 0 0;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    }
    .repository-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      align-items: center;
      gap: var(--epoch-space-xs);
      max-width: 34rem;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
      font-weight: 500;
      line-height: 1.3;
      text-align: end;
    }
    .repository-meta .meta-sep {
      color: var(--epoch-color-ink-faint);
      font-weight: 400;
    }
    .repository-meta .meta-sep::before { content: "·"; }
    .identity-chip {
      display: flex;
      flex-direction: column;
      align-items: start;
      gap: 0.05rem;
      width: 100%;
      padding: var(--epoch-space-sm);
      border: 0;
      border-block-start: 1px solid var(--epoch-color-rail-line);
      border-radius: 0;
      background: transparent;
      text-align: start;
    }
    .identity-handle {
      color: var(--epoch-color-rail-text);
      font-weight: 700;
      font-size: var(--epoch-type-label-size);
      /* ellipsis needs nowrap: without it a long handle wraps instead. */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .identity-did {
      color: var(--epoch-color-rail-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: var(--epoch-type-meta-size);
      font-weight: 500;
    }
    .identity-auth-note {
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    /* Auth state was carried by border style on a card that no longer exists.
       It now rides on the handle: copper marks a real AT session. */
    .identity-chip[data-auth-state="authenticated"] .identity-handle {
      color: var(--epoch-color-accent);
    }
    @media (max-width: 720px) {
      .identity-did {
        /* Collapse DID under handle on narrow viewports; full DID remains in title. */
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .identity-chip {
        position: relative;
      }
      .members-count {
        display: none;
      }
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .receipt-search {
      display: inline-flex;
      flex: 0 1 12rem;
      min-width: 8rem;
      align-items: center;
    }
    .receipt-search input {
      width: 100%;
      min-height: 2rem;
      padding: var(--epoch-space-xs) var(--epoch-space-sm);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      font: inherit;
      font-size: var(--epoch-type-label-size);
    }
    .receipt-search input:focus {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 1px;
    }
    .receipt-search-status {
      flex: 0 1 auto;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 600;
    }
    .message-promote-receipt {
      display: grid;
      gap: var(--epoch-space-xs);
      margin: var(--epoch-space-sm) 0 var(--epoch-space-xs);
      padding: var(--epoch-space-sm) var(--epoch-space-sm);
      border: 1px solid var(--epoch-color-control);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
    }
    .promote-receipt-label {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .message-promote-receipt strong {
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-label-size);
    }
    .promote-receipt-state {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
      font-weight: 600;
    }
    .feed-message[data-search-hit="true"] {
      box-shadow: inset 3px 0 0 var(--epoch-color-accent);
    }

    .api-banner {
      margin: 0;
      padding: var(--epoch-space-sm) 1.15rem;
      border-block-end: 1px solid var(--epoch-color-warning-line);
      background: var(--epoch-color-warning-bg);
      color: var(--epoch-color-warning-ink);
      font-size: var(--epoch-type-label-size);
      font-weight: 650;
    }
    .api-banner[data-feed-honesty="live-empty"] {
      border-block-end-color: var(--epoch-color-mint-strong);
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
    }

    .feed-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--epoch-space-sm) var(--epoch-space-md);
      min-width: 0;
      padding: var(--epoch-space-sm) 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .channel-name {
      flex: 0 0 auto;
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .channel-topic {
      flex: 1 1 10rem;
      min-width: 0;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .members-strip {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: var(--epoch-space-xs);
      margin-inline-start: auto;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 600;
    }
    .members-label {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: var(--epoch-type-meta-size);
    }
    .member-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
    }
    .members-count {
      color: var(--epoch-color-muted);
      font-weight: 500;
      /* Wide enough for the honest provenance phrase; truncating it to
         "…from rec…" turned a trust signal into noise. */
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .surface-stage {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      /* A grid item's automatic minimum size is its content, so without these
         the stage grew to its widest message and the feed was clipped by the
         shell's overflow rather than wrapping. */
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
      min-width: 0;
      height: 100%;
    }
    .surface-stage:has(.artifact-list) {
      grid-template-rows: auto minmax(0, 1fr);
    }
    .surface-stage[data-surface-panel="network"] {
      grid-template-rows: auto minmax(0, 1fr);
    }

    .feed-tabs {
      display: flex;
      gap: var(--epoch-space-xs);
      padding: var(--epoch-space-sm) 1.15rem 0;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .feed-tab {
      appearance: none;
      border: 0;
      border-block-end: 2px solid transparent;
      background: transparent;
      color: var(--epoch-color-muted);
      cursor: pointer;
      font: inherit;
      font-size: var(--epoch-type-label-size);
      font-weight: 600;
      padding: var(--epoch-space-sm) var(--epoch-space-md);
    }
    .feed-tab:hover {
      color: var(--epoch-color-ink);
    }
    .feed-tab[aria-selected="true"] {
      color: var(--epoch-color-ink);
      font-weight: 700;
      border-block-end-color: var(--epoch-color-ink);
    }

    .dev-feed {
      margin: 0;
      padding: var(--epoch-space-xs) 0 var(--epoch-space-lg);
      overflow-y: auto;
      list-style: none;
    }
    .dev-feed-item {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-sm) 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
    }
    .dev-feed-item:hover {
      background: var(--epoch-color-surface);
    }
    .dev-feed-item:last-child {
      border-block-end: 0;
    }
    .dev-feed-empty {
      display: block;
      color: var(--epoch-color-muted);
      font-weight: 600;
    }
    .dev-feed-body {
      display: grid;
      gap: var(--epoch-space-xs);
      min-width: 0;
    }
    .dev-feed-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--epoch-space-xs);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
    }
    .dev-feed-handle {
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-body-size);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .dev-feed-verb {
      color: var(--epoch-color-muted);
      font-weight: 500;
    }
    .dev-feed-object,
    .dev-feed-object-text {
      color: var(--epoch-color-teal);
      font-weight: 700;
    }
    .dev-feed-object {
      appearance: none;
      border: 0;
      background: transparent;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      color: var(--epoch-color-teal);
      padding: 0;
      text-align: start;
    }
    .dev-feed-object:hover {
      color: var(--epoch-color-accent-strong);
      text-decoration: underline;
    }
    .dev-feed-meta time {
      margin-inline-start: auto;
      font-variant-numeric: tabular-nums;
    }
    .dev-feed-body p {
      max-width: 70ch;
      margin: 0;
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-body-size);
      line-height: 1.45;
    }
    .dev-feed-trust {
      display: flex;
      flex-wrap: wrap;
      gap: var(--epoch-space-xs);
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: var(--epoch-type-meta-size);
    }
    .dev-feed-trust span + span::before {
      content: "·";
      margin-inline-end: var(--epoch-space-xs);
      color: var(--epoch-color-ink-faint);
    }
    .dev-feed-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--epoch-space-xs);
      margin-block-start: 0.1rem;
    }
    .dev-feed-action:hover {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
    }

    .message-feed { background: var(--epoch-color-surface-raised); }
    .message-feed {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: var(--epoch-space-xs) 0 var(--epoch-space-sm);
      min-width: 0;
      overflow-y: auto;
      list-style: none;
    }

    /* Signed anchors and at:// URIs are long unbroken tokens; they must wrap
       rather than widen the feed past the viewport. */
    .message-footer span,
    .row-heading,
    .message-body p {
      overflow-wrap: anywhere;
    }

    .feed-message {
      position: relative;
      display: grid;
      grid-template-columns: 2.15rem minmax(0, 1fr);
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-sm) 1.15rem;
      border-block: 1px solid transparent;
    }
    .feed-message:hover {
      background: var(--epoch-color-surface);
      border-block-color: transparent;
    }
    .feed-message[data-selected-message="true"] {
      background: var(--epoch-color-surface-sunken);
    }

    .message-hitbox {
      position: absolute;
      inset: 0;
      z-index: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .avatar {
      position: relative;
      z-index: 1;
      display: grid;
      width: 2.1rem;
      height: 2.1rem;
      place-items: center;
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-avatar);
      color: var(--epoch-color-avatar-ink);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
    }
    .message-body {
      position: relative;
      z-index: 1;
      display: grid;
      gap: var(--epoch-space-xs);
      min-width: 0;
      pointer-events: none;
    }
    .message-body button { pointer-events: auto; }

    .message-meta,
    .message-footer,
    .reaction-row,
    .action-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--epoch-space-xs);
    }
    .message-meta {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
    }
    .message-meta strong {
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-body-size);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .row-heading-legacy {
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .message-body p {
      max-width: 70ch;
      margin: 0;
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-body-size);
      line-height: 1.5;
    }
    /* The anchor/signature line duplicated what the provenance disclosure and
       the action tray already show — three renderings of the same fields, and
       on the network plane the trust string was longer than the message. */
    .message-footer span:not([data-intent-meta]):not([data-proposal-link]) { display: none; }
    .message-footer .signature-mark { display: inline; }
    .message-footer {
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: var(--epoch-type-meta-size);
      opacity: 0.92;
    }
    .message-footer span + span::before {
      content: "·";
      margin-inline-end: var(--epoch-space-xs);
      color: var(--epoch-color-ink-faint);
    }
    [data-proposal-link] {
      color: var(--epoch-color-teal);
      font-weight: 700;
    }
    [data-snapshot-badge] {
      border: 1px solid var(--epoch-color-warning-line);
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-warning-bg);
      color: var(--epoch-color-warning-ink);
      font-size: var(--epoch-type-meta-size);
      font-weight: 600;
      padding: 0.05rem var(--epoch-space-xs);
    }
    .reaction-row {
      gap: var(--epoch-space-xs);
      margin-top: var(--epoch-space-xs);
    }
    .reaction {
      display: inline-flex;
      align-items: center;
      min-height: 1.75rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      cursor: pointer;
      font: inherit;
      font-size: var(--epoch-type-label-size);
      font-weight: 600;
      padding: 0.12rem var(--epoch-space-sm);
      pointer-events: auto;
    }
    .reaction:hover {
      border-color: var(--epoch-color-line-strong);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
    }
    .reaction:active {
      background: var(--epoch-color-surface-sunken);
    }
    .reaction:focus-visible {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 1px;
    }

    .message-action-tray {
      display: grid;
      gap: var(--epoch-space-sm);
      margin-block-start: var(--epoch-space-xs);
      padding: var(--epoch-space-sm) var(--epoch-space-sm);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
    }
    .message-action-tray dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--epoch-space-sm);
      margin: 0;
    }
    .message-action-tray dt {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .message-action-tray dd {
      margin: 0.12rem 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: var(--epoch-type-meta-size);
      word-break: break-word;
    }
    .message-action-tray button:active,
    .composer button:active {
      filter: brightness(0.96);
    }
    .action-status {
      margin: 0;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
    }

    /* The Composer Never Leaves Rule, actually implemented. It was never sticky
       on any viewport; on a phone it sat ~100px below the fold. */
    .composer[data-composer-available="false"] textarea {
      background: var(--epoch-color-surface);
      color: var(--epoch-color-muted);
      cursor: not-allowed;
    }
    .composer[data-composer-available="false"] .button-primary {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .composer {
      position: sticky;
      inset-block-end: 0;
      z-index: 2;
      display: grid;
      gap: var(--epoch-space-xs);
      padding: var(--epoch-space-sm) 1.15rem;
      padding-block-end: calc(var(--epoch-space-sm) + env(safe-area-inset-bottom, 0px));
      border-block-start: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .composer-label {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
      font-weight: 600;
    }
    .composer-share {
      border: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      padding: var(--epoch-space-sm) var(--epoch-space-md);
      font: inherit;
      font-size: var(--epoch-type-label-size);
      font-weight: 600;
      cursor: pointer;
    }
    .composer-share:hover {
      border-color: var(--epoch-color-teal);
      color: var(--epoch-color-teal);
    }
    .composer textarea {
      width: 100%;
      min-height: 2.75rem;
      resize: vertical;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      font: inherit;
      line-height: 1.45;
      padding: var(--epoch-space-sm) var(--epoch-space-md);
    }
    .composer textarea:focus {
      border-color: var(--epoch-color-accent);
      outline: 2px solid color-mix(in srgb, var(--epoch-color-accent) 35%, transparent);
      outline-offset: 0;
    }
    .composer-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--epoch-space-md);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
    }
    .artifact-list {
      display: grid;
      align-content: start;
      gap: 0;
      margin: 0;
      /* The row owns the gutter now; this list added a second one. */
      padding: 0 0 var(--epoch-space-lg);
      list-style: none;
      min-width: 0;
      overflow-y: auto;
    }
    .artifact-item {
      display: grid;
      gap: 0.1rem;
      padding: var(--epoch-space-sm) 0;
      border-block-end: 1px solid var(--epoch-color-line);
      background: transparent;
    }
    .artifact-item:last-child {
      border-block-end: 0;
    }
    .artifact-id {
      color: var(--epoch-color-teal);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
    }
    .artifact-item strong {
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-body-size);
    }
    .artifact-meta,
    .artifact-labels {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
    }
    .artifact-empty {
      color: var(--epoch-color-muted);
      font-weight: 600;
    }
    .artifact-actions {
      margin-top: var(--epoch-space-xs);
    }
    /* Proof wonder: a promoted message and the change it became read as one
       contribution, connected by the action colour that earned the link. */
    .lineage-link {
      padding: 0;
      border: 0;
      background: none;
      color: var(--epoch-color-accent);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-label-weight);
      text-decoration: underline;
      cursor: pointer;
    }
    [data-lineage-origin="true"],
    [data-lineage-target="true"] {
      position: relative;
      background: var(--epoch-color-surface-sunken);
    }
    [data-lineage-origin="true"]::before,
    [data-lineage-target="true"]::before {
      content: "";
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      width: 2px;
      background: var(--epoch-color-accent);
    }

    /* Header: one liveness statement, and the phone's way into the rail. */
    .rail-toggle {
      display: none;
      min-width: var(--epoch-space-xxl);
      min-height: var(--epoch-space-xxl);
      padding: 0;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      cursor: pointer;
    }
    .state-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--epoch-space-xs);
      padding: 0 var(--epoch-space-sm);
      min-height: var(--epoch-space-xl);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-meta-weight);
    }
    .state-dot {
      width: 6px;
      height: 6px;
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-success);
    }
    .state-chip[data-state="snapshot"] .state-dot,
    .state-chip[data-state="live-empty"] .state-dot {
      background: var(--epoch-color-gold);
    }
    .rail-identity {
      margin-block-start: auto;
      padding-block-start: var(--epoch-space-sm);
      border-block-start: 1px solid var(--epoch-color-rail-line);
    }

    /* Proof wonder: the page states, truthfully, that it is an Epoch artifact. */
    .site-seal {
      border-block-start: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
    }
    .site-seal summary {
      display: flex;
      align-items: center;
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-sm) var(--epoch-space-lg);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      cursor: pointer;
    }
    .site-seal summary::-webkit-details-marker { display: none; }
    .site-seal-mark {
      color: var(--epoch-color-gold);
    }
    .site-seal-line {
      font-family: var(--epoch-font-mono);
      overflow-wrap: anywhere;
    }
    .site-seal-body {
      display: grid;
      gap: var(--epoch-space-md);
      padding: 0 var(--epoch-space-lg) var(--epoch-space-md);
    }
    .site-seal-body p {
      margin: 0;
      max-width: 70ch;
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-body-size);
      line-height: var(--epoch-type-body-leading);
    }
    .site-seal-chain {
      display: grid;
      gap: var(--epoch-space-xs);
      margin: 0;
      padding-inline-start: var(--epoch-space-lg);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
    }
    .site-seal-chain code {
      color: var(--epoch-color-teal);
      font-family: var(--epoch-font-mono);
    }

    /* Proof wonder: the signature is a disclosure, not decoration. Copper is
       earned here because a signature is the one thing this product proves. */
    .signature-mark {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .signature-mark::after {
      content: "";
      position: absolute;
      inset-inline: 0;
      inset-block-end: -2px;
      height: 1px;
      background: var(--epoch-color-accent);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .signature-mark:hover::after,
    .signature-mark:focus-visible::after,
    .signature-mark[aria-expanded="true"]::after {
      transform: scaleX(1);
    }
    .signature-provenance {
      margin-block-start: var(--epoch-space-xs);
      padding: var(--epoch-space-sm) var(--epoch-space-md);
      border-inline-start: 2px solid var(--epoch-color-accent);
      background: var(--epoch-color-surface);
      border-radius: var(--epoch-radius-sm);
    }
    .signature-provenance dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
      gap: var(--epoch-space-xs) var(--epoch-space-md);
      margin: 0;
    }
    .signature-provenance dt {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-label-weight);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .signature-provenance dd {
      margin: 0;
      color: var(--epoch-color-ink);
      font-family: var(--epoch-font-mono);
      font-size: var(--epoch-type-meta-size);
      overflow-wrap: anywhere;
    }
    .signature-provenance[data-provenance-revealed="true"] {
      animation: provenance-reveal 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes provenance-reveal {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: none; }
    }

    /* ── One row primitive ──────────────────────────────────────────────────
       Replaces .feed-message / .dev-feed-item / .artifact-item, which were
       164 / 59-133 / 83px tall with text origins at 42.4 / 40.4 / 18.4px,
       gaps of 8px vs 1.6px, and dividers transparent / solid / solid. */
    .row {
      position: relative;
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: var(--epoch-space-sm);
      padding: var(--epoch-space-sm) 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
    }
    .row:hover { background: var(--epoch-color-surface); }
    .row[data-selected-message="true"] { background: var(--epoch-color-surface-sunken); }
    .row-lead {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-avatar);
      color: var(--epoch-color-avatar-ink);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-label-weight);
      letter-spacing: 0.01em;
    }
    /* People are deep green, agents are mint: the two member kinds are told
       apart by hue, not by reading a label. */
    .row-lead-agent {
      background: var(--epoch-color-mint);
      color: var(--epoch-color-teal-deep);
    }
    .row-lead-empty { background: none; }
    /* Above the full-bleed selection hitbox so tray and action buttons receive
       their own clicks. */
    .row-body { position: relative; z-index: 1; display: grid; gap: 0.15rem; min-width: 0; }
    .row-lead { position: relative; z-index: 1; }
    .row-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--epoch-space-xs) var(--epoch-space-sm);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
    }
    .row-actor {
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      font-weight: var(--epoch-type-title-weight);
      letter-spacing: -0.01em;
    }
    /* Rows without an author (issues, changes, network objects) keep the object
       as the strongest text — the rule is about message rows. */
    .row:has(.row-actor) .row-title,
    .row:has(.row-actor) .row-heading {
      font-size: var(--epoch-type-body-size);
      font-weight: 650;
    }
    .row-heading { margin: 0; }
    .row-heading,
    .row-title,
    .row-object {
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      font-weight: var(--epoch-type-title-weight);
      line-height: var(--epoch-type-title-leading);
      overflow-wrap: anywhere;
    }
    .row-message-text {
      display: block;
      max-width: 70ch;
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-body-size);
      font-weight: var(--epoch-type-body-weight);
      line-height: var(--epoch-type-body-leading);
      overflow-wrap: anywhere;
      text-align: start;
    }
    .row-select {
      display: flex;
      align-items: center;
      min-height: 2rem;
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      text-align: start;
    }
    .row-object {
      display: inline-flex;
      align-items: center;
      min-height: var(--epoch-space-xxl);
      padding: 0;
      border: 0;
      background: none;
      color: var(--epoch-color-ink);
      text-decoration: underline;
      text-underline-offset: 0.18em;
      text-decoration-thickness: 1px;
      cursor: pointer;
      text-align: start;
    }
    .row-object:hover { text-decoration-thickness: 2px; }
    .row-text {
      margin: 0;
      max-width: 70ch;
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-body-size);
      line-height: var(--epoch-type-body-leading);
      overflow-wrap: anywhere;
    }
    /* Anchors are mono meta per DESIGN 3, and quiet per the Author First Rule:
       the trust line is the quietest text in the row, not a badge. */
    .row-anchor {
      display: flex;
      align-items: center;
      gap: var(--epoch-space-xs);
      margin: 0;
      color: var(--epoch-color-muted);
      font-family: var(--epoch-font-mono);
      font-size: var(--epoch-type-meta-size);
      overflow-wrap: anywhere;
    }
    .row-anchor-mark {
      flex: none;
      width: 3px;
      height: 0.85rem;
      border-radius: 1px;
      background: var(--epoch-color-line-strong);
    }
    .row-foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--epoch-space-xs) var(--epoch-space-md);
      padding-block-start: var(--epoch-space-xs);
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
    }
    .row-foot-facts { display: flex; flex-wrap: wrap; gap: var(--epoch-space-sm); }
    .row-foot-actions { display: flex; flex-wrap: wrap; gap: var(--epoch-space-xs); }
    .row-receipt-mark {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-inline-end: var(--epoch-space-xs);
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-gold);
    }
    .row-id {
      min-height: var(--epoch-space-xxl);
      padding: 0;
      border: 0;
      background: none;
      color: var(--epoch-color-muted);
      font-family: var(--epoch-font-mono);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-label-weight);
      cursor: pointer;
    }
    .row-state { color: var(--epoch-color-muted); }
    .row-state:empty { display: none; }

    .row.row-state,
    .row-origin {
      grid-template-columns: minmax(0, 1fr);
      border-block-end: 1px solid var(--epoch-color-line);
    }
    .row.row-state { padding-block: var(--epoch-space-xl) var(--epoch-space-md); }
    .row-origin {
      gap: var(--epoch-space-xs);
      padding-block: 3.5rem var(--epoch-space-lg);
    }
    .row-origin-title {
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-headline-size);
      font-weight: var(--epoch-type-display-weight);
      line-height: var(--epoch-type-headline-leading);
      letter-spacing: var(--epoch-type-headline-tracking);
    }
    .row-origin-note {
      margin: 0;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-label-size);
      font-weight: var(--epoch-type-label-weight);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    /* ── The legend (DESIGN 2) ───────────────────────────────────────────── */
    /* Permanent and identical on every plane. It is what lets the interface
       stop explaining itself, so it is chrome that earns its space. */
    .legend {
      flex: none;
      margin-block-start: auto;
      padding-block: var(--epoch-space-xs);
      border-block-start: 1px solid var(--epoch-color-rail-line);
    }
    .legend .rail-section-label { padding-block: var(--epoch-space-xs) 0.05rem; }
    .legend-list {
      display: grid;
      gap: 0.05rem;
      margin: 0 0 var(--epoch-space-xs);
      padding: 0 var(--epoch-space-sm);
      list-style: none;
    }
    .legend-list + .legend-list {
      padding-block-start: var(--epoch-space-xs);
      border-block-start: 1px dotted var(--epoch-color-rail-line);
    }
    .legend-entry {
      display: grid;
      grid-template-columns: 0.85rem minmax(0, 1fr);
      gap: var(--epoch-space-xs);
      align-items: center;
      min-height: 1.15rem;
    }
    .legend-swatch {
      width: 1rem;
      height: 0.7rem;
      border: 1px solid var(--epoch-color-line-strong);
    }
    /* Shape carries the meaning alongside hue, so the legend itself obeys the
       rule that state is never colour-alone. */
    .legend-swatch[data-legend-shape="ring"] {
      width: 0.7rem;
      height: 0.7rem;
      border-width: 2px;
      border-radius: 50%;
      background: none !important;
    }
    .legend-swatch[data-legend-shape="mark"] {
      width: 0.45rem;
      height: 0.45rem;
      border: 0;
      border-radius: var(--epoch-radius-xs);
    }
    .legend-swatch-runnable { background: var(--epoch-color-runnable); }
    .legend-swatch-rough { background: var(--epoch-color-rough); }
    .legend-swatch-marsh { background: var(--epoch-color-marsh); }
    .legend-swatch-control { border-color: var(--epoch-color-control); }
    .legend-swatch-out-of-bounds { border-color: var(--epoch-color-out-of-bounds); }
    .legend-swatch-gold { background: var(--epoch-color-gold); }
    .legend-label {
      color: var(--epoch-color-rail-muted);
      font-size: var(--epoch-type-meta-size);
      font-family: var(--epoch-font-ui);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 800px) { .legend { display: none; } }

    /* ── Terrain (DESIGN 2: the legend) ──────────────────────────────────── */
    /* Social channels are runnable, work channels are rough. The ground is read
       before the label, which is how a legend saves a sentence. */
    .channel-button[data-channel-kind="social"] {
      box-shadow: inset 3px 0 0 var(--epoch-color-runnable), inset 4px 0 0 var(--epoch-color-line-strong);
    }
    .channel-button[data-channel-kind="work"] { box-shadow: inset 3px 0 0 var(--epoch-color-rough-strong); }
    .channel-button[aria-pressed="true"][data-channel-kind] { box-shadow: inset 0 0 0 1px var(--epoch-color-line); }

    /* Marsh marks a message anchored to something concrete. Terrain is ground,
       never text weight, so it rides as a tint behind the notation. The element
       itself arrives with the inline-anchor change (PR #97); this is the world
       it lands in. */
    .row-anchor {
      align-self: start;
      justify-self: start;
      width: fit-content;
      max-width: 100%;
      padding: .12rem .4rem;
      background: var(--epoch-color-marsh);
      border: 1px solid var(--epoch-color-marsh-strong);
      color: var(--epoch-color-ink);
    }
    .row-anchor-mark { display: none; }

    /* The reserved course. Focus and the promote path wear control; nothing
       else may. */
    a:focus-visible,
    button:focus-visible,
    textarea:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--epoch-color-control);
      outline-offset: 2px;
    }
    .row[data-selected-message="true"] { background: var(--epoch-color-surface); box-shadow: inset 3px 0 0 var(--epoch-color-control); }

    /* ── Tonal layering (DESIGN 5: tonal first, shadows rare) ─────────────── */
    /* Chrome recedes to surface; the feed advances to raised white. Before this
       every band rendered white, so shell and content read as one flat plane. */
    .feed-header,
    .feed-toolbar,
    .composer {
      background: var(--epoch-color-surface);
    }
    .feed-shell { background: var(--epoch-color-surface); }
    .surface-stage { background: var(--epoch-color-surface-raised); }
    .dev-feed,
    .artifact-list { background: var(--epoch-color-surface-raised); }

    /* ── Four button treatments, not thirteen ─────────────────────────────── */
    .button-primary,
    .button-intent,
    .button-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      /* DESIGN button-primary specifies 36px; critical actions prefer >=36. */
      min-height: 2.25rem;
      padding: 0 var(--epoch-space-md);
      border-radius: var(--epoch-radius-sm);
      border: 1px solid transparent;
      font: inherit;
      font-size: var(--epoch-type-label-size);
      font-weight: var(--epoch-type-label-weight);
      cursor: pointer;
    }
    /* The primary action is the end of the course, so it wears the control ink.
       This is the canonical declaration; an earlier duplicate shadowed it and
       primaries silently rendered ink. */
    .button-primary {
      background: var(--epoch-color-control);
      border-color: var(--epoch-color-control);
      color: var(--epoch-color-surface-raised);
    }
    .button-primary:hover {
      background: var(--epoch-color-accent-strong);
      border-color: var(--epoch-color-accent-strong);
    }
    .button-intent {
      background: var(--epoch-color-teal);
      border-color: var(--epoch-color-teal-deep);
      color: var(--epoch-color-surface-raised);
    }
    .button-chip {
      background: var(--epoch-color-surface-raised);
      border-color: var(--epoch-color-line-strong);
      color: var(--epoch-color-ink);
    }
    .button-quiet {
      min-height: var(--epoch-space-xxl);
      padding: 0 var(--epoch-space-sm);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-muted);
      font: inherit;
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-meta-weight);
      cursor: pointer;
    }
    .button-quiet:hover { color: var(--epoch-color-ink); border-color: var(--epoch-color-line-strong); }

    /* Empty / loading / error state system — one voice across every list. */
    .state-block {
      display: grid;
      gap: var(--epoch-space-xs);
      padding: var(--epoch-space-lg) var(--epoch-space-md);
      max-width: 46ch;
    }
    .state-title {
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-title-size);
      font-weight: var(--epoch-type-title-weight);
      line-height: var(--epoch-type-title-leading);
    }
    .state-action {
      margin: 0;
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-body-size);
      line-height: var(--epoch-type-body-leading);
    }
    .state-block[data-state-tone="degraded"] .state-title {
      color: var(--epoch-color-warning-ink);
    }
    .state-retry {
      justify-self: start;
      min-height: var(--epoch-space-xxl);
      padding: var(--epoch-space-xs) var(--epoch-space-md);
      border: 1px solid var(--epoch-color-line-strong);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      font-size: var(--epoch-type-label-size);
      font-weight: var(--epoch-type-label-weight);
    }
    .feed-state {
      display: block;
      border-block-end: 0;
    }
    .artifact-empty .state-block,
    .dev-feed-empty .state-block {
      padding-inline: 0;
    }
    /* Search match highlight — teal marks the query, copper stays reserved. */
    .message-body mark {
      padding: 0 var(--epoch-space-xs);
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-mint);
      color: var(--epoch-color-teal-deep);
    }
    /* Unread: count text plus a mark, never colour alone — and never the
       reserved course ink, which belongs to the promote path, not to state. */
    .channel-unread {
      min-width: var(--epoch-space-lg);
      padding: 0 var(--epoch-space-xs);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-ink);
      color: var(--epoch-color-surface-raised);
      font-size: var(--epoch-type-meta-size);
      font-weight: var(--epoch-type-label-weight);
      text-align: center;
    }
    .channel-button[data-channel-has-unread="true"] .channel-button-label {
      font-weight: var(--epoch-type-label-weight);
      color: var(--epoch-color-rail-text);
    }
    /* First-run orientation strip — a strip, never a modal or a tour. */
    .thread-comments {
      display: grid;
      gap: var(--epoch-space-xs);
      margin: var(--epoch-space-xs) 0 0.05rem;
      padding: var(--epoch-space-sm) var(--epoch-space-sm);
      border-left: 2px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      border-radius: 0 var(--epoch-radius-sm) var(--epoch-radius-sm) 0;
    }
    .thread-comment {
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-label-size);
      line-height: 1.4;
    }
    .thread-comment strong {
      color: var(--epoch-color-ink);
      font-weight: 700;
      margin-inline-end: var(--epoch-space-xs);
    }

    #community-content section[aria-label="Epoch site history"] {
      margin: var(--epoch-space-md) 1.15rem var(--epoch-space-lg);
      padding: var(--epoch-space-md) var(--epoch-space-md);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-mint);
    }
    #community-content section[aria-label="Epoch site history"] h2 {
      margin: 0 0 var(--epoch-space-xs);
      font-size: var(--epoch-type-body-size);
    }
    #community-content section[aria-label="Epoch site history"] p,
    #community-content section[aria-label="Epoch site history"] dl {
      margin: 0;
      color: var(--epoch-color-ink-soft);
      font-size: var(--epoch-type-label-size);
    }
    .site-history-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--epoch-space-md) var(--epoch-space-lg);
      padding-block-start: var(--epoch-space-md);
    }
    .site-history-fact { min-width: 0; }
    .site-history-fact dt {
      color: var(--epoch-color-muted);
      font-size: var(--epoch-type-meta-size);
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .site-history-fact dd {
      margin: var(--epoch-space-xs) 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: var(--epoch-type-meta-size);
      overflow-wrap: anywhere;
    }

    @media (max-width: 800px) {
      html, body {
        max-width: 100%;
        overflow-x: hidden;
      }
      #epoch-community {
        grid-template-columns: 1fr;
        height: 100dvh;
        min-height: 100dvh;
        max-width: 100%;
        overflow-x: hidden;
      }
      /* The rail becomes a sheet. Four stacked horizontal scrollers with
         mid-word clipping were eating 83% of the first screen; navigation now
         costs one 32px control until you ask for it. */
      .rail-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      #epoch-community {
        position: relative;
      }
      .channel-rail {
        position: fixed;
        inset-block: 0;
        inset-inline-start: 0;
        z-index: 30;
        width: min(84vw, 20rem);
        transform: translateX(-101%);
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        overflow-y: auto;
      }
      #epoch-community[data-rail-open="true"] .channel-rail {
        transform: none;
      }
      #epoch-community[data-rail-open="true"]::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 20;
        background: color-mix(in srgb, var(--epoch-color-ink) 45%, transparent);
      }
      /* In a sheet the rail is a normal vertical list again — the horizontal
         scroller strips only existed to survive a 38vh height cap. */
      .community-workspace-chrome {
        grid-template-columns: minmax(0, 1fr);
        column-gap: var(--epoch-space-sm);
        row-gap: var(--epoch-space-xs);
      }
      .channel-rail > .brand,
      .channel-rail > .product-mode-list,
      .channel-rail > .community-workspace-chrome,
      .channel-rail > .rail-status {
        grid-column: 1 / -1;
      }
      .rail-section-label {
        padding: 0 0 0 var(--epoch-space-sm);
      }
      .channel-rail .brand {
        padding-block: var(--epoch-space-xs);
      }
      .rail-status {
        padding-block: var(--epoch-space-xs);
      }
      .site-history-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .community-list,
      .community-workspace-chrome .channel-list,
      .agent-list,
      .repo-list {
        /* Vertical, as the sheet comment above always claimed. The horizontal
           scrollers clipped mid-word (# su⌐, goose · sa⌐) and hid 6 of 9
           channels behind a sideways swipe inside a vertical drawer. */
        grid-auto-flow: row;
        max-height: none;
        overflow-x: hidden;
        overflow-y: visible;
        padding-block-end: var(--epoch-space-xs);
      }
      .feed-toolbar {
        min-width: 0;
      }
      .receipt-search {
        flex: 1 1 auto;
        min-width: 0;
        max-width: 100%;
      }
      .receipt-search input {
        min-width: 0;
        width: 100%;
      }
      .feed-header {
        align-items: center;
        flex-direction: row;
        gap: var(--epoch-space-sm);
        padding-block: var(--epoch-space-sm);
      }
      /* One line of place on a phone: the channel context lives in the surface
         header directly below, so repeating it here is pure chrome. */
      .feed-header .feed-repo { display: none; }
      .feed-header h1 {
        font-size: var(--epoch-type-title-size);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .repository-meta {
        justify-content: start;
        max-width: none;
        text-align: start;
      }
      /* Surface header is one row on a phone: the topic sentence and the
         signer strip were costing two extra rows above the first message. */
      .feed-toolbar .channel-topic,
      .feed-toolbar .members-strip { display: none; }
      .feed-toolbar { gap: var(--epoch-space-sm); }
      /* Send is the only thing in the composer row that must never shrink. */
      .composer-row .agent-working-status { display: none; }
      .composer-meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .composer-row > button { flex: none; }
      .feed-shell { min-height: 70vh; min-width: 0; }
      .message-action-tray dl { grid-template-columns: 1fr; }
    }

    @media (max-width: 800px) and (max-height: 600px) {
      .channel-rail {
        max-height: 32vh;
        overflow-y: auto;
      }
    }

    /* Row-level secondary controls run at the contract's 32px floor rather than
       the 36px reserved for primary actions; at 36px each row grew to 188px. */
    .row-foot .button-chip,
    .row-foot .reaction {
      min-height: 2rem;
      padding: 0 var(--epoch-space-sm);
      font-size: var(--epoch-type-meta-size);
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }`;
}
