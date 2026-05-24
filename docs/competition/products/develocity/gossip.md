---
product: Develocity
gossip_sources:
  - https://www.reddit.com/r/androiddev/comments/149yuq5/do_you_use_gradle_enterprises/
  - https://www.reddit.com/r/gradle/comments/cfq8uh/why_do_build_scans_require_a_remote_server/
  - https://www.reddit.com/r/java/comments/1g6dv10/five_ways_to_speed_up_your_maven_builds/
  - https://docs.gradle.com/enterprise/gradle-plugin/current/
---

# Gossip

## What People Say

Public sentiment is split between strong praise for Build Scan troubleshooting and concern about server-side diagnostics, enterprise packaging, and plugin complexity. Android and Java community posts describe build scans as helpful when developers can share a failing build link and teammates can inspect it, while older Gradle threads complain that offline scan capture is not available for the same level of detail.

## Design And UX Complaints

- Users who only want local profiling can see the server-centered Build Scan model as unnecessary or privacy-sensitive.
- Some developers perceive product pages and blog posts as selling Develocity when they expected neutral build advice.
- The UI and docs expose many concepts, which is useful for build engineers but can be a lot for ordinary application developers.

## Feature Complaints

- Release notes show recurring fixes around cache behavior, predictive test selection, test distribution, resource usage capture, proxy handling, and plugin/API migration.
- Community discussion around Maven build cache alternatives suggests Develocity's profiling is valued, but users still look for lighter or free cache options.
- Predictive test selection and distributed execution can create trust gaps unless skipped tests, selected tests, and failure modes are explained clearly.

## Product Risk For Epoch

Develocity shows that operational build evidence can become the system of record for "what happened." Epoch should connect signed source history to build and test evidence before a build-observability platform owns that narrative completely.
