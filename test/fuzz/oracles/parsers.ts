import assert from "node:assert/strict";
import { assertProtocolEvent, createCanonicalId, parseCanonicalId, parseChangeId, parseRevset } from "@epoch/protocol";
import { assertChunkManifest, createChunkManifest, decodeChunkManifest, encodeChunkManifest } from "@epoch/core";
import { gitProtocolEnvironment, parsePktLines, encodePktLine, parseRemoteHelperCommand, proposalRef } from "@epoch/git-proxy";
import {
  decodeF3Archive, decodeForgeFed, decodeNip34, decodeRadicle,
  encodeF3Archive, encodeForgeFed, encodeNip34, encodeRadicle, type ForgeObject,
} from "@epoch/forge";
import { formatSwhid, parseSwhid, type SwhObjectKind } from "@epoch/software-heritage";
import { parseCommunityQuery } from "@epoch/community-core";

/** Shared parse oracles used by smoke, fast-check, and Jazzer wrappers. */

export function assertCanonicalIdRoundtrip(bytes: Uint8Array | Buffer): string {
  const identifier = createCanonicalId("change", (length) => {
    assert.equal(length, 32);
    return bytes instanceof Buffer ? bytes : Buffer.from(bytes);
  });
  assert.equal(parseCanonicalId(identifier, "change").kind, "change");
  const mutations = [
    identifier.toUpperCase(),
    identifier + "/escape",
    identifier.replace(/.$/u, "1"),
    `epoch:unknown:${identifier.split(":")[2]}`,
    `epoch:change:${"a".repeat(53)}`,
    `epoch:change:${"é".repeat(52)}`,
  ];
  for (const mutation of mutations) {
    assert.throws(() => parseCanonicalId(mutation), /Invalid canonical ID|bounded ASCII/u);
  }
  assert.throws(() => parseChangeId("epoch:change:legacy:event"), /Invalid canonical ID/u);
  return identifier;
}

export function assertProtocolEventClosed(event: {
  schemaVersion: number;
  type: string;
  eventId: string;
  revisionId: string;
  body: Record<string, unknown>;
}): void {
  assert.equal(assertProtocolEvent(JSON.parse(JSON.stringify(event))).eventId, event.eventId);
  assert.throws(() => assertProtocolEvent({ ...event, unknown: true }), /Unknown event field/u);
  assert.throws(() => assertProtocolEvent({
    ...event,
    body: { ...event.body, units: -1 },
  }), /nonnegative/u);
  assert.throws(() => assertProtocolEvent({ ...event, revisionId: `other-${event.eventId}` }), /must equal/u);
}

export function assertRevsetDeterministic(expression: string): void {
  assert.deepEqual(parseRevset(expression), parseRevset(expression));
  for (const invalid of ["", "unknown()", "heads(", `${"a".repeat(4097)}()`]) {
    assert.throws(() => parseRevset(invalid), /revset|unknown|expected/u);
  }
}

export function assertChunkManifestRoundtrip(bytes: Buffer, contentType: string): void {
  const manifest = createChunkManifest(bytes, contentType);
  assert.deepEqual(decodeChunkManifest(encodeChunkManifest(manifest)), manifest);
  assert.throws(
    () => assertChunkManifest({ ...manifest, size: Number.MAX_SAFE_INTEGER, chunks: manifest.chunks }),
    /size|layout/u,
  );
}

export function assertPktLineRoundtrip(payload: Buffer): void {
  assert.deepEqual(parsePktLines(encodePktLine(payload)), [payload.toString("utf8")]);
  assert.throws(() => parsePktLines(Buffer.from("ffffshort")), /frame|packet/u);
}

export function assertRemoteHelperClosed(verbosity: string, proposalName: string): void {
  assert.deepEqual(parseRemoteHelperCommand(`option verbosity ${verbosity}`), {
    command: "option", name: "verbosity", value: verbosity,
  });
  assert.equal(proposalRef(proposalName), `refs/epoch/for/${proposalName}`);
  for (const invalid of ["../escape", "bad/ref", "bad ref", "bad\nref", "-option"]) {
    assert.throws(() => proposalRef(invalid), /Invalid/u);
  }
  assert.deepEqual(gitProtocolEnvironment({ "git-protocol": "version=2:agent=epoch" }), {
    GIT_PROTOCOL: "version=2:agent=epoch",
  });
  for (const invalid of ["version=2\nGIT_CONFIG_COUNT=1", "version=2;sh", "version=two", " version=2"]) {
    assert.throws(() => gitProtocolEnvironment({ "git-protocol": invalid }), /Invalid/u);
  }
}

export function assertForgeCodecSubset(value: ForgeObject, index: number): void {
  assert.deepEqual(decodeF3Archive(encodeF3Archive([value]).bytes).objects, [value]);
  if (value.kind === "issue" || value.kind === "change") {
    const { labels: _labels, ...declaredSubset } = value;
    assert.deepEqual(decodeForgeFed(encodeForgeFed(value).document).object, declaredSubset);
  } else {
    assert.throws(() => encodeForgeFed(value), /unsupported ForgeFed kind/u);
  }
  const nip = encodeNip34(value, {
    eventId: `nostr-${index}`, pubkey: "pubkey", createdAt: 100, expiresAt: 1_000, audience: ["maintainers"],
  }).event;
  const signatureEvidence = {
    verified: true as const, eventId: nip.id, pubkey: nip.pubkey, verifier: "fuzz-fixture",
  };
  assert.equal(
    decodeNip34(nip, { now: 500, audience: "maintainers", seen: new Set(), signatureEvidence }).object.objectId,
    value.objectId,
  );
  assert.throws(() => decodeNip34(nip, { now: 1_000, signatureEvidence }), /expired/u);
  assert.throws(() => decodeNip34(nip, { now: 500, audience: "outsider", signatureEvidence }), /audience/u);
  const radicle = encodeRadicle(value, {
    radicleId: `rad:z${index}`, signedRef: `refs/rad/sigrefs/${index}`, sequence: index + 1,
  }).record;
  const signedRefEvidence = {
    verified: true as const,
    radicleId: radicle.radicleId,
    signedRef: radicle.signedRef,
    sequence: radicle.sequence,
    revision: radicle.revision,
    verifier: "fuzz-fixture",
  };
  assert.equal(
    decodeRadicle(radicle, { lastSequence: index, signedRefEvidence }).object.objectId,
    value.objectId,
  );
  assert.throws(() => decodeRadicle(radicle, { lastSequence: index + 1, signedRefEvidence }), /stale/u);
}

