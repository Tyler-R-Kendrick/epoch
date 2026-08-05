"use strict";
(() => {
  // docs/design-explorations/nightboard/.stub/zod.mjs
  var nope = (name) => () => {
    throw new Error(`zod.${name} called in the browser: this build ships the JSON-schema parser only`);
  };
  var object = nope("object");
  var string = nope("string");
  var number = nope("number");
  var boolean = nope("boolean");
  var array = nope("array");
  var any = nope("any");
  var enum_ = nope("enum");
  var toJSONSchema = nope("toJSONSchema");
  var registry = nope("registry");
  var globalRegistry = { add: nope("globalRegistry.add"), get: () => void 0 };
  var safeParse = nope("safeParse");
  var parse = nope("parse");

  // node_modules/@openuidev/lang-core/dist/index.mjs
  function resolveField(obj, path) {
    if (!path || obj == null) return void 0;
    if (!path.includes(".")) return obj[path];
    let cur = obj;
    for (const p of path.split(".")) {
      if (cur == null) return void 0;
      cur = cur[p];
    }
    return cur;
  }
  function toNumber(val) {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }
    if (typeof val === "boolean") return val ? 1 : 0;
    return 0;
  }
  var BUILTINS = {
    Count: {
      name: "Count",
      signature: "Count(array) \u2192 number",
      description: "Returns array length",
      fn: (arr) => Array.isArray(arr) ? arr.length : 0
    },
    First: {
      name: "First",
      signature: "First(array) \u2192 element",
      description: "Returns first element of array",
      fn: (arr) => Array.isArray(arr) ? arr[0] ?? null : null
    },
    Last: {
      name: "Last",
      signature: "Last(array) \u2192 element",
      description: "Returns last element of array",
      fn: (arr) => Array.isArray(arr) ? arr[arr.length - 1] ?? null : null
    },
    Sum: {
      name: "Sum",
      signature: "Sum(numbers[]) \u2192 number",
      description: "Sum of numeric array",
      fn: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + toNumber(b), 0) : 0
    },
    Avg: {
      name: "Avg",
      signature: "Avg(numbers[]) \u2192 number",
      description: "Average of numeric array",
      fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((a, b) => a + toNumber(b), 0) / arr.length : 0
    },
    Min: {
      name: "Min",
      signature: "Min(numbers[]) \u2192 number",
      description: "Minimum value in array",
      fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((acc, b) => Math.min(acc, toNumber(b)), toNumber(arr[0])) : 0
    },
    Max: {
      name: "Max",
      signature: "Max(numbers[]) \u2192 number",
      description: "Maximum value in array",
      fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((acc, b) => Math.max(acc, toNumber(b)), toNumber(arr[0])) : 0
    },
    Sort: {
      name: "Sort",
      signature: "Sort(array, field, direction?) \u2192 sorted array",
      description: 'Sort array by field. Direction: "asc" (default) or "desc"',
      fn: (arr, field, dir) => {
        if (!Array.isArray(arr)) return arr;
        const f = String(field ?? "");
        const desc = String(dir ?? "asc") === "desc";
        return [...arr].sort((a, b) => {
          const av = f ? resolveField(a, f) : a;
          const bv = f ? resolveField(b, f) : b;
          const aIsNumeric = typeof av === "number" || typeof av === "string" && !isNaN(Number(av)) && av !== "";
          const bIsNumeric = typeof bv === "number" || typeof bv === "string" && !isNaN(Number(bv)) && bv !== "";
          if (aIsNumeric && bIsNumeric) {
            const diff = toNumber(av) - toNumber(bv);
            return desc ? -diff : diff;
          }
          const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
          return desc ? -cmp : cmp;
        });
      }
    },
    Filter: {
      name: "Filter",
      signature: 'Filter(array, field, operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains", value) \u2192 filtered array',
      description: "Filter array by field value",
      fn: (arr, field, op, value) => {
        if (!Array.isArray(arr)) return [];
        const f = String(field ?? "");
        const o = String(op ?? "==");
        return arr.filter((item) => {
          const v = f ? resolveField(item, f) : item;
          switch (o) {
            case "==":
              return v == value;
            case "!=":
              return v != value;
            case ">":
              return toNumber(v) > toNumber(value);
            case "<":
              return toNumber(v) < toNumber(value);
            case ">=":
              return toNumber(v) >= toNumber(value);
            case "<=":
              return toNumber(v) <= toNumber(value);
            case "contains":
              return String(v ?? "").includes(String(value ?? ""));
            default:
              return false;
          }
        });
      }
    },
    Round: {
      name: "Round",
      signature: "Round(number, decimals?) \u2192 number",
      description: "Round to N decimal places (default 0)",
      fn: (n, decimals) => {
        const num = toNumber(n);
        const d = decimals != null ? toNumber(decimals) : 0;
        const factor = Math.pow(10, d);
        return Math.round(num * factor) / factor;
      }
    },
    Abs: {
      name: "Abs",
      signature: "Abs(number) \u2192 number",
      description: "Absolute value",
      fn: (n) => Math.abs(toNumber(n))
    },
    Floor: {
      name: "Floor",
      signature: "Floor(number) \u2192 number",
      description: "Round down to nearest integer",
      fn: (n) => Math.floor(toNumber(n))
    },
    Ceil: {
      name: "Ceil",
      signature: "Ceil(number) \u2192 number",
      description: "Round up to nearest integer",
      fn: (n) => Math.ceil(toNumber(n))
    }
  };
  var LAZY_BUILTINS = /* @__PURE__ */ new Set(["Each"]);
  var ACTION_STEPS = {
    Run: "run",
    ToAssistant: "continue_conversation",
    OpenUrl: "open_url",
    Set: "set",
    Reset: "reset"
  };
  var ACTION_NAMES = /* @__PURE__ */ new Set(["Action", ...Object.keys(ACTION_STEPS)]);
  var BUILTIN_NAMES = /* @__PURE__ */ new Set([
    ...Object.keys(BUILTINS),
    ...LAZY_BUILTINS,
    ...ACTION_NAMES
  ]);
  function isBuiltin(name) {
    return BUILTIN_NAMES.has(name);
  }
  var RESERVED_CALLS = {
    Query: "Query",
    Mutation: "Mutation"
  };
  function isReservedCall(name) {
    return name in RESERVED_CALLS;
  }
  function isElementNode(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const node = value;
    return node.type === "element" && typeof node.typeName === "string" && typeof node.props === "object" && node.props !== null && typeof node.partial === "boolean";
  }
  function isRuntimeExpr(node) {
    switch (node.k) {
      case "StateRef":
      case "RuntimeRef":
      case "BinOp":
      case "UnaryOp":
      case "Ternary":
      case "Member":
      case "Index":
      case "Assign":
        return true;
      default:
        return false;
    }
  }
  var AST_KINDS = /* @__PURE__ */ new Set([
    "Comp",
    "Ref",
    "StateRef",
    "RuntimeRef",
    "BinOp",
    "UnaryOp",
    "Ternary",
    "Member",
    "Index",
    "Assign",
    "Str",
    "Num",
    "Bool",
    "Null",
    "Arr",
    "Obj",
    "Ph"
  ]);
  function isASTNode(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return AST_KINDS.has(value.k);
  }
  function walkAST(node, visit) {
    const walk = (current) => {
      visit(current);
      switch (current.k) {
        case "Comp":
          current.args.forEach(walk);
          Object.values(current.mappedProps ?? {}).forEach(walk);
          break;
        case "Arr":
          current.els.forEach(walk);
          break;
        case "Obj":
          current.entries.forEach(([, value]) => walk(value));
          break;
        case "BinOp":
          walk(current.left);
          walk(current.right);
          break;
        case "UnaryOp":
          walk(current.operand);
          break;
        case "Ternary":
          walk(current.cond);
          walk(current.then);
          walk(current.else);
          break;
        case "Member":
          walk(current.obj);
          break;
        case "Index":
          walk(current.obj);
          walk(current.index);
          break;
        case "Assign":
          walk(current.value);
          break;
      }
    };
    walk(node);
  }
  var PREC_TERNARY = 1;
  var PREC_OR = 2;
  var PREC_AND = 3;
  var PREC_EQ = 4;
  var PREC_CMP = 5;
  var PREC_ADD = 6;
  var PREC_MUL = 7;
  var PREC_UNARY = 8;
  var PREC_MEMBER = 9;
  function parseExpression(tokens) {
    let pos = 0;
    const cur = () => tokens[pos] ?? { t: 13 };
    const adv = () => {
      const tok = cur();
      pos++;
      return tok;
    };
    const eat = (kind) => {
      if (cur().t === kind) pos++;
    };
    function getInfixPrec(tok) {
      switch (tok.t) {
        case 34:
          return PREC_TERNARY;
        case 32:
          return PREC_OR;
        case 31:
          return PREC_AND;
        case 25:
        case 26:
          return PREC_EQ;
        case 27:
        case 28:
        case 29:
        case 30:
          return PREC_CMP;
        case 20:
        case 21:
          return PREC_ADD;
        case 22:
        case 23:
        case 24:
          return PREC_MUL;
        case 19:
        case 3:
          return PREC_MEMBER;
        default:
          return 0;
      }
    }
    function parseExpr(minPrec = 0) {
      let left = parsePrefix();
      while (getInfixPrec(cur()) > minPrec) left = parseInfix(left);
      return left;
    }
    function parsePrefix() {
      const tok = cur();
      if (tok.t === 14) {
        adv();
        return {
          k: "Str",
          v: tok.v
        };
      }
      if (tok.t === 15) {
        adv();
        return {
          k: "Num",
          v: tok.v
        };
      }
      if (tok.t === 10) {
        adv();
        return {
          k: "Bool",
          v: true
        };
      }
      if (tok.t === 11) {
        adv();
        return {
          k: "Bool",
          v: false
        };
      }
      if (tok.t === 12) {
        adv();
        return { k: "Null" };
      }
      if (tok.t === 3) return parseArr();
      if (tok.t === 5) return parseObj();
      if (tok.t === 18) {
        const name = tok.v;
        adv();
        if (cur().t === 9) {
          adv();
          return {
            k: "Assign",
            target: name,
            value: parseExpr(0)
          };
        }
        return {
          k: "StateRef",
          n: name
        };
      }
      if (tok.t === 17) {
        const name = tok.v;
        if (tokens[pos + 1]?.t === 1 && (!isBuiltin(name) || name === "Action")) return parseComp();
        adv();
        return {
          k: "Ref",
          n: name
        };
      }
      if (tok.t === 35) {
        if (tokens[pos + 1]?.t === 1) return parseComp();
        adv();
        return {
          k: "Ref",
          n: tok.v
        };
      }
      if (tok.t === 16) {
        adv();
        return {
          k: "Ref",
          n: tok.v
        };
      }
      if (tok.t === 33) {
        adv();
        return {
          k: "UnaryOp",
          op: "!",
          operand: parseExpr(PREC_UNARY)
        };
      }
      if (tok.t === 21) {
        adv();
        return {
          k: "UnaryOp",
          op: "-",
          operand: parseExpr(PREC_UNARY)
        };
      }
      if (tok.t === 1) {
        adv();
        const inner = parseExpr(0);
        eat(2);
        return inner;
      }
      adv();
      return { k: "Null" };
    }
    function parseInfix(left) {
      const tok = cur();
      if (tok.t === 20) {
        adv();
        return {
          k: "BinOp",
          op: "+",
          left,
          right: parseExpr(PREC_ADD)
        };
      }
      if (tok.t === 21) {
        adv();
        return {
          k: "BinOp",
          op: "-",
          left,
          right: parseExpr(PREC_ADD)
        };
      }
      if (tok.t === 22) {
        adv();
        return {
          k: "BinOp",
          op: "*",
          left,
          right: parseExpr(PREC_MUL)
        };
      }
      if (tok.t === 23) {
        adv();
        return {
          k: "BinOp",
          op: "/",
          left,
          right: parseExpr(PREC_MUL)
        };
      }
      if (tok.t === 24) {
        adv();
        return {
          k: "BinOp",
          op: "%",
          left,
          right: parseExpr(PREC_MUL)
        };
      }
      if (tok.t === 25) {
        adv();
        return {
          k: "BinOp",
          op: "==",
          left,
          right: parseExpr(PREC_EQ)
        };
      }
      if (tok.t === 26) {
        adv();
        return {
          k: "BinOp",
          op: "!=",
          left,
          right: parseExpr(PREC_EQ)
        };
      }
      if (tok.t === 27) {
        adv();
        return {
          k: "BinOp",
          op: ">",
          left,
          right: parseExpr(PREC_CMP)
        };
      }
      if (tok.t === 28) {
        adv();
        return {
          k: "BinOp",
          op: "<",
          left,
          right: parseExpr(PREC_CMP)
        };
      }
      if (tok.t === 29) {
        adv();
        return {
          k: "BinOp",
          op: ">=",
          left,
          right: parseExpr(PREC_CMP)
        };
      }
      if (tok.t === 30) {
        adv();
        return {
          k: "BinOp",
          op: "<=",
          left,
          right: parseExpr(PREC_CMP)
        };
      }
      if (tok.t === 31) {
        adv();
        return {
          k: "BinOp",
          op: "&&",
          left,
          right: parseExpr(PREC_AND)
        };
      }
      if (tok.t === 32) {
        adv();
        return {
          k: "BinOp",
          op: "||",
          left,
          right: parseExpr(PREC_OR)
        };
      }
      if (tok.t === 34) {
        adv();
        const then = parseExpr(0);
        eat(8);
        return {
          k: "Ternary",
          cond: left,
          then,
          else: parseExpr(0)
        };
      }
      if (tok.t === 19) {
        adv();
        const fieldTok = cur();
        return {
          k: "Member",
          obj: left,
          field: fieldTok.t === 16 || fieldTok.t === 17 || fieldTok.t === 14 || fieldTok.t === 15 ? (adv(), String(fieldTok.v)) : fieldTok.t === 18 ? (adv(), fieldTok.v.replace(/^\$/, "")) : (adv(), "?")
        };
      }
      if (tok.t === 3) {
        adv();
        const index = parseExpr(0);
        eat(4);
        return {
          k: "Index",
          obj: left,
          index
        };
      }
      return left;
    }
    function parseComp() {
      const name = cur().v;
      adv();
      eat(1);
      const args = [];
      while (cur().t !== 2 && cur().t !== 13) {
        args.push(parseExpr(0));
        if (cur().t === 7) adv();
      }
      eat(2);
      return {
        k: "Comp",
        name,
        args
      };
    }
    function parseArr() {
      adv();
      const els = [];
      while (cur().t !== 4 && cur().t !== 13) {
        els.push(parseExpr(0));
        if (cur().t === 7) adv();
      }
      eat(4);
      return {
        k: "Arr",
        els
      };
    }
    function parseObj() {
      adv();
      const entries = [];
      while (cur().t !== 6 && cur().t !== 13) {
        const kt = cur();
        const key = kt.t === 16 || kt.t === 14 || kt.t === 17 || kt.t === 15 ? (adv(), String(kt.v)) : kt.t === 18 ? (adv(), kt.v.replace(/^\$/, "")) : (adv(), "?");
        eat(8);
        entries.push([key, parseExpr(0)]);
        if (cur().t === 7) adv();
      }
      eat(6);
      return {
        k: "Obj",
        entries
      };
    }
    return parseExpr(0);
  }
  function tokenize(src) {
    const tokens = [];
    let i = 0;
    const n = src.length;
    while (i < n) {
      while (i < n && (src[i] === " " || src[i] === "	" || src[i] === "\r")) i++;
      if (i >= n) break;
      const c = src[i];
      if (c === "\n") {
        tokens.push({ t: 0 });
        i++;
        continue;
      }
      if (c === "(") {
        tokens.push({ t: 1 });
        i++;
        continue;
      }
      if (c === ")") {
        tokens.push({ t: 2 });
        i++;
        continue;
      }
      if (c === "[") {
        tokens.push({ t: 3 });
        i++;
        continue;
      }
      if (c === "]") {
        tokens.push({ t: 4 });
        i++;
        continue;
      }
      if (c === "{") {
        tokens.push({ t: 5 });
        i++;
        continue;
      }
      if (c === "}") {
        tokens.push({ t: 6 });
        i++;
        continue;
      }
      if (c === ",") {
        tokens.push({ t: 7 });
        i++;
        continue;
      }
      if (c === ":") {
        tokens.push({ t: 8 });
        i++;
        continue;
      }
      if (c === "=") {
        if (i + 1 < n && src[i + 1] === "=") {
          tokens.push({ t: 25 });
          i += 2;
        } else {
          tokens.push({ t: 9 });
          i++;
        }
        continue;
      }
      if (c === "!") {
        if (i + 1 < n && src[i + 1] === "=") {
          tokens.push({ t: 26 });
          i += 2;
        } else {
          tokens.push({ t: 33 });
          i++;
        }
        continue;
      }
      if (c === ">") {
        if (i + 1 < n && src[i + 1] === "=") {
          tokens.push({ t: 29 });
          i += 2;
        } else {
          tokens.push({ t: 27 });
          i++;
        }
        continue;
      }
      if (c === "<") {
        if (i + 1 < n && src[i + 1] === "=") {
          tokens.push({ t: 30 });
          i += 2;
        } else {
          tokens.push({ t: 28 });
          i++;
        }
        continue;
      }
      if (c === "&") {
        if (i + 1 < n && src[i + 1] === "&") {
          tokens.push({ t: 31 });
          i += 2;
        } else {
          tokens.push({ t: 31 });
          i++;
        }
        continue;
      }
      if (c === "|") {
        if (i + 1 < n && src[i + 1] === "|") {
          tokens.push({ t: 32 });
          i += 2;
        } else {
          tokens.push({ t: 32 });
          i++;
        }
        continue;
      }
      if (c === ".") {
        tokens.push({ t: 19 });
        i++;
        continue;
      }
      if (c === "?") {
        tokens.push({ t: 34 });
        i++;
        continue;
      }
      if (c === "+") {
        tokens.push({ t: 20 });
        i++;
        continue;
      }
      if (c === "*") {
        tokens.push({ t: 22 });
        i++;
        continue;
      }
      if (c === "/") {
        tokens.push({ t: 23 });
        i++;
        continue;
      }
      if (c === "%") {
        tokens.push({ t: 24 });
        i++;
        continue;
      }
      if (c === '"') {
        const start = i;
        i++;
        let isClosed = false;
        while (i < n) if (src[i] === "\\") i += 2;
        else if (src[i] === '"') {
          i++;
          isClosed = true;
          break;
        } else i++;
        const rawString = src.slice(start, i);
        try {
          const validJsonString = isClosed ? rawString : rawString + '"';
          tokens.push({
            t: 14,
            v: JSON.parse(validJsonString)
          });
        } catch {
          const stripped = rawString.replace(/^"|"$/g, "");
          tokens.push({
            t: 14,
            v: stripped
          });
        }
        continue;
      }
      if (c === "'") {
        i++;
        let result = "";
        while (i < n) if (src[i] === "\\") {
          i++;
          if (i < n) {
            const esc = src[i];
            if (esc === "'") result += "'";
            else if (esc === "\\") result += "\\";
            else if (esc === "n") result += "\n";
            else if (esc === "t") result += "	";
            else result += esc;
            i++;
          }
        } else if (src[i] === "'") {
          i++;
          break;
        } else {
          result += src[i];
          i++;
        }
        tokens.push({
          t: 14,
          v: result
        });
        continue;
      }
      if (c === "-") {
        const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
        if (!(prev != null && (prev.t === 15 || prev.t === 14 || prev.t === 16 || prev.t === 17 || prev.t === 2 || prev.t === 4 || prev.t === 10 || prev.t === 11 || prev.t === 12 || prev.t === 18 || prev.t === 35)) && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9") {
        } else {
          tokens.push({ t: 21 });
          i++;
          continue;
        }
      }
      const isDigit = c >= "0" && c <= "9";
      const isNegDigit = c === "-" && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9";
      if (isDigit || isNegDigit) {
        const start = i;
        if (src[i] === "-") i++;
        while (i < n && src[i] >= "0" && src[i] <= "9") i++;
        if (i < n && src[i] === "." && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9") {
          i++;
          while (i < n && src[i] >= "0" && src[i] <= "9") i++;
        }
        if (i < n && (src[i] === "e" || src[i] === "E")) {
          i++;
          if (i < n && (src[i] === "+" || src[i] === "-")) i++;
          while (i < n && src[i] >= "0" && src[i] <= "9") i++;
        }
        tokens.push({
          t: 15,
          v: +src.slice(start, i)
        });
        continue;
      }
      if (c === "$" && i + 1 < n && (src[i + 1] >= "a" && src[i + 1] <= "z" || src[i + 1] >= "A" && src[i + 1] <= "Z" || src[i + 1] === "_")) {
        const start = i;
        i++;
        while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_")) i++;
        tokens.push({
          t: 18,
          v: src.slice(start, i)
        });
        continue;
      }
      if (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_") {
        const start = i;
        while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_")) i++;
        const word = src.slice(start, i);
        if (word === "true") {
          tokens.push({ t: 10 });
          continue;
        }
        if (word === "false") {
          tokens.push({ t: 11 });
          continue;
        }
        if (word === "null") {
          tokens.push({ t: 12 });
          continue;
        }
        const kind = c >= "A" && c <= "Z" ? 17 : 16;
        tokens.push({
          t: kind,
          v: word
        });
        continue;
      }
      if (c === "@" && i + 1 < n && (src[i + 1] >= "a" && src[i + 1] <= "z" || src[i + 1] >= "A" && src[i + 1] <= "Z" || src[i + 1] === "_")) {
        i++;
        const start = i;
        while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_")) i++;
        tokens.push({
          t: 35,
          v: src.slice(start, i)
        });
        continue;
      }
      i++;
    }
    tokens.push({ t: 13 });
    return tokens;
  }
  function containsDynamicValue(v) {
    if (v == null || typeof v !== "object") return false;
    if (isASTNode(v)) return true;
    if (Array.isArray(v)) return v.some(containsDynamicValue);
    if (isElementNode(v)) return Object.values(v.props).some(containsDynamicValue);
    return Object.values(v).some(containsDynamicValue);
  }
  function resolveRef(name, ctx, mode) {
    if (ctx.visited.has(name)) {
      ctx.unres.push(name);
      return mode === "expr" ? {
        k: "Ph",
        n: name
      } : null;
    }
    if (!ctx.syms.has(name)) {
      ctx.unres.push(name);
      return mode === "expr" ? {
        k: "Ph",
        n: name
      } : null;
    }
    const target = ctx.syms.get(name);
    ctx.unreached?.delete(name);
    if (target.k === "Comp" && isReservedCall(target.name)) return {
      k: "RuntimeRef",
      n: name,
      refType: target.name === RESERVED_CALLS.Mutation ? "mutation" : "query"
    };
    ctx.visited.add(name);
    const prevStatementId = ctx.currentStatementId;
    ctx.currentStatementId = name;
    try {
      const result = mode === "value" ? materializeValue(target, ctx) : materializeExpr(target, ctx);
      if (mode === "value" && isElementNode(result)) result.statementId = name;
      return result;
    } finally {
      ctx.currentStatementId = prevStatementId;
      ctx.visited.delete(name);
    }
  }
  function materializeLazyBuiltin(node, ctx, scopedRefs) {
    if (!LAZY_BUILTINS.has(node.name) || node.args.length < 3) return null;
    const varArg = node.args[1];
    const varName = varArg.k === "Ref" ? varArg.n : varArg.k === "Str" ? varArg.v : null;
    if (!varName) return null;
    const nextScopedRefs = new Set(scopedRefs);
    nextScopedRefs.add(varName);
    const recursedArgs = node.args.map((a, i) => i === 1 ? a : materializeExprInternal(a, ctx, nextScopedRefs));
    return {
      ...node,
      args: recursedArgs
    };
  }
  function materializeExprInternal(node, ctx, scopedRefs) {
    switch (node.k) {
      case "Ref":
        return scopedRefs.has(node.n) ? node : resolveRef(node.n, ctx, "expr");
      case "Ph":
        return node;
      case "Comp": {
        const lazy = materializeLazyBuiltin(node, ctx, scopedRefs);
        if (lazy) return lazy;
        const recursedArgs = node.args.map((a) => materializeExprInternal(a, ctx, scopedRefs));
        if (isBuiltin(node.name) || isReservedCall(node.name)) return {
          ...node,
          args: recursedArgs
        };
        const def = ctx.cat?.get(node.name);
        if (def) {
          const mappedProps = {};
          for (let i = 0; i < def.params.length && i < recursedArgs.length; i++) mappedProps[def.params[i].name] = recursedArgs[i];
          return {
            ...node,
            args: recursedArgs,
            mappedProps
          };
        }
        ctx.errors.push({
          code: "unknown-component",
          component: node.name,
          path: "",
          message: `Unknown component "${node.name}" \u2014 not found in catalog or builtins`,
          statementId: ctx.currentStatementId
        });
        return {
          ...node,
          args: recursedArgs
        };
      }
      case "Arr":
        return {
          ...node,
          els: node.els.map((e) => materializeExprInternal(e, ctx, scopedRefs))
        };
      case "Obj":
        return {
          ...node,
          entries: node.entries.map(([k, v]) => [k, materializeExprInternal(v, ctx, scopedRefs)])
        };
      case "BinOp":
        return {
          ...node,
          left: materializeExprInternal(node.left, ctx, scopedRefs),
          right: materializeExprInternal(node.right, ctx, scopedRefs)
        };
      case "UnaryOp":
        return {
          ...node,
          operand: materializeExprInternal(node.operand, ctx, scopedRefs)
        };
      case "Ternary":
        return {
          ...node,
          cond: materializeExprInternal(node.cond, ctx, scopedRefs),
          then: materializeExprInternal(node.then, ctx, scopedRefs),
          else: materializeExprInternal(node.else, ctx, scopedRefs)
        };
      case "Member":
        return {
          ...node,
          obj: materializeExprInternal(node.obj, ctx, scopedRefs)
        };
      case "Index":
        return {
          ...node,
          obj: materializeExprInternal(node.obj, ctx, scopedRefs),
          index: materializeExprInternal(node.index, ctx, scopedRefs)
        };
      case "Assign":
        return {
          ...node,
          value: materializeExprInternal(node.value, ctx, scopedRefs)
        };
      default:
        return node;
    }
  }
  function materializeExpr(node, ctx) {
    return materializeExprInternal(node, ctx, /* @__PURE__ */ new Set());
  }
  function materializeValue(node, ctx) {
    switch (node.k) {
      case "Ref":
        return resolveRef(node.n, ctx, "value");
      case "Str":
        return node.v;
      case "Num":
        return node.v;
      case "Bool":
        return node.v;
      case "Null":
        return null;
      case "Ph":
        return null;
      case "Arr": {
        const items = [];
        for (const e of node.els) {
          if (e.k === "Ph") continue;
          const value = materializeValue(e, ctx);
          if (value === null && (e.k === "Comp" || e.k === "Ref")) continue;
          items.push(value);
        }
        return items;
      }
      case "Obj": {
        const o = {};
        for (const [k, v] of node.entries) o[k] = materializeValue(v, ctx);
        return o;
      }
      case "Comp": {
        const { name, args } = node;
        if (isBuiltin(name)) {
          const lazy = materializeLazyBuiltin(node, ctx, /* @__PURE__ */ new Set());
          if (lazy) return lazy;
          return {
            ...node,
            args: args.map((a) => materializeExpr(a, ctx))
          };
        }
        if (isReservedCall(name)) {
          ctx.errors.push({
            code: "inline-reserved",
            component: name,
            path: "",
            message: `${name}() must be declared as a top-level statement, not used inline as a value`,
            statementId: ctx.currentStatementId
          });
          return null;
        }
        const def = ctx.cat?.get(name);
        const props = {};
        if (def) {
          for (let i = 0; i < def.params.length && i < args.length; i++) props[def.params[i].name] = materializeValue(args[i], ctx);
          if (args.length > def.params.length) {
            const excessCount = args.length - def.params.length;
            ctx.errors.push({
              code: "excess-args",
              component: name,
              path: "",
              message: `${name} takes ${def.params.length} arg(s), got ${args.length} (${excessCount} excess dropped)`,
              statementId: ctx.currentStatementId
            });
          }
          const missingRequired = def.params.filter((p) => p.required && (!(p.name in props) || props[p.name] === null));
          if (missingRequired.length) {
            const stillInvalid = missingRequired.filter((p) => {
              if (p.defaultValue !== void 0) {
                props[p.name] = p.defaultValue;
                return false;
              }
              return true;
            });
            if (stillInvalid.length) {
              for (const p of stillInvalid) {
                const isNull = p.name in props;
                ctx.errors.push({
                  code: isNull ? "null-required" : "missing-required",
                  component: name,
                  path: `/${p.name}`,
                  message: isNull ? `required field "${p.name}" cannot be null` : `missing required field "${p.name}"`,
                  statementId: ctx.currentStatementId
                });
              }
              return null;
            }
          }
        } else if (!isBuiltin(name) && !isReservedCall(name)) {
          ctx.errors.push({
            code: "unknown-component",
            component: name,
            path: "",
            message: `Unknown component "${name}" \u2014 not found in catalog or builtins`,
            statementId: ctx.currentStatementId
          });
          return null;
        }
        const hasDynamicProps = Object.values(props).some((v) => containsDynamicValue(v));
        return {
          type: "element",
          typeName: name,
          props,
          partial: ctx.partial,
          hasDynamicProps
        };
      }
      default:
        if (isRuntimeExpr(node)) return materializeExpr(node, ctx);
        return node;
    }
  }
  function autoClose(input) {
    const stack = [];
    let inStr = false;
    let esc = false;
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\" && inStr) {
        esc = true;
        continue;
      }
      if (inStr) {
        if (c === inStr) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") stack.push(c);
      else if (c === ")" && stack[stack.length - 1] === "(") stack.pop();
      else if (c === "]" && stack[stack.length - 1] === "[") stack.pop();
      else if (c === "}" && stack[stack.length - 1] === "{") stack.pop();
    }
    if (!(!!inStr || stack.length > 0)) return {
      text: input,
      wasIncomplete: false
    };
    let out = input;
    if (inStr) {
      if (esc) out += "\\";
      out += inStr;
    }
    for (let j = stack.length - 1; j >= 0; j--) out += stack[j] === "(" ? ")" : stack[j] === "[" ? "]" : "}";
    return {
      text: out,
      wasIncomplete: true
    };
  }
  function split(tokens) {
    const stmts = [];
    let pos = 0;
    while (pos < tokens.length) {
      while (pos < tokens.length && tokens[pos].t === 0) pos++;
      if (pos >= tokens.length || tokens[pos].t === 13) break;
      const tok = tokens[pos];
      if (tok.t !== 16 && tok.t !== 17 && tok.t !== 18) {
        while (pos < tokens.length && tokens[pos].t !== 0 && tokens[pos].t !== 13) pos++;
        continue;
      }
      const id = tok.v;
      const idTokenType = tok.t;
      pos++;
      if (pos >= tokens.length || tokens[pos].t !== 9) {
        while (pos < tokens.length && tokens[pos].t !== 0 && tokens[pos].t !== 13) pos++;
        continue;
      }
      pos++;
      const expr = [];
      let depth = 0;
      let ternaryDepth = 0;
      while (pos < tokens.length && tokens[pos].t !== 13) {
        const tt = tokens[pos].t;
        if (tt === 0 && depth <= 0 && ternaryDepth <= 0) {
          let peek = pos + 1;
          while (peek < tokens.length && tokens[peek].t === 0) peek++;
          const nextT = peek < tokens.length ? tokens[peek].t : 13;
          if (nextT === 34 || nextT === 8 && ternaryDepth > 0) {
            pos++;
            continue;
          }
          break;
        }
        if (tt === 0) {
          pos++;
          continue;
        }
        if (tt === 1 || tt === 3 || tt === 5) depth++;
        else if ((tt === 2 || tt === 4 || tt === 6) && depth > 0) depth--;
        else if (tt === 34 && depth === 0) ternaryDepth++;
        else if (tt === 8 && depth === 0 && ternaryDepth > 0) ternaryDepth--;
        expr.push(tokens[pos++]);
      }
      if (expr.length) stmts.push({
        id,
        idTokenType,
        tokens: expr
      });
    }
    return stmts;
  }
  function emptyResult(incomplete = true) {
    return {
      root: null,
      meta: {
        incomplete,
        unresolved: [],
        orphaned: [],
        statementCount: 0,
        errors: []
      },
      stateDeclarations: {},
      queryStatements: [],
      mutationStatements: []
    };
  }
  function collectQueryDeps(node) {
    if (!isASTNode(node)) return [];
    const refs = /* @__PURE__ */ new Set();
    walkAST(node, (current) => {
      if (current.k === "StateRef") refs.add(current.n);
    });
    return [...refs];
  }
  function classifyStatement(raw, expr) {
    if (expr.k === "Comp" && expr.name === RESERVED_CALLS.Query) {
      const deps = collectQueryDeps(expr.args[1]);
      return {
        kind: "query",
        id: raw.id,
        call: {
          callee: RESERVED_CALLS.Query,
          args: expr.args
        },
        expr,
        deps: deps.length > 0 ? deps : void 0
      };
    }
    if (expr.k === "Comp" && expr.name === RESERVED_CALLS.Mutation) return {
      kind: "mutation",
      id: raw.id,
      call: {
        callee: RESERVED_CALLS.Mutation,
        args: expr.args
      },
      expr
    };
    if (raw.idTokenType === 18) return {
      kind: "state",
      id: raw.id,
      init: expr
    };
    return {
      kind: "value",
      id: raw.id,
      expr
    };
  }
  function extractStatements(stmts, ctx) {
    const stateDeclarations = {};
    const queryStatements = [];
    const mutationStatements = [];
    for (const stmt of stmts) switch (stmt.kind) {
      case "state":
        stateDeclarations[stmt.id] = materializeValue(stmt.init, ctx);
        break;
      case "query":
        queryStatements.push({
          statementId: stmt.id,
          toolAST: stmt.call.args[0] ?? null,
          argsAST: stmt.call.args[1] ?? null,
          defaultsAST: stmt.call.args[2] ?? null,
          refreshAST: stmt.call.args[3] ?? null,
          deps: stmt.deps,
          complete: true
        });
        break;
      case "mutation":
        mutationStatements.push({
          statementId: stmt.id,
          toolAST: stmt.call.args[0] ?? null,
          argsAST: stmt.call.args[1] ?? null
        });
        break;
    }
    for (const stmt of stmts) {
      const nodes = stmt.kind === "state" ? [stmt.init] : stmt.kind === "value" ? [stmt.expr] : stmt.kind === "query" || stmt.kind === "mutation" ? stmt.call.args : [];
      for (const node of nodes) for (const dep of collectQueryDeps(node)) if (!(dep in stateDeclarations)) stateDeclarations[dep] = null;
    }
    return {
      stateDeclarations,
      queryStatements,
      mutationStatements
    };
  }
  var DEFAULT_ROOT_STATEMENT_ID = "root";
  function isComponentStatement(stmt) {
    return stmt.kind === "value" && stmt.expr.k === "Comp" && !isBuiltin(stmt.expr.name) && stmt.expr.name !== RESERVED_CALLS.Query && stmt.expr.name !== RESERVED_CALLS.Mutation;
  }
  function pickEntryId(stmtMap, typedStmts, firstId, rootName) {
    if (stmtMap.has(DEFAULT_ROOT_STATEMENT_ID)) return DEFAULT_ROOT_STATEMENT_ID;
    if (rootName && stmtMap.has(rootName)) return rootName;
    const preferredComponent = rootName ? typedStmts.find((stmt) => isComponentStatement(stmt) && stmt.expr.name === rootName) : void 0;
    if (preferredComponent) return preferredComponent.id;
    return typedStmts.find(isComponentStatement)?.id ?? firstId;
  }
  function buildResult(stmtMap, typedStmts, firstId, wasIncomplete, stmtCount, cat, rootName) {
    const entryId = pickEntryId(stmtMap, typedStmts, firstId, rootName);
    if (!stmtMap.has(entryId)) return emptyResult(wasIncomplete);
    const syms = /* @__PURE__ */ new Map();
    for (const [id, stmt] of stmtMap) syms.set(id, stmt.kind === "state" ? stmt.init : stmt.expr);
    const unres = [];
    const errors = [];
    const unreached = /* @__PURE__ */ new Set();
    for (const [id, stmt] of stmtMap) {
      if (id === entryId) continue;
      if (stmt.kind === "state" || stmt.kind === "query" || stmt.kind === "mutation") continue;
      unreached.add(id);
    }
    const ctx = {
      syms,
      cat,
      errors,
      unres,
      visited: /* @__PURE__ */ new Set(),
      partial: wasIncomplete,
      currentStatementId: entryId,
      unreached
    };
    const materialized = materializeValue(syms.get(entryId), ctx);
    const root = isElementNode(materialized) ? materialized : null;
    if (root) root.statementId = entryId;
    const { stateDeclarations, queryStatements, mutationStatements } = extractStatements(typedStmts, ctx);
    return {
      root,
      meta: {
        incomplete: wasIncomplete,
        unresolved: unres,
        orphaned: [...unreached],
        statementCount: stmtCount,
        errors
      },
      stateDeclarations,
      queryStatements,
      mutationStatements
    };
  }
  function skipString(input, start) {
    if (input[start] !== '"') return start;
    let i = start + 1;
    while (i < input.length) {
      const c = input[i];
      if (c === "\\") i += 2;
      else if (c === '"') return i + 1;
      else i++;
    }
    return i;
  }
  function stripFences(input) {
    const blocks = [];
    let i = 0;
    while (i < input.length) {
      let fenceStart = -1;
      while (i < input.length) {
        const nextI = skipString(input, i);
        if (nextI > i) {
          i = nextI;
          continue;
        }
        if (input[i] === "`" && i + 1 < input.length && input[i + 1] === "`" && i + 2 < input.length && input[i + 2] === "`") {
          fenceStart = i;
          break;
        }
        i++;
      }
      if (fenceStart === -1) break;
      let j = fenceStart + 3;
      while (j < input.length && input[j] !== "\n") j++;
      if (j >= input.length) {
        blocks.push(input.slice(fenceStart + 3).replace(/^[^\n]*\n?/, ""));
        i = input.length;
        break;
      }
      j++;
      let closePos = -1;
      let k = j;
      while (k < input.length) {
        const nextK = skipString(input, k);
        if (nextK > k) {
          k = nextK;
          continue;
        }
        if (input[k] === "`" && k + 1 < input.length && input[k + 1] === "`" && k + 2 < input.length && input[k + 2] === "`") {
          closePos = k;
          break;
        }
        k++;
      }
      if (closePos !== -1) {
        blocks.push(input.slice(j, closePos));
        i = closePos + 3;
      } else {
        blocks.push(input.slice(j));
        i = input.length;
      }
    }
    if (blocks.length > 0) return blocks.join("\n");
    if (input.startsWith("```")) {
      let j = 3;
      while (j < input.length && input[j] !== "\n") j++;
      const start = j < input.length ? j + 1 : 3;
      const body = input.slice(start);
      const trailingFence = body.lastIndexOf("```");
      if (trailingFence !== -1) return body.slice(0, trailingFence);
      return body;
    }
    return input;
  }
  function stripComments(input) {
    let inStr = false;
    return input.split("\n").map((line) => {
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inStr) {
          if (c === "\\" && i + 1 < line.length) {
            i++;
            continue;
          }
          if (c === inStr) inStr = false;
          continue;
        }
        if (c === '"' || c === "'") {
          inStr = c;
          continue;
        }
        if (c === "/" && line[i + 1] === "/") return line.substring(0, i).trimEnd();
        if (c === "#") return line.substring(0, i).trimEnd();
      }
      return line;
    }).join("\n");
  }
  function preprocess(input) {
    return stripComments(stripFences(input.trim())).trim();
  }
  function parse2(input, cat, rootName) {
    const trimmed = preprocess(input);
    if (!trimmed) return emptyResult();
    const { text, wasIncomplete } = autoClose(trimmed);
    const stmts = split(tokenize(text));
    if (!stmts.length) return emptyResult(wasIncomplete);
    const stmtMap = /* @__PURE__ */ new Map();
    let firstId = "";
    for (const s of stmts) {
      const stmt = classifyStatement(s, parseExpression(s.tokens));
      stmtMap.set(s.id, stmt);
      if (!firstId) firstId = s.id;
    }
    return buildResult(stmtMap, [...stmtMap.values()], firstId, wasIncomplete, stmtMap.size, cat, rootName);
  }
  function createStreamParser(cat, rootName) {
    let buf = "";
    let cleaned = "";
    let completedEnd = 0;
    const completedStmtMap = /* @__PURE__ */ new Map();
    let completedCount = 0;
    let firstId = "";
    function addStmt(text) {
      const t = text.trim();
      if (!t) return;
      for (const s of split(tokenize(t))) {
        const stmt = classifyStatement(s, parseExpression(s.tokens));
        completedStmtMap.set(s.id, stmt);
        completedCount++;
        if (!firstId) firstId = s.id;
      }
    }
    function refreshCleaned() {
      const next = preprocess(buf);
      if (!next.startsWith(cleaned.slice(0, completedEnd))) {
        completedEnd = 0;
        completedStmtMap.clear();
        completedCount = 0;
        firstId = "";
      }
      cleaned = next;
    }
    function scanNewCompleted() {
      let depth = 0, ternaryDepth = 0, inStr = false, esc = false;
      let stmtStart = completedEnd;
      for (let i = completedEnd; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (esc) {
          esc = false;
          continue;
        }
        if (c === "\\" && inStr) {
          esc = true;
          continue;
        }
        if (inStr) {
          if (c === inStr) inStr = false;
          continue;
        }
        if (c === '"' || c === "'") {
          inStr = c;
          continue;
        }
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
        else if (c === "?" && depth === 0) ternaryDepth++;
        else if (c === ":" && depth === 0 && ternaryDepth > 0) ternaryDepth--;
        else if (c === "\n" && depth <= 0 && ternaryDepth <= 0) {
          let peek = i + 1;
          while (peek < cleaned.length && (cleaned[peek] === " " || cleaned[peek] === "	" || cleaned[peek] === "\r" || cleaned[peek] === "\n")) peek++;
          if (peek < cleaned.length && (cleaned[peek] === "?" || cleaned[peek] === ":" && ternaryDepth > 0)) continue;
          const t = cleaned.slice(stmtStart, i).trim();
          if (t) addStmt(t);
          stmtStart = i + 1;
          completedEnd = i + 1;
        }
      }
      return stmtStart;
    }
    function currentResult() {
      refreshCleaned();
      const pendingStart = scanNewCompleted();
      const pendingText = cleaned.slice(pendingStart).trim();
      if (!pendingText) {
        if (completedCount === 0) return emptyResult();
        return buildResult(completedStmtMap, [...completedStmtMap.values()], firstId, false, completedCount, cat, rootName);
      }
      const { text: closed, wasIncomplete } = autoClose(pendingText);
      const stmts = split(tokenize(closed));
      if (!stmts.length) {
        if (completedCount === 0) return emptyResult(wasIncomplete);
        return buildResult(completedStmtMap, [...completedStmtMap.values()], firstId, wasIncomplete, completedCount, cat, rootName);
      }
      const allStmtMap = new Map(completedStmtMap);
      for (const s of stmts) {
        if (completedStmtMap.has(s.id)) continue;
        const stmt = classifyStatement(s, parseExpression(s.tokens));
        allStmtMap.set(s.id, stmt);
      }
      return buildResult(allStmtMap, [...allStmtMap.values()], firstId || stmts[0].id, wasIncomplete, completedCount + stmts.length, cat, rootName);
    }
    function reset() {
      buf = "";
      cleaned = "";
      completedEnd = 0;
      completedStmtMap.clear();
      completedCount = 0;
      firstId = "";
    }
    return {
      push(chunk) {
        buf += chunk;
        return currentResult();
      },
      set(fullText) {
        if (fullText.length < buf.length || !fullText.startsWith(buf)) reset();
        const delta = fullText.slice(buf.length);
        if (delta) buf += delta;
        return currentResult();
      },
      getResult: currentResult
    };
  }
  function getSchemaDefaultValue(property) {
    if (!property || typeof property !== "object" || Array.isArray(property)) return;
    return property.default;
  }
  function compileSchema(schema) {
    const map = /* @__PURE__ */ new Map();
    const defs = schema.$defs ?? {};
    for (const [name, def] of Object.entries(defs)) {
      const properties = def.properties ?? {};
      const required = def.required ?? [];
      const params = Object.keys(properties).map((key) => ({
        name: key,
        required: required.includes(key),
        defaultValue: getSchemaDefaultValue(properties[key])
      }));
      map.set(name, { params });
    }
    return map;
  }
  function createStreamingParser(schema, rootName) {
    return createStreamParser(compileSchema(schema), rootName);
  }

  // docs/design-explorations/nightboard/.openui-entry.mjs
  window.OpenUILang = { createStreamingParser, parse: parse2 };
})();
