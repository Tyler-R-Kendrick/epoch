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

export function runNomenclatureContractTests(): void {
  assert.ok(CANONICAL_ID_KINDS.includes("change-graph"));
  assert.ok(CANONICAL_ID_KINDS.includes("review-bundle"));
  assert.equal((CANONICAL_ID_KINDS as readonly string[]).includes("stack"), false);
  assert.equal((CANONICAL_ID_KINDS as readonly string[]).includes("review"), false);

  assert.ok(PROTOCOL_EVENT_SCHEMAS.includes("change-graph.defined"));
  assert.ok(PROTOCOL_EVENT_SCHEMAS.includes("change-graph.revised"));
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
  assert.equal(executeChangeGraphCommand(root, ["stack", "create"]).code, "invalid-command");
  assert.equal(executeChangeGraphCommand(root, ["weave", "create"]).code, "invalid-command");
}

function hasCode(code: string): (error: unknown) => boolean {
  return (error) => typeof error === "object" && error !== null && "code" in error && error.code === code;
}
