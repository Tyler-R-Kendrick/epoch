import fc from "fast-check";
import type { ForgeObject } from "@epoch/forge";
import {
  arbBudgetEvent,
  arbIdentityEvent,
  arbPromiseEvent,
  arbSpaceJoinEvent,
  arbCanonicalBytes,
  arbChunkBytes,
  arbForgeObject,
  arbPktPayload,
  arbEscapePath,
  arbProposalName,
  arbRemoteVerbosity,
  arbRevsetExpression,
  arbSwhidValue,
  arbUnknownEventType,
  shortFcParams,
} from "../arbitraries/parsers";
import {
  assertCanonicalIdRoundtrip,
  assertChunkManifestRoundtrip,
  assertForgeCodecSubset,
  assertPathQueryFailClosed,
  assertPathQueryNeverEscapesRoot,
  assertPktLineRoundtrip,
  assertProtocolEventClosed,
  assertProtocolEventIdentityClosed,
  assertProtocolEventUnknownTypeFails,
  assertRemoteHelperClosed,
  assertRevsetDeterministic,
  assertSwhidRoundtrip,
} from "../oracles/parsers";

async function main(): Promise<void> {
  const params = shortFcParams();

  await fc.assert(fc.asyncProperty(arbCanonicalBytes, async (bytes) => {
    assertCanonicalIdRoundtrip(Buffer.from(bytes));
  }), params);

  await fc.assert(fc.asyncProperty(arbBudgetEvent, async (event) => {
    assertProtocolEventClosed(event);
  }), params);

  await fc.assert(fc.asyncProperty(arbIdentityEvent, async (event) => {
    assertProtocolEventIdentityClosed(event);
  }), params);

  await fc.assert(fc.asyncProperty(arbPromiseEvent, async (event) => {
    assertProtocolEventClosed(event);
  }), params);

  await fc.assert(fc.asyncProperty(arbSpaceJoinEvent, async (event) => {
    assertProtocolEventClosed(event);
  }), params);

  await fc.assert(fc.asyncProperty(arbRevsetExpression, async (expression) => {
    assertRevsetDeterministic(expression);
  }), params);

  await fc.assert(fc.asyncProperty(arbChunkBytes, async (bytes) => {
    assertChunkManifestRoundtrip(bytes, "application/octet-stream");
  }), { ...params, numRuns: Math.min(params.numRuns, 32) });

  await fc.assert(fc.asyncProperty(arbPktPayload, async (payload) => {
    assertPktLineRoundtrip(payload);
  }), params);

  await fc.assert(fc.asyncProperty(arbRemoteVerbosity, arbProposalName, async (verbosity, name) => {
    assertRemoteHelperClosed(verbosity, name);
  }), params);

  await fc.assert(fc.asyncProperty(arbForgeObject, fc.nat({ max: 200 }), async (value, index) => {
    assertForgeCodecSubset(value as ForgeObject, index);
  }), { ...params, numRuns: Math.min(params.numRuns, 32) });

  await fc.assert(fc.asyncProperty(arbSwhidValue, async (value) => {
    assertSwhidRoundtrip(value);
  }), params);

  await fc.assert(fc.asyncProperty(fc.string({ maxLength: 128 }), async (query) => {
    assertPathQueryFailClosed(query);
  }), { ...params, numRuns: Math.min(params.numRuns, 64) });

  await fc.assert(fc.asyncProperty(arbEscapePath, async (query) => {
    assertPathQueryNeverEscapesRoot(query);
    assertPathQueryFailClosed(query);
  }), params);

  await fc.assert(fc.asyncProperty(arbUnknownEventType, async (type) => {
    assertProtocolEventUnknownTypeFails(type);
  }), params);

  process.stdout.write(JSON.stringify({
    suite: "parser-roundtrip-fast-check",
    ...params,
    status: "passed",
    lane: "fast-check-short",
  }) + "\n");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${String((error as Error).stack ?? error)}\n`);
  process.exitCode = 1;
});
