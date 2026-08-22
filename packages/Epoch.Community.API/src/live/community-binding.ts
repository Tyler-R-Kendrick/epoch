import {
  communityMessageToEntity,
  validateCommunityEntity,
  validateObjectRef,
  type CommunityEntity,
  type CommunityMessage,
  type CommunityObjectRef,
} from "@epoch/community-core";
import type {
  LiveCommunityAnnotationRecord,
  LiveCommunityBinding,
  LiveCommunityForkRecord,
} from "@epoch/community-runtime";
import type { CommunityStateStore, CommunityStateTransaction } from "../store";

/**
 * Live Space records, written into Community rather than beside it.
 *
 * A Live Session is a canonical Community entity, so a spectator's annotation
 * is a reply on the session's thread and a fork is a Change that opens from
 * it. Keeping either in a private array would produce exactly the store this
 * design refuses: unsearchable, unmoderatable, and invisible to every
 * projection that already knows how to render a thread.
 *
 * What makes these records worth trusting is the anchor. `checkpoint` on the
 * entity's provenance is the checkpoint id, and the presentation log head
 * travels with it, so "this comment is about that state" is a claim anyone can
 * verify against the released log rather than a wall-clock guess.
 */
export interface CreateLiveCommunityBindingOptions {
  readonly store: CommunityStateStore;
  /** Injected so records stay reproducible in tests and deterministic replays. */
  readonly now: () => string;
  /** Mints canonical object ids; the caller owns id policy. */
  readonly nextObjectId: (kind: "message" | "change") => string;
}

const SOURCE_ID = "epoch-live";

export function createLiveCommunityBinding(options: CreateLiveCommunityBindingOptions): LiveCommunityBinding {
  function threadRef(objectId: string): CommunityObjectRef {
    return validateObjectRef({ objectId, kind: "thread" });
  }

  /**
   * The thread has to already exist. Creating it on demand would let a typo
   * mint a second thread nobody is watching, which is the failure this
   * binding exists to prevent.
   */
  function requireThread(transaction: CommunityStateTransaction, objectId: string): CommunityEntity {
    const entity = transaction.entity(objectId);
    if (entity === undefined) {
      throw new Error(`Community thread not found: ${objectId}`);
    }
    return entity;
  }

  function entityOf(message: CommunityMessage, checkpointId: string, host: CommunityEntity): CommunityEntity {
    return communityMessageToEntity(message, {
      provenance: {
        sourceId: SOURCE_ID,
        nativeId: `${message.ref.objectId}`,
        observedAt: message.publishedAt,
        // The existing, validated slot for exactly this.
        checkpoint: checkpointId,
      },
      visibility: host.visibility,
      ...(!(host.ownerId === undefined) && { ownerId: host.ownerId }),
      participantIds: host.participantIds,
    });
  }

  return {
    async recordAnnotation(input): Promise<LiveCommunityAnnotationRecord> {
      return options.store.write((transaction) => {
        const host = requireThread(transaction, input.threadObjectId);
        const parent = threadRef(input.threadObjectId);
        const ref = validateObjectRef({ objectId: options.nextObjectId("message"), kind: "message" });
        const publishedAt = options.now();
        const message: CommunityMessage = {
          ref,
          context: parent,
          authorId: input.principalId,
          body: input.body,
          publishedAt,
          inReplyTo: parent,
          threadRoot: parent,
          relations: [{ type: "reply", source: ref, target: parent }],
          state: "read",
          aliases: [],
        };
        // The anchor fields ride alongside the reply so a projection can show
        // "against checkpoint X, at path Y" without re-deriving anything.
        const entity = validateCommunityEntity({
          ...entityOf(message, input.checkpointId, host),
          fields: {
            ...entityOf(message, input.checkpointId, host).fields,
            liveSessionId: input.sessionId,
            liveCheckpointId: input.checkpointId,
            livePresentationLogHead: input.presentationLogHead,
            ...(input.path !== undefined && { liveAnchorPath: input.path }),
          },
        });
        transaction.putEntity(entity);
        return { objectId: ref.objectId, threadRootId: parent.objectId };
      });
    },

    async openFork(input): Promise<LiveCommunityForkRecord> {
      return options.store.write((transaction) => {
        const host = requireThread(transaction, input.threadObjectId);
        const parent = threadRef(input.threadObjectId);
        const ref = validateObjectRef({ objectId: options.nextObjectId("change"), kind: "change" });
        const publishedAt = options.now();
        const message: CommunityMessage = {
          ref,
          context: parent,
          authorId: input.principalId,
          title: `Fork of live checkpoint ${input.checkpointId}`,
          body: `Continues the work released through checkpoint ${input.checkpointId} of live session ${input.sessionId}.`,
          publishedAt,
          // Its own thread root: a Change is where the forked work is
          // discussed, not another comment on the session.
          threadRoot: ref,
          // ...but the edge back to the session survives, so provenance is a
          // graph relation rather than a sentence in a body.
          relations: [{ type: "provenance", source: ref, target: parent }],
          state: "open",
          aliases: [],
        };
        const entity = validateCommunityEntity({
          ...entityOf(message, input.checkpointId, host),
          fields: {
            ...entityOf(message, input.checkpointId, host).fields,
            liveSessionId: input.sessionId,
            liveCheckpointId: input.checkpointId,
            livePresentationLogHead: input.presentationLogHead,
            livePolicyDigest: input.policyDigest,
            sourceView: input.sourceViewRef,
          },
        });
        transaction.putEntity(entity);
        return { objectId: ref.objectId, changeId: ref.objectId };
      });
    },
  };
}
