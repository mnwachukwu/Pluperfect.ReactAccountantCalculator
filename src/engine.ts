import { Decimal } from './decimal.js'

/** `^` raises to a power. */
export type Operator = '+' | '-' | '*' | '/' | '^'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type MemoryKey = 'MC' | 'MR' | 'MS' | 'M+' | 'M-'

/**
 * Every key the calculator has. `+/-` changes the sign; `sqrt` is the square root; `backspace` deletes the last digit
 * typed; `CE` clears the entry; `C` clears everything but memory.
 */
export type CalculatorKey =
  | Digit | Operator | MemoryKey | '.' | '(' | ')' | '=' | '%' | 'sqrt' | '+/-' | 'backspace' | 'C' | 'CE'

export type Token =
  | { kind: 'number'; value: Decimal }
  | { kind: 'operator'; operator: Operator }
  | { kind: 'open' }
  | { kind: 'close' }

export type CalculatorState = {
  /** The expression committed so far. */
  tokens: Token[]
  /** The number being typed, as typed, such as "-12.5"; null when none. */
  entry: string | null
  /** The entry was worked out, by %, √, or a memory key, so the next digit replaces it rather than extending it. */
  entryIsComputed: boolean
  /** The last expression = evaluated, and its value; shown until the next key starts something new. */
  evaluated: { tokens: Token[]; value: Decimal } | null
  /** What pressing = again repeats: the last operator and its operand. */
  repeat: { operator: Operator; operand: Decimal } | null
  /** The memory, or null when it is clear. */
  memory: Decimal | null
  error: string | null
}

export const initialCalculatorState: CalculatorState = {
  tokens: [],
  entry: null,
  entryIsComputed: false,
  evaluated: null,
  repeat: null,
  memory: null,
  error: null,
}

/** Places every value shows and carries forward, as money does. */
export const MONEY_PLACES = 2
/** Digits allowed before the decimal point, typed or worked out. */
export const MAX_INTEGER_DIGITS = 15

export const DIVIDE_BY_ZERO = 'Cannot divide by zero'
export const TOO_LARGE = 'Result is too large'
export const INVALID = 'Invalid input'
export const WHOLE_POWERS = 'Powers must be whole numbers'

class CalculatorError extends Error {}

function checked(value: Decimal): Decimal {
  if (value.integerDigits() > MAX_INTEGER_DIGITS) throw new CalculatorError(TOO_LARGE)
  return value
}

const money = (value: Decimal) => checked(value).roundTo(MONEY_PLACES)

function apply(left: Decimal, operator: Operator, right: Decimal): Decimal {
  switch (operator) {
    case '+': return checked(left.plus(right))
    case '-': return checked(left.minus(right))
    case '*': return checked(left.times(right))
    case '/':
      if (right.isZero()) throw new CalculatorError(DIVIDE_BY_ZERO)
      return checked(left.dividedBy(right))
    case '^':
      if (!right.isWhole()) throw new CalculatorError(WHOLE_POWERS)
      if (left.isZero() && right.isNegative()) throw new CalculatorError(DIVIDE_BY_ZERO)
      return checked(left.toPower(right.units, checked))
  }
}

/** Evaluates a complete expression: parentheses first, then powers, then × and ÷, then + and −. */
export function evaluate(tokens: Token[]): Decimal {
  let at = 0
  const expression = (): Decimal => {
    let value = term()
    for (let t = tokens[at]; t?.kind === 'operator' && (t.operator === '+' || t.operator === '-'); t = tokens[at]) {
      at++
      value = apply(value, t.operator, term())
    }
    return value
  }
  const term = (): Decimal => {
    let value = power()
    for (let t = tokens[at]; t?.kind === 'operator' && (t.operator === '*' || t.operator === '/'); t = tokens[at]) {
      at++
      value = apply(value, t.operator, power())
    }
    return value
  }
  // Right to left, so 2 ^ 3 ^ 2 is 2 ^ 9.
  const power = (): Decimal => {
    const base = factor()
    const t = tokens[at]
    if (t?.kind !== 'operator' || t.operator !== '^') return base
    at++
    return apply(base, '^', power())
  }
  const factor = (): Decimal => {
    const t = tokens[at++]
    if (t?.kind === 'number') return t.value
    if (t?.kind === 'open') {
      const value = expression()
      if (tokens[at]?.kind === 'close') at++
      return value
    }
    throw new CalculatorError('Incomplete expression')
  }
  const value = expression()
  if (at !== tokens.length) throw new CalculatorError('Incomplete expression')
  return value
}

