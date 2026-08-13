import { digestOf } from "./digest";
import type { DynamicUiManifest } from "./ui";

/**
 * The static harness.
 *
 * "Static" here means *immutable at runtime*, not unpatchable forever. A release
 * is an installed, content-addressed description of what the dynamic layer is
 * allowed to be: which slots exist, which components may fill them, which
 * actions those components may bind, and which theme tokens may be set. Shipping
 * a new release is a deliberate, separately authorized act; a prompt, a
 * generated manifest, or an agent tool call can never produce one.
 *
 * Everything the recovery path needs — the safe-mode manifest included — lives
 * in the release, so a workspace whose dynamic head is corrupt can still boot
 * into something the user can read and act on.
 */
export interface StaticHarnessSlot {
  readonly id: string;
  readonly accepts: readonly string[];
  readonly maxComponents: number;
}

export interface StaticHarnessComponent {
  readonly id: string;
  readonly category: string;
  readonly actions: readonly string[];
}

export interface StaticHarnessRelease {
  readonly releaseId: string;
  readonly abiVersion: number;
  readonly slots: readonly StaticHarnessSlot[];
  readonly components: readonly StaticHarnessComponent[];
  readonly themeTokens: readonly string[];
  readonly safeModeManifest: DynamicUiManifest;
  /**
   * Content digest of the release body. It proves the installed harness is the
   * one that was built, not that a trusted party signed it — this is drift
   * detection, and the runtime never describes it as a signature.
   */
  readonly digest: string;
}

export interface StaticHarnessReleaseInput {
  readonly abiVersion: number;
  readonly slots: readonly StaticHarnessSlot[];
  readonly components: readonly StaticHarnessComponent[];
  readonly themeTokens: readonly string[];
  readonly safeModeManifest: DynamicUiManifest;
}

export function createStaticHarnessRelease(input: StaticHarnessReleaseInput): StaticHarnessRelease {
  if (input.slots.length === 0) throw new Error("A static harness release requires at least one slot.");
  if (input.components.length === 0) throw new Error("A static harness release requires at least one component.");

  const body = {
    abiVersion: input.abiVersion,
    slots: input.slots,
    components: input.components,
    themeTokens: input.themeTokens,
    safeModeManifest: input.safeModeManifest,
  };

  return {
    ...body,
    releaseId: `harness_${digestOf(body)}`,
    digest: digestOf(body),
  };
}

/** Recompute the digest so a tampered or half-upgraded harness fails at boot. */
export function verifyStaticHarnessRelease(release: StaticHarnessRelease): boolean {
  return digestOf({
    abiVersion: release.abiVersion,
    slots: release.slots,
    components: release.components,
    themeTokens: release.themeTokens,
    safeModeManifest: release.safeModeManifest,
  }) === release.digest;
}

export function findSlot(release: StaticHarnessRelease, slotId: string): StaticHarnessSlot | undefined {
  return release.slots.find((slot) => slot.id === slotId);
}

export function findComponent(
  release: StaticHarnessRelease,
  componentId: string,
): StaticHarnessComponent | undefined {
  return release.components.find((component) => component.id === componentId);
}
