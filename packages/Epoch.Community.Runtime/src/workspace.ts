import {
  createBrowserEpoch,
  isRecord,
  type BrowserEpoch,
  type EpochIntegrationStorage,
  type TrackedChangeLedgerEntry,
} from "@epoch/integration-core";
import { digestOf, identifier } from "./digest";
import { verifyStaticHarnessRelease, type StaticHarnessRelease } from "./harness";
import {
  diffDynamicUiManifests,
  isDynamicUiManifest,
  validateDynamicUiManifest,
  type DynamicUiManifest,
  type DynamicUiScope,
  type UiSemanticDiff,
} from "./ui";

/**
 * The browser Epoch workspace.
 *
 * `createBrowserEpoch` already gives the browser an append-only, event-backed
 * history. What it does not give a *forge* is the vocabulary a person reasons
 * in: named views, a proposal you can preview before accepting, a diff, a merge,
 * and a rollback that does not lie about what happened. This adds exactly that,
 * on top of the existing primitives rather than beside them.
 *
 * Two rules shape every operation here:
 *
 *  - Nothing is ever removed. A rollback appends a new revision that restores an
 *    older manifest; the rejected proposal and the merge that preceded it stay
 *    in the ledger. History is the product, so erasing it to fix the UI would
 *    defeat the point.
 *  - The static harness decides what a manifest may contain. A proposal that
 *    fails validation is still recorded — you want to be able to inspect the bad
 *    one — but it cannot be merged, and a head that stops validating is not
 *    rendered.
 */
export const TRUNK_VIEW = "main";

export type EpochViewKind = "trunk" | "proposal";

export interface UiRevisionProvenance {
  readonly kind: "created" | "proposed" | "merged" | "reverted";
  readonly baseView?: string;
  readonly baseRevision?: number;
  readonly promptDigest?: string;
  readonly prompt?: string;
  readonly model?: string;
  readonly mergedFrom?: string;
  readonly mergedFromRevision?: number;
  readonly revertOf?: number;
  readonly validationErrors?: readonly string[];
}

export interface UiRevisionRecord {
  readonly manifest: DynamicUiManifest;
  readonly provenance: UiRevisionProvenance;
  readonly kind: EpochViewKind;
}

export interface EpochViewSummary {
  readonly name: string;
  readonly ref: string;
  readonly kind: EpochViewKind;
  readonly scope: DynamicUiScope;
  readonly revision: number;
  readonly headEventId: string;
  readonly valid: boolean;
  readonly base?: { readonly view: string; readonly revision: number };
}

export interface WorkspaceStatus {
  readonly workspaceId: string;
  readonly actor: string;
  readonly harnessRelease: string;
  readonly harnessVerified: boolean;
  readonly activeView: string;
  readonly views: number;
  readonly proposals: number;
  readonly events: number;
  readonly safeMode: boolean;
  readonly state: "clean" | "proposed" | "unrenderable";
  readonly lastKnownGood?: { readonly view: string; readonly revision: number };
}

export interface WorkspaceMutation<TData> {
  readonly data: TData;
  readonly eventIds: readonly string[];
  readonly revisionIds: readonly number[];
  readonly ref: string;
  readonly validationErrors: readonly string[];
}

export interface CreateViewInput {
  readonly name: string;
  readonly from?: string;
  readonly scope?: DynamicUiScope;
}

export interface ProposeUiInput {
  readonly view: string;
  readonly manifest: DynamicUiManifest;
  readonly prompt?: string;
  readonly model?: string;
  /**
   * Prompts can carry private context — what someone cannot read, what they are
   * working on, who they are avoiding. The digest is always recorded so a
   * proposal stays attributable; the text itself is kept only when the caller
   * asks for it.
   */
  readonly retainPrompt?: boolean;
}

export interface MergeViewInput {
  readonly from: string;
  readonly into?: string;
}

export interface RevertViewInput {
  readonly view: string;
  readonly toRevision: number;
}

