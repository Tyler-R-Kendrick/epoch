/**
 * Spaces — shared, signed, joinable workspaces (ADR-0042).
 *
 * A Space is the object a second person can join. It *composes* the primitives
 * Epoch already ships and replaces none of them: one View selects history,
 * Workspaces materialize it per machine and keep reporting their own capability
 * facts, Principals hold Grants and Budgets, and each turn records the Sandbox
 * it actually ran in.
 *
 * The governance here is enforced, not described. A turn without a live grant
 * is refused; a turn beyond an allocated budget is refused; a captured
 * operation outside an open capture session is refused; and an anchor that no
 * longer resolves reports that instead of silently pointing somewhere wrong.
 */
import { createHash } from "node:crypto";
import { DefaultAuthor } from "./domain";
import { EpochRepository } from "./core";
import { indexTree, selectBuiltinProvider } from "@epoch/semantic";
import {
  assertProtocolEvent,
  assertRevisionId,
  createCanonicalId,
  parseCanonicalId,
  type CanonicalId,
  type RandomSource,
} from "@epoch/protocol";
import { createWorkspaceStateManifest } from "./workspace-providers";
import type { WorkspaceProvider } from "./workspace";

export type SpaceRole = "owner" | "collaborator" | "agent" | "observer";
export type SpaceExecution = "disabled" | "in-process" | "isolated";
export type SpaceRedaction = "none" | "declared-secrets" | "full";

export interface SpaceRecord {
  readonly id: string;
  readonly kind: string;
  readonly revision: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface SpaceParticipant {
  readonly principalId: string;
  readonly grantId: string;
  readonly role: SpaceRole;
  readonly active: boolean;
}

export interface SpaceAnchorResolution {
  readonly anchorId: string;
  readonly path: string;
  readonly structuralPath: string;
  readonly revisionId: string;
  readonly status: "resolved" | "moved" | "unresolved";
  readonly contentDigest: string;
  readonly currentDigest?: string;
}

export interface SignedSpaceStoreOptions {
  readonly author?: string;
  readonly random?: RandomSource;
}

/** Error codes match the CLI envelope vocabulary so callers get one taxonomy. */
export type SpaceErrorCode =
  | "invalid-input" | "not-found" | "conflict" | "grant-denied" | "budget-exceeded" | "policy-denied";

export class SpaceError extends Error {
  readonly name = "SpaceError";
  constructor(readonly code: SpaceErrorCode, message: string, readonly details: Readonly<Record<string, unknown>> = {}) {
    super(message);
  }
}

/** Declared as a function so TypeScript narrows control flow after a call. */
function fail(code: SpaceErrorCode, message: string, details: Readonly<Record<string, unknown>> = {}): never {
  throw new SpaceError(code, message, details);
}

export class SignedSpaceStore {
  readonly #repository: EpochRepository;
  readonly #random: RandomSource | undefined;
  readonly #author: string;
  #principalId?: CanonicalId<"principal">;
  #repositoryId?: CanonicalId<"repo">;

  private constructor(repository: EpochRepository, options: SignedSpaceStoreOptions) {
    this.#repository = repository;
    this.#random = options.random;
    this.#author = options.author ?? repository.identity();
  }

  static open(root: string, options: SignedSpaceStoreOptions = {}): SignedSpaceStore {
    const repository = EpochRepository.openOrCreate(root, { author: options.author ?? DefaultAuthor });
    return new SignedSpaceStore(repository, options);
  }

