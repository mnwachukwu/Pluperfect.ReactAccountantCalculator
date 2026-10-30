import { describe, expect, it } from 'vitest'
import { Decimal, PRECISION } from '../src/decimal.ts'

const d = Decimal.parse

describe('Decimal', () => {
  it('reads and writes text exactly', () => {
    expect(d('-12.50').toString()).toBe('-12.5')
    expect(d('12.').toFixed(2)).toBe('12.00')
    expect(d('.5').toFixed(2)).toBe('0.50')
    expect(d('0').toFixed(2)).toBe('0.00')
    expect(() => d('1e5')).toThrow(RangeError)
  })

  it('adds, subtracts, and multiplies exactly', () => {
    expect(d('0.1').plus(d('0.2')).toString()).toBe('0.3')
    expect(d('1').minus(d('0.99')).toString()).toBe('0.01')
    expect(d('1.05').times(d('1.05')).toString()).toBe('1.1025')
  })

  it(`divides to ${PRECISION} places`, () => {
    expect(d('1').dividedBy(d('3')).toString()).toBe(`0.${'3'.repeat(PRECISION)}`)
    expect(d('2').dividedBy(d('3')).toString()).toBe(`0.${'6'.repeat(PRECISION - 1)}7`)
    expect(() => d('1').dividedBy(d('0'))).toThrow(RangeError)
  })

  it('rounds half away from zero', () => {
    expect(d('0.125').roundTo(2).toString()).toBe('0.13')
    expect(d('-0.125').roundTo(2).toString()).toBe('-0.13')
    expect(d('0.124').roundTo(2).toString()).toBe('0.12')
    expect(d('-0.004').toFixed(2)).toBe('0.00')
  })

  it('takes square roots and whole powers', () => {
    expect(d('16').squareRoot().toString()).toBe('4')
    expect(d('2').squareRoot().toFixed(5)).toBe('1.41421')
    expect(d('1.05').toPower(3n).toString()).toBe('1.157625')
    expect(d('2').toPower(-2n).toString()).toBe('0.25')
    expect(d('5').toPower(0n).toString()).toBe('1')
  })

  it('counts the digits before the decimal point', () => {
    expect(d('0.5').integerDigits()).toBe(1)
    expect(d('-1234.5').integerDigits()).toBe(4)
  })
})
