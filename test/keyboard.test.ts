import { describe, expect, it } from 'vitest'
import { isMemoryHold, isTypingTarget, keyFromEvent } from '../src/keyboard.ts'

const key = (key: string, code = '', extra: Partial<KeyboardEvent> = {}) =>
  keyFromEvent({ key, code, ctrlKey: false, metaKey: false, altKey: false, ...extra })
const withM = (key: string, code = '') =>
  keyFromEvent({ key, code, ctrlKey: false, metaKey: false, altKey: false }, true)

describe('keyFromEvent', () => {
  it('maps the numpad by its keys, with Num Lock on or off', () => {
    expect(key('7', 'Numpad7')).toBe('7')
    expect(key('Home', 'Numpad7')).toBe('7')
    expect(key(',', 'NumpadDecimal')).toBe('.')
    expect(key('+', 'NumpadAdd')).toBe('+')
    expect(key('Enter', 'NumpadEnter')).toBe('=')
  })

  it('maps Enter to =, Backspace to deleting a digit, and Escape to C', () => {
    expect(key('Enter')).toBe('=')
    expect(key('Backspace')).toBe('backspace')
    expect(key('Escape')).toBe('C')
  })

  it('maps no key to CE, which is a button only', () => {
    expect(key('Delete')).toBeNull()
  })

  it('maps the rest of the keyboard', () => {
    expect(key('5', 'Digit5')).toBe('5')
    expect(key('^')).toBe('^')
    expect(key('@')).toBe('sqrt')
    expect(key('%')).toBe('%')
    expect(key('F9')).toBe('+/-')
  })

  it('maps +, -, S, R, and C to the memory keys while M is held', () => {
    expect(isMemoryHold({ key: 'm' })).toBe(true)
    expect(isMemoryHold({ key: 'M' })).toBe(true)
    expect(withM('+')).toBe('M+')
    expect(withM('+', 'NumpadAdd')).toBe('M+')
    expect(withM('-', 'NumpadSubtract')).toBe('M-')
    expect(withM('s')).toBe('MS')
    expect(withM('R')).toBe('MR')
    expect(withM('c')).toBe('MC')
  })

  it('leaves the other keys as they are while M is held', () => {
    expect(withM('5', 'Digit5')).toBe('5')
    expect(withM('*')).toBe('*')
    expect(withM('Escape')).toBe('C')
    expect(key('s')).toBeNull()
  })

  it('leaves shortcuts and unknown keys alone', () => {
    expect(key('c', 'KeyC', { ctrlKey: true })).toBeNull()
    expect(key('a', 'KeyA')).toBeNull()
  })
})

describe('isTypingTarget', () => {
  it('is true for text fields and false for buttons', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    expect(isTypingTarget(checkbox)).toBe(false)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
  })
})
