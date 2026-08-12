import { runCommunityApiProjectionTests } from "./unit/community-api-projection.test";
import { runCommunityObjectProjectionTests } from "./unit/community-object-projection.test";
import { runNightboardNavigationRuntimeTests } from "./unit/nightboard-navigation-runtime.test";

async function main(): Promise<void> {
  await runCommunityObjectProjectionTests();
  await runCommunityApiProjectionTests();
  await runNightboardNavigationRuntimeTests();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
