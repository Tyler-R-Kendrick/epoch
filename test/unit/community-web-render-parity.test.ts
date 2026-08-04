import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import {
  createCommunityWebApp,
  messageMatchesReceiptSearch,
  renderCommunityWebDocument,
} from "@epoch/community-web";
import { JSDOM, VirtualConsole } from "jsdom";

interface DefectLedger {
  readonly defects: readonly {
    readonly id: string;
    readonly status: "open" | "closed";
  }[];
}

function defectIsOpen(ledger: DefectLedger, id: string): boolean {
  const defect = ledger.defects.find((item) => item.id === id);
  if (!defect) {
    throw new Error(`defect ${id} missing from .optimizexp/defects.json — ledger and tests drifted`);
  }
  return defect.status === "open";
}

// Server and client render the same conversations through two independent code paths.
// Until they are unified into one isomorphic view layer, this test is the tripwire:
// while a drift defect is open in the ledger it documents the drift; the moment the
// defect is marked closed, the drifted signature becomes a hard failure if it returns.
export async function runCommunityWebRenderParityTests(): Promise<void> {
  const ledger = JSON.parse(
    readFileSync(join(process.cwd(), ".optimizexp/defects.json"), "utf8"),
  ) as DefectLedger;

  const app = await createCommunityWebApp({
    client: createInMemoryCommunityApi({
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        maintainers: ["alice"],
      }],
    }),
    apiBaseUrl: "https://community.test",
  });
  const html = renderCommunityWebDocument(app);

  serverSocialMessagesCarryTheFullActionTray(html);
  clientSocialTrayParity(html, ledger);
  await clientSearchUsesTheTestedHelper(html, ledger);
}

function serverSocialMessagesCarryTheFullActionTray(html: string): void {
  // The server renderer is the parity contract: signed actions exist on first paint.
  assert.match(html, /data-action="intent"/u);
  assert.match(html, /data-action="agent"/u);
  assert.match(html, /data-action="report"/u);
}

function clientSocialTrayParity(html: string, ledger: DefectLedger): void {
  // Drift signature: the client social-message builder replaces the whole action tray
  // with this static paragraph, so live refreshes strip signed actions.
  const driftSignature = "Community channel message.";
  const drifted = html.includes(driftSignature);
  if (defectIsOpen(ledger, "EPX-D001")) {
    assert.equal(
      drifted,
      true,
      "EPX-D001 is open but its drift signature is gone — close the defect with evidence instead of leaving the ledger stale",
    );
    return;
  }
  assert.equal(
    drifted,
    false,
    "EPX-D001 is closed but the client social builder still ships a trayless action tray",
  );
}

async function clientSearchUsesTheTestedHelper(html: string, ledger: DefectLedger): Promise<void> {
  // Drift signature: applyChannelFilter re-implements matching inline instead of
  // executing the exported, unit-tested messageMatchesReceiptSearch helper.
  //
  // Reading the bundle text proves only that a name appears in it; a dead
  // reference or a renamed-but-diverged copy would pass. So run the shipped
  // document in a DOM, drive the real search input, and compare the rows the
  // runtime actually hides against what the helper says should match.
  // No live API in a unit test: fail fetch so boot takes its documented degraded
  // path instead of throwing, and keep the virtual console off the test output.
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://community.test/",
    virtualConsole,
    beforeParse(win) {
      (win as unknown as { fetch: () => Promise<never> }).fetch = () =>
        Promise.reject(new Error("offline in unit test"));
    },
  });
  const { window } = dom;
  try {
    await new Promise<void>((resolve) => {
      if (window.document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });

    const input = window.document.querySelector("[data-receipt-search]") as HTMLInputElement | null;
    assert.ok(input, "shipped document has no receipt search input to drive");
    const rows = (): HTMLElement[] =>
      Array.from(window.document.querySelectorAll("[data-message-id]")) as HTMLElement[];
    assert.ok(rows().length > 0, "shipped document rendered no message rows to filter");

    // The runtime searches receipts across channels within the active community.
    // Derive that community from what is visible before searching, so the
    // expectation models the documented behaviour rather than a looser one.
    const activeCommunity = rows().find((row) => !row.hidden)?.dataset.communityId;

    const query = "welcome";
    input.value = query;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    const runtimeVisible = rows().filter((row) => !row.hidden).map((row) => row.dataset.messageId);
    const helperVisible = rows()
      .filter((row) => !row.dataset.communityId || row.dataset.communityId === activeCommunity)
      .filter((row) => messageMatchesReceiptSearch((row.textContent || "").toLowerCase(), query))
      .map((row) => row.dataset.messageId);
    const agrees =
      runtimeVisible.length > 0 && runtimeVisible.join("\u0000") === helperVisible.join("\u0000");

    if (defectIsOpen(ledger, "EPX-D004")) {
      assert.equal(
        agrees,
        false,
        "EPX-D004 is open but the runtime now matches the tested helper — close the defect with evidence instead of leaving the ledger stale",
      );
      return;
    }
    assert.ok(
      runtimeVisible.length > 0,
      "EPX-D004 is closed but searching the shipped runtime hid every row",
    );
    assert.deepEqual(
      runtimeVisible,
      helperVisible,
      "EPX-D004 is closed but the shipped runtime filters differently than messageMatchesReceiptSearch",
    );
  } finally {
    window.close();
  }
}
