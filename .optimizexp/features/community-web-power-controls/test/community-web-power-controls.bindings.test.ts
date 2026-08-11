/**
 * Node binding/smoke tests for OptimizeXP feature `community-web-power-controls`.
 * Does not require Cucumber CLI; imports implementations directly.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DISCOVERY_PRIMARY,
  IMPLEMENTATION_STATUS,
  exerciseSurface,
  onCriticalPath,
  setFeatureContext,
  setPersona,
} from "../steps/implementations.ts";
import { createWorld } from "../steps/world.ts";

describe("optimizexp feature community-web-power-controls bindings", () => {
  it("exposes discovery metadata", () => {
    assert.ok(IMPLEMENTATION_STATUS);
    assert.ok(["wired", "stub"].includes(IMPLEMENTATION_STATUS.exerciseSurface));
  });

  it("sets persona and feature context", () => {
    const world = createWorld("community-web-power-controls");
    setPersona(world, "developer");
    setFeatureContext(world, "community-web-power-controls");
    assert.equal(world.personaId, "developer");
    assert.equal(world.featureId, "community-web-power-controls");
  });

  it("critical path finds feature metadata", () => {
    const world = createWorld("community-web-power-controls");
    setFeatureContext(world, "community-web-power-controls");
    onCriticalPath(world);
    assert.ok(world.notes.some((n) => n.includes("critical path")));
  });

  it("keeps scenario state isolated", () => {
    const first = createWorld("community-web-power-controls");
    const second = createWorld("community-web-power-controls");
    setPersona(first, "first");
    assert.equal(second.personaId, null);
    assert.deepEqual(second.notes, []);
  });

  it("exerciseSurface runs the discovered command successfully", () => {
    const world = createWorld("community-web-power-controls");
    setFeatureContext(world, "community-web-power-controls");
    exerciseSurface(world);
    if (DISCOVERY_PRIMARY.command) {
      assert.equal(world.lastCommand, DISCOVERY_PRIMARY.command);
      assert.equal(world.lastExitCode, 0);
    } else {
      assert.equal(IMPLEMENTATION_STATUS.exerciseSurface, "stub");
      assert.ok(world.notes.some((n) => n.includes("STUB")));
    }
  });
});
