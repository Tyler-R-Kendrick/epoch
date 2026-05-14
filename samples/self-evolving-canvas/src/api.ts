import type { EpochLiveRepository, EpochVirtualFileSystem } from "@epoch/wasm-react";
import {
  type CanvasClusterGossipRequest,
  type CanvasClusterGossipResponse,
  type CanvasClusterState,
  createSnapshotEpochVfs,
  exportEpochVfsSnapshot,
} from "./domain";

export interface BrowserClusterGossipResult {
  readonly response: CanvasClusterGossipResponse;
  readonly importedEvents: number;
}

export async function fetchClusterState(): Promise<CanvasClusterState> {
  return requestJson<CanvasClusterState>("/api/cluster");
}

export async function requestBackendAgent(prompt: string): Promise<CanvasClusterState> {
  return requestJson<CanvasClusterState>("/api/agent", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function gossipWithEpochCluster(
  participantId: string,
  repository: EpochLiveRepository,
  vfs: EpochVirtualFileSystem,
): Promise<BrowserClusterGossipResult> {
  const request: CanvasClusterGossipRequest = {
    participantId,
    snapshot: exportEpochVfsSnapshot(vfs),
  };
  const response = await requestJson<CanvasClusterGossipResponse>("/api/gossip", {
    method: "POST",
    body: JSON.stringify(request),
  });
  const importedEvents = repository.syncFrom(createSnapshotEpochVfs(response.snapshot));
  return { response, importedEvents };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Epoch sample request failed (${response.status}): ${await response.text()}`);
  }
  return await response.json() as T;
}
