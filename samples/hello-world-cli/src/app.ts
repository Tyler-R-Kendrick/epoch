import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EpochRepository } from "@epoch/core";

export type HelloWorldCliOptions = {
  readonly author?: string;
  readonly message?: string;
  readonly root?: string;
  readonly versionName?: string;
};

export type HelloWorldSummary = {
  readonly epochDirectory: string;
  readonly eventCount: number;
  readonly message: string;
  readonly recordId: string;
  readonly recordedPath: string;
  readonly repositoryProblems: readonly string[];
  readonly repositoryRoot: string;
  readonly versionId: string;
  readonly versionName: string;
};

const defaultAuthor = "hello-cli";
const defaultMessage = "Hello from Epoch";
const defaultPath = "hello.txt";
const defaultVersionName = "hello-world";

export function runHelloWorldCli(options: HelloWorldCliOptions = {}): HelloWorldSummary {
  const author = options.author ?? defaultAuthor;
  const message = options.message ?? defaultMessage;
  const repositoryRoot = resolve(options.root ?? mkdtempSync(join(tmpdir(), "epoch-hello-world-cli-")));
  const versionName = options.versionName ?? defaultVersionName;

  const repository = EpochRepository.create(repositoryRoot, { author });
  writeFileSync(join(repositoryRoot, defaultPath), `${message}\n`, "utf8");

  const record = repository.recordFile(defaultPath, "text/plain", author);
  const version = repository.createVersion({ author, name: versionName });
  const repositoryProblems = repository.verify();

  return {
    epochDirectory: repository.epochDir,
    eventCount: repository.events().length,
    message,
    recordId: record.id,
    recordedPath: defaultPath,
    repositoryProblems,
    repositoryRoot,
    versionId: version.id,
    versionName,
  };
}

export function formatHelloWorldSummary(summary: HelloWorldSummary): string {
  const status = summary.repositoryProblems.length === 0
    ? "verified"
    : `verification failed: ${summary.repositoryProblems.join("; ")}`;

  return [
    `Epoch hello world: ${summary.message}`,
    `Repository: ${summary.repositoryRoot}`,
    `Recorded: ${summary.recordedPath} (${summary.recordId})`,
    `Version: ${summary.versionName} (${summary.versionId})`,
    `Status: ${status}`,
  ].join("\n");
}