  get repository(): EpochRepository { return this.#repository; }

  // ---------------------------------------------------------------- lifecycle

  /**
   * Create a Space over a View. The creator joins as owner in the same call,
   * because a Space with no principal holding a grant could never record a turn.
   */
  createSpace(input: { readonly title: string; readonly view?: string }): SpaceRecord {
    const title = requireText(input.title, "space title");
    const viewName = input.view ?? "main";
    const spaceId = createCanonicalId("space", this.#random);
    const ownerPrincipalId = this.principalId();
    this.append("space.created", {
      spaceId, repositoryId: this.repositoryId(), ownerPrincipalId, viewName, title,
    });
    this.joinInternal(spaceId, ownerPrincipalId, "owner");
    return this.showSpace(spaceId);
  }

  listSpaces(): readonly SpaceRecord[] {
    return this.#repository.events()
      .filter((event) => event.type === "space.created")
      .map((event) => this.spaceRecord(String(event.payload.spaceId)));
  }

  showSpace(spaceId: string): SpaceRecord {
    this.requireSpace(spaceId);
    return this.spaceRecord(spaceId);
  }

  /** Join issues a fresh grant. Membership and authority are the same fact. */
  join(spaceId: string, input: { readonly principal?: string; readonly role?: SpaceRole } = {}): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    const role = input.role ?? "collaborator";
    if (!["owner", "collaborator", "agent", "observer"].includes(role)) {
      fail("invalid-input", `unknown space role: ${role}`);
    }
    if (this.activeParticipant(spaceId, principalId) !== undefined) {
      fail("conflict", `principal already joined: ${principalId}`);
    }
    const grantId = this.joinInternal(spaceId, principalId, role);
    return { id: spaceId, kind: "space-participant", revision: 1, data: { spaceId, principalId, grantId, role } };
  }

  /**
   * Leaving revokes the grant. This is why revocation is not a separate
   * bookkeeping step that can be forgotten — the same event ends both.
   */
  leave(spaceId: string, input: { readonly principal?: string } = {}): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    const participant = this.activeParticipant(spaceId, principalId)
      ?? fail("not-found", `principal is not an active participant: ${principalId}`);
    this.append("space.participant.left", { spaceId, principalId, grantId: participant.grantId });
    return { id: spaceId, kind: "space-participant", revision: 2, data: { spaceId, principalId, active: false } };
  }

  participants(spaceId: string): readonly SpaceParticipant[] {
    this.requireSpace(spaceId);
    const byPrincipal = new Map<string, SpaceParticipant>();
    for (const event of this.#repository.events()) {
      if (event.payload.spaceId !== spaceId) continue;
      const principalId = String(event.payload.principalId);
      if (event.type === "space.participant.joined") {
        byPrincipal.set(principalId, {
          principalId, grantId: String(event.payload.grantId),
          role: String(event.payload.role) as SpaceRole, active: true,
        });
      } else if (event.type === "space.participant.left") {
        const current = byPrincipal.get(principalId);
        if (current !== undefined) byPrincipal.set(principalId, { ...current, active: false });
      }
    }
    return [...byPrincipal.values()];
  }

  // --------------------------------------------------------------- workspaces

  /**
   * Bind a workspace to a Space. The manifest comes from the provider, so a
   * Space can never claim isolation or copy-on-write that the provider did not
   * positively declare (ADR-0032).
   */
  bindWorkspace(spaceId: string, input: {
    readonly provider: WorkspaceProvider;
    readonly principal?: string;
    readonly residency?: "resident" | "partial" | "virtual";
    readonly materialization?: "materialized" | "virtual";
    readonly execution?: SpaceExecution;
  }): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    const participant = this.requireActiveGrant(spaceId, principalId, "bind a workspace");
    const manifest = createWorkspaceStateManifest(input.provider, {
      residency: input.residency ?? "virtual",
      materialization: input.materialization ?? "virtual",
      execution: input.execution ?? "disabled",
    });
    const workspaceId = createCanonicalId("workspace", this.#random);
    this.append("space.workspace.bound", {
      spaceId, principalId, workspaceId,
      providerId: manifest.providerId, storageMode: manifest.storageMode,
      residency: manifest.residency, materialization: manifest.materialization, execution: manifest.execution,
    });
    return {
      id: workspaceId, kind: "space-workspace", revision: 1,
      data: { spaceId, principalId, grantId: participant.grantId, ...manifest },
    };
  }

