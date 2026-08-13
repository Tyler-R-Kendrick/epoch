import {
  createCommandReceipt,
  EpochCommandError,
  policyReceipt,
  skippedValidation,
  validationReceipt,
  type EpochCommandReceipt,
  type EpochCommandSource,
  type EpochValidationReceipt,
} from "./receipts";
import { verifyStaticHarnessRelease } from "./harness";
import { DEFAULT_PROJECT_SLUG, ensureProject, listProjects } from "./projects";
import type { DynamicUiManifest } from "./ui";
import type { BrowserEpochWorkspace, WorkspaceMutation } from "./workspace";

/**
 * The command bus.
 *
 * This is the only way anything mutates. A button, a prompt, a WebMCP tool, and
 * `epoch ui merge --json` all land here, get the same capability check, the same
 * confirmation rule, and the same receipt back. Adapters translate argument
 * shapes; they do not get to decide what an operation means or who may run it.
 *
 * Capability enforcement lives at this layer on purpose. A tool being *visible*
 * to a browser agent says nothing about whether the caller may execute it, so
 * authorization cannot live in a tool description, an availability check, or a
 * disabled button.
 */
export interface JsonSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly required?: readonly string[];
}

export interface EpochCommandDescriptor {
  readonly kind: string;
  readonly summary: string;
  readonly capability: string;
  readonly readOnly: boolean;
  readonly requiresConfirmation: boolean;
  /** True when the result can contain community-authored text an agent must not treat as instructions. */
  readonly untrustedContent: boolean;
  readonly inputSchema: JsonSchema;
}

export interface EpochCommandRequest {
  readonly kind: string;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly source?: EpochCommandSource;
  readonly actor?: string;
  readonly confirmed?: boolean;
}

export interface EpochPolicySet {
  /** Capabilities this principal holds. `"*"` grants every capability. */
  readonly capabilities: readonly string[];
  /** Extra command kinds that require explicit confirmation for this principal. */
  readonly requireConfirmation?: readonly string[];
}

export interface CommunityCommandBus {
  readonly catalog: readonly EpochCommandDescriptor[];
  describe(kind: string): EpochCommandDescriptor;
  execute<TData = unknown>(request: EpochCommandRequest): Promise<EpochCommandReceipt<TData>>;
}

interface CommandOutcome {
  readonly data: unknown;
  readonly eventIds?: readonly string[];
  readonly revisionIds?: readonly number[];
  readonly baseRef?: string;
  readonly proposalRef?: string;
  readonly changeId?: string;
  readonly validation?: EpochValidationReceipt;
}

interface CommandHandler {
  readonly descriptor: EpochCommandDescriptor;
  run(input: Readonly<Record<string, unknown>>): CommandOutcome;
}

export interface CreateCommandBusOptions {
  readonly workspace: BrowserEpochWorkspace;
  readonly policies: EpochPolicySet;
  readonly defaultSource: EpochCommandSource;
  readonly now: () => string;
  readonly onReceipt?: (receipt: EpochCommandReceipt) => void;
}

