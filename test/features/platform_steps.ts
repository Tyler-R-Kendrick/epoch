import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { isString } from "../helpers/type-guards";
import {
  createInMemoryPlatformCore,
  PlatformError,
  signWebhookPayload,
  type AiActionPlan,
  type Deployment,
  type DeployJob,
  type DeployPlan,
  type FirstRunReadiness,
  type IncidentDiagnosis,
  type ObservabilitySummary,
  type PlatformSearchResult,
  type PlatformSnapshot,
  type PublicCommunityDiscussion,
  type PublicCommunityProject,
  type ReviewIntent,
} from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

interface PlatformScenarioState {
  sdk?: EpochPlatformSdk;
  organizationIds: Record<string, string>;
  projectIds: Record<string, string>;
  repositoryIds: Record<string, string>;
  environmentIds: Record<string, string>;
  deployableIds: Record<string, string>;
  userIds: Record<string, string>;
  teamIds: Record<string, string>;
  issueIds: Record<string, string>;
  profileIds: Record<string, string>;
  discussionIds: Record<string, string>;
  serviceAccountIds: Record<string, string>;
  tokenIds: Record<string, string>;
  sessionIds: Record<string, string>;
  infrastructureTargetIds: Record<string, string>;
  resourceIds: Record<string, string>;
  templateIds: Record<string, string>;
  platformJobIds: Record<string, string>;
  backupIds: Record<string, string>;
  webhookSecrets: Record<string, string>;
  deployPlan?: DeployPlan;
  previousDeployPlanId?: string;
  deployment?: Deployment;
  readiness?: FirstRunReadiness;
  deployJob?: DeployJob;
  incidentDiagnosis?: IncidentDiagnosis;
  aiPlan?: AiActionPlan;
  communityProject?: PublicCommunityProject;
  discussion?: PublicCommunityDiscussion;
  reviewIntent?: ReviewIntent;
  searchResults?: PlatformSearchResult[];
  observability?: ObservabilitySummary;
  snapshot?: PlatformSnapshot;
  apiRequest?: { correlationId: string; idempotencyKey: string };
  apiResponse?: { correlationId: string; auditEventId?: string };
  platformEvents?: Array<{ type: string }>;
  secretAccess?: { name: string; plaintext?: string };
  auditExport?: Array<{ type: string }>;
  complianceReport?: { findings: string[] };
  tenantExport?: { slug: string; projectSlugs: string[]; deleted: boolean };
  configurationWarnings?: string[];
  promotion?: { state: string };
  aiContext?: { body: string; citations: string[] };
  aiToolRequest?: { tool: string; requiresApproval: boolean };
  aiEvaluation?: { name: string; passed: boolean };
  failure?: { classification: string; recoveryActions: string[] };
  dashboard?: { serviceHealth: string; backupFreshness: string; runnerCapacity: number };
  supportBundle?: { sections: string[]; body: string };
  restoreDryRun?: { status: string };
  haProfile?: { rpo: string; rto: string };
  failoverDrill?: { name: string; status: string };
  communitySearchResults?: Array<{ publicSlug: string }>;
  legalHold?: { discussions: Array<string | { title: string }> };
  error?: Error;
}

let platformState: PlatformScenarioState;

function resetPlatformState(): void {
  platformState = {
    organizationIds: {},
    projectIds: {},
    repositoryIds: {},
    environmentIds: {},
    deployableIds: {},
    userIds: {},
    teamIds: {},
    issueIds: {},
    profileIds: {},
    discussionIds: {},
    serviceAccountIds: {},
    tokenIds: {},
    sessionIds: {},
    infrastructureTargetIds: {},
    resourceIds: {},
    templateIds: {},
    platformJobIds: {},
    backupIds: {},
    webhookSecrets: {},
  };
}

function sdk(): EpochPlatformSdk {
  assert.ok(platformState.sdk);
  return platformState.sdk;
}

function rememberError(action: () => void): void {
  platformState.error = undefined;
  try {
    action();
  } catch (error) {
    // SAFETY: Runtime checks or construction above establish Error.
    platformState.error = error as Error;
  }
}

Given("an Epoch Platform instance with Community disabled", function () {
  resetPlatformState();
  platformState.sdk = new EpochPlatformSdk(createInMemoryPlatformCore({ communityEnabled: false }));
});

When("I create organization {string} through the platform SDK", function (slug: string) {
  const organization = sdk().organizations.create({ slug, displayName: slug });
  platformState.organizationIds[slug] = organization.id;
});

When("I create project {string} in organization {string}", function (slug: string, organizationSlug: string) {
  const organizationId = platformState.organizationIds[organizationSlug];
  assert.ok(organizationId);
  const project = sdk().projects.create({ organizationId, slug, displayName: slug });
  platformState.projectIds[slug] = project.id;
});

When("I create repository {string} in project {string}", function (slug: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  const repository = sdk().repositories.create({ projectId, slug, visibility: "private" });
  platformState.repositoryIds[slug] = repository.id;
});

When("I create protected environment {string} in project {string}", function (name: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  const environment = sdk().environments.create({ projectId, name, type: "production", protected: true });
  platformState.environmentIds[name] = environment.id;
});

When("I create deployable {string} from repository {string} for project {string}", function (name: string, repositorySlug: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  const repositoryId = platformState.repositoryIds[repositorySlug];
  assert.ok(projectId);
  assert.ok(repositoryId);
  const deployable = sdk().deployables.create({
    projectId,
    name,
    kind: "app",
    source: { repositoryId },
  });
  platformState.deployableIds[name] = deployable.id;
});

