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

## Change Graph Objects, Sync, And Interop Recovery

Backups for Change Graph and sync contracts must retain canonical events, object bytes,
chunk manifests, promises, workspace manifests, sync receipts/cursors, mirror
rules/checkpoints, and external credential/resolver configuration as separate
classes of state.

- A promised missing object is recoverable only while its source remains
  available. Never replace missing bytes with zero-filled placeholders.
- Verify ordered chunk offsets, lengths, per-chunk hashes, full size, and full
  SHA-256 before materialization.
- Resume `epoch.sync/v2` only from a verified cursor and receipt. Unknown
  protocol, chunker, storage, or required extension versions fail closed.
- Keep received events/objects and Git pushes in quarantine until graph,
  signature, digest, and expected-head/OID checks pass.
- Mirror drift produces an import/conflict ref and pauses the affected ref. It
  does not rewrite declared authority during recovery.
- The reference CLI store and in-memory identity ledger are not sufficient
  disaster-recovery authorities. Production hosts must back them with the
  canonical event log and injected transactional persistence.
- SWHIDs remain verifiable without the remote service, but successful archival
  is claimed only after the injected Software Heritage transport returns a
  matching succeeded/full result.

A metadata-only backup is not a complete offline backup. Use full hydration and
verified export when promised sources cannot be included in the recovery plan.

## Related Docs

- [Current Design](design.md#compacts-and-recovery)
- [Feature Registry](features.md#f-010---compacts-cold-backups-and-seed-bootstrap)
- [CLI Reference](cli.md)
- [Change Graph And Operation History](change-graph.md)
- [Object Resolver And Native Sync](resolver-sync.md)
