import type { CommunitySiteEpochHistory } from "../model/types";
import { escapeHtml } from "./html";

/**
 * Proof wonder: this page is itself an Epoch artifact.
 *
 * The site history used to sit at the bottom as a buried section. It is now a
 * one-line seal that expands to the operation chain — a claim no other forge
 * can render truthfully, because the page you are reading really was recorded,
 * branched, approved, and materialized through the product's own VCS.
 */
export function renderSiteHistory(history: CommunitySiteEpochHistory): string {
  const verified = history.verifyProblems.length === 0;
  const seal = `Built as Epoch version ${history.latestVersion.name} · ${history.operations.length} recorded operations · ${verified ? "verification passed" : "verification problems"}`;
  return `<section class="site-seal" aria-label="Epoch site provenance" data-site-seal>
      <details data-site-seal-details>
        <summary>
          <span class="site-seal-mark" aria-hidden="true">◆</span>
          <span class="site-seal-line">${escapeHtml(seal)}</span>
        </summary>
        <div class="site-seal-body">
          <p>This page was recorded as signed Epoch events, branched, approved, and materialized for deployment before you loaded it.</p>
          <dl class="site-history-facts">
            <div class="site-history-fact"><dt>Current view</dt><dd>${escapeHtml(history.currentView)}</dd></div>
            <div class="site-history-fact"><dt>Version</dt><dd>${escapeHtml(history.latestVersion.name)}</dd></div>
            <div class="site-history-fact"><dt>Rollback target</dt><dd>${escapeHtml(history.rollbackTarget.versionId)}</dd></div>
            <div class="site-history-fact"><dt>Verification</dt><dd>${verified ? "passed" : escapeHtml(history.verifyProblems.join(", "))}</dd></div>
          </dl>
          <ol class="site-seal-chain" aria-label="Epoch operation chain">
            ${history.operations.map((operation) =>
              `<li><code>${escapeHtml(operation.eventType)}</code> <span>${escapeHtml(operation.label)}</span></li>`).join("")}
          </ol>
        </div>
      </details>
    </section>`;
}