  workspaces(spaceId: string): readonly SpaceRecord[] {
    this.requireSpace(spaceId);
    return this.#repository.events()
      .filter((event) => event.type === "space.workspace.bound" && event.payload.spaceId === spaceId)
      .map((event) => ({
        id: String(event.payload.workspaceId), kind: "space-workspace", revision: 1,
        data: { ...event.payload, eventId: event.id },
      }));
  }

  // -------------------------------------------------------------------- turns

  /**
   * Record an agent or human turn.
   *
   * This is the enforcement point Delta's own documentation says it does not
   * have. A turn requires a live grant, stays inside its budget, and names the
   * declared execution mode it ran under rather than implying isolation.
   */
  recordTurn(spaceId: string, input: {
    readonly request: string;
    readonly principal?: string;
    readonly execution?: SpaceExecution;
    readonly units?: number;
    readonly sandboxId?: string;
  }): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    const participant = this.requireActiveGrant(spaceId, principalId, "record a turn");
    if (participant.role === "observer") {
      fail("grant-denied", `observer grants do not authorize turns: ${principalId}`, { principal: principalId, role: participant.role });
    }
    const request = requireText(input.request, "turn request");
    const execution = input.execution ?? "disabled";
    if (!["disabled", "in-process", "isolated"].includes(execution)) {
      fail("invalid-input", `unknown execution mode: ${execution}`);
    }
    const units = input.units ?? 0;
    if (!Number.isSafeInteger(units) || units < 0) fail("invalid-input", "turn units must be a nonnegative integer");
    const budget = this.budgetFor(spaceId, principalId);
    if (units > 0) {
      if (budget === undefined) {
        fail("budget-exceeded", `no budget is allocated for ${principalId}`, { principal: principalId, requested: units });
      }
      if (units > budget.remaining) {
        fail("budget-exceeded", `turn requires ${units} units, ${budget.remaining} remaining`, {
          principal: principalId, requested: units, remaining: budget.remaining,
        });
      }
    }
    if (input.sandboxId !== undefined) parseCanonicalId(input.sandboxId, "sandbox");
    const event = this.append("space.turn.recorded", {
      spaceId, principalId, grantId: participant.grantId, execution,
      requestDigest: sha256Hex(request),
      ...(input.sandboxId === undefined ? {} : { sandboxId: input.sandboxId }),
      ...(units > 0 && budget !== undefined ? { budgetId: budget.budgetId, units } : {}),
    });
    return {
      id: event.id, kind: "space-turn", revision: 1,
      data: {
        spaceId, principalId, grantId: participant.grantId, execution, units,
        remaining: budget === undefined ? 0 : Math.max(0, budget.remaining - units),
      },
    };
  }

  turns(spaceId: string): readonly SpaceRecord[] {
    this.requireSpace(spaceId);
    return this.#repository.events()
      .filter((event) => event.type === "space.turn.recorded" && event.payload.spaceId === spaceId)
      .map((event) => ({ id: event.id, kind: "space-turn", revision: 1, data: { ...event.payload } }));
  }

  /**
   * Allocate budget for a participant. Budgets are per Space, per principal.
   *
   * The allocation event carries its `spaceId` so the binding lives in signed
   * history. A bare `agent.budget.allocated` would record no Space, and units
   * granted in one Space would be spendable in every other one.
   */
  allocateTurnBudget(spaceId: string, input: { readonly principal?: string; readonly units: number }): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    this.requireActiveGrant(spaceId, principalId, "hold a budget");
    if (!Number.isSafeInteger(input.units) || input.units < 0) fail("invalid-input", "budget units must be a nonnegative integer");
    const budgetId = createCanonicalId("budget", this.#random);
    this.append("space.budget.allocated", { spaceId, budgetId, principalId, units: input.units });
    return { id: budgetId, kind: "space-budget", revision: 1, data: { spaceId, principalId, units: input.units } };
  }

  // ----------------------------------------------------------------- capture

