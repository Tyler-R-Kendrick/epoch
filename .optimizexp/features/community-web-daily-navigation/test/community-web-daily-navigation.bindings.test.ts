/**
 * Vitest binding/smoke tests for OptimizeXP feature `community-web-daily-navigation`.
 * Does not require Cucumber CLI; imports implementations directly.
 */
import { describe, expect, it } from "vitest";
import {
  DISCOVERY_PRIMARY,
  IMPLEMENTATION_STATUS,
  exerciseSurface,
  onCriticalPath,
  setFeatureContext,
  setPersona,
} from "../steps/implementations.ts";
import { createWorld } from "../steps/world.ts";

describe("optimizexp feature community-web-daily-navigation bindings", () => {
  it("exposes discovery metadata", () => {
    expect(IMPLEMENTATION_STATUS).toBeTruthy();
    expect(["wired", "stub"]).toContain(IMPLEMENTATION_STATUS.exerciseSurface);
  });

  it("sets persona and feature context", () => {
    const world = createWorld("community-web-daily-navigation");
    setPersona(world, "developer");
    setFeatureContext(world, "community-web-daily-navigation");
    expect(world.personaId).toBe("developer");
    expect(world.featureId).toBe("community-web-daily-navigation");
  });

  it("critical path finds feature metadata", () => {
    const world = createWorld("community-web-daily-navigation");
    setFeatureContext(world, "community-web-daily-navigation");
    onCriticalPath(world);
    expect(world.notes.some((n) => n.includes("critical path"))).toBe(true);
  });

  it("exerciseSurface runs discovered command (may non-zero)", () => {
    const world = createWorld("community-web-daily-navigation");
    setFeatureContext(world, "community-web-daily-navigation");
    exerciseSurface(world);
    if (DISCOVERY_PRIMARY.command) {
      expect(world.lastCommand).toBe(DISCOVERY_PRIMARY.command);
      expect(world.lastExitCode === null || typeof world.lastExitCode === "number").toBe(
        true,
      );
    } else {
      expect(IMPLEMENTATION_STATUS.exerciseSurface).toBe("stub");
      expect(world.notes.some((n) => n.includes("STUB"))).toBe(true);
    }
  });
});
