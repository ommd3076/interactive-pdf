/**
 * Safe recursive-descent evaluator for deterministic IF/THEN rules & math expressions.
 * Zero eval() or new Function().
 */

type TokenType =
  | "NUM"
  | "BOOL"
  | "STR"
  | "IDENT"
  | "OP"
  | "CMP"
  | "LOGIC"
  | "LPAREN"
  | "RPAREN";

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expr: string): Token[] {
  let clean = expr.trim();
  const ifMatch = clean.match(/^IF\s+(.+?)\s+THEN\s+/i);
  if (ifMatch) {
    clean = ifMatch[1];
  }

  const tokens: Token[] = [];
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = "";
      while (i < clean.length && clean[i] !== quote) {
        str += clean[i++];
      }
      if (clean[i] === quote) i++;
      tokens.push({ type: "STR", value: str });
      continue;
    }
    const twoChar = clean.slice(i, i + 2);
    if (twoChar === "&&" || twoChar === "||") {
      tokens.push({ type: "LOGIC", value: twoChar });
      i += 2;
      continue;
    }
    if ([">=", "<=", "==", "!="].includes(twoChar)) {
      tokens.push({ type: "CMP", value: twoChar });
      i += 2;
      continue;
    }
    if (ch === ">" || ch === "<") {
      tokens.push({ type: "CMP", value: ch });
      i++;
      continue;
    }
    if (ch === "!") {
      tokens.push({ type: "LOGIC", value: "NOT" });
      i++;
      continue;
    }
    if (["+", "-", "*", "/"].includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < clean.length && /[0-9.]/.test(clean[i])) {
        num += clean[i++];
      }
      tokens.push({ type: "NUM", value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < clean.length && /[a-zA-Z0-9_.]/.test(clean[i])) {
        ident += clean[i++];
      }
      const upper = ident.toUpperCase();
      if (upper === "AND") tokens.push({ type: "LOGIC", value: "&&" });
      else if (upper === "OR") tokens.push({ type: "LOGIC", value: "||" });
      else if (upper === "NOT") tokens.push({ type: "LOGIC", value: "NOT" });
      else if (upper === "TRUE") tokens.push({ type: "BOOL", value: "true" });
      else if (upper === "FALSE") tokens.push({ type: "BOOL", value: "false" });
      else tokens.push({ type: "IDENT", value: ident });
      continue;
    }
    i++;
  }
  return tokens;
}

export type RuleVariableValue = number | string | boolean;

export function evaluateRuleCondition(
  expression: string,
  variables: Record<string, RuleVariableValue>
): { matched: boolean; error?: string } {
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return { matched: false };
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parseOr = (): RuleVariableValue => {
      let left = parseAnd();
      while (peek()?.type === "LOGIC" && peek()?.value === "||") {
        consume();
        const right = parseAnd();
        left = Boolean(left) || Boolean(right);
      }
      return left;
    };

    const parseAnd = (): RuleVariableValue => {
      let left = parseNot();
      while (peek()?.type === "LOGIC" && peek()?.value === "&&") {
        consume();
        const right = parseNot();
        left = Boolean(left) && Boolean(right);
      }
      return left;
    };

    const parseNot = (): RuleVariableValue => {
      if (peek()?.type === "LOGIC" && peek()?.value === "NOT") {
        consume();
        return !Boolean(parseNot());
      }
      return parseComparison();
    };

    const parseComparison = (): RuleVariableValue => {
      const left = parseAddSub();
      if (peek()?.type === "CMP") {
        const op = consume().value;
        const right = parseAddSub();
        if (
          typeof left === "string" ||
          typeof right === "string" ||
          typeof left === "boolean" ||
          typeof right === "boolean"
        ) {
          const ls = String(left).toLowerCase();
          const rs = String(right).toLowerCase();
          if (op === "==") return ls === rs;
          if (op === "!=") return ls !== rs;
        }
        const l = Number(left);
        const r = Number(right);
        switch (op) {
          case ">":
            return l > r;
          case "<":
            return l < r;
          case ">=":
            return l >= r;
          case "<=":
            return l <= r;
          case "==":
            return Math.abs(l - r) < 1e-9;
          case "!=":
            return Math.abs(l - r) >= 1e-9;
        }
      }
      return left;
    };

    const parseAddSub = (): RuleVariableValue => {
      const first = parseMulDiv();
      if (
        peek()?.type === "OP" &&
        (peek()?.value === "+" || peek()?.value === "-")
      ) {
        let left = Number(first);
        while (
          peek()?.type === "OP" &&
          (peek()?.value === "+" || peek()?.value === "-")
        ) {
          const op = consume().value;
          const right = Number(parseMulDiv());
          left = op === "+" ? left + right : left - right;
        }
        return left;
      }
      return first;
    };

    const parseMulDiv = (): RuleVariableValue => {
      const first = parsePrimary();
      if (
        peek()?.type === "OP" &&
        (peek()?.value === "*" || peek()?.value === "/")
      ) {
        let left = Number(first);
        while (
          peek()?.type === "OP" &&
          (peek()?.value === "*" || peek()?.value === "/")
        ) {
          const op = consume().value;
          const right = Number(parsePrimary());
          left = op === "*" ? left * right : right === 0 ? 0 : left / right;
        }
        return left;
      }
      return first;
    };

    const parsePrimary = (): RuleVariableValue => {
      const tok = peek();
      if (!tok) return 0;
      if (tok.type === "OP" && tok.value === "-") {
        consume();
        return -Number(parsePrimary());
      }
      if (tok.type === "LPAREN") {
        consume();
        const val = parseOr();
        if (peek()?.type === "RPAREN") consume();
        return val;
      }
      if (tok.type === "NUM") {
        consume();
        return parseFloat(tok.value);
      }
      if (tok.type === "BOOL") {
        consume();
        return tok.value === "true";
      }
      if (tok.type === "STR") {
        consume();
        return tok.value;
      }
      if (tok.type === "IDENT") {
        consume();
        if (tok.value in variables) return variables[tok.value];
        const lowerKey = Object.keys(variables).find(
          (k) => k.toLowerCase() === tok.value.toLowerCase()
        );
        return lowerKey ? variables[lowerKey] : 0;
      }
      consume();
      return 0;
    };

    const result = parseOr();
    return { matched: Boolean(result) };
  } catch (err) {
    return {
      matched: false,
      error: err instanceof Error ? err.message : "Parse error",
    };
  }
}
