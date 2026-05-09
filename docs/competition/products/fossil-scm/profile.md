---
product: Fossil SCM
slug: fossil-scm
category: integrated_dvcs
primary_sources:
  - https://www.fossil-scm.org/
  - https://www.fossil-scm.org/home/doc/trunk/www/fossil-v-git.wiki
  - https://www.fossil-scm.org/home/doc/trunk/www/gitusers.md
  - https://www.fossil-scm.org/home/doc/689f7683/www/forum.wiki
  - https://www2.fossil-scm.org/home/help/sync
---

# Fossil SCM

Fossil is a self-contained distributed software configuration management system from the SQLite ecosystem. It combines DVCS, bug tracking, wiki, embedded documentation, technotes, forum, chat, email alerts, web UI, sync, and self-hosting in one executable and one SQLite-backed repository format.

## Competitive Relevance

- Fossil overlaps with Epoch's desire for portable, local, inspectable project history that includes more than file snapshots.
- Forum posts, wiki pages, tickets, technotes, and check-ins are all repository artifacts that can sync between clones.
- Fossil's "GitHub-in-a-box" positioning is a direct example of treating collaboration context as part of the repository.
- The SQLite storage model, atomic transactions, and repository self-checks provide a mature reliability story.
- Autosync intentionally reduces needless divergence, which contrasts with Git's fork-heavy default workflow.

## Epoch Implications

- Epoch should study Fossil's integrated artifact model: code history, discussion, docs, and tickets become one syncable body of evidence.
- Epoch can differentiate with modern TypeScript/WASM/SDK surfaces, cryptographic identity, Git interoperability, and agent-first workflows.
- Fossil shows the product risk of being correct but niche: GitHub/Git network effects can dominate better-integrated repository models.

## Unknowns To Track

- Fossil's enterprise adoption and hosted-service ecosystem are much smaller than GitHub, GitLab, and Bitbucket.
- Its deliberate lack of rebase, different branching semantics, and Git translation model remain cultural adoption barriers for Git-trained teams.
