import type { BrowserEpoch, TrackChangeResult } from "@epoch/integration-core";
import { stableJson } from "@epoch/integration-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };

function xstateValueAsDictionary(value: BoundaryValue): DictionaryValue {
  // SAFETY: XState machine values are JSON-serializable; stableJson round-trip preserves dictionary shape.
  return JSON.parse(stableJson(value)) as DictionaryValue;
}

export interface EpochXStateSnapshot {
  readonly context?: unknown;
  readonly event?: { readonly type?: string };
  readonly value?: unknown;
}

export interface EpochXStateObserverOptions<TSnapshot extends EpochXStateSnapshot> {
  readonly epoch: BrowserEpoch;
  readonly entity: string;
  readonly source: string;
  readonly events?: readonly string[];
  readonly select: (snapshot: TSnapshot) => BoundaryValue;
  readonly summary?: (snapshot: TSnapshot) => string;
  readonly metadata?: (snapshot: TSnapshot) => Record<string, DictionaryValue> | undefined;
}

export interface EpochXStateObserver<TSnapshot> {
  next(snapshot: TSnapshot): void;
}

export interface TrackXStateMachineUpdateInput {
  readonly entity: string;
  readonly source: string;
  readonly summary: string;
  readonly definition: unknown;
  readonly metadata?: Record<string, DictionaryValue>;
}

export function createEpochXStateObserver<TSnapshot extends EpochXStateSnapshot>(
  options: EpochXStateObserverOptions<TSnapshot>,
): EpochXStateObserver<TSnapshot> {
  let initialized = false;
  let previous = "";
  return {
    next(snapshot) {
      const payload = options.select(snapshot);
      const serialized = stableJson(payload);
      if (!initialized) {
        initialized = true;
        previous = serialized;
        return;
      }
      const eventType = snapshot.event?.type;
      if (eventType !== undefined && options.events !== undefined && !options.events.includes(eventType)) return;
      if (serialized === previous) return;
      previous = serialized;
      options.epoch.trackChange({
        entity: options.entity,
        surface: "xstate",
        source: options.source,
        summary: options.summary?.(snapshot) ?? eventType ?? "xstate transition",
        payload,
        metadata: {
          eventType,
          // SAFETY: XState snapshot.value is JSON-serializable machine state consumed as dictionary metadata.
          stateValue: xstateValueAsDictionary(snapshot.value as BoundaryValue),
          ...options.metadata?.(snapshot),
        },
      });
    },
  };
}

export function trackXStateMachineUpdate(
  epoch: BrowserEpoch,
  input: TrackXStateMachineUpdateInput,
): TrackChangeResult<{ readonly definition: unknown }> {
  return epoch.trackChange({
    entity: input.entity,
    surface: "xstate",
    source: input.source,
    summary: input.summary,
    payload: { definition: input.definition },
    metadata: {
      updateType: "machine-definition",
      ...input.metadata,
    },
  });
}
