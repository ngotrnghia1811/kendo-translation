/** Retain Python's distinction between JSON 1 and 1.0 for whole-number fields. */
export class JsonFloat {
  value: number;
  constructor(value: number) { this.value = value; }
  toString() { return pythonJson(this); }
}
/** Python integers have no JavaScript safe-integer ceiling. */
export class JsonInteger {
  value: bigint;
  constructor(value: string | bigint) { this.value = BigInt(value); }
  toString() { return this.value.toString(); }
}
export function incrementInteger(v: unknown): number | JsonInteger {
  const n = (v instanceof JsonInteger ? v.value : BigInt(Number(v ?? 0))) + BigInt(1);
  return n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : new JsonInteger(n);
}

export function pythonJson(value: unknown, ascii = false): string {
  if (value instanceof JsonFloat) {
    if (!Number.isFinite(value.value)) return String(value.value);
    if (Object.is(value.value, -0)) return "-0.0";
    const abs = Math.abs(value.value);
    let s = abs >= 1e16 || (abs > 0 && abs < 1e-4) ? value.value.toExponential() : String(value.value);
    if (!s.includes(".") && !s.includes("e")) s += ".0";
    return s.replace(/e([+-])(\d)$/, (_, sign, digit) => `e${sign}0${digit}`);
  }
  if (value instanceof JsonInteger) return value.toString();
  if (Array.isArray(value)) return "[" + value.map((v) => pythonJson(v, ascii)).join(", ") + "]";
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).map(([k, v]) => pythonJson(k, ascii) + ": " + pythonJson(v, ascii)).join(", ") + "}";
  const s = JSON.stringify(value);
  return ascii ? s.replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")) : s;
}

/** Exact numeric tokens and JSONDecodeError text follow Python's JSON reader. */
export function parseSettingsJson(text: string): unknown {
  let i = 0;
  const ws = () => { while (/[ \t\r\n]/.test(text[i] ?? "\u0000")) i++; };
  function fail(message: string, pos = i): never {
    const before = text.slice(0, pos);
    const line = before.split("\n").length;
    const column = Array.from(before.slice(before.lastIndexOf("\n") + 1)).length + 1;
    throw new SyntaxError(`${message}: line ${line} column ${column} (char ${Array.from(before).length})`);
  }
  function string(): string {
    const start = i++;
    while (i < text.length) {
      const c = text[i++];
      if (c === '"') return JSON.parse(text.slice(start, i));
      if (c.charCodeAt(0) < 32) fail("Invalid control character at", i - 1);
      if (c === "\\") {
        const escape = i;
        if (i === text.length) fail("Unterminated string starting at", start);
        const e = text[i++];
        if (e === "u") { if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i, i + 4))) fail("Invalid \\uXXXX escape", escape); i += 4; }
        else if (!'"\\/bfnrt'.includes(e)) fail("Invalid \\escape", escape - 1);
      }
    }
    return fail("Unterminated string starting at", start);
  }
  function walk(): unknown {
    ws();
    if (text[i] === '"') return string();
    if (text[i] === "{") {
      i++; ws();
      const out: Record<string, unknown> = Object.create(null);
      // Python preserves the input order of integer-like object keys too.
      const keys: string[] = [];
      const ordered = new Proxy(out, { ownKeys: () => keys });
      if (text[i] === "}") { i++; return ordered; }
      while (true) {
        if (text[i] !== '"') fail("Expecting property name enclosed in double quotes");
        const key = string(); ws();
        if (text[i++] !== ":") fail("Expecting ':' delimiter", i - 1);
        if (!Object.hasOwn(out, key)) keys.push(key);
        out[key] = walk();
        ws();
        if (text[i] === "}") { i++; return ordered; }
        if (text[i++] !== ",") fail("Expecting ',' delimiter", i - 1);
        const comma = i - 1;
        ws();
        if (text[i] === "}") fail("Illegal trailing comma before end of object", comma);
      }
    }
    if (text[i] === "[") {
      i++; ws();
      const out: unknown[] = [];
      if (text[i] === "]") { i++; return out; }
      while (true) {
        out.push(walk()); ws();
        if (text[i] === "]") { i++; return out; }
        if (text[i++] !== ",") fail("Expecting ',' delimiter", i - 1);
        const comma = i - 1;
        ws();
        if (text[i] === "]") fail("Illegal trailing comma before end of array", comma);
      }
    }
    for (const [token, v] of [["true", true], ["false", false], ["null", null], ["NaN", new JsonFloat(NaN)], ["Infinity", new JsonFloat(Infinity)], ["-Infinity", new JsonFloat(-Infinity)]] as const) {
      if (text.startsWith(token, i)) { i += token.length; return v; }
    }
    const token = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i))?.[0];
    if (!token) return fail("Expecting value");
    i += token.length;
    if (/[.eE]/.test(token)) return new JsonFloat(Number(token));
    const n = Number(token);
    return Number.isSafeInteger(n) ? n : new JsonInteger(token);
  }
  const value = walk(); ws();
  if (i !== text.length) fail("Extra data");
  return value;
}

/** One serializer serves the HTTP boundary, history and whole-file replacement. */
export function stringifySettingsJson(value: unknown, indent = 0): string {
  function walk(v: unknown, depth: number): string {
    if (v === null || typeof v !== "object" || v instanceof JsonFloat || v instanceof JsonInteger) return pythonJson(v);
    const array = Array.isArray(v);
    const entries = array ? v.map((item) => walk(item, depth + 1)) : Object.entries(v).map(([key, item]) => JSON.stringify(key) + (indent ? ": " : ":") + walk(item, depth + 1));
    if (!entries.length) return array ? "[]" : "{}";
    const pad = " ".repeat(indent * (depth + 1));
    return (array ? "[" : "{") + (indent ? "\n" + pad : "") + entries.join(indent ? ",\n" + pad : ",") + (indent ? "\n" + " ".repeat(indent * depth) : "") + (array ? "]" : "}");
  }
  return walk(value, 0);
}
