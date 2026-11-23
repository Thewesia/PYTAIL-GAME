import { ConsoleLine, LevelDef, VariableEntry, WorldState } from '../types/game';
import {
  ActionOutcome,
  checkWinCondition,
  createInitialWorld,
  performCollect,
  performMove,
  performTurn,
  performWait,
  sensorGemHere,
  sensorHazardAhead,
  sensorSwitchHere,
  sensorWallInRelDir,
} from './worldSim';

// --- Python Error Class ---
export class PyError extends Error {
  public line: number;
  public errType: string;

  constructor(errType: string, message: string, line: number) {
    super(message);
    this.errType = errType;
    this.line = line;
  }
}

// --- Tokenizer ---
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENT'
  | 'KEYWORD'
  | 'OP'
  | 'PUNC'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  line: number;
}

const KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'break',
  'continue',
  'def',
  'elif',
  'else',
  'for',
  'if',
  'in',
  'not',
  'or',
  'pass',
  'return',
  'while',
]);

const TWO_CHAR_OPS = new Set([
  '==',
  '!=',
  '<=',
  '>=',
  '+=',
  '-=',
  '*=',
  '/=',
  '//',
  '%=',
  '**',
]);

function tokenize(source: string): Token[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const tokens: Token[] = [];
  const indentStack: number[] = [0];
  let parenDepth = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const raw = lines[lineIdx];

    // Check blank or comment-only lines
    let firstNonSpace = 0;
    let indentCols = 0;
    while (firstNonSpace < raw.length) {
      const ch = raw[firstNonSpace];
      if (ch === ' ') {
        indentCols += 1;
        firstNonSpace += 1;
      } else if (ch === '\t') {
        indentCols += 4;
        firstNonSpace += 1;
      } else {
        break;
      }
    }

    if (firstNonSpace >= raw.length || raw[firstNonSpace] === '#') {
      continue;
    }

    if (parenDepth === 0) {
      const topIndent = indentStack[indentStack.length - 1];
      if (indentCols > topIndent) {
        indentStack.push(indentCols);
        tokens.push({ type: 'INDENT', value: '', line: lineNum });
      } else if (indentCols < topIndent) {
        while (
          indentStack.length > 1 &&
          indentStack[indentStack.length - 1] > indentCols
        ) {
          indentStack.pop();
          tokens.push({ type: 'DEDENT', value: '', line: lineNum });
        }
        if (indentStack[indentStack.length - 1] !== indentCols) {
          throw new PyError(
            'IndentationError',
            'unindent does not match any outer indentation level',
            lineNum
          );
        }
      }
    }

    let i = firstNonSpace;
    while (i < raw.length) {
      const ch = raw[i];
      if (ch === ' ' || ch === '\t') {
        i++;
        continue;
      }
      if (ch === '#') {
        break;
      }
      // Strings
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = '';
        i++;
        let closed = false;
        while (i < raw.length) {
          const c = raw[i];
          if (c === '\\' && i + 1 < raw.length) {
            const nxt = raw[i + 1];
            if (nxt === 'n') str += '\n';
            else if (nxt === 't') str += '\t';
            else str += nxt;
            i += 2;
            continue;
          }
          if (c === quote) {
            closed = true;
            i++;
            break;
          }
          str += c;
          i++;
        }
        if (!closed) {
          throw new PyError('SyntaxError', 'unterminated string literal', lineNum);
        }
        tokens.push({ type: 'STRING', value: str, line: lineNum });
        continue;
      }
      // Numbers
      if (/[0-9]/.test(ch)) {
        let num = '';
        let hasDot = false;
        while (i < raw.length && (/[0-9]/.test(raw[i]) || (raw[i] === '.' && !hasDot))) {
          if (raw[i] === '.') hasDot = true;
          num += raw[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: num, line: lineNum });
        continue;
      }
      // Identifiers & keywords
      if (/[A-Za-z_]/.test(ch)) {
        let id = '';
        while (i < raw.length && /[A-Za-z0-9_]/.test(raw[i])) {
          id += raw[i];
          i++;
        }
        tokens.push({
          type: KEYWORDS.has(id) ? 'KEYWORD' : 'IDENT',
          value: id,
          line: lineNum,
        });
        continue;
      }
      // Two-char operators
      const two = raw.slice(i, i + 2);
      if (TWO_CHAR_OPS.has(two)) {
        if (two === '//' && raw[i + 2] === '=') {
          tokens.push({ type: 'OP', value: '//=', line: lineNum });
          i += 3;
          continue;
        }
        tokens.push({ type: 'OP', value: two, line: lineNum });
        i += 2;
        continue;
      }
      // Brackets
      if ('([{'.includes(ch)) {
        parenDepth++;
        tokens.push({ type: 'PUNC', value: ch, line: lineNum });
        i++;
        continue;
      }
      if (')]}'.includes(ch)) {
        parenDepth = Math.max(0, parenDepth - 1);
        tokens.push({ type: 'PUNC', value: ch, line: lineNum });
        i++;
        continue;
      }
      if (',:.;'.includes(ch)) {
        tokens.push({ type: 'PUNC', value: ch, line: lineNum });
        i++;
        continue;
      }
      if ('+-*/%<>=!'.includes(ch)) {
        tokens.push({ type: 'OP', value: ch, line: lineNum });
        i++;
        continue;
      }
      throw new PyError('SyntaxError', `unexpected character '${ch}'`, lineNum);
    }

    if (parenDepth === 0) {
      tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum });
    }
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: 'DEDENT', value: '', line: lines.length });
  }
  tokens.push({ type: 'EOF', value: '', line: lines.length });
  return tokens;
}

