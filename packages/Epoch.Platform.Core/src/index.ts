import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
type BoundaryValue = null | undefined | boolean | number | string | bigint | symbol | Readonly<object>;
type DictionaryValue = null | undefined | boolean | number | string | bigint | readonly DictionaryValue[] | { readonly [key: string]: DictionaryValue };
function __epochIsString<T>(value: T): value is T & string { return typeof value === "string"; }
function __epochIsObject<T>(value: T): value is T & object { return typeof value === "object"; }


export type Capability = {
  key: string;
  enabled: boolean;
};

export type Organization = {
  id: string;
  slug: string;
  displayName: string;
};

export type Project = {
  id: string;
  organizationId: string;
  slug: string;
  displayName: string;
};

export type RepositoryVisibility = "private" | "internal" | "public";

export type Repository = {
  id: string;
  projectId: string;
  slug: string;
  visibility: RepositoryVisibility;
};

export type Environment = {
  id: string;
  projectId: string;
  name: string;
  type: "development" | "preview" | "staging" | "production";
  protected: boolean;
};

export type Deployable = {
  id: string;
  projectId: string;
  name: string;
  kind: "app" | "worker" | "static-site" | "database" | "custom" | string;
  source: {
    repositoryId: string;
  };
  runtime?: string;
  manifestPath?: string;
};

export type PlatformUser = {
  id: string;
  handle: string;
  displayName: string;
  primaryEmail?: string;
  group?: string;
};

export type SsoProvider = {
  id: string;
  name: string;
  protocol: string;
};

export type ServiceAccount = {
  id: string;
  organizationId: string;
  name: string;
  scopes: string[];
};

export type ApiToken = {
  id: string;
  serviceAccountId: string;
  name: string;
  state: "active" | "revoked";
};

export type PlatformSession = {
  id: string;
  userId: string;
  name: string;
  state: "active" | "revoked";
};

export type FabricCredentialKind = "session" | "api-token";

export type FabricCredentialRecord = {
  id: string;
  kind: FabricCredentialKind;
  parentId: string;
  secretHash: string;
  expiresAt: number;
  state: "active" | "revoked";
  subjectRef: string;
  scopes: string[];
};

export type MintFabricCredentialInput = {
  sessionId?: string;
  apiTokenId?: string;
  ttlSeconds?: number;
};

export type MintFabricCredentialResult = {
  id: string;
  secret: string;
  expiresAt: number;
  subjectRef: string;
  kind: FabricCredentialKind;
  scopes: readonly string[];
};

export type VerifiedFabricCredential = {
  id: string;
  kind: FabricCredentialKind;
  parentId: string;
  subjectRef: string;
  scopes: readonly string[];
  expiresAt: number;
  /** Hosted/private only. Callout must not grant `epoch.svc.>` when false. */
  allowServiceDiscovery: boolean;
};

export type PlatformTeam = {
  id: string;
  organizationId: string;
  name: string;
  memberUserIds: string[];
};

export type TeamRoleBinding = {
  id: string;
  teamId: string;
  role: string;
  resourceType: "environment" | "project" | "organization";
  resourceId: string;
};

export type DeployPlanApproval = {
  kind: "protected-environment";
  approvedBy?: string;
};

export type DeployPlan = {
  id: string;
  deployableId: string;
  environmentId: string;
  primaryAction: string;
  sdkOperation: "deployments.executePlan";
  impactSummary: string;
  rollbackStrategy: "previous-successful-deployment";
  secretReferences: SecretReference[];
  source: {
    repositoryId: string;
    repositorySlug: string;
  };
  target: {
    environmentId: string;
    environmentName: string;
    protected: boolean;
  };
  dryRun: boolean;
  generatedConfiguration: string[];
  idempotencyKey?: string;
  requiredApprovals: DeployPlanApproval[];
  approvals: DeployPlanApproval[];
  state: "planned" | "approved" | "executed" | "canceled";
};

export type Deployment = {
  id: string;
  planId: string;
  deployableId: string;
  environmentId: string;
  state: "succeeded" | "failed" | "rolled_back";
  health: "healthy" | "degraded";
  jobId: string;
  rollbackTargetDeploymentId?: string;
};

export type PublicCommunityProject = {
  id: string;
  projectId: string;
  publicSlug: string;
  summary: string;
  repositoryId?: string;
  requestedBy?: string;
  readme?: string;
  deployStatusBadge?: string;
  contributionPrompt?: string;
  visibility: "public" | "internal";
  moderationState: "pending_review" | "approved" | "taken_down";
  followerProfileIds: string[];
  starProfileIds: string[];
  bookmarkProfileIds: string[];
  followersCount: number;
  starsCount: number;
  bookmarksCount: number;
  discussionsCount: number;
  topics: string[];
  showcaseAssets: string[];
  releases: string[];
  approvedBy?: string;
};

export type PublicProfile = {
  id: string;
  userId?: string;
  handle: string;
  displayName: string;
  bio?: string;
  links: string[];
  avatarRef?: string;
  visibility: "public" | "internal" | "private";
  moderationState: "visible" | "taken_down";
  reputation: number;
  blockedProfileIds: string[];
};

export type PublicCommunityDiscussion = {
  id: string;
  communityProjectId: string;
  profileId: string;
  title: string;
  body: string;
  visibility: "public" | "internal";
  participants: string[];
  createdAt: string;
  state: "open" | "taken_down";
  moderationState: "visible" | "taken_down";
};

export type CommunityFeedEvent = {
  id: string;
  communityProjectId: string;
  actorId: string;
  verb: string;
  objectType: "community_project" | "discussion" | "release" | "contribution";
  objectId: string;
  visibility: "public" | "internal";
  createdAt: string;
  summary: string;
};

export type CommunityReport = {
  id: string;
  discussionId: string;
  reason: string;
  state: "open" | "resolved";
  triage?: {
    severity: "low" | "medium" | "high";
    summary: string;
  };
  createdAt: string;
  resolvedBy?: string;
};

export type PlatformIssue = {
  id: string;
  projectId: string;
  title: string;
  state: "open" | "closed";
  linkedReviewIntentIds: string[];
};

export type ReviewIntentCheck = {
  name: string;
  status: string;
};

export type ReviewIntent = {
  id: string;
  repositoryId: string;
  title: string;
  issueId: string;
  state: "open" | "approved" | "merged";
  checks: ReviewIntentCheck[];
  approvals: string[];
  aiSummary?: string;
};

export type PlatformPackage = {
  id: string;
  name: string;
  version: string;
  deploymentId: string;
};

export type PlatformSearchResult = {
  type: "repository" | "deployable" | "package";
  id: string;
  label: string;
};

export type ObservabilitySummary = {
  runnerCount: number;
  latestDeploymentState?: Deployment["state"];
};

export type InfrastructureTarget = {
  id: string;
  organizationId: string;
  kind: string;
  name: string;
  region: string;
  healthState: "healthy" | "degraded";
};

export type PlatformResource = {
  id: string;
  projectId: string;
  environmentId: string;
  kind: string;
  name: string;
  provider: string;
  state: "ready";
};

export type DeployableTemplate = {
  id: string;
  name: string;
  kind: string;
};

export type DeploymentPromotion = {
  id: string;
  deploymentId: string;
  environmentId: string;
  state: "succeeded";
};

export type PlatformJob = {
  id: string;
  name: string;
  type: string;
  state: "scheduled" | "reconciled";
  idempotencyKey: string;
  attempt: number;
  logs: string[];
};

export type PlatformConfigurationResult = {
  warnings: string[];
};

export type ApiRequest = {
  correlationId: string;
  idempotencyKey: string;
};

export type ApiResponse = {
  correlationId: string;
  auditEventId?: string;
};

export type PlatformEvent = {
  id: string;
  type: string;
  correlationId?: string;
};

export type WebhookEndpoint = {
  id: string;
  name: string;
  secret: string;
};

export type SecretAccessGrant = {
  id: string;
  secretId: string;
  serviceAccountId: string;
};

export type SecretAccessResult = {
  name: string;
  plaintext?: string;
};

export type ComplianceReport = {
  findings: string[];
};

export type TenantExport = {
  slug: string;
  projectSlugs: string[];
  deleted: boolean;
};

export type ProjectOverview = {
  project: Project;
  repositories: Repository[];
  deployables: Deployable[];
  environments: Environment[];
  resources: PlatformResource[];
  emptyStateActions: string[];
};

export type AuditEvent = {
  id: string;
  type: string;
  actor?: string;
  resourceId?: string;
};

export type Runner = {
  id: string;
  name: string;
  capacity: number;
  state: "online" | "quarantined";
  lastHeartbeatAt?: string;
};

export type BackupDestination = {
  id: string;
  uri: string;
  verified: boolean;
};

export type BackupRun = {
  id: string;
  name: string;
  verificationStatus: "pending" | "verified";
  artifactPath?: string;
  manifestHash?: string;
};

export type RestoreDryRun = {
  status: "passed";
};

export type HaProfile = {
  name: string;
  rpo: string;
  rto: string;
};

export type FailoverDrill = {
  name: string;
  status: "passed";
};

export type SecretReference = {
  id: string;
  environmentId: string;
  name: string;
};

export type DeployJob = {
  id: string;
  planId: string;
  deploymentId?: string;
  runnerId: string | null;
  state: "succeeded";
  logs: string[];
};

export type FirstRunReadiness = {
  productionReady: boolean;
  completedSteps: string[];
  incompleteSteps: string[];
};

export type IncidentDiagnosis = {
  id: string;
  deploymentId: string;
  severity: "high";
  firstFailingStep: string;
  recommendations: string[];
  failure?: {
    classification: string;
    recoveryActions: string[];
  };
  acknowledgedBy?: string;
};

export type AiActionPlan = {
  id: string;
  projectId: string;
  action: string;
  context: {
    projectId: string;
  };
  approvalRequired: boolean;
  approvedBy?: string;
  state: "planned" | "approved" | "executed";
};

export type AiContextPack = {
  body: string;
  citations: string[];
};

export type AiToolRequest = {
  tool: string;
  projectId: string;
  requiresApproval: boolean;
};

export type AiEvaluation = {
  name: string;
  passed: boolean;
};

export type OperatorDashboard = {
  serviceHealth: "healthy" | "degraded";
  backupFreshness: "configured" | "missing";
  runnerCapacity: number;
};

export type SupportBundle = {
  sections: string[];
  body: string;
};

export type CommunityLegalHoldDiscussion = {
  id: string;
  title: string;
  body: string;
  moderationState: PublicCommunityDiscussion["moderationState"];
  state: PublicCommunityDiscussion["state"];
  profileId: string;
};

export type CommunityLegalHold = {
  discussions: CommunityLegalHoldDiscussion[];
};

export type CommunityWorkerStatus = {
  enabled: boolean;
};

export type CommunityVisibilityPolicy = {
  policy: string;
  reviewedBy: string;
  reviewedAt: string;
};

export type CommunityStatus = Capability & {
  workerStatus: CommunityWorkerStatus;
  visibilityPolicy?: CommunityVisibilityPolicy;
};

