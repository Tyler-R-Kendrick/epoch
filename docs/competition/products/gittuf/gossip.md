---
product: gittuf
gossip_sources:
  - https://github.com/gittuf/gittuf/issues
  - https://openssf.org/blog/2024/01/18/introducing-gittuf-a-security-layer-for-git-repositories/
  - https://openssf.org/blog/2025/06/06/from-sandbox-to-incubating-gittufs-next-step-in-open-source-security/
---

# Gossip

## What People Say

Public signal is mostly early-adopter and security-community oriented. The positive narrative is that forge-independent repository policy closes a real supply-chain gap. The cautious narrative is that policy tooling has to be extremely usable or it will become another security layer teams configure once and stop understanding.

## Bug And Friction Themes

- GitHub issues and project docs show an active, evolving project where policy semantics, workflow integration, and edge-case Git behavior matter.
- The product has to convince users that repository-local metadata will not make normal Git workflows brittle.
- The security value is easiest to understand after a threat model discussion; casual developers may not feel the pain until an incident.

## Product Risk For Epoch

gittuf is closer to Epoch's trust and history thesis than many visual Git tools. If it becomes the standard repository-security layer, Epoch will need a strong interoperability or differentiation story.

## Opportunity For Epoch

Epoch can learn from gittuf's forge-independent verification while offering a more complete product surface for actor history, materialized versions, local workflows, and human-readable evidence.
