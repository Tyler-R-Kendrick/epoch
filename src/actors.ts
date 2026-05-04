import { createActor, fromCallback } from "xstate";
import { EpochRepository, Event, EventPayload, SyncResult } from "./core";
import { ActorCommand, DefaultAuthor, EntityType } from "./domain";

interface Reply<T> {
  resolve(value: T): void;
  reject(error: unknown): void;
}

type RepositoryCommand =
  | { type: typeof ActorCommand.init; author: string; reply: Reply<void> }
  | { type: typeof ActorCommand.append; eventType: string; payload: EventPayload; author?: string; reply: Reply<Event> }
  | { type: typeof ActorCommand.recordFile; path: string; entityType: string; author?: string; reply: Reply<Event> }
  | { type: typeof ActorCommand.read; eventId: string; reply: Reply<Event> }
  | { type: typeof ActorCommand.events; reply: Reply<Event[]> }
  | { type: typeof ActorCommand.heads; reply: Reply<string[]> }
  | { type: typeof ActorCommand.verify; reply: Reply<string[]> }
  | { type: typeof ActorCommand.syncFrom; peerRoot: string; reply: Reply<SyncResult> }
  | { type: typeof ActorCommand.sync; peerRoot: string; reply: Reply<SyncResult> };

type UserCommand =
  | { type: typeof ActorCommand.append; eventType: string; payload: EventPayload; reply: Reply<Event> }
  | { type: typeof ActorCommand.recordFile; path: string; entityType: string; reply: Reply<Event> };

type CommandWithoutReply<T> = T extends unknown ? Omit<T, "reply"> : never;
type CommandActor<T> = {
  send(event: T): void;
  stop(): void;
};

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
      case ActorCommand.init:
        enqueue(event.reply, () => repository.init(event.author));
        return;
      case ActorCommand.append:
        enqueue(event.reply, () => repository.append(event.eventType, event.payload, event.author));
        return;
      case ActorCommand.recordFile:
        enqueue(event.reply, () => repository.recordFile(event.path, event.entityType, event.author));
        return;
      case ActorCommand.read:
        enqueue(event.reply, () => repository.read(event.eventId));
        return;
      case ActorCommand.events:
        enqueue(event.reply, () => repository.events());
        return;
      case ActorCommand.heads:
        enqueue(event.reply, () => repository.heads());
        return;
      case ActorCommand.verify:
        enqueue(event.reply, () => repository.verify());
        return;
      case ActorCommand.syncFrom:
        enqueue(event.reply, () => repository.syncFrom(event.peerRoot));
        return;
      case ActorCommand.sync:
        enqueue(event.reply, () => repository.sync(event.peerRoot));
        return;
    }
  });
});

/**
 * Asynchronous XState actor facade for a repository.
 * Commands are serialized through a repository actor; per-user actors forward commands with their author attached.
 */
export class EpochActorSystem {
  private readonly actor: CommandActor<RepositoryCommand>;
  private readonly userActors = new Map<string, EpochUserActor>();

  constructor(readonly root: string) {
    this.actor = createActor(repositoryActorLogic, { input: { root } }).start();
  }

  init(author = DefaultAuthor): Promise<void> {
    return this.request({ type: ActorCommand.init, author });
  }

  append(type: string, payload: EventPayload, author?: string): Promise<Event> {
    return this.request({ type: ActorCommand.append, eventType: type, payload, author });
  }

  recordFile(path: string, entityType: string = EntityType.octetStream, author?: string): Promise<Event> {
    return this.request({ type: ActorCommand.recordFile, path, entityType, author });
  }

  read(eventId: string): Promise<Event> {
    return this.request({ type: ActorCommand.read, eventId });
  }

  events(): Promise<Event[]> {
    return this.request({ type: ActorCommand.events });
  }

  heads(): Promise<string[]> {
    return this.request({ type: ActorCommand.heads });
  }

  verify(): Promise<string[]> {
    return this.request({ type: ActorCommand.verify });
  }

  syncFrom(peerRoot: string): Promise<SyncResult> {
    return this.request({ type: ActorCommand.syncFrom, peerRoot });
  }

  sync(peerRoot: string): Promise<SyncResult> {
    return this.request({ type: ActorCommand.sync, peerRoot });
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
  private readonly actor: CommandActor<UserCommand>;

  constructor(readonly author: string, private readonly repository: EpochActorSystem) {
    this.actor = createActor(fromCallback<UserCommand>(({ receive }) => {
      receive((event) => {
        switch (event.type) {
          case ActorCommand.append:
            this.repository.append(event.eventType, event.payload, this.author).then(event.reply.resolve, event.reply.reject);
            return;
          case ActorCommand.recordFile:
            this.repository.recordFile(event.path, event.entityType, this.author).then(event.reply.resolve, event.reply.reject);
            return;
          }
        });
    })).start();
  }

  append(type: string, payload: EventPayload): Promise<Event> {
    return this.request({ type: ActorCommand.append, eventType: type, payload });
  }

  recordFile(path: string, entityType: string = EntityType.octetStream): Promise<Event> {
    return this.request({ type: ActorCommand.recordFile, path, entityType });
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
