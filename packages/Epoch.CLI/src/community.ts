import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createCommunityRuntime,
  executeCommunityRuntimeCommand,
  isCommunityRuntimeInvocation,
  type CommunityRuntime,
  type EpochIntegrationStorage,
} from "@epoch/community-runtime";
import { main as communityForgeMain, type CommunityCliIO } from "@epoch/community-cli";

/**
 * `epoch community …` and `epoch ui …`.
 *
 * Two command groups used to be two binaries with two parsers: `epoch` for the
 * repository and `epoch-community` for the forge, with no shared layer and no
 * shared output. Both now route into one place — the forge group delegates to
 * the Community CLI implementation, the UI group into the Community runtime
 * command bus — so a receipt printed here is the same record the browser and a
 * WebMCP agent get back. `epoch-community` stays as a compatibility binary.
 */
export function isCommunityCliInvocation(command: string, args: readonly string[]): boolean {
  return command === "community" || isCommunityRuntimeInvocation([command, ...args]);
}

export async function executeCommunityCli(
  repoRoot: string,
  command: string,
  args: readonly string[],
  io: CommunityCliIO,
): Promise<boolean> {
  if (command === "community") {
    // The forge group configures itself from --remote or EPOCH_COMMUNITY_URL;
    // it is the same implementation the `epoch-community` binary runs.
    return await communityForgeMain([...args], io) === 0;
  }

  const result = await executeCommunityRuntimeCommand(openWorkspaceRuntime(repoRoot), [command, ...args]);
  (result.ok ? io.stdout : io.stderr)(`${result.output}\n`);
  return result.ok;
}

/**
 * A CLI workspace lives on disk beside the repository, so `epoch ui status` in a
 * terminal and the same command in a browser tab are describing comparable
 * state rather than each inventing their own.
 */
export function openWorkspaceRuntime(repoRoot: string): CommunityRuntime {
  const root = resolve(repoRoot);
  return createCommunityRuntime({
    namespace: "epoch-community-cli",
    actor: process.env.EPOCH_AUTHOR ?? "cli",
    storage: createFileStorage(join(root, ".epoch", "ui-workspace.json")),
    defaultSource: "cli",
    policies: { capabilities: ["*"] },
  });
}

export function createFileStorage(path: string): EpochIntegrationStorage {
  const values = new Map<string, string>(Object.entries(readSnapshot(path)));

  function persist(): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(Object.fromEntries(values), undefined, 2)}\n`);
  }

  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
      persist();
    },
    removeItem: (key) => {
      values.delete(key);
      persist();
    },
  };
}

function readSnapshot(path: string): Record<string, string> {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}
