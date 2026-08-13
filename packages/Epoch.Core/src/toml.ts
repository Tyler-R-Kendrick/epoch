/**
 * A complete TOML 1.0.0 reader (ADR-0047).
 *
 * Configuration carries the extension trust policy, so a reader that
 * understands a quarter of the language is not a convenience shortcut — it is a
 * way for an unrelated float or a URL fragment to make a hand-written `block`
 * list vanish. This implementation covers the whole grammar and reports where
 * it stopped, so a file that cannot be read is an error an operator sees rather
 * than a policy that quietly empties.
 *
 * Every ambiguity resolves toward refusal. An integer too large to represent
 * exactly is an error rather than a rounded value, because a silently rounded
 * byte limit is worse than a rejected one.
 *
 * This is deliberately not the `epoch.syntax.toml` provider, which models TOML
 * for structural diffing and refuses constructs it cannot represent. Reading a
 * value and diffing a document are different jobs; the two must not be merged
 * on the reasonable-looking assumption that they duplicate each other.
 */

/** Where reading stopped, and why. */
export class TomlError extends Error {
  constructor(
    readonly reason: string,
    readonly line: number,
    readonly column: number,
    readonly source?: string,
  ) {
    super(
      source === undefined
        ? `${reason} (line ${line}, column ${column})`
        : `${source}:${line}:${column}: ${reason}`,
    );
    this.name = "TomlError";
  }
}

/**
 * A TOML date or time.
 *
 * Kept as its own type rather than a `Date`: three of the four TOML forms carry
 * no offset, and turning them into an instant would invent one from whatever
 * zone the reader happens to run in. The value is normalized — `t`/`z` upper
 * cased, a space separator rewritten to `T` — so two spellings of the same
 * moment are the same string, which matters when configuration feeds signed
 * evidence.
 */
export class TomlDateTime {
  constructor(
    readonly kind: "offset-date-time" | "local-date-time" | "local-date" | "local-time",
    readonly value: string,
  ) {}

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

type Table = Record<string, unknown>;

/**
 * A table with no prototype.
 *
 * `toString`, `constructor`, and `valueOf` are ordinary TOML keys, and an
 * ordinary object claims all of them: `"toString" in {}` is true, so a document
 * defining one was refused as a duplicate. `__proto__` was worse — assigning it
 * would have set the prototype rather than a key. Removing the prototype
 * removes the whole class, rather than blocklisting the names anyone has
 * thought of so far.
 */
function emptyTable(): Table {
  return Object.create(null) as Table;
}

interface TableMeta {
  /** Given a `[header]` of its own, so a second header is a redefinition. */
  explicit: boolean;
  /** Written as an inline table, which is closed the moment it ends. */
  closed: boolean;
  /** Created by a dotted key, which a later `[header]` may not reopen. */
  dotted: boolean;
}

/** Largest integer JavaScript represents exactly; beyond it, parsing refuses. */
const SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * How deeply arrays and inline tables may nest.
 *
 * Values are parsed by mutual recursion, so without a bound a document of
 * `a = [[[[…]]]]` overflows the stack and raises `RangeError` — which callers
 * do not treat as a parse failure, so the diagnostic never reaches the
 * operator. The limit turns it into an ordinary located refusal.
 */
const MAXIMUM_NESTING = 64;

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})?)?/u;
const TIME_ONLY = /^(\d{2}):(\d{2}):(\d{2})(\.\d+)?/u;
const DECIMAL_INTEGER = /^[+-]?(?:0|[1-9](?:_?[0-9])*)$/u;
const PREFIXED_INTEGER = /^0(?:x[0-9A-Fa-f](?:_?[0-9A-Fa-f])*|o[0-7](?:_?[0-7])*|b[01](?:_?[01])*)$/u;
const FLOAT = /^[+-]?(?:0|[1-9](?:_?[0-9])*)(?:\.[0-9](?:_?[0-9])*)?(?:[eE][+-]?[0-9](?:_?[0-9])*)?$/u;
const SPECIAL_FLOAT = /^[+-]?(?:inf|nan)$/u;
const BARE_KEY_CHARACTER = /[A-Za-z0-9_-]/u;

