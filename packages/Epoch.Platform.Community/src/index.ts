import type * as Core from "@epoch/platform-core";
import type { EpochPlatformSdk } from "@epoch/platform-sdk";

export type EnablePlatformCommunityInput = {
  reviewedBy: string;
  visibilityPolicy: string;
};

export class EpochPlatformCommunity {
  readonly profiles;
  readonly projects;
  readonly discussions;
  readonly feed;
  readonly moderation;

  constructor(private readonly sdk: EpochPlatformSdk) {
    this.profiles = {
      create: (input: Core.CreatePublicProfileInput) => this.sdk.community.createProfile(input),
      get: (profileId: string) => this.sdk.community.getProfile(profileId),
      recordContribution: (input: Core.RecordCommunityContributionInput) => this.sdk.community.recordContribution(input),
      block: (input: Core.BlockPublicProfileInput) => this.sdk.community.blockProfile(input),
    };
    this.projects = {
      publish: (input: Core.PublishCommunityProjectInput) => this.sdk.community.publishProject(input),
      approve: (projectId: string, input: Core.ApproveCommunityProjectInput) => this.sdk.community.approveProject(projectId, input),
      getPageBySlug: (publicSlug: string) => this.sdk.community.getProjectBySlug(publicSlug),
      search: (input: Core.SearchCommunityInput) => this.sdk.community.search(input),
      addTopic: (projectId: string, input: Core.AddCommunityTopicInput) => this.sdk.community.addTopic(projectId, input),
      addShowcaseAsset: (projectId: string, input: Core.AddShowcaseAssetInput) => this.sdk.community.addShowcaseAsset(projectId, input),
      publishRelease: (projectId: string, input: Core.PublishCommunityReleaseInput) => this.sdk.community.publishRelease(projectId, input),
      follow: (input: Core.FollowCommunityProjectInput) => this.sdk.community.followProject(input),
      star: (input: Core.StarCommunityProjectInput) => this.sdk.community.starProject(input),
      bookmark: (input: Core.BookmarkCommunityProjectInput) => this.sdk.community.bookmarkProject(input),
    };
    this.discussions = {
      open: (input: Core.OpenCommunityDiscussionInput) => this.sdk.community.openDiscussion(input),
      get: (discussionId: string) => this.sdk.community.getDiscussion(discussionId),
    };
    this.feed = {
      personalized: (input?: Core.PersonalizedCommunityFeedInput) => this.sdk.community.personalizedFeed(input),
    };
    this.moderation = {
      reportDiscussion: (input: Core.ReportCommunityDiscussionInput) => this.sdk.community.reportDiscussion(input),
      queue: () => this.sdk.community.moderationQueue(),
      takeDownDiscussion: (discussionId: string, input: Core.TakeDownCommunityDiscussionInput) => this.sdk.community.takeDownDiscussion(discussionId, input),
      exportLegalHold: (input: Core.ExportCommunityLegalHoldInput) => this.sdk.community.exportLegalHold(input),
    };
  }

  status(): Core.CommunityStatus {
    return this.sdk.community.status();
  }

  enable(input: EnablePlatformCommunityInput): Core.CommunityStatus {
    this.sdk.community.enable({
      reviewedBy: input.reviewedBy,
      visibilityPolicy: input.visibilityPolicy,
    });
    return this.status();
  }
}

export { PlatformError } from "@epoch/platform-core";
export type * from "@epoch/platform-core";
