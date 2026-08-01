import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository, GitMappingEventType, listGitMappingEvents } from "@epoch/core";
import {
  dualRunOnce,
  exportLiveOnce,
  importLiveOnce,
  readLastCheckpoint,
  startGitProxy,
} from "@epoch/git-proxy";

export async function runGitProxyTests(): Promise<void> {
  await smartHttpCloneAndPushWithRealGit();
  liveImportExportDualRunWithCheckpoints();
}

/** Async git so the in-process HTTP server can still handle requests. */
function gitAsync(args: readonly string[], options: { cwd?: string } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: options.cwd,
      stdio: "ignore",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git ${args.join(" ")} exited ${code}`));
    });
  });
}

async function smartHttpCloneAndPushWithRealGit(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-proxy-"));
  try {
    const epochRoot = join(root, "epoch");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    repository.init("alice");
    writeFileSync(join(epochRoot, "hello.txt"), "hello-from-epoch\n");
    repository.recordFile("hello.txt", "text/plain", "alice");
    assert.deepEqual(repository.verify(), []);

    // Materialize + project once before serving so clone cannot race an empty bare.
    const { ensureProjection } = await import("@epoch/git-proxy");
    const projected = ensureProjection(epochRoot, join(epochRoot, ".epoch", "git-projection"));
    assert.ok(projected.paths.includes("hello.txt"), `projection missing hello.txt: ${projected.paths.join(",")}`);

    const server = await startGitProxy({ epochRoot, listenHost: "127.0.0.1", listenPort: 0 });
    try {
      const lsBare = execFileSync("git", ["--git-dir", server.bareRoot, "ls-tree", "-r", "--name-only", "HEAD"], {
        encoding: "utf8",
      });
      assert.match(lsBare, /hello\.txt/, `bare HEAD missing hello.txt; ls-tree=${lsBare}`);

      const cloneDir = join(root, "clone");
      await gitAsync(["clone", server.gitCloneUrl, cloneDir]);
      assert.ok(
        existsSync(join(cloneDir, "hello.txt")),
        `expected hello.txt after clone from ${server.gitCloneUrl}; bare=${server.bareRoot}; bareTree=${lsBare}`,
      );
      assert.equal(readFileSync(join(cloneDir, "hello.txt"), "utf8"), "hello-from-epoch\n");

      writeFileSync(join(cloneDir, "from-client.txt"), "pushed\n");
      await gitAsync(["-C", cloneDir, "config", "user.email", "c@example.invalid"]);
      await gitAsync(["-C", cloneDir, "config", "user.name", "client"]);
      await gitAsync(["-C", cloneDir, "add", "from-client.txt"]);
      await gitAsync(["-C", cloneDir, "commit", "-m", "client push"]);
      await gitAsync(["-C", cloneDir, "push", "origin", "HEAD:main"]);

      const after = new EpochRepository(epochRoot);
      assert.ok(existsSync(join(epochRoot, "from-client.txt")));
      assert.equal(readFileSync(join(epochRoot, "from-client.txt"), "utf8"), "pushed\n");
      assert.deepEqual(after.verify(), []);
      const mapping = listGitMappingEvents(after);
      assert.ok(mapping.some((e) => e.type === GitMappingEventType.receive));
      assert.ok(mapping.some((e) => e.type === GitMappingEventType.project));
    } finally {
      await server.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function liveImportExportDualRunWithCheckpoints(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-mirror-"));
  try {
    const upstream = join(root, "upstream");
    mkdirSync(upstream);
    execFileSync("git", ["-C", upstream, "-c", "init.defaultBranch=main", "init"], { stdio: "ignore" });
    execFileSync("git", ["-C", upstream, "config", "user.email", "u@example.invalid"], { stdio: "ignore" });
    execFileSync("git", ["-C", upstream, "config", "user.name", "up"], { stdio: "ignore" });
    writeFileSync(join(upstream, "a.txt"), "a1\n");
    execFileSync("git", ["-C", upstream, "add", "a.txt"], { stdio: "ignore" });
    execFileSync("git", ["-C", upstream, "commit", "-m", "c1"], { stdio: "ignore" });

    const epochRoot = join(root, "epoch");
    mkdirSync(epochRoot);
    const projectionRoot = join(root, "projection");
    const repository = new EpochRepository(epochRoot);
    repository.init("mirror");

    const first = importLiveOnce({
      epochRoot,
      projectionRoot,
      remoteUrl: upstream,
      author: "mirror",
    });
    assert.ok(first.commitOid.length === 40);
    assert.equal(readFileSync(join(epochRoot, "a.txt"), "utf8"), "a1\n");
    const checkpoint1 = readLastCheckpoint(epochRoot);
    assert.equal(checkpoint1?.commitOid, first.commitOid);

    writeFileSync(join(upstream, "b.txt"), "b2\n");
    execFileSync("git", ["-C", upstream, "add", "b.txt"], { stdio: "ignore" });
    execFileSync("git", ["-C", upstream, "commit", "-m", "c2"], { stdio: "ignore" });

    const second = importLiveOnce({
      epochRoot,
      projectionRoot,
      remoteUrl: upstream,
      author: "mirror",
    });
    assert.notEqual(second.commitOid, first.commitOid);
    assert.equal(readFileSync(join(epochRoot, "b.txt"), "utf8"), "b2\n");
    assert.deepEqual(new EpochRepository(epochRoot).verify(), []);

    const exportBare = join(root, "export.git");
    execFileSync("git", ["init", "--bare", exportBare], { stdio: "ignore" });
    const exported = exportLiveOnce({
      epochRoot,
      projectionRoot,
      remoteUrl: exportBare,
      author: "mirror",
    });
    assert.ok(exported.commitOid.length === 40);
    const exportTip = execFileSync("git", ["--git-dir", exportBare, "rev-parse", "refs/heads/main"], {
      encoding: "utf8",
    }).trim();
    assert.equal(exportTip, exported.commitOid);

    const headsBefore = new EpochRepository(epochRoot).heads();
    dualRunOnce({
      epochRoot,
      projectionRoot,
      importRemoteUrl: upstream,
      exportRemoteUrl: exportBare,
      author: "mirror",
    });
    const after = new EpochRepository(epochRoot);
    assert.ok(after.heads().length >= headsBefore.length);
    assert.deepEqual(after.verify(), []);
    const mapping = listGitMappingEvents(after);
    assert.ok(mapping.some((e) => e.type === GitMappingEventType.mirrorCheckpoint));
    assert.ok(mapping.some((e) => e.type === GitMappingEventType.mirrorFetch));
    assert.ok(mapping.some((e) => e.type === GitMappingEventType.mirrorPush));

    // Divergent import-lane must not clobber Epoch product materialization.
    dualRunDoesNotClobberEpochPrimaryProduct();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Criterion 3: dual-run is Epoch-primary on product heads. Import remote may
 * diverge on the same path; Epoch product content must survive.
 */
function dualRunDoesNotClobberEpochPrimaryProduct(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-dual-primary-"));
  try {
    const epochRoot = join(root, "epoch");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    repository.init("owner");
    writeFileSync(join(epochRoot, "product.txt"), "EPOCH-PRIMARY\n");
    repository.recordFile("product.txt", "text/plain", "owner");
    assert.equal(readFileSync(join(epochRoot, "product.txt"), "utf8"), "EPOCH-PRIMARY\n");

    const importRemote = join(root, "import-remote");
    mkdirSync(importRemote);
    execFileSync("git", ["-C", importRemote, "-c", "init.defaultBranch=main", "init"], { stdio: "ignore" });
    execFileSync("git", ["-C", importRemote, "config", "user.email", "i@example.invalid"], { stdio: "ignore" });
    execFileSync("git", ["-C", importRemote, "config", "user.name", "import"], { stdio: "ignore" });
    writeFileSync(join(importRemote, "product.txt"), "IMPORT-LANE-WINS\n");
    execFileSync("git", ["-C", importRemote, "add", "product.txt"], { stdio: "ignore" });
    execFileSync("git", ["-C", importRemote, "commit", "-m", "import diverges"], { stdio: "ignore" });

    const exportBare = join(root, "export.git");
    execFileSync("git", ["init", "--bare", exportBare], { stdio: "ignore" });
    const projectionRoot = join(root, "projection");

    const result = dualRunOnce({
      epochRoot,
      projectionRoot,
      importRemoteUrl: importRemote,
      exportRemoteUrl: exportBare,
      author: "owner",
    });
    assert.ok(result.import.commitOid.length === 40);
    assert.ok(result.export.commitOid.length === 40);

    // Product file must remain Epoch-primary content, not import lane content.
    assert.equal(
      readFileSync(join(epochRoot, "product.txt"), "utf8"),
      "EPOCH-PRIMARY\n",
      "dual-run import lane must not overwrite Epoch product materialization",
    );
    assert.deepEqual(new EpochRepository(epochRoot).verify(), []);

    // Import tip was still tracked (checkpoint / mapping), without product clobber.
    const mapping = listGitMappingEvents(new EpochRepository(epochRoot));
    const fetchEvents = mapping.filter((e) => e.type === GitMappingEventType.mirrorFetch);
    assert.ok(
      fetchEvents.some(
        (e) =>
          e.payload.authority === "epoch-primary"
          && e.payload.commitOid === result.import.commitOid,
      ),
      "import lane should record epoch-primary mirror.fetch with remote tip",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