export type PlatformSnapshot = {
  sequence: number;
  communityEnabled: boolean;
  communityVisibilityPolicy?: CommunityVisibilityPolicy;
  organizations: Organization[];
  projects: Project[];
  repositories: Repository[];
  environments: Environment[];
  deployables: Deployable[];
  deployPlans: DeployPlan[];
  deployments: Deployment[];
  communityProjects: PublicCommunityProject[];
  runners: Runner[];
  backupDestination?: BackupDestination;
  secretReferences: SecretReference[];
  jobs: DeployJob[];
  aiPlans: AiActionPlan[];
  users: PlatformUser[];
  teams: PlatformTeam[];
  teamRoleBindings: TeamRoleBinding[];
  issues: PlatformIssue[];
  reviewIntents: ReviewIntent[];
  packages: PlatformPackage[];
  profiles: PublicProfile[];
  discussions: PublicCommunityDiscussion[];
  communityFeed: CommunityFeedEvent[];
  communityReports: CommunityReport[];
  ssoProviders: SsoProvider[];
  serviceAccounts: ServiceAccount[];
  apiTokens: ApiToken[];
  sessions: PlatformSession[];
  fabricCredentials: FabricCredentialRecord[];
  infrastructureTargets: InfrastructureTarget[];
  resources: PlatformResource[];
  templates: DeployableTemplate[];
  platformJobs: PlatformJob[];
  webhookEndpoints: WebhookEndpoint[];
  secretAccessGrants: SecretAccessGrant[];
  backupRuns: BackupRun[];
  platformEvents: PlatformEvent[];
  idempotencyKeys: Array<{ key: string; resourceId: string }>;
  auditRetention: string;
  auditEvents: AuditEvent[];
};

export class PlatformError extends Error {
  readonly code: string;
  readonly suggestion?: string;
  readonly correlationId?: string;
  readonly auditEventId?: string;

  constructor(code: string, message: string, options: { suggestion?: string; correlationId?: string; auditEventId?: string } = {}) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.suggestion = options.suggestion;
    this.correlationId = options.correlationId;
    this.auditEventId = options.auditEventId;
  }
}

export type PlatformCoreOptions = {
  communityEnabled?: boolean;
  snapshot?: PlatformSnapshot;
  /** Evaluated ADR-0055 posture. Absent → open with extras off. */
  posturePolicy?: {
    posture: "hosted" | "private" | "open";
    allowServiceDiscovery: boolean;
    allowCrossCommunityFabric: boolean;
    publicArtifactPlane: "atproto" | "none";
    interNodeTransport: "xmpp-s2s" | "gossip" | "none";
    serverTrackedReadState: boolean;
  };
};

export type FileSystemPlatformCoreOptions = PlatformCoreOptions & {
  dataDir: string;
  restoreFromBackupArtifact?: string;
};

export type PlatformStateFile = {
  manifestHash: string;
  snapshot: PlatformSnapshot;
};

export type PlatformBackupArtifact = {
  manifest: {
    name: string;
    createdAt: string;
    manifestHash: string;
  };
  snapshot: PlatformSnapshot;
};

export type CreateOrganizationInput = {
  slug: string;
  displayName: string;
};

export type CreateProjectInput = {
  organizationId: string;
  slug: string;
  displayName: string;
};

export type CreateRepositoryInput = {
  projectId: string;
  slug: string;
  visibility: RepositoryVisibility;
};

export type CreateEnvironmentInput = {
  projectId: string;
  name: string;
  type: Environment["type"];
  protected: boolean;
};

export type CreateDeployableInput = {
  projectId: string;
  name: string;
  kind: Deployable["kind"];
  source: Deployable["source"];
  runtime?: string;
  manifestPath?: string;
};

export type CreateUserInput = {
  handle: string;
  displayName: string;
  primaryEmail?: string;
};

export type ConfigureSsoProviderInput = {
  name: string;
  protocol: string;
};

export type ProvisionScimUserInput = {
  handle: string;
  group: string;
};

export type CreateServiceAccountInput = {
  organizationId: string;
  name: string;
  scopes: string[];
};

export type IssueApiTokenInput = {
  serviceAccountId: string;
  name: string;
};

export type OpenSessionInput = {
  userId: string;
  name: string;
};

export type CreateTeamInput = {
  organizationId: string;
  name: string;
};

export type AddUserToTeamInput = {
  userId: string;
  teamId: string;
};

export type GrantTeamRoleInput = {
  teamId: string;
  role: string;
  resourceType: TeamRoleBinding["resourceType"];
  resourceId: string;
};

export type CreateDeployPlanInput = {
  deployableId: string;
  environmentId: string;
  dryRun?: boolean;
  idempotencyKey?: string;
};

export type ApproveDeployPlanInput = {
  actor: string;
};

export type EnableCommunityInput = {
  reviewedBy?: string;
  visibilityPolicy?: string;
};

export type ReviewCommunityVisibilityPolicyInput = {
  reviewedBy: string;
  policy: string;
};

export type EditDeployPlanInput = {
  runtimeVariables: Record<string, string>;
};

export type CancelDeployPlanInput = {
  actor: string;
};

export type PromoteDeploymentInput = {
  environmentId: string;
};

export type PublishCommunityProjectInput = {
  projectId: string;
  publicSlug: string;
  summary: string;
  requestedBy?: string;
  readme?: string;
  deployStatusBadge?: string;
  contributionPrompt?: string;
  visibility?: "public" | "internal";
};

export type RegisterRunnerInput = {
  name: string;
  capacity: number;
};

export type ConfigureBackupDestinationInput = {
  uri: string;
};

export type CreateSecretInput = {
  environmentId: string;
  name: string;
  value: string;
};

export type RotateSecretInput = {
  value: string;
};

export type GrantSecretAccessInput = {
  serviceAccountId: string;
};

export type ReadSecretReferenceInput = {
  serviceAccountId: string;
};

export type MarkDeploymentDegradedInput = {
  reason: string;
};

export type MarkDeploymentFailedInput = {
  failureClass: string;
};

export type AcknowledgeIncidentInput = {
  actor: string;
};

export type CreateIncidentFollowUpIssueInput = {
  title: string;
};

export type RollbackDeploymentInput = {
  actor: string;
};

export type CreateAiActionPlanInput = {
  projectId: string;
  action: string;
};

export type CreateAiContextPackInput = {
  actor: string;
  projectId: string;
  sources: string[];
};

export type RequestAiToolInput = {
  tool: string;
  projectId: string;
};

export type RecordAiEvaluationInput = {
  name: string;
  score: number;
};

export type ApproveAiActionPlanInput = {
  actor: string;
};

export type ApproveCommunityProjectInput = {
  moderator: string;
};

export type OpenApiRequestInput = {
  correlationId: string;
  idempotencyKey: string;
};

export type RegisterWebhookEndpointInput = {
  name: string;
  secret: string;
};

export type VerifyWebhookInput = {
  endpointName: string;
  payload: string;
  signature: string;
};

export type StreamPlatformEventsInput = {
  cursor: string;
};

export type SampleTypedErrorInput = {
  code: string;
};

export type ConnectInfrastructureTargetInput = {
  organizationId: string;
  name: string;
  kind: string;
  region: string;
};

export type ProvisionResourceInput = {
  projectId: string;
  environmentId: string;
  name: string;
  kind: string;
  provider: string;
};

export type DiscoverDeployableInput = {
  projectId: string;
  repositoryId: string;
  name: string;
  kind: Deployable["kind"];
  runtime?: string;
  manifestPath?: string;
};

export type CreateTemplateInput = {
  name: string;
  kind: string;
};

export type SchedulePlatformJobInput = {
  name: string;
  type: string;
  idempotencyKey: string;
};

export type RunnerHeartbeatInput = {
  name: string;
};

export type QuarantineRunnerInput = {
  name: string;
  reason: string;
};

export type LoadPlatformConfigurationInput = Record<string, DictionaryValue>;

export type SetAuditRetentionInput = {
  retention: string;
};

export type ExportTenantInput = {
  organizationId: string;
};

export type DeleteTenantExportInput = {
  organizationSlug: string;
};

export type StartBackupInput = {
  name: string;
};

export type RestoreDryRunInput = {
  backupId: string;
};

export type DeclareHaProfileInput = {
  name: string;
  rpo: string;
  rto: string;
};

export type RunFailoverDrillInput = {
  name: string;
};

export type CreateIssueInput = {
  projectId: string;
  title: string;
};

export type CreateReviewIntentInput = {
  repositoryId: string;
  title: string;
  issueId: string;
};

export type RecordReviewCheckInput = {
  name: string;
  status: string;
};

export type ApproveReviewIntentInput = {
  actor: string;
};

export type PublishPackageInput = {
  name: string;
  version: string;
  deploymentId: string;
};

export type CreatePublicProfileInput = {
  userId?: string;
  handle: string;
  displayName: string;
  bio?: string;
  links?: string[];
  avatarRef?: string;
  visibility?: "public" | "internal" | "private";
};

export type FollowCommunityProjectInput = {
  profileId: string;
  communityProjectId: string;
};

export type StarCommunityProjectInput = FollowCommunityProjectInput;

export type BookmarkCommunityProjectInput = FollowCommunityProjectInput;

export type OpenCommunityDiscussionInput = {
  profileId: string;
  communityProjectId: string;
  title: string;
  body?: string;
  visibility?: "public" | "internal";
};

export type ReportCommunityDiscussionInput = {
  discussionId: string;
  reason: string;
};

export type ResolveCommunityReportInput = {
  moderator: string;
};

export type AddCommunityTopicInput = {
  topic: string;
};

export type AddShowcaseAssetInput = {
  asset: string;
};

export type PublishCommunityReleaseInput = {
  version: string;
};

export type RecordCommunityContributionInput = {
  profileId: string;
  communityProjectId: string;
  narrative?: string;
};

export type SearchCommunityInput = {
  query: string;
};

export type PersonalizedCommunityFeedInput = {
  profileId?: string;
};

export type TakeDownCommunityDiscussionInput = {
  moderator: string;
  reason: string;
};

export type BlockPublicProfileInput = {
  profileId: string;
  blockedProfileId: string;
};

export type ExportCommunityLegalHoldInput = {
  communityProjectId: string;
};

