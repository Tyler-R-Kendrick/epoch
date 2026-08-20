import { runCommunityApiProjectionTests } from "./unit/community-api-projection.test";
import { runCommunityObjectProjectionTests } from "./unit/community-object-projection.test";
import { runCommunityWebAppNavigationRuntimeTests } from "./unit/community-web-app-navigation-runtime.test";

async function main(): Promise<void> {
  await runCommunityObjectProjectionTests();
  await runCommunityApiProjectionTests();
  await runCommunityWebAppNavigationRuntimeTests();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
