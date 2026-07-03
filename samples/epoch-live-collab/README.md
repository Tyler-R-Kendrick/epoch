# Epoch Live Collab Sample

A runnable Node demonstration of [`@epoch/live`](../../packages/Epoch.Live) — the
browser client that competes with Redux and Yjs for rollback and data
propagation. Two peers share an in-memory relay and exercise the whole stack on
one signed event log:

- **dispatch + propagation** — one peer's action converges to the other;
- **conflict-free merge** — concurrent edits merge with no conflict;
- **replicated rollback** — a signed `rollback` on one peer converges on the
  other, with a full audit trail (unlike Redux's ephemeral time-travel);
- **undo** — restores the pre-rollback state;
- **presence** — ephemeral, unsigned awareness that never enters the log.

## Run

```bash
npm run build -w @epoch/sample-epoch-live-collab
npm run start -w @epoch/sample-epoch-live-collab
```

The program prints a narrated summary and exits non-zero if the replicas fail to
converge or either signed log fails verification. The same flow is asserted in
`test/unit/sample-epoch-live-collab.test.ts`.
