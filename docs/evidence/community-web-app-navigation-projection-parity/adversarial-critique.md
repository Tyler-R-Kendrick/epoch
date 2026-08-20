# Adversarial Community critique

The critique was run against the canonical Community Web renderer and the new
browser assertions, using the protocol in
[`community-human-centered-design.md`](../../community-human-centered-design.md).

| Critic | Rejected baseline behavior | Concrete response | Executable evidence |
|---|---|---|---|
| GitHub open-source contributor | A copied message changed meaning when opened from another list, and path-shaped links did not explain whether context would survive. | Stable canonical/contextual/exact HTTPS link choices preserve one object while naming the current projection; missing projections explain canonical fallback. Grid styling and `/` → `/board.html` entry remain unchanged. | `NAV-ID-001`–`005`, `NAV-PROJ-001`, `NAV-PROJ-004`, `NAV-REG-001`, `NAV-REG-004` |
| Maintainer | Reply ancestry could be inferred from display position and orphaned children could appear reparented, weakening moderation review. | Explicit parent/root/child/sibling relations and typed tombstones keep topology intact; tombstones omit unauthorized actions while retaining navigation/provenance. | `NAV-GRAPH-002`–`004`, `NAV-A11Y-003`, `NAV-A11Y-004` |
| Screen-reader power user | A visual indentation did not expose level or sibling topology; completion preselected an option and overloaded Tab; focus, selection, and current location were conflated. | Thread is a single-column APG tree (Reddit/X-style) with level, set position, expansion, selection, one roving tab stop, and the selected treeitem as the readable message. Channel feeds stay roots-only. Completion is a manual-selection combobox with native Tab/editing/IME behavior. | `NAV-A11Y-001`–`007` plus axe and static accessibility gates |
| GitHub open-source contributor (receipt trust) | `sig:` / `intent://` locators looked like native browser buttons (gray fill, outset border), breaking Bracket Rule trust chrome. | Receipt locators use `button.cn-sig-text` with signed mint, `[`/`]` brackets, and native chrome reset; `npm run community-web:app:design-lint` fails closed on regression. | `community-web:app:design-lint`; DESIGN.md `button-receipt` |
| Security/compliance responder | Private content-derived locators and independent voice/MCP handlers could leak data or bypass policy. | Routes, history, notifications, share links, and action events carry stable IDs only. One registry performs permission and validation for every invocation origin; saved-view visibility filters before exposure. | `NAV-ID-004`, `NAV-QUERY-003`, `NAV-ACTION-001`–`004`, `NAV-MIGRATE-004` |

The visual-world automatic fail did not trigger: the implementation keeps
Community Web's character grid, square TTY controls, bracket vocabulary, sparse
signal inks, focus rail, CanvasUI landing, reduced-motion behavior, and touch
floors. The change adds structural semantics and responsive thread composition;
it does not replace Grid with generic sidebar/card chrome.