const last = (tokens: Token[]) => tokens[tokens.length - 1]

const openDepth = (tokens: Token[]) =>
  tokens.reduce((depth, t) => depth + (t.kind === 'open' ? 1 : t.kind === 'close' ? -1 : 0), 0)

/** The expression with a trailing operator or empty parenthesis dropped and every parenthesis closed. */
export function completed(tokens: Token[]): Token[] {
  const done = [...tokens]
  while (done.length && (last(done)!.kind === 'operator' || last(done)!.kind === 'open')) done.pop()
  for (let depth = openDepth(done); depth > 0; depth--) done.push({ kind: 'close' })
  return done
}

/** Where the innermost unclosed group starts, or 0 when there is none. */
function groupStart(tokens: Token[]): number {
  let depth = 0
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!
    if (t.kind === 'close') depth++
    if (t.kind === 'open') {
      if (depth === 0) return i + 1
      depth--
    }
  }
  return 0
}

/** The index of the parenthesis that opens the group ending the expression. */
function matchingOpen(tokens: Token[]): number {
  let depth = 0
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!
    if (t.kind === 'close') depth++
    if (t.kind === 'open' && --depth === 0) return i
  }
  return 0
}

/** The last operator outside any parenthesis, and the value of everything after it. */
function lastOperation(tokens: Token[]): CalculatorState['repeat'] {
  let depth = 0
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!
    if (t.kind === 'close') depth++
    if (t.kind === 'open') depth--
    if (t.kind === 'operator' && depth === 0) return { operator: t.operator, operand: evaluate(tokens.slice(i + 1)) }
  }
  return null
}

/** The expression with the entry, if any, added to it. */
function committed(state: CalculatorState): Token[] {
  return state.entry === null ? state.tokens : [...state.tokens, { kind: 'number', value: Decimal.parse(state.entry) }]
}

/** Once = has shown a result, a digit or parenthesis starts over, while an operator carries the value on. */
const fresh = (state: CalculatorState) => (state.evaluated ? initialCalculatorState : state)

/** A number written beside a closed parenthesis multiplies it. */
function beside(tokens: Token[]): Token[] {
  return last(tokens)?.kind === 'close' ? [...tokens, { kind: 'operator', operator: '*' }] : tokens
}

function typeDigit(state: CalculatorState, digit: Digit | '.'): CalculatorState {
  const s = fresh(state)
  let entry = s.entryIsComputed ? null : s.entry
  const tokens = entry === null ? beside(s.tokens) : s.tokens
  const [whole = '', fraction] = (entry ?? '').replace('-', '').split('.')
  if (digit === '.') {
    if (fraction !== undefined) return s
    entry = entry === null ? '0.' : `${entry}.`
  } else if (fraction !== undefined) {
    if (fraction.length >= MONEY_PLACES) return s
    entry += digit
  } else if (entry === null || whole === '0') {
    entry = `${entry?.startsWith('-') ? '-' : ''}${digit}`
  } else {
    if (whole.length >= MAX_INTEGER_DIGITS) return s
    entry += digit
  }
  return { ...s, tokens, entry, entryIsComputed: false }
}

/** The entry replaced by a worked-out value, which the next digit replaces rather than extends. */
function withComputed(state: CalculatorState, tokens: Token[], value: Decimal): CalculatorState {
  return { ...state, tokens, entry: money(value).toFixed(MONEY_PLACES), entryIsComputed: true }
}