  /**
   * Open a capture session. Continuous capture is legitimate only inside one of
   * these: the declared scope, retention, and redaction policy is itself a
   * signed artifact, so consent is verifiable rather than assumed.
   */
  openCapture(spaceId: string, input: {
    readonly scope: string;
    readonly retention: string;
    readonly redaction?: SpaceRedaction;
    readonly principal?: string;
  }): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    this.requireActiveGrant(spaceId, principalId, "open a capture session");
    const open = this.openCaptureSession(spaceId, principalId);
    if (open !== undefined) fail("conflict", `a capture session is already open: ${open}`);
    const redaction = input.redaction ?? "declared-secrets";
    if (!["none", "declared-secrets", "full"].includes(redaction)) fail("invalid-input", `unknown redaction policy: ${redaction}`);
    const sessionId = createCanonicalId("session", this.#random);
    this.append("space.capture.opened", {
      spaceId, sessionId, principalId,
      scope: requireText(input.scope, "capture scope"),
      retention: requireText(input.retention, "capture retention"),
      redaction,
    });
    return { id: sessionId, kind: "space-capture", revision: 1, data: { spaceId, principalId, scope: input.scope, retention: input.retention, redaction, open: true } };
  }

  /**
   * Record one captured operation. Refused outside an open session — this is
   * the line between consented capture and a keylogger.
   */
  recordCapturedOperation(spaceId: string, input: {
    readonly path: string; readonly content: string; readonly principal?: string;
  }): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    this.requireActiveGrant(spaceId, principalId, "record a captured operation");
    const sessionId = this.openCaptureSession(spaceId, principalId)
      ?? fail("policy-denied", "captured operations require an open capture session", { principal: principalId });
    const event = this.append("space.capture.operation", {
      spaceId, sessionId, principalId,
      path: requireText(input.path, "capture path"),
      contentDigest: sha256Hex(input.content),
    });
    return { id: event.id, kind: "space-capture-operation", revision: 1, data: { spaceId, sessionId, principalId, path: input.path } };
  }

  closeCapture(spaceId: string, input: { readonly principal?: string } = {}): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    const sessionId = this.openCaptureSession(spaceId, principalId)
      ?? fail("not-found", `no open capture session for ${principalId}`);
    const operationCount = this.#repository.events().filter((event) =>
      event.type === "space.capture.operation" && event.payload.sessionId === sessionId).length;
    this.append("space.capture.closed", { spaceId, sessionId, principalId, operationCount });
    return { id: sessionId, kind: "space-capture", revision: 2, data: { spaceId, principalId, operationCount, open: false } };
  }

  captureSessions(spaceId: string): readonly SpaceRecord[] {
    this.requireSpace(spaceId);
    const closed = new Set(this.#repository.events()
      .filter((event) => event.type === "space.capture.closed" && event.payload.spaceId === spaceId)
      .map((event) => String(event.payload.sessionId)));
    return this.#repository.events()
      .filter((event) => event.type === "space.capture.opened" && event.payload.spaceId === spaceId)
      .map((event) => ({
        id: String(event.payload.sessionId), kind: "space-capture", revision: 1,
        data: { ...event.payload, open: !closed.has(String(event.payload.sessionId)) },
      }));
  }

  // ----------------------------------------------------------------- anchors

  /**
   * Anchor a comment to a structural path inside an exact Revision.
   *
   * A structural path (`object#0/member:version`) re-resolves after the file is
   * reformatted or the surrounding code moves, which a line number or an
   * operation offset cannot do.
   */
  recordAnchor(spaceId: string, input: {
    readonly revisionId: string; readonly path: string; readonly content: string;
    readonly structuralPath: string; readonly principal?: string;
  }): SpaceRecord {
    this.requireSpace(spaceId);
    const principalId = this.namedPrincipal(input.principal);
    this.requireActiveGrant(spaceId, principalId, "record an anchor");
    const revisionId = this.requireExistingRevision(input.revisionId);
    const path = requireText(input.path, "anchor path");
    const structuralPath = requireText(input.structuralPath, "anchor structural path");
    const index = indexContent(path, input.content);
    if (index !== undefined && !index.byPath.has(structuralPath)) {
      fail("not-found", `structural path is not present in the anchored content: ${structuralPath}`, { path, structuralPath });
    }
    const anchorId = createCanonicalId("anchor", this.#random);
    this.append("space.anchor.recorded", {
      spaceId, anchorId, principalId, revisionId, path, structuralPath,
      contentDigest: sha256Hex(input.content),
    });
    return { id: anchorId, kind: "space-anchor", revision: 1, data: { spaceId, principalId, revisionId, path, structuralPath } };
  }

  /**
   * Re-resolve an anchor against current content.
   *
   * `resolved` means the structural path still exists and the bytes are
   * unchanged; `moved` means the file changed but the construct is still there
   * — the case a line anchor gets wrong; `unresolved` means it is genuinely
   * gone, which is reported rather than papered over.
   */
  resolveAnchor(anchorId: string, input: { readonly content: string }): SpaceAnchorResolution {
    parseCanonicalId(anchorId, "anchor");
    const event = this.#repository.events().find((item) =>
      item.type === "space.anchor.recorded" && item.payload.anchorId === anchorId)
      ?? fail("not-found", `anchor not found: ${anchorId}`);
    const path = String(event.payload.path);
    const structuralPath = String(event.payload.structuralPath);
    const contentDigest = String(event.payload.contentDigest);
    const currentDigest = sha256Hex(input.content);
    const index = indexContent(path, input.content);
    const present = index === undefined ? currentDigest === contentDigest : index.byPath.has(structuralPath);
    const status = !present ? "unresolved" : currentDigest === contentDigest ? "resolved" : "moved";
    return {
      anchorId, path, structuralPath, revisionId: String(event.payload.revisionId),
      status, contentDigest, currentDigest,
    };
  }

  anchors(spaceId: string): readonly SpaceRecord[] {
    this.requireSpace(spaceId);
    return this.#repository.events()
      .filter((event) => event.type === "space.anchor.recorded" && event.payload.spaceId === spaceId)
      .map((event) => ({ id: String(event.payload.anchorId), kind: "space-anchor", revision: 1, data: { ...event.payload } }));
  }

  // ---------------------------------------------------------------- internals

  private joinInternal(spaceId: string, principalId: CanonicalId<"principal">, role: SpaceRole): CanonicalId<"grant"> {
    const grantId = createCanonicalId("grant", this.#random);
    this.append("space.participant.joined", { spaceId, principalId, grantId, role });
    return grantId;
  }

  private requireSpace(spaceId: string): void {
    try { parseCanonicalId(spaceId, "space"); }
    catch { fail("not-found", `space not found: ${spaceId}`); }
    const found = this.#repository.events().some((event) =>
      event.type === "space.created" && event.payload.spaceId === spaceId);
    if (!found) fail("not-found", `space not found: ${spaceId}`);
  }

  private requireActiveGrant(spaceId: string, principalId: string, action: string): SpaceParticipant {
    const participant = this.activeParticipant(spaceId, principalId);
    if (participant === undefined) {
      fail("grant-denied", `no active grant authorizes ${principalId} to ${action}`, {
        principal: principalId, space: spaceId, action, authorized: false,
      });
    }
    return participant;
  }

  private activeParticipant(spaceId: string, principalId: string): SpaceParticipant | undefined {
    const participant = this.participants(spaceId).find((item) => item.principalId === principalId);
    return participant?.active === true ? participant : undefined;
  }

  private openCaptureSession(spaceId: string, principalId: string): string | undefined {
    const open = this.captureSessions(spaceId).find((session) =>
      session.data.principalId === principalId && session.data.open === true);
    return open === undefined ? undefined : open.id;
  }

  /** Allocations and consumption are both scoped to this Space, never just the principal. */
  private budgetFor(spaceId: string, principalId: string): { readonly budgetId: string; readonly remaining: number } | undefined {
    const allocations = this.#repository.events().filter((event) =>
      event.type === "space.budget.allocated"
      && event.payload.spaceId === spaceId && event.payload.principalId === principalId);
    const latest = allocations.at(-1);
    if (latest === undefined) return undefined;
    const allocated = allocations.reduce((total, event) => total + Number(event.payload.units ?? 0), 0);
    const consumed = this.#repository.events()
      .filter((event) => event.type === "space.turn.recorded"
        && event.payload.spaceId === spaceId && event.payload.principalId === principalId)
      .reduce((total, event) => total + Number(event.payload.units ?? 0), 0);
    return { budgetId: String(latest.payload.budgetId), remaining: Math.max(0, allocated - consumed) };
  }

  private spaceRecord(spaceId: string): SpaceRecord {
    const created = this.#repository.events().find((event) =>
      event.type === "space.created" && event.payload.spaceId === spaceId)
      ?? fail("not-found", `space not found: ${spaceId}`);
    const participants = this.participants(spaceId);
    return {
      id: spaceId, kind: "space", revision: 1,
      data: {
        title: created.payload.title, viewName: created.payload.viewName,
        ownerPrincipalId: created.payload.ownerPrincipalId, eventId: created.id,
        participantCount: participants.filter((item) => item.active).length,
        workspaceCount: this.workspaces(spaceId).length,
        turnCount: this.turns(spaceId).length,
      },
    };
  }

  private append(type: string, body: object) {
    assertProtocolEvent({ schemaVersion: 1, type, eventId: "pending-event", revisionId: "pending-event", body });
    const parents = this.#repository.heads();
    return this.#repository.appendWithParents(type, { ...body } as Record<string, unknown>, {
      author: this.#author,
      parents,
      expectedHeads: parents,
      transactionId: `${createCanonicalId("operation", this.#random)}:${this.#repository.events().length}`,
    });
  }

  /**
   * Resolve a principal name to a key-backed ID.
   *
   * A canonical ID passes through so a second machine can address the same
   * principal. Any other name resolves through `identityFor()`, so the ID is
   * always the hash of real signing key material — a grant is never issued to a
   * principal that holds no key. Deriving IDs from the name itself would let
   * `--principal alice` mint a signed membership claim for a principal nobody
   * controls.
   */
  private namedPrincipal(name?: string): CanonicalId<"principal"> {
    if (name === undefined || name === "current" || name === this.#author) return this.principalId();
    if (name.startsWith("epoch:principal:")) {
      parseCanonicalId(name, "principal");
      return name as CanonicalId<"principal">;
    }
    const identity = this.#repository.identityFor(name);
    return createCanonicalId("principal", () => sha256Bytes(identity.publicKey));
  }

  private principalId(): CanonicalId<"principal"> {
    this.#principalId ??= createCanonicalId("principal", () => sha256Bytes(this.#repository.identityDocument().publicKey));
    return this.#principalId;
  }

  private repositoryId(): CanonicalId<"repo"> {
    if (this.#repositoryId !== undefined) return this.#repositoryId;
    const identity = this.#repository.events().find((event) => event.type === "repository.identity");
    this.#repositoryId = typeof identity?.payload.repositoryId === "string"
      ? identity.payload.repositoryId as CanonicalId<"repo">
      : createCanonicalId("repo", () => sha256Bytes(this.#repository.identityDocument().publicKey));
    return this.#repositoryId;
  }

  private requireExistingRevision(id: string): string {
    const event = this.#repository.events().find((item) => item.id === id);
    if (event === undefined) fail("not-found", `revision event not found: ${id}`);
    return assertRevisionId(event.id);
  }
}

/**
 * Index content for structural-path lookup, when a builtin syntax provider
 * covers the path. Unsupported types fall back to digest comparison rather than
 * pretending a structural path was verified.
 */
function indexContent(path: string, content: string): { readonly byPath: ReadonlyMap<string, unknown> } | undefined {
  const provider = selectBuiltinProvider({ path });
  if (provider === undefined) return undefined;
  try { return indexTree(provider.parse(content)); }
  catch { return undefined; }
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") fail("invalid-input", `${label} must be a non-empty string`);
  return value as string;
}

function sha256Hex(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function sha256Bytes(value: string): Uint8Array { return new Uint8Array(createHash("sha256").update(value).digest()); }
