# Command family: bundle

## When to load this file

Load it to export a self-verifying evidence package, verify one offline,
push/pull it through an OCI registry, or hydrate local state from a
verified bundle.

## Prerequisites

- Local export/verify/hydrate need nothing beyond an initialized project.
- `push`/`pull` need the ORAS CLI installed and configured, and R3
  authority (they are outward/network effects).

## Commands

```bash
uv run --project <skill-root> gauntlet bundle export
uv run --project <skill-root> gauntlet bundle verify
uv run --project <skill-root> gauntlet bundle push
uv run --project <skill-root> gauntlet bundle pull
uv run --project <skill-root> gauntlet bundle hydrate
```

- `export` writes a local directory/tar bundle containing final/candidate
  artifacts, manifests, spec and policy digests, the relevant event history
  (JSONL), traces by reference or redacted inclusion, counterexamples,
  evaluator results, promotion/release records, provenance, and optional
  attestations. Redaction is applied to every payload *before* any byte is
  written.
- `verify` is fully offline: schemas, per-entry SHA-256 digests, reference
  resolution, redaction flags, and signatures when present. Any tampering
  fails verification (exit 9).
- `push`/`pull` call the ORAS CLI through the effect/authority layer as
  argv arrays (no shell; references validated against option injection).
  `--dry-run` prints the exact argv without executing.
- `hydrate` reconstructs local state from a verified bundle and never
  silently overwrites divergent local state.

## Bundle layout and media types

```text
<bundle>/
  manifest.json          BundleManifestV1 (application/vnd.gauntlet.bundle.v1+json)
  oci-layout             {"imageLayoutVersion": "1.0.0"}
  oci-manifest.json      OCI-style artifact manifest listing each entry
  entries/spec.yaml      application/vnd.gauntlet.spec.v1+yaml
  entries/events.jsonl   application/vnd.gauntlet.event-stream.v1+jsonl
  entries/counterexamples/*.json   application/vnd.gauntlet.counterexample.v1+json
  entries/evaluations/*.json       application/vnd.gauntlet.evaluation.v1+json
  entries/promotions/*.json        application/vnd.gauntlet.promotion.v1+json
  entries/provenance.json          application/vnd.gauntlet.provenance.v1+json
```

The OCI-compatible layout is one `application/vnd.oci.image.manifest.v1+json`
shaped artifact manifest whose layers list each entry with media type,
digest, size, and title annotation. The local format never requires a
registry.

## Durable outputs

- The bundle directory/archive itself (under `.gauntlet/exports/`, ignored;
  move or publish deliberately).
- Ledger kind `bundles`: an immutable record per export/publication with
  the bundle digest.
- `hydrate` writes reconstructed records/artifacts into their normal
  locations, refusing divergent overwrites.

## Action and effect class

`export` is R1 (local write). `verify` is R0. `push`/`pull` are network
effects through the authority layer — R3 under the default policy (`push`
maps to the `push`/`publish` capabilities, `approval: human`); `pull` of
external evidence is a controlled network interaction (R2, approval
required). `hydrate` is R1 and refuses conflicts (exit 6) rather than
merging silently.

## Failure and recovery

- `verify` failure names the entry and check (digest mismatch, unresolved
  reference, missing redaction, bad signature); treat the bundle as
  untrusted — do not hydrate it.
- Missing ORAS CLI: exit 8 with installation guidance; nothing partial
  happens.
- A `push` interrupted mid-transfer follows unknown-outcome rules (exit 7):
  reconcile against the registry by digest; do not blind-retry.
- `hydrate` onto divergent local state reports the conflicting paths and
  stops; reconcile manually or hydrate into a fresh project.

## `--json` example

```bash
$ uv run --project <skill-root> gauntlet bundle verify --json
{
  "bundle": ".gauntlet/exports/campaign-….bundle",
  "entries": 17,
  "digests_ok": true,
  "references_ok": true,
  "redaction_ok": true,
  "signatures": "absent",
  "verdict": "verified"
}
```

## External docs

- ORAS CLI: <https://oras.land/docs/>
- OCI image/artifact manifest:
  <https://github.com/opencontainers/image-spec>
