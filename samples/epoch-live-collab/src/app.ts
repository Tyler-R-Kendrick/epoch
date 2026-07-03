import {
  createInMemoryRelay,
  createInMemoryRelayProvider,
  createLiveStore,
  stableJson,
} from "@epoch/live";

export interface CollabState {
  readonly title?: string;
  readonly [key: string]: unknown;
}

export interface CollabSummary {
  readonly finalState: CollabState;
  readonly converged: boolean;
  readonly rollbackReplicated: boolean;
  readonly undoRestored: boolean;
  readonly bobSawPresence: boolean;
  readonly aliceProblems: number;
  readonly bobProblems: number;
  readonly steps: readonly string[];
}

/**
 * Demonstrates @epoch/live end to end: two peers, a shared relay, offline-safe
 * dispatch, conflict-free convergence, a durable and *replicated* rollback,
 * undo, and ephemeral presence — all over one signed event log.
 */
export function runLiveCollabDemo(): CollabSummary {
  const steps: string[] = [];
  const relay = createInMemoryRelay();

  const alice = createLiveStore<CollabState>({ entity: "doc", author: "alice", initialState: { title: "untitled" } });
  const bob = createLiveStore<CollabState>({ entity: "doc", author: "bob", initialState: { title: "untitled" } });
  alice.connect(createInMemoryRelayProvider(relay));
  bob.connect(createInMemoryRelayProvider(relay));
  steps.push("Two peers (alice, bob) joined a shared relay.");

  const firstTitle = alice.dispatch({ type: "set-title", payload: { title: "Design doc" } });
  steps.push(`alice set the title; bob converged to "${String(bob.getState().title)}".`);

  bob.dispatch({ type: "comment", payload: { bobNote: "looks good" } });
  alice.dispatch({ type: "comment", payload: { aliceNote: "shipping it" } });
  steps.push("Concurrent comments from both peers merged with no conflict.");

  alice.presence.set({ cursor: 12, selecting: "title" });
  const bobSawPresence = bob.presence.peers().some((peer) => peer.author === "alice" && "cursor" in peer.state);
  steps.push(`bob observed alice's ephemeral presence: ${String(bobSawPresence)}.`);

  const preRollback = alice.getState();
  alice.rollbackTo(firstTitle.events[0].id, "revert to the first accepted title");
  const rollbackReplicated =
    bob.getState().title === "Design doc" && !("bobNote" in bob.getState()) && !("aliceNote" in bob.getState());
  steps.push(`alice rolled back; the signed rollback replicated to bob: ${String(rollbackReplicated)}.`);

  alice.undo();
  const undoRestored = stableJson(alice.getState()) === stableJson(preRollback);
  steps.push(`alice pressed undo; the pre-rollback state was restored: ${String(undoRestored)}.`);

  return {
    finalState: alice.getState(),
    converged: stableJson(alice.getState()) === stableJson(bob.getState()),
    rollbackReplicated,
    undoRestored,
    bobSawPresence,
    aliceProblems: alice.log().verify().length,
    bobProblems: bob.log().verify().length,
    steps,
  };
}

export function formatLiveCollabSummary(summary: CollabSummary): string {
  const lines = [
    "Epoch Live — collaborative rollback and propagation demo",
    "",
    ...summary.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `Final converged state: ${stableJson(summary.finalState)}`,
    `Replicas converged:    ${String(summary.converged)}`,
    `Rollback replicated:   ${String(summary.rollbackReplicated)}`,
    `Undo restored state:   ${String(summary.undoRestored)}`,
    `Signed-log problems:   alice=${summary.aliceProblems}, bob=${summary.bobProblems}`,
  ];
  return lines.join("\n");
}