export interface BrowserEpochWorkspaceOptions {
  readonly namespace: string;
  readonly author: string;
  readonly harness: StaticHarnessRelease;
  readonly storage?: EpochIntegrationStorage;
  readonly initialManifest?: DynamicUiManifest;
}

export interface BrowserEpochWorkspace {
  readonly id: string;
  readonly actor: string;
  readonly epoch: BrowserEpoch;
  readonly harness: StaticHarnessRelease;
  status(): WorkspaceStatus;
  listViews(): readonly EpochViewSummary[];
  getView(name: string): EpochViewSummary;
  head(name: string): UiRevisionRecord;
  history(name: string): readonly TrackedChangeLedgerEntry[];
  revision(name: string, revision: number): UiRevisionRecord;
  activeView(): string;
  createView(input: CreateViewInput): WorkspaceMutation<EpochViewSummary>;
  checkout(name: string): WorkspaceMutation<EpochViewSummary>;
  propose(input: ProposeUiInput): WorkspaceMutation<EpochViewSummary>;
  diff(from: string, into?: string): UiSemanticDiff;
  merge(input: MergeViewInput): WorkspaceMutation<EpochViewSummary>;
  revert(input: RevertViewInput): WorkspaceMutation<EpochViewSummary>;
  restoreLastKnownGood(): WorkspaceMutation<EpochViewSummary>;
  setSafeMode(active: boolean): WorkspaceMutation<{ readonly safeMode: boolean }>;
  /** What the harness should actually render right now. */
  materialize(name?: string): { readonly manifest: DynamicUiManifest; readonly safeMode: boolean; readonly reason?: string };
  validate(manifest: DynamicUiManifest): readonly string[];
  subscribe(listener: () => void): () => void;
}

const VIEW_PREFIX = "ui/views/";
const ACTIVE_ENTITY = "ui/refs/active";
const SAFE_MODE_ENTITY = "ui/refs/safe-mode";
const LAST_KNOWN_GOOD_ENTITY = "ui/refs/last-known-good";

export function viewRef(name: string, kind: EpochViewKind): string {
  return kind === "trunk" ? `refs/ui/views/${name}` : `refs/ui/proposals/${name}`;
}

