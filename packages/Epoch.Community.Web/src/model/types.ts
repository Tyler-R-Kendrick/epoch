import type {
  CommunityClient,
  CommunityRepository,
  CommunityWorkflow,
  CommunityWorkflowId,
  ConvergenceWorkbenchSnapshot,
} from "@epoch/community-core";

export interface PwaAppDescriptor {
  readonly name: string;
  readonly shortName: string;
  readonly startUrl: string;
  readonly display: "standalone";
  readonly themeColor: string;
  readonly backgroundColor: string;
  readonly offlineShell: boolean;
}

export interface CommunityRoute {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly workflow: CommunityWorkflowId;
}

export interface CommunityNavigationItem {
  readonly label: string;
  readonly routeId: string;
}

export interface CommunityDeploymentTarget {
  readonly id: "epoch-community";
  readonly kind: "community-webapp";
  readonly displayName: "Epoch Community";
  readonly version: string;
  readonly image: string;
  readonly route: string;
  readonly healthPath: string;
  readonly ports: readonly number[];
  readonly environment: readonly string[];
  readonly requiredServices: readonly string[];
}

export interface CommunityWebAppDefinition {
  readonly project: "Epoch.Community.Web";
  readonly product: "epoch-community";
  readonly pwa: PwaAppDescriptor;
  readonly routes: readonly CommunityRoute[];
  readonly navigation: readonly CommunityNavigationItem[];
  readonly workflows: readonly CommunityWorkflow[];
  readonly repositories: readonly CommunityRepository[];
  readonly deploymentTarget: CommunityDeploymentTarget;
  readonly apiBaseUrl?: string;
  readonly siteHistory?: CommunitySiteEpochHistory;
  readonly session?: CommunitySessionIdentity;
  readonly liveAgentIds?: readonly string[];
  readonly convergenceWorkbench?: ConvergenceWorkbenchSnapshot;
}

/** Viewer identity rendered in the header chip (state-driven, not hard-coded sample only). */
export type CommunityAuthState = "authenticated" | "api-session" | "sample-session" | "unauthenticated";

export interface CommunitySessionIdentity {
  readonly handle: string;
  readonly did?: string;
  readonly authState: CommunityAuthState;
}

export interface CreateCommunityWebAppOptions {
  readonly client: CommunityClient;
  readonly basePath?: string;
  readonly apiBaseUrl?: string;
  readonly version?: string;
  readonly image?: string;
  /** When set, drives the identity chip; otherwise derived from api connectivity. */
  readonly session?: CommunitySessionIdentity;
  /** Agent ids that have a live ACP session (sessionKind becomes live). */
  readonly liveAgentIds?: readonly string[];
  /** Optional change-graph/review-bundle surface rendered inside the Community workspace. */
  readonly convergenceWorkbench?: ConvergenceWorkbenchSnapshot;
}

export interface CommunitySiteEpochOperation {
  readonly label: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly view?: string;
  readonly version?: string;
  readonly target?: string;
}

export interface CommunitySiteEpochVersionSummary {
  readonly id: string;
  readonly name: string;
  readonly view: string;
  readonly files: readonly string[];
}

export interface CommunitySiteEpochHistory {
  readonly repository: "EpochRepository";
  readonly author: string;
  readonly currentView: string;
  readonly views: readonly string[];
  readonly eventTypes: readonly string[];
  readonly operations: readonly CommunitySiteEpochOperation[];
  readonly latestVersion: CommunitySiteEpochVersionSummary;
  readonly rollbackTarget: {
    readonly eventId: string;
    readonly versionId: string;
    readonly reason: string;
  };
  readonly verifyProblems: readonly string[];
}

export interface MaterializeCommunityWebSiteWithEpochOptions {
  readonly repositoryRoot: string;
  readonly outputDirectory: string;
  readonly author?: string;
  readonly draftView?: string;
  readonly initialVersionName?: string;
  readonly releaseVersionName?: string;
}

export interface MaterializedCommunityWebSite {
  readonly app: CommunityWebAppDefinition;
  readonly history: CommunitySiteEpochHistory;
  readonly outputDirectory: string;
  readonly materializedFiles: readonly string[];
  readonly manifestPath: string;
}

export type CommunityChannelId =
  | "general"
  | "showcase"
  | "support"
  | "ideas"
  | "bugs"
  | "agent-runs"
  | "previews"
  | "governance";
export type CommunityFeedSource = "api" | "snapshot";
/** network = cross-community Dev Feed; community = Discord-like space; repo = linked project forge lists */
export type ProductMode = "network" | "community" | "repo";
export type DevFeedTab = "following" | "network" | "contributions" | "community";
export type DevFeedKind =
  | "follow"
  | "star"
  | "repo_create"
  | "release"
  | "issue_open"
  | "review"
  | "change"
  | "agent_run"
  | "contribution"
  | "community_post";
