import assert from "node:assert/strict";
import {
  PRODUCTION_SHIP,
  configHash,
  evaluateEvidence,
  experimentGates,
  standingProductionRow,
} from "./registry";

export function runProtocolExperimentTests(): void {
  everyGateHasVerdict();
  productionShipNoneYet();
  garbageEvidenceDoesNotPromote();
  e04ParseVsMeaningRejected();
  e09WrongMigrationInvalidated();
  e11Pending();
  noScalarBestProtocolScore();
}

function everyGateHasVerdict(): void {
  const ids = experimentGates().map((gate) => gate.id);
  assert.deepEqual(ids, [
    "E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08",
    "E09", "E10", "E11", "E12", "E13", "E14", "E15", "E16",
  ]);
  for (const gate of experimentGates()) {
    assert.ok(gate.verdict === "rejected" || gate.verdict === "pending");
    assert.ok(gate.reason.length > 0);
  }
  assert.ok(configHash({ gates: ids }).length === 64);
}

function productionShipNoneYet(): void {
  assert.equal(PRODUCTION_SHIP, "(none yet)");
  assert.equal(standingProductionRow(), "Production ship: (none yet)");
}

function garbageEvidenceDoesNotPromote(): void {
  assert.equal(evaluateEvidence({ gateId: "E01", evidence: "garbage-unsigned" }), "rejected");
  assert.equal(evaluateEvidence({ gateId: "E10", evidence: { promote: true } }), "rejected");
  assert.equal(evaluateEvidence({ gateId: "E16", evidence: null }), "rejected");
}

function e04ParseVsMeaningRejected(): void {
  assert.equal(evaluateEvidence({ gateId: "E04", evidence: { structural: 1, semantic: 0 } }), "rejected");
}

function e09WrongMigrationInvalidated(): void {
  assert.equal(evaluateEvidence({ gateId: "E09", evidence: { byteIdentical: true, meaning: "wrong" } }), "rejected");
}

function e11Pending(): void {
  assert.equal(experimentGates().find((gate) => gate.id === "E11")?.verdict, "pending");
  assert.equal(experimentGates().find((gate) => gate.id === "E12")?.verdict, "pending");
}

function noScalarBestProtocolScore(): void {
  const blob = JSON.stringify(experimentGates());
  assert.equal(/best protocol/i.test(blob), false);
}
