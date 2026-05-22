import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { trackGeneratedUiChange, type GeneratedUiComponent, type GeneratedUiDocument } from "@epoch/gen-ui";
import { createBrowserEpoch } from "@epoch/integration-core";
import { EpochProvider, useEpochRepository, useEpochTrackedEntity, useEpochVersionLedger } from "@epoch/react";
import {
  DASHBOARD_ENTITY,
  DASHBOARD_RENDERER,
  type DashboardDocument,
  type JsonRenderDashboardSpec,
  createInitialDashboard,
  dashboardFromTracked,
  generateDashboardChange,
} from "./domain";
import "./styles.css";

const epoch = createBrowserEpoch({ namespace: "self-evolving-dashboard", author: "gen-ui-agent" });

function App() {
  return (
    <EpochProvider epoch={epoch}>
      <DashboardApp />
    </EpochProvider>
  );
}

function DashboardApp() {
  const repository = useEpochRepository();
  const tracked = useEpochTrackedEntity<GeneratedUiDocument<JsonRenderDashboardSpec>>(DASHBOARD_ENTITY);
  const versions = useEpochVersionLedger(DASHBOARD_ENTITY);
  const [prompt, setPrompt] = useState("add revenue and incidents to the operations dashboard");
  const dashboard = useMemo(() => {
    const materialized = dashboardFromTracked(tracked, versions);
    return materialized.revision === 0 ? createInitialDashboard() : materialized;
  }, [tracked, versions]);

  function generate(): void {
    const change = generateDashboardChange(dashboard, prompt);
    trackGeneratedUiChange(repository, {
      entity: DASHBOARD_ENTITY,
      source: "dashboard-agent",
      summary: change.summary,
      renderer: DASHBOARD_RENDERER,
      components: change.components,
    });
  }

  return (
    <main className="dashboard-shell">
      <aside className="control-panel">
        <h1>{dashboard.title}</h1>
        <label htmlFor="prompt">Generation prompt</label>
        <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <button onClick={generate}>Generate version</button>
        <dl>
          <div><dt>Epoch events</dt><dd>{repository.repository.history().length}</dd></div>
          <div><dt>Dashboard revision</dt><dd>{dashboard.revision}</dd></div>
          <div><dt>Generated components</dt><dd>{dashboard.generatedComponents.length}</dd></div>
        </dl>
      </aside>
      <DashboardPreview dashboard={dashboard} />
      <VersionLedger dashboard={dashboard} />
    </main>
  );
}

function DashboardPreview({ dashboard }: { readonly dashboard: DashboardDocument }) {
  return (
    <section className="preview" aria-label="Generated dashboard preview">
      {dashboard.generatedComponents.length === 0 ? (
        <p className="empty-state">Generate the first dashboard version to create component specs.</p>
      ) : (
        dashboard.generatedComponents.map((component) => <GeneratedComponentCard key={component.id} component={component} />)
      )}
    </section>
  );
}

function GeneratedComponentCard({ component }: { readonly component: GeneratedUiComponent<JsonRenderDashboardSpec> }) {
  return (
    <article className="generated-card">
      <header>
        <span>{component.renderer}</span>
        <code>v{component.version}</code>
      </header>
      <JsonRender spec={component.spec} />
      <footer>{component.id}</footer>
    </article>
  );
}

function JsonRender({ spec }: { readonly spec: JsonRenderDashboardSpec }) {
  const root = spec.elements[spec.root];
  if (root === undefined || root.type !== "DashboardSection") return null;
  return (
    <section className="json-section">
      <h2>{root.props.title}</h2>
      <p>{root.props.description}</p>
      <div className="json-section-grid">
        {root.children.map((childId) => {
          const child = spec.elements[childId];
          if (child?.type === "MetricCard") {
            return (
              <div className={`metric-card ${child.props.tone}`} key={childId}>
                <span>{child.props.label}</span>
                <strong>{child.props.value}</strong>
                <small>{child.props.delta}</small>
              </div>
            );
          }
          if (child?.type === "AlertList") {
            return (
              <div className="alert-list" key={childId}>
                <span>{child.props.title}</span>
                <ul>{child.props.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            );
          }
          return null;
        })}
      </div>
    </section>
  );
}

function VersionLedger({ dashboard }: { readonly dashboard: DashboardDocument }) {
  return (
    <aside className="version-ledger" aria-label="Epoch generated UI version ledger">
      <h2>Version Ledger</h2>
      <ol>
        {dashboard.versions.map((version) => (
          <li key={`${version.revision}-${version.eventId}`}>
            <strong>Revision {version.revision}</strong>
            <span>{version.summary}</span>
            <code>{version.eventId || "pending event"}</code>
            <small>{componentIds(version).join(", ")}</small>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function componentIds(version: { readonly metadata?: Record<string, unknown> }): readonly string[] {
  const value = version.metadata?.componentIds;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const root = document.getElementById("root");
if (root === null) throw new Error("missing root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
