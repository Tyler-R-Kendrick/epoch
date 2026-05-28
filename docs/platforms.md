# Epoch Platform And Community Packages

Epoch has a separate hosting control-plane package and separate Community
packages. Platform Web deploys Community as an app descriptor; it does not
import the Community implementation.

## Epoch.Platform.Web

Workspace package: `packages/Epoch.Platform.Web`

Published package name: `@epoch/platform-web`

`Epoch.Platform.Web` is the Epoch hosting control-plane PWA. It is modeled after
Coolify-style service management, but it is scoped only to services required to
host Epoch infrastructure and Epoch-related apps.

Implemented responsibilities:

- describe a standalone PWA app shell for the hosting control plane;
- list Epoch runtime, storage, and sync seed services;
- register deployable Epoch apps through a generic `DeployableEpochApp`
  descriptor;
- expose deployment operations such as provision, deploy, restart, rollback,
  scale, backup, restore, and health inspection; and
- keep `communityWorkflows` empty so repository browsing, issues, reviews, and
  discussions cannot drift into the hosting control plane.

`Epoch.Platform.Web` can manage the Community app only as a deployable service
descriptor. It does not import `@epoch/community-web`,
`@epoch/community-core`, `@epoch/community-api`, or `@epoch/community-cli`.

## Epoch.Community.API

Workspace package: `packages/Epoch.Community.API`

Published package name: `@epoch/community-api`

`Epoch.Community.API` owns the current API implementation for the GitHub-like
community product. The current prototype uses an in-memory API transport that
implements the Core transport contract.

Implemented responsibilities:

- create community repository records with maintainers, topics, issues, change
  proposals, and discussions;
- expose the workflow catalog for repository browsing, issue tracking, change
  review, discussions, maintainer profiles, release discovery, and organization
  spaces; and
- open issues, propose changes, and record maintainer reviews.

`Epoch.Community.API` depends on `@epoch/community-core` for shared types and
the `CommunityApiTransport` contract. It does not import the Web or CLI
packages.

## Epoch.Community.Core

Workspace package: `packages/Epoch.Community.Core`

Published package name: `@epoch/community-core`

`Epoch.Community.Core` is the community API client and shared type package. It
does not implement persistence or rendering.

Implemented responsibilities:

- define repository, issue, change proposal, review, discussion, and workflow
  types;
- define the `CommunityApiTransport` contract; and
- expose `createCommunityClient(...)`, which wraps an API transport for Web and
  CLI consumers.

`Epoch.Community.Core` does not import API, Web, or CLI.

## Epoch.Community.CLI

Workspace package: `packages/Epoch.Community.CLI`

Published package name: `@epoch/community-cli`

Binary name: `epoch-community`

`Epoch.Community.CLI` is a command-line client for Community workflows. It
depends on `@epoch/community-core` and expects a Core client context from the
host wiring.

Implemented responsibilities:

- list repositories;
- open issues;
- propose changes; and
- record change reviews.

It does not import `@epoch/community-api`; test and host wiring provide the
client.

## Epoch.Community.Web

Workspace package: `packages/Epoch.Community.Web`

Published package name: `@epoch/community-web`

`Epoch.Community.Web` is the separate PWA shell for the Epoch community product.
It consumes `@epoch/community-core` to load workflows and repositories from a
Core client.

Implemented responsibilities:

- describe a standalone PWA app shell for the community app;
- expose repository browsing, issue tracking, change review, discussions,
  maintainer profiles, release discovery, and organization spaces from Core
  workflow data;
- render Community repository summaries supplied by the client; and
- publish a generic Community deployment target that can be registered with
  `Epoch.Platform.Web`.

Community Web product design follows design thinking, user-centric design, and
human-centered design through
[Epoch Community Human-Centered Design](community-human-centered-design.md):
the default persona is a GitHub open-source contributor, and future Community
experience changes must account for contributor trust, security, cost,
accessibility, moderation, availability, and portability before adding forge
features.

## Boundary Rule

The platform boundary is enforced by tests:

- `test/unit/platform-boundaries.test.ts` checks that Web treats Community as a
  deployable app, that Community owns the collaboration workflows, and that the
  package dependency direction stays Core-centered.
- `features/platform_projects.feature` captures the user-facing product split
  with executable scenarios.
- `features/platform_projects.feature` also includes a Playwright-driven browser
  scenario for `Epoch.Community.Web`.
- `test/unit/community-contract.test.ts` uses Pact to lock the
  `Epoch.Community.Core` HTTP client contract with `Epoch.Community.API`.
- `test/unit/community-coverage.test.ts` covers Community API routing, CLI
  workflow commands, CLI validation errors, and Core HTTP error handling.

Coverage is enforced through `npm run coverage`. The Community packages are
included in the c8 report rather than excluded as generated or test-only code.

The intended integration point is structural data:

```ts
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { createCommunityClient } from "@epoch/community-core";
import { createCommunityWebApp } from "@epoch/community-web";
import { createPlatformWebApp } from "@epoch/platform-web";

const client = createCommunityClient(createInMemoryCommunityApi());
const community = await createCommunityWebApp({ client });
const web = createPlatformWebApp({
  deployableApps: [community.deploymentTarget],
});
```

This composition belongs at deployment or host-application wiring time, not in
either platform package.
