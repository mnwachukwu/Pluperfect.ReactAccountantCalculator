import { Decimal } from './decimal.js'
import { MAX_INTEGER_DIGITS, MONEY_PLACES, displayValue, type CalculatorState, type Token } from './engine.js'

const SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' } as const

function separators(locale?: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8)
  return {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  }
}

export const decimalSeparator = (locale?: string) => separators(locale).decimal

// Some locales group with a no-break space, which text copied elsewhere often turns into a plain one.
const spaces = (text: string) => text.replace(/[\s  ]/g, ' ')

/**
 * The money in a pasted text, rounded to cents, or null when the text is not one number the calculator can take. It
 * reads the locale's grouping and decimal point, a currency symbol on either side, and a minus sign or accounting
 * parentheses, so "$1,234.567", "(1,234.56)", and "1.234,56 €" in de-DE are all numbers.
 */
export function parseMoney(text: string, locale?: string): Decimal | null {
  const { group, decimal } = separators(locale)
  let s = text.trim()
  const accounting = /^\((.*)\)$/s.exec(s)
  if (accounting) s = (accounting[1] ?? '').trim()
  const [, before = '', after = '', body = ''] = /^([-−]?)\s*\p{Sc}?\s*([-−]?)(.*?)\s*\p{Sc}?$/su.exec(s) ?? []
  if ([accounting, before, after].filter(Boolean).length > 1) return null

  const [whole = '', fraction = '', extra] = spaces(body).split(decimal)
  if (extra !== undefined || !/^\d*$/.test(fraction)) return null
  const digits = whole.split(spaces(group)).join('')
  if (!/^\d*$/.test(digits) || digits + fraction === '') return null
  if (digits !== whole && !isGrouped(whole, digits, spaces(group), locale)) return null

  const value = Decimal.parse(`${accounting || before || after ? '-' : ''}${digits}.${fraction}`).roundTo(MONEY_PLACES)
  return value.integerDigits() > MAX_INTEGER_DIGITS ? null : value
}

/** Whether a whole number's grouping is the locale's own, or the common one of threes. */
function isGrouped(whole: string, digits: string, group: string, locale?: string): boolean {
  if (whole === spaces(BigInt(digits).toLocaleString(locale))) return true
  return whole.split(group).every((part, i) => /^\d+$/.test(part) && (i === 0 ? part.length <= 3 : part.length === 3))
}

/** A value as money: grouped by the locale through toLocaleString, with exactly two decimal places. */
export function formatMoney(value: Decimal, locale?: string): string {
  const [whole = '0', fraction = ''] = value.toFixed(MONEY_PLACES).split('.')
  const negative = whole.startsWith('-')
  const grouped = BigInt(negative ? whole.slice(1) : whole).toLocaleString(locale)
  return `${negative ? '-' : ''}${grouped}${decimalSeparator(locale)}${fraction}`
}

/** The expression line above the value, such as "100.00 + 5.00 =". */
export function formatExpression(tokens: Token[], locale?: string): string {
  return tokens
    .map((t) => {
      switch (t.kind) {
        case 'number': return formatMoney(t.value, locale)
        case 'operator': return ` ${SYMBOLS[t.operator]} `
        case 'open': return '('
        case 'close': return ')'
      }
    })
    .join('')
}

export type Screen = {
  /** The line above the value: what has been typed, or what = evaluated. */
  expression: string
  /** The value, or an error's message. */
  value: string
  isError: boolean
  /** Whether a number is held in memory. */
  memory: boolean
}

/** Everything the display shows, as text. */
export function screenOf(state: CalculatorState, locale?: string): Screen {
  const memory = state.memory !== null
  if (state.error) return { expression: '', value: state.error, isError: true, memory }
  const expression = state.evaluated
    ? `${formatExpression(state.evaluated.tokens, locale)} =`
    : formatExpression(state.tokens, locale)
  return { expression, value: formatMoney(displayValue(state), locale), isError: false, memory }
}
