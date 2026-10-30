import { describe, expect, it } from 'vitest'
import { Decimal } from '../src/decimal.ts'
import {
  DIVIDE_BY_ZERO, INVALID, MAX_INTEGER_DIGITS, TOO_LARGE, WHOLE_POWERS, displayValue, enterValue, initialCalculatorState,
  pressKey, type CalculatorKey, type CalculatorState,
} from '../src/engine.ts'

// One character per key, except: N is +/-, R is square root, B is backspace, E is CE, and C is C.
const NAMED: Record<string, CalculatorKey> = { N: '+/-', R: 'sqrt', B: 'backspace', E: 'CE', C: 'C' }

function run(keys: string, from: CalculatorState = initialCalculatorState): CalculatorState {
  return [...keys.replace(/\s/g, '')].reduce((state, k) => pressKey(state, NAMED[k] ?? (k as CalculatorKey)), from)
}

const press = (...keys: CalculatorKey[]) => keys.reduce(pressKey, initialCalculatorState)
const result = (keys: string) => run(keys).evaluated?.value.toFixed(2)
const shown = (state: CalculatorState) => displayValue(state).toFixed(2)

describe('money', () => {
  it('adds in decimal, without binary noise', () => {
    expect(result('0.1 + 0.2 =')).toBe('0.30')
  })

  it('rounds every result to cents, half away from zero', () => {
    expect(result('10 / 3 =')).toBe('3.33')
    expect(result('1 / 8 =')).toBe('0.13')
    expect(result('1 N / 8 =')).toBe('-0.13')
  })

  it('keeps full precision within one calculation', () => {
    expect(result('10 / 3 * 3 =')).toBe('10.00')
  })

  it('carries a result forward as the cents it shows', () => {
    expect(result('10 / 3 = * 3 =')).toBe('9.99')
  })

  it('takes at most two decimal places when typing', () => {
    expect(run('1.234').entry).toBe('1.23')
  })

  it(`takes at most ${MAX_INTEGER_DIGITS} digits before the decimal point`, () => {
    expect(run('1'.repeat(MAX_INTEGER_DIGITS + 3)).entry).toBe('1'.repeat(MAX_INTEGER_DIGITS))
    expect(run(`${'9'.repeat(MAX_INTEGER_DIGITS)} + 1 =`).error).toBe(TOO_LARGE)
  })
})

describe('accounting percent', () => {
  it('adds or takes away a percent of what comes before', () => {
    expect(result('100 + 5% =')).toBe('105.00')
    expect(result('100 - 5% =')).toBe('95.00')
  })

  it('is a percent of the whole running total', () => {
    expect(result('50 + 50 + 10% =')).toBe('110.00')
    expect(result('2 * 50 + 10% =')).toBe('110.00')
  })

  it('divides by 100 after ×, ÷, or a power, and on its own', () => {
    expect(result('100 * 5% =')).toBe('5.00')
    expect(result('100 / 5% =')).toBe('2000.00')
    expect(result('5% =')).toBe('0.05')
  })

  it('works inside parentheses and on a parenthesis group', () => {
    expect(result('(100 + 5%) * 2 =')).toBe('210.00')
    expect(result('100 + (2 + 3)% =')).toBe('105.00')
  })

  it('shows the amount it worked out, which the next digit replaces', () => {
    const state = run('100 + 5%')
    expect(shown(state)).toBe('5.00')
    expect(run('7 =', state).evaluated?.value.toFixed(2)).toBe('107.00')
  })

  it('takes a percent of a result', () => {
    expect(shown(run('2 * 3 = %'))).toBe('0.06')
  })
})

describe('precedence and parentheses', () => {
  it('multiplies and divides before adding and subtracting', () => {
    expect(result('2 + 3 * 4 =')).toBe('14.00')
    expect(result('10 - 6 / 2 =')).toBe('7.00')
  })

  it('works out parentheses first', () => {
    expect(result('(2 + 3) * 4 =')).toBe('20.00')
    expect(result('((1 + 2) * (3 + 4)) =')).toBe('21.00')
  })

  it('closes any parenthesis left open', () => {
    expect(result('(2 + 3 =')).toBe('5.00')
  })

  it('multiplies a number and a parenthesis written side by side', () => {
    expect(result('2(3) =')).toBe('6.00')
    expect(result('(2)3 =')).toBe('6.00')
  })

  it('ignores a close with nothing open', () => {
    expect(result('2 ) + 1 =')).toBe('3.00')
  })
})

describe('powers and square roots', () => {
  it('raises to a power, before multiplying', () => {
    expect(result('2 ^ 10 =')).toBe('1024.00')
    expect(result('3 * 2 ^ 2 =')).toBe('12.00')
  })

  it('works powers from right to left', () => {
    expect(result('2 ^ 3 ^ 2 =')).toBe('512.00')
  })

  it('does compound interest', () => {
    expect(result('1000 * (1 + 0.05) ^ 3 =')).toBe('1157.63')
  })

  it('takes negative whole powers', () => {
    expect(result('2 ^ 1 N =')).toBe('0.50')
  })

  it('refuses a fractional power and a negative power of zero', () => {
    expect(run('2 ^ 0.5 =').error).toBe(WHOLE_POWERS)
    expect(run('0 ^ 1 N =').error).toBe(DIVIDE_BY_ZERO)
  })

  it('stops a power too large to show', () => {
    expect(run('10 ^ 400 =').error).toBe(TOO_LARGE)
  })

  it('takes the square root of the entry, a group, or a result', () => {
    expect(result('9 R + 1 =')).toBe('4.00')
    expect(result('(12 + 4) R =')).toBe('4.00')
    expect(shown(run('8 * 2 = R'))).toBe('4.00')
    expect(shown(run('2 R'))).toBe('1.41')
  })

  it('refuses the square root of a negative number', () => {
    expect(run('9 N R').error).toBe(INVALID)
  })
})

