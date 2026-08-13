import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildExternalInvocation,
  canonicalManifest,
  CAPABILITY_KINDS,
  ed25519ManifestVerifier,
  EXTENSION_API_VERSION,
  extensionManifestFile,
  EXTENSION_PREFIX,
  manifestSigningPayload,
  nodeExtensionFileSystem,
  CapabilityRegistry,
  CapabilityRegistryError,
  DEFAULT_TRUST_POLICY,
  discoverExtensions,
  evaluateTrust,
  ExtensionManifestError,
  parseExtensionManifest,
  readTrustPolicy,
  resolveSubcommand,
  shadowedExtensions,
  withRecordedConsent,
  EMPTY_TRUST_STORE,
  grantTrust,
  parseTrustStore,
  revokeTrust,
  serializeTrustStore,
  TrustStoreError,
  type ExtensionFileSystem,
} from "@epoch/extensions";

export function runExtensionMechanismTests(): void {
  manifestParsesAndValidates();
  manifestFailsClosedOnBadInput();
  discoveryPrefersRepositoryOverUserOverPath();
  discoveryReportsExtensionsWithoutAValidManifest();
  defaultPolicyRefusesUntrustedExtensions();
  explicitAllowTrustsOneExtension();
  signedPolicyRequiresSignatureAndKnownPublisher();
  blockAlwaysWins();
  openPolicyStillRequiresAManifest();
  builtinsShadowExtensionsVisibly();
  invocationCarriesTheDocumentedEnvironmentContract();
  registryResolvesDeterministically();
  registryHonoursPins();
  registryExcludesAdvisoryProvidersFromSignedState();
  registryRefusesDuplicateProviders();
  descriptorCarriesProvenance();
  contractConstantsAreStable();
  realFilesystemDiscoveryFindsExecutablesOnly();
  consentBindsToTheBinaryItWasGivenFor();
  trustStoreRoundTripsAndFailsClosed();
}

/**
 * Consent to a name alone is Git's model: it trusts whatever binary later
 * occupies the path. Binding it to a digest is the improvement this mechanism
 * exists to make, so it is asserted directly rather than implied by the CLI.
 */
function consentBindsToTheBinaryItWasGivenFor(): void {
  const manifest = parseExtensionManifest(MANIFEST.replace(`"difftastic"`, `"greet"`));
  const consented = "a".repeat(64);
  const policy = withRecordedConsent(DEFAULT_TRUST_POLICY, {
    allow: [{ name: "greet", executableSha256: consented }],
    block: [],
  });

  const same = evaluateTrust("greet", manifest, policy, { executableSha256: consented });
  assert.equal(same.trusted, true);
  assert.equal(same.reason, "allowed-by-consent");

  // A different binary at the same path was never consented to. Epoch cannot
  // tell an upgrade from a substitution, so it asks rather than assumes.
  const swapped = evaluateTrust("greet", manifest, policy, { executableSha256: "b".repeat(64) });
  assert.equal(swapped.trusted, false);
  assert.equal(swapped.reason, "executable-changed");
  assert.match(swapped.detail, /re-run 'epoch ext trust greet'/u);

  // An undigestible binary cannot be matched against the grant either.
  assert.equal(evaluateTrust("greet", manifest, policy, {}).reason, "executable-changed");

  // A revocation recorded in the store outranks consent and open policy alike.
  const revoked = withRecordedConsent(readTrustPolicy({ trust: "any" }), {
    allow: [{ name: "greet", executableSha256: consented }],
    block: ["greet"],
  });
  assert.equal(evaluateTrust("greet", manifest, revoked, { executableSha256: consented }).reason, "blocked-by-name");
}

