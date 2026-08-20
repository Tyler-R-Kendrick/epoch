import assert from "node:assert/strict";
import { PROTOCOL_EVENT_SCHEMAS } from "@epoch/protocol";

export function runProtocolRequiredEventTests(): void {
  const required = [
    "repository.identity", "change.created", "change.revised", "change.superseded",
    "change.dependency.added", "change.dependency.removed", "change-graph.defined", "change-graph.revised",
    "split.accepted", "review.bundle.created", "review.bundle.revised", "review.recorded",
    "merge.plan.created", "merge.plan.gate-recorded", "merge.plan.applied", "conflict.recorded",
    "conflict.resolution.proposed", "conflict.resolution.accepted", "conflict.resolution.rejected",
    "agent.membership.granted", "agent.membership.revoked", "agent.capability.granted",
    "agent.capability.revoked", "agent.budget.allocated", "agent.budget.reserved",
    "agent.budget.consumed", "agent.budget.released", "projection.recorded", "mirror.defined",
    "mirror.checkpoint", "mirror.run", "object.promise.recorded", "software-heritage.mapping",
    "software-heritage.archive-requested", "software-heritage.archive-status",
  ];
  // SAFETY: Runtime checks or construction above establish never)).
  assert.deepEqual(required.filter((type) => !PROTOCOL_EVENT_SCHEMAS.includes(type as never)), []);
}
