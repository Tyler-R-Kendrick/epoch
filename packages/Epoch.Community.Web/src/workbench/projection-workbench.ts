import type { CompiledProjection, ProjectionDefinition, ProjectionDiagnostic, VfsPage } from "@epoch/community-core";

export type ProjectionWorkbenchTab = "definition" | "preview" | "diff" | "explain" | "validation";

export interface ProjectionWorkbenchServices {
  compile(definition: ProjectionDefinition): Promise<CompiledProjection>;
  preview(definition: ProjectionDefinition, path: string, signal: AbortSignal): Promise<VfsPage>;
  diff(definition: ProjectionDefinition, signal: AbortSignal): Promise<readonly string[]>;
  explain(definition: ProjectionDefinition, path: string, signal: AbortSignal): Promise<unknown>;
  save(definition: ProjectionDefinition): Promise<ProjectionDefinition>;
}

export interface ProjectionWorkbenchState {
  readonly open: boolean;
  readonly tab: ProjectionWorkbenchTab;
  readonly source: string;
  readonly path: string;
  readonly compiled?: CompiledProjection;
  readonly diagnostics: readonly ProjectionDiagnostic[];
  readonly preview?: VfsPage;
  readonly diff?: readonly string[];
  readonly explanation?: unknown;
  readonly error?: string;
  readonly running: boolean;
}

export function createProjectionWorkbench(services: ProjectionWorkbenchServices) {
  let controller: AbortController | undefined;
  let current: ProjectionWorkbenchState = Object.freeze({ open: false, tab: "definition", source: "", path: "/", diagnostics: [], running: false });
  const update = (next: Partial<ProjectionWorkbenchState>): ProjectionWorkbenchState => (current = Object.freeze({ ...current, ...next }));
  const definition = (): ProjectionDefinition => JSON.parse(current.source) as ProjectionDefinition;
  const begin = (): AbortSignal => { controller?.abort(); controller = new AbortController(); update({ running: true, error: undefined }); return controller.signal; };
  const fail = (error: unknown): ProjectionWorkbenchState => update({ running: false, error: error instanceof Error ? error.message : String(error) });
  return Object.freeze({
    state: () => current,
    open(input: ProjectionDefinition) { return update({ open: true, tab: "definition", source: `${JSON.stringify(input, null, 2)}\n` }); },
    close() { controller?.abort(); return update({ open: false, running: false }); },
    select(tab: ProjectionWorkbenchTab) { return update({ tab }); },
    setSource(source: string) { return update({ source, compiled: undefined, diagnostics: [], error: undefined }); },
    setPath(path: string) { return update({ path }); },
    async validate() {
      try {
        const compiled = await services.compile(definition());
        return update({ compiled, diagnostics: compiled.diagnostics, tab: "validation", running: false, error: undefined });
      } catch (error) { return fail(error); }
    },
    async preview() {
      const signal = begin();
      try { return update({ preview: await services.preview(definition(), current.path, signal), tab: "preview", running: false }); }
      catch (error) { return fail(error); }
    },
    async diff() {
      const signal = begin();
      try { return update({ diff: await services.diff(definition(), signal), tab: "diff", running: false }); }
      catch (error) { return fail(error); }
    },
    async explain() {
      const signal = begin();
      try { return update({ explanation: await services.explain(definition(), current.path, signal), tab: "explain", running: false }); }
      catch (error) { return fail(error); }
    },
    async save() {
      const compiled = await services.compile(definition());
      if (compiled.diagnostics.some((item) => item.severity === "error")) throw new Error("Projection has validation errors");
      const saved = await services.save(compiled.definition);
      update({ source: `${JSON.stringify(saved, null, 2)}\n`, compiled, diagnostics: compiled.diagnostics, running: false });
      return saved;
    },
    cancel() { controller?.abort(); return update({ running: false, error: "Projection operation cancelled" }); },
  });
}