export function assertSwhidRoundtrip(value: {
  version: 1;
  kind: SwhObjectKind;
  digest: string;
  qualifiers: Readonly<Record<string, string>>;
}): string {
  const swhid = {
    version: 1 as const,
    kind: value.kind,
    digest: value.digest,
    qualifiers: value.qualifiers,
  };
  const canonical = formatSwhid(swhid);
  assert.equal(formatSwhid(parseSwhid(canonical)), canonical);
  for (const invalid of [
    canonical.toUpperCase(),
    canonical.replace("swh:1:", "swh:2:"),
    canonical + ";unknown=x",
    canonical + ";path=duplicate",
  ]) {
    assert.throws(() => parseSwhid(invalid), /invalid|unsupported|duplicate|malformed/iu);
  }
  return canonical;
}

/** Fail-closed wrappers for Jazzer: swallow expected validation errors only. */
export function fuzzSafeRevset(input: string): void {
  try { parseRevset(input); } catch (error) {
    if (!(error instanceof Error) || !/revset|unknown|expected|bounded/iu.test(error.message)) throw error;
  }
}

export function fuzzSafeCanonicalId(input: string): void {
  try { parseCanonicalId(input); } catch (error) {
    if (!(error instanceof Error) || !/Invalid canonical ID|bounded ASCII/iu.test(error.message)) throw error;
  }
}

export function fuzzSafePktLines(buf: Buffer): void {
  try { parsePktLines(buf); } catch (error) {
    if (!(error instanceof Error) || !/frame|packet|length|utf/iu.test(error.message)) throw error;
  }
}

export function fuzzSafeSwhid(input: string): void {
  try { parseSwhid(input); } catch (error) {
    // Include "malformed" — ProtocolError uses "Malformed SWHID qualifier" for trailing ';'.
    if (!(error instanceof Error) || !/invalid|unsupported|duplicate|malformed/iu.test(error.message)) throw error;
  }
}

export function fuzzSafeProtocolEventJson(raw: string): void {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return; }
  try { assertProtocolEvent(parsed); } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Expected schema failures stay quiet; anything else aborts the fuzzer.
  }
}

export function fuzzSafeRemoteHelper(line: string): void {
  try { parseRemoteHelperCommand(line); } catch (error) {
    if (!(error instanceof Error) || !/Invalid|unknown|option|command/iu.test(error.message)) throw error;
  }
  try { proposalRef(line.slice(0, 64)); } catch (error) {
    if (!(error instanceof Error) || !/Invalid/iu.test(error.message)) throw error;
  }
}

export function fuzzSafeChunkManifestJson(raw: string): void {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return; }
  try { assertChunkManifest(parsed as Parameters<typeof assertChunkManifest>[0]); } catch (error) {
    if (!(error instanceof Error) || !/size|layout|chunk|manifest|sha/iu.test(error.message)) throw error;
  }
}

export function fuzzSafeForgeCodecBytes(buf: Buffer): void {
  try { decodeF3Archive(buf.toString("utf8")); } catch (error) {
    if (!(error instanceof Error) || !/f3|archive|forge|json|utf|invalid|unsupported|syntax/iu.test(error.message)) throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(buf.toString("utf8")); } catch { return; }
  try { decodeForgeFed(parsed); } catch (error) {
    if (!(error instanceof Error) || !/forge|fed|kind|invalid|unsupported/iu.test(error.message)) throw error;
  }
  try {
    decodeNip34(parsed, {
      now: 500,
      signatureEvidence: { verified: true, eventId: "x", pubkey: "y", verifier: "fuzz" },
    });
  } catch (error) {
    // Include malformed/forge — decodeNip34 rejects non-objects with "malformed forge record".
    if (!(error instanceof Error) || !/nip|nostr|expired|audience|signature|invalid|event|malformed|forge/iu.test(error.message)) throw error;
  }
  try {
    decodeRadicle(parsed, {
      lastSequence: 0,
      signedRefEvidence: {
        verified: true, radicleId: "rad:z0", signedRef: "refs/rad/sigrefs/0", sequence: 1, revision: "r", verifier: "fuzz",
      },
    });
  } catch (error) {
    if (!(error instanceof Error) || !/radicle|stale|invalid|signed|sequence|malformed|forge/iu.test(error.message)) throw error;
  }
}

export function fuzzSafePathQuery(input: string): void {
  const result = parseCommunityQuery(input);
  if (result === null || typeof result !== "object") {
    throw new Error("parseCommunityQuery must return an object");
  }
  if (!Array.isArray(result.diagnostics)) {
    throw new Error("parseCommunityQuery must expose diagnostics");
  }
}

export function assertPathQueryFailClosed(input: string): void {
  const result = parseCommunityQuery(input);
  assert.equal(typeof result, "object");
  assert.ok(Array.isArray(result.diagnostics));
}