/**
 * Read a TOML document.
 *
 * @param text UTF-8 decoded document contents.
 * @param source File name used in error messages, when one is known.
 * @throws {TomlError} on any input the specification does not permit.
 */
export function parseTomlDocument(text: string, source?: string): Table {
  return new TomlReader(text, source).document();
}

class TomlReader {
  private index = 0;
  private line = 1;
  private lineStart = 0;
  private nesting = 0;
  private readonly meta = new WeakMap<object, TableMeta>();
  /** Arrays a `[[header]]` created, and so may append to. Static arrays are closed. */
  private readonly arrayTables = new WeakSet<unknown[]>();

  constructor(private readonly text: string, private readonly source?: string) {}

  document(): Table {
    const root: Table = emptyTable();
    this.meta.set(root, { explicit: false, closed: false, dotted: false });
    let target = root;

    for (;;) {
      this.skipTrivia();
      if (this.atEnd()) return root;
      target = this.peek() === "[" ? this.header(root) : this.keyValue(target, false);
    }
  }

  // ---------------------------------------------------------------- scanning

  private atEnd(): boolean {
    return this.index >= this.text.length;
  }

  private peek(offset = 0): string {
    return this.text[this.index + offset] ?? "";
  }

  private take(): string {
    const character = this.text[this.index] ?? "";
    this.index += 1;
    if (character === "\n") {
      this.line += 1;
      this.lineStart = this.index;
    }
    return character;
  }

  private get column(): number {
    return this.index - this.lineStart + 1;
  }

  private fail(reason: string, line = this.line, column = this.column): never {
    throw new TomlError(reason, line, column, this.source);
  }

  private expect(character: string, what: string): void {
    if (this.peek() !== character) {
      this.fail(`expected ${what} but found ${this.describeHere()}`);
    }
    this.take();
  }

  private describeHere(): string {
    if (this.atEnd()) return "end of file";
    const character = this.peek();
    return character === "\n" ? "end of line" : `'${character}'`;
  }

  /** Space and tab only. Newlines are structural everywhere they are legal. */
  private skipSpaces(): void {
    while (this.peek() === " " || this.peek() === "\t") this.take();
  }

  private skipNewline(): boolean {
    if (this.peek() === "\n") {
      this.take();
      return true;
    }
    if (this.peek() === "\r" && this.peek(1) === "\n") {
      this.take();
      this.take();
      return true;
    }
    return false;
  }

  /**
   * Consume a comment.
   *
   * The scanner reaches this only outside a string, which is the whole point:
   * the reader it replaces split on `#` before it knew what a string was, so
   * any URL fragment truncated its own value.
   */
  private skipComment(): void {
    if (this.peek() !== "#") return;
    this.take();
    while (!this.atEnd() && this.peek() !== "\n" && !(this.peek() === "\r" && this.peek(1) === "\n")) {
      const character = this.take();
      if (isControl(character)) this.fail("a comment contains a control character");
    }
  }

  private skipTrivia(): void {
    for (;;) {
      this.skipSpaces();
      this.skipComment();
      if (!this.skipNewline()) return;
    }
  }

  /** Nothing may follow a statement on its line except spaces and a comment. */
  private endOfStatement(): void {
    this.skipSpaces();
    this.skipComment();
    if (this.atEnd()) return;
    if (!this.skipNewline()) this.fail(`unexpected ${this.describeHere()} after a complete statement`);
  }

  // ----------------------------------------------------------------- headers

  private header(root: Table): Table {
    const line = this.line;
    const column = this.column;
    this.expect("[", "a table header");
    const isArray = this.peek() === "[";
    if (isArray) this.take();

    this.skipSpaces();
    const path = this.keyPath();
    this.skipSpaces();
    this.expect("]", "']' closing the table header");
    if (isArray) this.expect("]", "']]' closing the array-of-tables header");
    this.endOfStatement();

    return isArray ? this.openArrayTable(root, path, line, column) : this.openTable(root, path, line, column);
  }

