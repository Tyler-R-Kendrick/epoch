# OpenZL Host Entropy Codec

Epoch uses [OpenZL](https://openzl.org/)-style **entity-aware** compression for
blob/artifact bytes and semantic changediffs. The decision is
[ADR-0053](design-decisions/0053-openzl-host-entropy-codec.md). The package is
`@epoch/openzl`.

## Invariants

- Content identity is always **SHA-256 of plaintext**.
- `@epoch/semantic` plans compression only; it never links OpenZL.
- Compressed objects are `epoch.openzl-frame/v1` envelopes with `codecId:
  "openzl"`, profile, entity type, and `plaintextSha256`.
- Sync v2 advertises `openzl` and `identity`; peers negotiate safely.

## Usage

```ts
import {
  compressOpenZl,
  decompressOpenZl,
  compressChangediff,
  encodeObjectForSync,
} from "@epoch/openzl";

const packed = compressOpenZl(jsonBytes, { entityType: "application/json" });
const plain = decompressOpenZl(packed.frame);

const wire = encodeObjectForSync(
  { objectId, kind: "chunk", bytes: plainChunk, entityType: "application/octet-stream" },
  "openzl",
);
```

Entity profiles map MIME-ish types to transforms (`json`, `text`, `markdown`,
`semantic-patch`, `binary`, `generic`) before entropy coding.
