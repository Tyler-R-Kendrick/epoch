import type { CommunitySiteEpochHistory } from "../model/types";
import { escapeHtml } from "./html";

export function renderSiteHistory(history: CommunitySiteEpochHistory): string {
  return `<section aria-label="Epoch site history">
      <h2>This site is built with Epoch</h2>
      <p>Branchable site changes are recorded as signed Epoch events before the Community site is materialized for deployment.</p>
      <dl class="site-history-facts">
        <div class="site-history-fact"><dt>Current view</dt><dd>${escapeHtml(history.currentView)}</dd></div>
        <div class="site-history-fact"><dt>Version</dt><dd>${escapeHtml(history.latestVersion.name)}</dd></div>
        <div class="site-history-fact"><dt>Rollback target</dt><dd>${escapeHtml(history.rollbackTarget.versionId)}</dd></div>
        <div class="site-history-fact"><dt>Verification</dt><dd>${history.verifyProblems.length === 0 ? "passed" : escapeHtml(history.verifyProblems.join(", "))}</dd></div>
      </dl>
    </section>`;
}