When("I generate a deploy plan for deployable {string} to environment {string}", function (deployableName: string, environmentName: string) {
  const deployableId = platformState.deployableIds[deployableName];
  const environmentId = platformState.environmentIds[environmentName];
  assert.ok(deployableId);
  assert.ok(environmentId);
  platformState.deployPlan = sdk().deployments.createPlan({ deployableId, environmentId });
});

When("I try to execute the deploy plan", function () {
  const plan = platformState.deployPlan;
  assert.ok(plan);
  rememberError(() => sdk().deployments.executePlan(plan.id));
});

When("I approve the deploy plan as {string}", function (actor: string) {
  assert.ok(platformState.deployPlan);
  platformState.deployPlan = sdk().deployments.approvePlan(platformState.deployPlan.id, { actor });
});

When("I try to approve the deploy plan as {string}", function (actor: string) {
  const plan = platformState.deployPlan;
  assert.ok(plan);
  rememberError(() => {
    platformState.deployPlan = sdk().deployments.approvePlan(plan.id, { actor });
  });
});

When("I execute the deploy plan", function () {
  assert.ok(platformState.deployPlan);
  platformState.deployment = sdk().deployments.executePlan(platformState.deployPlan.id);
});

When("I try to publish project {string} to Community as {string}", function (projectSlug: string, publicSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  rememberError(() => {
    platformState.communityProject = sdk().community.publishProject({ projectId, publicSlug, summary: "Epoch platform showcase" });
  });
});

When("I enable Community through the platform SDK", function () {
  sdk().community.enable();
});

When("I publish project {string} to Community as {string}", function (projectSlug: string, publicSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  platformState.communityProject = sdk().community.publishProject({ projectId, publicSlug, summary: "Epoch platform showcase" });
});

When("I try to create public profile {string}", function (handle: string) {
  rememberError(() => sdk().community.createProfile({ handle, displayName: handle }));
});

When("I inspect platform first-run readiness", function () {
  platformState.readiness = sdk().operations.firstRunReadiness();
});

When("I register runner {string} with capacity {int}", function (name: string, capacity: number) {
  sdk().runners.register({ name, capacity });
});

When("I create platform user {string}", function (handle: string) {
  const user = sdk().identity.createUser({ handle, displayName: handle });
  platformState.userIds[handle] = user.id;
});

When("I create platform user {string} with email {string}", function (handle: string, primaryEmail: string) {
  const user = sdk().identity.createUser({ handle, displayName: handle, primaryEmail });
  platformState.userIds[handle] = user.id;
});

When("I create platform team {string} in organization {string}", function (name: string, organizationSlug: string) {
  const organizationId = platformState.organizationIds[organizationSlug];
  assert.ok(organizationId);
  const team = sdk().identity.createTeam({ organizationId, name });
  platformState.teamIds[name] = team.id;
});

When("I add user {string} to team {string}", function (handle: string, teamName: string) {
  const userId = platformState.userIds[handle];
  const teamId = platformState.teamIds[teamName];
  assert.ok(userId);
  assert.ok(teamId);
  sdk().identity.addUserToTeam({ userId, teamId });
});

When("I grant team {string} role {string} on environment {string}", function (teamName: string, role: string, environmentName: string) {
  const teamId = platformState.teamIds[teamName];
  const resourceId = platformState.environmentIds[environmentName];
  assert.ok(teamId);
  assert.ok(resourceId);
  sdk().identity.grantTeamRole({ teamId, role, resourceType: "environment", resourceId });
});

When("I configure backup destination {string}", function (uri: string) {
  sdk().backups.configureDestination({ uri });
});

When("I configure SSO provider {string} with protocol {string}", function (name: string, protocol: string) {
  sdk().identity.configureSsoProvider({ name, protocol });
});

When("I provision SCIM user {string} with group {string}", function (handle: string, group: string) {
  const user = sdk().identity.provisionScimUser({ handle, group });
  platformState.userIds[handle] = user.id;
});

When("I create service account {string} with scopes {string}", function (name: string, scopes: string) {
  const organizationId = Object.values(platformState.organizationIds)[0];
  assert.ok(organizationId);
  const serviceAccount = sdk().identity.createServiceAccount({
    organizationId,
    name,
    scopes: scopes.split(",").map((scope) => scope.trim()),
  });
  platformState.serviceAccountIds[name] = serviceAccount.id;
});

When("I issue API token {string} for service account {string}", function (name: string, serviceAccountName: string) {
  const serviceAccountId = platformState.serviceAccountIds[serviceAccountName];
  assert.ok(serviceAccountId);
  const token = sdk().identity.issueApiToken({ serviceAccountId, name });
  platformState.tokenIds[name] = token.id;
});

When("I open session {string} for user {string}", function (name: string, handle: string) {
  const userId = platformState.userIds[handle];
  assert.ok(userId);
  const session = sdk().identity.openSession({ userId, name });
  platformState.sessionIds[name] = session.id;
});

When("I revoke API token {string}", function (name: string) {
  const tokenId = platformState.tokenIds[name];
  assert.ok(tokenId);
  sdk().identity.revokeApiToken(tokenId);
});

When("I revoke session {string}", function (name: string) {
  const sessionId = platformState.sessionIds[name];
  assert.ok(sessionId);
  sdk().identity.revokeSession(sessionId);
});

When("I open API request {string} with idempotency key {string}", function (correlationId: string, idempotencyKey: string) {
  platformState.apiRequest = { correlationId, idempotencyKey };
  platformState.apiResponse = sdk().api.openRequest({ correlationId, idempotencyKey });
});

