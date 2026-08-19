/**
 * @epoch/nats — Epoch realtime fabric over NATS (ADR-0054).
 *
 * Host nats-server (JetStream + WebSocket) + Epoch auth callout.
 * Browsers use nats.ws; this package owns subjects, streams, callout logic,
 * and an injectable connection seam for tests without a live broker.
 */

export {
  EPOCH_NATS_STREAMS,
  EPOCH_NATS_SUBJECTS,
  communityLivestreamSubject,
  livePresenceSubject,
  liveSyncSubject,
  platformEventsSubject,
  serviceAdvertiseSubject,
  serviceLookupSubject,
  type EpochNatsStreamName,
} from "./subjects";

export {
  createAuthCalloutHandler,
  evaluateAuthCallout,
  fixtureTokenValidator,
  type AuthCalloutDecision,
  type AuthCalloutHandler,
  type AuthCalloutRequest,
  type AuthCalloutResponse,
  type AuthCalloutValidator,
  type EpochNatsPermissions,
} from "./auth-callout";

export { permissionsForScopes, type PermissionsForScopesOptions } from "./acl";

export {
  HIGH_STAKES_SCOPES,
  requiresBinding,
  type FabricAdmission,
  type FabricValidator,
} from "./admission";

export {
  generateIssuerKey,
  issueUserJwt,
  verifyUserJwt,
  createJwtFabricValidator,
  type IssuedFabricJwt,
  type NkeyPair,
} from "./jwt-issuance";

export { createConnectionFencer, type TrackedConnection } from "./revoke-fence";

export {
  createPlatformAuthValidator,
  type FabricCredential,
  type FabricCredentialVerifier,
} from "./platform-validator";

export {
  AUTH_CALLOUT_SUBJECT,
  attachAuthCalloutService,
  type AttachAuthCalloutServiceOptions,
} from "./callout-service";

export {
  MemoryJetStream,
  type JetStreamAppendResult,
  type JetStreamEntry,
  type JetStreamReadOptions,
} from "./jetstream-memory";

export {
  connectGatedNatsBus,
  createInMemoryNatsBus,
  createNatsLiveChannel,
  type InMemoryNatsBus,
  type NatsConnectionLike,
  type NatsMsgLike,
  type NatsSubscriptionLike,
} from "./connection";

export {
  openAuthenticatedNatsLiveChannel,
  type LiveChannelLike,
  type OpenAuthenticatedNatsLiveChannelInput,
  type OpenAuthenticatedNatsLiveChannelResult,
} from "./live-auth";

export { NATS_SERVER_CONF_TEMPLATE } from "./nats-conf";

export {
  EPOCH_STREAM_SPECS,
  createMemoryEpochStreams,
  type EpochStreamSpec,
} from "./streams";

export {
  ServiceDiscoveryDeniedError,
  createInMemoryServiceDirectory,
  type CreateInMemoryServiceDirectoryOptions,
  type EpochServiceDirectory,
  type ServiceAdvertisement,
  type ServiceDirectorySnapshot,
} from "./service-discovery";
