# High Availability and Disaster Recovery

Epoch stores repository history as signed events under `.epoch/events`. The current HA/DR surface provides three operator tools around that log:

- **Compacts** materialize a validated prefix of the event log into `.epoch/compacts`.
- **Seed bootstrap** lets an empty or recovering local peer copy state from a trusted repository path.
- **Cold backups** serialize a compact plus tail events into a single signed backup file.

## Compacts

Use `createCompact(repository, targetEventId?)` to materialize the current repository, or a prefix ending at `targetEventId`. A compact includes signed events, referenced blobs, current heads, a SHA-256 state hash, and an Ed25519 signature from the repository identity.

Use `pruneEventLogBeforeCompact(repository, compactId)` only after validating the compact. Pruning removes event files before the compact boundary while retaining the compact and manifest.

Use `restoreFromCompact(repository, compactId)` to rebuild local event and blob storage from a saved compact.

## Seed Bootstrap

Configure seed nodes with:

```ts
{
  peerId: "seed-a",
  multiaddr: "/srv/epoch/seed-repo",
  trustLevel: "full"
}
```

`bootstrapFromSeed(repository, seed)` restores the seed compact when `trustLevel` is `full`, then copies missing events and blobs with Epoch sync. For `partial` trust, Epoch copies raw signed events only.

Use `bootstrapFromSeeds(repository, seeds)` to try multiple local seed paths in order until one succeeds.

## Cold Backups

`createColdBackup(repository)` creates a compact, signs a backup bundle, and writes it under `.epoch/backups` by default. A custom `StorageBackend` can store the bytes elsewhere.

`restoreFromColdBackup(repository, backupOrPath)` verifies the backup signature, replaces local event/blob storage, restores the compact, and writes any tail events.

## Disaster Recovery Runbook

The CLI command `epoch dr-plan` prints the recovery checklist:

1. Obtain the newest cold backup from offline storage.
2. Restore it into a replacement repository with `restoreFromColdBackup`.
3. Run the replacement as a full-trust seed node.
4. Bootstrap at least two additional peers from that seed.
5. Run `epoch verify` on the seed and each peer before resuming normal sync.