export function createBrowserEpochWorkspace(options: BrowserEpochWorkspaceOptions): BrowserEpochWorkspace {
  const harness = options.harness;
  const epoch = createBrowserEpoch({
    namespace: options.namespace,
    author: options.author,
    ...(options.storage === undefined ? {} : { storage: options.storage }),
  });
  const id = identifier("ws", { namespace: options.namespace, harness: harness.releaseId });
  const initialManifest = options.initialManifest ?? harness.safeModeManifest;

  ensureTrunk();

  function ensureTrunk(): void {
    if (epoch.readOptionalTrackedEntity(viewEntity(TRUNK_VIEW)) !== undefined) return;
    const created = appendRevision(TRUNK_VIEW, {
      manifest: initialManifest,
      provenance: { kind: "created" },
      kind: "trunk",
    }, `created view ${TRUNK_VIEW}`);
    setActive(TRUNK_VIEW);

    // A workspace with no last-known-good has no way back the first time
    // someone breaks their interface. The opening revision came from the
    // installed harness, so if it validates it is a known-good one.
    if (validate(initialManifest).length === 0) {
      promoteLastKnownGood(TRUNK_VIEW, created.revisionIds[0] ?? 1);
    }
  }

  function promoteLastKnownGood(view: string, revision: number): string {
    return epoch.trackChange<{ view: string; revision: number }>({
      entity: LAST_KNOWN_GOOD_ENTITY,
      surface: "gen-ui",
      source: "community-runtime",
      summary: `promoted ${view}@${revision} to last-known-good`,
      payload: { view, revision },
    }).event.id;
  }

  function viewEntity(name: string): string {
    return `${VIEW_PREFIX}${name}`;
  }

  function appendRevision(name: string, record: UiRevisionRecord, summary: string): WorkspaceMutation<EpochViewSummary> {
    const result = epoch.trackChange<UiRevisionRecord>({
      entity: viewEntity(name),
      surface: "gen-ui",
      source: "community-runtime",
      summary,
      payload: record,
      metadata: {
        view: name,
        ref: viewRef(name, record.kind),
        scope: record.manifest.scope,
        harnessRelease: harness.releaseId,
        manifestDigest: digestOf(record.manifest),
      },
    });

    return {
      data: summarize(name, record, result.revision, result.event.id),
      eventIds: [result.event.id],
      revisionIds: [result.revision],
      ref: viewRef(name, record.kind),
      validationErrors: record.provenance.validationErrors ?? [],
    };
  }

  function summarize(
    name: string,
    record: UiRevisionRecord,
    revision: number,
    headEventId: string,
  ): EpochViewSummary {
    const base = record.provenance.baseView === undefined || record.provenance.baseRevision === undefined
      ? undefined
      : { view: record.provenance.baseView, revision: record.provenance.baseRevision };

    return {
      name,
      ref: viewRef(name, record.kind),
      kind: record.kind,
      scope: record.manifest.scope,
      revision,
      headEventId,
      valid: validate(record.manifest).length === 0,
      ...(base === undefined ? {} : { base }),
    };
  }

  function readRecord(name: string): UiRevisionRecord {
    const tracked = epoch.readOptionalTrackedEntity<UiRevisionRecord>(viewEntity(name));
    if (tracked === undefined) throw new Error(`Epoch view '${name}' does not exist.`);
    if (!isUiRevisionRecord(tracked.payload)) throw new Error(`Epoch view '${name}' has an unreadable head revision.`);
    return tracked.payload;
  }

  function head(name: string): UiRevisionRecord {
    return readRecord(name);
  }

  function history(name: string): readonly TrackedChangeLedgerEntry[] {
    return epoch.versionLedger(viewEntity(name));
  }

  function revision(name: string, target: number): UiRevisionRecord {
    const event = epoch.repository.history().find((candidate) => {
      if (candidate.entity !== viewEntity(name)) return false;
      const payload = candidate.payload as { revision?: unknown };
      return payload.revision === target;
    });
    if (event === undefined) throw new Error(`Epoch view '${name}' has no revision ${target}.`);
    const payload = (event.payload as { payload?: unknown }).payload;
    if (!isUiRevisionRecord(payload)) throw new Error(`Epoch view '${name}' revision ${target} is unreadable.`);
    return payload;
  }

  function listViews(): readonly EpochViewSummary[] {
    const names = new Set<string>();
    for (const event of epoch.repository.history()) {
      if (event.entity.startsWith(VIEW_PREFIX)) names.add(event.entity.slice(VIEW_PREFIX.length));
    }

    return [...names].sort().map((name) => getView(name));
  }

  function getView(name: string): EpochViewSummary {
    const record = readRecord(name);
    const ledger = history(name);
    const latest = ledger.at(-1);
    return summarize(name, record, latest?.revision ?? 1, latest?.eventId ?? "");
  }

  function activeView(): string {
    const tracked = epoch.readOptionalTrackedEntity<{ view: string }>(ACTIVE_ENTITY);
    return tracked === undefined ? TRUNK_VIEW : tracked.payload.view;
  }

  function setActive(name: string): string {
    return epoch.trackChange<{ view: string }>({
      entity: ACTIVE_ENTITY,
      surface: "gen-ui",
      source: "community-runtime",
      summary: `checked out ${name}`,
      payload: { view: name },
    }).event.id;
  }

  function safeMode(): boolean {
    const tracked = epoch.readOptionalTrackedEntity<{ active: boolean }>(SAFE_MODE_ENTITY);
    return tracked !== undefined && tracked.payload.active;
  }

  function lastKnownGood(): { readonly view: string; readonly revision: number } | undefined {
    const tracked = epoch.readOptionalTrackedEntity<{ view: string; revision: number }>(LAST_KNOWN_GOOD_ENTITY);
    return tracked?.payload;
  }

  function validate(manifest: DynamicUiManifest): readonly string[] {
    return validateDynamicUiManifest(manifest, harness);
  }

  function createView(input: CreateViewInput): WorkspaceMutation<EpochViewSummary> {
    const name = requireViewName(input.name);
    if (epoch.readOptionalTrackedEntity(viewEntity(name)) !== undefined) {
      throw new Error(`Epoch view '${name}' already exists.`);
    }

    const from = input.from ?? activeView();
    const source = readRecord(from);
    const baseRevision = history(from).at(-1)?.revision ?? 1;
    const manifest = input.scope === undefined
      ? source.manifest
      : { ...source.manifest, scope: input.scope };

    return appendRevision(name, {
      manifest,
      kind: "proposal",
      provenance: { kind: "created", baseView: from, baseRevision },
    }, `created proposal view ${name} from ${from}@${baseRevision}`);
  }

  function checkout(name: string): WorkspaceMutation<EpochViewSummary> {
    const view = getView(name);
    const eventId = setActive(name);
    return { data: view, eventIds: [eventId], revisionIds: [view.revision], ref: view.ref, validationErrors: [] };
  }

  function propose(input: ProposeUiInput): WorkspaceMutation<EpochViewSummary> {
    if (!isDynamicUiManifest(input.manifest)) {
      throw new Error("A UI proposal requires a dynamic UI manifest.");
    }

    const name = requireViewName(input.view);
    const existing = epoch.readOptionalTrackedEntity<UiRevisionRecord>(viewEntity(name));
    const baseRevision = history(name).at(-1)?.revision;
    const errors = validate(input.manifest);
    const provenance: UiRevisionProvenance = {
      kind: "proposed",
      ...(existing === undefined ? {} : { baseView: name }),
      ...(baseRevision === undefined ? {} : { baseRevision }),
      ...(input.prompt === undefined ? {} : { promptDigest: digestOf(input.prompt) }),
      ...(input.prompt !== undefined && input.retainPrompt === true ? { prompt: input.prompt } : {}),
      ...(input.model === undefined ? {} : { model: input.model }),
      ...(errors.length === 0 ? {} : { validationErrors: errors }),
    };

    return appendRevision(name, {
      manifest: input.manifest,
      kind: existing === undefined ? "proposal" : (existing.payload as UiRevisionRecord).kind,
      provenance,
    }, `proposed UI revision for ${name}`);
  }

  function diff(from: string, into?: string): UiSemanticDiff {
    const target = into ?? TRUNK_VIEW;
    return diffDynamicUiManifests(readRecord(target).manifest, readRecord(from).manifest);
  }

  function merge(input: MergeViewInput): WorkspaceMutation<EpochViewSummary> {
    const into = input.into ?? TRUNK_VIEW;
    if (input.from === into) throw new Error("A view cannot be merged into itself.");

    const source = readRecord(input.from);
    const errors = validate(source.manifest);
    if (errors.length > 0) {
      throw new Error(`Epoch view '${input.from}' fails harness validation: ${errors.join("; ")}`);
    }

    const target = readRecord(into);
    const sourceRevision = history(input.from).at(-1)?.revision ?? 1;
    const mutation = appendRevision(into, {
      manifest: source.manifest,
      kind: target.kind,
      provenance: {
        kind: "merged",
        mergedFrom: input.from,
        mergedFromRevision: sourceRevision,
        baseView: into,
        baseRevision: history(into).at(-1)?.revision ?? 1,
      },
    }, `merged ${input.from}@${sourceRevision} into ${into}`);

    // Last-known-good otherwise only advances behind a validated merge, so
    // recovery never restores something that was never renderable.
    const promotion = promoteLastKnownGood(into, mutation.revisionIds[0] ?? 1);

    return { ...mutation, eventIds: [...mutation.eventIds, promotion] };
  }

  function revert(input: RevertViewInput): WorkspaceMutation<EpochViewSummary> {
    const target = revision(input.view, input.toRevision);
    const current = readRecord(input.view);
    return appendRevision(input.view, {
      manifest: target.manifest,
      kind: current.kind,
      provenance: {
        kind: "reverted",
        revertOf: input.toRevision,
        baseView: input.view,
        baseRevision: history(input.view).at(-1)?.revision ?? 1,
      },
    }, `reverted ${input.view} to revision ${input.toRevision}`);
  }

  function restoreLastKnownGood(): WorkspaceMutation<EpochViewSummary> {
    const known = lastKnownGood();
    if (known === undefined) throw new Error("This workspace has no last-known-good UI revision yet.");
    return revert({ view: known.view, toRevision: known.revision });
  }

  function setSafeMode(active: boolean): WorkspaceMutation<{ readonly safeMode: boolean }> {
    const result = epoch.trackChange<{ active: boolean }>({
      entity: SAFE_MODE_ENTITY,
      surface: "gen-ui",
      source: "community-runtime",
      summary: active ? "entered safe mode" : "left safe mode",
      payload: { active },
    });

    return {
      data: { safeMode: active },
      eventIds: [result.event.id],
      revisionIds: [result.revision],
      ref: "refs/ui/safe-mode",
      validationErrors: [],
    };
  }

  function materialize(name?: string): { readonly manifest: DynamicUiManifest; readonly safeMode: boolean; readonly reason?: string } {
    if (!verifyStaticHarnessRelease(harness)) {
      return { manifest: harness.safeModeManifest, safeMode: true, reason: "installed harness release failed digest verification" };
    }

    if (safeMode()) {
      return { manifest: harness.safeModeManifest, safeMode: true, reason: "safe mode is active" };
    }

    const view = name ?? activeView();
    const record = readRecord(view);
    const errors = validate(record.manifest);
    if (errors.length > 0) {
      return { manifest: harness.safeModeManifest, safeMode: true, reason: `head revision of '${view}' fails validation: ${errors.join("; ")}` };
    }

    return { manifest: record.manifest, safeMode: false };
  }

  function status(): WorkspaceStatus {
    const views = listViews();
    const proposals = views.filter((view) => view.kind === "proposal");
    const rendered = materialize();
    const known = lastKnownGood();

    return {
      workspaceId: id,
      actor: options.author,
      harnessRelease: harness.releaseId,
      harnessVerified: verifyStaticHarnessRelease(harness),
      activeView: activeView(),
      views: views.length,
      proposals: proposals.length,
      events: epoch.repository.history().length,
      safeMode: rendered.safeMode,
      state: rendered.safeMode && !safeMode() ? "unrenderable" : proposals.length > 0 ? "proposed" : "clean",
      ...(known === undefined ? {} : { lastKnownGood: known }),
    };
  }

  return {
    id,
    actor: options.author,
    epoch,
    harness,
    status,
    listViews,
    getView,
    head,
    history,
    revision,
    activeView,
    createView,
    checkout,
    propose,
    diff,
    merge,
    revert,
    restoreLastKnownGood,
    setSafeMode,
    materialize,
    validate,
    subscribe: epoch.subscribe,
  };
}

function requireViewName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("An Epoch view name is required.");
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(trimmed)) {
    throw new Error(`Epoch view name '${name}' must be lowercase letters, digits, and dashes.`);
  }

  return trimmed;
}

function isUiRevisionRecord(value: unknown): value is UiRevisionRecord {
  return isRecord(value)
    && isDynamicUiManifest(value.manifest)
    && isRecord(value.provenance)
    && (value.kind === "trunk" || value.kind === "proposal");
}
