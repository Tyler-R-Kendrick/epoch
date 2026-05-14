---
product: lakeFS
gossip_sources:
  - https://github.com/treeverse/lakeFS/issues
  - https://docs.lakefs.io/latest/howto/garbage-collection/gc/
  - https://www.reddit.com/r/dataengineering/comments/r0wdsx/lakefs_and_the_problem_of_data_lake_management/
  - https://www.reddit.com/r/dataengineering/comments/1njz460/how_do_you_handle_versioning_in_big_data_pipelines_without_breaking_everything/
  - https://github.com/treeverse/lakeFS
---

# Gossip

## Positive Sentiment

- Data-engineering discussions often respond positively to the "data as code" framing because branching, commits, rollback, and isolated testing map cleanly onto pipeline risk.
- Public case-study and README material reinforce that large organizations can adopt the model without replacing their object storage.
- Developers like that lakeFS integrates with existing object stores and data tools instead of requiring a new proprietary data format.

## Complaints And Friction

- GitHub issues show ongoing UI polish and correctness reports, including failed-login feedback, metadata deletion behavior, overflow with long names, import races, and performance issues in Spark garbage collection.
- Garbage collection is operationally nuanced: stale branches, imported objects, shallow copy, and retention rules can affect whether data is actually deleted.
- Reddit and data-engineering discussions show conceptual interest, but also questions about where lakeFS fits relative to model versions, table formats, and existing pipeline conventions.

## Bug Themes To Watch

- UI feedback for failed operations, long identifiers, metadata edits, and repository browsing at scale.
- Garbage-collection performance and safety with large repositories and compliance-driven deletion.
- Import, branch lifecycle, and write visibility races around object-storage and mount workflows.
- Integration drift across Spark, table formats, cloud object stores, and orchestration systems.

## Epoch Takeaways

- Make deletion, retention, rollback, and branch lifecycle behavior explicit in docs and UI.
- Treat path length, branch names, and repository scale as design inputs from the first release.
- Keep policy hooks visible and testable, not hidden in pipeline glue.
- Explain where Epoch's repository model ends and where external storage, compute, and table formats begin.