describe('entry', () => {
  it('takes one decimal point', () => {
    expect(run('1..5').entry).toBe('1.5')
    expect(run('.5').entry).toBe('0.5')
  })

  it('changes the sign of the entry and of a result', () => {
    expect(result('5 N + 3 =')).toBe('-2.00')
    expect(run('2 + 3 = N').evaluated?.value.toFixed(2)).toBe('-5.00')
  })

  it('replaces an operator typed twice', () => {
    expect(result('5 + * 2 =')).toBe('10.00')
  })

  it('drops an operator left at the end', () => {
    expect(result('5 + =')).toBe('5.00')
  })

  it('shows 0.00 while no number is being entered', () => {
    expect(shown(run('100 + 50 +'))).toBe('0.00')
    expect(shown(run('2 * (3 + 4)'))).toBe('0.00')
    expect(shown(run('12 + 34 E'))).toBe('0.00')
  })

  it('backspace deletes the last digit typed', () => {
    expect(result('12 + 345 B =')).toBe('46.00')
    expect(run('1.5 B').entry).toBe('1.')
    expect(run('5 N B').entry).toBeNull()
  })

  it('backspace leaves a result, a worked-out value, and operators alone', () => {
    expect(run('2 + 3 = B').evaluated?.value.toFixed(2)).toBe('5.00')
    expect(run('100 + 5% B').entry).toBe('5.00')
    expect(run('12 + B').tokens).toHaveLength(2)
  })
})

describe('equals', () => {
  it('repeats the last operation when pressed again', () => {
    expect(result('100 + 5 = = =')).toBe('115.00')
    expect(result('2 * 3 = =')).toBe('18.00')
  })

  it('carries a result into the next operator', () => {
    expect(result('2 + 3 = * 2 =')).toBe('10.00')
  })

  it('starts over when a digit follows a result', () => {
    const state = run('2 + 3 = 7')
    expect(state.evaluated).toBeNull()
    expect(state.entry).toBe('7')
  })
})

describe('memory', () => {
  it('adds entries with M+ and recalls them with MR', () => {
    expect(shown(press('5', '0', 'M+', '2', '5', 'M+', 'MR'))).toBe('75.00')
  })

  it('works out a pending expression before adding it, as = would', () => {
    const state = press('1', '0', '0', '+', '5', '%', 'M+')
    expect(state.evaluated?.value.toFixed(2)).toBe('105.00')
    expect(state.memory?.toFixed(2)).toBe('105.00')
  })

  it('subtracts with M− and replaces with MS', () => {
    expect(shown(press('8', '0', 'MS', '3', '0', 'M-', 'MR'))).toBe('50.00')
    expect(press('8', '0', 'MS', '3', 'MS').memory?.toFixed(2)).toBe('3.00')
  })

  it('recalls into an expression, and the next digit replaces the recalled number', () => {
    expect(press('2', '0', 'MS', 'C', '1', '0', '0', '+', 'MR', '=').evaluated?.value.toFixed(2)).toBe('120.00')
    expect(press('7', 'MS', 'C', 'MR', '2').entry).toBe('2')
  })

  it('keeps the memory when recalling it after a result', () => {
    const state = press('5', 'MS', '2', '+', '3', '=', 'MR')
    expect(shown(state)).toBe('5.00')
    expect(state.memory?.toFixed(2)).toBe('5.00')
  })

  it('clears with MC, and does nothing to recall when clear', () => {
    expect(press('5', 'MS', 'MC').memory).toBeNull()
    expect(press('5', 'MR').entry).toBe('5')
  })

  it('survives C and errors', () => {
    expect(press('5', 'MS', 'C').memory?.toFixed(2)).toBe('5.00')
    const error = press('5', 'MS', '1', '/', '0', '=')
    expect(error.error).toBe(DIVIDE_BY_ZERO)
    expect(error.memory?.toFixed(2)).toBe('5.00')
  })
})

describe('entering a whole value', () => {
  const entered = (state: CalculatorState, text: string) => enterValue(state, Decimal.parse(text))

  it('rounds it to cents and adds it to the expression', () => {
    expect(run('=', entered(run('100 +'), '1.234')).evaluated?.value.toFixed(2)).toBe('101.23')
  })

  it('replaces the number being typed, and the next digit replaces it', () => {
    expect(entered(run('12'), '5').entry).toBe('5.00')
    expect(run('7', entered(initialCalculatorState, '5')).entry).toBe('7')
  })

  it('starts a new calculation after a result or an error, keeping the memory', () => {
    const afterResult = entered(press('4', 'MS', '2', '+', '3', '='), '9')
    expect(afterResult.tokens).toHaveLength(0)
    expect(shown(afterResult)).toBe('9.00')
    expect(afterResult.memory?.toFixed(2)).toBe('4.00')
    expect(entered(run('1 / 0 ='), '9').error).toBeNull()
  })

  it('shows an error for a value too large', () => {
    expect(entered(initialCalculatorState, '1'.repeat(MAX_INTEGER_DIGITS + 1)).error).toBe(TOO_LARGE)
  })
})

describe('clearing and errors', () => {
  it('CE clears only the entry', () => {
    expect(result('12 + 34 E 5 =')).toBe('17.00')
  })

  it('C clears everything', () => {
    expect(run('12 + 34 C')).toEqual(initialCalculatorState)
  })

  it('shows an error for a division by zero, and starts over on the next key', () => {
    expect(run('1 / 0 =').error).toBe(DIVIDE_BY_ZERO)
    expect(result('1 / 0 = 2 + 2 =')).toBe('4.00')
  })
})
