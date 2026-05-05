import { fileURLToPath } from "node:url";
import { EpochRepository, SyncResult } from "../core";
import { Schemas } from "../domain";
import type { IdentityData } from "../domain";
import { createCompact, latestCompact, restoreCompactData, verifyCompact } from "./compact";

export interface SeedNode {
  peerId: string;
  multiaddr: string;
  trustLevel: "full" | "partial";
}

export interface SeedNodeServiceOptions {
  keepCompacts?: number;
}

export async function bootstrapFromSeed(repository: EpochRepository, seed: SeedNode): Promise<SyncResult> {
  repository.init();
  const seedRepository = repositoryForSeed(seed);
  let seedIdentity: IdentityData;
  try {
    seedIdentity = seedRepository.identityDocument();
  } catch (error) {
    throw new Error(`seed ${seed.peerId} at ${seed.multiaddr}: identity not found or invalid (${error instanceof Error ? error.message : String(error)})`, { cause: error });
  }
  if (seed.peerId !== seedIdentity.author) throw new Error(`seed ${seed.peerId} at ${seed.multiaddr}: identity mismatch`);
  if (seed.trustLevel === "full") {
    const compact = latestCompact(seedRepository);
    if (compact !== undefined) {
      verifyCompact(compact);
      if (compact.signerPublicKey !== seedIdentity.publicKey) throw new Error(`seed ${seed.peerId} at ${seed.multiaddr}: compact signer does not match seed identity`);
      restoreCompactData(repository, compact, true);
    }
  }
  return Schemas.syncResult.parse(repository.syncFrom(seedRepository.root));
}

export async function bootstrapFromSeeds(repository: EpochRepository, seeds: readonly SeedNode[]): Promise<SyncResult> {
  const errors: string[] = [];
  for (const seed of seeds) {
    try {
      return await bootstrapFromSeed(repository, seed);
    } catch (error) {
      errors.push(`${seed.peerId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`all seed bootstraps failed: ${errors.join("; ")}`);
}

export class SeedNodeService {
  readonly repository: EpochRepository;

  constructor(root: string, readonly options: SeedNodeServiceOptions = {}) {
    this.repository = new EpochRepository(root);
  }

  start(author?: string): void {
    this.repository.init(author);
  }

  createCompact(): string {
    return createCompact(this.repository).id;
  }

  bootstrapPeer(peerRoot: string, trustLevel: SeedNode["trustLevel"] = "full"): Promise<SyncResult> {
    return bootstrapFromSeed(new EpochRepository(peerRoot), {
      peerId: this.repository.identity(),
      multiaddr: this.repository.root,
      trustLevel,
    });
  }
}

function repositoryForSeed(seed: SeedNode): EpochRepository {
  const root = seed.multiaddr.startsWith("file://") ? fileURLToPath(seed.multiaddr) : seed.multiaddr;
  return new EpochRepository(root);
}