// --- AST Nodes ---
type Expr =
  | { kind: 'lit'; value: PyVal; line: number }
  | { kind: 'var'; name: string; line: number }
  | { kind: 'list'; items: Expr[]; line: number }
  | { kind: 'dict'; entries: { key: Expr; val: Expr }[]; line: number }
  | { kind: 'unary'; op: string; arg: Expr; line: number }
  | { kind: 'bin'; op: string; left: Expr; right: Expr; line: number }
  | { kind: 'compare'; left: Expr; ops: { op: string; right: Expr }[]; line: number }
  | { kind: 'ternary'; cond: Expr; whenTrue: Expr; whenFalse: Expr; line: number }
  | { kind: 'call'; callee: Expr; args: Expr[]; line: number }
  | { kind: 'index'; target: Expr; index: Expr; line: number }
  | { kind: 'attr'; target: Expr; attr: string; line: number };

type Stmt =
  | { kind: 'expr'; expr: Expr; line: number }
  | { kind: 'assign'; target: Expr; op: string; value: Expr; line: number }
  | { kind: 'if'; branches: { cond: Expr | null; body: Stmt[]; line: number }[]; line: number }
  | { kind: 'for'; target: string; iter: Expr; body: Stmt[]; line: number }
  | { kind: 'while'; cond: Expr; body: Stmt[]; line: number }
  | { kind: 'def'; name: string; params: string[]; body: Stmt[]; line: number }
  | { kind: 'return'; value: Expr | null; line: number }
  | { kind: 'break'; line: number }
  | { kind: 'continue'; line: number }
  | { kind: 'pass'; line: number };

