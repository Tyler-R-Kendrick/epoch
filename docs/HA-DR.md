# High Availability and Disaster Recovery

Epoch stores repository history as signed events under `.epoch/events`. The HA/DR APIs add three operator tools around that log:

- **Checkpoints** compact a validated prefix of the event log into `.epoch/checkpoints`.
- **Seed nodes** let empty or recovering peers bootstrap from a trusted repository path.
- **Cold backups** serialize a checkpoint plus tail events into a single signed backup file.

## Checkpoints

Use `createCheckpoint(repository, targetEventId?)` to snapshot the current repository. The checkpoint includes the signed events, referenced blobs, current heads, a SHA-256 state hash, and an Ed25519 signature from the repository identity.

Use `pruneEventLog(repository, checkpointId)` only after validating the checkpoint. Pruning removes event files before the checkpoint boundary while retaining the checkpoint and manifest.

Use `restoreFromCheckpoint(repository, checkpointId)` to rebuild local event and blob storage from a saved checkpoint.

## Seed bootstrap

Configure seed nodes with:

```ts
{
  peerId: "seed-a",
  multiaddr: "/srv/epoch/seed-repo",
  trustLevel: "full"
}
```

`bootstrapFromSeed(repository, seed)` restores the seed checkpoint when `trustLevel` is `full`, then copies missing events and blobs with Epoch sync. For `partial` trust, Epoch skips the checkpoint and copies raw signed events only.

Use `bootstrapFromSeeds(repository, seeds)` to try multiple seeds in order until one succeeds.

## Cold backups

`createColdBackup(repository)` creates a checkpoint, signs a backup bundle, and writes it under `.epoch/backups` by default. A custom `StorageBackend` can store the bytes elsewhere.

`restoreFromColdBackup(repository, backupOrPath)` verifies the backup signature, replaces local event/blob storage, restores the checkpoint, and writes any tail events.

## Disaster recovery runbook

The CLI command `epoch dr-plan` prints the recovery checklist:

1. Obtain the newest cold backup from offline storage.
2. Restore it into a replacement repository with `restoreFromColdBackup`.
3. Run the replacement as a full-trust seed node.
4. Bootstrap at least two additional peers from that seed.
5. Run `epoch verify` on the seed and each peer before resuming normal gossip.
