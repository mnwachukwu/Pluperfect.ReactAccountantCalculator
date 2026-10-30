import type { CalculatorKey, Digit, MemoryKey } from './engine.js'

type KeyEventLike = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>

const NUMPAD: Record<string, CalculatorKey> = {
  NumpadDecimal: '.',
  NumpadAdd: '+',
  NumpadSubtract: '-',
  NumpadMultiply: '*',
  NumpadDivide: '/',
  NumpadEnter: '=',
  NumpadEqual: '=',
}

const WITH_M: Record<string, MemoryKey> = { '+': 'M+', '-': 'M-', s: 'MS', r: 'MR', c: 'MC' }

/** Whether the key is M, which held down turns +, -, S, R, and C into M+, M−, MS, MR, and MC. */
export const isMemoryHold = (event: Pick<KeyboardEvent, 'key'>) => event.key === 'm' || event.key === 'M'

/**
 * The calculator key a keyboard event means, or null. The numpad is read by its physical key, so it works with
 * Num Lock off and in locales whose numpad decimal types a comma. Pass `memoryHeld` while M is down.
 */
export function keyFromEvent(event: KeyEventLike, memoryHeld = false): CalculatorKey | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  const key = plainKey(event)
  return memoryHeld ? (WITH_M[key ?? event.key.toLowerCase()] ?? key) : key
}

function plainKey(event: KeyEventLike): CalculatorKey | null {
  const numpadDigit = /^Numpad(\d)$/.exec(event.code)
  if (numpadDigit) return numpadDigit[1] as Digit
  const numpad = NUMPAD[event.code]
  if (numpad) return numpad
  if (/^\d$/.test(event.key)) return event.key as Digit
  switch (event.key) {
    case '.': return '.'
    case '+': case '-': case '*': case '/': case '^': case '(': case ')': case '%': return event.key
    case '@': return 'sqrt'
    case 'x': case 'X': return '*'
    case '=': case 'Enter': return '='
    case 'Backspace': return 'backspace'
    case 'Escape': return 'C'
    case 'F9': return '+/-'
    default: return null
  }
}

/** Whether a key pressed here belongs to a field the person is typing in rather than to the calculator. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  return target instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit', 'reset', 'range'].includes(target.type)
}