export function createCommunityCommandBus(options: CreateCommandBusOptions): CommunityCommandBus {
  const workspace = options.workspace;
  const handlers = new Map<string, CommandHandler>();
  let sequence = 0;

  register({
    kind: "workspace.status",
    summary: "Report workspace identity, active view, proposal count, and recovery state.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => ({ data: workspace.status() }));

  register({
    kind: "workspace.verify",
    summary: "Verify the installed static harness release against its content digest.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => {
    const verified = verifyStaticHarnessRelease(workspace.harness);
    return {
      data: { harnessRelease: workspace.harness.releaseId, verified },
      validation: validationReceipt(workspace.harness.releaseId, verified ? [] : ["harness release digest mismatch"]),
    };
  });

  register({
    kind: "view.list",
    summary: "List named views and proposals in this workspace.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => ({ data: workspace.listViews() }));

  register({
    kind: "history.list",
    summary: "List the revision ledger for a view.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema({ view: stringProperty("View name; defaults to the active view.") }),
  }, (input) => {
    const view = optionalString(input, "view") ?? workspace.activeView();
    return { data: workspace.history(view), baseRef: workspace.getView(view).ref };
  });

  register({
    kind: "change.show",
    summary: "Show one revision of a view with its provenance.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: true,
    inputSchema: schema(
      { view: stringProperty("View name."), revision: numberProperty("Revision number.") },
      ["view", "revision"],
    ),
  }, (input) => {
    const view = requiredString(input, "view");
    const revision = requiredNumber(input, "revision");
    return { data: workspace.revision(view, revision), baseRef: workspace.getView(view).ref };
  });

  register({
    kind: "ui.getManifest",
    summary: "Return the manifest the harness would render, and whether safe mode is engaged.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema({ view: stringProperty("View name; defaults to the active view.") }),
  }, (input) => {
    const view = optionalString(input, "view");
    return { data: workspace.materialize(view) };
  });

  register({
    kind: "ui.semanticDiff",
    summary: "Explain what a view changes about layout, widgets, theme tokens, and action bindings.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema(
      { from: stringProperty("Source view."), into: stringProperty("Target view; defaults to the trunk view.") },
      ["from"],
    ),
  }, (input) => {
    const from = requiredString(input, "from");
    const into = optionalString(input, "into");
    return { data: workspace.diff(from, into), proposalRef: workspace.getView(from).ref };
  });

  register({
    kind: "ui.validate",
    summary: "Validate a view head against the installed harness slot and component allowlist.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema({ view: stringProperty("View name.") }, ["view"]),
  }, (input) => {
    const view = requiredString(input, "view");
    const errors = workspace.validate(workspace.head(view).manifest);
    return {
      data: { view, valid: errors.length === 0, errors },
      validation: validationReceipt(view, errors),
    };
  });

  register({
    kind: "project.list",
    summary: "List projects in this workspace, including the default .epoch project.",
    capability: "workspace.read",
    readOnly: true,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => ({ data: listProjects(workspace.epoch) }));

  register({
    kind: "project.ensureDefault",
    summary: "Open the default .epoch project, creating it on first boot. Idempotent.",
    capability: "workspace.write",
    readOnly: false,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema({
      slug: stringProperty(`Project slug; defaults to ${DEFAULT_PROJECT_SLUG}.`),
      title: stringProperty("Human-readable project title."),
    }),
  }, (input) => {
    const project = ensureProject(workspace.epoch, {
      ...(optionalString(input, "slug") === undefined ? {} : { slug: requiredString(input, "slug") }),
      ...(optionalString(input, "title") === undefined ? {} : { title: requiredString(input, "title") }),
    });

    return {
      data: project,
      ...(project.created ? { eventIds: [project.eventId], revisionIds: [project.revision] } : {}),
      baseRef: workspace.getView(project.uiView).ref,
    };
  });

  register({
    kind: "view.create",
    summary: "Create a proposal view from an existing view.",
    capability: "workspace.write",
    readOnly: false,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema(
      {
        name: stringProperty("New view name (lowercase letters, digits, dashes)."),
        from: stringProperty("Base view; defaults to the active view."),
        scope: enumProperty("Change scope for the proposal.", ["personal", "project", "session"]),
      },
      ["name"],
    ),
  }, (input) => fromMutation(workspace.createView({
    name: requiredString(input, "name"),
    ...(optionalString(input, "from") === undefined ? {} : { from: requiredString(input, "from") }),
    ...(optionalString(input, "scope") === undefined ? {} : { scope: requiredScope(input) }),
  }), "proposal"));

  register({
    kind: "view.switch",
    summary: "Make a view the active view for this workspace.",
    capability: "workspace.write",
    readOnly: false,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema({ view: stringProperty("View name.") }, ["view"]),
  }, (input) => fromMutation(workspace.checkout(requiredString(input, "view")), "base"));

  register({
    kind: "ui.propose",
    summary: "Record a dynamic UI manifest as a new revision on a view.",
    capability: "ui.propose",
    readOnly: false,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: schema(
      {
        view: stringProperty("View to append the revision to."),
        manifest: { type: "object", description: "Dynamic UI manifest: abiVersion, scope, placements, theme." },
        prompt: stringProperty("Prompt that produced the manifest. Stored as a digest unless retainPrompt is true."),
        model: stringProperty("Model or provider identifier that generated the manifest."),
        retainPrompt: booleanProperty("Store the prompt text alongside its digest."),
      },
      ["view", "manifest"],
    ),
  }, (input) => {
    const manifest = input.manifest as DynamicUiManifest;
    const mutation = workspace.propose({
      view: requiredString(input, "view"),
      manifest,
      ...(optionalString(input, "prompt") === undefined ? {} : { prompt: requiredString(input, "prompt") }),
      ...(optionalString(input, "model") === undefined ? {} : { model: requiredString(input, "model") }),
      ...(input.retainPrompt === true ? { retainPrompt: true } : {}),
    });

    return {
      ...fromMutation(mutation, "proposal"),
      validation: validationReceipt(mutation.data.ref, mutation.validationErrors),
    };
  });

  register({
    kind: "change.merge",
    summary: "Promote a validated view into its target view and advance last-known-good.",
    capability: "ui.merge",
    readOnly: false,
    requiresConfirmation: true,
    untrustedContent: false,
    inputSchema: schema(
      { from: stringProperty("Source view."), into: stringProperty("Target view; defaults to the trunk view.") },
      ["from"],
    ),
  }, (input) => fromMutation(workspace.merge({
    from: requiredString(input, "from"),
    ...(optionalString(input, "into") === undefined ? {} : { into: requiredString(input, "into") }),
  }), "base"));

  register({
    kind: "change.revert",
    summary: "Append a revision that restores an earlier manifest. History is preserved.",
    capability: "ui.merge",
    readOnly: false,
    requiresConfirmation: true,
    untrustedContent: false,
    inputSchema: schema(
      { view: stringProperty("View name."), revision: numberProperty("Revision to restore.") },
      ["view", "revision"],
    ),
  }, (input) => fromMutation(workspace.revert({
    view: requiredString(input, "view"),
    toRevision: requiredNumber(input, "revision"),
  }), "base"));

  register({
    kind: "ui.restoreLastKnownGood",
    summary: "Restore the last validated merged revision without discarding later history.",
    capability: "ui.recover",
    readOnly: false,
    requiresConfirmation: true,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => fromMutation(workspace.restoreLastKnownGood(), "base"));

  register({
    kind: "ui.enterSafeMode",
    summary: "Boot the signed static harness only, ignoring the dynamic head.",
    capability: "ui.recover",
    readOnly: false,
    requiresConfirmation: false,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => {
    const mutation = workspace.setSafeMode(true);
    return { data: mutation.data, eventIds: mutation.eventIds, revisionIds: mutation.revisionIds, baseRef: mutation.ref };
  });

  register({
    kind: "ui.leaveSafeMode",
    summary: "Leave safe mode and render the dynamic head again.",
    capability: "ui.recover",
    readOnly: false,
    requiresConfirmation: true,
    untrustedContent: false,
    inputSchema: emptySchema(),
  }, () => {
    const mutation = workspace.setSafeMode(false);
    return { data: mutation.data, eventIds: mutation.eventIds, revisionIds: mutation.revisionIds, baseRef: mutation.ref };
  });

  function register(descriptor: EpochCommandDescriptor, run: CommandHandler["run"]): void {
    handlers.set(descriptor.kind, { descriptor, run });
  }

  function describe(kind: string): EpochCommandDescriptor {
    const handler = handlers.get(kind);
    if (handler === undefined) throw new EpochCommandError("unknown-command", `Unknown Epoch command '${kind}'.`);
    return handler.descriptor;
  }

  function granted(capability: string): boolean {
    return options.policies.capabilities.includes("*") || options.policies.capabilities.includes(capability);
  }

  function needsConfirmation(descriptor: EpochCommandDescriptor): boolean {
    return descriptor.requiresConfirmation
      || (options.policies.requireConfirmation ?? []).includes(descriptor.kind);
  }

  async function execute<TData>(request: EpochCommandRequest): Promise<EpochCommandReceipt<TData>> {
    const handler = handlers.get(request.kind);
    if (handler === undefined) {
      throw new EpochCommandError("unknown-command", `Unknown Epoch command '${request.kind}'.`);
    }

    const descriptor = handler.descriptor;
    const input = request.input ?? {};
    sequence += 1;
    const base = {
      kind: descriptor.kind,
      source: request.source ?? options.defaultSource,
      actor: request.actor ?? workspace.actor,
      workspaceId: workspace.id,
      readOnly: descriptor.readOnly,
      sequence,
      timestamp: options.now(),
      input,
    } as const;

    if (!granted(descriptor.capability)) {
      return emit(createCommandReceipt<TData>({
        ...base,
        policy: policyReceipt("deny", descriptor.capability, `principal lacks capability '${descriptor.capability}'`),
        validation: skippedValidation,
        confirmation: { required: needsConfirmation(descriptor), granted: request.confirmed === true },
        data: { refused: "capability" } as TData,
      }));
    }

    if (needsConfirmation(descriptor) && request.confirmed !== true) {
      return emit(createCommandReceipt<TData>({
        ...base,
        policy: policyReceipt("confirm", descriptor.capability, `'${descriptor.kind}' requires explicit confirmation`),
        validation: skippedValidation,
        confirmation: { required: true, granted: false },
        data: { refused: "confirmation" } as TData,
      }));
    }

    const outcome = handler.run(input);
    return emit(createCommandReceipt<TData>({
      ...base,
      policy: policyReceipt("allow", descriptor.capability),
      validation: outcome.validation ?? skippedValidation,
      confirmation: { required: needsConfirmation(descriptor), granted: request.confirmed === true },
      ...(outcome.baseRef === undefined ? {} : { baseRef: outcome.baseRef }),
      ...(outcome.proposalRef === undefined ? {} : { proposalRef: outcome.proposalRef }),
      ...(outcome.changeId === undefined ? {} : { changeId: outcome.changeId }),
      ...(outcome.revisionIds === undefined ? {} : { revisionIds: outcome.revisionIds }),
      ...(outcome.eventIds === undefined ? {} : { eventIds: outcome.eventIds }),
      data: outcome.data as TData,
    }));
  }

  function emit<TData>(receipt: EpochCommandReceipt<TData>): EpochCommandReceipt<TData> {
    options.onReceipt?.(receipt as EpochCommandReceipt);
    return receipt;
  }

  return {
    get catalog() {
      return [...handlers.values()].map((handler) => handler.descriptor);
    },
    describe,
    execute,
  };
}

function fromMutation(mutation: WorkspaceMutation<unknown>, ref: "base" | "proposal"): CommandOutcome {
  return {
    data: mutation.data,
    eventIds: mutation.eventIds,
    revisionIds: mutation.revisionIds,
    ...(ref === "base" ? { baseRef: mutation.ref } : { proposalRef: mutation.ref }),
    changeId: mutation.eventIds[0] ?? "",
  };
}

function emptySchema(): JsonSchema {
  return { type: "object", properties: {} };
}

function schema(
  properties: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  required: readonly string[] = [],
): JsonSchema {
  return required.length === 0
    ? { type: "object", properties }
    : { type: "object", properties, required };
}

function stringProperty(description: string): Readonly<Record<string, unknown>> {
  return { type: "string", description };
}

function numberProperty(description: string): Readonly<Record<string, unknown>> {
  return { type: "number", description };
}

function booleanProperty(description: string): Readonly<Record<string, unknown>> {
  return { type: "boolean", description };
}

function enumProperty(description: string, values: readonly string[]): Readonly<Record<string, unknown>> {
  return { type: "string", description, enum: values };
}

function requiredString(input: Readonly<Record<string, unknown>>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new EpochCommandError("invalid-input", `Command input '${key}' must be a non-empty string.`);
  }

  return value;
}

function optionalString(input: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function requiredNumber(input: Readonly<Record<string, unknown>>, key: string): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EpochCommandError("invalid-input", `Command input '${key}' must be a number.`);
  }

  return value;
}

function requiredScope(input: Readonly<Record<string, unknown>>): "personal" | "project" | "session" {
  const value = requiredString(input, "scope");
  if (value !== "personal" && value !== "project" && value !== "session") {
    throw new EpochCommandError("invalid-input", `Unsupported change scope '${value}'.`);
  }

  return value;
}