function typeOperator(state: CalculatorState, operator: Operator): CalculatorState {
  let tokens: Token[] = state.evaluated ? [{ kind: 'number', value: state.evaluated.value }] : committed(state)
  const previous = last(tokens)
  if (!previous || previous.kind === 'open') tokens = [...tokens, { kind: 'number', value: Decimal.ZERO }]
  else if (previous.kind === 'operator') tokens = tokens.slice(0, -1)
  return { ...initialCalculatorState, tokens: [...tokens, { kind: 'operator', operator }] }
}

function open(state: CalculatorState): CalculatorState {
  const s = fresh(state)
  let tokens = committed(s)
  const previous = last(tokens)
  if (previous?.kind === 'number' || previous?.kind === 'close') tokens = [...tokens, { kind: 'operator', operator: '*' }]
  return { ...s, tokens: [...tokens, { kind: 'open' }], entry: null, entryIsComputed: false }
}

function close(state: CalculatorState): CalculatorState {
  if (state.evaluated || openDepth(state.tokens) <= 0) return state
  const tokens = committed(state)
  const previous = last(tokens)
  if (previous?.kind === 'operator' || previous?.kind === 'open') return state
  return { ...state, tokens: [...tokens, { kind: 'close' }], entry: null, entryIsComputed: false }
}

/** The number % or √ works on: the entry, or the parenthesis group just closed, taken out of the expression. */
function lastOperand(state: CalculatorState): { tokens: Token[]; operand: Decimal } | null {
  if (state.entry !== null) return { tokens: state.tokens, operand: Decimal.parse(state.entry) }
  if (last(state.tokens)?.kind !== 'close') return null
  const start = matchingOpen(state.tokens)
  return { tokens: state.tokens.slice(0, start), operand: evaluate(state.tokens.slice(start)) }
}

/**
 * Accounting percent. Preceded by + or −, the percent is of everything ahead of that operator in the same group,
 * so 100 + 5% is 100 + 5, or 105. Preceded by any other operator, or by nothing, it is the number divided by 100:
 * 100 × 5% is 5.
 */
function percent(state: CalculatorState): CalculatorState {
  if (state.evaluated) return withComputed(initialCalculatorState, [], state.evaluated.value.dividedBy(Decimal.HUNDRED))
  const found = lastOperand(state)
  if (!found) return state
  const { tokens, operand } = found
  const previous = last(tokens)
  const value =
    previous?.kind === 'operator' && (previous.operator === '+' || previous.operator === '-')
      ? evaluate(tokens.slice(groupStart(tokens), -1)).times(operand).dividedBy(Decimal.HUNDRED)
      : operand.dividedBy(Decimal.HUNDRED)
  return withComputed(state, tokens, value)
}

function squareRoot(state: CalculatorState): CalculatorState {
  const found = state.evaluated ? { tokens: [], operand: state.evaluated.value } : lastOperand(state)
  if (!found) return state
  if (found.operand.isNegative()) throw new CalculatorError(INVALID)
  return withComputed(state.evaluated ? initialCalculatorState : state, found.tokens, found.operand.squareRoot())
}

function negate(state: CalculatorState): CalculatorState {
  if (state.evaluated) return { ...state, evaluated: { ...state.evaluated, value: state.evaluated.value.negated() } }
  if (state.entry === null || Decimal.parse(state.entry).isZero()) return state
  const entry = state.entry.startsWith('-') ? state.entry.slice(1) : `-${state.entry}`
  return { ...state, entry }
}

function equals(state: CalculatorState): CalculatorState {
  if (state.evaluated) {
    if (!state.repeat) return state
    const { operator, operand } = state.repeat
    const from = state.evaluated.value
    return {
      ...state,
      evaluated: {
        tokens: [{ kind: 'number', value: from }, { kind: 'operator', operator }, { kind: 'number', value: operand }],
        value: money(apply(from, operator, operand)),
      },
    }
  }
  const tokens = completed(committed(state))
  if (!tokens.length) return state
  return { ...initialCalculatorState, evaluated: { tokens, value: money(evaluate(tokens)) }, repeat: lastOperation(tokens) }
}

