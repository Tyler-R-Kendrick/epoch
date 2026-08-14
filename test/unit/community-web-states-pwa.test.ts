import assert from "node:assert/strict";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import {
  createCommunityWebApp,
  renderServiceWorker,
  renderWebManifest,
} from "@epoch/community-web";
import { createRequire } from "node:module";
import { join } from "node:path";

const {
  asListState,
  renderChannelOrigin,
  renderEmptyState,
  renderErrorState,
  renderLoadingState,
  renderSearchZeroState,
} = createRequire(__filename)(join(process.cwd(), "packages/Epoch.Community.Web/dist/view/states.js")) as {
  asListState: (stateHtml: string, itemClass: string, options?: { readonly hidden?: boolean }) => string;
  renderChannelOrigin: (channel: string) => string;
  renderEmptyState: (input: { readonly title: string; readonly action?: string; readonly tone?: "invite" | "degraded" }) => string;
  renderErrorState: (input: {
    readonly what: string;
    readonly why?: string;
    readonly retryLabel?: string;
    readonly retryAction?: string;
  }) => string;
  renderLoadingState: (label: string) => string;
  renderSearchZeroState: (query: string) => string;
};

export async function runCommunityWebStatesPwaTests(): Promise<void> {
  emptyLoadingAndErrorStatesNameTheObjectAndNextVerb();
  pwaManifestAndServiceWorkerStayHonestAboutTheShell();
}

function emptyLoadingAndErrorStatesNameTheObjectAndNextVerb(): void {
  const empty = renderEmptyState({
    title: "No messages in #showcase yet.",
    action: "Write the first one.",
  });
  assert.match(empty, /data-state-kind="empty"/u);
  assert.match(empty, /data-state-tone="invite"/u);
  assert.match(empty, /No messages in #showcase yet/u);
  assert.match(empty, /Write the first one/u);

  const degraded = renderEmptyState({
    title: "Search index is rebuilding.",
    tone: "degraded",
  });
  assert.match(degraded, /data-state-tone="degraded"/u);
  assert.doesNotMatch(degraded, /state-action/u);

  const loading = renderLoadingState("Loading receipts");
  assert.match(loading, /data-state-kind="loading"/u);
  assert.match(loading, /Loading receipts/u);

  const error = renderErrorState({
    what: "Could not load the board",
    why: "the API returned 503",
    retryLabel: "Try again",
    retryAction: "reload-board",
  });
  assert.match(error, /data-state-kind="error"/u);
  assert.match(error, /Could not load the board — the API returned 503/u);
  assert.match(error, /data-state-retry="reload-board"/u);

  const listed = asListState(empty, "feed-state", { hidden: true });
  assert.match(listed, /<li class="feed-state" data-state-item hidden>/u);

  const zero = renderSearchZeroState("parser");
  assert.match(zero, /No receipts match “parser”/u);
  assert.match(zero, /Search covers messages, Changes/u);

  const origin = renderChannelOrigin("showcase");
  assert.match(origin, /data-channel-origin/u);
  assert.match(origin, /#&nbsp;showcase/u);
  assert.match(origin, /Start of the channel/u);
}

async function pwaManifestAndServiceWorkerStayHonestAboutTheShell(): Promise<void> {
  const app = await createCommunityWebApp({
    client: createInMemoryCommunityApi({
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        maintainers: ["alice"],
      }],
    }),
  });
  const manifest = JSON.parse(renderWebManifest(app)) as {
    name: string;
    start_url: string;
    display: string;
  };
  assert.equal(manifest.name, "Epoch Community");
  assert.equal(manifest.start_url, app.pwa.startUrl);
  assert.equal(manifest.display, "standalone");

  const worker = renderServiceWorker(app);
  assert.match(worker, /epoch-community-shell-v1/u);
  assert.match(worker, /network-first|fetch\(request\)/u);
  assert.match(worker, /cached API response must never be/u);
}