function trustStoreRoundTripsAndFailsClosed(): void {
  const granted = grantTrust(EMPTY_TRUST_STORE, "greet", "c".repeat(64));
  assert.deepEqual(parseTrustStore(serializeTrustStore(granted)), granted);

  // Trusting is a true inverse of untrusting: it clears the block rather than
  // leaving the name denied while reporting success.
  const revoked = revokeTrust(granted, "greet");
  assert.deepEqual(revoked.allow, []);
  assert.deepEqual(revoked.block, ["greet"]);
  assert.deepEqual(grantTrust(revoked, "greet", "d".repeat(64)).block, []);

  // Re-trusting replaces the grant rather than accumulating duplicates.
  assert.deepEqual(grantTrust(granted, "greet", "d".repeat(64)).allow, [{ name: "greet", executableSha256: "d".repeat(64) }]);

  // Serialization is deterministic, so two clones consenting to the same set
  // produce byte-identical files.
  const forward = grantTrust(grantTrust(EMPTY_TRUST_STORE, "alpha", undefined), "beta", undefined);
  const backward = grantTrust(grantTrust(EMPTY_TRUST_STORE, "beta", undefined), "alpha", undefined);
  assert.equal(serializeTrustStore(forward), serializeTrustStore(backward));

  // Every malformed shape is an error, never a silently empty store: reading
  // corruption as "no entries" would drop `block` and widen the policy.
  for (const malformed of [
    "not json",
    "[]",
    `{"version":2,"allow":[],"block":[]}`,
    `{"version":1,"allow":"nope","block":[]}`,
    `{"version":1,"allow":[{"name":""}],"block":[]}`,
    `{"version":1,"allow":[{"name":"a","executableSha256":"short"}],"block":[]}`,
    `{"version":1,"allow":[],"block":[1]}`,
  ]) {
    assert.throws(() => parseTrustStore(malformed), TrustStoreError, `must reject: ${malformed}`);
  }
}

const MANIFEST = [
  `name = "difftastic"`,
  `api = 1`,
  `version = "0.65.0"`,
  `description = "Structural diff provider"`,
  `publisher = "epoch:principal:abc123"`,
  `capabilities = ["syntax", "diff"]`,
  `determinism = "deterministic"`,
].join("\n");

const EXECUTABLE_DIGEST = createHash("sha256").update("#!/bin/sh\nexit 0\n").digest("hex");

/** A real Ed25519 publisher, so signature tests exercise actual verification. */
function publisherFixture(): { publisher: string; signManifest: (text: string) => string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const der = publicKey.export({ type: "spki", format: "der" });
  const publisher = `epoch:principal:${der.toString("base64url")}`;
  return {
    publisher,
    signManifest: (text: string) => {
      const manifest = parseExtensionManifest(text);
      return `ed25519:${sign(null, Buffer.from(manifestSigningPayload(manifest), "utf8"), privateKey).toString("base64")}`;
    },
  };
}