/** Deletes the last digit or decimal point typed; a worked-out value or a result has none to delete. */
function backspace(state: CalculatorState): CalculatorState {
  if (state.evaluated || state.entry === null || state.entryIsComputed) return state
  const entry = state.entry.slice(0, -1)
  return { ...state, entry: entry === '' || entry === '-' ? null : entry }
}

function clearEntry(state: CalculatorState): CalculatorState {
  if (state.evaluated) return initialCalculatorState
  return { ...state, entry: null, entryIsComputed: false }
}

/**
 * M+, M−, and MS work out a pending expression first, as = would, and use its value; with only a number entered, they
 * use that number. MR recalls the memory as a worked-out entry.
 */
function memoryKey(state: CalculatorState, key: MemoryKey): CalculatorState {
  if (key === 'MC') return { ...state, memory: null }
  if (key === 'MR') return state.memory ? recall(state, state.memory) : state
  const settled = state.evaluated
    ? state
    : state.tokens.length
      ? equals(state)
      : state.entry !== null
        ? { ...state, entryIsComputed: true }
        : state
  const value = displayValue(settled)
  const held = state.memory ?? Decimal.ZERO
  const memory = key === 'MS' ? value : key === 'M+' ? held.plus(value) : held.minus(value)
  return { ...settled, memory: money(memory) }
}

/** A whole value entered at once, as by MR or a paste: it replaces any entry, and the next digit typed replaces it. */
function recall(state: CalculatorState, value: Decimal): CalculatorState {
  const s = fresh(state)
  return { ...withComputed(s, s.entry === null ? beside(s.tokens) : s.tokens, value), memory: state.memory }
}

const isMemoryKey = (key: CalculatorKey): key is MemoryKey =>
  key === 'MC' || key === 'MR' || key === 'MS' || key === 'M+' || key === 'M-'

function next(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (isMemoryKey(key)) return memoryKey(state, key)
  switch (key) {
    case 'CE': return clearEntry(state)
    case 'backspace': return backspace(state)
    case '.': return typeDigit(state, '.')
    case '+': case '-': case '*': case '/': case '^': return typeOperator(state, key)
    case '(': return open(state)
    case ')': return close(state)
    case '%': return percent(state)
    case 'sqrt': return squareRoot(state)
    case '+/-': return negate(state)
    case '=': return equals(state)
    case 'C': return initialCalculatorState
    default: return typeDigit(state, key)
  }
}

/**
 * The state after pressing one key. An error stays until the next key, which starts over from a clear calculator.
 * Memory survives everything but MC.
 */
export function pressKey(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (state.error && (key === 'C' || key === 'CE')) return { ...initialCalculatorState, memory: state.memory }
  return step(state, (from) => {
    const result = next(from, key)
    return isMemoryKey(key) ? result : { ...result, memory: state.memory }
  })
}

/** The state after entering a whole value, such as a pasted one, as MR would: rounded to cents, replacing any entry. */
export function enterValue(state: CalculatorState, value: Decimal): CalculatorState {
  return step(state, (from) => recall(from, value))
}

function step(state: CalculatorState, apply: (from: CalculatorState) => CalculatorState): CalculatorState {
  const from = state.error ? { ...initialCalculatorState, memory: state.memory } : state
  try {
    return apply(from)
  } catch (e) {
    if (e instanceof CalculatorError) return { ...initialCalculatorState, memory: state.memory, error: e.message }
    throw e
  }
}

/** The value the display shows: the result, the entry, or zero while no number is being entered. */
export function displayValue(state: CalculatorState): Decimal {
  if (state.evaluated) return state.evaluated.value
  return state.entry === null ? Decimal.ZERO : Decimal.parse(state.entry)
}
