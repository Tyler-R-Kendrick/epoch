---
product: Develocity
design_sources:
  - https://gradle.com/develocity/
  - https://gradle.com/develocity/product-tour/home/
  - https://docs.gradle.com/enterprise/get-started/
  - https://docs.gradle.com/develocity/current/using-develocity/predictive-test-selection/
---

# Design

## Look And Feel

Develocity combines enterprise marketing design with dense build-observability dashboards. Public screenshots emphasize Build Scan summaries, timeline visualizations, dependency graphs, comparisons, test views, flaky-test management, analytics charts, and performance-insight panels.

## Open Design Assets

- The product and docs pages expose many screenshots with alt text for Build Scan, Analytics, Performance Insights, Flaky Test Detection, Failure Analytics, dependency visualization, task-input comparison, output-origin links, and predictive test dashboards.
- The public docs provide concrete UI flow references for comparing scans, finding dependency differences, and diagnosing cache misses.
- No public design-token package was found in the reviewed sources.

## Differentiators

- Build Scan is the anchor: Develocity makes an individual build a shareable artifact with structured evidence, comparisons, dependencies, timeline, task inputs, and environment data.
- Predictive Test Selection adds explanations and savings estimates to test skipping, which makes an optimization decision reviewable rather than invisible.
- The design is oriented toward enterprise build engineers and developer-productivity teams, not only individual developers.

## What Works

- Build Scan comparison is a strong UX pattern for explaining why two apparently similar builds behaved differently.
- Dashboards connect individual failures to organization-level trends, which helps justify platform work to management.
- Screenshots and docs make cache misses, dependency drift, and test selection visible enough to teach teams how the system thinks.

## UX Breakdowns

- The UI can feel heavyweight for teams that only need local timing data or a simple cache.
- Build scans historically trigger privacy concerns because useful diagnostics may require publishing build metadata to a server.
- Predictive test skipping and cache reuse add trust questions: users need to understand why a test did not run or why a cached result was accepted.

## Epoch Design Lessons

- Epoch should make each signed history/version/build relationship shareable and comparable.
- Any optimization based on prior state needs an explanation surface, not just a success/failure flag.
- Privacy controls should be prominent when source, dependency, environment, or execution metadata leaves a local machine.
