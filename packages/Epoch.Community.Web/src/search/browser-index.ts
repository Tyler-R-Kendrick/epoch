import type { CommunitySearchChangeSet } from "@epoch/community-core";

export interface OramaLexicalDocument {
  readonly objectId: string;
  readonly text: string;
}

export interface OramaLexicalHit {
  readonly objectId: string;
  readonly score: number;
}

export interface BrowserIndexHealth {
  readonly backendId: "orama-browser";
  readonly backendVersion: string;
  readonly analyzerVersion: string;
  readonly documentCount: number;
  readonly generation: number;
  readonly state: "ready" | "rebuilding" | "stale" | "closed";
  readonly lastCheckpoint?: string;
  readonly lastCandidateCount?: number;
}

export interface BrowserLexicalIndex {
  rebuild(documents: readonly OramaLexicalDocument[]): Promise<void>;
  search(input: {
    readonly query: string;
    readonly allowedObjectIds: readonly string[];
    readonly limit: number;
    readonly signal?: AbortSignal;
  }): Promise<readonly OramaLexicalHit[]>;
  health(): BrowserIndexHealth;
  close(): Promise<void>;
}

export type SearchWorkerRequest =
  | { readonly requestId: string; readonly type: "rebuild"; readonly documents: readonly OramaLexicalDocument[] }
  | { readonly requestId: string; readonly type: "search"; readonly query: string; readonly allowedObjectIds: readonly string[]; readonly limit: number }
  | { readonly requestId: string; readonly type: "health" }
  | { readonly requestId: string; readonly type: "close" }
  | { readonly requestId: string; readonly type: "cancel"; readonly targetRequestId: string };

export type SearchWorkerRequestInput =
  | { readonly type: "rebuild"; readonly documents: readonly OramaLexicalDocument[] }
  | { readonly type: "search"; readonly query: string; readonly allowedObjectIds: readonly string[]; readonly limit: number }
  | { readonly type: "health" }
  | { readonly type: "close" }
  | { readonly type: "cancel"; readonly targetRequestId: string };

export type SearchWorkerResult = BrowserIndexHealth | readonly OramaLexicalHit[] | undefined;

export type SearchWorkerResponse =
  | { readonly requestId: string; readonly ok: true; readonly result?: SearchWorkerResult }
  | { readonly requestId: string; readonly ok: false; readonly error: { readonly code: string; readonly message: string } };

export interface SearchWorkerPort {
  postMessage(message: SearchWorkerRequest): void;
  addEventListener(type: "message", listener: (event: MessageEvent<SearchWorkerResponse>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<SearchWorkerResponse>) => void): void;
  terminate(): void;
}

export function createWorkerBrowserIndex(worker: SearchWorkerPort): BrowserLexicalIndex {
  let sequence = 0;
  let closed = false;
  const pending = new Map<string, {
    readonly resolve: (value: SearchWorkerResult) => void;
    readonly reject: (error: Error | DOMException) => void;
  }>();
  const listener = (event: MessageEvent<SearchWorkerResponse>): void => {
    const request = pending.get(event.data.requestId);
    if (request === undefined) return;
    pending.delete(event.data.requestId);
    if (event.data.ok) request.resolve(event.data.result);
    else request.reject(Object.assign(new Error(event.data.error.message), { code: event.data.error.code }));
  };
  worker.addEventListener("message", listener);
  const request = <T extends SearchWorkerResult = undefined>(
    message: SearchWorkerRequestInput,
    signal?: AbortSignal,
  ): Promise<T> => {
    if (closed) return Promise.reject(new Error("Browser search index is closed"));
    const requestId = `browser-index-${++sequence}`;
    return new Promise<T>((resolve, reject) => {
      const abort = (): void => {
        worker.postMessage({ requestId: `browser-index-${++sequence}`, type: "cancel", targetRequestId: requestId });
        pending.delete(requestId);
        reject(new DOMException("Search was cancelled", "AbortError"));
      };
      if (signal?.aborted === true) { abort(); return; }
      signal?.addEventListener("abort", abort, { once: true });
      const resolveResult = (value: SearchWorkerResult): void => {
        signal?.removeEventListener("abort", abort);
        // SAFETY: The request kind fixes T, and the worker protocol returns the
        // corresponding SearchWorkerResult variant for that request.
        resolve(value as T);
      };
      pending.set(requestId, {
        resolve: resolveResult,
        reject: (error) => { signal?.removeEventListener("abort", abort); reject(error); },
      });
      // SAFETY: requestId completes one member of the request-input union.
      worker.postMessage({ requestId, ...message } as SearchWorkerRequest);
    });
  };
  let cachedHealth: BrowserIndexHealth = {
    backendId: "orama-browser", backendVersion: "3.1.18", analyzerVersion: "orama-3.1.18-en-v1",
    documentCount: 0, generation: 0, state: "ready",
  };
  const index: BrowserLexicalIndex = {
    rebuild: async (documents: readonly OramaLexicalDocument[]) => {
      await request({ type: "rebuild", documents });
      cachedHealth = await request<BrowserIndexHealth>({ type: "health" });
    },
    search: async (input: Parameters<BrowserLexicalIndex["search"]>[0]) => request<readonly OramaLexicalHit[]>({
      type: "search", query: input.query, allowedObjectIds: input.allowedObjectIds, limit: input.limit,
    }, input.signal),
    health: () => cachedHealth,
    close: async () => {
      if (closed) return;
      await request({ type: "close" });
      closed = true;
      worker.removeEventListener("message", listener);
      worker.terminate();
      for (const operation of pending.values()) operation.reject(new Error("Browser search index closed"));
      pending.clear();
      cachedHealth = { ...cachedHealth, state: "closed" };
    },
  };
  return Object.freeze(index);
}

export function lexicalDocuments(
  entities: readonly { readonly ref: { readonly objectId: string }; readonly searchableText: Readonly<Record<string, string>> }[],
): readonly OramaLexicalDocument[] {
  return entities.map((entity) => Object.freeze({
    objectId: entity.ref.objectId,
    text: Object.values(entity.searchableText).join("\n").normalize("NFKC"),
  }));
}

export function checkpointOf(changes: CommunitySearchChangeSet): string {
  return changes.checkpoint.token;
}
