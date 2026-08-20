/**
 * Register the OpenZL host codec with an Epoch capability registry (ADR-0037/0053).
 * Duck-typed so `@epoch/openzl` does not hard-require `@epoch/extensions` at runtime.
 */
import { openZlHostCodec, OPENZL_CODEC_ID } from "./codec-core";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;


export interface CapabilityRegistryLike {
  register(provider: {
    readonly id: string;
    readonly capability: "codec" | "compression";
    readonly version: string;
    readonly source: "builtin" | "extension";
    readonly determinism: "deterministic" | "advisory";
    readonly match?: { readonly wildcard?: boolean };
    readonly value: unknown;
  }): BoundaryValue;
}

export function registerOpenZlCodec(registry: CapabilityRegistryLike): void {
  registry.register({
    id: "epoch.openzl.host",
    capability: "codec",
    version: "0.1.0",
    source: "builtin",
    determinism: "deterministic",
    match: { wildcard: true },
    value: openZlHostCodec,
  });
  registry.register({
    id: "epoch.openzl.compression",
    capability: "compression",
    version: "0.1.0",
    source: "builtin",
    determinism: "deterministic",
    match: { wildcard: true },
    value: { codecId: OPENZL_CODEC_ID, codec: openZlHostCodec },
  });
}