When("I generate an idempotent deploy plan for deployable {string} to environment {string}", function (deployableName: string, environmentName: string) {
  const deployableId = platformState.deployableIds[deployableName];
  const environmentId = platformState.environmentIds[environmentName];
  assert.ok(deployableId);
  assert.ok(environmentId);
  assert.ok(platformState.apiRequest);
  const plan = sdk().deployments.createPlan({ deployableId, environmentId, idempotencyKey: platformState.apiRequest.idempotencyKey });
  platformState.previousDeployPlanId ??= plan.id;
  platformState.deployPlan = plan;
  platformState.apiResponse = sdk().api.completeRequest(platformState.apiRequest.correlationId);
});

When("I register webhook endpoint {string} with secret {string}", function (name: string, secret: string) {
  sdk().api.registerWebhookEndpoint({ name, secret });
  platformState.webhookSecrets[name] = secret;
});

When("I read the platform event stream from cursor {string}", function (cursor: string) {
  platformState.platformEvents = sdk().events.stream({ cursor });
});

When("I rotate secret reference {string} with value {string}", function (name: string, value: string) {
  const secret = sdk().secrets.findByName(name);
  sdk().secrets.rotate(secret.id, { value });
});

When("I grant secret {string} access to service account {string}", function (secretName: string, serviceAccountName: string) {
  const secret = sdk().secrets.findByName(secretName);
  const serviceAccountId = platformState.serviceAccountIds[serviceAccountName];
  assert.ok(serviceAccountId);
  sdk().secrets.grantAccess(secret.id, { serviceAccountId });
});

When("service account {string} reads secret reference {string}", function (serviceAccountName: string, secretName: string) {
  const secret = sdk().secrets.findByName(secretName);
  const serviceAccountId = platformState.serviceAccountIds[serviceAccountName];
  assert.ok(serviceAccountId);
  platformState.secretAccess = sdk().secrets.readReference(secret.id, { serviceAccountId });
});

When("I set audit retention policy to {string}", function (retention: string) {
  sdk().compliance.setAuditRetention({ retention });
});

When("I generate compliance report", function () {
  platformState.complianceReport = sdk().compliance.report();
});

When("I export tenant {string}", function (organizationSlug: string) {
  const organizationId = platformState.organizationIds[organizationSlug];
  assert.ok(organizationId);
  platformState.tenantExport = sdk().tenants.export({ organizationId });
});

When("I request typed error sample {string}", function (code: string) {
  rememberError(() => sdk().api.sampleError({ code }));
});

When("I delete tenant export {string}", function (organizationSlug: string) {
  platformState.tenantExport = sdk().tenants.deleteExport({ organizationSlug });
});

When("I add secret reference {string} with value {string} to environment {string}", function (name: string, value: string, environmentName: string) {
  const environmentId = platformState.environmentIds[environmentName];
  assert.ok(environmentId);
  sdk().secrets.create({ environmentId, name, value });
});

When("I mark the latest deployment degraded with reason {string}", function (reason: string) {
  assert.ok(platformState.deployment);
  platformState.incidentDiagnosis = sdk().incidents.markDeploymentDegraded(platformState.deployment.id, { reason });
});

When("I mark the latest deployment failed with class {string}", function (failureClass: string) {
  assert.ok(platformState.deployment);
  const incident = sdk().incidents.markDeploymentFailed(platformState.deployment.id, { failureClass });
  platformState.incidentDiagnosis = incident;
  platformState.failure = incident.failure;
});

When("I acknowledge the incident as {string}", function (actor: string) {
  assert.ok(platformState.incidentDiagnosis);
  platformState.incidentDiagnosis = sdk().incidents.acknowledge(platformState.incidentDiagnosis.id, { actor });
});

When("I create follow-up issue {string} from the incident", function (title: string) {
  assert.ok(platformState.incidentDiagnosis);
  const issue = sdk().incidents.createFollowUpIssue(platformState.incidentDiagnosis.id, { title });
  platformState.issueIds[title] = issue.id;
});

When("I roll back the latest deployment as {string}", function (actor: string) {
  assert.ok(platformState.deployment);
  platformState.deployment = sdk().deployments.rollback(platformState.deployment.id, { actor });
});

When("I ask AI to {string} for project {string}", function (action: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  platformState.aiPlan = sdk().ai.createActionPlan({ projectId, action });
});

When("I create AI context pack for actor {string} scoped to project {string} with sources {string}", function (actor: string, projectSlug: string, sources: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  platformState.aiContext = sdk().ai.createContextPack({
    actor,
    projectId,
    sources: sources.split(",").map((source) => source.trim()),
  });
});

When("I request AI tool {string} for project {string}", function (tool: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  platformState.aiToolRequest = sdk().ai.requestTool({ tool, projectId });
});

When("I try AI tool {string} for project {string}", function (tool: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  rememberError(() => sdk().ai.requestTool({ tool, projectId }));
});

When("I record AI evaluation {string} with score {int}", function (name: string, score: number) {
  platformState.aiEvaluation = sdk().ai.recordEvaluation({ name, score });
});

When("I try to execute the AI plan", function () {
  const plan = platformState.aiPlan;
  assert.ok(plan);
  rememberError(() => sdk().ai.executeActionPlan(plan.id));
});

When("I approve the AI plan as {string}", function (actor: string) {
  assert.ok(platformState.aiPlan);
  platformState.aiPlan = sdk().ai.approveActionPlan(platformState.aiPlan.id, { actor });
});

