---
product: Triplit
gossip_sources:
  - https://www.triplit.dev/
  - https://github.com/aspen-cloud/triplit/issues
  - https://www.reddit.com/r/sveltejs/comments/1eifual/local_first_svelte_with_a_sync_engine_tutorial/
---

# Gossip

## Positive Sentiment

- Triplit's own public testimonial wall is unusually strong, with developers praising the TypeScript support, offline behavior, self-hosting, and speed of building features.
- Community mentions tend to frame Triplit as one of the more complete local-first developer experiences.
- The database-console and framework-integration story helps it feel less like an academic sync primitive.

## Complaints And Friction

- Some community comments wish Triplit integrated more naturally with other ORM choices, which reflects possible stack-fit friction.
- GitHub issues show user requests and bugs around server adapters, immediate query updates, file uploads, attribute-level permissions, Docker examples, schema printing, list types, auth docs, JSON types, and console UI details.
- The all-in-one positioning can be a liability for teams that only want sync on top of an existing database architecture.
- Teams still need their own review, audit, recovery, identity, and compliance surfaces.

## Bug Themes To Watch

- Query reactivity timing and view initialization.
- Server adapter parity and observability.
- Permissions granularity and auth documentation.
- File uploads, list types, JSON typing, schema defaults, and database-console polish.

## Epoch Takeaways

- Epoch should make SDK ergonomics and inspection tools feel as productized as the history model.
- A repo/history product still needs approachable framework integrations.
- Epoch should avoid forcing teams to choose between local-first application data and repository-level provenance.
- The product docs should clarify where Epoch complements databases versus replacing them.