  private metaOf(table: object): TableMeta {
    const found = this.meta.get(table);
    if (found !== undefined) return found;
    const created: TableMeta = { explicit: false, closed: false, dotted: false };
    this.meta.set(table, created);
    return created;
  }

  /** Walk the super-tables of a header path, creating implicit tables as it goes. */
  private walk(root: Table, path: readonly string[], line: number, column: number): Table {
    let current = root;
    for (const key of path.slice(0, -1)) {
      const existing = current[key];
      if (existing === undefined) {
        const created: Table = emptyTable();
        this.meta.set(created, { explicit: false, closed: false, dotted: false });
        current[key] = created;
        current = created;
        continue;
      }
      if (Array.isArray(existing)) {
        if (!this.arrayTables.has(existing)) {
          this.fail(`'${key}' is a static array and cannot contain tables`, line, column);
        }
        const last = existing[existing.length - 1];
        if (!isTable(last)) this.fail(`'${key}' does not hold tables`, line, column);
        current = last;
        continue;
      }
      if (!isTable(existing)) this.fail(`'${key}' is already defined as a value`, line, column);
      const meta = this.metaOf(existing);
      if (meta.closed) this.fail(`'${key}' is an inline table and cannot be extended`, line, column);
      if (meta.dotted) this.fail(`'${key}' was defined by a dotted key and cannot be reopened`, line, column);
      current = existing;
    }
    return current;
  }

  private openTable(root: Table, path: readonly string[], line: number, column: number): Table {
    const parent = this.walk(root, path, line, column);
    const key = path[path.length - 1];
    const existing = parent[key];

    if (existing === undefined) {
      const created: Table = emptyTable();
      this.meta.set(created, { explicit: true, closed: false, dotted: false });
      parent[key] = created;
      return created;
    }
    if (!isTable(existing)) this.fail(`'${path.join(".")}' is already defined as a value`, line, column);
    const meta = this.metaOf(existing);
    if (meta.explicit) this.fail(`table '${path.join(".")}' is defined more than once`, line, column);
    if (meta.closed) this.fail(`'${path.join(".")}' is an inline table and cannot be extended`, line, column);
    if (meta.dotted) this.fail(`'${path.join(".")}' was defined by a dotted key and cannot be reopened`, line, column);
    meta.explicit = true;
    return existing;
  }

  private openArrayTable(root: Table, path: readonly string[], line: number, column: number): Table {
    const parent = this.walk(root, path, line, column);
    const key = path[path.length - 1];
    const existing = parent[key];
    let array: unknown[];

    if (existing === undefined) {
      array = [];
      this.arrayTables.add(array);
      parent[key] = array;
    } else if (Array.isArray(existing) && this.arrayTables.has(existing)) {
      array = existing;
    } else {
      this.fail(`'${path.join(".")}' is not an array of tables`, line, column);
    }

    const entry: Table = emptyTable();
    this.meta.set(entry, { explicit: true, closed: false, dotted: false });
    array.push(entry);
    return entry;
  }

  // -------------------------------------------------------------- key/values

  private keyPath(): readonly string[] {
    const path: string[] = [this.simpleKey()];
    for (;;) {
      this.skipSpaces();
      if (this.peek() !== ".") return path;
      this.take();
      this.skipSpaces();
      path.push(this.simpleKey());
    }
  }

  private simpleKey(): string {
    if (this.peek() === "\"") return this.basicString();
    if (this.peek() === "'") return this.literalString();
    let key = "";
    while (BARE_KEY_CHARACTER.test(this.peek())) key += this.take();
    if (key.length === 0) this.fail(`expected a key but found ${this.describeHere()}`);
    return key;
  }