/** Build a manifest body with the given overrides applied. */
function manifestWith(overrides: Record<string, string>): string {
  const base: Record<string, string> = {
    name: `"difftastic"`,
    api: "1",
    version: `"0.65.0"`,
    publisher: `"epoch:principal:abc123"`,
    capabilities: `["syntax", "diff"]`,
    determinism: `"deterministic"`,
  };
  return Object.entries({ ...base, ...overrides })
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key} = ${value}`)
    .join("\n");
}

function fakeFileSystem(tree: Record<string, readonly string[]>, files: Record<string, string>): ExtensionFileSystem {
  return {
    listDirectory: (directory) => tree[directory] ?? [],
    isExecutableFile: (path) => Object.keys(tree).some((directory) => path.startsWith(directory)),
    readTextFile: (path) => files[path],
    fileDigest: () => EXECUTABLE_DIGEST,
  };
}

/** Manifest files for a set of extensions sharing one bin directory. */
function manifestsFor(directory: string, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [
    join(directory, extensionManifestFile(name)),
    MANIFEST.replace(`"difftastic"`, `"${name}"`),
  ]));
}

function manifestParsesAndValidates(): void {
  const manifest = parseExtensionManifest(MANIFEST);
  assert.equal(manifest.name, "difftastic");
  assert.equal(manifest.api, 1);
  assert.equal(manifest.version, "0.65.0");
  assert.equal(manifest.publisher, "epoch:principal:abc123");
  assert.deepEqual(manifest.capabilities, ["syntax", "diff"]);
  assert.equal(manifest.determinism, "deterministic");

  // The canonical form is what the host digests for the recorded descriptor,
  // so it must not depend on field order in the file.
  const shuffled = parseExtensionManifest(MANIFEST.split("\n").reverse().join("\n"));
  assert.equal(canonicalManifest(manifest), canonicalManifest(shuffled));
}

function manifestFailsClosedOnBadInput(): void {
  const rejects = (text: string, code: string): void => {
    assert.throws(
      () => parseExtensionManifest(text),
      (error: unknown) => error instanceof ExtensionManifestError && error.code === code,
      `expected ${code} for: ${text.replace(/\n/gu, " | ")}`,
    );
  };

  rejects(`name = "x"\napi = 2\nversion = "1"\ncapabilities = ["diff"]`, "unsupported-api");
  rejects(`name = "X"\napi = 1\nversion = "1"\ncapabilities = ["diff"]`, "invalid-field");
  rejects(`name = "x"\napi = 1\nversion = "1"\ncapabilities = []`, "invalid-field");
  rejects(`name = "x"\napi = 1\nversion = "1"\ncapabilities = ["teleport"]`, "invalid-field");
  rejects(`name = "x"\napi = 1\nversion = "1"\ncapabilities = ["diff"]\npublisher = "someone"`, "invalid-field");
  rejects(`name = "x"\napi = 1\ncapabilities = ["diff"]`, "invalid-field");
  rejects(`this is not toml`, "invalid-syntax");
}

function discoveryPrefersRepositoryOverUserOverPath(): void {
  const repositoryBin = join("/repo", ".epoch", "ext", "bin");
  const userBin = join("/home/dev", ".epoch", "ext", "bin");
  const pathBin = "/usr/local/bin";

  const found = discoverExtensions({
    repositoryRoot: "/repo",
    homeDirectory: "/home/dev",
    pathEntries: [pathBin],
    fileSystem: fakeFileSystem(
      {
        [repositoryBin]: ["epoch-difftastic"],
        [userBin]: ["epoch-difftastic", "epoch-absorb"],
        [pathBin]: ["epoch-difftastic", "epoch-cliff", "unrelated-binary"],
      },
      {
        ...manifestsFor(repositoryBin, ["difftastic"]),
        ...manifestsFor(userBin, ["difftastic", "absorb"]),
        ...manifestsFor(pathBin, ["difftastic", "cliff"]),
      },
    ),
  });

  assert.deepEqual(found.map((extension) => extension.name), ["absorb", "cliff", "difftastic"]);
  const difftastic = found.find((extension) => extension.name === "difftastic");
  assert.equal(difftastic?.source, "repository", "a repository-local extension overrides a global one");
  assert.ok(found.every((extension) => !extension.name.startsWith("unrelated")));
  // Several extensions can share one bin directory; a single directory-level
  // manifest could only ever name one of them.
  assert.ok(found.every((extension) => extension.manifest !== undefined), "every extension resolves its own manifest");
}

function discoveryReportsExtensionsWithoutAValidManifest(): void {
  const pathBin = "/usr/local/bin";
  const found = discoverExtensions({
    pathEntries: [pathBin],
    fileSystem: fakeFileSystem({ [pathBin]: ["epoch-mystery"] }, {}),
  });

  assert.equal(found.length, 1);
  assert.equal(found[0].manifest, undefined);
  // Reported, not silently dropped: the operator must be able to see it.
  assert.ok(found[0].manifestError?.includes("epoch-mystery.toml"));

  // Every extension Windows treats as launchable must also be strippable, or
  // `epoch-cliff.com` would be discovered as `cliff.com` and never match the
  // subcommand `cliff`.
  const windowsBin = "C:\\tools";
  const windowsNames = discoverExtensions({
    pathEntries: [windowsBin],
    fileSystem: fakeFileSystem(
      { [windowsBin]: ["epoch-alpha.EXE", "epoch-beta.com", "epoch-gamma.cmd", "epoch-delta.bat"] },
      {},
    ),
  }).map((extension) => extension.name);
  assert.deepEqual(windowsNames, ["alpha", "beta", "delta", "gamma"]);

  // Several spellings can normalize to one name. `readdirSync` order is
  // filesystem-dependent, so without an explicit precedence the winner would
  // vary between machines — the opposite of what this mechanism promises.
  const duplicates = ["epoch-foo.cmd", "epoch-foo.exe", "epoch-foo.bat", "epoch-foo.com"];
  const chosen = (entries: readonly string[]): string | undefined => discoverExtensions({
    pathEntries: [windowsBin],
    fileSystem: fakeFileSystem({ [windowsBin]: entries }, {}),
  })[0]?.executable;

  const expected = join(windowsBin, "epoch-foo.exe");
  assert.equal(chosen(duplicates), expected);
  assert.equal(chosen([...duplicates].reverse()), expected, "directory order must not decide the winner");
  assert.equal(chosen(["epoch-foo.cmd", "epoch-foo.bat"]), join(windowsBin, "epoch-foo.bat"));
}

function discoveredExtension(name: string, manifestText?: string) {
  const pathBin = "/usr/local/bin";
  return discoverExtensions({
    pathEntries: [pathBin],
    fileSystem: fakeFileSystem(
      { [pathBin]: [`epoch-${name}`] },
      manifestText === undefined ? {} : { [join(pathBin, extensionManifestFile(name))]: manifestText },
    ),
  })[0];
}

function defaultPolicyRefusesUntrustedExtensions(): void {
  const extension = discoveredExtension("difftastic", MANIFEST);
  const decision = evaluateTrust("difftastic", extension.manifest, DEFAULT_TRUST_POLICY);

  assert.equal(decision.trusted, false);
  assert.equal(decision.reason, "not-allowed");
  // Git runs any `git-x` on PATH without asking. Epoch reports and stops.
  assert.ok(decision.detail.includes("epoch ext trust difftastic"));
}

function explicitAllowTrustsOneExtension(): void {
  const extension = discoveredExtension("difftastic", MANIFEST);
  const policy = readTrustPolicy({ trust: "explicit", allow: ["difftastic"] });
  const decision = evaluateTrust("difftastic", extension.manifest, policy);

  assert.equal(decision.trusted, true);
  assert.equal(decision.reason, "allowed-by-name");
  assert.equal(evaluateTrust("absorb", extension.manifest, policy).trusted, false);
}

function signedPolicyRequiresSignatureAndKnownPublisher(): void {
  const { publisher, signManifest } = publisherFixture();
  const policy = readTrustPolicy({ trust: "signed", allow_publishers: [publisher] });
  const body = manifestWith({ publisher: `"${publisher}"`, executable_sha256: `"${EXECUTABLE_DIGEST}"` });
  const signed = parseExtensionManifest(`${body}\nsignature = ${JSON.stringify(signManifest(body))}`);
  const bound = { executableSha256: EXECUTABLE_DIGEST };

  assert.equal(evaluateTrust("difftastic", parseExtensionManifest(body), policy, bound).reason, "unsigned");
  assert.equal(evaluateTrust("difftastic", signed, policy, bound).trusted, true);

  // A forged signature must not pass. This is the whole point of the mode:
  // `publisher` and `signature` are both attacker-controlled manifest input,
  // so only verification against the named key can grant trust.
  const forged = parseExtensionManifest(`${body}\nsignature = "ed25519:deadbeef"`);
  assert.equal(evaluateTrust("difftastic", forged, policy, bound).reason, "invalid-signature");

  // A valid signature over different content must not transfer.
  const tamperedBody = manifestWith({
    publisher: `"${publisher}"`,
    executable_sha256: `"${EXECUTABLE_DIGEST}"`,
    version: `"9.9.9"`,
  });
  const tampered = parseExtensionManifest(`${tamperedBody}\nsignature = ${JSON.stringify(signManifest(body))}`);
  assert.equal(evaluateTrust("difftastic", tampered, policy, bound).reason, "invalid-signature");

  // A signed manifest paired with a different binary must not pass either.
  const swapped = evaluateTrust("difftastic", signed, policy, { executableSha256: "b".repeat(64) });
  assert.equal(swapped.reason, "executable-mismatch");

  // An absent digest — an unreadable executable, or a filesystem seam that does
  // not implement `fileDigest` — is not "no objection". Skipping the check would
  // let a signed manifest be paired with any binary at all, which is exactly the
  // guarantee the mode sells.
  const undigested = evaluateTrust("difftastic", signed, policy, {});
  assert.equal(undigested.trusted, false);
  assert.equal(undigested.reason, "executable-mismatch");

  const otherPublisher = readTrustPolicy({ trust: "signed", allow_publishers: ["epoch:principal:zzz"] });
  assert.equal(evaluateTrust("difftastic", signed, otherPublisher, bound).reason, "publisher-not-allowed");

  // The default verifier rejects malformed input rather than throwing.
  assert.equal(ed25519ManifestVerifier({ payload: "x", signature: "nope", publisher }), false);
  assert.equal(ed25519ManifestVerifier({ payload: "x", signature: "ed25519:AAAA", publisher: "epoch:principal:" }), false);
}

function blockAlwaysWins(): void {
  const { publisher, signManifest } = publisherFixture();
  const body = manifestWith({ publisher: `"${publisher}"`, executable_sha256: `"${EXECUTABLE_DIGEST}"` });
  const signed = parseExtensionManifest(`${body}\nsignature = ${JSON.stringify(signManifest(body))}`);
  for (const trust of ["explicit", "signed", "any"] as const) {
    const policy = readTrustPolicy({
      trust,
      allow: ["difftastic"],
      block: ["difftastic"],
      allow_publishers: [publisher],
    });
    const decision = evaluateTrust("difftastic", signed, policy);
    assert.equal(decision.trusted, false, `block must win under trust='${trust}'`);
    assert.equal(decision.reason, "blocked-by-name");
  }
}

function openPolicyStillRequiresAManifest(): void {
  const policy = readTrustPolicy({ trust: "any" });
  // `any` reproduces Git's permissiveness for *declared* extensions, but an
  // undeclared binary still cannot state which capabilities it wants.
  assert.equal(evaluateTrust("mystery", undefined, policy).reason, "missing-manifest");
  assert.equal(evaluateTrust("difftastic", parseExtensionManifest(MANIFEST), policy).trusted, true);

  // An unrecognised trust mode narrows to the default rather than widening.
  assert.equal(readTrustPolicy({ trust: "yolo" }).trust, "explicit");
}

function builtinsShadowExtensionsVisibly(): void {
  const extension = discoveredExtension("diff", MANIFEST.replace(`"difftastic"`, `"diff"`));
  const builtins = ["diff", "merge", "log"];

  assert.deepEqual(resolveSubcommand("diff", { builtins, extensions: [extension] }), { kind: "builtin", name: "diff" });
  assert.deepEqual(shadowedExtensions(builtins, [extension]).map((entry) => entry.name), ["diff"]);
  assert.equal(resolveSubcommand("nope", { builtins, extensions: [extension] }).kind, "unknown");

  const trusted = discoveredExtension("absorb", MANIFEST.replace(`"difftastic"`, `"absorb"`));
  const policy = readTrustPolicy({ trust: "explicit", allow: ["absorb"] });
  assert.equal(resolveSubcommand("absorb", { builtins, extensions: [trusted], policy }).kind, "extension");
  assert.equal(resolveSubcommand("absorb", { builtins, extensions: [trusted] }).kind, "untrusted");
}

function invocationCarriesTheDocumentedEnvironmentContract(): void {
  const extension = discoveredExtension("absorb", MANIFEST.replace(`"difftastic"`, `"absorb"`));
  const invocation = buildExternalInvocation(extension, ["--and-rebase"], {
    repositoryRoot: "/repo",
    workingDirectory: "/repo/packages/core",
    grant: "grant-token",
    baseEnvironment: { PATH: "/usr/bin", EPOCH_DIR: "/stale/value" },
  });

  assert.deepEqual(invocation.args, ["--and-rebase"]);
  assert.equal(invocation.env.EPOCH_EXTENSION_API, "1");
  assert.equal(invocation.env.EPOCH_ROOT, "/repo");
  assert.equal(invocation.env.EPOCH_DIR, join("/repo", ".epoch"), "the contract must override a stale inherited value");
  assert.equal(invocation.env.EPOCH_PREFIX, "packages/core");
  assert.equal(invocation.env.EPOCH_EXTENSION_NAME, "absorb");
  assert.equal(invocation.env.EPOCH_EXTENSION_GRANT, "grant-token");
  assert.equal(invocation.env.PATH, "/usr/bin");

  const atRoot = buildExternalInvocation(extension, [], { repositoryRoot: "/repo", baseEnvironment: {} });
  assert.equal(atRoot.env.EPOCH_PREFIX, "");
  assert.equal(atRoot.env.EPOCH_EXTENSION_GRANT, "", "an ungranted invocation is explicit, not absent");
}

function builtinProvider(id: string, extra: Partial<Parameters<CapabilityRegistry["register"]>[0]> = {}) {
  return {
    id,
    capability: "syntax" as const,
    version: "1.0.0",
    source: "builtin" as const,
    determinism: "deterministic" as const,
    value: id,
    ...extra,
  };
}

function registryResolvesDeterministically(): void {
  const registry = new CapabilityRegistry();
  // Registered in an order that would win if load order decided anything.
  registry.register(builtinProvider("zeta.wildcard", { match: { wildcard: true } }));
  registry.register(builtinProvider("alpha.extension", { match: { extension: ".ts" } }));
  registry.register(builtinProvider("beta.mime", { match: { mimeType: "text/x-typescript" } }));
  registry.register(builtinProvider("gamma.language", { match: { language: "typescript" } }));

  assert.equal(
    registry.resolve("syntax", { language: "typescript", mimeType: "text/x-typescript", path: "a.ts" })?.id,
    "gamma.language",
    "language is the most specific match",
  );
  assert.equal(registry.resolve("syntax", { mimeType: "text/x-typescript", path: "a.ts" })?.id, "beta.mime");
  assert.equal(registry.resolve("syntax", { path: "a.ts" })?.id, "alpha.extension");
  assert.equal(registry.resolve("syntax", { path: "a.bin" })?.id, "zeta.wildcard", "every capability has a last resort");

  // Equal specificity breaks on provider ID, never on registration order.
  const tied = new CapabilityRegistry();
  tied.register(builtinProvider("zzz", { match: { wildcard: true } }));
  tied.register(builtinProvider("aaa", { match: { wildcard: true } }));
  assert.equal(tied.resolve("syntax", {})?.id, "aaa");
}

function registryHonoursPins(): void {
  const registry = new CapabilityRegistry();
  registry.register(builtinProvider("builtin.delimiter", { match: { wildcard: true } }));
  registry.register(builtinProvider("extension.grammar", { match: { language: "typescript" }, source: "extension" }));

  assert.equal(registry.resolve("syntax", { language: "typescript" })?.id, "extension.grammar");
  registry.pin("syntax", "builtin.delimiter");
  assert.equal(registry.resolve("syntax", { language: "typescript" })?.id, "builtin.delimiter");

  assert.throws(
    () => registry.pin("syntax", "not.installed"),
    (error: unknown) => error instanceof CapabilityRegistryError && error.code === "unknown-pin",
  );

  // A pin that cannot be honoured must fail loudly. Falling through to the
  // next-best provider would answer a pinned request with a different engine,
  // producing exactly the cross-clone divergence the pin exists to prevent.
  const advisory = new CapabilityRegistry();
  advisory.register(builtinProvider("ai.grammar", { match: { wildcard: true }, determinism: "advisory" }));
  advisory.register(builtinProvider("builtin.lines", { match: { wildcard: true } }));
  advisory.pin("syntax", "ai.grammar");
  assert.equal(advisory.resolve("syntax", {})?.id, "ai.grammar");
  assert.throws(
    () => advisory.resolve("syntax", { forSignedState: true }),
    (error: unknown) => error instanceof CapabilityRegistryError && error.code === "unknown-pin",
  );
}

function registryExcludesAdvisoryProvidersFromSignedState(): void {
  const registry = new CapabilityRegistry();
  registry.register(builtinProvider("ai.proposal", { match: { wildcard: true }, determinism: "advisory", source: "extension" }));

  assert.equal(registry.resolve("syntax", {})?.id, "ai.proposal");
  // An advisory provider may inform a human but must never shape signed state.
  assert.equal(registry.resolve("syntax", { forSignedState: true }), undefined);

  registry.register(builtinProvider("deterministic.fallback", { match: { wildcard: true } }));
  assert.equal(registry.resolve("syntax", { forSignedState: true })?.id, "deterministic.fallback");
}

function registryRefusesDuplicateProviders(): void {
  const registry = new CapabilityRegistry();
  registry.register(builtinProvider("same.id"));
  assert.throws(
    () => registry.register(builtinProvider("same.id")),
    (error: unknown) => error instanceof CapabilityRegistryError && error.code === "duplicate-provider",
  );
}

function descriptorCarriesProvenance(): void {
  const provider = builtinProvider("epoch.syntax.json", {
    source: "extension",
    manifestDigest: "a".repeat(64),
    configDigest: "b".repeat(64),
  });
  const descriptor = CapabilityRegistry.describe(provider);

  // This is what a verifier reads to answer "which engine produced this?".
  assert.deepEqual(descriptor, {
    providerId: "epoch.syntax.json",
    capability: "syntax",
    version: "1.0.0",
    source: "extension",
    determinism: "deterministic",
    manifestDigest: "a".repeat(64),
    configDigest: "b".repeat(64),
  });
}

function contractConstantsAreStable(): void {
  // These are the published contract. Changing them silently would break every
  // installed extension, so they are asserted rather than assumed.
  assert.equal(EXTENSION_API_VERSION, 1);
  assert.equal(EXTENSION_PREFIX, "epoch-");
  assert.equal(extensionManifestFile("greet"), "epoch-greet.toml");
  assert.deepEqual([...CAPABILITY_KINDS], [
    "command",
    "syntax",
    "diff",
    "merge",
    "compression",
    "view",
    "codec",
    "hook",
  ]);
  assert.deepEqual(DEFAULT_TRUST_POLICY, { trust: "explicit", allow: [], grants: [], block: [], allowPublishers: [] });
}

function realFilesystemDiscoveryFindsExecutablesOnly(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-ext-discovery-"));
  try {
    const bin = join(root, ".epoch", "ext", "bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "epoch-runnable"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(bin, "epoch-runnable"), 0o755);
    // Present but not executable: discovery must skip it rather than offer a
    // command that cannot run.
    writeFileSync(join(bin, "epoch-not-executable"), "not a program\n");
    chmodSync(join(bin, "epoch-not-executable"), 0o644);
    writeFileSync(join(bin, "unrelated"), "ignored\n");
    writeFileSync(join(bin, extensionManifestFile("runnable")), MANIFEST.replace('"difftastic"', '"runnable"'));

    const found = discoverExtensions({
      repositoryRoot: root,
      pathEntries: [],
      fileSystem: nodeExtensionFileSystem,
    });

    assert.deepEqual(found.map((extension) => extension.name), ["runnable"]);
    assert.equal(found[0].source, "repository");
    assert.equal(found[0].manifest?.name, "runnable");

    // A directory that does not exist is empty, not an error.
    assert.deepEqual(nodeExtensionFileSystem.listDirectory(join(root, "absent")), []);
    assert.equal(nodeExtensionFileSystem.isExecutableFile(join(root, "absent", "x")), false);
    assert.equal(nodeExtensionFileSystem.isExecutableFile(bin), false, "a directory is not an executable file");
    assert.equal(nodeExtensionFileSystem.readTextFile(join(root, "absent.toml")), undefined);

    // The digest of the real executable is captured for signature binding.
    assert.equal(
      found[0].executableSha256,
      createHash("sha256").update("#!/bin/sh\nexit 0\n").digest("hex"),
    );

    // A manifest naming a different extension is rejected, not adopted.
    writeFileSync(join(bin, extensionManifestFile("runnable")), MANIFEST);
    const mismatched = discoverExtensions({
      repositoryRoot: root,
      pathEntries: [],
      fileSystem: nodeExtensionFileSystem,
    });
    assert.equal(mismatched[0].manifest, undefined);
    assert.ok(mismatched[0].manifestError?.includes("difftastic"));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}