When("I execute the AI plan", function () {
  assert.ok(platformState.aiPlan);
  platformState.aiPlan = sdk().ai.executeActionPlan(platformState.aiPlan.id);
});

When("I approve the Community project as moderator {string}", function (moderator: string) {
  assert.ok(platformState.communityProject);
  platformState.communityProject = sdk().community.approveProject(platformState.communityProject.id, { moderator });
});

When("I connect infrastructure target {string} kind {string} in region {string}", function (name: string, kind: string, region: string) {
  const organizationId = Object.values(platformState.organizationIds)[0];
  assert.ok(organizationId);
  const target = sdk().infrastructure.connectTarget({ organizationId, name, kind, region });
  platformState.infrastructureTargetIds[name] = target.id;
});

When("I provision resource {string} kind {string} provider {string} in environment {string}", function (name: string, kind: string, provider: string, environmentName: string) {
  const projectId = Object.values(platformState.projectIds)[0];
  const environmentId = platformState.environmentIds[environmentName];
  assert.ok(projectId);
  assert.ok(environmentId);
  const resource = sdk().resources.provision({ projectId, environmentId, name, kind, provider });
  platformState.resourceIds[name] = resource.id;
});

When("I discover deployable {string} from repository {string} manifest {string} with runtime {string}", function (name: string, repositorySlug: string, manifestPath: string, runtime: string) {
  const projectId = Object.values(platformState.projectIds)[0];
  const repositoryId = platformState.repositoryIds[repositorySlug];
  assert.ok(projectId);
  assert.ok(repositoryId);
  const deployable = sdk().deployables.discover({ projectId, repositoryId, manifestPath, name, runtime, kind: "app" });
  platformState.deployableIds[name] = deployable.id;
});

When("I create template {string} for deployable kind {string}", function (name: string, kind: string) {
  const template = sdk().templates.create({ name, kind });
  platformState.templateIds[name] = template.id;
});

When("I generate a dry-run deploy plan for deployable {string} to environment {string}", function (deployableName: string, environmentName: string) {
  const deployableId = platformState.deployableIds[deployableName];
  const environmentId = platformState.environmentIds[environmentName];
  assert.ok(deployableId);
  assert.ok(environmentId);
  platformState.deployPlan = sdk().deployments.createPlan({ deployableId, environmentId, dryRun: true, idempotencyKey: platformState.apiRequest?.idempotencyKey });
});

When("I edit deploy plan runtime variable {string} to {string}", function (name: string, value: string) {
  assert.ok(platformState.deployPlan);
  platformState.deployPlan = sdk().deployments.editPlan(platformState.deployPlan.id, { runtimeVariables: { [name]: value } });
});

When("I cancel the deploy plan as {string}", function (actor: string) {
  assert.ok(platformState.deployPlan);
  platformState.deployPlan = sdk().deployments.cancelPlan(platformState.deployPlan.id, { actor });
});

When("I promote the latest deployment to environment {string}", function (environmentName: string) {
  assert.ok(platformState.deployment);
  const environmentId = platformState.environmentIds[environmentName];
  assert.ok(environmentId);
  platformState.promotion = sdk().deployments.promote(platformState.deployment.id, { environmentId });
});

When("I schedule platform job {string} with idempotency key {string}", function (name: string, idempotencyKey: string) {
  const job = sdk().jobs.schedule({ name, type: "maintenance", idempotencyKey });
  platformState.platformJobIds[name] = job.id;
});

When("runner {string} sends heartbeat", function (runnerName: string) {
  sdk().runners.heartbeat({ name: runnerName });
});

When("I quarantine runner {string} for reason {string}", function (runnerName: string, reason: string) {
  sdk().runners.quarantine({ name: runnerName, reason });
});

When("I retry platform job {string}", function (name: string) {
  const jobId = platformState.platformJobIds[name];
  assert.ok(jobId);
  sdk().jobs.retry(jobId);
});

When("I reconcile runner loss for job {string}", function (name: string) {
  const jobId = platformState.platformJobIds[name];
  assert.ok(jobId);
  sdk().jobs.reconcileRunnerLoss(jobId);
});

When("I load platform configuration with unknown section {string}", function (section: string) {
  platformState.configurationWarnings = sdk().configuration.load({ [section]: {} }).warnings;
});

When("I try to load invalid platform configuration section {string}", function (section: string) {
  rememberError(() => sdk().configuration.load({ [section]: { invalid: true } }));
});

When("I create issue {string} in project {string}", function (title: string, projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  const issue = sdk().issues.create({ projectId, title });
  platformState.issueIds[title] = issue.id;
});

When("I create review intent {string} for repository {string} linked to issue {string}", function (title: string, repositorySlug: string, issueTitle: string) {
  const repositoryId = platformState.repositoryIds[repositorySlug];
  const issueId = platformState.issueIds[issueTitle];
  assert.ok(repositoryId);
  assert.ok(issueId);
  platformState.reviewIntent = sdk().reviews.createIntent({ repositoryId, title, issueId });
});

When("I record check {string} with status {string} on the review intent", function (name: string, status: string) {
  assert.ok(platformState.reviewIntent);
  platformState.reviewIntent = sdk().reviews.recordCheck(platformState.reviewIntent.id, { name, status });
});

When("I ask AI to summarize the review intent", function () {
  assert.ok(platformState.reviewIntent);
  platformState.reviewIntent = sdk().reviews.summarizeWithAi(platformState.reviewIntent.id);
});

When("I approve the review intent as {string}", function (actor: string) {
  assert.ok(platformState.reviewIntent);
  platformState.reviewIntent = sdk().reviews.approve(platformState.reviewIntent.id, { actor });
});