// --- Parser ---
class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const t = this.peek();
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
  }

  private match(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    this.advance();
    return true;
  }

  private expect(type: TokenType, value?: string, msg?: string): Token {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new PyError(
        'SyntaxError',
        msg || `expected ${value ?? type}, got '${t.value || t.type}'`,
        t.line
      );
    }
    return this.advance();
  }

  public parseProgram(): Stmt[] {
    const body: Stmt[] = [];
    while (this.peek().type !== 'EOF') {
      if (this.match('NEWLINE')) continue;
      body.push(this.parseStmt());
    }
    return body;
  }

  private parseBlock(line: number): Stmt[] {
    this.expect('PUNC', ':', "expected ':' before block");
    if (this.peek().type !== 'NEWLINE') {
      const inlineStmts: Stmt[] = [];
      const inlineLine = this.peek().line;
      while (
        this.peek().type !== 'NEWLINE' &&
        this.peek().type !== 'EOF' &&
        this.peek().type !== 'DEDENT' &&
        this.peek().line === inlineLine
      ) {
        inlineStmts.push(this.parseStmt());
      }
      this.match('NEWLINE');
      return inlineStmts;
    }
    this.expect('NEWLINE', undefined, 'expected newline after :');
    this.expect('INDENT', undefined, 'expected an indented block');
    const stmts: Stmt[] = [];
    while (this.peek().type !== 'DEDENT' && this.peek().type !== 'EOF') {
      if (this.match('NEWLINE')) continue;
      stmts.push(this.parseStmt());
    }
    if (stmts.length === 0) {
      throw new PyError('IndentationError', 'expected an indented block', line + 1);
    }
    this.match('DEDENT');
    return stmts;
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    if (t.type === 'KEYWORD') {
      if (t.value === 'if') return this.parseIf();
      if (t.value === 'for') return this.parseFor();
      if (t.value === 'while') return this.parseWhile();
      if (t.value === 'def') return this.parseDef();
      if (t.value === 'return') {
        this.advance();
        if (this.peek().type === 'NEWLINE' || this.peek().type === 'EOF') {
          this.match('NEWLINE');
          return { kind: 'return', value: null, line: t.line };
        }
        const val = this.parseExpr();
        this.consumeLineEnd();
        return { kind: 'return', value: val, line: t.line };
      }
      if (t.value === 'break') {
        this.advance();
        this.consumeLineEnd();
        return { kind: 'break', line: t.line };
      }
      if (t.value === 'continue') {
        this.advance();
        this.consumeLineEnd();
        return { kind: 'continue', line: t.line };
      }
      if (t.value === 'pass') {
        this.advance();
        this.consumeLineEnd();
        return { kind: 'pass', line: t.line };
      }
    }

    const expr = this.parseExpr();
    const next = this.peek();
    if (
      next.type === 'OP' &&
      ['=', '+=', '-=', '*=', '/=', '//=', '%='].includes(next.value)
    ) {
      const op = this.advance().value;
      const val = this.parseExpr();
      this.consumeLineEnd();
      return { kind: 'assign', target: expr, op, value: val, line: t.line };
    }
    this.consumeLineEnd();
    return { kind: 'expr', expr, line: t.line };
  }

  private consumeLineEnd() {
    if (this.peek().type === 'EOF' || this.peek().type === 'DEDENT') return;
    if (this.match('NEWLINE')) return;
    if (this.match('PUNC', ';')) return;
    const t = this.peek();
    throw new PyError(
      'SyntaxError',
      `unexpected token '${t.value}'`,
      t.line
    );
  }

  private parseIf(): Stmt {
    const start = this.expect('KEYWORD', 'if');
    const branches: { cond: Expr | null; body: Stmt[]; line: number }[] = [];
    const cond = this.parseExpr();
    const body = this.parseBlock(start.line);
    branches.push({ cond, body, line: start.line });

    while (this.peek().type === 'KEYWORD' && this.peek().value === 'elif') {
      const elifTok = this.advance();
      const c = this.parseExpr();
      const b = this.parseBlock(elifTok.line);
      branches.push({ cond: c, body: b, line: elifTok.line });
    }

    if (this.peek().type === 'KEYWORD' && this.peek().value === 'else') {
      const elseTok = this.advance();
      const b = this.parseBlock(elseTok.line);
      branches.push({ cond: null, body: b, line: elseTok.line });
    }

    return { kind: 'if', branches, line: start.line };
  }

  private parseFor(): Stmt {
    const start = this.expect('KEYWORD', 'for');
    const target = this.expect(
      'IDENT',
      undefined,
      'expected loop variable name after for'
    ).value;
    this.expect('KEYWORD', 'in', "expected 'in' in for loop");
    const iter = this.parseExpr();
    const body = this.parseBlock(start.line);
    return { kind: 'for', target, iter, body, line: start.line };
  }

  private parseWhile(): Stmt {
    const start = this.expect('KEYWORD', 'while');
    const cond = this.parseExpr();
    const body = this.parseBlock(start.line);
    return { kind: 'while', cond, body, line: start.line };
  }

  private parseDef(): Stmt {
    const start = this.expect('KEYWORD', 'def');
    const name = this.expect('IDENT', undefined, 'expected function name').value;
    this.expect('PUNC', '(', "expected '(' after function name");
    const params: string[] = [];
    while (!(this.peek().type === 'PUNC' && this.peek().value === ')')) {
      const param = this.expect('IDENT', undefined, 'expected parameter name').value;
      params.push(param);
      if (!this.match('PUNC', ',')) break;
    }
    this.expect('PUNC', ')', "expected ')' after parameters");
    const body = this.parseBlock(start.line);
    return { kind: 'def', name, params, body, line: start.line };
  }

  private parseExpr(): Expr {
    const base = this.parseOr();
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'if') {
      const t = this.advance();
      const cond = this.parseOr();
      this.expect('KEYWORD', 'else', "expected 'else' in conditional expression");
      const whenFalse = this.parseExpr();
      return { kind: 'ternary', cond, whenTrue: base, whenFalse, line: t.line };
    }
    return base;
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.peek().type === 'KEYWORD' && this.peek().value === 'or') {
      const t = this.advance();
      const right = this.parseAnd();
      left = { kind: 'bin', op: 'or', left, right, line: t.line };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.peek().type === 'KEYWORD' && this.peek().value === 'and') {
      const t = this.advance();
      const right = this.parseNot();
      left = { kind: 'bin', op: 'and', left, right, line: t.line };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.peek().type === 'KEYWORD' && this.peek().value === 'not') {
      const t = this.advance();
      return { kind: 'unary', op: 'not', arg: this.parseNot(), line: t.line };
    }
    return this.parseCompare();
  }

  private parseCompare(): Expr {
    const left = this.parseAdd();
    const ops: { op: string; right: Expr }[] = [];

    while (true) {
      const t = this.peek();
      if (
        t.type === 'OP' &&
        ['==', '!=', '<', '<=', '>', '>='].includes(t.value)
      ) {
        this.advance();
        ops.push({ op: t.value, right: this.parseAdd() });
      } else if (t.type === 'KEYWORD' && t.value === 'in') {
        this.advance();
        ops.push({ op: 'in', right: this.parseAdd() });
      } else if (
        t.type === 'KEYWORD' &&
        t.value === 'not' &&
        this.peek(1).type === 'KEYWORD' &&
        this.peek(1).value === 'in'
      ) {
        this.advance();
        this.advance();
        ops.push({ op: 'not in', right: this.parseAdd() });
      } else {
        break;
      }
    }

    if (ops.length === 0) return left;
    return { kind: 'compare', left, ops, line: left.line };
  }

  private parseAdd(): Expr {
    let left = this.parseMul();
    while (
      this.peek().type === 'OP' &&
      (this.peek().value === '+' || this.peek().value === '-')
    ) {
      const t = this.advance();
      left = {
        kind: 'bin',
        op: t.value,
        left,
        right: this.parseMul(),
        line: t.line,
      };
    }
    return left;
  }

  private parseMul(): Expr {
    let left = this.parseUnary();
    while (
      this.peek().type === 'OP' &&
      ['*', '/', '//', '%'].includes(this.peek().value)
    ) {
      const t = this.advance();
      left = {
        kind: 'bin',
        op: t.value,
        left,
        right: this.parseUnary(),
        line: t.line,
      };
    }
    return left;
  }

  private parseUnary(): Expr {
    const t = this.peek();
    if (t.type === 'OP' && (t.value === '-' || t.value === '+')) {
      this.advance();
      return { kind: 'unary', op: t.value, arg: this.parseUnary(), line: t.line };
    }
    return this.parsePower();
  }

  private parsePower(): Expr {
    let left = this.parsePostfix();
    if (this.peek().type === 'OP' && this.peek().value === '**') {
      const t = this.advance();
      return { kind: 'bin', op: '**', left, right: this.parseUnary(), line: t.line };
    }
    return left;
  }

  private parsePostfix(): Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match('PUNC', '(')) {
        const args: Expr[] = [];
        while (!(this.peek().type === 'PUNC' && this.peek().value === ')')) {
          args.push(this.parseExpr());
          if (!this.match('PUNC', ',')) break;
        }
        this.expect('PUNC', ')', "expected ')' after arguments");
        expr = { kind: 'call', callee: expr, args, line: expr.line };
      } else if (this.match('PUNC', '[')) {
        const index = this.parseExpr();
        this.expect('PUNC', ']', "expected ']'");
        expr = { kind: 'index', target: expr, index, line: expr.line };
      } else if (this.match('PUNC', '.')) {
        const attr = this.expect('IDENT', undefined, 'expected attribute name').value;
        expr = { kind: 'attr', target: expr, attr, line: expr.line };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.type === 'NUMBER') {
      this.advance();
      return { kind: 'lit', value: Number(t.value), line: t.line };
    }
    if (t.type === 'STRING') {
      this.advance();
      return { kind: 'lit', value: t.value, line: t.line };
    }
    if (t.type === 'KEYWORD') {
      if (t.value === 'True') {
        this.advance();
        return { kind: 'lit', value: true, line: t.line };
      }
      if (t.value === 'False') {
        this.advance();
        return { kind: 'lit', value: false, line: t.line };
      }
      if (t.value === 'None') {
        this.advance();
        return { kind: 'lit', value: null, line: t.line };
      }
    }
    if (t.type === 'IDENT') {
      this.advance();
      return { kind: 'var', name: t.value, line: t.line };
    }
    if (this.match('PUNC', '(')) {
      const e = this.parseExpr();
      this.expect('PUNC', ')', "expected ')'");
      return e;
    }
    if (this.match('PUNC', '[')) {
      const items: Expr[] = [];
      while (!(this.peek().type === 'PUNC' && this.peek().value === ']')) {
        items.push(this.parseExpr());
        if (!this.match('PUNC', ',')) break;
      }
      this.expect('PUNC', ']', "expected ']'");
      return { kind: 'list', items, line: t.line };
    }
    if (this.match('PUNC', '{')) {
      const entries: { key: Expr; val: Expr }[] = [];
      while (!(this.peek().type === 'PUNC' && this.peek().value === '}')) {
        const key = this.parseExpr();
        this.expect('PUNC', ':', "expected ':' in dictionary");
        const val = this.parseExpr();
        entries.push({ key, val });
        if (!this.match('PUNC', ',')) break;
      }
      this.expect('PUNC', '}', "expected '}'");
      return { kind: 'dict', entries, line: t.line };
    }

    throw new PyError(
      'SyntaxError',
      `unexpected '${t.value || t.type}' in expression`,
      t.line
    );
  }
}

