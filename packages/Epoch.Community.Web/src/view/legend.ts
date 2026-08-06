/**
 * The legend.
 *
 * DESIGN.md's Legend Is Not A Sentence Rule: when a reader needs to learn what
 * something means, extend the legend rather than adding an explanatory string to
 * the interface. This is the surface that rule points at, and it is why the
 * product can stop narrating itself.
 *
 * It is permanent and identical on every plane, including narrow viewports
 * (compressed to a wrap strip — never `display: none`). An orienteering
 * competitor does not lose the legend when they turn the map over, and a
 * citizen builder — the primary persona, who has minutes and no version-control
 * vocabulary — should not have to remember what a colour meant on a screen
 * they have left.
 *
 * Every entry here must correspond to an ink that is actually in use. A legend
 * that lists a meaning the product does not carry is the same failure as an
 * interface that carries a meaning the legend does not list.
 */
import { escapeHtml } from "./html";

interface LegendEntry {
  readonly swatch: string;
  readonly label: string;
  /** Shape or weight that carries the same meaning, so colour is never alone. */
  readonly also?: string;
}

const TERRAIN: readonly LegendEntry[] = [
  { swatch: "runnable", label: "Social channel" },
  { swatch: "rough", label: "Work channel" },
  { swatch: "marsh", label: "Anchored to code" },
];

const COURSE: readonly LegendEntry[] = [
  { swatch: "control", label: "Becoming signed work", also: "ring" },
  { swatch: "gold", label: "Signed", also: "mark" },
  { swatch: "out-of-bounds", label: "Needs moderation", also: "ring" },
];

function entries(items: readonly LegendEntry[]): string {
  return items
    .map(
      (e) => `<li class="legend-entry">
        <span class="legend-swatch legend-swatch-${e.swatch}" data-legend-shape="${e.also ?? "flat"}" aria-hidden="true"></span>
        <span class="legend-label">${escapeHtml(e.label)}</span>
      </li>`,
    )
    .join("");
}

export function renderLegend(): string {
  return `<section class="legend" data-legend aria-labelledby="legend-heading">
    <h2 class="rail-section-label" id="legend-heading">Legend</h2>
    <ul class="legend-list">${entries(TERRAIN)}</ul>
    <ul class="legend-list">${entries(COURSE)}</ul>
  </section>`;
}
