import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { createCommunityWebApp, renderCommunityWebDocument } from "@epoch/community-web";

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
  clientSearchUsesTheTestedHelper(html, ledger);
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

function clientSearchUsesTheTestedHelper(html: string, ledger: DefectLedger): void {
  // Drift signature: applyChannelFilter re-implements matching inline instead of
  // executing the exported, unit-tested messageMatchesReceiptSearch helper.
  const usesHelper = /function messageMatchesReceiptSearch|messageMatchesReceiptSearch\(/u.test(html);
  if (defectIsOpen(ledger, "EPX-D004")) {
    assert.equal(
      usesHelper,
      false,
      "EPX-D004 is open but the runtime now references the tested helper — close the defect with evidence instead of leaving the ledger stale",
    );
    return;
  }
  assert.equal(
    usesHelper,
    true,
    "EPX-D004 is closed but the shipped runtime does not execute messageMatchesReceiptSearch",
  );
}
