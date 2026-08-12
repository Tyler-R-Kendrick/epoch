import type { ConvergenceChange, ConvergenceWorkbenchSnapshot } from "@epoch/community-core";
import { epochTokensCss } from "@epoch/design-tokens";
import { escapeHtml, escapeScriptJson } from "./html";

/**
 * Keyboard-first change topology and review detail. The view is deliberately a
 * graph/tree plus detail blade, not a generic card dashboard: dependency and
 * revision context stay visible while a reviewer drills into one change.
 */
export function renderConvergenceWorkbench(snapshot: ConvergenceWorkbenchSnapshot): string {
  const selected = snapshot.changes.find((change) => change.changeId === snapshot.selectedChangeId) ?? snapshot.changes[0];
  const roots = snapshot.changes.filter((change) => change.dependsOn.length === 0);
  const ordered = preorder(snapshot.changes, roots);
  const gateLabels = ["Tests", "Review", "Security"];
  return `<section class="convergence-workbench" data-convergence-workbench aria-labelledby="convergence-title">
  <style>${convergenceWorkbenchStyles()}</style>
  <header class="convergence-header">
    <p class="convergence-kicker">change graph · signed revisions</p>
    <h2 id="convergence-title">Review bundle</h2>
    <p>Review the combined result, then drill into each stable change without losing graph context.</p>
  </header>
  <div class="convergence-layout">
    <section class="convergence-navigator" aria-labelledby="change-graph-title">
      <h3 id="change-graph-title">Change graph</h3>
      <div role="tree" aria-label="Logical change graph" data-change-tree>
        ${ordered.map((change) => {
          const siblings = snapshot.changes.filter((candidate) => (candidate.dependsOn[0] ?? "") === (change.dependsOn[0] ?? ""));
          return renderTreeItem(change, siblings.indexOf(change) + 1, siblings.length, changeLevel(change, snapshot.changes), change.changeId === selected?.changeId);
        }).join("")}
      </div>
      <p class="convergence-help">↑/↓ move · Home/End jump · Enter review</p>
    </section>
    <article class="convergence-detail" data-review-detail data-change-id="${escapeHtml(selected?.changeId ?? "")}" aria-live="polite" aria-labelledby="review-detail-title">
      <div class="review-modes" role="group" aria-label="Cumulative and individual review modes">
        <button type="button" aria-pressed="false" data-review-mode="cumulative">Combined result</button>
        <button type="button" aria-pressed="true" data-review-mode="individual">Individual change</button>
      </div>
      ${renderReviewDetail(selected)}
    </article>
  </div>
  <section class="gate-panel" aria-labelledby="gate-matrix-title">
    <h3 id="gate-matrix-title">Gate matrix</h3>
    <div class="gate-scroll" tabindex="0" role="region" aria-label="Gate matrix">
      <table>
        <thead><tr><th scope="col">Change</th>${gateLabels.map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead>
        <tbody>${snapshot.changes.map((change) => `<tr><th scope="row">${escapeHtml(change.label)}</th>${gateLabels.map((label) => renderGate(snapshot, change.changeId, label)).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  </section>
  ${snapshot.conflicts.map((conflict) => `<section class="conflict" data-conflict-state="${conflict.state}" aria-labelledby="${escapeHtml(conflict.conflictId)}-title">
    <h3 id="${escapeHtml(conflict.conflictId)}-title">Unresolved conflict · ${escapeHtml(conflict.path)}</h3>
    <p>Base ${escapeHtml(conflict.base)} · left ${escapeHtml(conflict.left)} · right ${escapeHtml(conflict.right)}</p>
    ${conflict.aiProposalState === "untrusted-proposal" ? `<p class="untrusted" data-trust="untrusted-proposal">AI proposal · untrusted · not accepted</p>` : ""}
    <button type="button" data-mutation="resolve" data-authority="maintainer.resolve" data-confirmation-required="true">Review resolution…</button>
  </section>`).join("")}
  <script>${workbenchRuntime(snapshot)}</script>
</section>`;
}

function renderTreeItem(change: ConvergenceChange, position: number, setSize: number, level: number, selected: boolean): string {
  return `<div role="treeitem" tabindex="${selected ? "0" : "-1"}" aria-level="${level}" aria-posinset="${position}" aria-setsize="${setSize}" aria-selected="${selected}" data-change-id="${escapeHtml(change.changeId)}">
    <span class="lane" aria-hidden="true">${change.dependsOn.length === 0 ? "◆" : "├"}</span>
    <span>${escapeHtml(change.label)}</span>
    <code>${escapeHtml(change.currentRevisionIds.join(" + "))}</code>
  </div>`;
}

function changeLevel(change: ConvergenceChange, changes: readonly ConvergenceChange[], seen = new Set<string>()): number {
  const parentId = change.dependsOn[0];
  if (parentId === undefined || seen.has(change.changeId)) return 1;
  const parent = changes.find((candidate) => candidate.changeId === parentId);
  if (parent === undefined) return 1;
  seen.add(change.changeId);
  return 1 + changeLevel(parent, changes, seen);
}

function renderReviewDetail(change: ConvergenceChange | undefined): string {
  if (change === undefined) return `<h3 id="review-detail-title">No change selected</h3>`;
  return `<p class="convergence-kicker">individual change</p>
    <h3 id="review-detail-title">${escapeHtml(change.label)}</h3>
    <dl>
      <div><dt>Stable change</dt><dd><code>${escapeHtml(change.changeId)}</code></dd></div>
      <div><dt>Current revision</dt><dd><code>${escapeHtml(change.currentRevisionIds.join(", "))}</code></dd></div>
      <div><dt>Depends on</dt><dd>${escapeHtml(change.dependsOn.join(", ") || "graph root")}</dd></div>
      <div><dt>Files</dt><dd>${escapeHtml(change.files.join(", "))}</dd></div>
    </dl>
    <button type="button" data-mutation="merge" data-authority="maintainer.merge" data-confirmation-required="true">Preview dependency-closed merge…</button>`;
}

function renderGate(snapshot: ConvergenceWorkbenchSnapshot, changeId: string, label: string): string {
  const gate = snapshot.gates.find((candidate) => candidate.changeId === changeId && candidate.label === label);
  const state = gate?.state ?? "missing";
  const detail = state === "stale" ? `STALE · targets ${gate?.revisionId ?? "older revision"}` : state;
  return `<td><span class="gate gate-${state}" data-gate-state="${state}">${escapeHtml(detail)}</span></td>`;
}

function preorder(changes: readonly ConvergenceChange[], roots: readonly ConvergenceChange[]): readonly ConvergenceChange[] {
  const ordered: ConvergenceChange[] = [];
  const seen = new Set<string>();
  const visit = (change: ConvergenceChange): void => {
    if (seen.has(change.changeId)) return;
    seen.add(change.changeId);
    ordered.push(change);
    for (const child of changes.filter((candidate) => candidate.dependsOn.includes(change.changeId))) visit(child);
  };
  for (const root of roots) visit(root);
  for (const change of changes) visit(change);
  return ordered;
}

function workbenchRuntime(snapshot: ConvergenceWorkbenchSnapshot): string {
  const details = Object.fromEntries(snapshot.changes.map((change) => [change.changeId, renderReviewDetail(change)]));
  return `(function(){
    var root=document.currentScript.closest('[data-convergence-workbench]');
    if(!root)return;
    var tree=root.querySelector('[data-change-tree]');
    var detail=root.querySelector('[data-review-detail]');
    var details=JSON.parse(${JSON.stringify(escapeScriptJson(JSON.stringify(details)))});
    function items(){return Array.from(tree.querySelectorAll('[role="treeitem"]'));}
    function select(item,focus){
      items().forEach(function(candidate){var active=candidate===item;candidate.tabIndex=active?0:-1;candidate.setAttribute('aria-selected',String(active));});
      var id=item.getAttribute('data-change-id')||'';
      detail.setAttribute('data-change-id',id);
      var mode=detail.querySelector('.review-modes');
      detail.innerHTML=(mode?mode.outerHTML:'')+(details[id]||'<h3 id="review-detail-title">Unavailable change</h3>');
      if(focus)item.focus();
    }
    tree.addEventListener('keydown',function(event){
      var current=event.target.closest('[role="treeitem"]');if(!current)return;
      var all=items(),index=all.indexOf(current),next;
      if(event.key==='ArrowDown')next=all[Math.min(index+1,all.length-1)];
      else if(event.key==='ArrowUp')next=all[Math.max(index-1,0)];
      else if(event.key==='Home')next=all[0];
      else if(event.key==='End')next=all[all.length-1];
      else if(event.key==='Enter')next=current;
      else return;
      event.preventDefault();select(next,true);
    });
    tree.addEventListener('click',function(event){var item=event.target.closest('[role="treeitem"]');if(item)select(item,true);});
    detail.addEventListener('click',function(event){var mode=event.target.closest('[data-review-mode]');if(!mode)return;detail.querySelectorAll('[data-review-mode]').forEach(function(candidate){candidate.setAttribute('aria-pressed',String(candidate===mode));});});
  }());`;
}

function convergenceWorkbenchStyles(): string {
  return `${epochTokensCss}
  .convergence-workbench{box-sizing:border-box;max-inline-size:100%;padding:clamp(var(--epoch-space-md),3vw,var(--epoch-space-xl));color:var(--epoch-color-ink);background:var(--epoch-color-surface);font-family:var(--epoch-font-ui);font-size:var(--epoch-type-body-size);font-weight:var(--epoch-type-body-weight);line-height:var(--epoch-type-body-leading);overflow-wrap:anywhere}
  .convergence-workbench *{box-sizing:border-box;min-inline-size:0}
  .convergence-header{border-block-end:1px solid var(--epoch-color-line);margin-block-end:var(--epoch-space-lg)}.convergence-header h2{margin:var(--epoch-space-xs) 0;font-size:var(--epoch-type-display-size);font-weight:var(--epoch-type-display-weight);line-height:var(--epoch-type-display-leading)}
  .convergence-kicker{margin:0;color:var(--epoch-color-agent);text-transform:uppercase;letter-spacing:var(--epoch-type-label-tracking);font-size:var(--epoch-type-label-size)}
  .convergence-layout{display:grid;grid-template-columns:minmax(14rem,.8fr) minmax(0,1.2fr);gap:1rem}
  .convergence-navigator,.convergence-detail,.gate-panel,.conflict{border:1px solid var(--epoch-color-line);background:var(--epoch-color-surface-raised);padding:var(--epoch-space-lg)}
  [role=treeitem]{display:grid;grid-template-columns:1.25rem minmax(5rem,1fr) minmax(5rem,auto);gap:var(--epoch-space-sm);align-items:center;min-block-size:44px;padding:var(--epoch-space-sm);border-inline-start:2px solid transparent;cursor:pointer}
  [role=treeitem][aria-selected=true]{background:var(--epoch-color-rail-active);border-inline-start-color:var(--epoch-color-agent)}
  [role=treeitem]:focus-visible,button:focus-visible,.gate-scroll:focus-visible{outline:3px solid var(--epoch-color-control);outline-offset:2px}
  [role=treeitem] code{color:var(--epoch-color-muted);font-size:var(--epoch-type-meta-size)}.lane{color:var(--epoch-color-agent)}.convergence-help{color:var(--epoch-color-muted);font-size:var(--epoch-type-meta-size)}
  .convergence-detail dl{display:grid;gap:var(--epoch-space-sm)}.convergence-detail dl div{display:grid;grid-template-columns:minmax(7rem,.4fr) 1fr;gap:var(--epoch-space-sm)}.convergence-detail dt{color:var(--epoch-color-muted)}
  .review-modes{display:flex;flex-wrap:wrap;gap:var(--epoch-space-sm);margin-block-end:var(--epoch-space-md)}
  button{min-block-size:44px;max-inline-size:100%;padding:var(--epoch-space-sm) var(--epoch-space-md);border:1px solid var(--epoch-color-control);border-radius:var(--epoch-radius-sm);color:var(--epoch-color-ink);background:var(--epoch-color-surface-raised);font:inherit;text-align:start}
  .gate-panel{margin-block-start:var(--epoch-space-lg)}.gate-scroll{max-inline-size:100%;overflow:auto}table{inline-size:100%;border-collapse:collapse}th,td{padding:var(--epoch-space-sm);border-block-end:1px solid var(--epoch-color-line);text-align:start}.gate{font-weight:800}.gate-passing{color:var(--epoch-color-success)}.gate-stale,.gate-failing{color:var(--epoch-color-danger)}.gate-missing{color:var(--epoch-color-warn)}.conflict{margin-block-start:var(--epoch-space-lg);border-color:var(--epoch-color-danger)}.untrusted{border-inline-start:4px solid var(--epoch-color-warn);padding-inline-start:var(--epoch-space-md);color:var(--epoch-color-warn);font-weight:800}
  @media(max-width:42rem){.convergence-layout{grid-template-columns:1fr}.convergence-detail dl div{grid-template-columns:1fr}[role=treeitem]{grid-template-columns:1.1rem minmax(0,1fr)}[role=treeitem] code{grid-column:2}.gate-scroll{scrollbar-gutter:stable}}
  @media(prefers-reduced-motion:reduce){.convergence-workbench *{scroll-behavior:auto!important;transition:none!important}}
  `;
}
