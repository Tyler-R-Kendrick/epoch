# Adversarial Community critique

The critique was run against the canonical Nightboard renderer and the new
browser assertions, using the protocol in
[`community-human-centered-design.md`](../../community-human-centered-design.md).

| Critic | Rejected baseline behavior | Concrete response | Executable evidence |
|---|---|---|---|
| GitHub open-source contributor | A copied message changed meaning when opened from another list, and path-shaped links did not explain whether context would survive. | Stable canonical/contextual/exact HTTPS link choices preserve one object while naming the current projection; missing projections explain canonical fallback. Grid styling and `/` → `/board.html` entry remain unchanged. | `NAV-ID-001`–`005`, `NAV-PROJ-001`, `NAV-PROJ-004`, `NAV-REG-001`, `NAV-REG-004` |
| Maintainer | Reply ancestry could be inferred from display position and orphaned children could appear reparented, weakening moderation review. | Explicit parent/root/child/sibling relations and typed tombstones keep topology intact; tombstones omit unauthorized actions while retaining navigation/provenance. | `NAV-GRAPH-002`–`004`, `NAV-A11Y-003`, `NAV-A11Y-004` |
| Screen-reader power user | A visual indentation did not expose level or sibling topology; completion preselected an option and overloaded Tab; focus, selection, and current location were conflated. | Thread outline is an APG tree with level, set position, expansion, selection, current-location distinction, one roving tab stop, and adjacent reading article. Completion is a manual-selection combobox with native Tab/editing/IME behavior. | `NAV-A11Y-001`–`007` plus axe and static accessibility gates |
| Security/compliance responder | Private content-derived locators and independent voice/MCP handlers could leak data or bypass policy. | Routes, history, notifications, share links, and action events carry stable IDs only. One registry performs permission and validation for every invocation origin; saved-view visibility filters before exposure. | `NAV-ID-004`, `NAV-QUERY-003`, `NAV-ACTION-001`–`004`, `NAV-MIGRATE-004` |

The visual-world automatic fail did not trigger: the implementation keeps
Nightboard's character grid, square TTY controls, bracket vocabulary, sparse
signal inks, focus rail, CanvasUI landing, reduced-motion behavior, and touch
floors. The change adds structural semantics and responsive thread composition;
it does not replace Grid with generic sidebar/card chrome.