When("I merge the review intent", function () {
  assert.ok(platformState.reviewIntent);
  platformState.reviewIntent = sdk().reviews.merge(platformState.reviewIntent.id);
});

When("I publish package {string} version {string} from the latest deployment", function (name: string, version: string) {
  assert.ok(platformState.deployment);
  sdk().packages.publish({ name, version, deploymentId: platformState.deployment.id });
});

When("I search the platform for {string}", function (query: string) {
  platformState.searchResults = sdk().search.query(query);
});

When("I inspect observability summary", function () {
  platformState.observability = sdk().observability.summary();
});

When("I create public profile {string}", function (handle: string) {
  const profile = sdk().community.createProfile({ handle, displayName: handle });
  platformState.profileIds[handle] = profile.id;
});

When("public profile {string} follows Community project {string}", function (handle: string, publicSlug: string) {
  const profileId = platformState.profileIds[handle];
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  assert.ok(profileId);
  platformState.communityProject = sdk().community.followProject({ profileId, communityProjectId: communityProject.id });
});

When("public profile {string} stars Community project {string}", function (handle: string, publicSlug: string) {
  const profileId = platformState.profileIds[handle];
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  assert.ok(profileId);
  platformState.communityProject = sdk().community.starProject({ profileId, communityProjectId: communityProject.id });
});

When("public profile {string} opens discussion {string} on Community project {string}", function (handle: string, title: string, publicSlug: string) {
  const profileId = platformState.profileIds[handle];
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  assert.ok(profileId);
  platformState.discussion = sdk().community.openDiscussion({ profileId, communityProjectId: communityProject.id, title });
  platformState.discussionIds[title] = platformState.discussion.id;
});

When("public profile {string} tries to open discussion {string} on Community project {string}", function (handle: string, title: string, publicSlug: string) {
  const profileId = platformState.profileIds[handle];
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  assert.ok(profileId);
  rememberError(() => sdk().community.openDiscussion({ profileId, communityProjectId: communityProject.id, title }));
});

When("I add Community topic {string} to project {string}", function (topic: string, publicSlug: string) {
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  platformState.communityProject = sdk().community.addTopic(communityProject.id, { topic });
});

When("I add showcase asset {string} to Community project {string}", function (asset: string, publicSlug: string) {
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  platformState.communityProject = sdk().community.addShowcaseAsset(communityProject.id, { asset });
});

When("I publish Community release {string} for project {string}", function (version: string, publicSlug: string) {
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  platformState.communityProject = sdk().community.publishRelease(communityProject.id, { version });
});

When("public profile {string} contributes to Community project {string}", function (handle: string, publicSlug: string) {
  const profileId = platformState.profileIds[handle];
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  assert.ok(profileId);
  sdk().community.recordContribution({ profileId, communityProjectId: communityProject.id });
});

When("I search Community for {string}", function (query: string) {
  platformState.communitySearchResults = sdk().community.search({ query });
});

When("moderator {string} takes down discussion {string} for reason {string}", function (moderator: string, title: string, reason: string) {
  const discussionId = platformState.discussionIds[title];
  assert.ok(discussionId);
  platformState.discussion = sdk().community.takeDownDiscussion(discussionId, { moderator, reason });
});

When("public profile {string} blocks public profile {string}", function (handle: string, blockedHandle: string) {
  const profileId = platformState.profileIds[handle];
  const blockedProfileId = platformState.profileIds[blockedHandle] ?? blockedHandle;
  assert.ok(profileId);
  sdk().community.blockProfile({ profileId, blockedProfileId });
});

When("I export Community legal hold for project {string}", function (publicSlug: string) {
  const communityProject = sdk().community.getProjectBySlug(publicSlug);
  platformState.legalHold = sdk().community.exportLegalHold({ communityProjectId: communityProject.id });
});

When("I report discussion {string} for reason {string}", function (title: string, reason: string) {
  const discussionId = platformState.discussionIds[title];
  assert.ok(discussionId);
  sdk().community.reportDiscussion({ discussionId, reason });
});

When("moderator {string} resolves report for discussion {string}", function (moderator: string, title: string) {
  const discussionId = platformState.discussionIds[title];
  assert.ok(discussionId);
  const report = sdk().community.moderationQueue().find((item) => item.discussionId === discussionId);
  assert.ok(report);
  sdk().community.resolveReport(report.id, { moderator });
});

When("I export a platform snapshot", function () {
  platformState.snapshot = sdk().snapshots.export();
});

When("I generate operator dashboard", function () {
  platformState.dashboard = sdk().operations.dashboard();
});

When("I generate support bundle", function () {
  platformState.supportBundle = sdk().operations.supportBundle();
});

When("I start backup {string}", function (name: string) {
  const backup = sdk().backups.start({ name });
  platformState.backupIds[name] = backup.id;
});

When("I verify backup {string}", function (name: string) {
  const backupId = platformState.backupIds[name];
  assert.ok(backupId);
  sdk().backups.verify(backupId);
});

When("I run restore dry run for backup {string}", function (name: string) {
  const backupId = platformState.backupIds[name];
  assert.ok(backupId);
  platformState.restoreDryRun = sdk().restores.dryRun({ backupId });
});

When("I declare HA profile {string} with RPO {string} and RTO {string}", function (name: string, rpo: string, rto: string) {
  platformState.haProfile = sdk().ha.declareProfile({ name, rpo, rto });
});

When("I run failover drill {string}", function (name: string) {
  platformState.failoverDrill = sdk().ha.runFailoverDrill({ name });
});

