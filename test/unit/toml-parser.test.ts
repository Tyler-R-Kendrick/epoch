import assert from "node:assert/strict";
import { parseTomlDocument, TomlDateTime, TomlError } from "@epoch/core";

type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;
interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}

/**
 * A conformance corpus for the TOML 1.0.0 reader (ADR-0048).
 *
 * The reader this replaced was tested against the handful of constructs Epoch's
 * own config files happened to use, which is exactly why it passed while
 * mis-parsing a URL with a fragment. These cases come from the specification
 * instead — including every construct the old reader silently got wrong.
 */
export function runTomlParserTests(): void {
  theCasesThatBrokeTheOldReader();
  stringsAreParsedInFull();
  numbersAreParsedInFull();
  hugeIntegersAreRefusedRatherThanRounded();
  datesAndTimesAreParsed();
  tablesAndArraysOfTables();
  dottedAndQuotedKeys();
  redefinitionIsRefused();
  malformedDocumentsReportWhereTheyStopped();
  prototypeNamedKeysAreOrdinaryKeys();
  nestingIsBoundedRatherThanOverflowing();
}

/**
 * Parse, then re-root the result on `Object.prototype` for comparison.
 *
 * Tables are deliberately prototype-less and `assert.deepEqual` compares
 * prototypes, so the shape assertions normalize. The prototype itself is
 * asserted directly in `prototypeNamedKeysAreOrdinaryKeys`, against the
 * unnormalized document.
 */
function parse(text: string): TestJsonObject {
  // SAFETY: TOML tables normalize into JSON-shaped test fixtures.
  return plain(JSON.parse(JSON.stringify(parseTomlDocument(text))) as TestJsonValue) as TestJsonObject;
}

function plain(value: TestJsonValue | TomlDateTime): TestJsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      // SAFETY: TOML array entries normalize into JSON-shaped test fixtures.
      return plain(entry as TestJsonValue | TomlDateTime);
    });
  }
  if (!isTestJsonObject(value) || value instanceof TomlDateTime) {
    // SAFETY: Non-object TOML scalars pass through unchanged.
    return value as TestJsonValue;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, plain(entry)]));
}

function isTestJsonObject<Value>(value: Value): value is Value & TestJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refuse(text: string, why: string): TomlError {
  let caught: unknown;
  try {
    parseTomlDocument(text, "config.toml");
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof TomlError, `${why} must be refused, got ${String(caught)}`);
  return caught;
}

/**
 * Each of these was valid TOML that the previous reader threw on or, worse,
 * accepted with the wrong value.
 */
function theCasesThatBrokeTheOldReader(): void {
  // `#` inside a string: the old comment stripper truncated the value.
  assert.equal(parse(`url = "https://example.com/#anchor"`).url, "https://example.com/#anchor");
  assert.equal(parse(`url = 'a#b' # a real comment`).url, "a#b");

  assert.equal(parse("x = 1.5").x, 1.5);
  assert.deepEqual(parse("inline = { a = 1, b = 'two' }").inline, { a: 1, b: "two" });
  assert.deepEqual(parse(`["quoted key"]\nx = 1`), { "quoted key": { x: 1 } });

  // The one it mis-parsed silently: a multi-line string kept its own quotes.
  assert.equal(parse(`multi = """a"""`).multi, "a");

  const when = parse("when = 1979-05-27T07:32:00Z").when;
  assert.ok(when instanceof TomlDateTime);
  assert.equal(when.kind, "offset-date-time");
}

function stringsAreParsedInFull(): void {
  assert.equal(parse(`s = "a\\tb\\nc\\u00e9\\U0001F600"`).s, "a\tb\nc\u00e9\u{1F600}");
  assert.equal(parse(`s = 'C:\\Users\\raw'`).s, "C:\\Users\\raw");
  assert.equal(parse(`s = ""`).s, "");

  // A newline immediately after the opening delimiter is trimmed.
  assert.equal(parse(`s = """\nline\n"""`).s, "line\n");
  // A line-ending backslash joins lines and eats the indentation.
  assert.equal(parse(`s = """\\\n    joined\\\n    up"""`).s, "joinedup");
  // Up to two quotes may abut the closing delimiter.
  assert.equal(parse(`s = """he said ""hi"" ok"""`).s, `he said ""hi"" ok`);
  assert.equal(parse(`s = """ends with a quote\\""""`).s, `ends with a quote"`);
  assert.equal(parse(`s = '''raw \\n stays'''`).s, "raw \\n stays");
  // CRLF is normalized, so a checkout's line endings cannot change a value.
  assert.equal(parse(`s = """\r\na\r\nb"""`).s, "a\nb");

  refuse(`s = "\\q"`, "an unknown escape");
  refuse(`s = "\\ud800"`, "a lone surrogate");
  refuse(`s = "unterminated`, "an unterminated string");
  refuse(`s = "multi\nline"`, "a newline in a single-line string");
  // Eight quotes is a legal empty-ish string ending in two; nine is not.
  assert.equal(parse(`s = """"""""`).s, `""`);
  refuse(`s = """"""""" `, "more than two extra quotes");
}

