import { node, type SyntaxNode, type SyntaxProvider, type SyntaxTree } from "../syntax";

/**
 * JSON syntax provider.
 *
 * Object members are named by key and their container is commutative: two
 * contributors adding different keys to the same object is a merge, not a
 * conflict, because both orders canonicalize identically (ADR-0031).
 * Array elements are positional and never commutative.
 */
class JsonReader {
  private offset = 0;

  constructor(private readonly source: string) {}

  parseDocument(): SyntaxNode {
    this.skipTrivia();
    const value = this.parseValue();
    this.skipTrivia();
    if (this.offset < this.source.length) throw new SyntaxError(`unexpected trailing JSON input at offset ${this.offset}`);
    return value;
  }

  private parseValue(): SyntaxNode {
    this.skipTrivia();
    const character = this.source[this.offset];
    if (character === "{") return this.parseObject();
    if (character === "[") return this.parseArray();
    return this.parseScalar();
  }

  private parseObject(): SyntaxNode {
    const start = this.offset;
    this.offset += 1;
    const members: SyntaxNode[] = [];
    this.skipTrivia();
    while (this.source[this.offset] !== "}") {
      if (this.offset >= this.source.length) throw new SyntaxError("unterminated JSON object");
      const memberStart = this.offset;
      const key = this.parseStringLiteral();
      this.skipTrivia();
      if (this.source[this.offset] !== ":") throw new SyntaxError(`expected ':' at offset ${this.offset}`);
      this.offset += 1;
      const value = this.parseValue();
      members.push(node("member", this.source, memberStart, value.end, { name: key, children: [value] }));
      this.skipTrivia();
      if (this.source[this.offset] === ",") {
        this.offset += 1;
        this.skipTrivia();
        if (this.source[this.offset] === "}") throw new SyntaxError(`trailing comma at offset ${this.offset}`);
      } else if (this.source[this.offset] !== "}") {
        throw new SyntaxError(`expected ',' or '}' at offset ${this.offset}`);
      }
    }
    this.offset += 1;
    return node("object", this.source, start, this.offset, { children: members, commutative: true, separator: ",\n" });
  }

  private parseArray(): SyntaxNode {
    const start = this.offset;
    this.offset += 1;
    const elements: SyntaxNode[] = [];
    this.skipTrivia();
    while (this.source[this.offset] !== "]") {
      if (this.offset >= this.source.length) throw new SyntaxError("unterminated JSON array");
      const value = this.parseValue();
      // Wrap the value node rather than splicing in its children: an object
      // inside an array must keep its own `commutative` flag and separator, or
      // inserting a member into it emits JSON without a comma.
      elements.push(node("element", this.source, value.start, value.end, { children: [value] }));
      this.skipTrivia();
      if (this.source[this.offset] === ",") {
        this.offset += 1;
        this.skipTrivia();
        if (this.source[this.offset] === "]") throw new SyntaxError(`trailing comma at offset ${this.offset}`);
      } else if (this.source[this.offset] !== "]") {
        throw new SyntaxError(`expected ',' or ']' at offset ${this.offset}`);
      }
    }
    this.offset += 1;
    return node("array", this.source, start, this.offset, { children: elements, separator: ",\n" });
  }

  private parseScalar(): SyntaxNode {
    const start = this.offset;
    if (this.source[this.offset] === "\"") {
      this.parseStringLiteral();
      return node("string", this.source, start, this.offset);
    }
    while (this.offset < this.source.length && !",]}\r\n\t ".includes(this.source[this.offset])) this.offset += 1;
    if (this.offset === start) throw new SyntaxError(`expected a JSON value at offset ${start}`);
    return node("scalar", this.source, start, this.offset);
  }

  private parseStringLiteral(): string {
    this.skipTrivia();
    if (this.source[this.offset] !== "\"") throw new SyntaxError(`expected a string at offset ${this.offset}`);
    this.offset += 1;
    let value = "";
    while (this.source[this.offset] !== "\"") {
      if (this.offset >= this.source.length) throw new SyntaxError("unterminated JSON string");
      if (this.source[this.offset] === "\\") {
        value += this.source.slice(this.offset, this.offset + 2);
        this.offset += 2;
        continue;
      }
      value += this.source[this.offset];
      this.offset += 1;
    }
    this.offset += 1;
    return value;
  }

  private skipTrivia(): void {
    while (this.offset < this.source.length && " \t\r\n".includes(this.source[this.offset])) this.offset += 1;
  }
}

export const jsonSyntaxProvider: SyntaxProvider = {
  id: "epoch.syntax.json",
  language: "json",
  extensions: [".json"],
  mimeTypes: ["application/json"],
  fidelity: "grammar",
  parse(source: string): SyntaxTree {
    const document = new JsonReader(source).parseDocument();
    return {
      providerId: "epoch.syntax.json",
      language: "json",
      source,
      root: node("document", source, 0, source.length, { children: [document] }),
    };
  },
};
