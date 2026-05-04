import { createActor, fromCallback } from "xstate";
import { EpochRepository, Event, EventPayload, SyncResult } from "./core";

interface Reply<T> {
  resolve(value: T): void;
  reject(error: unknown): void;
}

type RepositoryCommand =
  | { type: "init"; author: string; reply: Reply<void> }
  | { type: "append"; eventType: string; payload: EventPayload; author?: string; reply: Reply<Event> }
  | { type: "recordFile"; path: string; entityType: string; author?: string; reply: Reply<Event> }
  | { type: "read"; eventId: string; reply: Reply<Event> }
  | { type: "events"; reply: Reply<Event[]> }
  | { type: "heads"; reply: Reply<string[]> }
  | { type: "verify"; reply: Reply<string[]> }
  | { type: "syncFrom"; peerRoot: string; reply: Reply<SyncResult> }
  | { type: "gossip"; peerRoot: string; reply: Reply<SyncResult> }
  | { type: "antiEntropy"; peerRoot: string; reply: Reply<SyncResult> };

type UserCommand =
  | { type: "append"; eventType: string; payload: EventPayload; reply: Reply<Event> }
  | { type: "recordFile"; path: string; entityType: string; reply: Reply<Event> };

type CommandWithoutReply<T> = T extends unknown ? Omit<T, "reply"> : never;

const repositoryActorLogic = fromCallback<RepositoryCommand, { root: string }>(({ input, receive }) => {
  const repository = new EpochRepository(input.root);
  let queue = Promise.resolve();

  function enqueue<T>(reply: Reply<T>, work: () => T | Promise<T>): void {
    const run = queue.then(work);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    run.then(reply.resolve, reply.reject);
  }

  receive((event) => {
    switch (event.type) {
      case "init":
        enqueue(event.reply, () => repository.init(event.author));
        return;
      case "append":
        enqueue(event.reply, () => repository.append(event.eventType, event.payload, event.author));
        return;
      case "recordFile":
        enqueue(event.reply, () => repository.recordFile(event.path, event.entityType, event.author));
        return;
      case "read":
        enqueue(event.reply, () => repository.read(event.eventId));
        return;
      case "events":
        enqueue(event.reply, () => repository.events());
        return;
      case "heads":
        enqueue(event.reply, () => repository.heads());
        return;
      case "verify":
        enqueue(event.reply, () => repository.verify());
        return;
      case "syncFrom":
        enqueue(event.reply, () => repository.syncFrom(event.peerRoot));
        return;
      case "gossip":
        enqueue(event.reply, () => repository.gossip(event.peerRoot));
        return;
      case "antiEntropy":
        enqueue(event.reply, () => repository.antiEntropy(event.peerRoot));
        return;
    }
  });
});

/**
 * Asynchronous XState actor facade for a repository.
 * Commands are serialized through a repository actor; per-user actors forward commands with their author attached.
 */
export class EpochActorSystem {
  private readonly actor;
  private readonly userActors = new Map<string, EpochUserActor>();

  constructor(readonly root: string) {
    this.actor = createActor(repositoryActorLogic, { input: { root } }).start();
  }

  init(author = "local"): Promise<void> {
    return this.request({ type: "init", author });
  }

  append(type: string, payload: EventPayload, author?: string): Promise<Event> {
    return this.request({ type: "append", eventType: type, payload, author });
  }

  recordFile(path: string, entityType = "application/octet-stream", author?: string): Promise<Event> {
    return this.request({ type: "recordFile", path, entityType, author });
  }

  read(eventId: string): Promise<Event> {
    return this.request({ type: "read", eventId });
  }

  events(): Promise<Event[]> {
    return this.request({ type: "events" });
  }

  heads(): Promise<string[]> {
    return this.request({ type: "heads" });
  }

  verify(): Promise<string[]> {
    return this.request({ type: "verify" });
  }

  syncFrom(peerRoot: string): Promise<SyncResult> {
    return this.request({ type: "syncFrom", peerRoot });
  }

  gossip(peerRoot: string): Promise<SyncResult> {
    return this.request({ type: "gossip", peerRoot });
  }

  antiEntropy(peerRoot: string): Promise<SyncResult> {
    return this.request({ type: "antiEntropy", peerRoot });
  }

  user(author: string): EpochUserActor {
    const existing = this.userActors.get(author);
    if (existing !== undefined) return existing;
    const actor = new EpochUserActor(author, this);
    this.userActors.set(author, actor);
    return actor;
  }

  stop(): void {
    for (const actor of this.userActors.values()) actor.stop();
    this.actor.stop();
  }

  private request<T>(event: CommandWithoutReply<RepositoryCommand>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.actor.send({ ...event, reply: { resolve, reject } } as RepositoryCommand);
    });
  }
}

/**
 * Per-user XState actor that submits repository commands as a fixed author.
 */
export class EpochUserActor {
  private readonly actor = createActor(
    fromCallback<UserCommand>(({ receive }) => {
      receive((event) => {
        switch (event.type) {
          case "append":
            this.repository.append(event.eventType, event.payload, this.author).then(event.reply.resolve, event.reply.reject);
            return;
          case "recordFile":
            this.repository.recordFile(event.path, event.entityType, this.author).then(event.reply.resolve, event.reply.reject);
            return;
        }
      });
    }),
  ).start();

  constructor(readonly author: string, private readonly repository: EpochActorSystem) {}

  append(type: string, payload: EventPayload): Promise<Event> {
    return this.request({ type: "append", eventType: type, payload });
  }

  recordFile(path: string, entityType = "application/octet-stream"): Promise<Event> {
    return this.request({ type: "recordFile", path, entityType });
  }

  stop(): void {
    this.actor.stop();
  }

  private request<T>(event: CommandWithoutReply<UserCommand>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.actor.send({ ...event, reply: { resolve, reject } } as UserCommand);
    });
  }
}