When("I restore the platform snapshot into a fresh SDK", function () {
  assert.ok(platformState.snapshot);
  platformState.sdk = new EpochPlatformSdk(createInMemoryPlatformCore({ snapshot: platformState.snapshot }));
  platformState.deployment = undefined;
  platformState.communityProject = sdk().community.getProjectBySlug("epoch-platform");
});

Then("the platform capability {string} is disabled", function (capability: string) {
  assert.equal(sdk().capabilities.get(capability).enabled, false);
});

Then("the platform capability {string} is enabled", function (capability: string) {
  assert.equal(sdk().capabilities.get(capability).enabled, true);
});

Then("the project {string} overview lists repository {string}", function (projectSlug: string, repositorySlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  assert.ok(sdk().projects.overview(projectId).repositories.some((repository) => repository.slug === repositorySlug));
});

Then("the project {string} overview has empty-state action {string}", function (projectSlug: string, action: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  assert.ok(sdk().projects.overview(projectId).emptyStateActions.includes(action));
});

Then("the deploy plan targets environment {string}", function (name: string) {
  assert.equal(platformState.deployPlan?.target.environmentName, name);
});

Then("the deploy plan source repository is {string}", function (slug: string) {
  assert.equal(platformState.deployPlan?.source.repositorySlug, slug);
});

Then("the deploy plan requires approval {string}", function (kind: string) {
  assert.ok(platformState.deployPlan?.requiredApprovals.some((approval) => approval.kind === kind));
});

Then("the deploy plan primary action is {string}", function (label: string) {
  assert.equal(platformState.deployPlan?.primaryAction, label);
});

Then("the deploy plan SDK operation is {string}", function (operation: string) {
  assert.equal(platformState.deployPlan?.sdkOperation, operation);
});

Then("the platform action fails with code {string}", function (code: string) {
  assert.ok(platformState.error instanceof PlatformError);
  assert.equal(platformState.error.code, code);
});

Then("the platform action suggests {string}", function (suggestion: string) {
  assert.ok(platformState.error instanceof PlatformError);
  assert.equal(platformState.error.suggestion, suggestion);
});

Then("the platform action has a correlation id", function () {
  assert.ok(platformState.error instanceof PlatformError);
  // SAFETY: Runtime checks or construction above establish PlatformError & { correlationId?: string }).correlationId).
  assert.ok((platformState.error as PlatformError & { correlationId?: string }).correlationId);
});

Then("the deploy plan approval is recorded for {string}", function (actor: string) {
  assert.ok(platformState.deployPlan?.approvals.some((approval) => approval.approvedBy === actor));
});

Then("the latest deployment state is {string}", function (state: string) {
  const latestState = platformState.deployment?.state ?? sdk().observability.summary().latestDeploymentState;
  assert.equal(latestState, state);
});

Then("the latest audit event is {string}", function (type: string) {
  assert.equal(sdk().audit.latest()?.type, type);
});

Then("the Community project public slug is {string}", function (publicSlug: string) {
  assert.equal(platformState.communityProject?.publicSlug, publicSlug);
});

Then("first-run readiness is not production ready", function () {
  assert.equal(platformState.readiness?.productionReady, false);
});

Then("first-run readiness is production ready", function () {
  assert.equal(platformState.readiness?.productionReady, true);
});

Then("first-run readiness includes incomplete step {string}", function (step: string) {
  assert.ok(platformState.readiness?.incompleteSteps.includes(step));
});

Then("the deploy plan references secret {string}", function (name: string) {
  assert.ok(platformState.deployPlan?.secretReferences.some((secret) => secret.name === name));
});

Then("the deploy plan does not expose secret value {string}", function (value: string) {
  assert.ok(!JSON.stringify(platformState.deployPlan).includes(value));
});

Then("the deploy plan impact summary contains {string}", function (expected: string) {
  assert.match(platformState.deployPlan?.impactSummary ?? "", new RegExp(expected));
});

Then("the deploy plan rollback strategy is {string}", function (strategy: string) {
  assert.equal(platformState.deployPlan?.rollbackStrategy, strategy);
});

Then("the latest deployment health is {string}", function (health: string) {
  assert.equal(platformState.deployment?.health, health);
});

Then("the latest deployment job state is {string}", function (state: string) {
  assert.ok(platformState.deployment);
  platformState.deployJob = sdk().jobs.get(platformState.deployment.jobId);
  assert.equal(platformState.deployJob.state, state);
});

Then("the latest deployment logs contain {string}", function (expected: string) {
  assert.ok(platformState.deployment);
  assert.match(sdk().deployments.logs(platformState.deployment.id).join("\n"), new RegExp(expected));
});

Then("the incident diagnosis severity is {string}", function (severity: string) {
  assert.equal(platformState.incidentDiagnosis?.severity, severity);
});

Then("the incident diagnosis first failing step is {string}", function (step: string) {
  assert.equal(platformState.incidentDiagnosis?.firstFailingStep, step);
});

Then("the incident diagnosis recommends {string}", function (recommendation: string) {
  assert.ok(platformState.incidentDiagnosis?.recommendations.includes(recommendation));
});

Then("the AI plan action is {string}", function (action: string) {
  assert.equal(platformState.aiPlan?.action, action);
});

Then("the AI plan requires approval", function () {
  assert.equal(platformState.aiPlan?.approvalRequired, true);
});

Then("the AI plan context includes project {string}", function (projectSlug: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  assert.ok(platformState.aiPlan?.context.projectId === projectId);
});

Then("the Community project moderation state is {string}", function (state: string) {
  assert.equal(platformState.communityProject?.moderationState, state);
});

