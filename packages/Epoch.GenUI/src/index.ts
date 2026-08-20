import type { BrowserEpoch, TrackChangeResult } from "@epoch/integration-core";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


export interface GeneratedUiComponentPatch<TSpec = unknown> {
  readonly id: string;
  readonly spec: TSpec;
  readonly metadata?: Record<string, DictionaryValue>;
}

export interface GeneratedUiComponent<TSpec = unknown> {
  readonly id: string;
  readonly renderer: string;
  readonly version: number;
  readonly spec: TSpec;
  readonly metadata?: Record<string, DictionaryValue>;
}

export interface GeneratedUiDocument<TSpec = unknown> {
  readonly renderer: string;
  readonly components: readonly GeneratedUiComponent<TSpec>[];
}

export interface TrackGeneratedUiChangeInput<TSpec = unknown> {
  readonly entity: string;
  readonly source: string;
  readonly summary: string;
  readonly renderer: string;
  readonly components: readonly GeneratedUiComponentPatch<TSpec>[];
  readonly metadata?: Record<string, DictionaryValue>;
}

export interface TrackGeneratedUiChangeResult<TSpec = unknown> extends TrackChangeResult<GeneratedUiDocument<TSpec>> {
  readonly components: readonly GeneratedUiComponent<TSpec>[];
}

export function trackGeneratedUiChange<TSpec>(
  epoch: BrowserEpoch,
  input: TrackGeneratedUiChangeInput<TSpec>,
): TrackGeneratedUiChangeResult<TSpec> {
  const previous = epoch.readOptionalTrackedEntity<GeneratedUiDocument<TSpec>>(input.entity)?.payload;
  const components = mergeComponents(previous?.components ?? [], input.renderer, input.components);
  const result = epoch.trackChange({
    entity: input.entity,
    surface: "gen-ui",
    source: input.source,
    summary: input.summary,
    payload: {
      renderer: input.renderer,
      components,
    },
    metadata: {
      ...input.metadata,
      renderer: input.renderer,
      componentIds: components.map((component) => component.id),
    },
  });
  return { ...result, components };
}

function mergeComponents<TSpec>(
  existing: readonly GeneratedUiComponent<TSpec>[],
  renderer: string,
  patches: readonly GeneratedUiComponentPatch<TSpec>[],
): readonly GeneratedUiComponent<TSpec>[] {
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  const merged = existing.map((component) => {
    const patch = patchById.get(component.id);
    if (patch === undefined) return component;
    patchById.delete(component.id);
    return {
      ...component,
      renderer,
      version: component.version + 1,
      spec: patch.spec,
      metadata: patch.metadata,
    };
  });
  const added = [...patchById.values()].map((patch) => ({
    id: patch.id,
    renderer,
    version: 1,
    spec: patch.spec,
    metadata: patch.metadata,
  }));
  return [...merged, ...added].sort((left, right) => left.id.localeCompare(right.id));
}