  /** Parse one `key = value` statement into `target`, and return `target`. */
  private keyValue(target: Table, inline: boolean): Table {
    const line = this.line;
    const column = this.column;
    const path = this.keyPath();
    this.skipSpaces();
    this.expect("=", "'=' after a key");
    this.skipSpaces();
    const value = this.value();
    if (!inline) this.endOfStatement();

    let current = target;
    for (const key of path.slice(0, -1)) {
      const existing = current[key];
      if (existing === undefined) {
        const created: Table = emptyTable();
        this.meta.set(created, { explicit: false, closed: inline, dotted: true });
        current[key] = created;
        current = created;
        continue;
      }
      if (!isTable(existing)) this.fail(`'${key}' is already defined as a value`, line, column);
      const meta = this.metaOf(existing);
      if (!meta.dotted) {
        this.fail(`'${key}' is already a defined table; dotted keys cannot add to it`, line, column);
      }
      if (meta.closed && !inline) this.fail(`'${key}' is an inline table and cannot be extended`, line, column);
      current = existing;
    }

    const key = path[path.length - 1];
    if (key in current) this.fail(`'${path.join(".")}' is defined more than once`, line, column);
    current[key] = value;
    return target;
  }

  private value(): unknown {
    const character = this.peek();
    if (character === "\"") {
      return this.peek(1) === "\"" && this.peek(2) === "\"" ? this.multilineBasicString() : this.basicString();
    }
    if (character === "'") {
      return this.peek(1) === "'" && this.peek(2) === "'" ? this.multilineLiteralString() : this.literalString();
    }
    if (character === "[") return this.array();
    if (character === "{") return this.inlineTable();
    if (this.text.startsWith("true", this.index)) return this.keyword("true", true);
    if (this.text.startsWith("false", this.index)) return this.keyword("false", false);
    return this.numberOrDateTime();
  }

  private keyword<T>(text: string, value: T): T {
    for (let index = 0; index < text.length; index += 1) this.take();
    return value;
  }

  // ------------------------------------------------------------------ arrays

  private array(): readonly unknown[] {
    this.expect("[", "'[' opening an array");
    this.enter();
    const values: unknown[] = [];
    for (;;) {
      this.skipTrivia();
      if (this.peek() === "]") {
        this.take();
        this.leave();
        return values;
      }
      if (this.atEnd()) this.fail("an array is never closed");
      values.push(this.value());
      this.skipTrivia();
      if (this.peek() === ",") {
        this.take();
        continue;
      }
      if (this.peek() === "]") {
        this.take();
        this.leave();
        return values;
      }
      this.fail(`expected ',' or ']' in an array but found ${this.describeHere()}`);
    }
  }

  /**
   * Parse an inline table.
   *
   * Inline tables are closed by the specification: they may not span lines and
   * nothing may be added to them afterwards. Both are enforced here rather than
   * treated as stylistic, because a table that can be reopened silently is a
   * table whose final contents depend on the rest of the file.
   */
  private inlineTable(): Table {
    this.expect("{", "'{' opening an inline table");
    this.enter();
    const table: Table = emptyTable();
    this.meta.set(table, { explicit: true, closed: true, dotted: false });
    this.skipSpaces();
    if (this.peek() === "}") {
      this.take();
      this.leave();
      return table;
    }
    for (;;) {
      this.skipSpaces();
      this.keyValue(table, true);
      this.skipSpaces();
      if (this.peek() === ",") {
        this.take();
        this.skipSpaces();
        if (this.peek() === "}") this.fail("an inline table may not have a trailing comma");
        continue;
      }
      if (this.peek() === "}") {
        this.take();
        this.leave();
        return table;
      }
      this.fail(`expected ',' or '}' in an inline table but found ${this.describeHere()}`);
    }
  }

  // ----------------------------------------------------------------- strings

  private basicString(): string {
    this.expect("\"", "'\"' opening a string");
    let value = "";
    for (;;) {
      if (this.atEnd() || this.peek() === "\n") this.fail("a string is never closed");
      const character = this.take();
      if (character === "\"") return value;
      if (character === "\\") {
        value += this.escape();
        continue;
      }
      if (isControl(character)) this.fail("a string contains a control character");
      value += character;
    }
  }

  private literalString(): string {
    this.expect("'", "\"'\" opening a literal string");
    let value = "";
    for (;;) {
      if (this.atEnd() || this.peek() === "\n") this.fail("a literal string is never closed");
      const character = this.take();
      if (character === "'") return value;
      if (isControl(character)) this.fail("a literal string contains a control character");
      value += character;
    }
  }

