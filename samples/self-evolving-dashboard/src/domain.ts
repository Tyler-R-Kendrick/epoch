import type { BrowserEpoch, TrackedChange, TrackedChangeLedgerEntry } from "@epoch/integration-core";
import type { GeneratedUiComponent, GeneratedUiComponentPatch, GeneratedUiDocument } from "@epoch/gen-ui";

export const DASHBOARD_ENTITY = "dashboard:generated-ui";
export const DASHBOARD_RENDERER = "json-render";

export interface DashboardDocument {
  readonly revision: number;
  readonly title: string;
  readonly generatedComponents: readonly GeneratedUiComponent<JsonRenderDashboardSpec>[];
  readonly versions: readonly TrackedChangeLedgerEntry[];
}

export interface GeneratedDashboardChange {
  readonly summary: string;
  readonly components: readonly GeneratedUiComponentPatch<JsonRenderDashboardSpec>[];
}

export interface JsonRenderDashboardSpec {
  readonly root: string;
  readonly elements: Readonly<Record<string, JsonRenderElement>>;
}

export type JsonRenderElement =
  | {
      readonly type: "DashboardSection";
      readonly props: { readonly title: string; readonly description: string };
      readonly children: readonly string[];
    }
  | {
      readonly type: "MetricCard";
      readonly props: { readonly label: string; readonly value: string; readonly delta: string; readonly tone: "good" | "warn" | "neutral" };
      readonly children: readonly string[];
    }
  | {
      readonly type: "AlertList";
      readonly props: { readonly title: string; readonly items: readonly string[] };
      readonly children: readonly string[];
    };

const emptyDashboard: DashboardDocument = {
  revision: 0,
  title: "Generated Operations Dashboard",
  generatedComponents: [],
  versions: [],
};

export function createInitialDashboard(): DashboardDocument {
  return emptyDashboard;
}

export function readDashboard(epoch: BrowserEpoch): DashboardDocument {
  return dashboardFromTracked(
    epoch.readOptionalTrackedEntity<GeneratedUiDocument<JsonRenderDashboardSpec>>(DASHBOARD_ENTITY),
    epoch.versionLedger(DASHBOARD_ENTITY),
  );
}

export function dashboardFromTracked(
  tracked: TrackedChange<GeneratedUiDocument<JsonRenderDashboardSpec>> | undefined,
  versions: readonly TrackedChangeLedgerEntry[],
): DashboardDocument {
  if (tracked === undefined) return emptyDashboard;
  return {
    revision: tracked.revision,
    title: emptyDashboard.title,
    generatedComponents: tracked.payload.components,
    versions,
  };
}

export function generateDashboardChange(dashboard: DashboardDocument, prompt: string): GeneratedDashboardChange {
  const summary = prompt.trim() || "refresh generated dashboard";
  const lower = summary.toLowerCase();
  const patches: GeneratedUiComponentPatch<JsonRenderDashboardSpec>[] = [];

  if (lower.includes("revenue") || lower.includes("metric") || lower.includes("growth")) {
    patches.push(createMetricPatch("revenue", "Revenue", "$128.4k", "+12.8%", "good"));
  }

  if (lower.includes("incident") || lower.includes("risk") || lower.includes("alert")) {
    patches.push(createAlertPatch("incidents", "Incidents", ["payments webhook retrying", "one deploy behind approval gate"]));
  }

  if (patches.length === 0) {
    patches.push(createMetricPatch("health", "System Health", `${Math.min(99, 76 + dashboard.revision * 3)}%`, "+2.1%", "neutral"));
  }

  return { summary, components: patches };
}

function createMetricPatch(
  key: string,
  label: string,
  value: string,
  delta: string,
  tone: "good" | "warn" | "neutral",
): GeneratedUiComponentPatch<JsonRenderDashboardSpec> {
  return {
    id: `component:${key}`,
    spec: {
      root: `section:${key}`,
      elements: {
        [`section:${key}`]: {
          type: "DashboardSection",
          props: {
            title: label,
            description: "Generated from the dashboard prompt and committed as an Epoch version.",
          },
          children: [`metric:${key}`],
        },
        [`metric:${key}`]: {
          type: "MetricCard",
          props: { label, value, delta, tone },
          children: [],
        },
      },
    },
  };
}

function createAlertPatch(key: string, title: string, items: readonly string[]): GeneratedUiComponentPatch<JsonRenderDashboardSpec> {
  return {
    id: `component:${key}`,
    spec: {
      root: `section:${key}`,
      elements: {
        [`section:${key}`]: {
          type: "DashboardSection",
          props: {
            title,
            description: "Generated list component with automatic Epoch version metadata.",
          },
          children: [`alerts:${key}`],
        },
        [`alerts:${key}`]: {
          type: "AlertList",
          props: { title, items },
          children: [],
        },
      },
    },
  };
}