// --- Runtime Values & Interpreter ---
type PyVal =
  | number
  | string
  | boolean
  | null
  | PyVal[]
  | PyDict
  | PyFunction
  | PyMethod;

interface PyDict {
  __dict: true;
  map: Map<string, PyVal>;
}

interface PyFunction {
  __fn: true;
  name: string;
  params: string[];
  body: Stmt[];
  builtin?: (args: PyVal[], line: number) => Generator<StepSignal, PyVal, void>;
}

interface PyMethod {
  __method: true;
  target: PyVal;
  name: string;
}

function isDict(v: PyVal): v is PyDict {
  return typeof v === 'object' && v !== null && '__dict' in v;
}
function isFunc(v: PyVal): v is PyFunction {
  return typeof v === 'object' && v !== null && '__fn' in v;
}
function isMethod(v: PyVal): v is PyMethod {
  return typeof v === 'object' && v !== null && '__method' in v;
}

export function formatPyVal(v: PyVal): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return `[${v.map((x) => (typeof x === 'string' ? `'${x}'` : formatPyVal(x))).join(', ')}]`;
  }
  if (isDict(v)) {
    const pairs: string[] = [];
    v.map.forEach((val, k) => {
      pairs.push(`'${k}': ${typeof val === 'string' ? `'${val}'` : formatPyVal(val)}`);
    });
    return `{${pairs.join(', ')}}`;
  }
  if (isFunc(v)) return `<function ${v.name}>`;
  return String(v);
}

function typeName(v: PyVal): string {
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (Array.isArray(v)) return 'list';
  if (isDict(v)) return 'dict';
  if (isFunc(v)) return 'function';
  return 'object';
}

