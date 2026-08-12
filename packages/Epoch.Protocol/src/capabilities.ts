export const PROTOCOL_CAPABILITIES = Object.freeze({
  schemaVersion: 1,
  identifiers: { randomBits: 256, encoding: "base32-lower-no-padding", injectableCsprng: true },
  transactions: {
    explicitParents: true,
    compareAndSwapHeads: true,
    atomicPublish: false,
    quarantineAtomicPublish: true,
    repositoryAppendRecovery: false,
    syncBatchAtomic: false,
    gitPromotionAtomic: false,
  },
  changes: { stableLineage: true, multipleParents: true, fragmentKinds: ["add", "delete", "move", "copy", "text", "structured", "binary"] },
  merge: { dependencyClosure: true, durableConflicts: true, conservativeCommutation: true, squashProvenance: true },
  operations: { localOnly: true, concurrentHeads: true, undoRestore: true, secretRedaction: true },
  providers: { trusted: false, mayMutateCanonicalState: false },
  fidelity: { byteExactSplit: true, binarySemanticMerge: false },
} as const);