  private multilineBasicString(): string {
    for (let index = 0; index < 3; index += 1) this.take();
    this.skipNewline();
    let value = "";
    for (;;) {
      if (this.atEnd()) this.fail("a multi-line string is never closed");
      if (this.peek() === "\"") {
        const run = this.quoteRun("\"");
        if (run < 3) {
          value += "\"".repeat(run);
          for (let index = 0; index < run; index += 1) this.take();
          continue;
        }
        if (run > 5) this.fail("a multi-line string may end with at most two extra quotes");
        for (let index = 0; index < run; index += 1) this.take();
        return value + "\"".repeat(run - 3);
      }
      if (this.peek() === "\\") {
        this.take();
        if (this.isLineEndingBackslash()) {
          // A backslash at end of line joins the lines and eats the indentation.
          // Whitespace only: a '#' here is string content, not a comment.
          this.skipSpaces();
          this.skipNewline();
          while (this.peek() === " " || this.peek() === "\t" || this.peek() === "\n"
            || (this.peek() === "\r" && this.peek(1) === "\n")) {
            this.take();
          }
          continue;
        }
        value += this.escape();
        continue;
      }
      const character = this.take();
      if (character === "\r" && this.peek() === "\n") {
        // CRLF is normalized so a checkout's line endings cannot change a value.
        continue;
      }
      if (isControl(character) && character !== "\n") this.fail("a multi-line string contains a control character");
      value += character;
    }
  }

  private multilineLiteralString(): string {
    for (let index = 0; index < 3; index += 1) this.take();
    this.skipNewline();
    let value = "";
    for (;;) {
      if (this.atEnd()) this.fail("a multi-line literal string is never closed");
      if (this.peek() === "'") {
        const run = this.quoteRun("'");
        if (run < 3) {
          value += "'".repeat(run);
          for (let index = 0; index < run; index += 1) this.take();
          continue;
        }
        if (run > 5) this.fail("a multi-line literal string may end with at most two extra quotes");
        for (let index = 0; index < run; index += 1) this.take();
        return value + "'".repeat(run - 3);
      }
      const character = this.take();
      if (character === "\r" && this.peek() === "\n") continue;
      if (isControl(character) && character !== "\n") {
        this.fail("a multi-line literal string contains a control character");
      }
      value += character;
    }
  }

  private enter(): void {
    this.nesting += 1;
    if (this.nesting > MAXIMUM_NESTING) {
      this.fail(`values are nested more than ${MAXIMUM_NESTING} deep`);
    }
  }

  private leave(): void {
    this.nesting -= 1;
  }

  private quoteRun(quote: string): number {
    let run = 0;
    while (this.peek(run) === quote) run += 1;
    return run;
  }

  private isLineEndingBackslash(): boolean {
    let offset = 0;
    while (this.peek(offset) === " " || this.peek(offset) === "\t") offset += 1;
    return this.peek(offset) === "\n" || (this.peek(offset) === "\r" && this.peek(offset + 1) === "\n");
  }

  private escape(): string {
    const character = this.take();
    switch (character) {
      case "b": return "\b";
      case "t": return "\t";
      case "n": return "\n";
      case "f": return "\f";
      case "r": return "\r";
      case "\"": return "\"";
      case "\\": return "\\";
      case "u": return this.codePoint(4);
      case "U": return this.codePoint(8);
      default: this.fail(`'\\${character}' is not an escape sequence`);
    }
  }

