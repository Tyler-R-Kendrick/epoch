import type { EpochIntegrationStorage } from "@epoch/integration-core";
import { createCommunityCommandBus, type CommunityCommandBus, type EpochPolicySet } from "./commands";
import { createStaticHarnessRelease, type StaticHarnessRelease } from "./harness";
import type { EpochCommandReceipt, EpochCommandSource } from "./receipts";
import { createBrowserEpochWorkspace, type BrowserEpochWorkspace } from "./workspace";

/**
 * The composition root.
 *
 * Community Web, the prompt composer, the WebMCP adapter, the CLI, and the SDK
 * all take this one object. Anything that reaches around it to mutate the
 * repository directly is a second implementation of the product, which is how
 * the browser UI, the CLI, and the deployed board drifted apart in the first
 * place.
 */
export interface CreateCommunityRuntimeOptions {
  readonly namespace: string;
  readonly actor: string;
  readonly harness?: StaticHarnessRelease;
  readonly storage?: EpochIntegrationStorage;
  readonly policies?: EpochPolicySet;
  readonly defaultSource?: EpochCommandSource;
  /** Injected so receipts stay reproducible in tests and deterministic replays. */
  readonly now?: () => string;
}

export interface CommunityRuntime {
  readonly workspaceId: string;
  readonly actor: string;
  readonly harness: StaticHarnessRelease;
  readonly commands: CommunityCommandBus;
  readonly workspace: BrowserEpochWorkspace;
  subscribe(listener: (receipt: EpochCommandReceipt) => void): () => void;
}

const readOnlyPolicies: EpochPolicySet = { capabilities: ["workspace.read"] };

export function createCommunityRuntime(options: CreateCommunityRuntimeOptions): CommunityRuntime {
  const harness = options.harness ?? defaultCommunityHarness();
  const workspace = createBrowserEpochWorkspace({
    namespace: options.namespace,
    author: options.actor,
    harness,
    ...(options.storage === undefined ? {} : { storage: options.storage }),
  });

  const listeners = new Set<(receipt: EpochCommandReceipt) => void>();
  const commands = createCommunityCommandBus({
    workspace,
    policies: options.policies ?? readOnlyPolicies,
    defaultSource: options.defaultSource ?? "sdk",
    now: options.now ?? (() => new Date().toISOString()),
    onReceipt: (receipt) => {
      for (const listener of listeners) listener(receipt);
    },
  });

  return {
    workspaceId: workspace.id,
    actor: workspace.actor,
    harness,
    commands,
    workspace,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * The default harness ABI, modelled on the Community Web shell so the runtime is
 * usable before the board is migrated into the Community Web package. Slots are
 * semantic ("where activity goes"), never selectors, so a generated manifest
 * cannot address arbitrary DOM.
 */
export function defaultCommunityHarness(): StaticHarnessRelease {
  return createStaticHarnessRelease({
    abiVersion: 1,
    slots: [
      { id: "shell.primary-navigation", accepts: ["navigation"], maxComponents: 1 },
      { id: "shell.workspace-status", accepts: ["status"], maxComponents: 2 },
      { id: "board.thread-list", accepts: ["feed"], maxComponents: 1 },
      { id: "board.context-panel", accepts: ["panel", "status"], maxComponents: 3 },
      { id: "board.composer", accepts: ["composer"], maxComponents: 1 },
      { id: "board.recovery", accepts: ["recovery"], maxComponents: 1 },
    ],
    components: [
      { id: "PrimaryNav", category: "navigation", actions: ["view.switch"] },
      { id: "WorkspaceStatus", category: "status", actions: ["workspace.status", "change.show"] },
      { id: "VerificationSummary", category: "status", actions: ["workspace.verify", "change.show"] },
      { id: "ThreadList", category: "feed", actions: ["change.show"] },
      { id: "LiveActivity", category: "panel", actions: [] },
      { id: "TrendingTopics", category: "panel", actions: [] },
      { id: "Composer", category: "composer", actions: ["ui.propose"] },
      { id: "RecoveryControls", category: "recovery", actions: ["ui.restoreLastKnownGood", "ui.enterSafeMode"] },
    ],
    themeTokens: ["--density-row", "--accent", "--surface", "--text"],
    safeModeManifest: {
      abiVersion: 1,
      scope: "personal",
      placements: [
        { slot: "shell.primary-navigation", component: "PrimaryNav", action: "view.switch" },
        { slot: "shell.workspace-status", component: "WorkspaceStatus", action: "workspace.status" },
        { slot: "board.thread-list", component: "ThreadList" },
        { slot: "board.recovery", component: "RecoveryControls", action: "ui.restoreLastKnownGood" },
      ],
      theme: {},
    },
  });
}
