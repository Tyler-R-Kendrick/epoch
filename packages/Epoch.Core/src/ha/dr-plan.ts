export function disasterRecoveryPlan(): string {
  return [
    "Epoch HA/DR recovery plan:",
    "1. Obtain the newest cold backup from the configured offline storage location.",
    "2. Initialize a replacement repository and restore it with restoreFromColdBackup.",
    "3. Start that repository as a full-trust seed node and keep it online.",
    "4. Bootstrap at least two fresh peers from the seed using bootstrapFromSeed or bootstrapFromSeeds.",
    "5. Run repository verification on the seed and each peer, then resume normal gossip.",
  ].join("\n");
}
