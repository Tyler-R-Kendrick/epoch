import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROTOCOL_CAPABILITIES,
  PROTOCOL_EVENT_SCHEMAS,
  ProtocolError,
  assertProtocolEvent,
  createCanonicalId,
  legacyChangeId,
  parseCanonicalId,
  parseChangeId,
  protocolJsonSchemas,
  type ProtocolEvent,
} from "../src/index";

const tests: readonly [string, () => void][] = [
  ["PROTO-ID-001 canonical vectors are stable across runtimes", canonicalVectors],
  ["PROTO-ID-002 malformed and unknown identifiers fail closed", malformedIdentifiers],
  ["PROTO-ID-003 legacy change IDs decode only through compatibility parser", legacyCompatibility],
  ["PROTO-SCHEMA-001 event schemas accept exact versioned payloads", schemaValidation],
  ["PROTO-SCHEMA-002 unknown fields variants and versions fail closed", schemaFailures],
  ["PROTO-CAP-001 capability manifest is explicit and machine-readable", capabilityManifest],
];

for (const [name, run] of tests) {
  try {
    run();
  } catch (error) {
    throw new Error(name, { cause: error });
  }
}

function canonicalVectors(): void {
  const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/canonical-id-vectors.json"), "utf8")) as {
    readonly schemaVersion: number;
    readonly vectors: readonly { readonly kind: "change" | "repo"; readonly bytesHex: string; readonly canonicalId: string }[];
  };
  assert.equal(fixture.schemaVersion, 1);
  for (const vector of fixture.vectors) {
    const bytes = Uint8Array.from(vector.bytesHex.match(/.{2}/gu)!.map((value) => Number.parseInt(value, 16)));
    const id = createCanonicalId(vector.kind, () => bytes);
    assert.equal(id, vector.canonicalId);
    assert.deepEqual(parseCanonicalId(id), { kind: vector.kind, token: id.split(":")[2] });
    assert.equal(createCanonicalId(vector.kind, () => bytes), id);
  }
}

function malformedIdentifiers(): void {
  for (const value of [
    "epoch:change:ABC", "epoch:change:a/b", "epoch:change:a b", "epoch:unknown:abc",
    "epoch:change:аbc", `epoch:change:${"a".repeat(129)}`, "epoch:change:legacy:event",
  ]) {
    assert.throws(() => parseCanonicalId(value), (error) => error instanceof ProtocolError && error.code === "invalid-id");
  }
  assert.throws(() => createCanonicalId("change", () => new Uint8Array(31)), /256 bits/u);
}

function legacyCompatibility(): void {
  const legacy = legacyChangeId("01HF7YAT00Z7XR5R6J5M0D8V0F");
  assert.equal(legacy, "epoch:change:legacy:01HF7YAT00Z7XR5R6J5M0D8V0F");
  assert.deepEqual(parseChangeId(legacy), { kind: "change", legacyEventId: "01HF7YAT00Z7XR5R6J5M0D8V0F" });
  assert.throws(() => parseCanonicalId(legacy), (error) => error instanceof ProtocolError && error.code === "invalid-id");
}

function schemaValidation(): void {
  const event: ProtocolEvent = {
    schemaVersion: 1,
    type: "change.created",
    eventId: "event-01",
    revisionId: "event-01",
    body: {
      changeId: canonical("change", "a"),
      baseFrontier: ["event-base"],
      baseTreeDigest: digest("a"),
      parentRevisionIds: [],
      fragments: [{
        fragmentId: canonical("fragment", "b"),
        kind: "add",
        path: "src/new.ts",
        precondition: { kind: "absent" },
        resultDigest: digest("b"),
        contentRef: "sha256:" + digest("c"),
        order: 0,
        dependencies: [],
        provenance: { principalId: canonical("principal", "c") },
        mergeStrategy: "exact",
      }],
      resultingTreeDigest: digest("d"),
      authorPrincipalId: canonical("principal", "c"),
    },
  };
  assert.deepEqual(assertProtocolEvent(event), event);
  assert.ok(PROTOCOL_EVENT_SCHEMAS.includes("merge.plan.applied"));
  assert.equal(protocolJsonSchemas().$id, "https://epoch.dev/schemas/protocol/events-v1.json");
}

function schemaFailures(): void {
  const base = {
    schemaVersion: 1,
    type: "repository.identity",
    eventId: "event-01",
    revisionId: "event-01",
    body: { repositoryId: canonical("repo", "a"), principalId: canonical("principal", "b") },
  };
  for (const value of [
    { ...base, schemaVersion: 2 },
    { ...base, type: "repository.identity.admin" },
    { ...base, extra: true },
    { ...base, revisionId: "other-event" },
  ]) {
    assert.throws(() => assertProtocolEvent(value), (error) => error instanceof ProtocolError && error.code === "invalid-schema");
  }
}

function capabilityManifest(): void {
  assert.equal(PROTOCOL_CAPABILITIES.schemaVersion, 1);
  assert.equal(PROTOCOL_CAPABILITIES.transactions.atomicPublish, true);
  assert.equal(PROTOCOL_CAPABILITIES.merge.conservativeCommutation, true);
  assert.equal(PROTOCOL_CAPABILITIES.providers.mayMutateCanonicalState, false);
  assert.equal(PROTOCOL_CAPABILITIES.fidelity.binarySemanticMerge, false);
}

function canonical(kind: string, token: string): string {
  return `epoch:${kind}:${token.repeat(52).slice(0, 52)}`;
}

function digest(token: string): string {
  return token.repeat(64).slice(0, 64);
}
