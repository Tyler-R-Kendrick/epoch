# Epoch Community Human-Centered Design

Epoch Community is designed through design thinking, user-centric design, and
human-centered design, not feature parity with any existing forge. The product
it serves is Epoch.Community.Web — to Epoch what GitHub is to Git: one central
place to follow the work of people and projects, manage contributions to your
own projects, and engage a community whose builders now include professional
developers, citizen builders building in the open, and agents contributing
concurrently under human oversight. Epoch, the signed DVCS underneath, is the
link that makes collaboration trustworthy, and its primitives (intents,
anchors, epochs, verified identity) are surfaced as legible product concepts
rather than hidden; the epoch — the point-in-time materialization of what the
community built — is the defining artifact. The current
Community packages are still small, so this document is the product-design
constraint for future Community Web, API, Core, and CLI work: start from people,
prove the problem, then choose the smallest trustworthy workflow.

This document complements the [feature registry](features.md), [executable
feature scenario inventory](feature-scenario-inventory.md), [persona feature
matrix](persona-feature-matrix.md), [current design](design.md), [platform package boundary](platforms.md), and
[ADR-0012](design-decisions/0012-community-human-centered-design.md). It is
not a substitute for executable feature coverage when behavior changes.

## Methodology Stack

Epoch Community applies three complementary methods:

- **Design thinking:** use an explicit Discover, Define, Ideate, Prototype,
  Validate, and Learn loop before broadening scope.
- **User-centric design:** keep the contributor's task, context, and success
  criteria at the center of product decisions instead of optimizing for
  internal package boundaries, forge feature parity, or implementation
  convenience.
- **Human-centered design:** account for trust, safety, privacy, accessibility,
  moderation, cost, culture, time pressure, and emotional stakes around
  open-source contribution.

## Design Thinking Loop

Every Community-site change uses this loop:

1. Discover the human context: who is affected, what they are trying to do,
   what is stressful, and what trust signal is missing.
2. Define the problem in terms of the contributor's job, not the screen or API
   that seems easiest to build.
3. Ideate at least two smaller alternatives before choosing a solution.
4. Prototype the lowest-risk path with accessible copy, graceful failure, and
   clear evidence of system state.
5. Validate with feature scenarios, tests, or documented research evidence.
6. Learn from production signals, support reports, moderation reports, and
   contributor feedback before expanding scope.

## Product Behavior Spec Boundary

Every Community Web, API, Core, CLI, workflow, or public-doc change that
affects contributor experience must document the human context before
broadening implementation scope. When the change adds or changes user-visible
product behavior, add or update a persona-tagged Gherkin scenario in the
relevant product feature file under `features/`.

Personas are users in scenarios, not standalone features. Do not create
persona-only, human-centered-design-only, or e2e-journey feature files, and do
not encode agent instructions, test-running procedures, evidence recording,
persona-matrix audits, or repository governance checks as `.feature` scenarios.
The [persona feature matrix](persona-feature-matrix.md) connects executable app
capabilities to personas, including supporting operator, maintainer, and
security/compliance personas when those features protect the contributor
experience indirectly. The
[executable feature scenario inventory](feature-scenario-inventory.md) records
every scenario, scenario outline, rule context, examples count, and persona tag
so feature capture can be audited at the behavior level.

Each product scenario or supporting doc must use the applicable persona tag and
name:

- the persona;
- the contributor journey;
- the pain point;
- the trust question;
- the degraded-state behavior;
- the security, privacy, cost, accessibility, moderation, and portability
  considerations that matter to that journey; and
- the validation evidence that proves the contributor can finish the job.

Product behavior specs should describe the human outcome first and
implementation details second. A feature title must describe product behavior,
not the persona or the design method. Docs and pull requests should show where
the change sits in the design-thinking loop and how the user-centric success
criteria are protected.

For Community work, the pull request or design note must answer:

- Which persona and contribution journey is this for?
- What pain point or human risk does it reduce?
- What does the user need to trust before taking action?
- What design-thinking stage is being validated?
- Which user-centric success criteria decide whether the workflow is useful?
- What happens when Git hosting, search, CI, AI assistance, or billing is
  degraded?
- What security, privacy, cost, accessibility, and moderation concerns were
  considered?
- How will the change be validated beyond "it renders"?
- **Would this persona reject the UI for lacking craft, playfulness, wonder, or
  design-philosophy adherence?** (If yes, list fails and fix before merge.)
- **What adversarial critique did each relevant persona raise, and what changed?**

## Primary Persona

**Persona:** A GitHub open-source contributor.

This persona represents the average developer who contributes to open source
projects through GitHub-shaped workflows. They may be a maintainer, repeat
contributor, first-time contributor, hobbyist, student, freelancer, employee
contributing upstream for work, or a person maintaining a widely used package
without dedicated platform support.

Daily context:

- moves between issues, pull requests, discussions, docs, releases, local Git,
  CI, security alerts, and AI coding tools;
- contributes in short windows between work, school, family, or maintainer
  obligations;
- often relies on free or low-cost tools and may not control organization
  billing settings;
- uses multiple devices, editors, terminals, and browsers;
- cares about reputation, project norms, maintainer trust, and whether their
  work will be reviewed fairly;
- needs confidence that project state, CI status, review state, and release
  artifacts are accurate.

Goals:

- find a project that is alive, safe, welcoming, and worth their time;
- **feel invited** — the product should spark curiosity and craft pride, not
  read as a gray wireframe or generic SaaS admin;
- understand how to make a useful contribution without hidden rules;
- submit changes without accidentally leaking secrets, breaking policy, or
  triggering unexpected cost;
- recover from outages, stale indexes, failed automation, or lost context;
- keep control of their identity, contribution history, and local work.

Aesthetic and experience bar (this persona is **harsh**):

- Rejects lifeless “correct” UIs: if hierarchy, density, type, and color do not
  feel intentional, the product is unfinished.
- Expects **playfulness as craft** — responsive controls, warm place identity,
  delightful micro-feedback — never carnival AI-slop.
- Expects **wonder** from signed proof and clear community place (Discord-grade
  belonging + Epoch trust), not from decoration.
- Holds the product to root [DESIGN.md](../DESIGN.md) philosophy (Signed Civic
  Workshop). Drift from named rules is a defect, not taste.

When hosted services are degraded, this persona still needs to judge current
repository state, keep useful local work moving, and understand whether the
problem is their change, the project, or the provider.

Human considerations:

- Time is scarce. The site should reduce orientation cost, not add rituals.
- Trust is fragile. Stale state, vague errors, or hidden moderation decisions
  feel personal when a contributor has donated unpaid labor.
- Security is emotional as well as technical. A malicious extension, stolen
  token, or poisoned workflow can threaten work, reputation, employment, and
  community standing.
- Cost uncertainty changes behavior. Contributors may avoid AI review, CI, or
  cloud environments if pricing, quotas, or ownership of spend is unclear.
- Accessibility is not optional. Community workflows must work with keyboard,
  screen readers, narrow screens, low bandwidth, high contrast, and interrupted
  sessions.
- Open source is global and asynchronous. Language, timezone, culture, and
  project governance differences should be expected rather than treated as edge
  cases.

## Current Research Signals

These signals were reviewed on May 28, 2026. Re-verify them before making
pricing, security, or availability claims in product copy.

