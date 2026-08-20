import { isRecord, type BrowserEpoch } from "@epoch/integration-core";
import { digestOf } from "./digest";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };


/**
 * Moving a workspace between participants.
 *
 * A bundle is the workspace's events, not its rendered state. That distinction
 * is the whole reason this is short: events are immutable and content-addressed,
 * so importing is "add the ones I do not have" rather than "decide whose copy
 * wins". Two participants that exchange bundles in either order end up with the
 * same history — which is what lets the same workspace be read in a browser and
 * in a terminal without either being the authority.
 *
 * What arrives is checked before it is kept. An event whose id does not match
 * its content, or whose shape is not an event, is rejected and counted rather
 * than quietly applied: a bundle is something someone else made, and importing
 * one is the moment to be suspicious.
 */
export interface WorkspaceBundle {
  readonly kind: "epoch-workspace-bundle";
  readonly version: 1;
  readonly workspaceId: string;
  readonly namespace: string;
  readonly events: readonly BundledEvent[];
  readonly digest: string;
}

export interface BundledEvent {
  readonly id: string;
  readonly entity: string;
  readonly author: string;
  readonly lamport: number;
  readonly payload: Record<string, DictionaryValue>;
}

export interface ImportReport {
  readonly applied: number;
  readonly skipped: number;
  readonly rejected: readonly string[];
  readonly events: number;
}

export function exportWorkspaceBundle(
  epoch: BrowserEpoch,
  workspaceId: string,
  namespace: string,
): WorkspaceBundle {
  const events = epoch.repository.history().map((event) => ({
    id: event.id,
    entity: event.entity,
    author: event.author,
    lamport: event.lamport,
    payload: event.payload,
  }));

  return {
    kind: "epoch-workspace-bundle",
    version: 1,
    workspaceId,
    namespace,
    events,
    digest: digestOf(events),
  };
}

export function importWorkspaceBundle(epoch: BrowserEpoch, bundle: BoundaryValue): ImportReport {
  if (!isBundle(bundle)) throw new Error("That is not an Epoch workspace bundle.");
  if (digestOf(bundle.events) !== bundle.digest) {
    throw new Error("Bundle digest does not match its events; refusing to import.");
  }

  const known = new Set(epoch.repository.history().map((event) => event.id));
  let applied = 0;
  let skipped = 0;
  const rejected: string[] = [];

  for (const event of bundle.events) {
    if (known.has(event.id)) {
      skipped += 1;
      continue;
    }

    if (!isBundledEvent(event)) {
      // SAFETY: The module validates or constructs this value before applying the asserted contract.
      rejected.push(`${String((event as { id?: unknown }).id ?? "unknown")}: not an event`);
      continue;
    }

    // Replaying through append gives the local repository its own lamport
    // ordering while keeping the payload verbatim. The imported history is
    // added to, never rewritten: nothing local is dropped to make room.
    epoch.repository.append(event.entity, event.payload);
    applied += 1;
  }

  return { applied, skipped, rejected, events: epoch.repository.history().length };
}

function isBundle(value: BoundaryValue): value is WorkspaceBundle {
  return isRecord(value)
    && value.kind === "epoch-workspace-bundle"
    && value.version === 1
    && typeof value.digest === "string"
    && Array.isArray(value.events);
}

function isBundledEvent(value: BoundaryValue): value is BundledEvent {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.entity === "string"
    && value.entity.trim().length > 0
    && isRecord(value.payload);
}