  private codePoint(digits: number): string {
    let text = "";
    for (let index = 0; index < digits; index += 1) {
      const character = this.take();
      if (!/[0-9A-Fa-f]/u.test(character)) this.fail(`a \\u escape needs ${digits} hexadecimal digits`);
      text += character;
    }
    const value = Number.parseInt(text, 16);
    if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
      this.fail(`\\u${text} is not a Unicode scalar value`);
    }
    return String.fromCodePoint(value);
  }

  // ---------------------------------------------------- numbers and datetimes

  private numberOrDateTime(): unknown {
    const line = this.line;
    const column = this.column;
    const rest = this.text.slice(this.index);

    const dateTime = DATE_TIME.exec(rest);
    if (dateTime !== null) return this.dateTime(dateTime, line, column);
    const time = TIME_ONLY.exec(rest);
    if (time !== null) {
      this.advance(time[0].length);
      this.validateTime(time[1], time[2], time[3], line, column);
      return new TomlDateTime("local-time", time[0]);
    }

    let token = "";
    while (/[0-9A-Za-z_+.-]/u.test(this.peek())) token += this.take();
    if (token.length === 0) this.fail(`expected a value but found ${this.describeHere()}`, line, column);
    return this.number(token, line, column);
  }

  private advance(count: number): void {
    for (let index = 0; index < count; index += 1) this.take();
  }

  private dateTime(match: RegExpExecArray, line: number, column: number): TomlDateTime {
    this.advance(match[0].length);
    const [, year, month, day, hour, minute, second, fraction, offset] = match;
    this.validateDate(year, month, day, line, column);
    if (hour === undefined) return new TomlDateTime("local-date", `${year}-${month}-${day}`);
    this.validateTime(hour, minute, second, line, column);

    const clock = `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction ?? ""}`;
    if (offset === undefined) return new TomlDateTime("local-date-time", clock);
    if (offset === "Z" || offset === "z") return new TomlDateTime("offset-date-time", `${clock}Z`);
    const offsetHour = Number.parseInt(offset.slice(1, 3), 10);
    const offsetMinute = Number.parseInt(offset.slice(4, 6), 10);
    if (offsetHour > 23 || offsetMinute > 59) this.fail(`'${offset}' is not a valid UTC offset`, line, column);
    return new TomlDateTime("offset-date-time", `${clock}${offset}`);
  }

  private validateDate(year: string, month: string, day: string, line: number, column: number): void {
    const monthValue = Number.parseInt(month, 10);
    const dayValue = Number.parseInt(day, 10);
    if (monthValue < 1 || monthValue > 12) this.fail(`'${month}' is not a month`, line, column);
    if (dayValue < 1 || dayValue > daysInMonth(Number.parseInt(year, 10), monthValue)) {
      this.fail(`'${year}-${month}-${day}' is not a date`, line, column);
    }
  }

  private validateTime(hour: string, minute: string, second: string, line: number, column: number): void {
    // Second 60 is a leap second, which RFC 3339 permits and TOML inherits.
    if (Number.parseInt(hour, 10) > 23 || Number.parseInt(minute, 10) > 59 || Number.parseInt(second, 10) > 60) {
      this.fail(`'${hour}:${minute}:${second}' is not a time`, line, column);
    }
  }

  private number(token: string, line: number, column: number): number {
    if (SPECIAL_FLOAT.test(token)) {
      if (token.endsWith("nan")) return Number.NaN;
      return token.startsWith("-") ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    }
    if (PREFIXED_INTEGER.test(token)) return this.exactInteger(BigInt(token.replaceAll("_", "")), token, line, column);
    if (DECIMAL_INTEGER.test(token)) {
      const digits = token.replaceAll("_", "");
      return this.exactInteger(BigInt(digits), token, line, column);
    }
    if (FLOAT.test(token) && /[.eE]/u.test(token)) return Number.parseFloat(token.replaceAll("_", ""));
    this.fail(`'${token}' is not a valid TOML value`, line, column);
  }

  /**
   * Refuse an integer JavaScript cannot represent exactly.
   *
   * TOML integers are 64-bit and JavaScript numbers are not, so the alternative
   * to refusing is rounding — and a byte limit or a line count that quietly
   * became a different number is a defect that reads as correct everywhere it
   * is used afterwards.
   */
  private exactInteger(value: bigint, token: string, line: number, column: number): number {
    if (value > SAFE_INTEGER || value < -SAFE_INTEGER) {
      this.fail(`'${token}' cannot be represented exactly and is refused rather than rounded`, line, column);
    }
    return Number(value);
  }
}

function isTable(value: unknown): value is Table {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof TomlDateTime);
}

/** Control characters are illegal outside strings and inside them alike. */
function isControl(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  return (code < 0x20 && character !== "\t") || code === 0x7f;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}