| Signal | Human-centered implication |
|---|---|
| GitHub reported 10 April 2026 incidents and described severe user-visible failures, including full code-search unavailability on April 1, multi-service degradation on April 23, and search-backed surfaces with up to 65% of searches timing out or erroring on April 27. | Community should expose trustworthy state, stale-data warnings, retry guidance, and local/offline escape hatches instead of assuming centralized search, pull request views, or CI status are always reliable. |
| GitHub's status-page update says degraded performance does not count as downtime in uptime percentages. | Epoch should distinguish provider-reported availability from contributor-experienced usability. A workflow can be "up" and still not usable for the person trying to ship a fix. |
| GitHub disclosed a May 2026 compromise involving a poisoned VS Code extension, internal repository exfiltration claims around 3,800 repositories, critical secret rotation, and GHES signing-key rotation. | Community design must treat editor extensions, workflow credentials, signing keys, and dependency metadata as part of the contributor's trust environment. Security warnings should explain practical next steps without panic. |
| GitHub Free personal accounts include public collaboration, limited private-repository features, 2,000 Actions minutes, 120 Codespaces core hours, and 15 GB Codespaces storage; Pro and organization plans change these limits and governance controls. | Community onboarding should be useful without paid assumptions and should make quota, runner, storage, and private-governance implications visible before contributors trigger expensive automation. |
| GitHub Copilot moves to usage-based billing on June 1, 2026, with GitHub AI Credits, token-based consumption, budget controls, and Copilot code review also consuming Actions minutes. | AI-assisted contribution features must show ownership of cost, budget state, and fallbacks. A contributor should know whether an action is free, included, paid by them, or paid by an organization before invoking it. |

