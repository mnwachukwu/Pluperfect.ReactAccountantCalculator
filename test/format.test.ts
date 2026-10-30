import { describe, expect, it } from 'vitest'
import { Decimal } from '../src/decimal.ts'
import { initialCalculatorState, pressKey, type CalculatorKey } from '../src/engine.ts'
import { formatMoney, parseMoney, screenOf } from '../src/format.ts'

const press = (...keys: CalculatorKey[]) => keys.reduce(pressKey, initialCalculatorState)
const value = (...keys: CalculatorKey[]) => screenOf(press(...keys), 'en-US').value

describe('formatMoney', () => {
  it('groups and always shows two decimal places', () => {
    expect(formatMoney(Decimal.parse('1234567'), 'en-US')).toBe('1,234,567.00')
    expect(formatMoney(Decimal.parse('-1234.5'), 'en-US')).toBe('-1,234.50')
    expect(formatMoney(Decimal.ZERO, 'en-US')).toBe('0.00')
  })

  it('follows the locale', () => {
    expect(formatMoney(Decimal.parse('1234.5'), 'de-DE')).toBe('1.234,50')
  })

  it('groups numbers too large for a float without losing a digit', () => {
    expect(formatMoney(Decimal.parse('999999999999999.99'), 'en-US')).toBe('999,999,999,999,999.99')
  })
})

describe('parseMoney', () => {
  const parsed = (text: string, locale = 'en-US') => parseMoney(text, locale)?.toFixed(2) ?? null

  it('reads plain and grouped numbers, rounded to cents', () => {
    expect(parsed('1234.5')).toBe('1234.50')
    expect(parsed(' 1,234.567\r\n')).toBe('1234.57')
    expect(parsed('.5')).toBe('0.50')
    expect(parsed('12.')).toBe('12.00')
  })

  it('reads currency symbols, minus signs, and accounting parentheses', () => {
    expect(parsed('$1,234.56')).toBe('1234.56')
    expect(parsed('-$5')).toBe('-5.00')
    expect(parsed('$-5')).toBe('-5.00')
    expect(parsed('−5')).toBe('-5.00')
    expect(parsed('(1,234.56)')).toBe('-1234.56')
    expect(parsed('($1,234.56)')).toBe('-1234.56')
  })

  it('follows the locale', () => {
    expect(parsed('1.234,56 €', 'de-DE')).toBe('1234.56')
    expect(parsed('1 234,56', 'fr-FR')).toBe('1234.56')
    expect(parsed('12,34,567.00', 'en-IN')).toBe('1234567.00')
  })

  it('reads back what the display shows', () => {
    for (const locale of ['en-US', 'de-DE', 'fr-FR', 'en-IN']) {
      expect(parsed(formatMoney(Decimal.parse('-1234567.89'), locale), locale)).toBe('-1234567.89')
    }
  })

  it('takes nothing that is not one number the calculator can hold', () => {
    for (const text of ['', 'abc', '1e5', '1.2.3', '12,34', '1,5', '--5', '(-5)', '5-', '$', '1 2', '1\n2', '1'.repeat(16)]) {
      expect(parsed(text)).toBeNull()
    }
  })
})

describe('the display', () => {
  it('starts at 0.00', () => {
    expect(screenOf(initialCalculatorState, 'en-US').value).toBe('0.00')
  })

  it('shows a number being typed as money', () => {
    expect(value('1', '2')).toBe('12.00')
    expect(value('1', '2', '.')).toBe('12.00')
    expect(value('1', '2', '.', '5')).toBe('12.50')
    expect(value('1', '2', '3', '4', '.', '5', '6')).toBe('1,234.56')
  })

  it('shows the expression line as money', () => {
    expect(screenOf(press('1', '0', '0', '+', '5', '='), 'en-US').expression).toBe('100.00 + 5.00 =')
    expect(screenOf(press('2', '*', '(', '3'), 'en-US').expression).toBe('2.00 × (')
  })

  it('marks a number held in memory', () => {
    expect(screenOf(press('5', 'MS'), 'en-US').memory).toBe(true)
    expect(screenOf(press('5', 'MS', 'MC'), 'en-US').memory).toBe(false)
  })

  it('shows an error as its message', () => {
    expect(screenOf(press('1', '/', '0', '='), 'en-US')).toEqual({
      expression: '', value: 'Cannot divide by zero', isError: true, memory: false,
    })
  })
})