Then("the review intent state is {string}", function (state: string) {
  assert.equal(platformState.reviewIntent?.state, state);
});

Then("the review intent check {string} is {string}", function (name: string, status: string) {
  assert.equal(platformState.reviewIntent?.checks.find((check) => check.name === name)?.status, status);
});

Then("the review intent AI summary contains {string}", function (expected: string) {
  assert.match(platformState.reviewIntent?.aiSummary ?? "", new RegExp(expected));
});

Then("issue {string} is linked to the review intent", function (title: string) {
  const issueId = platformState.issueIds[title];
  assert.ok(issueId);
  assert.ok(platformState.reviewIntent);
  assert.ok(sdk().issues.get(issueId).linkedReviewIntentIds.includes(platformState.reviewIntent.id));
});

Then("package {string} version {string} is available", function (name: string, version: string) {
  assert.ok(sdk().packages.list().some((platformPackage) => platformPackage.name === name && platformPackage.version === version));
});

Then("search results include repository {string}", function (label: string) {
  assert.ok(platformState.searchResults?.some((result) => result.type === "repository" && result.label === label));
});

Then("search results include deployable {string}", function (label: string) {
  assert.ok(platformState.searchResults?.some((result) => result.type === "deployable" && result.label === label));
});

Then("search results include package {string}", function (label: string) {
  assert.ok(platformState.searchResults?.some((result) => result.type === "package" && result.label === label));
});

Then("observability runner count is {int}", function (count: number) {
  assert.equal(platformState.observability?.runnerCount, count);
});

Then("observability latest deployment state is {string}", function (state: string) {
  assert.equal(platformState.observability?.latestDeploymentState, state);
});

Then("the Community project {string} has {int} follower", function (publicSlug: string, count: number) {
  assert.equal(sdk().community.getProjectBySlug(publicSlug).followersCount, count);
});

Then("the Community project {string} has {int} star", function (publicSlug: string, count: number) {
  assert.equal(sdk().community.getProjectBySlug(publicSlug).starsCount, count);
});

Then("the Community feed includes {string}", function (summary: string) {
  assert.ok(sdk().community.feed().some((event) => event.summary === summary));
});

Then("the Community moderation queue contains discussion {string}", function (title: string) {
  const discussionId = platformState.discussionIds[title];
  assert.ok(discussionId);
  assert.ok(sdk().community.moderationQueue().some((report) => report.discussionId === discussionId));
});

Then("the Community moderation queue is empty", function () {
  assert.equal(sdk().community.moderationQueue().length, 0);
});

Then("service account {string} has scope {string}", function (name: string, scope: string) {
  const serviceAccountId = platformState.serviceAccountIds[name];
  assert.ok(serviceAccountId);
  assert.ok(sdk().identity.getServiceAccount(serviceAccountId).scopes.includes(scope));
});

Then("API token {string} is revoked", function (name: string) {
  const tokenId = platformState.tokenIds[name];
  assert.ok(tokenId);
  assert.equal(sdk().identity.getApiToken(tokenId).state, "revoked");
});

Then("session {string} is revoked", function (name: string) {
  const sessionId = platformState.sessionIds[name];
  assert.ok(sessionId);
  assert.equal(sdk().identity.getSession(sessionId).state, "revoked");
});

Then("the idempotent deploy plan ids match", function () {
  assert.equal(platformState.deployPlan?.id, platformState.previousDeployPlanId);
});

Then("the latest API response has correlation id {string}", function (correlationId: string) {
  assert.equal(platformState.apiResponse?.correlationId, correlationId);
});

Then("signed webhook verification for endpoint {string} succeeds", function (name: string) {
  const payload = "{}";
  const secret = platformState.webhookSecrets[name];
  assert.ok(secret);
  assert.equal(sdk().api.verifyWebhook({ endpointName: name, payload, signature: signWebhookPayload(secret, payload) }), true);
});

Then("platform events include {string}", function (type: string) {
  assert.ok(platformState.platformEvents?.some((event) => event.type === type));
});

Then("secret access never exposes plaintext {string}", function (value: string) {
  assert.notEqual(platformState.secretAccess?.plaintext, value);
});

Then("audit export includes {string}", function (type: string) {
  platformState.auditExport = sdk().compliance.exportAudit();
  assert.ok(platformState.auditExport.some((event) => event.type === type));
});

Then("compliance report includes {string}", function (finding: string) {
  assert.ok(platformState.complianceReport?.findings.includes(finding));
});

Then("tenant export includes project {string}", function (projectSlug: string) {
  assert.ok(platformState.tenantExport?.projectSlugs.includes(projectSlug));
});

Then("tenant export {string} is deleted", function (organizationSlug: string) {
  assert.equal(platformState.tenantExport?.slug, organizationSlug);
  assert.equal(platformState.tenantExport?.deleted, true);
});

Then("infrastructure target {string} health is {string}", function (name: string, health: string) {
  const targetId = platformState.infrastructureTargetIds[name];
  assert.ok(targetId);
  assert.equal(sdk().infrastructure.getTarget(targetId).healthState, health);
});

Then("project {string} overview lists resource {string}", function (projectSlug: string, resourceName: string) {
  const projectId = platformState.projectIds[projectSlug];
  assert.ok(projectId);
  assert.ok(sdk().projects.overview(projectId).resources.some((resource) => resource.name === resourceName));
});

Then("discovered deployable {string} has runtime {string}", function (name: string, runtime: string) {
  const deployableId = platformState.deployableIds[name];
  assert.ok(deployableId);
  assert.equal(sdk().deployables.get(deployableId).runtime, runtime);
});

