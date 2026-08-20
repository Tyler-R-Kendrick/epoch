import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { EpochRepository } from "@epoch/core";
import { createEpochLiveRepository, type EpochVirtualFileSystem } from "@epoch/wasm-react";
import {
  CANVAS_ENTITY,
  type CanvasClusterGossipResponse,
  type CanvasClusterGossipStats,
  type CanvasClusterState,
  type CanvasDocument,
  type EpochVfsSnapshot,
  commitCanvas,
  createSnapshotEpochVfs,
  evolveCanvasWithAgent,
  exportEpochVfsSnapshot,
  gossipCanvasPeers,
  normalizeCanvasDocument,
  readCanvas,
} from "./domain.js";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
type JsonObject = { readonly [key: string]: JsonValue };
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;


export interface CanvasClusterNodeOptions {
  readonly dataDir: string;
  readonly participantId?: string;
}

export interface CanvasClusterNode {
  readonly participantId: string;
  state(): CanvasClusterState;
  commitAgentPrompt(prompt: string): CanvasDocument;
  gossipWithBrowserSnapshot(snapshot: EpochVfsSnapshot): CanvasClusterGossipResponse;
}

export function createCanvasClusterNode(options: CanvasClusterNodeOptions): CanvasClusterNode {
  const participantId = options.participantId ?? "node-backend";
  const dataDir = resolve(options.dataDir);
  const liveVfs = createFileSystemEpochVfs(join(dataDir, "live-vfs"));
  const liveRepository = createEpochLiveRepository({ vfs: liveVfs, author: participantId });
  const backendRepository = EpochRepository.openOrCreate(join(dataDir, "backend-epoch"), { author: participantId });

  function state(): CanvasClusterState {
    return {
      participantId,
      canvas: readCanvas(liveRepository),
      liveEvents: liveRepository.history().length,
      backendEpochEvents: backendRepository.events().length,
      backendVerifyProblems: backendRepository.verify(),
    };
  }

  function commitAgentPrompt(prompt: string): CanvasDocument {
    const canvas = evolveCanvasWithAgent(readCanvas(liveRepository), prompt);
    commitCanvas(liveRepository, canvas);
    recordBackendCanvas(canvas);
    return canvas;
  }

  function gossipWithBrowserSnapshot(snapshot: EpochVfsSnapshot): CanvasClusterGossipResponse {
    const browserVfs = createSnapshotEpochVfs(snapshot);
    const browserRepository = createEpochLiveRepository({ vfs: browserVfs, author: "browser-participant" });
    const beforeBackendEvents = backendRepository.events().length;
    const result = gossipCanvasPeers(
      { repository: liveRepository, vfs: liveVfs },
      { repository: browserRepository, vfs: browserVfs },
    );
    recordBackendCanvas(readCanvas(liveRepository));
    const stats: CanvasClusterGossipStats = {
      sentEvents: result.leftToRight,
      receivedEvents: result.rightToLeft,
      backendEventsAppended: backendRepository.events().length - beforeBackendEvents,
    };

    return {
      participantId,
      result: stats,
      snapshot: exportEpochVfsSnapshot(liveVfs),
      state: state(),
    };
  }

  function recordBackendCanvas(canvas: CanvasDocument): void {
    if (stableJson(readBackendCanvas(backendRepository)) === stableJson(canvas)) return;
    backendRepository.recordCodeOperation({
      kind: "map-set",
      entity: CANVAS_ENTITY,
      key: "document",
      // SAFETY: CanvasDocument is JSON-round-tripped before persistence as a live map value.
      value: JSON.parse(JSON.stringify(canvas)) as JsonValue,
    }, participantId);
  }

  return { participantId, state, commitAgentPrompt, gossipWithBrowserSnapshot };
}

export function createFileSystemEpochVfs(rootDir: string): EpochVirtualFileSystem {
  const root = resolve(rootDir);
  mkdirSync(root, { recursive: true });
  return {
    readFile: (path) => {
      const absolute = resolveVfsPath(root, path);
      return existsSync(absolute) && statSync(absolute).isFile() ? readFileSync(absolute, "utf8") : undefined;
    },
    writeFile: (path, content) => {
      const absolute = resolveVfsPath(root, path);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content, "utf8");
    },
    deleteFile: (path) => {
      const absolute = resolveVfsPath(root, path);
      if (existsSync(absolute) && statSync(absolute).isFile()) unlinkSync(absolute);
    },
    listFiles: (pathPrefix = "") => listVfsFiles(root).filter((path) => path.startsWith(pathPrefix)).sort(),
  };
}

function readBackendCanvas(repository: EpochRepository): CanvasDocument {
  const materialized = repository.materialize(CANVAS_ENTITY);
  if (!isRecord(materialized)) return normalizeCanvasDocument(undefined);
  return normalizeCanvasDocument(materialized.document);
}

function listVfsFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const result: string[] = [];
  collectFiles(root, root, result);
  return result;
}

function collectFiles(root: string, current: string, result: string[]): void {
  for (const entry of readdirSync(current)) {
    const absolute = join(current, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      collectFiles(root, absolute, result);
      continue;
    }
    if (stats.isFile()) result.push(`/${relative(root, absolute).split(sep).join("/")}`);
  }
}

function resolveVfsPath(root: string, path: string): string {
  const relativePath = path.replace(/^\/+/u, "").split("/").filter((part) => part.length > 0).join(sep);
  const absolute = resolve(root, relativePath);
  const fromRoot = relative(root, absolute);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`cannot access VFS path outside Epoch sample data: ${path}`);
  }
  return absolute;
}

function stableJson(value: BoundaryValue): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function isRecord(value: BoundaryValue): value is Record<string, DictionaryValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