function isTruthy(v: PyVal): boolean {
  if (v === null || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (isDict(v) && v.map.size === 0) return false;
  return true;
}

type SignalControl =
  | { type: 'return'; value: PyVal }
  | { type: 'break' }
  | { type: 'continue' }
  | null;

export interface StepSnapshot {
  world: WorldState;
  activeLine: number;
  variables: VariableEntry[];
  logs: ConsoleLine[];
  event?: ActionOutcome['event'];
  won: boolean;
  finished: boolean;
  error?: { errType: string; message: string; line: number };
}

interface StepSignal {
  line: number;
  event?: ActionOutcome['event'];
}

export function* createPythonRunner(
  code: string,
  level: LevelDef
): Generator<StepSnapshot, void, void> {
  let world = createInitialWorld(level);
  const logs: ConsoleLine[] = [];
  let logSeq = 1;
  let stepBudget = 0;
  const MAX_STEPS = 700;

  const pushLog = (
    kind: ConsoleLine['kind'],
    text: string,
    line?: number
  ) => {
    logs.push({ id: `log-${logSeq++}`, kind, text, line });
  };

  const globals = new Map<string, PyVal>();
  const callStack: Map<string, PyVal>[] = [];

  const getVar = (name: string, line: number): PyVal => {
    for (let i = callStack.length - 1; i >= 0; i--) {
      if (callStack[i].has(name)) return callStack[i].get(name)!;
    }
    if (globals.has(name)) return globals.get(name)!;
    throw new PyError('NameError', `name '${name}' is not defined`, line);
  };

  const setVar = (name: string, val: PyVal) => {
    if (callStack.length > 0) {
      callStack[callStack.length - 1].set(name, val);
    } else {
      globals.set(name, val);
    }
  };

  const collectVariables = (): VariableEntry[] => {
    const out: VariableEntry[] = [];
    if (callStack.length > 0) {
      callStack[callStack.length - 1].forEach((val, name) => {
        if (!isFunc(val)) {
          out.push({
            name,
            value: typeof val === 'string' ? `'${val}'` : formatPyVal(val),
            type: typeName(val),
            scope: 'local',
          });
        }
      });
    }
    globals.forEach((val, name) => {
      if (!isFunc(val)) {
        out.push({
          name,
          value: typeof val === 'string' ? `'${val}'` : formatPyVal(val),
          type: typeName(val),
          scope: 'global',
        });
      }
    });
    return out;
  };

  const emitSnapshot = (
    line: number,
    event?: ActionOutcome['event'],
    finished = false
  ): StepSnapshot => ({
    world,
    activeLine: line,
    variables: collectVariables(),
    logs: [...logs],
    event,
    won: checkWinCondition(world, level),
    finished,
  });

  // --- Built-in Rover & Python Functions ---
  const addBuiltin = (
    name: string,
    fn: (args: PyVal[], line: number) => Generator<StepSignal, PyVal, void>
  ) => {
    globals.set(name, {
      __fn: true,
      name,
      params: [],
      body: [],
      builtin: fn,
    });
  };

  addBuiltin('move', function* (args, line) {
    let count = 1;
    if (args.length > 1) {
      throw new PyError('TypeError', 'move() takes 0 or 1 argument', line);
    }
    if (args.length === 1) {
      if (typeof args[0] !== 'number') {
        throw new PyError('TypeError', 'move(steps) expects an integer', line);
      }
      count = Math.max(0, Math.floor(args[0]));
    }
    for (let i = 0; i < count; i++) {
      const outcome = performMove(world, level);
      world = outcome.world;
      if (outcome.message) {
        pushLog(
          world.crashed ? 'error' : 'info',
          outcome.message,
          line
        );
      }
      yield { line, event: outcome.event };
      if (world.crashed) {
        throw new PyError(
          'CollisionError',
          world.crashReason || 'Rover halted due to collision',
          line
        );
      }
    }
    return null;
  });

  addBuiltin('turn_left', function* (args, line) {
    if (args.length !== 0) {
      throw new PyError('TypeError', 'turn_left() takes no arguments', line);
    }
    const outcome = performTurn(world, level, -1);
    world = outcome.world;
    yield { line, event: outcome.event };
    if (world.crashed) {
      throw new PyError('EnergyError', world.crashReason || 'Out of energy', line);
    }
    return null;
  });

  addBuiltin('turn_right', function* (args, line) {
    if (args.length !== 0) {
      throw new PyError('TypeError', 'turn_right() takes no arguments', line);
    }
    const outcome = performTurn(world, level, 1);
    world = outcome.world;
    yield { line, event: outcome.event };
    if (world.crashed) {
      throw new PyError('EnergyError', world.crashReason || 'Out of energy', line);
    }
    return null;
  });

  addBuiltin('collect', function* (args, line) {
    if (args.length !== 0) {
      throw new PyError('TypeError', 'collect() takes no arguments', line);
    }
    const outcome = performCollect(world, level);
    world = outcome.world;
    if (outcome.message) {
      pushLog(outcome.event === 'collect' ? 'success' : 'info', outcome.message, line);
    }
    yield { line, event: outcome.event };
    return null;
  });

  addBuiltin('wait', function* (args, line) {
    let count = 1;
    if (args.length === 1 && typeof args[0] === 'number') {
      count = Math.max(0, Math.floor(args[0]));
    }
    for (let i = 0; i < count; i++) {
      const outcome = performWait(world, level);
      world = outcome.world;
      yield { line, event: outcome.event };
      if (world.crashed) {
        throw new PyError(
          'CollisionError',
          world.crashReason || 'Rover intercepted while waiting',
          line
        );
      }
    }
    return null;
  });

  addBuiltin('wall_ahead', function* () {
    return sensorWallInRelDir(world, level, 0);
  });
  addBuiltin('wall_left', function* () {
    return sensorWallInRelDir(world, level, -1);
  });
  addBuiltin('wall_right', function* () {
    return sensorWallInRelDir(world, level, 1);
  });
  addBuiltin('hazard_ahead', function* () {
    return sensorHazardAhead(world, level);
  });
  addBuiltin('gem_here', function* () {
    return sensorGemHere(world, level);
  });
  addBuiltin('switch_here', function* () {
    return sensorSwitchHere(world, level);
  });
  addBuiltin('at_goal', function* () {
    return world.atGoal;
  });
  addBuiltin('energy_left', function* () {
    return world.energyLeft;
  });

  addBuiltin('print', function* (args, line) {
    pushLog('print', args.map(formatPyVal).join(' '), line);
    yield { line };
    return null;
  });

  addBuiltin('range', function* (args, line) {
    if (args.length < 1 || args.length > 3) {
      throw new PyError('TypeError', 'range() expects 1 to 3 integer arguments', line);
    }
    for (const a of args) {
      if (typeof a !== 'number') {
        throw new PyError('TypeError', 'range() arguments must be integers', line);
      }
    }
    let start = 0;
    let stop = 0;
    let step = 1;
    if (args.length === 1) {
      stop = Math.trunc(args[0] as number);
    } else if (args.length === 2) {
      start = Math.trunc(args[0] as number);
      stop = Math.trunc(args[1] as number);
    } else {
      start = Math.trunc(args[0] as number);
      stop = Math.trunc(args[1] as number);
      step = Math.trunc(args[2] as number);
      if (step === 0) throw new PyError('ValueError', 'range() step must not be zero', line);
    }
    const out: number[] = [];
    if (step > 0) {
      for (let i = start; i < stop && out.length < 500; i += step) out.push(i);
    } else {
      for (let i = start; i > stop && out.length < 500; i += step) out.push(i);
    }
    return out;
  });

  addBuiltin('len', function* (args, line) {
    if (args.length !== 1) throw new PyError('TypeError', 'len() expects 1 argument', line);
    const x = args[0];
    if (Array.isArray(x) || typeof x === 'string') return x.length;
    if (isDict(x)) return x.map.size;
    throw new PyError('TypeError', `object of type '${typeName(x)}' has no len()`, line);
  });

  addBuiltin('abs', function* (args, line) {
    if (args.length !== 1 || typeof args[0] !== 'number') {
      throw new PyError('TypeError', 'abs() expects a number', line);
    }
    return Math.abs(args[0]);
  });

  addBuiltin('min', function* (args, line) {
    const nums =
      args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (nums.length === 0) throw new PyError('ValueError', 'min() arg is empty', line);
    return Math.min(...nums.map(Number));
  });

  addBuiltin('max', function* (args, line) {
    const nums =
      args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (nums.length === 0) throw new PyError('ValueError', 'max() arg is empty', line);
    return Math.max(...nums.map(Number));
  });

  addBuiltin('int', function* (args, line) {
    if (args.length !== 1) throw new PyError('TypeError', 'int() expects 1 argument', line);
    const n = parseInt(String(args[0]), 10);
    if (Number.isNaN(n)) throw new PyError('ValueError', 'invalid literal for int()', line);
    return n;
  });

  addBuiltin('str', function* (args) {
    return args.length === 0 ? '' : formatPyVal(args[0]);
  });

  addBuiltin('bool', function* (args) {
    return args.length === 0 ? false : isTruthy(args[0]);
  });

  // --- Evaluator ---
  function* evalExpr(expr: Expr): Generator<StepSignal, PyVal, void> {
    switch (expr.kind) {
      case 'lit':
        return expr.value;
      case 'var':
        return getVar(expr.name, expr.line);
      case 'list': {
        const res: PyVal[] = [];
        for (const it of expr.items) {
          res.push(yield* evalExpr(it));
        }
        return res;
      }
      case 'dict': {
        const map = new Map<string, PyVal>();
        for (const e of expr.entries) {
          const k = formatPyVal(yield* evalExpr(e.key));
          const v = yield* evalExpr(e.val);
          map.set(k, v);
        }
        return { __dict: true, map };
      }
      case 'unary': {
        const val = yield* evalExpr(expr.arg);
        if (expr.op === 'not') return !isTruthy(val);
        if (typeof val !== 'number') {
          throw new PyError(
            'TypeError',
            `bad operand type for unary ${expr.op}: '${typeName(val)}'`,
            expr.line
          );
        }
        return expr.op === '-' ? -val : +val;
      }
      case 'bin': {
        if (expr.op === 'and') {
          const l = yield* evalExpr(expr.left);
          return isTruthy(l) ? yield* evalExpr(expr.right) : l;
        }
        if (expr.op === 'or') {
          const l = yield* evalExpr(expr.left);
          return isTruthy(l) ? l : yield* evalExpr(expr.right);
        }
        const l = yield* evalExpr(expr.left);
        const r = yield* evalExpr(expr.right);
        return applyBinaryOp(expr.op, l, r, expr.line);
      }
      case 'compare': {
        let cur = yield* evalExpr(expr.left);
        for (const item of expr.ops) {
          const nxt = yield* evalExpr(item.right);
          const ok = evalCompareOp(item.op, cur, nxt, expr.line);
          if (!ok) return false;
          cur = nxt;
        }
        return true;
      }
      case 'ternary': {
        const cond = yield* evalExpr(expr.cond);
        return isTruthy(cond)
          ? yield* evalExpr(expr.whenTrue)
          : yield* evalExpr(expr.whenFalse);
      }
      case 'index': {
        const target = yield* evalExpr(expr.target);
        const idx = yield* evalExpr(expr.index);
        if (Array.isArray(target) || typeof target === 'string') {
          if (typeof idx !== 'number') {
            throw new PyError('TypeError', 'indices must be integers', expr.line);
          }
          const i = idx < 0 ? target.length + idx : idx;
          if (i < 0 || i >= target.length) {
            throw new PyError('IndexError', 'index out of range', expr.line);
          }
          return target[i];
        }
        if (isDict(target)) {
          const key = formatPyVal(idx);
          if (!target.map.has(key)) {
            throw new PyError('KeyError', `'${key}'`, expr.line);
          }
          return target.map.get(key)!;
        }
        throw new PyError(
          'TypeError',
          `'${typeName(target)}' object is not subscriptable`,
          expr.line
        );
      }
      case 'attr': {
        const target = yield* evalExpr(expr.target);
        return { __method: true, target, name: expr.attr };
      }
      case 'call': {
        const callee = yield* evalExpr(expr.callee);
        const args: PyVal[] = [];
        for (const a of expr.args) {
          args.push(yield* evalExpr(a));
        }

        if (isMethod(callee)) {
          return callMethod(callee, args, expr.line);
        }

        if (!isFunc(callee)) {
          throw new PyError(
            'TypeError',
            `'${typeName(callee)}' object is not callable`,
            expr.line
          );
        }

        if (callee.builtin) {
          return yield* callee.builtin(args, expr.line);
        }

        if (args.length !== callee.params.length) {
          throw new PyError(
            'TypeError',
            `${callee.name}() takes ${callee.params.length} positional argument(s) but ${args.length} were given`,
            expr.line
          );
        }

        const localScope = new Map<string, PyVal>();
        callee.params.forEach((p, idx) => localScope.set(p, args[idx]));
        callStack.push(localScope);
        try {
          const sig = yield* execBlock(callee.body);
          if (sig && sig.type === 'return') return sig.value;
          return null;
        } finally {
          callStack.pop();
        }
      }
    }
  }

  function applyBinaryOp(op: string, l: PyVal, r: PyVal, line: number): PyVal {
    if (op === '+') {
      if (typeof l === 'number' && typeof r === 'number') return l + r;
      if (typeof l === 'string' && typeof r === 'string') return l + r;
      if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r];
    }
    if (op === '*') {
      if (typeof l === 'number' && typeof r === 'number') return l * r;
      if (typeof l === 'string' && typeof r === 'number') return l.repeat(Math.max(0, r));
      if (Array.isArray(l) && typeof r === 'number') {
        const out: PyVal[] = [];
        for (let i = 0; i < Math.max(0, r); i++) out.push(...l);
        return out;
      }
    }
    if (typeof l === 'number' && typeof r === 'number') {
      if (op === '-') return l - r;
      if (op === '/') {
        if (r === 0) throw new PyError('ZeroDivisionError', 'division by zero', line);
        return l / r;
      }
      if (op === '//') {
        if (r === 0) throw new PyError('ZeroDivisionError', 'integer division by zero', line);
        return Math.floor(l / r);
      }
      if (op === '%') {
        if (r === 0) throw new PyError('ZeroDivisionError', 'modulo by zero', line);
        return ((l % r) + r) % r;
      }
      if (op === '**') return Math.pow(l, r);
    }
    throw new PyError(
      'TypeError',
      `unsupported operand type(s) for ${op}: '${typeName(l)}' and '${typeName(r)}'`,
      line
    );
  }

  function evalCompareOp(op: string, l: PyVal, r: PyVal, line: number): boolean {
    if (op === '==') return deepEqual(l, r);
    if (op === '!=') return !deepEqual(l, r);
    if (op === 'in' || op === 'not in') {
      let found = false;
      if (Array.isArray(r)) found = r.some((item) => deepEqual(item, l));
      else if (typeof r === 'string' && typeof l === 'string') found = r.includes(l);
      else if (isDict(r)) found = r.map.has(formatPyVal(l));
      else {
        throw new PyError(
          'TypeError',
          `argument of type '${typeName(r)}' is not iterable`,
          line
        );
      }
      return op === 'in' ? found : !found;
    }
    if (typeof l === 'number' && typeof r === 'number') {
      if (op === '<') return l < r;
      if (op === '<=') return l <= r;
      if (op === '>') return l > r;
      if (op === '>=') return l >= r;
    }
    if (typeof l === 'string' && typeof r === 'string') {
      if (op === '<') return l < r;
      if (op === '<=') return l <= r;
      if (op === '>') return l > r;
      if (op === '>=') return l >= r;
    }
    throw new PyError(
      'TypeError',
      `'${op}' not supported between '${typeName(l)}' and '${typeName(r)}'`,
      line
    );
  }

  function deepEqual(a: PyVal, b: PyVal): boolean {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, idx) => deepEqual(v, b[idx]));
    }
    return false;
  }

  function callMethod(m: PyMethod, args: PyVal[], line: number): PyVal {
    if (Array.isArray(m.target)) {
      if (m.name === 'append') {
        if (args.length !== 1) throw new PyError('TypeError', 'append() takes 1 argument', line);
        m.target.push(args[0]);
        return null;
      }
      if (m.name === 'pop') {
        if (m.target.length === 0) throw new PyError('IndexError', 'pop from empty list', line);
        return m.target.pop() ?? null;
      }
    }
    if (typeof m.target === 'string') {
      if (m.name === 'upper') return m.target.toUpperCase();
      if (m.name === 'lower') return m.target.toLowerCase();
      if (m.name === 'strip') return m.target.trim();
    }
    throw new PyError(
      'AttributeError',
      `'${typeName(m.target)}' object has no attribute '${m.name}'`,
      line
    );
  }

  function* execBlock(stmts: Stmt[]): Generator<StepSignal, SignalControl, void> {
    for (const stmt of stmts) {
      const sig = yield* execStmt(stmt);
      if (sig) return sig;
    }
    return null;
  }

  function* execStmt(stmt: Stmt): Generator<StepSignal, SignalControl, void> {
    stepBudget++;
    if (stepBudget > MAX_STEPS) {
      throw new PyError(
        'LoopLimitError',
        `Execution stopped after ${MAX_STEPS} steps (possible infinite loop in while/recursion).`,
        stmt.line
      );
    }

    switch (stmt.kind) {
      case 'pass':
        yield { line: stmt.line };
        return null;
      case 'break':
        yield { line: stmt.line };
        return { type: 'break' };
      case 'continue':
        yield { line: stmt.line };
        return { type: 'continue' };
      case 'return': {
        const val = stmt.value ? yield* evalExpr(stmt.value) : null;
        yield { line: stmt.line };
        return { type: 'return', value: val };
      }
      case 'def': {
        const fn: PyFunction = {
          __fn: true,
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
        };
        setVar(stmt.name, fn);
        yield { line: stmt.line };
        return null;
      }
      case 'assign': {
        const rhs = yield* evalExpr(stmt.value);
        if (stmt.target.kind === 'var') {
          let finalVal = rhs;
          if (stmt.op !== '=') {
            const cur = getVar(stmt.target.name, stmt.line);
            finalVal = applyBinaryOp(stmt.op.slice(0, -1), cur, rhs, stmt.line);
          }
          setVar(stmt.target.name, finalVal);
        } else if (stmt.target.kind === 'index') {
          const container = yield* evalExpr(stmt.target.target);
          const idx = yield* evalExpr(stmt.target.index);
          if (Array.isArray(container) && typeof idx === 'number') {
            const i = idx < 0 ? container.length + idx : idx;
            if (i < 0 || i >= container.length) {
              throw new PyError('IndexError', 'list assignment index out of range', stmt.line);
            }
            container[i] = rhs;
          } else if (isDict(container)) {
            container.map.set(formatPyVal(idx), rhs);
          } else {
            throw new PyError('TypeError', 'object does not support item assignment', stmt.line);
          }
        } else {
          throw new PyError('SyntaxError', 'cannot assign to expression', stmt.line);
        }
        yield { line: stmt.line };
        return null;
      }
      case 'expr': {
        yield* evalExpr(stmt.expr);
        // Only yield extra step if expression wasn't purely a rover action call that already yielded
        if (stmt.expr.kind !== 'call') {
          yield { line: stmt.line };
        }
        return null;
      }
      case 'if': {
        for (const branch of stmt.branches) {
          if (branch.cond === null) {
            return yield* execBlock(branch.body);
          }
          yield { line: branch.line };
          const ok = isTruthy(yield* evalExpr(branch.cond));
          if (ok) {
            return yield* execBlock(branch.body);
          }
        }
        return null;
      }
      case 'for': {
        const iterVal = yield* evalExpr(stmt.iter);
        let items: PyVal[];
        if (Array.isArray(iterVal)) items = iterVal;
        else if (typeof iterVal === 'string') items = iterVal.split('');
        else if (isDict(iterVal)) items = Array.from(iterVal.map.keys());
        else {
          throw new PyError(
            'TypeError',
            `'${typeName(iterVal)}' object is not iterable`,
            stmt.line
          );
        }
        for (const item of items) {
          setVar(stmt.target, item);
          yield { line: stmt.line };
          const sig = yield* execBlock(stmt.body);
          if (sig) {
            if (sig.type === 'break') break;
            if (sig.type === 'continue') continue;
            return sig;
          }
        }
        return null;
      }
      case 'while': {
        while (true) {
          yield { line: stmt.line };
          const ok = isTruthy(yield* evalExpr(stmt.cond));
          if (!ok) break;
          const sig = yield* execBlock(stmt.body);
          if (sig) {
            if (sig.type === 'break') break;
            if (sig.type === 'continue') continue;
            return sig;
          }
        }
        return null;
      }
    }
  }

  // --- Parse & Run ---
  try {
    const tokens = tokenize(code);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();

    if (ast.length === 0) {
      pushLog('info', 'No executable Python statements found.', 1);
      yield emitSnapshot(1, undefined, true);
      return;
    }

    const gen = execBlock(ast);
    while (true) {
      const nxt = gen.next();
      if (nxt.done) {
        const won = checkWinCondition(world, level);
        if (won) {
          pushLog('success', 'Mission objective complete! Aurora reached the beacon.');
        } else if (!level.isSandbox) {
          const remainingGems = level.gems.length - world.collectedGems.length;
          if (!world.atGoal) {
            pushLog('info', 'Program finished, but Aurora has not reached the green beacon yet.');
          } else if (remainingGems > 0) {
            pushLog(
              'info',
              `Aurora reached the beacon, but ${remainingGems} energy crystal(s) still need collect().`
            );
          }
        }
        yield emitSnapshot(0, undefined, true);
        return;
      }
      const sig = nxt.value;
      yield emitSnapshot(sig.line, sig.event, false);
    }
  } catch (err) {
    if (err instanceof PyError) {
      pushLog('error', `${err.errType} (line ${err.line}): ${err.message}`, err.line);
      yield {
        world,
        activeLine: err.line,
        variables: collectVariables(),
        logs: [...logs],
        won: false,
        finished: true,
        error: { errType: err.errType, message: err.message, line: err.line },
      };
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    pushLog('error', `RuntimeError: ${msg}`, 1);
    yield {
      world,
      activeLine: 1,
      variables: collectVariables(),
      logs: [...logs],
      won: false,
      finished: true,
      error: { errType: 'RuntimeError', message: msg, line: 1 },
    };
  }
}

export function countCodeLines(code: string): number {
  return code
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#')).length;
}
