import assert from "node:assert/strict";
import {
  CANONICAL_ID_KINDS,
  PROTOCOL_EVENT_SCHEMAS,
  parseCanonicalId,
  parseRevset,
} from "@epoch/protocol";
import {
  executeChangeGraphCommand,
  isChangeGraphCommand,
} from "@epoch/cli";

type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;

export async function runNomenclatureContractTests(): Promise<void> {
  assert.ok(CANONICAL_ID_KINDS.includes("change-graph"));
  assert.ok(CANONICAL_ID_KINDS.includes("review-bundle"));
  // SAFETY: Runtime checks or construction above establish readonly string[]).includes("stack").
  assert.equal((CANONICAL_ID_KINDS as readonly string[]).includes("stack"), false);
  // SAFETY: Runtime checks or construction above establish readonly string[]).includes("review").
  assert.equal((CANONICAL_ID_KINDS as readonly string[]).includes("review"), false);

  assert.ok(PROTOCOL_EVENT_SCHEMAS.includes("change-graph.defined"));
  assert.ok(PROTOCOL_EVENT_SCHEMAS.includes("change-graph.revised"));
  // SAFETY: Runtime checks or construction above establish readonly string[]).includes("stack.defined").
  assert.equal((PROTOCOL_EVENT_SCHEMAS as readonly string[]).includes("stack.defined"), false);

  assert.equal(parseCanonicalId(`epoch:change-graph:${"a".repeat(52)}`).kind, "change-graph");
  assert.throws(() => parseCanonicalId(`epoch:stack:${"a".repeat(52)}`), hasCode("invalid-id"));
  assert.throws(() => parseCanonicalId("epoch:change:legacy:signed-event"), hasCode("invalid-id"));
  assert.equal(parseRevset("graph(g1)").type, "call");
  assert.throws(() => parseRevset("stack(g1)"), /unknown revset function stack/u);

  assert.equal(isChangeGraphCommand("graph"), true);
  assert.equal(isChangeGraphCommand("bundle"), true);
  assert.equal(isChangeGraphCommand("stack"), false);
  assert.equal(isChangeGraphCommand("weave"), false);

  const root = process.cwd();
  assert.equal((await executeChangeGraphCommand(root, ["stack", "create"])).code, "invalid-command");
  assert.equal((await executeChangeGraphCommand(root, ["weave", "create"])).code, "invalid-command");
}

function hasCode(code: string): (error: BoundaryValue) => boolean {
  return (error: BoundaryValue) => isCodedError(error) && error.code === code;
}

function isCodedError<Value>(value: Value): value is Value & { readonly code?: string } {
  return typeof value === "object" && value !== null && "code" in value;
}