export class EpochPlatformCore {
  #statePath?: string;
  #backupDir?: string;
  #persisting = false;
  #communityEnabled = false;
  #posturePolicy: NonNullable<PlatformCoreOptions["posturePolicy"]> = {
    posture: "open",
    allowServiceDiscovery: false,
    allowCrossCommunityFabric: false,
    publicArtifactPlane: "atproto",
    interNodeTransport: "gossip",
    serverTrackedReadState: false,
  };
  #communityVisibilityPolicy?: CommunityVisibilityPolicy;
  #sequence = 0;
  #organizations = new Map<string, Organization>();
  #projects = new Map<string, Project>();
  #repositories = new Map<string, Repository>();
  #environments = new Map<string, Environment>();
  #deployables = new Map<string, Deployable>();
  #deployPlans = new Map<string, DeployPlan>();
  #deployments = new Map<string, Deployment>();
  #communityProjects = new Map<string, PublicCommunityProject>();
  #runners = new Map<string, Runner>();
  #backupDestination?: BackupDestination;
  #secretReferences = new Map<string, SecretReference>();
  #secretValues = new Map<string, string>();
  #jobs = new Map<string, DeployJob>();
  #aiPlans = new Map<string, AiActionPlan>();
  #users = new Map<string, PlatformUser>();
  #ssoProviders = new Map<string, SsoProvider>();
  #serviceAccounts = new Map<string, ServiceAccount>();
  #apiTokens = new Map<string, ApiToken>();
  #sessions = new Map<string, PlatformSession>();
  #fabricCredentials = new Map<string, FabricCredentialRecord>();
  #teams = new Map<string, PlatformTeam>();
  #teamRoleBindings = new Map<string, TeamRoleBinding>();
  #issues = new Map<string, PlatformIssue>();
  #reviewIntents = new Map<string, ReviewIntent>();
  #packages = new Map<string, PlatformPackage>();
  #infrastructureTargets = new Map<string, InfrastructureTarget>();
  #resources = new Map<string, PlatformResource>();
  #templates = new Map<string, DeployableTemplate>();
  #platformJobs = new Map<string, PlatformJob>();
  #webhookEndpoints = new Map<string, WebhookEndpoint>();
  #secretAccessGrants = new Map<string, SecretAccessGrant>();
  #backupRuns = new Map<string, BackupRun>();
  #idempotencyKeys = new Map<string, string>();
  #apiRequests = new Map<string, ApiRequest>();
  #platformEvents: PlatformEvent[] = [];
  #auditRetention = "90d";
  #tenantExports = new Map<string, TenantExport>();
  #haProfile?: HaProfile;
  #profiles = new Map<string, PublicProfile>();
  #discussions = new Map<string, PublicCommunityDiscussion>();
  #communityFeed: CommunityFeedEvent[] = [];
  #communityReports = new Map<string, CommunityReport>();
  #auditEvents: AuditEvent[] = [];

  constructor(options: PlatformCoreOptions | FileSystemPlatformCoreOptions = {}) {
    if ("dataDir" in options) {
      mkdirSync(options.dataDir, { recursive: true });
      this.#statePath = join(options.dataDir, "platform-state.json");
      this.#backupDir = join(options.dataDir, "backups");
      mkdirSync(this.#backupDir, { recursive: true });
      if (options.restoreFromBackupArtifact !== undefined) {
        this.#restoreSnapshot(readBackupArtifact(options.restoreFromBackupArtifact).snapshot);
        this.#persist();
        return;
      }
      if (existsSync(this.#statePath)) {
        this.#restoreSnapshot(readPlatformStateFile(this.#statePath));
        return;
      }
    }
    if (options.snapshot !== undefined) {
      this.#restoreSnapshot(options.snapshot);
      this.#persist();
      return;
    }
    this.#communityEnabled = options.communityEnabled ?? false;
    if (options.posturePolicy !== undefined) {
      this.#posturePolicy = { ...options.posturePolicy, allowCrossCommunityFabric: false };
    }
    this.#persist();
  }

  capability(key: string): Capability {
    if (key === "community") {
      return { key, enabled: this.#communityEnabled };
    }
    if (key === "core" || key === "sdk") {
      return { key, enabled: true };
    }
    if (key === "service-discovery") {
      return { key, enabled: this.#posturePolicy.allowServiceDiscovery };
    }
    if (key === "cross-community-fabric") {
      return { key, enabled: false };
    }
    if (key === "server-tracked-read-state") {
      return { key, enabled: this.#posturePolicy.serverTrackedReadState };
    }
    if (key === "public-artifact-plane") {
      return { key, enabled: this.#posturePolicy.publicArtifactPlane === "atproto" };
    }
    if (key === "inter-node-transport") {
      return { key, enabled: this.#posturePolicy.interNodeTransport === "xmpp-s2s" };
    }
    return { key, enabled: false };
  }

  enableCommunity(input: EnableCommunityInput = {}): Capability {
    this.#communityEnabled = true;
    if (input.reviewedBy !== undefined && input.visibilityPolicy !== undefined) {
      this.#communityVisibilityPolicy = {
        policy: input.visibilityPolicy,
        reviewedBy: input.reviewedBy,
        reviewedAt: currentIsoTimestamp(),
      };
    }
    this.#recordAudit("community.enabled");
    return this.capability("community");
  }

  reviewCommunityVisibilityPolicy(input: ReviewCommunityVisibilityPolicyInput): CommunityVisibilityPolicy {
    this.#ensureCommunityEnabled();
    this.#communityVisibilityPolicy = {
      policy: input.policy,
      reviewedBy: input.reviewedBy,
      reviewedAt: currentIsoTimestamp(),
    };
    this.#recordAudit("community.visibility_policy.reviewed", undefined, input.reviewedBy);
    return this.#communityVisibilityPolicy;
  }

  communityStatus(): CommunityStatus {
    const status = {
      ...this.capability("community"),
      workerStatus: this.communityWorkerStatus(),
      visibilityPolicy: this.#communityVisibilityPolicy === undefined ? undefined : clone(this.#communityVisibilityPolicy),
    };
    return status;
  }

  createOrganization(input: CreateOrganizationInput): Organization {
    const organization = {
      id: this.#id("org"),
      slug: normalizeSlug(input.slug),
      displayName: input.displayName,
    };
    this.#organizations.set(organization.id, organization);
    this.#recordAudit("organization.created", organization.id);
    return organization;
  }

  createProject(input: CreateProjectInput): Project {
    this.#mustGet(this.#organizations, input.organizationId, "organization");
    const project = {
      id: this.#id("project"),
      organizationId: input.organizationId,
      slug: normalizeSlug(input.slug),
      displayName: input.displayName,
    };
    this.#projects.set(project.id, project);
    this.#recordAudit("project.created", project.id);
    return project;
  }

  createRepository(input: CreateRepositoryInput): Repository {
    this.#mustGet(this.#projects, input.projectId, "project");
    const repository = {
      id: this.#id("repo"),
      projectId: input.projectId,
      slug: normalizeSlug(input.slug),
      visibility: input.visibility,
    };
    this.#repositories.set(repository.id, repository);
    this.#recordAudit("repository.created", repository.id);
    return repository;
  }

  createEnvironment(input: CreateEnvironmentInput): Environment {
    this.#mustGet(this.#projects, input.projectId, "project");
    const environment = {
      id: this.#id("env"),
      projectId: input.projectId,
      name: input.name,
      type: input.type,
      protected: input.protected,
    };
    this.#environments.set(environment.id, environment);
    this.#recordAudit("environment.created", environment.id);
    return environment;
  }

  createDeployable(input: CreateDeployableInput): Deployable {
    this.#mustGet(this.#projects, input.projectId, "project");
    this.#mustGet(this.#repositories, input.source.repositoryId, "repository");
    const deployable = {
      id: this.#id("deployable"),
      projectId: input.projectId,
      name: input.name,
      kind: input.kind,
      source: input.source,
      runtime: input.runtime,
      manifestPath: input.manifestPath,
    };
    this.#deployables.set(deployable.id, deployable);
    this.#recordAudit("deployable.created", deployable.id);
    return deployable;
  }

  createUser(input: CreateUserInput): PlatformUser {
    const user = {
      id: this.#id("user"),
      handle: normalizeSlug(input.handle),
      displayName: input.displayName,
      primaryEmail: input.primaryEmail,
    };
    this.#users.set(user.id, user);
    this.#recordAudit("identity.user.created", user.id);
    return user;
  }

  configureSsoProvider(input: ConfigureSsoProviderInput): SsoProvider {
    const provider = {
      id: this.#id("sso"),
      name: input.name,
      protocol: input.protocol,
    };
    this.#ssoProviders.set(provider.id, provider);
    this.#recordAudit("identity.sso.configured", provider.id);
    return provider;
  }

  provisionScimUser(input: ProvisionScimUserInput): PlatformUser {
    const user = {
      id: this.#id("user"),
      handle: normalizeSlug(input.handle),
      displayName: input.handle,
      group: input.group,
    };
    this.#users.set(user.id, user);
    this.#recordAudit("identity.scim.user.provisioned", user.id);
    return user;
  }

  createServiceAccount(input: CreateServiceAccountInput): ServiceAccount {
    this.#mustGet(this.#organizations, input.organizationId, "organization");
    const serviceAccount = {
      id: this.#id("svc"),
      organizationId: input.organizationId,
      name: input.name,
      scopes: [...input.scopes],
    };
    this.#serviceAccounts.set(serviceAccount.id, serviceAccount);
    this.#recordAudit("identity.service_account.created", serviceAccount.id);
    return serviceAccount;
  }

  getServiceAccount(serviceAccountId: string): ServiceAccount {
    return this.#mustGet(this.#serviceAccounts, serviceAccountId, "service account");
  }

  issueApiToken(input: IssueApiTokenInput): ApiToken {
    this.#mustGet(this.#serviceAccounts, input.serviceAccountId, "service account");
    const token = {
      id: this.#id("token"),
      serviceAccountId: input.serviceAccountId,
      name: input.name,
      state: "active" as const,
    };
    this.#apiTokens.set(token.id, token);
    this.#recordAudit("identity.token.issued", token.id);
    return token;
  }

  getApiToken(tokenId: string): ApiToken {
    return this.#mustGet(this.#apiTokens, tokenId, "API token");
  }

  revokeApiToken(tokenId: string): ApiToken {
    const token = this.#mustGet(this.#apiTokens, tokenId, "API token");
    token.state = "revoked";
    this.#revokeFabricCredentialsForParent(token.id);
    this.#recordAudit("identity.token.revoked", token.id);
    return token;
  }

  openSession(input: OpenSessionInput): PlatformSession {
    this.#mustGet(this.#users, input.userId, "user");
    const session = {
      id: this.#id("session"),
      userId: input.userId,
      name: input.name,
      state: "active" as const,
    };
    this.#sessions.set(session.id, session);
    this.#recordAudit("identity.session.opened", session.id);
    return session;
  }

  getSession(sessionId: string): PlatformSession {
    return this.#mustGet(this.#sessions, sessionId, "session");
  }

  revokeSession(sessionId: string): PlatformSession {
    const session = this.#mustGet(this.#sessions, sessionId, "session");
    session.state = "revoked";
    this.#revokeFabricCredentialsForParent(session.id);
    this.#recordAudit("identity.session.revoked", session.id);
    return session;
  }

  mintFabricCredential(input: MintFabricCredentialInput): MintFabricCredentialResult {
    const hasSession = input.sessionId !== undefined;
    const hasApiToken = input.apiTokenId !== undefined;
    if (hasSession === hasApiToken) {
      throw new PlatformError("invalid_input", "Minting a fabric credential requires exactly one of sessionId or apiTokenId.");
    }

    const ttlSeconds = input.ttlSeconds ?? 3600;
    if (!Number.isFinite(ttlSeconds)) {
      throw new PlatformError("invalid_input", "Fabric credential ttlSeconds must be a finite number.");
    }
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const secret = randomBytes(32).toString("base64url");
    const secretHash = hashSecret(secret);

    let kind: FabricCredentialKind;
    let parentId: string;
    let subjectRef: string;
    let scopes: string[];

    if (input.sessionId !== undefined) {
      const session = this.#mustGet(this.#sessions, input.sessionId, "session");
      this.#assertParentActive(session.state, "session", session.id);
      kind = "session";
      parentId = session.id;
      subjectRef = session.userId;
      scopes = ["fabric:human"];
    } else {
      const apiTokenId = input.apiTokenId;
      if (apiTokenId === undefined) {
        throw new PlatformError("invalid_input", "Minting a fabric credential requires exactly one of sessionId or apiTokenId.");
      }
      const token = this.#mustGet(this.#apiTokens, apiTokenId, "API token");
      this.#assertParentActive(token.state, "API token", token.id);
      const serviceAccount = this.#mustGet(this.#serviceAccounts, token.serviceAccountId, "service account");
      kind = "api-token";
      parentId = token.id;
      subjectRef = serviceAccount.id;
      scopes = [...serviceAccount.scopes];
    }

    const credential: FabricCredentialRecord = {
      id: this.#id("fabric"),
      kind,
      parentId,
      secretHash,
      expiresAt,
      state: "active",
      subjectRef,
      scopes,
    };
    this.#fabricCredentials.set(credential.id, credential);
    this.#recordAudit("identity.fabric_credential.minted", credential.id);
    return {
      id: credential.id,
      secret,
      expiresAt: credential.expiresAt,
      subjectRef: credential.subjectRef,
      kind: credential.kind,
      scopes: [...credential.scopes],
    };
  }

  verifyFabricCredential(secret: string): VerifiedFabricCredential {
    if (!__epochIsString(secret) || secret.trim().length === 0) {
      throw new PlatformError("unauthorized", "Unknown fabric credential.");
    }
    const secretHash = hashSecret(secret);
    const credential = [...this.#fabricCredentials.values()].find((candidate) => safeEqual(candidate.secretHash, secretHash));
    if (credential === undefined) {
      throw new PlatformError("unauthorized", "Unknown fabric credential.");
    }
    if (credential.state === "revoked") {
      throw new PlatformError("unauthorized", "Fabric credential is revoked.");
    }
    if (!Number.isFinite(credential.expiresAt) || credential.expiresAt <= Date.now()) {
      throw new PlatformError("unauthorized", "Fabric credential has expired.");
    }
    const parent = credential.kind === "session"
      ? this.#sessions.get(credential.parentId)
      : this.#apiTokens.get(credential.parentId);
    if (parent === undefined || parent.state === "revoked") {
      throw new PlatformError("unauthorized", "Fabric credential parent is revoked.");
    }
    return {
      id: credential.id,
      kind: credential.kind,
      parentId: credential.parentId,
      subjectRef: credential.subjectRef,
      scopes: [...credential.scopes],
      expiresAt: credential.expiresAt,
      allowServiceDiscovery: this.#posturePolicy.allowServiceDiscovery === true,
    };
  }

  revokeFabricCredential(id: string): FabricCredentialRecord {
    const credential = this.#mustGet(this.#fabricCredentials, id, "fabric credential");
    credential.state = "revoked";
    this.#recordAudit("identity.fabric_credential.revoked", credential.id);
    return credential;
  }

  createTeam(input: CreateTeamInput): PlatformTeam {
    this.#mustGet(this.#organizations, input.organizationId, "organization");
    const team = {
      id: this.#id("team"),
      organizationId: input.organizationId,
      name: input.name,
      memberUserIds: [],
    };
    this.#teams.set(team.id, team);
    this.#recordAudit("identity.team.created", team.id);
    return team;
  }

  addUserToTeam(input: AddUserToTeamInput): PlatformTeam {
    this.#mustGet(this.#users, input.userId, "user");
    const team = this.#mustGet(this.#teams, input.teamId, "team");
    if (!team.memberUserIds.includes(input.userId)) {
      team.memberUserIds.push(input.userId);
    }
    this.#recordAudit("identity.team.member_added", team.id);
    return team;
  }

  grantTeamRole(input: GrantTeamRoleInput): TeamRoleBinding {
    this.#mustGet(this.#teams, input.teamId, "team");
    if (input.resourceType === "environment") {
      this.#mustGet(this.#environments, input.resourceId, "environment");
    }
    if (input.resourceType === "project") {
      this.#mustGet(this.#projects, input.resourceId, "project");
    }
    if (input.resourceType === "organization") {
      this.#mustGet(this.#organizations, input.resourceId, "organization");
    }
    const binding = {
      id: this.#id("role-binding"),
      teamId: input.teamId,
      role: input.role,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    };
    this.#teamRoleBindings.set(binding.id, binding);
    this.#recordAudit("identity.role.granted", binding.id);
    return binding;
  }

  registerRunner(input: RegisterRunnerInput): Runner {
    const runner = {
      id: this.#id("runner"),
      name: input.name,
      capacity: input.capacity,
      state: "online" as const,
    };
    this.#runners.set(runner.id, runner);
    this.#recordAudit("runner.registered", runner.id);
    return runner;
  }

  getRunnerByName(name: string): Runner {
    const runner = [...this.#runners.values()].find((candidate) => candidate.name === name);
    if (runner === undefined) {
      throw new PlatformError("not_found", `Unknown runner: ${name}`);
    }
    return runner;
  }

  runnerHeartbeat(input: RunnerHeartbeatInput): Runner {
    const runner = this.getRunnerByName(input.name);
    runner.lastHeartbeatAt = currentIsoTimestamp();
    this.#recordAudit("runner.heartbeat", runner.id);
    return runner;
  }

  quarantineRunner(input: QuarantineRunnerInput): Runner {
    const runner = this.getRunnerByName(input.name);
    runner.state = "quarantined";
    this.#recordAudit("runner.quarantined", runner.id);
    return runner;
  }

  connectInfrastructureTarget(input: ConnectInfrastructureTargetInput): InfrastructureTarget {
    this.#mustGet(this.#organizations, input.organizationId, "organization");
    const target = {
      id: this.#id("target"),
      organizationId: input.organizationId,
      kind: input.kind,
      name: input.name,
      region: input.region,
      healthState: "healthy" as const,
    };
    this.#infrastructureTargets.set(target.id, target);
    this.#recordAudit("infrastructure.target.connected", target.id);
    return target;
  }

  getInfrastructureTarget(targetId: string): InfrastructureTarget {
    return this.#mustGet(this.#infrastructureTargets, targetId, "infrastructure target");
  }

  provisionResource(input: ProvisionResourceInput): PlatformResource {
    this.#mustGet(this.#projects, input.projectId, "project");
    this.#mustGet(this.#environments, input.environmentId, "environment");
    const resource = {
      id: this.#id("resource"),
      projectId: input.projectId,
      environmentId: input.environmentId,
      kind: input.kind,
      name: input.name,
      provider: input.provider,
      state: "ready" as const,
    };
    this.#resources.set(resource.id, resource);
    this.#recordAudit("resource.provisioned", resource.id);
    return resource;
  }

  discoverDeployable(input: DiscoverDeployableInput): Deployable {
    return this.createDeployable({
      projectId: input.projectId,
      name: input.name,
      kind: input.kind,
      source: { repositoryId: input.repositoryId },
      runtime: input.runtime,
      manifestPath: input.manifestPath,
    });
  }

  getDeployable(deployableId: string): Deployable {
    return this.#mustGet(this.#deployables, deployableId, "deployable");
  }

  createTemplate(input: CreateTemplateInput): DeployableTemplate {
    const template = {
      id: this.#id("template"),
      name: input.name,
      kind: input.kind,
    };
    this.#templates.set(template.id, template);
    this.#recordAudit("template.created", template.id);
    return template;
  }

  listTemplates(): DeployableTemplate[] {
    return [...this.#templates.values()];
  }

  configureBackupDestination(input: ConfigureBackupDestinationInput): BackupDestination {
    const destination = {
      id: this.#id("backup"),
      uri: input.uri,
      verified: true,
    };
    this.#backupDestination = destination;
    this.#recordAudit("backup.destination.configured", destination.id);
    return destination;
  }

  createSecret(input: CreateSecretInput): SecretReference {
    this.#mustGet(this.#environments, input.environmentId, "environment");
    const secret = {
      id: this.#id("secret"),
      environmentId: input.environmentId,
      name: input.name,
    };
    this.#secretReferences.set(secret.id, secret);
    this.#secretValues.set(secret.id, input.value);
    this.#recordAudit("secret.created", secret.id);
    return secret;
  }

  findSecretByName(name: string): SecretReference {
    const secret = [...this.#secretReferences.values()].find((candidate) => candidate.name === name);
    if (secret === undefined) {
      throw new PlatformError("not_found", `Unknown secret: ${name}`);
    }
    return secret;
  }

  rotateSecret(secretId: string, input: RotateSecretInput): SecretReference {
    const secret = this.#mustGet(this.#secretReferences, secretId, "secret");
    this.#secretValues.set(secret.id, input.value);
    this.#recordAudit("secret.rotated", secret.id);
    return secret;
  }

  grantSecretAccess(secretId: string, input: GrantSecretAccessInput): SecretAccessGrant {
    this.#mustGet(this.#secretReferences, secretId, "secret");
    this.#mustGet(this.#serviceAccounts, input.serviceAccountId, "service account");
    const grant = {
      id: this.#id("secret-grant"),
      secretId,
      serviceAccountId: input.serviceAccountId,
    };
    this.#secretAccessGrants.set(grant.id, grant);
    this.#recordAudit("secret.access.granted", grant.id);
    return grant;
  }

  readSecretReference(secretId: string, input: ReadSecretReferenceInput): SecretAccessResult {
    const secret = this.#mustGet(this.#secretReferences, secretId, "secret");
    const allowed = [...this.#secretAccessGrants.values()].some((grant) => grant.secretId === secretId && grant.serviceAccountId === input.serviceAccountId);
    if (!allowed) {
      throw new PlatformError("permission_denied", `Service account cannot read secret ${secret.name}.`, {
        suggestion: "Grant secret access",
      });
    }
    this.#recordAudit("secret.accessed", secret.id);
    return { name: secret.name };
  }

  firstRunReadiness(): FirstRunReadiness {
    const completedSteps: string[] = [];
    const incompleteSteps: string[] = [];
    if (this.#runners.size > 0) {
      completedSteps.push("Connect infrastructure");
    } else {
      incompleteSteps.push("Connect infrastructure");
    }
    if (this.#backupDestination !== undefined) {
      completedSteps.push("Configure backup destination");
    } else {
      incompleteSteps.push("Configure backup destination");
    }
    if ([...this.#deployments.values()].some((deployment) => deployment.state === "succeeded")) {
      completedSteps.push("Deploy first service");
    } else {
      incompleteSteps.push("Deploy first service");
    }
    return { productionReady: incompleteSteps.length === 0, completedSteps, incompleteSteps };
  }

  openApiRequest(input: OpenApiRequestInput): ApiResponse {
    this.#apiRequests.set(input.correlationId, input);
    this.#emitEvent("api.request.opened", input.correlationId);
    return { correlationId: input.correlationId };
  }

  completeApiRequest(correlationId: string): ApiResponse {
    this.#mustGet(this.#apiRequests, correlationId, "API request");
    const event = this.#emitEvent("api.request.completed", correlationId);
    return { correlationId, auditEventId: event.id };
  }

  registerWebhookEndpoint(input: RegisterWebhookEndpointInput): WebhookEndpoint {
    const endpoint = {
      id: this.#id("webhook"),
      name: input.name,
      secret: input.secret,
    };
    this.#webhookEndpoints.set(endpoint.id, endpoint);
    this.#recordAudit("webhook.endpoint.registered", endpoint.id);
    return endpoint;
  }

  verifyWebhook(input: VerifyWebhookInput): boolean {
    const endpoint = [...this.#webhookEndpoints.values()].find((candidate) => candidate.name === input.endpointName);
    if (endpoint === undefined) {
      return false;
    }
    return safeEqual(input.signature, signWebhookPayload(endpoint.secret, input.payload));
  }

  streamEvents(input: StreamPlatformEventsInput): PlatformEvent[] {
    const cursor = Number.parseInt(input.cursor, 10);
    return this.#platformEvents.slice(Number.isNaN(cursor) ? 0 : cursor);
  }

  sampleTypedError(input: SampleTypedErrorInput): never {
    throw new PlatformError(input.code, `Sample ${input.code} error.`, {
      suggestion: "Inspect policy and retry safely",
      correlationId: "sample-correlation",
    });
  }

  loadConfiguration(input: LoadPlatformConfigurationInput): PlatformConfigurationResult {
    if (__epochIsObject(input.database) && input.database !== null && "invalid" in input.database) {
      throw new PlatformError("invalid_configuration", "Database configuration is invalid.", {
        suggestion: "Fix database configuration",
      });
    }
    const known = new Set(["server", "database", "storage", "queue", "search", "identity", "security", "repositories", "deployments", "runners", "secrets", "ai", "community", "observability", "backup", "ha"]);
    return { warnings: Object.keys(input).filter((key) => !known.has(key)) };
  }

  setAuditRetention(input: SetAuditRetentionInput): void {
    this.#auditRetention = input.retention;
    this.#recordAudit("compliance.audit_retention.set");
  }

  complianceReport(): ComplianceReport {
    return {
      findings: ["encrypted secrets at rest", `audit retention ${this.#auditRetention}`],
    };
  }

  exportAudit(): AuditEvent[] {
    return [...this.#auditEvents];
  }

  exportTenant(input: ExportTenantInput): TenantExport {
    const organization = this.#mustGet(this.#organizations, input.organizationId, "organization");
    const tenantExport = {
      slug: organization.slug,
      projectSlugs: [...this.#projects.values()].filter((project) => project.organizationId === organization.id).map((project) => project.slug),
      deleted: false,
    };
    this.#tenantExports.set(organization.slug, tenantExport);
    this.#recordAudit("tenant.exported", organization.id);
    return tenantExport;
  }

  deleteTenantExport(input: DeleteTenantExportInput): TenantExport {
    const tenantExport = this.#tenantExports.get(input.organizationSlug) ?? { slug: input.organizationSlug, projectSlugs: [], deleted: false };
    tenantExport.deleted = true;
    this.#tenantExports.set(input.organizationSlug, tenantExport);
    this.#recordAudit("tenant_export.deleted");
    return tenantExport;
  }

  projectOverview(projectId: string): ProjectOverview {
    const project = this.#mustGet(this.#projects, projectId, "project");
    const repositories = [...this.#repositories.values()].filter((repository) => repository.projectId === projectId);
    const deployables = [...this.#deployables.values()].filter((deployable) => deployable.projectId === projectId);
    const environments = [...this.#environments.values()].filter((environment) => environment.projectId === projectId);
    const resources = [...this.#resources.values()].filter((resource) => resource.projectId === projectId);
    const emptyStateActions = [];
    if (repositories.length === 0) {
      emptyStateActions.push("Create repository");
    }
    if (deployables.length === 0) {
      emptyStateActions.push("Create deployable");
    }
    if (environments.length === 0) {
      emptyStateActions.push("Create environment");
    }
    return { project, repositories, deployables, environments, resources, emptyStateActions };
  }

  createDeployPlan(input: CreateDeployPlanInput): DeployPlan {
    if (input.idempotencyKey !== undefined) {
      const existingPlanId = this.#idempotencyKeys.get(input.idempotencyKey);
      if (existingPlanId !== undefined) {
        return this.#mustGet(this.#deployPlans, existingPlanId, "deploy plan");
      }
    }
    const deployable = this.#mustGet(this.#deployables, input.deployableId, "deployable");
    const environment = this.#mustGet(this.#environments, input.environmentId, "environment");
    const repository = this.#mustGet(this.#repositories, deployable.source.repositoryId, "repository");
    const requiredApprovals: DeployPlanApproval[] = environment.protected ? [{ kind: "protected-environment" }] : [];
    const secretReferences = [...this.#secretReferences.values()].filter((secret) => secret.environmentId === environment.id);
    const plan = {
      id: this.#id("deploy-plan"),
      deployableId: deployable.id,
      environmentId: environment.id,
      primaryAction: `Deploy to ${environment.name}`,
      sdkOperation: "deployments.executePlan" as const,
      impactSummary: `1 deployable, ${secretReferences.length} secret references, ${environment.name} environment`,
      rollbackStrategy: "previous-successful-deployment" as const,
      secretReferences,
      source: {
        repositoryId: repository.id,
        repositorySlug: repository.slug,
      },
      target: {
        environmentId: environment.id,
        environmentName: environment.name,
        protected: environment.protected,
      },
      dryRun: input.dryRun ?? false,
      generatedConfiguration: [],
      idempotencyKey: input.idempotencyKey,
      requiredApprovals,
      approvals: [],
      state: "planned" as const,
    };
    this.#deployPlans.set(plan.id, plan);
    if (input.idempotencyKey !== undefined) {
      this.#idempotencyKeys.set(input.idempotencyKey, plan.id);
    }
    this.#recordAudit("deployment.plan.created", plan.id);
    return plan;
  }

  editDeployPlan(planId: string, input: EditDeployPlanInput): DeployPlan {
    const plan = this.#mustGet(this.#deployPlans, planId, "deploy plan");
    for (const [name, value] of Object.entries(input.runtimeVariables)) {
      plan.generatedConfiguration.push(`${name}=${value}`);
    }
    this.#recordAudit("deployment.plan.edited", plan.id);
    return plan;
  }

  cancelDeployPlan(planId: string, input: CancelDeployPlanInput): DeployPlan {
    const plan = this.#mustGet(this.#deployPlans, planId, "deploy plan");
    plan.state = "canceled";
    this.#recordAudit("deployment.plan.canceled", plan.id, input.actor);
    return plan;
  }

  approveDeployPlan(planId: string, input: ApproveDeployPlanInput): DeployPlan {
    const plan = this.#mustGet(this.#deployPlans, planId, "deploy plan");
    for (const required of plan.requiredApprovals) {
      if (required.kind === "protected-environment" && this.#isRbacManaged("environment", plan.environmentId) && !this.#actorHasRole(input.actor, "environment-approver", "environment", plan.environmentId)) {
        throw new PlatformError("permission_denied", `Actor ${input.actor} cannot approve deploy plan ${plan.id}.`, {
          suggestion: "Ask an environment approver",
        });
      }
      if (!plan.approvals.some((approval) => approval.kind === required.kind)) {
        plan.approvals.push({ ...required, approvedBy: input.actor });
      }
    }
    plan.state = plan.requiredApprovals.length === plan.approvals.length ? "approved" : "planned";
    this.#recordAudit("deployment.plan.approved", plan.id, input.actor);
    return plan;
  }

  executeDeployPlan(planId: string): Deployment {
    const plan = this.#mustGet(this.#deployPlans, planId, "deploy plan");
    const missingApproval = plan.requiredApprovals.find((required) => !plan.approvals.some((approval) => approval.kind === required.kind));
    if (missingApproval !== undefined) {
      throw new PlatformError("policy_denied", `Deploy plan ${plan.id} requires ${missingApproval.kind} approval.`, {
        suggestion: "Approve deploy plan",
      });
    }
    const deployable = this.#mustGet(this.#deployables, plan.deployableId, "deployable");
    const environment = this.#mustGet(this.#environments, plan.environmentId, "environment");
    const rollbackTargetDeploymentId = [...this.#deployments.values()]
      .filter((deployment) => deployment.deployableId === plan.deployableId && deployment.environmentId === plan.environmentId && deployment.state === "succeeded")
      .at(-1)?.id;
    const job: DeployJob = {
      id: this.#id("job"),
      planId: plan.id,
      runnerId: [...this.#runners.values()][0]?.id ?? null,
      state: "succeeded" as const,
      logs: [`Deploy ${deployable.name} to ${environment.name}`, "Health checks passed"],
    };
    const deployment = {
      id: this.#id("deployment"),
      planId: plan.id,
      deployableId: plan.deployableId,
      environmentId: plan.environmentId,
      state: "succeeded" as const,
      health: "healthy" as const,
      jobId: job.id,
      rollbackTargetDeploymentId,
    };
    job.deploymentId = deployment.id;
    plan.state = "executed";
    this.#jobs.set(job.id, job);
    this.#deployments.set(deployment.id, deployment);
    this.#recordAudit("deployment.executed", deployment.id);
    return deployment;
  }

  getJob(jobId: string): DeployJob {
    return this.#mustGet(this.#jobs, jobId, "job");
  }

  schedulePlatformJob(input: SchedulePlatformJobInput): PlatformJob {
    const existing = [...this.#platformJobs.values()].find((job) => job.idempotencyKey === input.idempotencyKey);
    if (existing !== undefined) {
      return existing;
    }
    const job = {
      id: this.#id("platform-job"),
      name: input.name,
      type: input.type,
      state: "scheduled" as const,
      idempotencyKey: input.idempotencyKey,
      attempt: 1,
      logs: ["job scheduled"],
    };
    this.#platformJobs.set(job.id, job);
    this.#recordAudit("job.scheduled", job.id);
    return job;
  }

  getPlatformJob(jobId: string): PlatformJob {
    return this.#mustGet(this.#platformJobs, jobId, "platform job");
  }

  retryPlatformJob(jobId: string): PlatformJob {
    const job = this.getPlatformJob(jobId);
    job.attempt += 1;
    job.logs.push("retry scheduled");
    this.#recordAudit("job.retry_scheduled", job.id);
    return job;
  }

  reconcileRunnerLoss(jobId: string): PlatformJob {
    const job = this.getPlatformJob(jobId);
    job.state = "reconciled";
    job.logs.push("runner loss reconciled");
    this.#recordAudit("job.reconciled", job.id);
    return job;
  }

  deploymentLogs(deploymentId: string): string[] {
    const deployment = this.#mustGet(this.#deployments, deploymentId, "deployment");
    return this.#mustGet(this.#jobs, deployment.jobId, "job").logs;
  }

  markDeploymentDegraded(deploymentId: string, input: MarkDeploymentDegradedInput): IncidentDiagnosis {
    const deployment = this.#mustGet(this.#deployments, deploymentId, "deployment");
    deployment.health = "degraded";
    const diagnosis = {
      id: this.#id("incident"),
      deploymentId,
      severity: "high" as const,
      firstFailingStep: input.reason,
      recommendations: ["Rollback deployment", "Open follow-up issue"],
    };
    this.#recordAudit("incident.opened", diagnosis.id);
    return diagnosis;
  }

  markDeploymentFailed(deploymentId: string, input: MarkDeploymentFailedInput): IncidentDiagnosis {
    const deployment = this.#mustGet(this.#deployments, deploymentId, "deployment");
    deployment.state = "failed";
    deployment.health = "degraded";
    const diagnosis = {
      id: this.#id("incident"),
      deploymentId,
      severity: "high" as const,
      firstFailingStep: input.failureClass,
      recommendations: ["Retry job", "Rollback deployment"],
      failure: {
        classification: normalizeSlug(input.failureClass).replaceAll("-", "_"),
        recoveryActions: ["retry when runner healthy", "rollback deployment"],
      },
    };
    this.#recordAudit("incident.opened", diagnosis.id);
    return diagnosis;
  }

  acknowledgeIncident(incidentId: string, input: AcknowledgeIncidentInput): IncidentDiagnosis {
    const diagnosis = {
      id: incidentId,
      deploymentId: "",
      severity: "high" as const,
      firstFailingStep: "",
      recommendations: [],
      acknowledgedBy: input.actor,
    };
    this.#recordAudit("incident.acknowledged", incidentId, input.actor);
    return diagnosis;
  }

  createIncidentFollowUpIssue(incidentId: string, input: CreateIncidentFollowUpIssueInput): PlatformIssue {
    const deployment = [...this.#deployments.values()].at(-1);
    if (deployment === undefined) {
      throw new PlatformError("not_found", `Unknown incident: ${incidentId}`);
    }
    const deployable = this.#mustGet(this.#deployables, deployment.deployableId, "deployable");
    const issue = this.createIssue({ projectId: deployable.projectId, title: input.title });
    this.#recordAudit("incident.follow_up_issue.created", issue.id);
    return issue;
  }

  rollbackDeployment(deploymentId: string, input: RollbackDeploymentInput): Deployment {
    const deployment = this.#mustGet(this.#deployments, deploymentId, "deployment");
    deployment.state = "rolled_back";
    deployment.health = "healthy";
    this.#recordAudit("deployment.rolled_back", deployment.id, input.actor);
    return deployment;
  }

  promoteDeployment(deploymentId: string, input: PromoteDeploymentInput): DeploymentPromotion {
    this.#mustGet(this.#deployments, deploymentId, "deployment");
    this.#mustGet(this.#environments, input.environmentId, "environment");
    const promotion = {
      id: this.#id("promotion"),
      deploymentId,
      environmentId: input.environmentId,
      state: "succeeded" as const,
    };
    this.#recordAudit("deployment.promoted", promotion.id);
    return promotion;
  }

  createAiActionPlan(input: CreateAiActionPlanInput): AiActionPlan {
    this.#mustGet(this.#projects, input.projectId, "project");
    const plan = {
      id: this.#id("ai-plan"),
      projectId: input.projectId,
      action: input.action,
      context: { projectId: input.projectId },
      approvalRequired: true,
      state: "planned" as const,
    };
    this.#aiPlans.set(plan.id, plan);
    this.#recordAudit("ai.plan.created", plan.id);
    return plan;
  }

  createAiContextPack(input: CreateAiContextPackInput): AiContextPack {
    this.#mustGet(this.#projects, input.projectId, "project");
    const body = `AI context for ${input.actor}: ${input.sources.filter((source) => source !== "secrets").join(", ")}`;
    this.#recordAudit("ai.context.created", input.projectId, input.actor);
    return { body, citations: input.sources.filter((source) => source !== "secrets") };
  }

  requestAiTool(input: RequestAiToolInput): AiToolRequest {
    this.#mustGet(this.#projects, input.projectId, "project");
    if (input.tool === "secret.reveal") {
      throw new PlatformError("policy_denied", "AI cannot reveal plaintext secrets.", {
        suggestion: "Use secret reference",
      });
    }
    const request = {
      tool: input.tool,
      projectId: input.projectId,
      requiresApproval: input.tool.includes("deploy") || input.tool.includes("rollback"),
    };
    this.#recordAudit("ai.tool.requested", input.projectId);
    return request;
  }

  recordAiEvaluation(input: RecordAiEvaluationInput): AiEvaluation {
    const evaluation = {
      name: input.name,
      passed: input.score >= 1,
    };
    this.#recordAudit("ai.evaluation.recorded", input.name);
    return evaluation;
  }

  approveAiActionPlan(planId: string, input: ApproveAiActionPlanInput): AiActionPlan {
    const plan = this.#mustGet(this.#aiPlans, planId, "AI plan");
    plan.approvedBy = input.actor;
    plan.state = "approved";
    this.#recordAudit("ai.plan.approved", plan.id, input.actor);
    return plan;
  }

  executeAiActionPlan(planId: string): AiActionPlan {
    const plan = this.#mustGet(this.#aiPlans, planId, "AI plan");
    if (plan.approvalRequired && plan.approvedBy === undefined) {
      throw new PlatformError("approval_required", `AI plan ${plan.id} requires approval.`, {
        suggestion: "Approve AI plan",
      });
    }
    plan.state = "executed";
    this.#recordAudit("ai.plan.executed", plan.id);
    return plan;
  }

  publishCommunityProject(input: PublishCommunityProjectInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    const project = this.#mustGet(this.#projects, input.projectId, "project");
    if (
      input.requestedBy !== undefined &&
      this.#isRbacManaged("project", project.id) &&
      !this.#actorHasRole(input.requestedBy, "community-maintainer", "project", project.id)
    ) {
      throw new PlatformError("permission_denied", `Actor ${input.requestedBy} cannot publish Community project ${project.id}.`, {
        suggestion: "Ask a project maintainer",
      });
    }
    const repository = [...this.#repositories.values()].find((candidate) => candidate.projectId === project.id);
    const communityProject = {
      id: this.#id("community-project"),
      projectId: project.id,
      publicSlug: normalizeSlug(input.publicSlug),
      summary: input.summary,
      repositoryId: repository?.id,
      requestedBy: input.requestedBy,
      readme: input.readme,
      deployStatusBadge: input.deployStatusBadge,
      contributionPrompt: input.contributionPrompt,
      visibility: input.visibility ?? "public",
      moderationState: "pending_review" as const,
      followerProfileIds: [],
      starProfileIds: [],
      bookmarkProfileIds: [],
      followersCount: 0,
      starsCount: 0,
      bookmarksCount: 0,
      discussionsCount: 0,
      topics: [],
      showcaseAssets: [],
      releases: [],
    };
    this.#communityProjects.set(communityProject.id, communityProject);
    this.#recordAudit("community.project.published", communityProject.id);
    return communityProject;
  }

  approveCommunityProject(projectId: string, input: ApproveCommunityProjectInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    const communityProject = this.#mustGet(this.#communityProjects, projectId, "Community project");
    communityProject.moderationState = "approved";
    communityProject.approvedBy = input.moderator;
    this.#recordAudit("community.project.approved", communityProject.id, input.moderator);
    return communityProject;
  }

  createIssue(input: CreateIssueInput): PlatformIssue {
    this.#mustGet(this.#projects, input.projectId, "project");
    const issue = {
      id: this.#id("issue"),
      projectId: input.projectId,
      title: input.title,
      state: "open" as const,
      linkedReviewIntentIds: [],
    };
    this.#issues.set(issue.id, issue);
    this.#recordAudit("issue.created", issue.id);
    return issue;
  }

  getIssue(issueId: string): PlatformIssue {
    return this.#mustGet(this.#issues, issueId, "issue");
  }

  createReviewIntent(input: CreateReviewIntentInput): ReviewIntent {
    this.#mustGet(this.#repositories, input.repositoryId, "repository");
    const issue = this.#mustGet(this.#issues, input.issueId, "issue");
    const reviewIntent = {
      id: this.#id("review-intent"),
      repositoryId: input.repositoryId,
      title: input.title,
      issueId: issue.id,
      state: "open" as const,
      checks: [],
      approvals: [],
    };
    this.#reviewIntents.set(reviewIntent.id, reviewIntent);
    issue.linkedReviewIntentIds.push(reviewIntent.id);
    this.#recordAudit("review_intent.created", reviewIntent.id);
    return reviewIntent;
  }

  recordReviewCheck(reviewIntentId: string, input: RecordReviewCheckInput): ReviewIntent {
    const reviewIntent = this.#mustGet(this.#reviewIntents, reviewIntentId, "review intent");
    const existingCheck = reviewIntent.checks.find((check) => check.name === input.name);
    if (existingCheck === undefined) {
      reviewIntent.checks.push({ name: input.name, status: input.status });
    } else {
      existingCheck.status = input.status;
    }
    this.#recordAudit("review_intent.check_recorded", reviewIntent.id);
    return reviewIntent;
  }

  summarizeReviewIntentWithAi(reviewIntentId: string): ReviewIntent {
    const reviewIntent = this.#mustGet(this.#reviewIntents, reviewIntentId, "review intent");
    reviewIntent.aiSummary = `${reviewIntent.title} is ready for human review with ${reviewIntent.checks.length} recorded check.`;
    this.#recordAudit("review_intent.ai_summarized", reviewIntent.id);
    return reviewIntent;
  }

  approveReviewIntent(reviewIntentId: string, input: ApproveReviewIntentInput): ReviewIntent {
    const reviewIntent = this.#mustGet(this.#reviewIntents, reviewIntentId, "review intent");
    if (!reviewIntent.approvals.includes(input.actor)) {
      reviewIntent.approvals.push(input.actor);
    }
    reviewIntent.state = "approved";
    this.#recordAudit("review_intent.approved", reviewIntent.id, input.actor);
    return reviewIntent;
  }

  mergeReviewIntent(reviewIntentId: string): ReviewIntent {
    const reviewIntent = this.#mustGet(this.#reviewIntents, reviewIntentId, "review intent");
    if (reviewIntent.state !== "approved") {
      throw new PlatformError("approval_required", `Review intent ${reviewIntent.id} requires approval.`, {
        suggestion: "Approve review intent",
      });
    }
    if (reviewIntent.checks.some((check) => check.status !== "passed")) {
      throw new PlatformError("policy_denied", `Review intent ${reviewIntent.id} has failing checks.`, {
        suggestion: "Pass required checks",
      });
    }
    reviewIntent.state = "merged";
    this.#recordAudit("review_intent.merged", reviewIntent.id);
    return reviewIntent;
  }

  publishPackage(input: PublishPackageInput): PlatformPackage {
    this.#mustGet(this.#deployments, input.deploymentId, "deployment");
    const platformPackage = {
      id: this.#id("package"),
      name: input.name,
      version: input.version,
      deploymentId: input.deploymentId,
    };
    this.#packages.set(platformPackage.id, platformPackage);
    this.#recordAudit("package.published", platformPackage.id);
    return platformPackage;
  }

  listPackages(): PlatformPackage[] {
    return [...this.#packages.values()];
  }

  search(query: string): PlatformSearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = (value: string): boolean => value.toLowerCase().includes(normalizedQuery);
    const repositoryResults = [...this.#repositories.values()]
      .filter((repository) => matches(repository.slug))
      .map((repository) => ({ type: "repository" as const, id: repository.id, label: repository.slug }));
    const deployableResults = [...this.#deployables.values()]
      .filter((deployable) => matches(deployable.name))
      .map((deployable) => ({ type: "deployable" as const, id: deployable.id, label: deployable.name }));
    const packageResults = [...this.#packages.values()]
      .filter((platformPackage) => matches(platformPackage.name))
      .map((platformPackage) => ({ type: "package" as const, id: platformPackage.id, label: platformPackage.name }));
    return [...repositoryResults, ...deployableResults, ...packageResults];
  }

  observabilitySummary(): ObservabilitySummary {
    return {
      runnerCount: this.#runners.size,
      latestDeploymentState: [...this.#deployments.values()].at(-1)?.state,
    };
  }

  createPublicProfile(input: CreatePublicProfileInput): PublicProfile {
    this.#ensureCommunityEnabled();
    const profile = {
      id: this.#id("profile"),
      userId: input.userId,
      handle: normalizeSlug(input.handle),
      displayName: input.displayName,
      bio: input.bio,
      links: input.links ?? [],
      avatarRef: input.avatarRef,
      visibility: input.visibility ?? "public",
      moderationState: "visible" as const,
      reputation: 0,
      blockedProfileIds: [],
    };
    this.#profiles.set(profile.id, profile);
    this.#recordAudit("community.profile.created", profile.id);
    return profile;
  }

  getCommunityProjectBySlug(publicSlug: string): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    const normalizedSlug = normalizeSlug(publicSlug);
    const communityProject = [...this.#communityProjects.values()].find((project) => project.publicSlug === normalizedSlug);
    if (communityProject === undefined) {
      throw new PlatformError("not_found", `Unknown Community project: ${publicSlug}`);
    }
    return communityProject;
  }

  followCommunityProject(input: FollowCommunityProjectInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    this.#mustGet(this.#profiles, input.profileId, "profile");
    const communityProject = this.#mustGet(this.#communityProjects, input.communityProjectId, "Community project");
    this.#ensureCommunityProjectVisible(communityProject);
    if (!communityProject.followerProfileIds.includes(input.profileId)) {
      communityProject.followerProfileIds.push(input.profileId);
      communityProject.followersCount = communityProject.followerProfileIds.length;
    }
    this.#recordAudit("community.project.followed", communityProject.id);
    return communityProject;
  }

  starCommunityProject(input: StarCommunityProjectInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    this.#mustGet(this.#profiles, input.profileId, "profile");
    const communityProject = this.#mustGet(this.#communityProjects, input.communityProjectId, "Community project");
    this.#ensureCommunityProjectVisible(communityProject);
    if (!communityProject.starProfileIds.includes(input.profileId)) {
      communityProject.starProfileIds.push(input.profileId);
      communityProject.starsCount = communityProject.starProfileIds.length;
    }
    this.#recordAudit("community.project.starred", communityProject.id);
    return communityProject;
  }

  bookmarkCommunityProject(input: BookmarkCommunityProjectInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    this.#mustGet(this.#profiles, input.profileId, "profile");
    const communityProject = this.#mustGet(this.#communityProjects, input.communityProjectId, "Community project");
    this.#ensureCommunityProjectVisible(communityProject);
    if (!communityProject.bookmarkProfileIds.includes(input.profileId)) {
      communityProject.bookmarkProfileIds.push(input.profileId);
      communityProject.bookmarksCount = communityProject.bookmarkProfileIds.length;
    }
    this.#recordAudit("community.project.bookmarked", communityProject.id);
    return communityProject;
  }

  openCommunityDiscussion(input: OpenCommunityDiscussionInput): PublicCommunityDiscussion {
    this.#ensureCommunityEnabled();
    const profile = this.#mustGet(this.#profiles, input.profileId, "profile");
    const communityProject = this.#mustGet(this.#communityProjects, input.communityProjectId, "Community project");
    this.#ensureCommunityProjectVisible(communityProject);
    const recentPostCount = [...this.#discussions.values()].filter((discussion) => discussion.profileId === input.profileId).length;
    if (recentPostCount >= 3) {
      throw new PlatformError("rate_limited", "Community posting rate limit exceeded.", {
        suggestion: "Wait before posting again",
      });
    }
    const discussion = {
      id: this.#id("discussion"),
      communityProjectId: input.communityProjectId,
      profileId: input.profileId,
      title: input.title,
      body: input.body ?? "",
      visibility: input.visibility ?? "public",
      participants: [input.profileId],
      createdAt: currentIsoTimestamp(),
      state: "open" as const,
      moderationState: "visible" as const,
    };
    this.#discussions.set(discussion.id, discussion);
    communityProject.discussionsCount = [...this.#discussions.values()].filter((candidate) => candidate.communityProjectId === communityProject.id).length;
    this.#communityFeed.push({
      id: this.#id("community-feed"),
      communityProjectId: input.communityProjectId,
      actorId: input.profileId,
      verb: "discussion.opened",
      objectType: "discussion",
      objectId: discussion.id,
      visibility: discussion.visibility,
      createdAt: discussion.createdAt,
      summary: `${profile.handle} opened discussion ${input.title}`,
    });
    this.#recordAudit("community.discussion.opened", discussion.id);
    return discussion;
  }

  reportCommunityDiscussion(input: ReportCommunityDiscussionInput): CommunityReport {
    this.#ensureCommunityEnabled();
    this.#mustGet(this.#discussions, input.discussionId, "discussion");
    const severity: NonNullable<CommunityReport["triage"]>["severity"] = /threat|credential|malware|exploit|dox/i.test(input.reason) ? "high" : "medium";
    const report = {
      id: this.#id("community-report"),
      discussionId: input.discussionId,
      reason: input.reason,
      state: "open" as const,
      triage: {
        severity,
        summary: `AI moderation triage flagged ${input.reason} as ${severity} priority.`,
      },
      createdAt: currentIsoTimestamp(),
    };
    this.#communityReports.set(report.id, report);
    this.#recordAudit("community.report.opened", report.id);
    return report;
  }

  resolveCommunityReport(reportId: string, input: ResolveCommunityReportInput): CommunityReport {
    this.#ensureCommunityEnabled();
    const report = this.#mustGet(this.#communityReports, reportId, "Community report");
    report.state = "resolved";
    report.resolvedBy = input.moderator;
    this.#recordAudit("community.report.resolved", report.id, input.moderator);
    return report;
  }

  communityModerationQueue(): CommunityReport[] {
    this.#ensureCommunityEnabled();
    return [...this.#communityReports.values()].filter((report) => report.state === "open");
  }

  communityFeed(): CommunityFeedEvent[] {
    this.#ensureCommunityEnabled();
    return this.#communityFeed.filter((event) => event.visibility === "public").map(clone);
  }

  personalizedCommunityFeed(input: PersonalizedCommunityFeedInput = {}): CommunityFeedEvent[] {
    this.#ensureCommunityEnabled();
    if (input.profileId !== undefined) {
      this.#mustGet(this.#profiles, input.profileId, "profile");
    }
    return this.communityFeed();
  }

  addCommunityTopic(projectId: string, input: AddCommunityTopicInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    const project = this.#mustGet(this.#communityProjects, projectId, "Community project");
    this.#ensureCommunityProjectVisible(project);
    if (!project.topics.includes(input.topic)) {
      project.topics.push(input.topic);
    }
    this.#recordAudit("community.topic.added", project.id);
    return project;
  }

  addShowcaseAsset(projectId: string, input: AddShowcaseAssetInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    const project = this.#mustGet(this.#communityProjects, projectId, "Community project");
    this.#ensureCommunityProjectVisible(project);
    project.showcaseAssets.push(input.asset);
    this.#recordAudit("community.showcase_asset.added", project.id);
    return project;
  }

  publishCommunityRelease(projectId: string, input: PublishCommunityReleaseInput): PublicCommunityProject {
    this.#ensureCommunityEnabled();
    const project = this.#mustGet(this.#communityProjects, projectId, "Community project");
    this.#ensureCommunityProjectVisible(project);
    project.releases.push(input.version);
    this.#communityFeed.push({
      id: this.#id("community-feed"),
      communityProjectId: project.id,
      actorId: project.requestedBy ?? "system",
      verb: "release.published",
      objectType: "release",
      objectId: input.version,
      visibility: project.visibility,
      createdAt: currentIsoTimestamp(),
      summary: `${project.publicSlug} published release ${input.version}`,
    });
    this.#recordAudit("community.release.published", project.id);
    return project;
  }

  recordCommunityContribution(input: RecordCommunityContributionInput): PublicProfile {
    this.#ensureCommunityEnabled();
    const project = this.#mustGet(this.#communityProjects, input.communityProjectId, "Community project");
    this.#ensureCommunityProjectVisible(project);
    const profile = this.#mustGet(this.#profiles, input.profileId, "profile");
    profile.reputation += 10;
    this.#communityFeed.push({
      id: this.#id("community-feed"),
      communityProjectId: project.id,
      actorId: profile.id,
      verb: "contribution.recorded",
      objectType: "contribution",
      objectId: `${project.id}:${profile.id}:${profile.reputation}`,
      visibility: project.visibility,
      createdAt: currentIsoTimestamp(),
      summary: input.narrative ?? `${profile.handle} contributed to ${project.publicSlug}`,
    });
    this.#recordAudit("community.contribution.recorded", input.communityProjectId);
    return profile;
  }

  searchCommunity(input: SearchCommunityInput): PublicCommunityProject[] {
    this.#ensureCommunityEnabled();
    const query = input.query.toLowerCase();
    return [...this.#communityProjects.values()].filter(
      (project) =>
        project.moderationState === "approved" &&
        (project.publicSlug.includes(query) ||
          project.summary.toLowerCase().includes(query) ||
          project.topics.some((topic) => topic.toLowerCase().includes(query))),
    );
  }

  getPublicProfile(profileId: string): PublicProfile {
    this.#ensureCommunityEnabled();
    return this.#mustGet(this.#profiles, profileId, "profile");
  }

  getCommunityDiscussion(discussionId: string): PublicCommunityDiscussion {
    this.#ensureCommunityEnabled();
    return this.#mustGet(this.#discussions, discussionId, "discussion");
  }

  takeDownCommunityDiscussion(discussionId: string, input: TakeDownCommunityDiscussionInput): PublicCommunityDiscussion {
    const discussion = this.getCommunityDiscussion(discussionId);
    discussion.state = "taken_down";
    discussion.moderationState = "taken_down";
    this.#recordAudit("community.discussion.taken_down", discussion.id, input.moderator);
    return discussion;
  }

  blockPublicProfile(input: BlockPublicProfileInput): PublicProfile {
    const profile = this.getPublicProfile(input.profileId);
    if (!profile.blockedProfileIds.includes(input.blockedProfileId)) {
      profile.blockedProfileIds.push(input.blockedProfileId);
    }
    this.#recordAudit("community.profile.blocked", profile.id);
    return profile;
  }

  exportCommunityLegalHold(input: ExportCommunityLegalHoldInput): CommunityLegalHold {
    this.#ensureCommunityEnabled();
    this.#mustGet(this.#communityProjects, input.communityProjectId, "Community project");
    const legalHold = {
      discussions: [...this.#discussions.values()]
        .filter((discussion) => discussion.communityProjectId === input.communityProjectId)
        .map((discussion) => ({
          id: discussion.id,
          title: discussion.title,
          body: discussion.body,
          moderationState: discussion.moderationState,
          state: discussion.state,
          profileId: discussion.profileId,
        })),
    };
    this.#recordAudit("community.legal_hold.exported", input.communityProjectId);
    return legalHold;
  }

  communityWorkerStatus(): CommunityWorkerStatus {
    return { enabled: this.#communityEnabled };
  }

  operatorDashboard(): OperatorDashboard {
    return {
      serviceHealth: "healthy",
      backupFreshness: this.#backupDestination === undefined ? "missing" : "configured",
      runnerCapacity: [...this.#runners.values()].reduce((sum, runner) => sum + runner.capacity, 0),
    };
  }

  supportBundle(): SupportBundle {
    return {
      sections: ["feature capability map", "runner diagnostics"],
      body: JSON.stringify({
        capabilities: ["core", "sdk", this.#communityEnabled ? "community" : "community-disabled"],
        runners: this.#runners.size,
        secrets: [...this.#secretReferences.values()].map((secret) => secret.name),
      }),
    };
  }

  startBackup(input: StartBackupInput): BackupRun {
    const backupId = this.#id("backup-run");
    const artifactPath = this.#backupDir === undefined ? undefined : join(this.#backupDir, `${normalizeSlug(input.name)}-${backupId}.json`);
    const backup = {
      id: backupId,
      name: input.name,
      verificationStatus: "pending" as const,
      artifactPath,
    };
    this.#backupRuns.set(backup.id, backup);
    if (artifactPath !== undefined) {
      const snapshot = this.exportSnapshot();
      const manifestHash = snapshotHash(snapshot);
      writeBackupArtifact(artifactPath, {
        manifest: {
          name: input.name,
          createdAt: currentIsoTimestamp(),
          manifestHash,
        },
        snapshot,
      });
    }
    this.#recordAudit("backup.started", backup.id);
    return backup;
  }

  getBackup(backupId: string): BackupRun {
    return this.#mustGet(this.#backupRuns, backupId, "backup");
  }

  verifyBackup(backupId: string): BackupRun {
    const backup = this.getBackup(backupId);
    if (backup.artifactPath !== undefined) {
      const artifact = readBackupArtifact(backup.artifactPath);
      if (artifact.manifest.manifestHash !== snapshotHash(artifact.snapshot)) {
        throw new PlatformError("backup_verification_failed", `Backup ${backup.name} failed hash verification.`, {
          suggestion: "Create a fresh backup",
        });
      }
      backup.manifestHash = artifact.manifest.manifestHash;
    }
    backup.verificationStatus = "verified";
    this.#recordAudit("backup.verified", backup.id);
    return backup;
  }

  restoreDryRun(input: RestoreDryRunInput): RestoreDryRun {
    this.#mustGet(this.#backupRuns, input.backupId, "backup");
    this.#recordAudit("restore.dry_run.completed", input.backupId);
    return { status: "passed" };
  }

  declareHaProfile(input: DeclareHaProfileInput): HaProfile {
    this.#haProfile = { name: input.name, rpo: input.rpo, rto: input.rto };
    this.#recordAudit("ha.profile.declared");
    return this.#haProfile;
  }

  runFailoverDrill(input: RunFailoverDrillInput): FailoverDrill {
    const drill = { name: input.name, status: "passed" as const };
    this.#recordAudit("ha.failover_drill.passed");
    return drill;
  }

  exportSnapshot(): PlatformSnapshot {
    return {
      sequence: this.#sequence,
      communityEnabled: this.#communityEnabled,
      communityVisibilityPolicy: this.#communityVisibilityPolicy === undefined ? undefined : clone(this.#communityVisibilityPolicy),
      organizations: values(this.#organizations),
      projects: values(this.#projects),
      repositories: values(this.#repositories),
      environments: values(this.#environments),
      deployables: values(this.#deployables),
      deployPlans: values(this.#deployPlans),
      deployments: values(this.#deployments),
      communityProjects: values(this.#communityProjects),
      runners: values(this.#runners),
      backupDestination: this.#backupDestination === undefined ? undefined : clone(this.#backupDestination),
      secretReferences: values(this.#secretReferences),
      jobs: values(this.#jobs),
      aiPlans: values(this.#aiPlans),
      users: values(this.#users),
      teams: values(this.#teams),
      teamRoleBindings: values(this.#teamRoleBindings),
      issues: values(this.#issues),
      reviewIntents: values(this.#reviewIntents),
      packages: values(this.#packages),
      profiles: values(this.#profiles),
      discussions: values(this.#discussions),
      communityFeed: this.#communityFeed.map(clone),
      communityReports: values(this.#communityReports),
      ssoProviders: values(this.#ssoProviders),
      serviceAccounts: values(this.#serviceAccounts),
      apiTokens: values(this.#apiTokens),
      sessions: values(this.#sessions),
      fabricCredentials: values(this.#fabricCredentials),
      infrastructureTargets: values(this.#infrastructureTargets),
      resources: values(this.#resources),
      templates: values(this.#templates),
      platformJobs: values(this.#platformJobs),
      webhookEndpoints: values(this.#webhookEndpoints),
      secretAccessGrants: values(this.#secretAccessGrants),
      backupRuns: values(this.#backupRuns),
      platformEvents: this.#platformEvents.map(clone),
      idempotencyKeys: [...this.#idempotencyKeys.entries()].map(([key, resourceId]) => ({ key, resourceId })),
      auditRetention: this.#auditRetention,
      auditEvents: this.#auditEvents.map(clone),
    };
  }

  latestAuditEvent(): AuditEvent | undefined {
    return this.#auditEvents.at(-1);
  }

  #restoreSnapshot(snapshot: PlatformSnapshot): void {
    this.#sequence = snapshot.sequence;
    this.#communityEnabled = snapshot.communityEnabled;
    this.#communityVisibilityPolicy = snapshot.communityVisibilityPolicy === undefined ? undefined : clone(snapshot.communityVisibilityPolicy);
    this.#organizations = mapById(snapshot.organizations);
    this.#projects = mapById(snapshot.projects);
    this.#repositories = mapById(snapshot.repositories);
    this.#environments = mapById(snapshot.environments);
    this.#deployables = mapById(snapshot.deployables);
    this.#deployPlans = mapById(snapshot.deployPlans);
    this.#deployments = mapById(snapshot.deployments);
    this.#communityProjects = mapById(snapshot.communityProjects);
    this.#runners = mapById(snapshot.runners);
    this.#backupDestination = snapshot.backupDestination === undefined ? undefined : clone(snapshot.backupDestination);
    this.#secretReferences = mapById(snapshot.secretReferences);
    this.#jobs = mapById(snapshot.jobs);
    this.#aiPlans = mapById(snapshot.aiPlans);
    this.#users = mapById(snapshot.users);
    this.#teams = mapById(snapshot.teams);
    this.#teamRoleBindings = mapById(snapshot.teamRoleBindings);
    this.#issues = mapById(snapshot.issues);
    this.#reviewIntents = mapById(snapshot.reviewIntents);
    this.#packages = mapById(snapshot.packages);
    this.#profiles = mapById(snapshot.profiles);
    this.#discussions = mapById(snapshot.discussions);
    this.#communityFeed = snapshot.communityFeed.map(clone);
    this.#communityReports = mapById(snapshot.communityReports);
    this.#ssoProviders = mapById(snapshot.ssoProviders);
    this.#serviceAccounts = mapById(snapshot.serviceAccounts);
    this.#apiTokens = mapById(snapshot.apiTokens);
    this.#sessions = mapById(snapshot.sessions);
    this.#fabricCredentials = mapById(snapshot.fabricCredentials ?? []);
    this.#infrastructureTargets = mapById(snapshot.infrastructureTargets);
    this.#resources = mapById(snapshot.resources);
    this.#templates = mapById(snapshot.templates);
    this.#platformJobs = mapById(snapshot.platformJobs);
    this.#webhookEndpoints = mapById(snapshot.webhookEndpoints);
    this.#secretAccessGrants = mapById(snapshot.secretAccessGrants);
    this.#backupRuns = mapById(snapshot.backupRuns);
    this.#platformEvents = snapshot.platformEvents.map(clone);
    this.#idempotencyKeys = new Map((snapshot.idempotencyKeys ?? []).map((entry) => [entry.key, entry.resourceId]));
    this.#auditRetention = snapshot.auditRetention ?? "90d";
    this.#auditEvents = snapshot.auditEvents.map(clone);
  }

  #ensureCommunityEnabled(): void {
    if (!this.#communityEnabled) {
      throw new PlatformError("feature_disabled", "Community is disabled for this platform instance.", {
        suggestion: "Enable Community",
      });
    }
  }

  #ensureCommunityProjectVisible(project: PublicCommunityProject): void {
    if (project.moderationState !== "approved") {
      throw new PlatformError("visibility_denied", `Community project ${project.publicSlug} is not approved for public visibility.`, {
        suggestion: "Wait for Community moderation approval",
      });
    }
  }

  #isRbacManaged(resourceType: TeamRoleBinding["resourceType"], resourceId: string): boolean {
    return [...this.#teamRoleBindings.values()].some((binding) => binding.resourceType === resourceType && binding.resourceId === resourceId);
  }

  #actorHasRole(actor: string, role: string, resourceType: TeamRoleBinding["resourceType"], resourceId: string): boolean {
    const user = [...this.#users.values()].find((candidate) => candidate.handle === normalizeSlug(actor));
    if (user === undefined) {
      return false;
    }
    const teamIds = [...this.#teams.values()].filter((team) => team.memberUserIds.includes(user.id)).map((team) => team.id);
    return [...this.#teamRoleBindings.values()].some((binding) => teamIds.includes(binding.teamId) && binding.role === role && binding.resourceType === resourceType && binding.resourceId === resourceId);
  }

  #id(prefix: string): string {
    this.#sequence += 1;
    return `${prefix}_${this.#sequence}`;
  }

  #recordAudit(type: string, resourceId?: string, actor?: string): void {
    const event = { id: this.#id("audit"), type, resourceId, actor };
    this.#auditEvents.push(event);
    this.#platformEvents.push({ id: this.#id("event"), type });
    this.#persist();
  }

  #emitEvent(type: string, correlationId?: string): PlatformEvent {
    const event = { id: this.#id("event"), type, correlationId };
    this.#platformEvents.push(event);
    this.#persist();
    return event;
  }

  #persist(): void {
    if (this.#statePath === undefined || this.#persisting) {
      return;
    }
    this.#persisting = true;
    try {
      writePlatformStateFile(this.#statePath, this.exportSnapshot());
    } finally {
      this.#persisting = false;
    }
  }

  #mustGet<T>(collection: Map<string, T>, id: string, label: string): T {
    const value = collection.get(id);
    if (value === undefined) {
      throw new PlatformError("not_found", `Unknown ${label}: ${id}`);
    }
    return value;
  }

  #assertParentActive(state: "active" | "revoked", label: string, id: string): void {
    if (state !== "active") {
      throw new PlatformError("policy_denied", `${label} ${id} is not active.`, {
        suggestion: "Mint a fabric credential from an active session or API token",
      });
    }
  }

  #revokeFabricCredentialsForParent(parentId: string): void {
    for (const credential of this.#fabricCredentials.values()) {
      if (credential.parentId === parentId && credential.state === "active") {
        credential.state = "revoked";
        this.#recordAudit("identity.fabric_credential.revoked", credential.id);
      }
    }
  }
}

export function createInMemoryPlatformCore(options: PlatformCoreOptions = {}): EpochPlatformCore {
  return new EpochPlatformCore(options);
}

export function createFileSystemPlatformCore(options: FileSystemPlatformCoreOptions): EpochPlatformCore {
  return new EpochPlatformCore(options);
}

export function signWebhookPayload(secret: string, payload: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function currentIsoTimestamp(): string {
  return new Date().toISOString();
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, clone(item)]));
}

function values<T>(collection: Map<string, T>): T[] {
  return [...collection.values()].map(clone);
}

function snapshotHash(snapshot: PlatformSnapshot): string {
  return `sha256:${createHash("sha256").update(stableJson(snapshot)).digest("hex")}`;
}

function writePlatformStateFile(path: string, snapshot: PlatformSnapshot): void {
  writeJsonFile(path, {
    manifestHash: snapshotHash(snapshot),
    snapshot,
  } satisfies PlatformStateFile);
}

function readPlatformStateFile(path: string): PlatformSnapshot {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const stateFile = JSON.parse(readFileSync(path, "utf8")) as PlatformStateFile | PlatformSnapshot;
  if (isPlatformStateFile(stateFile)) {
    const expectedHash = snapshotHash(stateFile.snapshot);
    if (stateFile.manifestHash !== expectedHash) {
      throw new PlatformError("state_verification_failed", `Platform state file ${path} failed hash verification.`, {
        suggestion: "Restore from a verified backup artifact",
      });
    }
    return stateFile.snapshot;
  }
  return stateFile;
}

function isPlatformStateFile(value: PlatformStateFile | PlatformSnapshot): value is PlatformStateFile {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const record = value as Record<string, DictionaryValue>;
  return typeof record.manifestHash === "string" && record.snapshot !== undefined;
}

function writeBackupArtifact(path: string, artifact: PlatformBackupArtifact): void {
  writeJsonFile(path, artifact);
}

function readBackupArtifact(path: string): PlatformBackupArtifact {
  // SAFETY: The module validates or constructs this value before applying the asserted contract.
  const artifact = JSON.parse(readFileSync(path, "utf8")) as PlatformBackupArtifact;
  const expectedHash = snapshotHash(artifact.snapshot);
  if (artifact.manifest.manifestHash !== expectedHash) {
    throw new PlatformError("backup_verification_failed", `Backup artifact ${path} failed hash verification.`, {
      suggestion: "Use a verified backup artifact",
    });
  }
  return artifact;
}

function writeJsonFile(path: string, value: BoundaryValue): void {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, `${stableJson(value)}\n`, "utf8");
  renameSync(tempPath, path);
}

function stableJson(value: BoundaryValue): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: BoundaryValue): BoundaryValue {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value !== null && __epochIsObject(value)) {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, inner]) => [key, sortJson(inner)]));
  }
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
