import type {
  NormalizedCommunityQuery,
  SearchExplanation,
  SearchPage,
} from "@epoch/community-core";
import type { QueryHistory } from "./history";

export type QueryWorkbenchTab = "query" | "results" | "explain" | "history";

export interface QueryWorkbenchServices {
  parse(expression: string): NormalizedCommunityQuery;
  search(query: NormalizedCommunityQuery, signal: AbortSignal): Promise<SearchPage>;
  explain(query: NormalizedCommunityQuery, signal: AbortSignal): Promise<SearchExplanation>;
  saveAsProjection?(query: NormalizedCommunityQuery, label: string): Promise<{ readonly projectionId: string }>;
}

export interface QueryWorkbenchState {
  readonly open: boolean;
  readonly tab: QueryWorkbenchTab;
  readonly expression: string;
  readonly parsed?: NormalizedCommunityQuery;
  readonly page?: SearchPage;
  readonly explanation?: SearchExplanation;
  readonly running: boolean;
  readonly localFilter: string;
  readonly error?: string;
}

export interface QueryWorkbench {
  state(): QueryWorkbenchState;
  open(expression?: string): QueryWorkbenchState;
  close(): QueryWorkbenchState;
  select(tab: QueryWorkbenchTab): QueryWorkbenchState;
  setExpression(expression: string): QueryWorkbenchState;
  setLocalFilter(filter: string): QueryWorkbenchState;
  run(): Promise<QueryWorkbenchState>;
  explain(): Promise<QueryWorkbenchState>;
  cancel(): QueryWorkbenchState;
  saveAsProjection(label: string): Promise<{ readonly projectionId: string }>;
}

export function createQueryWorkbench(services: QueryWorkbenchServices, history: QueryHistory): QueryWorkbench {
  let controller: AbortController | undefined;
  let current: QueryWorkbenchState = Object.freeze({ open: false, tab: "query", expression: "", running: false, localFilter: "" });
  const update = (next: Partial<QueryWorkbenchState>): QueryWorkbenchState => {
    current = Object.freeze({ ...current, ...next });
    return current;
  };
  const parsed = (): NormalizedCommunityQuery => {
    const value = services.parse(current.expression);
    update({ parsed: value, error: value.error });
    if (value.error !== undefined) throw new Error(value.error);
    return value;
  };
  const begin = (): AbortSignal => {
    controller?.abort();
    controller = new AbortController();
    update({ running: true, error: undefined });
    return controller.signal;
  };
  const failed = (error: unknown): QueryWorkbenchState => update({
    running: false,
    error: error instanceof DOMException && error.name === "AbortError" ? "Search cancelled" : message(error),
  });
  return Object.freeze({
    state: () => current,
    open: (expression = current.expression) => update({ open: true, tab: "query", expression }),
    close: () => { controller?.abort(); return update({ open: false, running: false }); },
    select: (tab: QueryWorkbenchTab) => update({ tab }),
    setExpression: (expression: string) => update({ expression, parsed: undefined, error: undefined }),
    setLocalFilter: (localFilter: string) => update({ localFilter }),
    async run() {
      const signal = begin();
      try {
        const query = parsed();
        const page = await services.search(query, signal);
        if (signal.aborted) return failed(new DOMException("Search was cancelled", "AbortError"));
        history.record(query);
        return update({ page, tab: "results", running: false });
      } catch (error) { return failed(error); }
    },
    async explain() {
      const signal = begin();
      try {
        const query = parsed();
        const explanation = await services.explain(query, signal);
        if (signal.aborted) return failed(new DOMException("Search was cancelled", "AbortError"));
        return update({ explanation, tab: "explain", running: false });
      } catch (error) { return failed(error); }
    },
    cancel: () => { controller?.abort(); return update({ running: false, error: "Search cancelled" }); },
    async saveAsProjection(label: string) {
      if (services.saveAsProjection === undefined) throw new Error("Saving projections is unavailable");
      return services.saveAsProjection(parsed(), label);
    },
  });
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