function numbersAreParsedInFull(): void {
  assert.equal(parse("n = 0").n, 0);
  assert.equal(parse("n = -17").n, -17);
  assert.equal(parse("n = 1_000_000").n, 1_000_000);
  assert.equal(parse("n = 0xdead_beef").n, 0xdeadbeef);
  assert.equal(parse("n = 0o755").n, 0o755);
  assert.equal(parse("n = 0b1010").n, 0b1010);
  assert.equal(parse("n = 6.626e-34").n, 6.626e-34);
  assert.equal(parse("n = -0.01").n, -0.01);
  assert.equal(parse("n = inf").n, Number.POSITIVE_INFINITY);
  assert.equal(parse("n = -inf").n, Number.NEGATIVE_INFINITY);
  // SAFETY: Runtime checks or construction above establish number)).
  assert.ok(Number.isNaN(parse("n = nan").n as number));

  refuse("n = 01", "a leading zero");
  refuse("n = 1__0", "a doubled underscore");
  refuse("n = 1.", "a trailing decimal point");
  refuse("n = .5", "a bare fraction");
  refuse("n = 0xZZ", "a non-hexadecimal digit");
}

/**
 * TOML integers are 64-bit and JavaScript numbers are not. Rounding silently
 * would leave a byte limit that reads as correct at every later use, so the
 * reader refuses instead.
 */
function hugeIntegersAreRefusedRatherThanRounded(): void {
  assert.equal(parse("n = 9007199254740991").n, Number.MAX_SAFE_INTEGER);
  const error = refuse("n = 9223372036854775807", "an integer beyond exact representation");
  assert.match(error.reason, /rounded/u);
}

function datesAndTimesAreParsed(): void {
  const document = parse([
    "offset = 1979-05-27T07:32:00-08:00",
    "local = 1979-05-27T07:32:00.999",
    "date = 1979-05-27",
    "time = 07:32:00",
    "spaced = 1979-05-27 07:32:00Z",
  ].join("\n"));

  const kinds = Object.fromEntries(
    Object.entries(document).map(([key, value]) => {
      assert.ok(value instanceof TomlDateTime, `${key} should parse as TomlDateTime`);
      return [key, value.kind];
    }),
  );
  assert.deepEqual(kinds, {
    offset: "offset-date-time",
    local: "local-date-time",
    date: "local-date",
    time: "local-time",
    spaced: "offset-date-time",
  });

  // The separator and the zone marker are normalized, so one moment has one
  // spelling — configuration ends up in signed evidence.
  assert.equal(String(document.spaced), "1979-05-27T07:32:00Z");

  refuse("d = 1979-13-01", "a thirteenth month");
  refuse("d = 1979-02-30", "a day that month does not have");
  refuse("d = 2019-02-29", "a leap day in a non-leap year");
  assert.ok(parse("d = 2020-02-29").d instanceof TomlDateTime, "a real leap day parses");
  refuse("t = 25:00:00", "an impossible hour");
}

function tablesAndArraysOfTables(): void {
  const document = parse([
    "[owner]",
    "name = 'Tom'",
    "",
    "[servers.alpha]",
    "ip = '10.0.0.1'",
    "",
    "[[products]]",
    "name = 'Hammer'",
    "",
    "[[products]]",
    "name = 'Nail'",
    "quantity = 5",
    "",
    "[[products.tags]]",
    "tag = 'metal'",
  ].join("\n"));

  assert.deepEqual(document.owner, { name: "Tom" });
  assert.deepEqual(document.servers, { alpha: { ip: "10.0.0.1" } });
  // SAFETY: Runtime checks or construction above establish readonly Record<string.
  const products = document.products as readonly TestJsonObject[];
  assert.equal(products.length, 2);
  assert.equal(products[0].name, "Hammer");
  assert.deepEqual(products[1].tags, [{ tag: "metal" }]);

  // Arrays hold values, and a value array is not an array of tables.
  assert.deepEqual(parse("a = [1, 2, 3,]").a, [1, 2, 3]);
  assert.deepEqual(parse("a = [\n 1,\n # a comment\n 2,\n]").a, [1, 2]);
  assert.deepEqual(parse("a = [[1], ['two']]").a, [[1], ["two"]]);
  refuse("a = [1]\n[[a]]", "appending tables to a static array");
}

