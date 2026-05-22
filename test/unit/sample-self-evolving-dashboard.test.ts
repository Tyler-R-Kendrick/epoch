import assert from "node:assert/strict";
import { createMemoryEpochIntegrationStorage, createBrowserEpoch } from "@epoch/integration-core";
import { trackGeneratedUiChange } from "@epoch/gen-ui";
import {
  DASHBOARD_ENTITY,
  DASHBOARD_RENDERER,
  createInitialDashboard,
  generateDashboardChange,
  readDashboard,
} from "../../samples/self-evolving-dashboard/src/domain";

export function runSampleSelfEvolvingDashboardTests(): void {
  versionsGeneratedComponentChangesWithEpochHistory();
}

function versionsGeneratedComponentChangesWithEpochHistory(): void {
  const epoch = createBrowserEpoch({
    namespace: "sample-dashboard",
    author: "dashboard-agent",
    storage: createMemoryEpochIntegrationStorage(),
  });
  const initial = createInitialDashboard();

  const change = generateDashboardChange(initial, "add revenue and incidents to the operations dashboard");
  const result = trackGeneratedUiChange(epoch, {
    entity: DASHBOARD_ENTITY,
    source: "test-agent",
    summary: change.summary,
    renderer: DASHBOARD_RENDERER,
    components: change.components,
  });
  const materialized = readDashboard(epoch);

  assert.equal(result.event.entity, DASHBOARD_ENTITY);
  assert.equal(epoch.repository.history().length, 1);
  assert.equal(materialized.revision, 1);
  assert.equal(materialized.generatedComponents.length, 2);
  assert.equal(materialized.versions.length, 1);
  assert.equal(materialized.versions[0]?.eventId, result.event.id);
  assert.equal(materialized.versions[0]?.summary, "add revenue and incidents to the operations dashboard");
  assert.deepEqual(materialized.generatedComponents.map((component) => component.renderer), ["json-render", "json-render"]);
  assert.deepEqual(materialized.generatedComponents.map((component) => component.version), [1, 1]);
}
