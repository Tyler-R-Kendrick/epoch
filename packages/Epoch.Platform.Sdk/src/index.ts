import type * as Core from "@epoch/platform-core";

export class EpochPlatformSdk {
  readonly capabilities;
  readonly organizations;
  readonly projects;
  readonly repositories;
  readonly environments;
  readonly deployables;
  readonly identity;
  readonly deployments;
  readonly jobs;
  readonly operations;
  readonly runners;
  readonly backups;
  readonly restores;
  readonly ha;
  readonly secrets;
  readonly incidents;
  readonly ai;
  readonly issues;
  readonly reviews;
  readonly packages;
  readonly search;
  readonly observability;
  readonly infrastructure;
  readonly resources;
  readonly templates;
  readonly configuration;
  readonly api;
  readonly events;
  readonly compliance;
  readonly tenants;
  readonly community;
  readonly snapshots;
  readonly audit;

  constructor(private readonly core: Core.EpochPlatformCore) {
    this.capabilities = {
      get: (key: string) => this.core.capability(key),
    };
    this.organizations = {
      create: (input: Core.CreateOrganizationInput) => this.core.createOrganization(input),
    };
    this.projects = {
      create: (input: Core.CreateProjectInput) => this.core.createProject(input),
      overview: (projectId: string) => this.core.projectOverview(projectId),
    };
    this.repositories = {
      create: (input: Core.CreateRepositoryInput) => this.core.createRepository(input),
    };
    this.environments = {
      create: (input: Core.CreateEnvironmentInput) => this.core.createEnvironment(input),
    };
    this.deployables = {
      create: (input: Core.CreateDeployableInput) => this.core.createDeployable(input),
      discover: (input: Core.DiscoverDeployableInput) => this.core.discoverDeployable(input),
      get: (deployableId: string) => this.core.getDeployable(deployableId),
    };
    this.identity = {
      createUser: (input: Core.CreateUserInput) => this.core.createUser(input),
      configureSsoProvider: (input: Core.ConfigureSsoProviderInput) => this.core.configureSsoProvider(input),
      provisionScimUser: (input: Core.ProvisionScimUserInput) => this.core.provisionScimUser(input),
      createServiceAccount: (input: Core.CreateServiceAccountInput) => this.core.createServiceAccount(input),
      getServiceAccount: (serviceAccountId: string) => this.core.getServiceAccount(serviceAccountId),
      issueApiToken: (input: Core.IssueApiTokenInput) => this.core.issueApiToken(input),
      getApiToken: (tokenId: string) => this.core.getApiToken(tokenId),
      revokeApiToken: (tokenId: string) => this.core.revokeApiToken(tokenId),
      openSession: (input: Core.OpenSessionInput) => this.core.openSession(input),
      getSession: (sessionId: string) => this.core.getSession(sessionId),
      revokeSession: (sessionId: string) => this.core.revokeSession(sessionId),
      createTeam: (input: Core.CreateTeamInput) => this.core.createTeam(input),
      addUserToTeam: (input: Core.AddUserToTeamInput) => this.core.addUserToTeam(input),
      grantTeamRole: (input: Core.GrantTeamRoleInput) => this.core.grantTeamRole(input),
    };
    this.deployments = {
      createPlan: (input: Core.CreateDeployPlanInput) => this.core.createDeployPlan(input),
      editPlan: (planId: string, input: Core.EditDeployPlanInput) => this.core.editDeployPlan(planId, input),
      cancelPlan: (planId: string, input: Core.CancelDeployPlanInput) => this.core.cancelDeployPlan(planId, input),
      approvePlan: (planId: string, input: Core.ApproveDeployPlanInput) => this.core.approveDeployPlan(planId, input),
      executePlan: (planId: string) => this.core.executeDeployPlan(planId),
      promote: (deploymentId: string, input: Core.PromoteDeploymentInput) => this.core.promoteDeployment(deploymentId, input),
      rollback: (deploymentId: string, input: Core.RollbackDeploymentInput) => this.core.rollbackDeployment(deploymentId, input),
      logs: (deploymentId: string) => this.core.deploymentLogs(deploymentId),
    };
    this.jobs = {
      get: (jobId: string) => this.core.getJob(jobId),
      schedule: (input: Core.SchedulePlatformJobInput) => this.core.schedulePlatformJob(input),
      getPlatformJob: (jobId: string) => this.core.getPlatformJob(jobId),
      retry: (jobId: string) => this.core.retryPlatformJob(jobId),
      reconcileRunnerLoss: (jobId: string) => this.core.reconcileRunnerLoss(jobId),
    };
    this.operations = {
      firstRunReadiness: () => this.core.firstRunReadiness(),
      dashboard: () => this.core.operatorDashboard(),
      supportBundle: () => this.core.supportBundle(),
    };
    this.runners = {
      register: (input: Core.RegisterRunnerInput) => this.core.registerRunner(input),
      getByName: (name: string) => this.core.getRunnerByName(name),
      heartbeat: (input: Core.RunnerHeartbeatInput) => this.core.runnerHeartbeat(input),
      quarantine: (input: Core.QuarantineRunnerInput) => this.core.quarantineRunner(input),
    };
    this.backups = {
      configureDestination: (input: Core.ConfigureBackupDestinationInput) => this.core.configureBackupDestination(input),
      start: (input: Core.StartBackupInput) => this.core.startBackup(input),
      get: (backupId: string) => this.core.getBackup(backupId),
      verify: (backupId: string) => this.core.verifyBackup(backupId),
    };
    this.restores = {
      dryRun: (input: Core.RestoreDryRunInput) => this.core.restoreDryRun(input),
    };
    this.ha = {
      declareProfile: (input: Core.DeclareHaProfileInput) => this.core.declareHaProfile(input),
      runFailoverDrill: (input: Core.RunFailoverDrillInput) => this.core.runFailoverDrill(input),
    };
    this.secrets = {
      create: (input: Core.CreateSecretInput) => this.core.createSecret(input),
      findByName: (name: string) => this.core.findSecretByName(name),
      rotate: (secretId: string, input: Core.RotateSecretInput) => this.core.rotateSecret(secretId, input),
      grantAccess: (secretId: string, input: Core.GrantSecretAccessInput) => this.core.grantSecretAccess(secretId, input),
      readReference: (secretId: string, input: Core.ReadSecretReferenceInput) => this.core.readSecretReference(secretId, input),
    };
    this.incidents = {
      markDeploymentDegraded: (deploymentId: string, input: Core.MarkDeploymentDegradedInput) => this.core.markDeploymentDegraded(deploymentId, input),
      markDeploymentFailed: (deploymentId: string, input: Core.MarkDeploymentFailedInput) => this.core.markDeploymentFailed(deploymentId, input),
      acknowledge: (incidentId: string, input: Core.AcknowledgeIncidentInput) => this.core.acknowledgeIncident(incidentId, input),
      createFollowUpIssue: (incidentId: string, input: Core.CreateIncidentFollowUpIssueInput) => this.core.createIncidentFollowUpIssue(incidentId, input),
    };
    this.ai = {
      createActionPlan: (input: Core.CreateAiActionPlanInput) => this.core.createAiActionPlan(input),
      approveActionPlan: (planId: string, input: Core.ApproveAiActionPlanInput) => this.core.approveAiActionPlan(planId, input),
      executeActionPlan: (planId: string) => this.core.executeAiActionPlan(planId),
      createContextPack: (input: Core.CreateAiContextPackInput) => this.core.createAiContextPack(input),
      requestTool: (input: Core.RequestAiToolInput) => this.core.requestAiTool(input),
      recordEvaluation: (input: Core.RecordAiEvaluationInput) => this.core.recordAiEvaluation(input),
    };
    this.issues = {
      create: (input: Core.CreateIssueInput) => this.core.createIssue(input),
      get: (issueId: string) => this.core.getIssue(issueId),
    };
    this.reviews = {
      createIntent: (input: Core.CreateReviewIntentInput) => this.core.createReviewIntent(input),
      recordCheck: (reviewIntentId: string, input: Core.RecordReviewCheckInput) => this.core.recordReviewCheck(reviewIntentId, input),
      summarizeWithAi: (reviewIntentId: string) => this.core.summarizeReviewIntentWithAi(reviewIntentId),
      approve: (reviewIntentId: string, input: Core.ApproveReviewIntentInput) => this.core.approveReviewIntent(reviewIntentId, input),
      merge: (reviewIntentId: string) => this.core.mergeReviewIntent(reviewIntentId),
    };
    this.packages = {
      publish: (input: Core.PublishPackageInput) => this.core.publishPackage(input),
      list: () => this.core.listPackages(),
    };
    this.search = {
      query: (query: string) => this.core.search(query),
    };
    this.observability = {
      summary: () => this.core.observabilitySummary(),
    };
    this.infrastructure = {
      connectTarget: (input: Core.ConnectInfrastructureTargetInput) => this.core.connectInfrastructureTarget(input),
      getTarget: (targetId: string) => this.core.getInfrastructureTarget(targetId),
    };
    this.resources = {
      provision: (input: Core.ProvisionResourceInput) => this.core.provisionResource(input),
    };
    this.templates = {
      create: (input: Core.CreateTemplateInput) => this.core.createTemplate(input),
      list: () => this.core.listTemplates(),
    };
    this.configuration = {
      load: (input: Core.LoadPlatformConfigurationInput) => this.core.loadConfiguration(input),
    };
    this.api = {
      openRequest: (input: Core.OpenApiRequestInput) => this.core.openApiRequest(input),
      completeRequest: (correlationId: string) => this.core.completeApiRequest(correlationId),
      registerWebhookEndpoint: (input: Core.RegisterWebhookEndpointInput) => this.core.registerWebhookEndpoint(input),
      verifyWebhook: (input: Core.VerifyWebhookInput) => this.core.verifyWebhook(input),
      sampleError: (input: Core.SampleTypedErrorInput) => this.core.sampleTypedError(input),
    };
    this.events = {
      stream: (input: Core.StreamPlatformEventsInput) => this.core.streamEvents(input),
    };
    this.compliance = {
      setAuditRetention: (input: Core.SetAuditRetentionInput) => this.core.setAuditRetention(input),
      report: () => this.core.complianceReport(),
      exportAudit: () => this.core.exportAudit(),
    };
    this.tenants = {
      export: (input: Core.ExportTenantInput) => this.core.exportTenant(input),
      deleteExport: (input: Core.DeleteTenantExportInput) => this.core.deleteTenantExport(input),
    };
    this.community = {
      enable: (input?: Core.EnableCommunityInput) => this.core.enableCommunity(input),
      reviewVisibilityPolicy: (input: Core.ReviewCommunityVisibilityPolicyInput) => this.core.reviewCommunityVisibilityPolicy(input),
      status: () => this.core.communityStatus(),
      publishProject: (input: Core.PublishCommunityProjectInput) => this.core.publishCommunityProject(input),
      approveProject: (projectId: string, input: Core.ApproveCommunityProjectInput) => this.core.approveCommunityProject(projectId, input),
      createProfile: (input: Core.CreatePublicProfileInput) => this.core.createPublicProfile(input),
      getProfile: (profileId: string) => this.core.getPublicProfile(profileId),
      getProjectBySlug: (publicSlug: string) => this.core.getCommunityProjectBySlug(publicSlug),
      followProject: (input: Core.FollowCommunityProjectInput) => this.core.followCommunityProject(input),
      starProject: (input: Core.StarCommunityProjectInput) => this.core.starCommunityProject(input),
      bookmarkProject: (input: Core.BookmarkCommunityProjectInput) => this.core.bookmarkCommunityProject(input),
      openDiscussion: (input: Core.OpenCommunityDiscussionInput) => this.core.openCommunityDiscussion(input),
      getDiscussion: (discussionId: string) => this.core.getCommunityDiscussion(discussionId),
      reportDiscussion: (input: Core.ReportCommunityDiscussionInput) => this.core.reportCommunityDiscussion(input),
      resolveReport: (reportId: string, input: Core.ResolveCommunityReportInput) => this.core.resolveCommunityReport(reportId, input),
      moderationQueue: () => this.core.communityModerationQueue(),
      feed: () => this.core.communityFeed(),
      personalizedFeed: (input?: Core.PersonalizedCommunityFeedInput) => this.core.personalizedCommunityFeed(input),
      addTopic: (projectId: string, input: Core.AddCommunityTopicInput) => this.core.addCommunityTopic(projectId, input),
      addShowcaseAsset: (projectId: string, input: Core.AddShowcaseAssetInput) => this.core.addShowcaseAsset(projectId, input),
      publishRelease: (projectId: string, input: Core.PublishCommunityReleaseInput) => this.core.publishCommunityRelease(projectId, input),
      recordContribution: (input: Core.RecordCommunityContributionInput) => this.core.recordCommunityContribution(input),
      search: (input: Core.SearchCommunityInput) => this.core.searchCommunity(input),
      takeDownDiscussion: (discussionId: string, input: Core.TakeDownCommunityDiscussionInput) => this.core.takeDownCommunityDiscussion(discussionId, input),
      blockProfile: (input: Core.BlockPublicProfileInput) => this.core.blockPublicProfile(input),
      exportLegalHold: (input: Core.ExportCommunityLegalHoldInput) => this.core.exportCommunityLegalHold(input),
      workerStatus: () => this.core.communityWorkerStatus(),
    };
    this.snapshots = {
      export: () => this.core.exportSnapshot(),
    };
    this.audit = {
      latest: () => this.core.latestAuditEvent(),
    };
  }
}

export { PlatformError } from "@epoch/platform-core";
export type * from "@epoch/platform-core";
