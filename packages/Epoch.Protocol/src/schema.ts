import { PROTOCOL_EVENT_SCHEMAS } from "./events";
import { CANONICAL_ID_KINDS } from "./ids";

/** Deterministic, dependency-free JSON Schema emitted by the authoritative runtime contract. */
export function protocolJsonSchemas() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://epoch.dev/schemas/protocol/events-v1.json",
    title: "Epoch Protocol Events v1",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "type", "eventId", "revisionId", "body"],
    properties: {
      schemaVersion: { const: 1 },
      type: { enum: [...PROTOCOL_EVENT_SCHEMAS] },
      eventId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$" },
      revisionId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$" },
      body: { type: "object" },
    },
    $defs: {
      canonicalId: {
        type: "string",
        pattern: `^epoch:(${CANONICAL_ID_KINDS.join("|")}):[a-z2-7]{52}$`,
      },
      digest: { type: "string", pattern: "^[a-f0-9]{64}$" },
      repositoryPath: { type: "string", minLength: 1, maxLength: 4096 },
    },
  } as const;
}
