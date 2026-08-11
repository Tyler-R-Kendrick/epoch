import { validateObjectRef, type CommunityObjectKind, type CommunityObjectRef } from "./identity";

export interface CommunityRelation {
  readonly type:
    | "reply" | "quote" | "mention" | "provenance" | "promotion" | "replacement"
    | "moderation" | "attachment" | "backlink";
  readonly source: CommunityObjectRef;
  readonly target: CommunityObjectRef;
}

export interface CommunityTombstone {
  readonly formerKind: CommunityObjectKind;
  readonly reason: "deleted" | "moderated" | "missing" | "unavailable" | "unauthorized";
  readonly deletedAt?: string;
  readonly replacement?: CommunityObjectRef;
}

export interface CommunityMessage {
  readonly ref: CommunityObjectRef;
  readonly context: CommunityObjectRef;
  readonly authorId: string;
  readonly title?: string;
  readonly body: string;
  readonly publishedAt: string;
  readonly updatedAt?: string;
  readonly inReplyTo?: CommunityObjectRef;
  readonly threadRoot: CommunityObjectRef;
  readonly relations: readonly CommunityRelation[];
  readonly state: string;
  readonly aliases: readonly string[];
  readonly tombstone?: CommunityTombstone;
}

export interface CommunityMessageGraph {
  messageOf(ref: CommunityObjectRef | string): CommunityMessage | undefined;
  parentOf(ref: CommunityObjectRef | string): CommunityObjectRef | undefined;
  rootOf(ref: CommunityObjectRef | string): CommunityObjectRef;
  childrenOf(ref: CommunityObjectRef | string): readonly CommunityObjectRef[];
  descendantsOf(ref: CommunityObjectRef | string): readonly CommunityObjectRef[];
  firstChildOf(ref: CommunityObjectRef | string): CommunityObjectRef | undefined;
  nextSiblingOf(ref: CommunityObjectRef | string): CommunityObjectRef | undefined;
  previousSiblingOf(ref: CommunityObjectRef | string): CommunityObjectRef | undefined;
  nextUnreadOf(ref: CommunityObjectRef | string): CommunityObjectRef | undefined;
}

export interface CommunityThreadRelations {
  readonly object: CommunityObjectRef;
  readonly parent?: CommunityObjectRef;
  readonly root: CommunityObjectRef;
  readonly children: readonly CommunityObjectRef[];
  readonly descendants: readonly CommunityObjectRef[];
  readonly previousSibling?: CommunityObjectRef;
  readonly nextSibling?: CommunityObjectRef;
  readonly nextUnread?: CommunityObjectRef;
}

export function createMessageGraph(input: readonly CommunityMessage[]): CommunityMessageGraph {
  const messages = new Map<string, CommunityMessage>();
  for (const message of input) {
    const ref = validateObjectRef(message.ref);
    validateObjectRef(message.context);
    validateObjectRef(message.threadRoot);
    if (message.inReplyTo !== undefined) validateObjectRef(message.inReplyTo);
    if (messages.has(ref.objectId)) throw new Error(`Duplicate community object ID: ${ref.objectId}`);
    messages.set(ref.objectId, message);
  }

  for (const message of input) {
    const parent = message.inReplyTo;
    if (parent !== undefined && !messages.has(parent.objectId)) {
      messages.set(parent.objectId, missingParent(parent, message));
    }
  }

  const children = new Map<string, CommunityObjectRef[]>();
  for (const message of input) {
    if (message.inReplyTo === undefined) continue;
    const values = children.get(message.inReplyTo.objectId) ?? [];
    values.push(message.ref);
    children.set(message.inReplyTo.objectId, values);
  }

  const idOf = (ref: CommunityObjectRef | string): string => typeof ref === "string" ? ref : ref.objectId;
  const messageOf = (ref: CommunityObjectRef | string): CommunityMessage | undefined => messages.get(idOf(ref));
  const parentOf = (ref: CommunityObjectRef | string): CommunityObjectRef | undefined => {
    const parent = messageOf(ref)?.inReplyTo;
    return parent === undefined ? undefined : (messages.get(parent.objectId)?.ref ?? parent);
  };
  const childrenOf = (ref: CommunityObjectRef | string): readonly CommunityObjectRef[] => [...(children.get(idOf(ref)) ?? [])];
  const descendantsOf = (ref: CommunityObjectRef | string): readonly CommunityObjectRef[] => {
    const result: CommunityObjectRef[] = [];
    const visit = (objectId: string, ancestors: ReadonlySet<string>): void => {
      if (ancestors.has(objectId)) throw new Error(`Community reply graph contains a cycle at ${objectId}`);
      const nextAncestors = new Set(ancestors).add(objectId);
      for (const child of children.get(objectId) ?? []) {
        result.push(child);
        visit(child.objectId, nextAncestors);
      }
    };
    visit(idOf(ref), new Set());
    return result;
  };
  const rootOf = (ref: CommunityObjectRef | string): CommunityObjectRef => {
    const start = messageOf(ref);
    if (start === undefined) throw new Error(`Community object not found: ${idOf(ref)}`);
    let current = start;
    const visited = new Set<string>();
    while (current.inReplyTo !== undefined) {
      if (visited.has(current.ref.objectId)) throw new Error(`Community reply graph contains a cycle at ${current.ref.objectId}`);
      visited.add(current.ref.objectId);
      const parent = messages.get(current.inReplyTo.objectId);
      if (parent === undefined) return current.inReplyTo;
      current = parent;
    }
    return current.ref;
  };
  const sibling = (ref: CommunityObjectRef | string, delta: -1 | 1): CommunityObjectRef | undefined => {
    const parent = parentOf(ref);
    if (parent === undefined) return undefined;
    const siblings = children.get(parent.objectId) ?? [];
    const index = siblings.findIndex((candidate) => candidate.objectId === idOf(ref));
    return index < 0 ? undefined : siblings[index + delta];
  };
  const nextUnreadOf = (ref: CommunityObjectRef | string): CommunityObjectRef | undefined => {
    const root = rootOf(ref);
    const ordered = [root, ...descendantsOf(root)];
    const current = ordered.findIndex((candidate) => candidate.objectId === idOf(ref));
    return ordered.slice(current + 1).find((candidate) => messages.get(candidate.objectId)?.state !== "read");
  };

  return Object.freeze({
    messageOf,
    parentOf,
    rootOf,
    childrenOf,
    descendantsOf,
    firstChildOf: (ref: CommunityObjectRef | string) => childrenOf(ref)[0],
    nextSiblingOf: (ref: CommunityObjectRef | string) => sibling(ref, 1),
    previousSiblingOf: (ref: CommunityObjectRef | string) => sibling(ref, -1),
    nextUnreadOf,
  });
}

export function threadRelations(graph: CommunityMessageGraph, ref: CommunityObjectRef): CommunityThreadRelations {
  return {
    object: ref,
    parent: graph.parentOf(ref),
    root: graph.rootOf(ref),
    children: graph.childrenOf(ref),
    descendants: graph.descendantsOf(ref),
    previousSibling: graph.previousSiblingOf(ref),
    nextSibling: graph.nextSiblingOf(ref),
    nextUnread: graph.nextUnreadOf(ref),
  };
}

function missingParent(parent: CommunityObjectRef, child: CommunityMessage): CommunityMessage {
  return {
    ref: { ...parent, kind: "tombstone" },
    context: child.context,
    authorId: "unavailable",
    body: "",
    publishedAt: child.publishedAt,
    threadRoot: parent,
    relations: [],
    state: "unavailable",
    aliases: [],
    tombstone: { formerKind: parent.kind, reason: "missing" },
  };
}
