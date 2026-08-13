import { CommunityError, isCommunityError } from "@epoch/community-core";
import {
  type BrowserLexicalIndex,
  type OramaLexicalDocument,
  type SearchWorkerRequest,
  type SearchWorkerResponse,
} from "./browser-index";
import { createOramaLexicalIndex } from "./orama-backend";

const MAX_DOCUMENTS = 100_000;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const OBJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;

export type SearchWorkerPostMessage = (response: SearchWorkerResponse) => void;

export function createSearchWorkerHandler(
  index: BrowserLexicalIndex,
  postMessage: SearchWorkerPostMessage,
): (request: SearchWorkerRequest) => Promise<void> {
  const active = new Map<string, AbortController>();

  return async (request): Promise<void> => {
    if (!REQUEST_ID.test(request.requestId)) {
      postMessage(failure("invalid-request", new CommunityError("QUERY_COST_LIMIT", "Worker request ID is invalid")));
      return;
    }

    if (request.type === "cancel") {
      active.get(request.targetRequestId)?.abort();
      active.delete(request.targetRequestId);
      postMessage(success(request.requestId));
      return;
    }

    const controller = new AbortController();
    active.set(request.requestId, controller);
    try {
      switch (request.type) {
        case "rebuild":
          validateDocuments(request.documents);
          await index.rebuild(request.documents);
          postMessage(success(request.requestId));
          break;
        case "search":
          postMessage(success(request.requestId, await index.search({
            query: request.query,
            allowedObjectIds: request.allowedObjectIds,
            limit: request.limit,
            signal: controller.signal,
          })));
          break;
        case "health":
          postMessage(success(request.requestId, index.health()));
          break;
        case "close":
          await index.close();
          postMessage(success(request.requestId));
          break;
      }
    } catch (error) {
      postMessage(failure(request.requestId, error));
    } finally {
      active.delete(request.requestId);
    }
  };
}

export interface SearchWorkerScope {
  postMessage(message: SearchWorkerResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<SearchWorkerRequest>) => void): void;
}

export function installSearchWorker(
  scope: SearchWorkerScope,
  index: BrowserLexicalIndex = createOramaLexicalIndex(),
): void {
  const handle = createSearchWorkerHandler(index, (response) => scope.postMessage(response));
  scope.addEventListener("message", (event) => { void handle(event.data); });
}

function validateDocuments(documents: readonly OramaLexicalDocument[]): void {
  if (documents.length > MAX_DOCUMENTS) {
    throw new CommunityError("QUERY_COST_LIMIT", "Browser index rebuild exceeds the document limit");
  }
  const encoder = new TextEncoder();
  let totalBytes = 0;
  const seen = new Set<string>();
  for (const document of documents) {
    if (!OBJECT_ID.test(document.objectId) || seen.has(document.objectId)) {
      throw new CommunityError("INVALID_ENTITY", "Browser index document IDs must be unique canonical object IDs");
    }
    seen.add(document.objectId);
    const bytes = encoder.encode(document.text).length;
    if (bytes > MAX_DOCUMENT_BYTES) {
      throw new CommunityError("QUERY_COST_LIMIT", "Browser index document exceeds the text limit");
    }
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new CommunityError("QUERY_COST_LIMIT", "Browser index rebuild exceeds the total text limit");
    }
  }
}

function success(requestId: string, result?: unknown): SearchWorkerResponse {
  return { requestId, ok: true, ...(result === undefined ? {} : { result }) };
}

function failure(requestId: string, error: unknown): SearchWorkerResponse {
  if (isCommunityError(error)) {
    return { requestId, ok: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { requestId, ok: false, error: { code: "CANCELLED", message: "Search was cancelled" } };
  }
  return { requestId, ok: false, error: { code: "INTERNAL", message: "Browser search worker failed" } };
}
