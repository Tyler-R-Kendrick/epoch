import type { EpochLiveRepository, EpochLiveRepositoryEvent, EpochVirtualFileSystem } from "@epoch/wasm-react";

export const CANVAS_ENTITY = "canvas:main";

export interface KeyValueStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CanvasDocument {
  readonly revision: number;
  readonly viewport: CanvasViewport;
  readonly widgets: readonly CanvasWidget[];
  readonly lastPrompt?: string;
}

export interface CanvasViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface CanvasWidget {
  readonly id: string;
  readonly renderer: "json-render";
  readonly x: number;
  readonly y: number;
  readonly json: JsonRenderWidget;
}

export type JsonRenderWidget =
  | { readonly type: "note"; readonly props: { readonly title: string; readonly body: string } }
  | { readonly type: "metric"; readonly props: { readonly label: string; readonly value: string; readonly trend: string } }
  | { readonly type: "list"; readonly props: { readonly title: string; readonly items: readonly string[] } };

export interface EpochCanvasPeer {
  readonly repository: EpochLiveRepository;
  readonly vfs: EpochVirtualFileSystem;
}

export interface GossipResult {
  readonly leftToRight: number;
  readonly rightToLeft: number;
}

const emptyCanvas: CanvasDocument = {
  revision: 0,
  viewport: { x: 0, y: 0, zoom: 1 },
  widgets: [],
};

export function createLocalStorageEpochVfs(storage: KeyValueStorage, prefix = "epoch:self-evolving-canvas:"): EpochVirtualFileSystem {
  return {
    readFile: (path) => storage.getItem(storageKey(prefix, path)) ?? undefined,
    writeFile: (path, content) => {
      storage.setItem(storageKey(prefix, path), content);
    },
    deleteFile: (path) => {
      storage.removeItem(storageKey(prefix, path));
    },
    listFiles: (pathPrefix = "") => {
      const paths: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key === null || !key.startsWith(prefix)) continue;
        const path = key.slice(prefix.length);
        if (path.startsWith(pathPrefix)) paths.push(path);
      }
      return paths.sort();
    },
  };
}

export function readCanvas(repository: EpochLiveRepository): CanvasDocument {
  return normalizeCanvas(repository.entity(CANVAS_ENTITY));
}

export function commitCanvas(repository: EpochLiveRepository, canvas: CanvasDocument): EpochLiveRepositoryEvent {
  return repository.append(CANVAS_ENTITY, toPayload(normalizeCanvas(canvas)));
}

export function evolveCanvasWithAgent(canvas: CanvasDocument, prompt: string): CanvasDocument {
  const cleanPrompt = prompt.trim() || "sketch a useful status note";
  const revision = canvas.revision + 1;
  const widget = createWidgetFromPrompt(cleanPrompt, revision, canvas.widgets.length);
  return {
    ...canvas,
    revision,
    widgets: [...canvas.widgets, widget],
    lastPrompt: cleanPrompt,
  };
}

export function moveWidget(canvas: CanvasDocument, widgetId: string, delta: { readonly x: number; readonly y: number }): CanvasDocument {
  return {
    ...canvas,
    revision: canvas.revision + 1,
    widgets: canvas.widgets.map((widget) => widget.id === widgetId ? { ...widget, x: widget.x + delta.x, y: widget.y + delta.y } : widget),
  };
}

export function panCanvas(canvas: CanvasDocument, delta: { readonly x: number; readonly y: number }): CanvasDocument {
  return {
    ...canvas,
    revision: canvas.revision + 1,
    viewport: {
      ...canvas.viewport,
      x: canvas.viewport.x + delta.x,
      y: canvas.viewport.y + delta.y,
    },
  };
}

export function gossipCanvasPeers(left: EpochCanvasPeer, right: EpochCanvasPeer): GossipResult {
  const leftToRight = right.repository.syncFrom(left.vfs);
  const rightToLeft = left.repository.syncFrom(right.vfs);
  return { leftToRight, rightToLeft };
}

function createWidgetFromPrompt(prompt: string, revision: number, index: number): CanvasWidget {
  return {
    id: `agent-widget-${revision}`,
    renderer: "json-render",
    x: 80 + (index % 3) * 260,
    y: 90 + Math.floor(index / 3) * 180,
    json: widgetJsonFromPrompt(prompt, revision),
  };
}

function widgetJsonFromPrompt(prompt: string, revision: number): JsonRenderWidget {
  const title = titleFromPrompt(prompt);
  const lower = prompt.toLowerCase();

  if (lower.includes("todo") || lower.includes("steps")) {
    return {
      type: "list",
      props: {
        title,
        items: ["inspect state", "commit change", "gossip peer"],
      },
    };
  }

  if (lower.includes("confidence") || lower.includes("metric") || lower.includes("score")) {
    return {
      type: "metric",
      props: {
        label: title,
        value: `${Math.min(99, 60 + revision * 7)}%`,
        trend: "runtime history captured",
      },
    };
  }

  return {
    type: "note",
    props: {
      title,
      body: `Agent draft ${revision}: ${prompt}`,
    },
  };
}

function titleFromPrompt(prompt: string): string {
  return prompt
    .split(/\s+/u)
    .slice(0, 4)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function normalizeCanvas(value: unknown): CanvasDocument {
  if (!isRecord(value) || !Array.isArray(value.widgets)) return emptyCanvas;
  return {
    revision: numberOr(value.revision, 0),
    viewport: normalizeViewport(value.viewport),
    widgets: value.widgets.map(normalizeWidget).filter((widget): widget is CanvasWidget => widget !== undefined),
    lastPrompt: typeof value.lastPrompt === "string" ? value.lastPrompt : undefined,
  };
}

function normalizeViewport(value: unknown): CanvasViewport {
  if (!isRecord(value)) return emptyCanvas.viewport;
  return {
    x: numberOr(value.x, 0),
    y: numberOr(value.y, 0),
    zoom: numberOr(value.zoom, 1),
  };
}

function normalizeWidget(value: unknown): CanvasWidget | undefined {
  if (!isRecord(value) || value.renderer !== "json-render" || !isRecord(value.json)) return undefined;
  const id = typeof value.id === "string" ? value.id : "";
  if (id.length === 0 || !isJsonRenderWidget(value.json)) return undefined;
  return {
    id,
    renderer: "json-render",
    x: numberOr(value.x, 0),
    y: numberOr(value.y, 0),
    json: value.json,
  };
}

function isJsonRenderWidget(value: Record<string, unknown>): value is JsonRenderWidget {
  return (value.type === "note" || value.type === "metric" || value.type === "list") && isRecord(value.props);
}

function toPayload(canvas: CanvasDocument): Record<string, unknown> {
  return JSON.parse(JSON.stringify(canvas)) as Record<string, unknown>;
}

function storageKey(prefix: string, path: string): string {
  return `${prefix}${path}`;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
