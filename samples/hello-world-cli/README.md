# Hello World CLI Sample

This sample is the smallest command-line app that uses the Epoch Core SDK. It
creates a local Epoch repository, writes `hello.txt`, records that file as a
signed Epoch event, creates a named version, and verifies the repository.

## Run It

From the repository root:

```bash
npm run build -w @epoch/core
npm run build -w @epoch/sample-hello-world-cli
npm run start -w @epoch/sample-hello-world-cli -- ./tmp/epoch-hello-world
```

Omit the final path to create a temporary repository instead:

```bash
npm run start -w @epoch/sample-hello-world-cli
```

Expected output:

```text
Epoch hello world: Hello from Epoch
Repository: /absolute/path/to/tmp/epoch-hello-world
Recorded: hello.txt (...)
Version: hello-world (...)
Status: verified
```

## SDK Shape

The sample keeps the SDK usage in [`src/app.ts`](src/app.ts):

```ts
const repository = EpochRepository.create(repositoryRoot, { author });
writeFileSync(join(repositoryRoot, "hello.txt"), "Hello from Epoch\n", "utf8");

const record = repository.recordFile("hello.txt", "text/plain", author);
const version = repository.createVersion({ author, name: "hello-world" });
const problems = repository.verify();
```
