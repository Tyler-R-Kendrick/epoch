---
product: Lovable
slug: lovable
design_sources:
  - https://docs.lovable.dev/integrations/github
  - https://docs.lovable.dev/integrations/supabase
  - https://docs.lovable.dev/features/custom-domain
  - https://docs.lovable.dev/changelog
---

# Design

## Look And Feel

Lovable uses a creator-first app builder surface: conversational instructions, generated preview, in-app code editor, project settings, publish controls, Git settings, and connector configuration. The public docs emphasize plain-language setup, guided modals, status labels, branch pickers, and workspace settings rather than a developer-only command surface.

## Open Design Artifacts

- Public documentation shows the information architecture for GitHub, Supabase, app connectors, custom domains, publishing, roles, and security controls.
- The changelog documents visible product affordances such as profiles, connector availability, GitHub identity co-authoring, branch sync improvements, and workspace-level features.
- Pricing exposes the product token vocabulary: credits, daily credits, rollovers, on-demand top-ups, internal publish, SSO, roles, security center, and enterprise platform fee.

## Differentiators

- The product hides infrastructure setup behind conversational requests while still exposing GitHub, Supabase, domains, roles, and publish settings when needed.
- GitHub sync is presented as an escape hatch and collaboration path, not as a prerequisite for non-technical builders.
- Supabase is framed as a backend that Lovable can build through conversation, reducing the number of separate consoles a creator must understand.

## What Works Well

- The UI vocabulary meets non-technical founders where they are: publish, connect GitHub, connect Supabase, custom domain, roles, and workspace.
- Paid-plan controls acknowledge that internal apps and teams need private publishing, role-based access, SSO, and security review.
- Branch switching and pull-request support give experienced developers a path to safer iteration.

## Where It Breaks Down

- The platform can blur which surface is authoritative when Lovable, GitHub, local IDEs, and preview deployments all participate in the same project.
- Conversational backend changes can make database policy, migration, and edge-function risk feel simpler than it is.
- Credit metering and generated-code retries can make complex bug fixing feel unpredictable when the user is trying to ship the final production hardening work.
