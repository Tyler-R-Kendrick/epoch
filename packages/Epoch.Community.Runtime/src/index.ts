/**
 * Epoch Community runtime — the shared application layer.
 *
 * One command bus, one receipt schema, one browser Epoch workspace, consumed by
 * the web UI, the prompt composer, WebMCP, the CLI, and the SDK. Adapters live
 * under `adapters/`; none of them are allowed to reach past the bus to mutate
 * the repository directly.
 */
export type { EpochIntegrationStorage } from "@epoch/integration-core";
export * from "./digest";
export * from "./receipts";
export * from "./harness";
export * from "./ui";
export * from "./workspace";
export * from "./projects";
export * from "./commands";
export * from "./runtime";
export * from "./adapters/cli";
export * from "./adapters/webmcp";