export type CommunityChannelKind = "social" | "work";

export interface CommunityChannel {
  readonly id: CommunityChannelId;
  readonly label: string;
  readonly topic: string;
  readonly kind: CommunityChannelKind;
  /** Empty-state headline for this channel: names the object and its absence. */
  readonly emptyTitle: string;
  /** Empty-state next verb — what the reader can do here right now. */
  readonly emptyAction: string;
}

/** Discord-analog: a community owns channels; repos are optional linked projects. */
export interface CommunitySpace {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly channels: readonly CommunityChannel[];
  readonly linkedRepos: readonly string[];
}

export interface DevFeedActor {
  readonly handle: string;
  readonly displayName?: string;
  readonly did?: string;
  readonly role?: string;
}

export interface DevFeedObject {
  readonly type: "repo" | "issue" | "change" | "actor" | "release";
  readonly label: string;
  readonly hrefHint?: string;
}

export interface DevFeedItem {
  readonly id: string;
  readonly kind: DevFeedKind;
  readonly actor: DevFeedActor;
  readonly verb: string;
  readonly object?: DevFeedObject;
  readonly body?: string;
  readonly repoSlug?: string;
  readonly channelHint?: CommunityChannelId;
  readonly trust: {
    readonly sig?: string;
    readonly anchor?: string;
    readonly atUri?: string;
    readonly source: "api" | "atproto" | "snapshot";
  };
  readonly createdAt: string;
  readonly tabs: readonly DevFeedTab[];
}

export interface DevFeedBuildResult {
  readonly source: CommunityFeedSource;
  readonly items: readonly DevFeedItem[];
  readonly followingHandles: readonly string[];
}

/** Thread comment carried by a conversation (issue replies, accepted answers). */
export interface CommunityConversationComment {
  readonly author: string;
  readonly body: string;
}

export interface CommunityConversationView {
  readonly id: string;
  readonly channel: CommunityChannelId;
  /** Community that owns this channel conversation (Discord-like). */
  readonly communityId: string;
  /** Optional linked repo when the message is forge-backed. */
  readonly repositorySlug?: string;
  readonly author: string;
  readonly role: string;
  /**
   * Subject line, for messages that are about an object — a promoted Change, an
   * agent run, an issue. Conversational messages have no title: a chat message
   * with a headline above it is a forum post, and rendering one for every line
   * doubled row height and read as ceremony.
   */
  readonly title?: string;
  readonly body: string;
  readonly time: string;
  readonly anchor: string;
  readonly signature: string;
  readonly visibility: string;
  readonly state: string;
  readonly reactions: readonly string[];
  /** Thread comments rendered inside the message body (issue replies). */
  readonly comments?: readonly CommunityConversationComment[];
  readonly linkedArtifact?: string;
  readonly linkedChangeId?: string;
  readonly source: CommunityFeedSource;
  /** Buzz-aligned: ACP harness id when author is a member agent. */
  readonly harness?: string;
  /** Buzz-aligned: human manager of a member agent ("managed by"). */
  readonly managedBy?: string;
  /** Optional in-channel artifact card label (e.g. PR title). */
  readonly artifactCard?: string;
}

/** First-class channel member that is an AI agent (Buzz "agents as members"). */
export interface CommunityAgentMember {
  readonly id: string;
  readonly displayName: string;
  readonly harness: string;
  readonly managedBy: string;
  readonly scope: string;
  readonly status: "idle" | "working" | "needs-review";
  /**
   * `sample` = seed/demo membership (never claim live ACP Working).
   * `live` = real harness session (only then may UI assert live Working).
   */
  readonly sessionKind: "sample" | "live";
  readonly communityIds: readonly string[];
}

export interface CommunityFeedIssueItem {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly status: string;
  readonly labels: readonly string[];
  readonly repositorySlug: string;
  readonly channel: CommunityChannelId;
}

export interface CommunityFeedChangeItem {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly status: string;
  readonly sourceView: string;
  readonly targetView: string;
  readonly repositorySlug: string;
}

export interface CommunityFeedBuildResult {
  readonly source: CommunityFeedSource;
  readonly conversations: readonly CommunityConversationView[];
  readonly issues: readonly CommunityFeedIssueItem[];
  readonly changes: readonly CommunityFeedChangeItem[];
}

export interface BuildCommunityFeedOptions {
  readonly repositories: readonly CommunityRepository[];
  /** True when a live Community API base URL is configured. */
  readonly apiConnected: boolean;
}
