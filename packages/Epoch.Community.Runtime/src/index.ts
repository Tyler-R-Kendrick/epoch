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
export * from "./feeds";
export * from "./storage";
export * from "./identity";
export * from "./sync";
export * from "./commands";
export * from "./runtime";
export * from "./adapters/cli";
export * from "./adapters/webmcp";
export * from "./stream-policy";
export * from "./live/contracts";
export * from "./live/publication-policy";
export * from "./live/presentation-log";
export * from "./live/transport";
export * from "./live/commands";
export * from "./live/client";
export * from "./board-honesty";
export * from "./atproto-oauth";
