# ADR-0047: Repository Configuration Parsing

Status: Accepted; implemented

## Context

`.epoch/config.toml` and `epoch.toml` are read by a ~20-line function in
`packages/Epoch.Core/src/core.ts` that recognises a subset of TOML and calls it
TOML. The subset is much smaller than it looks, and the gap is not academic —
this file carries the extension trust policy.

Valid TOML that the reader **rejects outright**:

| Input | Result |
|---|---|
| `url = "https://example.com/#anchor"` | throws — `#` is stripped before quotes are considered, truncating the string |
| `x = 1.5` | throws — floats are unsupported |
| `when = 1979-05-27T07:32:00Z` | throws — datetimes are unsupported |
| `inline = { a = 1 }` | throws — inline tables are unsupported |
| `["quoted"]`, `[[products]]` | throws — only bare-key `[table]` headers parse |

Valid TOML that it **mis-parses silently**, which is worse:

| Input | Parsed as |
|---|---|
| `multi = """a"""` | the string `"a"` — quotes included, no error |

The comment stripper is `line.split("#")[0]`, applied before any string
awareness. Any `#` inside a quoted value truncates it. A URL fragment, a colour
literal, a C preprocessor line in a config string — each turns a working file
into an unparseable one.

### The failure is silent and it subtracts a security control

`policyFor` wraps the read in a `try`/`catch` and falls back to the closed
default. Falling closed is right. Falling closed *silently* is not, and in one
configuration it removes protection rather than adding it:

1. an operator records consent for `greet`, then later decides against it and
   writes `block = ["greet"]` into `[extensions]` by hand;
2. an unrelated line elsewhere in the file uses a float, or a URL with a
   fragment;
3. the whole config fails to parse, so `[extensions]` contributes nothing —
   including the `block` entry;
4. the recorded grant in `.epoch/ext/trust.json` still parses, still applies,
   and `greet` runs.

The operator wrote a block, saw no error, and got execution. Every individual
decision here is defensible — subset parser, catch, closed default — and the
composition is a hole.

## Decision

### Parse TOML 1.0, completely

The reader is replaced by a complete TOML 1.0 implementation: bare, quoted, and
dotted keys; basic, literal, and multi-line strings with escape handling;
integers, floats, booleans, offset and local date-times; arrays, inline tables,
tables, and arrays of tables; comments recognised by a scanner that knows what a
string is. Redefinition in every form — a duplicate key, a second `[header]`, a
header reopening a dotted key, an extension of an inline table — is an error
rather than a last-writer-wins merge, because a document with two meanings has
no meaning worth acting on.

One deliberate departure from the specification: TOML integers are 64-bit and
JavaScript numbers are not, so a value that cannot be represented exactly is
**refused rather than rounded**. A byte limit that quietly became a different
number reads as correct at every later use, which is the worse of the two
failures. Date-times are their own type rather than `Date`, since three of the
four TOML forms carry no offset and converting them would invent one from
whichever zone the reader happens to run in.

This is a bounded grammar, and correctness here is worth more than brevity. The
alternative — a vetted dependency — is acceptable under
[the dependency exceptions process](../dependency-exceptions.md) and should be
weighed on maintenance cost, not on a preference for hand-rolled code. What is
not acceptable is a third partial parser: this repository has now shipped two
(the config reader, and the `epoch.syntax.toml` provider) and both produced
defects that reached review.

The syntax provider stays separate and stays partial by design — it models TOML
for *structural diffing*, refusing constructs it cannot represent, which is a
different job from reading a value. That distinction is recorded so the two are
not merged later by someone reasonably assuming duplication.

### A configuration that cannot be read is an error the operator sees

`repositoryConfig()` reports the file, line, and reason. Callers stop swallowing
it:

- `policyFor` still resolves to the closed default — that part was correct — but
  the CLI **writes the parse error to stderr** before any command proceeds, so
  "my policy is being ignored" is never a silent state;
- `epoch ext list` and `ext show` mark the policy as degraded rather than
  displaying an empty one as though it were the operator's intent;
- commands that only read configuration for convenience continue with defaults;
  commands whose safety depends on it refuse. Dispatching an extension is the
  clearest case: the half of the policy that survives an unreadable config is
  the half that *permits* — recorded grants — while the hand-written `block`
  list is exactly what went missing, so a launch on that basis rests on a
  denial nobody could read.

### Config values are validated, not just parsed

Parsing yields a document; the trust policy needs a shape. `readTrustPolicy`
already coerces defensively — unknown `trust` values fall back to `explicit`,
non-string array entries are dropped. That silent coercion becomes a diagnostic:
an `[extensions]` table with `trust = "eny"` or `allow = [1, 2]` is a typo an
operator wants to hear about, not a policy quietly narrowed behind their back.

Reporting is per-key and non-fatal, so one bad key does not discard a whole
table — which is the same failure mode at smaller scale.

## Consequences

Operators can write ordinary TOML, including the constructs every editor and
formatter emits, without discovering by accident which quarter of the language
Epoch implements. The extension trust policy stops being disarmable by an
unrelated float.

Replacing the parser touches the read path for every configuration key in the
system, so it needs a conformance corpus — the TOML test suite is the obvious
source — rather than the handful of cases the current reader's own tests cover.

Surfacing parse errors will make existing broken configurations visible.
Some repositories are almost certainly relying on the silent fallback without
knowing it; the first run after this change is where they find out. That is the
intended outcome and should be called out in release notes rather than softened.

## Revisit Criteria

Revisit if configuration grows beyond what a static document can express — at
which point the question is a schema and a migration path, not a parser — or if
a vetted TOML dependency becomes attractive enough to replace the in-tree
implementation.

## Related

- [ADR-0037](0037-extension-mechanism-and-capability-registry.md)
- [ADR-0038](0038-semantic-diff-merge-and-compression.md)
- [Dependency Exceptions](../dependency-exceptions.md)