Then("template {string} is available", function (name: string) {
  assert.ok(sdk().templates.list().some((template) => template.name === name));
});

Then("the deploy plan is dry run", function () {
  assert.equal(platformState.deployPlan?.dryRun, true);
});

Then("the deploy plan generated configuration includes {string}", function (expected: string) {
  assert.ok(platformState.deployPlan?.generatedConfiguration.includes(expected));
});

Then("the deploy plan state is {string}", function (state: string) {
  assert.equal(platformState.deployPlan?.state, state);
});

Then("the latest promotion state is {string}", function (state: string) {
  assert.equal(platformState.promotion?.state, state);
});

Then("runner {string} state is {string}", function (name: string, state: string) {
  assert.equal(sdk().runners.getByName(name).state, state);
});

Then("platform job {string} attempt is {int}", function (name: string, attempt: number) {
  const jobId = platformState.platformJobIds[name];
  assert.ok(jobId);
  assert.equal(sdk().jobs.getPlatformJob(jobId).attempt, attempt);
});

Then("platform job {string} logs contain {string}", function (name: string, expected: string) {
  const jobId = platformState.platformJobIds[name];
  assert.ok(jobId);
  assert.match(sdk().jobs.getPlatformJob(jobId).logs.join("\n"), new RegExp(expected));
});

Then("platform job {string} state is {string}", function (name: string, state: string) {
  const jobId = platformState.platformJobIds[name];
  assert.ok(jobId);
  assert.equal(sdk().jobs.getPlatformJob(jobId).state, state);
});

Then("platform configuration warnings include {string}", function (section: string) {
  assert.ok(platformState.configurationWarnings?.includes(section));
});

Then("AI context does not contain secret value {string}", function (value: string) {
  assert.ok(!platformState.aiContext?.body.includes(value));
});

Then("AI context cites source {string}", function (source: string) {
  assert.ok(platformState.aiContext?.citations.includes(source));
});

Then("AI tool request {string} requires approval", function (tool: string) {
  assert.equal(platformState.aiToolRequest?.tool, tool);
  assert.equal(platformState.aiToolRequest?.requiresApproval, true);
});

Then("AI evaluation {string} passes", function (name: string) {
  assert.equal(platformState.aiEvaluation?.name, name);
  assert.equal(platformState.aiEvaluation?.passed, true);
});

Then("failure classification is {string}", function (classification: string) {
  assert.equal(platformState.failure?.classification, classification);
});

Then("recovery action includes {string}", function (action: string) {
  assert.ok(platformState.failure?.recoveryActions.includes(action));
});

Then("issue {string} exists", function (title: string) {
  assert.ok(platformState.issueIds[title]);
});

Then("operator dashboard service health is {string}", function (state: string) {
  assert.equal(platformState.dashboard?.serviceHealth, state);
});

Then("operator dashboard backup freshness is {string}", function (state: string) {
  assert.equal(platformState.dashboard?.backupFreshness, state);
});

Then("operator dashboard runner capacity is {int}", function (capacity: number) {
  assert.equal(platformState.dashboard?.runnerCapacity, capacity);
});

Then("support bundle includes {string}", function (section: string) {
  assert.ok(platformState.supportBundle?.sections.includes(section));
});

Then("support bundle redacts secret value {string}", function (value: string) {
  assert.ok(!platformState.supportBundle?.body.includes(value));
});

Then("backup {string} verification status is {string}", function (name: string, status: string) {
  const backupId = platformState.backupIds[name];
  assert.ok(backupId);
  assert.equal(sdk().backups.get(backupId).verificationStatus, status);
});

Then("restore dry run status is {string}", function (status: string) {
  assert.equal(platformState.restoreDryRun?.status, status);
});

Then("failover drill {string} status is {string}", function (name: string, status: string) {
  assert.equal(platformState.failoverDrill?.name, name);
  assert.equal(platformState.failoverDrill?.status, status);
});

Then("documented RPO is {string}", function (rpo: string) {
  assert.equal(platformState.haProfile?.rpo, rpo);
});

Then("documented RTO is {string}", function (rto: string) {
  assert.equal(platformState.haProfile?.rto, rto);
});

Then("Community project {string} public page has topic {string}", function (publicSlug: string, topic: string) {
  assert.ok(sdk().community.getProjectBySlug(publicSlug).topics.includes(topic));
});

Then("Community project {string} public page has release {string}", function (publicSlug: string, version: string) {
  assert.ok(sdk().community.getProjectBySlug(publicSlug).releases.includes(version));
});

Then("public profile {string} reputation is {int}", function (handle: string, reputation: number) {
  const profileId = platformState.profileIds[handle];
  assert.ok(profileId);
  assert.equal(sdk().community.getProfile(profileId).reputation, reputation);
});

Then("Community search includes project {string}", function (publicSlug: string) {
  assert.ok(platformState.communitySearchResults?.some((project) => project.publicSlug === publicSlug));
});

Then("discussion {string} moderation state is {string}", function (title: string, state: string) {
  const discussionId = platformState.discussionIds[title];
  assert.ok(discussionId);
  assert.equal(sdk().community.getDiscussion(discussionId).moderationState, state);
});

Then("Community legal hold includes discussion {string}", function (title: string) {
  assert.ok(platformState.legalHold?.discussions.some((discussion) => (isString(discussion) ? discussion === title : discussion.title === title)));
});

Then("Community background workers are disabled", function () {
  assert.equal(sdk().community.workerStatus().enabled, false);
});
