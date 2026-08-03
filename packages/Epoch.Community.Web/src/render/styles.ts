import { epochTokensCss } from "@epoch/design-tokens";

export function communityStyles(): string {
  return `${epochTokensCss}

    :root {
      --epoch-shadow-low: 0 1px 0 rgba(15, 22, 20, 0.04);
      --epoch-space-2: var(--epoch-space-md);
      --epoch-space-3: var(--epoch-space-lg);
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
      inset-block-start: var(--epoch-space-3);
      inset-inline-start: var(--epoch-space-3);
      z-index: 20;
      padding: var(--epoch-space-2) var(--epoch-space-3);
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

    .channel-rail {
      display: grid;
      grid-template-rows: auto auto auto auto 1fr auto;
      gap: 0.55rem;
      padding: 0.75rem 0.55rem;
      border-inline-end: 1px solid #1c2622;
      background: var(--epoch-color-rail);
      color: var(--epoch-color-rail-text);
      overflow: hidden;
    }
    .rail-section-label {
      padding: 0.35rem 0.55rem 0.1rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.68rem;
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
      display: grid;
      align-content: start;
      gap: 0.4rem;
      min-height: 0;
      overflow: hidden;
    }
    .community-workspace-chrome .channel-list {
      max-height: min(20rem, 40vh);
      overflow-y: auto;
    }
    .product-mode-list {
      border-block-end: 1px solid #1c2622;
      padding-block-end: 0.4rem;
    }
    .community-button[aria-pressed="true"]::before,
    .channel-button[aria-pressed="true"]::before {
      content: "";
      position: absolute;
      inset-block: 0.35rem;
      inset-inline-start: 0;
      width: 2px;
      border-radius: 1px;
      background: var(--epoch-color-accent);
    }
    .repo-surface-list {
      border-block-start: 1px solid #1c2622;
      padding-block-start: 0.35rem;
    }

    .brand {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      align-items: center;
      padding: 0.2rem 0.4rem 0.35rem;
      color: inherit;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 1.85rem;
      height: 1.85rem;
      border-radius: var(--epoch-radius-sm);
      background: #1f3d34;
      color: #e8f3ee;
      font-size: 0.68rem;
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .brand-text { display: grid; gap: 0.05rem; min-width: 0; }
    .brand-name {
      font-size: 0.92rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      color: var(--epoch-color-rail-muted);
      font-size: 0.72rem;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .surface-list,
    .channel-list {
      display: grid;
      align-content: start;
      gap: 0.1rem;
      min-width: 0;
    }
    .channel-list { overflow-y: auto; }
    .surface-button,
    .channel-button {
      position: relative;
      display: flex;
      width: 100%;
      min-height: 2rem;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.3rem 0.55rem;
      border: 0;
      border-radius: var(--epoch-radius-sm);
      background: transparent;
      color: var(--epoch-color-rail-muted);
      cursor: pointer;
      font: inherit;
      font-size: 0.88rem;
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
      color: #fff;
      font-weight: 650;
    }
    .surface-list {
      padding-block-end: 0.4rem;
      margin-block-end: 0.1rem;
      border-block-end: 1px solid #1c2622;
    }
    .channel-button-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .agent-list {
      display: grid;
      gap: 0.15rem;
      padding: 0 0.35rem 0.45rem;
    }
    .agent-member {
      flex-direction: column;
      align-items: stretch;
      gap: 0.1rem;
      min-height: auto;
      padding-block: 0.35rem;
    }
    .agent-meta {
      color: var(--epoch-color-rail-muted);
      font-size: 0.68rem;
      font-weight: 500;
    }
    .agent-list-empty {
      margin: 0;
      padding: 0.25rem 0.45rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.72rem;
    }
    .avatar-agent {
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
      font-size: 0.65rem;
    }
    .agent-harness,
    .agent-managed-by {
      color: var(--epoch-color-muted);
      font-size: 0.72rem;
      font-weight: 600;
    }
    .agent-harness {
      padding: 0.05rem 0.35rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-surface-sunken);
    }
    .message-artifact-card {
      display: grid;
      gap: 0.2rem;
      margin: 0.45rem 0;
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
    }
    .message-artifact-kind {
      color: var(--epoch-color-muted);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .message-artifact-link {
      color: var(--epoch-color-teal);
      font-size: 0.82rem;
      font-weight: 650;
      text-decoration: none;
    }
    .message-artifact-link:hover {
      text-decoration: underline;
    }
    .agent-working-status {
      flex: 1 1 auto;
      min-width: 0;
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 600;
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
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      text-align: end;
    }
    .surface-button[aria-pressed="true"] .channel-count,
    .channel-button[aria-pressed="true"] .channel-count {
      color: #c5d2cb;
    }

    .rail-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.55rem;
      color: var(--epoch-color-rail-muted);
      font-size: 0.76rem;
      font-weight: 600;
      border-block-start: 1px solid #1c2622;
    }
    .status-dot {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: var(--epoch-color-success);
    }
    .status-dot-muted { background: var(--epoch-color-gold); }

    .feed-shell {
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      background: var(--epoch-color-surface-raised);
    }

    .feed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .feed-heading { min-width: 0; }
    .feed-header h1 {
      max-width: none;
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .feed-repo {
      margin: 0.1rem 0 0;
      color: var(--epoch-color-muted);
      font-size: 0.75rem;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    }
    .repository-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      align-items: center;
      gap: 0.35rem;
      max-width: 34rem;
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 500;
      line-height: 1.3;
      text-align: end;
    }
    .repository-meta .meta-sep {
      color: #a8b3ad;
      font-weight: 400;
    }
    .repository-meta .meta-sep::before { content: "·"; }
    .identity-chip {
      display: inline-flex;
      flex-direction: column;
      align-items: end;
      gap: 0.05rem;
      padding: 0.2rem 0.45rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
      text-align: end;
    }
    .identity-handle {
      color: var(--epoch-color-ink);
      font-weight: 700;
      font-size: 0.78rem;
    }
    .identity-did {
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.68rem;
      font-weight: 500;
    }
    .identity-auth-note {
      color: var(--epoch-color-muted);
      font-size: 0.64rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .identity-chip[data-auth-state="sample-session"],
    .identity-chip[data-auth-state="unauthenticated"] {
      border-style: dashed;
    }
    .identity-chip[data-auth-state="api-session"] {
      border-style: solid;
      border-color: var(--epoch-color-line);
    }
    .identity-chip[data-auth-state="authenticated"] {
      border-style: solid;
      border-color: var(--epoch-color-accent);
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
      padding: 0.3rem 0.55rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      font: inherit;
      font-size: 0.82rem;
    }
    .receipt-search input:focus {
      outline: 2px solid var(--epoch-color-accent);
      outline-offset: 1px;
    }
    .receipt-search-status {
      flex: 0 1 auto;
      color: var(--epoch-color-muted);
      font-size: 0.72rem;
      font-weight: 600;
    }
    .message-promote-receipt {
      display: grid;
      gap: 0.15rem;
      margin: 0.45rem 0 0.35rem;
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--epoch-color-line);
      border-inline-start: 3px solid var(--epoch-color-accent);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-sunken);
    }
    .promote-receipt-label {
      color: var(--epoch-color-muted);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .message-promote-receipt strong {
      color: var(--epoch-color-ink);
      font-size: 0.86rem;
    }
    .promote-receipt-state {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 600;
    }
    .feed-message[data-search-hit="true"] {
      box-shadow: inset 3px 0 0 var(--epoch-color-accent);
    }

    .api-banner {
      margin: 0;
      padding: 0.5rem 1.15rem;
      border-block-end: 1px solid #e0c991;
      background: var(--epoch-color-warning-bg);
      color: var(--epoch-color-warning-ink);
      font-size: 0.82rem;
      font-weight: 650;
    }
    .api-banner-live {
      border-block-end-color: #b7d8c8;
      background: var(--epoch-color-mint);
      color: #1a4a3c;
    }

    .feed-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem 0.75rem;
      min-width: 0;
      padding: 0.45rem 1.15rem;
      border-block-end: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }
    .channel-name {
      flex: 0 0 auto;
      color: var(--epoch-color-ink);
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .channel-topic {
      flex: 1 1 10rem;
      min-width: 0;
      color: var(--epoch-color-muted);
      font-size: 0.84rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .members-strip {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.3rem;
      margin-inline-start: auto;
      color: var(--epoch-color-muted);
      font-size: 0.72rem;
      font-weight: 600;
    }
    .members-label {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.66rem;
    }
    .member-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      border-radius: 999px;
      background: var(--epoch-color-mint);
      color: var(--epoch-color-success);
      font-size: 0.62rem;
      font-weight: 700;
    }
    .members-count {
      color: var(--epoch-color-muted);
      font-weight: 500;
      max-width: 11rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .surface-stage {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-height: 0;
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
      gap: 0.15rem;
      padding: 0.45rem 1.15rem 0;
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
      font-size: 0.86rem;
      font-weight: 600;
      padding: 0.55rem 0.7rem;
    }
    .feed-tab:hover {
      color: var(--epoch-color-ink);
    }
    .feed-tab[aria-selected="true"] {
      color: var(--epoch-color-ink);
      border-block-end-color: var(--epoch-color-accent);
    }

    .dev-feed {
      margin: 0;
      padding: 0.25rem 0 1rem;
      overflow-y: auto;
      list-style: none;
    }
    .dev-feed-item {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: 0.5rem;
      padding: 0.38rem 1.15rem;
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
      gap: 0.28rem;
      min-width: 0;
    }
    .dev-feed-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.35rem;
      color: var(--epoch-color-muted);
      font-size: 0.82rem;
    }
    .dev-feed-handle {
      color: var(--epoch-color-ink);
      font-size: 0.92rem;
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
      color: #2d3531;
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .dev-feed-trust {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.7rem;
    }
    .dev-feed-trust span + span::before {
      content: "·";
      margin-inline-end: 0.35rem;
      color: #a0aaa4;
    }
    .dev-feed-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-block-start: 0.1rem;
    }
    .dev-feed-action {
      appearance: none;
      display: inline-flex;
      align-items: center;
      min-height: 1.7rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      cursor: pointer;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 0.15rem 0.55rem;
    }
    .dev-feed-action:hover {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
    }

    .message-feed {
      margin: 0;
      padding: 0.25rem 0 0.5rem;
      overflow-y: auto;
      list-style: none;
    }

    .feed-message {
      position: relative;
      display: grid;
      grid-template-columns: 2.15rem minmax(0, 1fr);
      gap: 0.6rem;
      padding: 0.4rem 1.15rem;
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
      background: #1f3d34;
      color: #e8f3ee;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .message-body {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 0.22rem;
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
      gap: 0.35rem;
    }
    .message-meta {
      color: var(--epoch-color-muted);
      font-size: 0.76rem;
    }
    .message-meta strong {
      color: var(--epoch-color-ink);
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .message-body h2 {
      margin: 0;
      color: var(--epoch-color-ink);
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .message-body p {
      max-width: 70ch;
      margin: 0;
      color: #2d3531;
      font-size: 0.94rem;
      line-height: 1.5;
    }
    .message-footer {
      color: var(--epoch-color-muted);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.7rem;
      opacity: 0.92;
    }
    .message-footer span + span::before {
      content: "·";
      margin-inline-end: 0.35rem;
      color: #a0aaa4;
    }
    [data-proposal-link] {
      color: var(--epoch-color-teal);
      font-weight: 700;
    }
    [data-snapshot-badge] {
      border: 1px solid #d4c49a;
      border-radius: var(--epoch-radius-xs);
      background: var(--epoch-color-warning-bg);
      color: var(--epoch-color-warning-ink);
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.05rem 0.3rem;
    }
    .reaction-row {
      gap: 0.28rem;
      margin-top: 0.15rem;
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
      font-size: 0.76rem;
      font-weight: 600;
      padding: 0.12rem 0.45rem;
      pointer-events: auto;
    }
    .reaction:hover {
      border-color: #b0bfb7;
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
      gap: 0.5rem;
      margin-block-start: 0.3rem;
      padding: 0.55rem 0.6rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface);
    }
    .message-action-tray dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      margin: 0;
    }
    .message-action-tray dt {
      color: var(--epoch-color-muted);
      font-size: 0.66rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .message-action-tray dd {
      margin: 0.12rem 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.72rem;
      word-break: break-word;
    }
    .message-action-tray button,
    .composer button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-ink);
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
    }
    .message-action-tray button:hover,
    .composer button:hover {
      background: var(--epoch-color-accent-strong);
      border-color: var(--epoch-color-accent-strong);
    }
    .message-action-tray button:active,
    .composer button:active {
      filter: brightness(0.96);
    }
    .message-action-tray button:not([data-action="intent"]) {
      border-color: #b0bfb7;
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
    }
    .message-action-tray button:not([data-action="intent"]):hover {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
      filter: none;
    }
    .message-action-tray button[data-action="intent"] {
      background: var(--epoch-color-teal);
      border-color: #215955;
    }
    .message-action-tray button[data-action="intent"]:hover {
      background: #32807c;
      border-color: #215955;
      filter: none;
    }
    .action-status {
      margin: 0;
      color: var(--epoch-color-muted);
      font-size: 0.82rem;
    }

    .composer {
      display: grid;
      gap: 0.35rem;
      padding: 0.7rem 1.15rem 0.9rem;
      border-block-start: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
      box-shadow: var(--epoch-shadow-low);
    }
    .composer-label {
      color: var(--epoch-color-muted);
      font-size: 0.76rem;
      font-weight: 600;
    }
    .composer-share {
      border: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      color: var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      padding: 0.4rem 0.7rem;
      font: inherit;
      font-size: 0.82rem;
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
      padding: 0.55rem 0.7rem;
    }
    .composer textarea:focus {
      border-color: var(--epoch-color-accent);
      outline: 2px solid color-mix(in srgb, var(--epoch-color-accent) 35%, transparent);
      outline-offset: 0;
    }
    .composer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      color: var(--epoch-color-muted);
      font-size: 0.74rem;
    }
    .composer button {
      min-height: 2rem;
      padding: 0.3rem 0.85rem;
      font-size: 0.8rem;
    }

    .artifact-list {
      margin: 0;
      padding: 0.65rem 1.15rem 1rem;
      overflow-y: auto;
      list-style: none;
      display: grid;
      align-content: start;
      gap: 0;
    }
    .artifact-item {
      display: grid;
      gap: 0.1rem;
      padding: 0.55rem 0;
      border-block-end: 1px solid var(--epoch-color-line);
      background: transparent;
    }
    .artifact-item:last-child {
      border-block-end: 0;
    }
    .artifact-id {
      color: var(--epoch-color-teal);
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .artifact-item strong {
      color: var(--epoch-color-ink);
      font-size: 0.92rem;
    }
    .artifact-meta,
    .artifact-labels {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
    }
    .artifact-empty {
      color: var(--epoch-color-muted);
      font-weight: 600;
    }
    .artifact-actions {
      margin-top: 0.3rem;
    }
    .thread-comments {
      display: grid;
      gap: 0.3rem;
      margin: 0.15rem 0 0.05rem;
      padding: 0.4rem 0.55rem;
      border-left: 2px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      border-radius: 0 var(--epoch-radius-sm) var(--epoch-radius-sm) 0;
    }
    .thread-comment {
      color: #2d3531;
      font-size: 0.86rem;
      line-height: 1.4;
    }
    .thread-comment strong {
      color: var(--epoch-color-ink);
      font-weight: 700;
      margin-inline-end: 0.3rem;
    }

    #community-content section[aria-label="Epoch site history"] {
      margin: 0.65rem 1.15rem 1rem;
      padding: 0.7rem 0.85rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-mint);
    }
    #community-content section[aria-label="Epoch site history"] h2 {
      margin: 0 0 0.3rem;
      font-size: 0.92rem;
    }
    #community-content section[aria-label="Epoch site history"] p,
    #community-content section[aria-label="Epoch site history"] dl {
      margin: 0;
      color: #2d3531;
      font-size: 0.82rem;
    }
    .site-history-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.65rem 1rem;
      padding-block-start: 0.7rem;
    }
    .site-history-fact { min-width: 0; }
    .site-history-fact dt {
      color: var(--epoch-color-muted);
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .site-history-fact dd {
      margin: 0.15rem 0 0;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 0.74rem;
      overflow-wrap: anywhere;
    }

    @media (max-width: 800px) {
      html, body {
        max-width: 100%;
        overflow-x: hidden;
      }
      #epoch-community {
        grid-template-columns: 1fr;
        height: auto;
        min-height: 100vh;
        max-width: 100%;
        overflow-x: hidden;
      }
      .channel-rail {
        grid-template-rows: auto;
        gap: 0.35rem;
        max-height: 38vh;
        border-inline-end: 0;
        border-block-end: 1px solid #1c2622;
        overflow-x: hidden;
        overflow-y: auto;
        max-width: 100%;
      }
      .site-history-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .community-list,
      .community-workspace-chrome .channel-list,
      .agent-list,
      .repo-list {
        grid-auto-columns: max-content;
        grid-auto-flow: column;
        max-height: none;
        overflow-x: auto;
        overflow-y: hidden;
        padding-block-end: 0.15rem;
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
        align-items: start;
        flex-direction: column;
        gap: 0.35rem;
      }
      .repository-meta {
        justify-content: start;
        max-width: none;
        text-align: start;
      }
      .feed-shell { min-height: 70vh; min-width: 0; }
      .message-action-tray dl { grid-template-columns: 1fr; }
    }

    @media (max-width: 800px) and (max-height: 600px) {
      .channel-rail {
        max-height: 32vh;
        overflow-y: auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }`;
}