function dottedAndQuotedKeys(): void {
  assert.deepEqual(parse("a.b.c = 1\na.b.d = 2"), { a: { b: { c: 1, d: 2 } } });
  assert.deepEqual(parse(`"quoted.key" = 1`), { "quoted.key": 1 });
  assert.deepEqual(parse(`'lit' . "bas" = 1`), { lit: { bas: 1 } });
  assert.deepEqual(parse("t = { a.b = 1 }"), { t: { a: { b: 1 } } });
  assert.deepEqual(parse("1234 = 'bare digits are a key'"), { 1234: "bare digits are a key" });
}

/**
 * Redefinition is where a document stops having one meaning, so every form of
 * it is an error rather than a last-writer-wins merge.
 */
function redefinitionIsRefused(): void {
  refuse("a = 1\na = 2", "a duplicate key");
  refuse("[a]\n[a]", "a duplicate table");
  refuse("[a]\nb = 1\n[a.b]", "a table over a value");
  refuse("[fruit]\napple.color = 'red'\n[fruit.apple]", "a header reopening a dotted key");
  refuse("t = { a = 1 }\n[t.b]", "extending an inline table");
  refuse("t = { a = 1 }\nt.b = 2", "extending an inline table by dotted key");
  refuse("[[a]]\n[a]", "a table header over an array of tables");

  // Out-of-order definition of an implicit super-table stays legal.
  assert.deepEqual(parse("[a.b]\nx = 1\n[a]\ny = 2"), { a: { b: { x: 1 }, y: 2 } });
}

function malformedDocumentsReportWhereTheyStopped(): void {
  const error = refuse("[owner]\nname = 'Tom'\nbroken = @", "a value that is not TOML");
  assert.equal(error.line, 3);
  assert.equal(error.column, 10);
  assert.equal(error.source, "config.toml");
  assert.match(error.message, /^config\.toml:3:10: /u);

  refuse("key", "a key with no value");
  refuse("key =", "a value that is missing");
  refuse("a = 1 b = 2", "two statements on one line");
  refuse("[unclosed", "an unclosed header");
  refuse("t = { a = 1, }", "a trailing comma in an inline table");
  refuse("t = { a = 1,\n b = 2 }", "an inline table spanning lines");
  refuse("a = [1, 2", "an unclosed array");
}

/**
 * `toString`, `constructor`, and `valueOf` are ordinary TOML keys.
 *
 * An ordinary object claims all of them — `"toString" in {}` is true — so every
 * document defining one was refused as a duplicate, and `__proto__` was worse:
 * assigning it would have set the prototype rather than a key. Tables have no
 * prototype, which removes the class rather than blocklisting the names anyone
 * has thought of so far.
 */
function prototypeNamedKeysAreOrdinaryKeys(): void {
  const document = parseTomlDocument([
    "toString = 1",
    "valueOf = 2",
    `hasOwnProperty = "three"`,
    "[constructor]",
    "x = 1",
  ].join("\n"));

  assert.equal(document.toString, 1);
  assert.equal(document.valueOf, 2);
  assert.equal(document.hasOwnProperty, "three");
  // SAFETY: Constructor tables JSON-round-trip before plain normalization.
  assert.deepEqual(plain(JSON.parse(JSON.stringify(document.constructor)) as TestJsonValue), { x: 1 });
  assert.equal(Object.getPrototypeOf(document), null, "tables carry no prototype");
  // SAFETY: Runtime checks or construction above establish object).
  assert.equal(Object.getPrototypeOf(document.constructor as object), null, "nor do nested tables");

  // `__proto__` is a key like any other, not an instruction.
  const proto = parseTomlDocument(`__proto__ = "ordinary"`);
  assert.equal(Object.prototype.hasOwnProperty.call(proto, "__proto__"), true);
  assert.equal(proto.__proto__, "ordinary");

  // A genuine duplicate is still refused, whatever it is named.
  refuse("toString = 1\ntoString = 2", "a duplicate prototype-named key");
}

/**
 * Values are parsed by mutual recursion, so an unbounded document would
 * overflow the stack. `RangeError` is not a `TomlError`, so it escapes the
 * reporting path entirely and reaches the operator as nothing at all.
 */
function nestingIsBoundedRatherThanOverflowing(): void {
  assert.deepEqual(parse(`a = ${"[".repeat(8)}1${"]".repeat(8)}`).a, [[[[[[[[1]]]]]]]]);

  const error = refuse(`a = ${"[".repeat(5000)}${"]".repeat(5000)}`, "a document nested past the limit");
  assert.match(error.reason, /nested more than/u);
  refuse(`a = ${"{ b = ".repeat(200)}1${" }".repeat(200)}`, "inline tables nested past the limit");
}
