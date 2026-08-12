import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";

const changeId = `epoch:change:${"a".repeat(52)}` as const;
const sessionId = `epoch:session:${"b".repeat(52)}` as const;
const conversationDigest = "c".repeat(64);

export function runCodeOperationContextTests(): void {
  const repository = EpochRepository.create(mkdtempSync(join(tmpdir(), "epoch-code-operation-")), { author: "alice" });
  const event = repository.recordCodeOperation({
    kind: "text-insert",
    entity: "src/example.ts",
    value: "const answer = 42;\n",
    context: { changeId, sessionId, conversationDigest, tool: "editor" },
  });

  assert.deepEqual(repository.codeOperations({ changeId }).map((entry) => entry.eventId), [event.id]);
  assert.equal(repository.codeOperations({ conversationDigest })[0]?.operation.context?.tool, "editor");
  assert.equal("appendCRDTOperation" in EpochRepository.prototype, false);
  assert.throws(() => repository.recordCodeOperation({
    kind: "text-insert",
    entity: "src/example.ts",
    value: "unsafe",
    context: { conversationDigest: "not-a-digest" },
  }), /conversationDigest/u);
}
