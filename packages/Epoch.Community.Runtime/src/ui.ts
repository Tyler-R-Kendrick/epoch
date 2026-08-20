import { isRecord } from "@epoch/integration-core";
import { findComponent, findSlot, type StaticHarnessRelease } from "./harness";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }


/**
 * The dynamic layer.
 *
 * A dynamic UI revision is declarative data, never executable code: placements
 * of allowlisted components into allowlisted slots, plus a theme token patch.
 * That is the whole vocabulary a prompt or an agent gets. It is deliberately
 * too small to express "run this", "fetch that", or "hide the recovery
 * controls", which is what makes a self-modifying interface safe to hand to a
 * model.
 *
 * Scope is part of the manifest rather than a UI mode, because "make my feed
 * denser" and "change this for the whole project" must never be the same
 * merge by accident.
 */
export type DynamicUiScope = "personal" | "project" | "session";

export interface DynamicUiPlacement {
  readonly slot: string;
  readonly component: string;
  readonly action?: string;
  readonly props?: Readonly<Record<string, string | number | boolean>>;
}

export interface DynamicUiManifest {
  readonly abiVersion: number;
  readonly scope: DynamicUiScope;
  readonly placements: readonly DynamicUiPlacement[];
  readonly theme: Readonly<Record<string, string>>;
}

export interface UiSemanticDiff {
  readonly layout: readonly string[];
  readonly widgets: readonly string[];
  readonly theme: readonly string[];
  readonly actions: readonly string[];
  readonly empty: boolean;
}

/**
 * Theme values are the one place a model still gets to emit a free string, so
 * they are constrained to tokens that cannot smuggle a request, a script, or an
 * extra declaration past the CSP.
 */
const unsafeThemeValue = /url\(|javascript:|expression\(|[<>;{}]/iu;

export function validateDynamicUiManifest(
  manifest: DynamicUiManifest,
  release: StaticHarnessRelease,
): readonly string[] {
  const errors: string[] = [];
  if (manifest.abiVersion !== release.abiVersion) {
    errors.push(`manifest targets harness ABI ${manifest.abiVersion}, installed harness is ABI ${release.abiVersion}`);
  }

  const perSlot = new Map<string, number>();
  for (const placement of manifest.placements) {
    const slot = findSlot(release, placement.slot);
    if (slot === undefined) {
      errors.push(`unknown slot '${placement.slot}'`);
      continue;
    }

    const component = findComponent(release, placement.component);
    if (component === undefined) {
      errors.push(`unknown component '${placement.component}'`);
      continue;
    }

    if (!slot.accepts.includes(component.category)) {
      errors.push(`slot '${slot.id}' does not accept category '${component.category}'`);
    }

    const used = (perSlot.get(slot.id) ?? 0) + 1;
    perSlot.set(slot.id, used);
    if (used > slot.maxComponents) {
      errors.push(`slot '${slot.id}' accepts at most ${slot.maxComponents} component(s)`);
    }

    if (placement.action !== undefined && !component.actions.includes(placement.action)) {
      errors.push(`component '${component.id}' may not bind action '${placement.action}'`);
    }
  }

  for (const [token, value] of Object.entries(manifest.theme)) {
    if (!release.themeTokens.includes(token)) {
      errors.push(`unknown theme token '${token}'`);
      continue;
    }

    if (unsafeThemeValue.test(value)) {
      errors.push(`theme token '${token}' has an unsafe value`);
    }
  }

  return errors;
}

/**
 * A domain diff, not a JSON diff. "Moved activity into the context panel" is
 * what a person can accept or reject; the object-level diff stays available
 * underneath for anyone who wants it.
 */
export function diffDynamicUiManifests(base: DynamicUiManifest, next: DynamicUiManifest): UiSemanticDiff {
  const layout: string[] = [];
  const widgets: string[] = [];
  const theme: string[] = [];
  const actions: string[] = [];

  const baseByComponent = new Map(base.placements.map((placement) => [placement.component, placement]));
  const nextByComponent = new Map(next.placements.map((placement) => [placement.component, placement]));

  for (const [component, placement] of nextByComponent) {
    const previous = baseByComponent.get(component);
    if (previous === undefined) {
      widgets.push(`added ${component} to ${placement.slot}`);
      if (placement.action !== undefined) actions.push(`bound ${component}.${placement.action}`);
      continue;
    }

    if (previous.slot !== placement.slot) {
      layout.push(`moved ${component} ${previous.slot} → ${placement.slot}`);
    }

    if (previous.action !== placement.action) {
      actions.push(previous.action === undefined
        ? `bound ${component}.${placement.action ?? ""}`
        : `${placement.action === undefined ? `unbound ${component}.${previous.action}` : `rebound ${component}.${previous.action} → ${placement.action}`}`);
    }
  }

  for (const [component, placement] of baseByComponent) {
    if (!nextByComponent.has(component)) widgets.push(`removed ${component} from ${placement.slot}`);
  }

  const tokens = new Set([...Object.keys(base.theme), ...Object.keys(next.theme)]);
  for (const token of [...tokens].sort()) {
    const before = base.theme[token];
    const after = next.theme[token];
    if (before === after) continue;
    if (before === undefined) theme.push(`${token}: unset → ${after ?? ""}`);
    else if (after === undefined) theme.push(`${token}: ${before} → unset`);
    else theme.push(`${token}: ${before} → ${after}`);
  }

  if (base.scope !== next.scope) layout.push(`scope ${base.scope} → ${next.scope}`);

  return {
    layout,
    widgets,
    theme,
    actions,
    empty: layout.length === 0 && widgets.length === 0 && theme.length === 0 && actions.length === 0,
  };
}

export function isDynamicUiManifest(value: BoundaryValue): value is DynamicUiManifest {
  return isRecord(value)
    && typeof value.abiVersion === "number"
    && isDynamicUiScope(value.scope)
    && Array.isArray(value.placements)
    && value.placements.every(isDynamicUiPlacement)
    && isRecord(value.theme)
    && Object.values(value.theme).every((token) => __epochIsString(token));
}

function isDynamicUiScope(value: BoundaryValue): value is DynamicUiScope {
  return value === "personal" || value === "project" || value === "session";
}

function isDynamicUiPlacement(value: BoundaryValue): value is DynamicUiPlacement {
  return isRecord(value) && typeof value.slot === "string" && typeof value.component === "string";
}