Sources: [GitHub availability report: April 2026](https://github.blog/news-insights/company-news/github-availability-report-april-2026/), [Bringing more transparency to GitHub's status page](https://github.blog/news-insights/company-news/bringing-more-transparency-to-githubs-status-page/), [An update on GitHub availability](https://github.blog/news-insights/company-news/an-update-on-github-availability/), [Investigation update: GitHub Enterprise Server signing key rotation](https://github.blog/security/investigating-unauthorized-access-to-githubs-internal-repositories/), [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), [Product usage included with each plan](https://docs.github.com/en/billing/reference/product-usage-included), [Plans for GitHub Copilot](https://docs.github.com/en/copilot/get-started/plans), and [GitHub Copilot is moving to usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/).

## Pain Points To Solve For

### Trusting Current State

The contributor needs to know whether a repository, issue list, review queue,
search result, release, CI check, or moderation state is current. If data is
stale, partial, or sourced from a degraded dependency, the site should say so in
plain language and offer a next action.

Design implications:

- show freshness, source, and verification status for critical repository
  state;
- keep local signed history and portable exports useful when hosted services
  are degraded;
- make retry, refresh, and "continue locally" actions explicit;
- avoid silent empty states when search-backed data may be stale.

### Protecting Contributor Security

The contributor is surrounded by high-privilege tools: editors, extensions,
AI agents, CI workflows, package registries, signing keys, webhooks, and local
secrets. The site should help them understand what is trusted, what is verified,
and what has changed.

Design implications:

- present provenance, signature, and policy status near contribution actions;
- warn before workflows request broad tokens, secret access, or write access;
- keep security copy actionable and specific, with actionable next steps;
- support takedown, report, block, and legal-hold flows without turning
  moderation into opaque punishment.

### Avoiding Surprise Cost

Open-source contributors may be using a personal free plan, a sponsor-funded
organization, an employer-owned account, or a trial. They should never have to
guess who pays for CI, cloud environments, storage, AI review, or agentic work.

Design implications:

- label cost owners and quota impact before running automation;
- make free-path contribution viable;
- preserve a clear free path for review, issue discussion, and local validation;
- provide low-cost alternatives such as local validation, offline review, and
  smaller test targets;
- expose budget and rate-limit failures as understandable product states.

### Reducing Maintainer And Contributor Burnout

Open-source work often happens under emotional load: unpaid review, repeated
questions, drive-by requests, security pressure, and public disagreement. The
community site should reduce ambiguity and support respectful asynchronous
collaboration.

Design implications:

- make contribution guidelines, project health, and maintainer expectations
  discoverable near the action;
- prefer focused prompts that improve issue and change quality;
- surface "good first issue" and "help wanted" work only when the project can
  receive it;
- make moderation and report workflows transparent enough to trust.

### Preserving Agency And Portability

The contributor should not feel trapped by a hosted service. They should be
able to keep useful local history, understand what was signed, export what they
need, and continue when a central service is impaired.

Design implications:

- design repository pages around signed facts and portable history;
- keep offline-friendly read and contribution paths in scope;
- make imports, exports, mirrors, and backups understandable;
- avoid features that only work when the hosted community site is the sole
  authority.

## Community Design Principles

1. Start from contributor work, not forge feature parity.
2. Apply design thinking before broadening scope.
3. Keep user-centric success criteria visible in scenarios and pull requests.
4. Treat trust, cost, security, and availability as user-experience concerns.
5. Prefer clear evidence over reassuring copy.
6. Make degraded state legible and recoverable.
7. Preserve a useful free path for open-source contribution.
8. Minimize cognitive load for short, interrupted contribution sessions.
9. Keep accessibility, moderation, privacy, and global async collaboration in
   the definition of done.
10. Validate with scenarios that show the contributor can finish the job.
11. Treat visual craft, playfulness, and wonder as product quality — not optional
    polish after “it works.”
12. Fail closed on design-philosophy drift: if it violates root [DESIGN.md](../DESIGN.md)
    or feels like AI-slop / generic SaaS / dead wireframe, personas reject it.

## Experience Quality: Craft, Playfulness, And Wonder

Personas do **not** accept “functionally correct but lifeless” Community UI.
Open-source people already live in dense tools (GitHub, Slack, Discord). They
still notice when a product feels proud, crafted, and inviting versus flat,
generic, or cold.

### What “playfulness” and “wonder” mean here

| Allowed (craft delight) | Forbidden (spectacle / slop) |
|---|---|
| Warm hierarchy, confident type, copper rarity that *sparks* action | Gradient text, glassmorphism, purple-blue AI chrome |
| Micro-feedback that feels responsive and alive (focus, hover, send) | Fake presence, vanity metrics, confetti for no reason |
| Signature signed-history / trust visuals that create *awe of proof* | Decorative orbs, pill spam, hero-metric cosplay |
| Community channels that feel like a hangout with personality | Repo-only wireframe pretending to be social |
| Soft breathing room + high scan density (Bluesky calm + Slack skill) | Sparse empty SaaS or cramped illegible walls |

Wonder comes from **signed civic craft**: seeing that collaboration is real,
accountable, and beautiful enough to *want* to stay — not from carnival UI.

### Persona stance: critical by default

Each persona below must **adversarially critique** Community visuals before a
change is accepted. Neutrality is failure. “Looks fine” is not a valid review.

| Persona | Adversarial lens | Instant reject if… |
|---|---|---|
| GitHub open-source contributor | “Would I proudly open this on stream / in a mentor session?” | UI feels like a stub, default browser chrome, or boring admin template |
| Maintainer | “Does this reduce burnout or add gray mush to moderate?” | No clear place hierarchy; signed work hidden; social hangout dead |
| Platform operator | “Would I demo this to a customer without apologizing?” | Tokens ignored; inconsistent density; broken a11y focus |
| Security / compliance responder | “Does trust look *serious and legible* or decorative?” | Trust meta as noise, or no honest live/snapshot signaling |

## Adversarial Design Critique Protocol

Before finishing any Community Web (or Community-facing surface) change, agents
and reviewers must run this critique **in the voice of the primary persona**,
then at least one supporting persona. Write the critique in the PR or design
note. Soft language is banned: use **pass / fail** with fixes.

**Artifact checks are prerequisites, not suggestions.** Before any pass/fail is
written, the reviewer must (1) read the token-conformance audit
(`npm run design:audit` → `.optimizexp/audits/token-conformance.json`) — if it
is missing or failing on enforced classes, craft cannot be scored and the
critique records that instead; (2) inspect the rendered DOM for at least one
claim (screenshots alone are inadmissible — screenshot-only review is how the
client renderer shipped social messages without action trays); (3) check the
standing defect ledger (`.optimizexp/defects.json`) — an open defect on the
reviewed surface caps the critique at fail until addressed or explicitly
scheduled; (4) cite evidence paths for every judgment.

### Critique template (required)

```text
Persona: <tag / name>
Surface: <route or component>
DESIGN.md north star check: pass | fail — <why>
Craft (hierarchy, density, typography, color rarity): pass | fail — <why>
Playfulness / wonder (craft delight, not slop): pass | fail — <why>
Competitive bar (vs Discord/Slack/X/Bluesky/Tangled where relevant): pass | fail — <why>
Accessibility / honesty / trust legibility: pass | fail — <why>
Unacceptable issues (must fix before merge):
- ...
Delight opportunities (should fix this pass if cheap):
- ...
```

### Automatic fail conditions (any one blocks “done”)

1. **Design philosophy violation** of root [DESIGN.md](../DESIGN.md) named rules
   (Copper Rarity, Community Owns Channels, Network Is Discovery, Flat Feed,
   No Pill / No Glass / No Gradient Text, Surface Is Product, etc.).
2. **Lifeless product** — correct layout with no craft hierarchy, no intentional
   type scale, no signature trust visual language, no sense of place.
3. **AI-slop tells** — capsules, glass, purple gradients, fake social proof,
   decorative motion without state meaning.
4. **Competitor regression** — clearly worse place-model or feed scan than the
   competitor we just studied for that surface (document which).
5. **Honesty failure** — live vs snapshot / federation mode unclear.
6. **Trust theater** — signatures/anchors missing where signed work matters, or
   so loud they crush message content.
7. **Hangout without a soul** — community channels that read as empty admin
   lists with no invitation to participate.
8. **Family incoherence** — Community, Operations, and Platform Web opened side
   by side do not read as one product family (divergent palettes, near-miss
   token copies, or rules honored in one surface and violated in another).

### Pass bar (all required)

- Persona would **choose** to stay in the product for a real contribution window.
- Visual system matches DESIGN.md tokens (colors, radii ≤8px, rail/feed split,
  copper rarity, teal intent, gold only for verification).
- At least one moment of **craft delight** or **proof wonder** is intentional
  (e.g. signed action tray clarity, copper active channel edge, network verb
  cards, community welcome that feels human).
- Degraded/snapshot states are plainspoken, not embarrassing afterthoughts.
- Adversarial critique is written and residual fails are fixed or explicitly
  scheduled with persona impact.

## Definition Of Done For Community Experience Changes

A Community Web, API, Core, CLI, or workflow change is not ready until it has:

- a named persona, normally this GitHub open-source contributor persona unless
  the change intentionally serves another documented persona;
- a pain point from this document or a newly documented research finding;
- docs or scenarios that explain what the contributor can do during degraded,
  stale, risky, or quota-limited states;
- explicit consideration of security, privacy, cost, accessibility, moderation,
  and portability;
- **an adversarial persona design critique** (template above) with zero open
  automatic-fail conditions;
- **DESIGN.md conformance** for any visual change (`npm run design:lint` when
  tokens change; visual check against named rules when shell CSS changes);
- updated [agent instructions](../AGENTS.md), [documentation freshness](documentation-freshness.md), and [Epoch skill](../skills/epoch/SKILL.md) references when the design method or agent workflow changes.

## Definition Of Done For Feature Specs

Every executable feature spec in `features/` is not ready until it has:

- a row in [features.md](features.md);
- a row in the [executable feature scenario inventory](feature-scenario-inventory.md)
  for every affected scenario or scenario outline;
- a row in the [persona feature matrix](persona-feature-matrix.md);
- a named persona and contribution or operations journey;
- a pain point and trust question;
- degraded-state behavior and validation evidence; and
- at least one relevant human consideration such as security, privacy, cost,
  accessibility, moderation, portability, auditability, recovery, compliance,
  or AI governance.

Personas must appear as scenario tags or explicit scenario context inside real
product feature specs. Do not create `persona_*`, `*_persona_*`,
`*_e2e_journeys`, human-centered-design, or similar governance-only feature
files, and do not add matrix-only scenario outlines.
