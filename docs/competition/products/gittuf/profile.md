---
product: gittuf
slug: gittuf
category: repository_security
primary_sources:
  - https://gittuf.dev/documentation
  - https://gittuf.dev/documentation/developers/design
  - https://gittuf.dev/documentation/maintainers/policy
  - https://openssf.org/projects/gittuf/
---

# gittuf

gittuf is an OpenSSF project that adds platform-agnostic security policy, key management, authorization, and tamper-evident activity records to Git repositories. It stores metadata in the repository so policy verification does not depend entirely on a forge such as GitHub, GitLab, or Bitbucket.

## Competitive Relevance

- gittuf directly competes with Epoch's repository trust surface: both care about independently verifiable history rather than forge-only policy.
- Its policy model targets branches, tags, files, signing identities, approvals, and repository activity logs.
- Backward compatibility with existing Git repositories lowers adoption friction for security-conscious teams.
- The OpenSSF home gives it standards credibility and puts it in the same conversation as Sigstore, in-toto, and SLSA.

## Epoch Implications

- Epoch should treat forge-independent verification as a minimum bar for high-trust repository workflows.
- gittuf's repository-local metadata approach validates Epoch's instinct that trust evidence should travel with repository data.
- Epoch needs a clearer story for policy authoring, delegated authority, and multi-repository governance if it wants to compete beyond local history ergonomics.

## Unknowns To Track

- gittuf is still young relative to Git itself, so production adoption patterns and long-term UX expectations are still forming.
- The project may become infrastructure embedded by platforms rather than a visible end-user product.
