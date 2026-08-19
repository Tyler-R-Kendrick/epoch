# Exit And Migration

Custody without exit is lock-in. Every trust posture can export a signed
`epoch-exit/v1` bundle, import it on a fresh repository, and migrate a
community while keeping ADR-0023 bindings.

## Bundle

```ts
type ExitBundle = {
  schema: "epoch-exit/v1";
  events: EventData[];
  blobs: Record<string, string>;
  bindings: BindingRecord[];
  manifest: { sha256: string; eventCount: number; headId: string };
  posture?: TrustPosture;
};
```

`exportExitBundle` hashes canonical `{ events, blobs, bindings, headId }`.
Blobs are the content-addressed bytes `verify()` needs.
`parseExitBundle` / `importExitBundle` fail closed on:

- wrong schema
- truncated event lists vs `manifest.eventCount`
- digest mismatch (tamper)
- verify failure after import
- crafted posture downgrade (`hosted`/`private` → `open` without an explicit
  migrate)

## CLI

| Command | Behavior |
|---|---|
| `epoch export-exit [--out FILE] FILE` | Write a verified `epoch-exit/v1` bundle |
| `epoch import-exit FILE` | Import into `--repo`; `epoch verify` must stay green |
| `epoch migrate-community --from PATH --to PATH [--fromPosture …] [--toPosture open]` | Copy verified history; refuse crafted downgrade |

Hosted→open and private→open are tool-supported and fail closed.

## Identity continuity

Bindings travel with the bundle. The same principal in two communities is
disambiguated by binding records, not by transport names. Verify with
`verifyBinding` (ADR-0023).

## Tests

`test/unit/exit-bundle.test.ts` covers export → import subset of event IDs,
binding survival, tamper deny, truncation deny, and posture-downgrade deny.
E05/E09 consume this surface and remain **rejected** until the full corpus
passes. See [protocol experiments](protocol-experiments.md).
