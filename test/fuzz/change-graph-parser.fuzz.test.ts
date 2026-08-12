import assert from "node:assert/strict";
import { assertProtocolEvent, createCanonicalId, parseCanonicalId, parseChangeId, parseRevset } from "@epoch/protocol";
import { assertChunkManifest, createChunkManifest, decodeChunkManifest, encodeChunkManifest } from "@epoch/core";
import { gitProtocolEnvironment, parsePktLines, encodePktLine, parseRemoteHelperCommand, proposalRef } from "@epoch/git-proxy";
import { decodeF3Archive, decodeForgeFed, decodeNip34, decodeRadicle, encodeF3Archive, encodeForgeFed, encodeNip34, encodeRadicle, type ForgeObject } from "@epoch/forge";
import { formatSwhid, parseSwhid } from "@epoch/software-heritage";
import { property } from "./deterministic";

const SEED = 0x46555a5a;
const CASES = 96;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

async function main(): Promise<void> {
  await property("CHANGE-GRAPH-FUZZ-001 protocol IDs reject pre-release spellings", SEED, CASES, (random) => {
    const bytes = random.bytes(32);
    const identifier = createCanonicalId("change", (length) => { assert.equal(length, 32); return bytes; });
    assert.equal(parseCanonicalId(identifier, "change").kind, "change");
    assert.throws(() => parseChangeId("epoch:change:legacy:event"), /Invalid canonical ID/u);
    const mutations = [identifier.toUpperCase(), identifier + "/escape", identifier.replace(/.$/u, "1"), `epoch:unknown:${identifier.split(":")[2]}`, `epoch:change:${"a".repeat(53)}`, `epoch:change:${"é".repeat(52)}`];
    for (const mutation of mutations) assert.throws(() => parseCanonicalId(mutation), /Invalid canonical ID|bounded ASCII/u);
  });

  await property("CHANGE-GRAPH-FUZZ-002 event schema JSON fails closed", SEED ^ 1, CASES, (random, index) => {
    const principalId = id("principal", random.integer(ALPHABET.length));
    const budgetId = id("budget", random.integer(ALPHABET.length));
    const event = { schemaVersion: 1, type: random.pick(["agent.budget.allocated", "agent.budget.consumed"] as const), eventId: `event-${index}`, revisionId: `event-${index}`, body: { budgetId, principalId, units: random.integer(1_000_000) } };
    assert.equal(assertProtocolEvent(JSON.parse(JSON.stringify(event))).eventId, event.eventId);
    assert.throws(() => assertProtocolEvent({ ...event, unknown: true }), /Unknown event field/u);
    assert.throws(() => assertProtocolEvent({ ...event, body: { ...event.body, units: -1 } }), /nonnegative/u);
    assert.throws(() => assertProtocolEvent({ ...event, revisionId: `other-${index}` }), /must equal/u);
  });

  await property("CHANGE-GRAPH-FUZZ-003 revset parser is bounded and deterministic", SEED ^ 2, CASES, (random) => {
    const atom = random.pick(["heads()", "roots()", "pending()", "approved()", "mergeable()"] as const);
    const other = random.pick(["conflicts()", "author(alice)", "change(change1)"] as const);
    const expression = `${atom} ${random.pick(["|", "&", "-"] as const)} ${other}`;
    assert.deepEqual(parseRevset(expression), parseRevset(expression));
    for (const invalid of ["", "unknown()", "heads(", `${"a".repeat(4097)}()`]) assert.throws(() => parseRevset(invalid), /revset|unknown|expected/u);
  });

  await property("CHANGE-GRAPH-FUZZ-004 chunk manifest JSON and packet ranges stay bounded", SEED ^ 3, 32, (random) => {
    const bytes = random.bytes(1 + random.integer(180_000));
    const manifest = createChunkManifest(bytes, "application/octet-stream");
    assert.deepEqual(decodeChunkManifest(encodeChunkManifest(manifest)), manifest);
    assert.throws(() => assertChunkManifest({ ...manifest, size: Number.MAX_SAFE_INTEGER, chunks: manifest.chunks }), /size|layout/u);
    const payload = random.bytes(1 + random.integer(1024));
    assert.deepEqual(parsePktLines(encodePktLine(payload)), [payload.toString("utf8")]);
    assert.throws(() => parsePktLines(Buffer.from("ffffshort")), /frame|packet/u);
  });

  await property("CHANGE-GRAPH-FUZZ-005 Git refs headers and push options reject injection", SEED ^ 4, CASES, (random, index) => {
    const verbosity = String(random.integer(4));
    assert.deepEqual(parseRemoteHelperCommand(`option verbosity ${verbosity}`), { command: "option", name: "verbosity", value: verbosity });
    assert.equal(proposalRef(`proposal-${index}`), `refs/epoch/for/proposal-${index}`);
    for (const invalid of ["../escape", "bad/ref", "bad ref", "bad\nref", "-option"]) assert.throws(() => proposalRef(invalid), /Invalid/u);
    assert.deepEqual(gitProtocolEnvironment({ "git-protocol": "version=2:agent=epoch" }), { GIT_PROTOCOL: "version=2:agent=epoch" });
    for (const invalid of ["version=2\nGIT_CONFIG_COUNT=1", "version=2;sh", "version=two", " version=2"]) assert.throws(() => gitProtocolEnvironment({ "git-protocol": invalid }), /Invalid/u);
  });

  await property("CHANGE-GRAPH-FUZZ-006 forge codecs preserve declared public subset", SEED ^ 5, 32, (random, index) => {
    const value = forgeObject(index, random.integer(4));
    assert.deepEqual(decodeF3Archive(encodeF3Archive([value]).bytes).objects, [value]);
    if (value.kind === "issue" || value.kind === "change") {
      const { labels: _labels, ...declaredSubset } = value;
      assert.deepEqual(decodeForgeFed(encodeForgeFed(value).document).object, declaredSubset);
    } else {
      assert.throws(() => encodeForgeFed(value), /unsupported ForgeFed kind/u);
    }
    const nip = encodeNip34(value, { eventId: `nostr-${index}`, pubkey: "pubkey", createdAt: 100, expiresAt: 1_000, audience: ["maintainers"] }).event;
    const signatureEvidence = { verified: true as const, eventId: nip.id, pubkey: nip.pubkey, verifier: "fuzz-fixture" };
    assert.equal(decodeNip34(nip, { now: 500, audience: "maintainers", seen: new Set(), signatureEvidence }).object.objectId, value.objectId);
    assert.throws(() => decodeNip34(nip, { now: 1_000, signatureEvidence }), /expired/u);
    assert.throws(() => decodeNip34(nip, { now: 500, audience: "outsider", signatureEvidence }), /audience/u);
    const radicle = encodeRadicle(value, { radicleId: `rad:z${index}`, signedRef: `refs/rad/sigrefs/${index}`, sequence: index + 1 }).record;
    const signedRefEvidence = { verified: true as const, radicleId: radicle.radicleId, signedRef: radicle.signedRef, sequence: radicle.sequence, revision: radicle.revision, verifier: "fuzz-fixture" };
    assert.equal(decodeRadicle(radicle, { lastSequence: index, signedRefEvidence }).object.objectId, value.objectId);
    assert.throws(() => decodeRadicle(radicle, { lastSequence: index + 1, signedRefEvidence }), /stale/u);
  });

  await property("CHANGE-GRAPH-FUZZ-007 SWHID parser rejects malformed variants", SEED ^ 6, CASES, (random) => {
    const value = { version: 1 as const, kind: random.pick(["cnt", "dir", "rev", "rel", "snp"] as const), digest: random.bytes(20).toString("hex"), qualifiers: { path: `/src/${random.next()}.ts` } };
    const canonical = formatSwhid(value);
    assert.equal(formatSwhid(parseSwhid(canonical)), canonical);
    for (const invalid of [canonical.toUpperCase(), canonical.replace("swh:1:", "swh:2:"), canonical + ";unknown=x", canonical + ";path=duplicate"]) assert.throws(() => parseSwhid(invalid), /invalid|unsupported|duplicate/iu);
  });

  process.stdout.write(JSON.stringify({ suite: "change-graph-parser-fuzz", seed: SEED, cases: CASES, status: "passed" }) + "\n");
}

function id(kind: string, index: number): string { return `epoch:${kind}:${ALPHABET[index % ALPHABET.length]!.repeat(52)}`; }
function forgeObject(index: number, kindIndex: number): ForgeObject {
  return { kind: (["issue", "change", "comment", "release"] as const)[kindIndex]!, objectId: `forge-${index}`, repositoryId: "repo-epoch", title: `Object ${index}`, body: `Body ${index}`, state: "open", authorId: "principal-alice", createdAt: index, updatedAt: index + 1, visibility: "public", revision: `revision-${index}` };
}

void main().catch((error: unknown) => { process.stderr.write(`${String((error as Error).stack ?? error)}\n`); process.exitCode = 1; });
