import assert from "node:assert/strict";
import { createCommunityClient } from "@epoch/community-core";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { createCommunityWebApp } from "@epoch/community-web";
import { createPlatformWebApp } from "@epoch/platform-web";

export async function runPlatformCommunityModuleTests(): Promise<void> {
  const client = createCommunityClient(createInMemoryCommunityApi({
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "Self-hosted Epoch control plane and DVCS.",
      maintainers: ["alice"],
      topics: ["dvcs", "self-hosting"],
    }],
  }));
  const platformWeb = createPlatformWebApp();

  void client.openIssue("epoch/epoch", {
    title: "Document the Community split",
    author: "bob",
  });

  const communityWeb = await createCommunityWebApp({ client });

  assert.equal(communityWeb.project, "Epoch.Community.Web");
  assert.ok(communityWeb.workflows.some((workflow) => workflow.id === "issue-tracking"));
  assert.ok(communityWeb.workflows.some((workflow) => workflow.id === "change-review"));
  assert.equal(platformWeb.communityWorkflows.length, 0);
  assert.ok(platformWeb.managedServices.every((service) => service.epochHostingOnly));
}
