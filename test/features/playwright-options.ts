import process from "node:process";
import type { LaunchOptions } from "playwright";

export function chromiumLaunchOptions(options: LaunchOptions = {}): LaunchOptions {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  return {
    ...options,
    ...(executablePath === undefined || executablePath.length === 0 ? {} : { executablePath }),
  };
}
