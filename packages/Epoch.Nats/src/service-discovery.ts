/**
 * Intra-community NATS service discovery (ADR-0055).
 *
 * Hosted/private may advertise Live / livestream / platform-event endpoints on
 * `epoch.svc.>`. Open posture treats relays as replaceable: discovery is denied.
 * Advertisements are admission hints, not identity (I-1). Never crosses operators (I-2).
 */

import { serviceAdvertiseSubject, serviceLookupSubject } from "./subjects";

export class ServiceDiscoveryDeniedError extends Error {
  readonly code = "svc_discovery_denied" as const;
  constructor(message = "NATS service discovery is denied for this posture") {
    super(message);
    this.name = "ServiceDiscoveryDeniedError";
  }
}

export type ServiceAdvertisement = {
  readonly name: string;
  readonly communityId: string;
  readonly endpoint: string;
  readonly sourceServer?: string;
  readonly expiresAt: number;
};

export type ServiceDirectorySnapshot = {
  readonly advertisements: readonly ServiceAdvertisement[];
};

export type CreateInMemoryServiceDirectoryOptions = {
  readonly allowServiceDiscovery: boolean;
  readonly communityId: string;
  readonly sourceServer?: string;
  readonly ttlMs?: number;
  readonly now?: () => number;
  readonly share?: ServiceDirectorySnapshot;
};

const DEFAULT_TTL_MS = 30_000;

export type EpochServiceDirectory = {
  advertise(input: {
    readonly name: string;
    readonly endpoint: string;
    readonly communityId?: string;
  }): ServiceAdvertisement;
  lookup(name: string): readonly ServiceAdvertisement[];
  exportSnapshot(): ServiceDirectorySnapshot;
  readonly subjects: {
    readonly advertise: string;
    lookup(name: string): string;
  };
};

export function createInMemoryServiceDirectory(
  options: CreateInMemoryServiceDirectoryOptions,
): EpochServiceDirectory {
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const communityId = options.communityId;
  const sourceServer = options.sourceServer;
  const advertisements = [...(options.share?.advertisements ?? [])];

  const requireDiscovery = (): void => {
    if (options.allowServiceDiscovery !== true) {
      throw new ServiceDiscoveryDeniedError();
    }
  };

  return {
    subjects: {
      advertise: serviceAdvertiseSubject(communityId),
      lookup: (name: string) => serviceLookupSubject(communityId, name),
    },
    advertise(input) {
      requireDiscovery();
      if (input.communityId !== undefined && input.communityId !== communityId) {
        throw new ServiceDiscoveryDeniedError("cross-community service advertise denied");
      }
      if (typeof input.name !== "string" || input.name.trim().length === 0) {
        throw new ServiceDiscoveryDeniedError("service name required");
      }
      if (typeof input.endpoint !== "string" || !input.endpoint.startsWith("epoch.")) {
        throw new ServiceDiscoveryDeniedError("service endpoint must be an epoch.* subject");
      }
      const advertisement: ServiceAdvertisement = {
        name: input.name,
        communityId,
        endpoint: input.endpoint,
        ...(sourceServer === undefined ? {} : { sourceServer }),
        expiresAt: now() + ttlMs,
      };
      advertisements.push(advertisement);
      return advertisement;
    },
    lookup(name) {
      requireDiscovery();
      const t = now();
      return advertisements.filter((item) =>
        item.name === name
        && item.communityId === communityId
        && item.expiresAt > t
        && (sourceServer === undefined || item.sourceServer === sourceServer)
      );
    },
    exportSnapshot() {
      return { advertisements: [...advertisements] };
    },
  };
}
