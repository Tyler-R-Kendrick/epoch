import type { PresenceMessage } from "./providers";
import { normalizeJson } from "./util";
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


export interface PresencePeer {
  readonly clientId: string;
  readonly author: string;
  readonly state: Record<string, DictionaryValue>;
}

export interface LivePresence {
  set(state: Record<string, DictionaryValue>): void;
  peers(): readonly PresencePeer[];
  local(): PresencePeer;
  subscribe(listener: () => void): () => void;
}

/**
 * Ephemeral, unsigned awareness. Presence is versioned by a per-client sequence
 * and distributed over the same providers as signed events, but is never written
 * to the log. Stale updates (lower sequence) are ignored.
 */
export interface PresenceHub extends LivePresence {
  ingest(message: PresenceMessage): void;
  exportLocal(): PresenceMessage | undefined;
  onLocalPresence(listener: (message: PresenceMessage) => void): () => void;
}

export interface PresenceHubOptions {
  readonly clientId: string;
  readonly author: string;
}

export function createPresenceHub(options: PresenceHubOptions): PresenceHub {
  const clientId = options.clientId;
  const author = options.author;
  const remote = new Map<string, PresenceMessage>();
  const listeners = new Set<() => void>();
  const localListeners = new Set<(message: PresenceMessage) => void>();
  let localState: Record<string, DictionaryValue> | undefined;
  let seq = 0;
  let cachedPeers: readonly PresencePeer[] | undefined;

  function notify(): void {
    cachedPeers = undefined;
    for (const listener of listeners) listener();
  }

  function set(state: Record<string, DictionaryValue>): void {
    seq += 1;
    localState = normalizeJson(state);
    const message: PresenceMessage = { clientId, author, state: localState, seq };
    for (const listener of localListeners) listener(message);
    notify();
  }

  function ingest(message: PresenceMessage): void {
    if (message.clientId === clientId) return;
    const existing = remote.get(message.clientId);
    if (existing !== undefined && existing.seq >= message.seq) return;
    if (message.left === true) {
      remote.delete(message.clientId);
    } else {
      remote.set(message.clientId, message);
    }
    notify();
  }

  function peers(): readonly PresencePeer[] {
    if (cachedPeers === undefined) {
      const others = [...remote.values()].filter((message) => message.left !== true).map(toPeer);
      cachedPeers = [local(), ...others].sort((left, right) =>
        left.clientId < right.clientId ? -1 : left.clientId > right.clientId ? 1 : 0,
      );
    }
    return cachedPeers;
  }

  function local(): PresencePeer {
    return { clientId, author, state: localState ?? {} };
  }

  function exportLocal(): PresenceMessage | undefined {
    return localState === undefined ? undefined : { clientId, author, state: localState, seq };
  }

  function onLocalPresence(listener: (message: PresenceMessage) => void): () => void {
    localListeners.add(listener);
    return () => {
      localListeners.delete(listener);
    };
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { set, peers, local, subscribe, ingest, exportLocal, onLocalPresence };
}

function toPeer(message: PresenceMessage): PresencePeer {
  return { clientId: message.clientId, author: message.author, state: message.state };
}
