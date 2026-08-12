import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface InteropProbe {
  readonly id: string;
  readonly status: "supported" | "unsupported" | "degraded";
  readonly version?: string;
  readonly mode?: string;
  readonly reason?: string;
}

export interface InteropDoctorReport {
  readonly schemaVersion: 1;
  readonly git: InteropProbe;
  readonly optionalTools: readonly InteropProbe[];
  readonly copyOnWrite: InteropProbe;
  readonly adapters: readonly InteropProbe[];
  readonly swhid: InteropProbe;
  readonly credentialsRedacted: true;
}

type ExecProbe = (command: string, args: readonly string[]) => string;

function systemProbe(command: string, args: readonly string[]): string {
  return execFileSync(command, [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" } }).trim();
}

function tool(id: string, command: string, args: readonly string[], exec: ExecProbe): InteropProbe {
  try { return { id, status: "supported", version: exec(command, args).split(/\r?\n/u)[0]!.slice(0, 160) }; }
  catch { return { id, status: "unsupported", reason: `${id} executable was not found or did not report a version` }; }
}

export async function interopDoctor(
  options: { readonly exec?: ExecProbe; readonly adapters?: readonly InteropProbe[]; readonly swhid?: InteropProbe } = {},
): Promise<InteropDoctorReport> {
  const exec = options.exec ?? systemProbe;
  const git = tool("git", "git", ["--version"], exec);
  const protocol = git.status === "supported" ? (() => {
    try { exec("git", ["version", "--build-options"]); return "protocol-v2-subset"; } catch { return "version-unknown"; }
  })() : undefined;
  const copyOnWrite = await probeCopyOnWrite();
  const report = {
    schemaVersion: 1,
    git: { ...git, ...(protocol ? { mode: protocol } : {}) },
    optionalTools: Object.freeze([
      tool("jj", "jj", ["--version"], exec), tool("hg", "hg", ["--version", "--quiet"], exec),
      tool("rift", "rift", ["--version"], exec),
    ]),
    copyOnWrite,
    adapters: Object.freeze([...(options.adapters ?? [])].sort((a, b) => a.id.localeCompare(b.id))),
    swhid: options.swhid ?? ({ id: "swhid", status: "unsupported", reason: "no SWHID adapter is configured" } satisfies InteropProbe),
    credentialsRedacted: true,
  } satisfies InteropDoctorReport;
  return Object.freeze(report);
}

async function probeCopyOnWrite(): Promise<InteropProbe> {
  const root = await mkdtemp(join(tmpdir(), "epoch-cow-probe-"));
  try {
    const source = join(root, "source"); const target = join(root, "target");
    await writeFile(source, "epoch");
    try {
      await copyFile(source, target, constants.COPYFILE_FICLONE_FORCE);
      return { id: "copy-on-write", status: "supported", mode: "copyfile-ficlone" };
    } catch { return { id: "copy-on-write", status: "unsupported", reason: "filesystem rejected forced reflink clone" }; }
  } finally { await rm(root, { recursive: true, force: true }); }
}
