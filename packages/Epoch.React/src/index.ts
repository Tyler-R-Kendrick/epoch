import React, { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  createBrowserEpoch,
  type BrowserEpoch,
  type BrowserEpochOptions,
  type TrackedChange,
  type TrackedChangeLedgerEntry,
} from "@epoch/integration-core";

export interface EpochProviderProps {
  readonly children?: ReactNode;
  readonly epoch?: BrowserEpoch;
  readonly options?: BrowserEpochOptions;
}

const EpochContext = createContext<BrowserEpoch | undefined>(undefined);

export function EpochProvider({ children, epoch, options }: EpochProviderProps): React.ReactElement {
  const value = useMemo(() => {
    if (epoch !== undefined) return epoch;
    if (options === undefined) throw new Error("EpochProvider requires either an epoch instance or options.");
    return createBrowserEpoch(options);
  }, [epoch, options]);

  return React.createElement(EpochContext.Provider, { value }, children);
}

export function useEpochRepository(): BrowserEpoch {
  const epoch = useContext(EpochContext);
  if (epoch === undefined) throw new Error("useEpochRepository must be used inside EpochProvider.");
  return epoch;
}

export function useEpochTrackedEntity<TPayload>(entity: string): TrackedChange<TPayload> | undefined {
  const epoch = useEpochRepository();
  useEpochRevisionSignal(epoch);
  return epoch.readOptionalTrackedEntity<TPayload>(entity);
}

export function useEpochVersionLedger(entity: string): readonly TrackedChangeLedgerEntry[] {
  const epoch = useEpochRepository();
  useEpochRevisionSignal(epoch);
  return epoch.versionLedger(entity);
}

function useEpochRevisionSignal(epoch: BrowserEpoch): number {
  return useSyncExternalStore(
    epoch.subscribe,
    () => epoch.repository.history().length,
    () => epoch.repository.history().length,
  );
}
