import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { canonicalJson } from "./json";

export type EventPayload = Record<string, unknown>;

export interface EventData {
  id: string;
  type: string;
  author: string;
  lamport: number;
  parents: string[];
  payload: EventPayload;
  timestamp: number;
}

interface UnsignedEvent {
  type: string;
  author: string;
  lamport: number;
  parents: string[];
  payload: EventPayload;
  timestamp: number;
}

export class Event {
  readonly id: string;
  readonly type: string;
  readonly author: string;
  readonly lamport: number;
  readonly parents: string[];
  readonly payload: EventPayload;
  readonly timestamp: number;

  constructor(data: Omit<EventData, "id"> & { id?: string }) {
    this.type = data.type;
    this.author = data.author;
    this.lamport = data.lamport;
    this.parents = [...data.parents];
    this.payload = { ...data.payload };
    this.timestamp = data.timestamp;
    this.id = data.id ?? this.computedId();
  }

  static create(type: string, author: string, lamport: number, parents: string[], payload: EventPayload): Event {
    return new Event({
      type,
      author,
      lamport,
      parents,
      payload,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  static fromJSON(data: EventData): Event {
    return new Event(data);
  }

  unsigned(): UnsignedEvent {
    return {
      type: this.type,
      author: this.author,
      lamport: this.lamport,
      parents: [...this.parents],
      payload: this.payload,
      timestamp: this.timestamp,
    };
  }

  computedId(): string {
    return sha256(canonicalJson(this.unsigned()));
  }

  toJSON(): EventData {
    return {
      ...this.unsigned(),
      id: this.id,
    };
  }
}

export class EpochRepository {
  readonly root: string;
  readonly epochDir: string;
  readonly eventsDir: string;
  readonly blobsDir: string;
  readonly headsPath: string;
  readonly identityPath: string;

  constructor(root: string) {
    this.root = resolve(root);
    this.epochDir = join(this.root, ".epoch");
    this.eventsDir = join(this.epochDir, "events");
    this.blobsDir = join(this.epochDir, "blobs");
    this.headsPath = join(this.epochDir, "heads.json");
    this.identityPath = join(this.epochDir, "identity.json");
  }

  init(author = "local"): void {
    mkdirSync(this.eventsDir, { recursive: true });
    mkdirSync(this.blobsDir, { recursive: true });
    if (!existsAsFile(this.headsPath)) {
      writeJson(this.headsPath, []);
    }
    if (!existsAsFile(this.identityPath)) {
      writeJson(this.identityPath, { author });
    }
  }

  identity(): string {
    this.requireInitialized();
    const identity = readJson<{ author: string }>(this.identityPath);
    return identity.author;
  }

  heads(): string[] {
    this.requireInitialized();
    return readJson<string[]>(this.headsPath);
  }

  append(type: string, payload: EventPayload, author = this.identity()): Event {
    this.requireInitialized();
    const heads = this.heads();
    const event = Event.create(type, author, this.nextLamport(heads), heads, payload);
    writeJson(join(this.eventsDir, `${event.id}.json`), event.toJSON());
    writeJson(this.headsPath, [event.id]);
    return event;
  }

  recordFile(path: string, entityType = "application/octet-stream"): Event {
    const absolute = resolve(isAbsolute(path) ? path : join(this.root, path));
    const relativePath = relative(this.root, absolute);
    if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error(`cannot record file outside repository root: ${path}`);
    }
    const data = readFileSync(absolute);
    const blobSha256 = sha256(data);
    const blobPath = join(this.blobsDir, blobSha256);
    if (!existsAsFile(blobPath)) {
      writeFileSync(blobPath, data);
    }
    return this.append("record", {
      path: relativePath.split(sep).join("/"),
      entity_type: entityType,
      blob_sha256: blobSha256,
      size: data.byteLength,
    });
  }

  read(eventId: string): Event {
    this.requireInitialized();
    return Event.fromJSON(readJson<EventData>(join(this.eventsDir, `${eventId}.json`)));
  }

  events(): Event[] {
    this.requireInitialized();
    return readdirSync(this.eventsDir)
      .filter((name) => extname(name) === ".json")
      .map((name) => Event.fromJSON(readJson<EventData>(join(this.eventsDir, name))))
      .sort((left, right) => left.lamport - right.lamport || left.id.localeCompare(right.id));
  }

  verify(): string[] {
    this.requireInitialized();
    const events = this.events();
    const known = new Map<string, Event>();
    const problems: string[] = [];

    for (const event of events) {
      if (event.id !== event.computedId()) {
        problems.push(`${event.id}: content hash mismatch`);
      }
      known.set(event.id, event);
    }

    for (const event of events) {
      for (const parent of event.parents) {
        const parentEvent = known.get(parent);
        if (parentEvent === undefined) {
          problems.push(`${event.id}: missing parent ${parent}`);
        } else if (event.lamport <= parentEvent.lamport) {
          problems.push(`${event.id}: lamport clock not greater than parent ${parent}`);
        }
      }
    }

    for (const head of this.heads()) {
      if (!known.has(head)) {
        problems.push(`head references missing event ${head}`);
      }
    }

    return problems;
  }

  private nextLamport(heads: string[]): number {
    return Math.max(0, ...heads.map((head) => this.read(head).lamport)) + 1;
  }

  private requireInitialized(): void {
    if (!existsAsDirectory(this.eventsDir) || !existsAsDirectory(this.blobsDir) || !existsAsFile(this.headsPath)) {
      throw new Error(`not an Epoch repository: ${this.root}`);
    }
  }
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${canonicalJson(value)}\n`, "utf8");
}

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function existsAsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function existsAsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
