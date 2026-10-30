import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { CalculatorKey } from './engine.js'
import { decimalSeparator, parseMoney, screenOf } from './format.js'
import { isMemoryHold, isTypingTarget, keyFromEvent } from './keyboard.js'
import { useAccountantCalculator } from './useAccountantCalculator.js'

export type Position = { x: number; y: number }

export type AccountantCalculatorProps = {
  /** Whether the calculator shows. Closing hides it, keeping its number, memory, place, and size for the next time. */
  open: boolean
  /** Called with false when its close button is pressed; pass a setter to let a host button toggle it. */
  onOpenChange?: (open: boolean) => void
  /** The title bar's text and the window's accessible name. */
  title?: string
  /** Where the window's top-left corner first appears, in pixels from the viewport's; the top-right by default. */
  defaultPosition?: Position
  /** The locale numbers are grouped in; the browser's own when left out. */
  locale?: string
  /**
   * Called with each value = works out, as decimal text with two places and no grouping, such as "-1234.50", and the
   * expression it came from as the display writes it, such as "100.00 + 5.00".
   */
  onResult?: (value: string, expression: string) => void
  className?: string
}

/** One button. `id` names its class, pac-key-<id>, which also places the number pad's keys. */
type KeyDef = {
  key: CalculatorKey
  id: string
  text: string
  name: string
  title: string
  kind: 'function' | 'pad' | 'operator' | 'equals'
}

const FUNCTION_KEYS: KeyDef[] = [
  { key: 'MS', id: 'ms', text: 'MS', name: 'Memory store', title: 'Store the value in the memory (hold M, press S)', kind: 'function' },
  { key: 'MR', id: 'mr', text: 'MR', name: 'Memory recall', title: 'Recall the memory (hold M, press R)', kind: 'function' },
  { key: 'M+', id: 'm-plus', text: 'M+', name: 'Memory add', title: 'Add the value to the memory (hold M, press +)', kind: 'function' },
  { key: 'M-', id: 'm-minus', text: 'M−', name: 'Memory subtract', title: 'Subtract the value from the memory (hold M, press -)', kind: 'function' },
  { key: 'MC', id: 'mc', text: 'MC', name: 'Memory clear', title: 'Clear the memory (hold M, press C)', kind: 'function' },
  { key: 'CE', id: 'clear-entry', text: 'CE', name: 'Clear entry', title: 'Clear the number being entered', kind: 'function' },
  { key: '(', id: 'open', text: '(', name: 'Open parenthesis', title: 'Open parenthesis', kind: 'function' },
  { key: ')', id: 'close', text: ')', name: 'Close parenthesis', title: 'Close parenthesis', kind: 'function' },
  { key: 'sqrt', id: 'sqrt', text: '√', name: 'Square root', title: 'Square root (@)', kind: 'function' },
  { key: '^', id: 'power', text: 'xʸ', name: 'Power', title: 'Raise to a whole power (^)', kind: 'function' },
  { key: '%', id: 'percent', text: '%', name: 'Percent', title: 'Percent: 100 + 5% is 105', kind: 'function' },
  { key: '+/-', id: 'sign', text: '±', name: 'Change sign', title: 'Change the sign of the number (F9)', kind: 'function' },
]

function padKeys(locale: string | undefined): KeyDef[] {
  const digit = (d: CalculatorKey): KeyDef => ({ key: d, id: d, text: d, name: d, title: d, kind: 'pad' })
  return [
    { key: 'C', id: 'clear', text: 'C', name: 'Clear', title: 'Clear everything but the memory (Esc)', kind: 'function' },
    { key: '/', id: 'divide', text: '÷', name: 'Divide', title: 'Divide (/)', kind: 'operator' },
    { key: '*', id: 'multiply', text: '×', name: 'Multiply', title: 'Multiply (*)', kind: 'operator' },
    { key: '-', id: 'subtract', text: '−', name: 'Subtract', title: 'Subtract (-)', kind: 'operator' },
    digit('7'), digit('8'), digit('9'),
    { key: '+', id: 'add', text: '+', name: 'Add', title: 'Add (+)', kind: 'operator' },
    digit('4'), digit('5'), digit('6'),
    digit('1'), digit('2'), digit('3'),
    { key: '=', id: 'equals', text: '=', name: 'Equals', title: 'Work it out (Enter)', kind: 'equals' },
    digit('0'),
    { key: '.', id: 'decimal', text: decimalSeparator(locale), name: 'Decimal point', title: 'Decimal point', kind: 'pad' },
  ]
}

/** How long a key shows as pressed. */
const PRESS_MS = 150
const MARGIN = 16
/** How much of the window must stay on screen, so its title bar can always be grabbed again. */
const KEEP_VISIBLE = 80

function clamp(position: Position, width: number): Position {
  return {
    x: Math.min(Math.max(position.x, KEEP_VISIBLE - width), window.innerWidth - KEEP_VISIBLE),
    y: Math.min(Math.max(position.y, 0), window.innerHeight - 40),
  }
}

/**
 * Accountant's Calculator: a floating calculator that works in decimal money, with operator precedence, parentheses,
 * powers, square roots, accounting percent, memory, and a copyable display. While open, it takes the keyboard everywhere
 * but text fields.
 */
export function AccountantCalculator({
  open,
  onOpenChange,
  title = 'Calculator',
  defaultPosition,
  locale,
  onResult,
  className,
}: AccountantCalculatorProps) {
  const { state, press, enter } = useAccountantCalculator({ onResult, locale })
  const root = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(defaultPosition ?? null)
  const [copied, setCopied] = useState<'Copied' | 'Could not copy' | null>(null)
  const [pressed, setPressed] = useState<{ key: CalculatorKey } | null>(null)
  const drag = useRef<{ pointer: Position; from: Position } | null>(null)
  const screen = screenOf(state, locale)

  const pressAndShow = useCallback(
    (key: CalculatorKey) => {
      press(key)
      setPressed({ key })
    },
    [press],
  )

  // The first time it opens, it takes the top-right corner unless told otherwise.
  useLayoutEffect(() => {
    if (!open || position || !root.current) return
    setPosition({ x: window.innerWidth - root.current.offsetWidth - MARGIN, y: MARGIN })
  }, [open, position])

  useEffect(() => {
    if (open) root.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    let memoryHeld = false
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (isMemoryHold(event)) {
        memoryHeld = true
        return
      }
      const key = keyFromEvent(event, memoryHeld)
      if (!key) return
      event.preventDefault()
      pressAndShow(key)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (isMemoryHold(event)) memoryHeld = false
    }
    // A key released while the page is in the background never sends its keyup.
    const onBlur = () => {
      memoryHeld = false
    }
    const onResize = () => setPosition((p) => (p && root.current ? clamp(p, root.current.offsetWidth) : p))
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
    }
  }, [open, pressAndShow])

  // Ctrl+C and Ctrl+V reach the calculator only when no text is selected and no field has focus.
  useEffect(() => {
    if (!open) return
    const onCopy = (event: ClipboardEvent) => {
      const selection = document.getSelection()
      if (screen.isError || isTypingTarget(event.target) || (selection && !selection.isCollapsed)) return
      if (!event.clipboardData) return
      event.clipboardData.setData('text/plain', screen.value)
      event.preventDefault()
      setCopied('Copied')
    }
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return
      const value = parseMoney(event.clipboardData?.getData('text/plain') ?? '', locale)
      if (!value) return
      event.preventDefault()
      enter(value)
    }
    window.addEventListener('copy', onCopy)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('paste', onPaste)
    }
  }, [open, screen.value, screen.isError, locale, enter])

  useEffect(() => {
    if (!pressed) return
    const timer = setTimeout(() => setPressed(null), PRESS_MS)
    return () => clearTimeout(timer)
  }, [pressed])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(screen.value)
      setCopied('Copied')
    } catch {
      setCopied('Could not copy')
    }
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !position || (event.target as HTMLElement).closest('button')) return
    drag.current = { pointer: { x: event.clientX, y: event.clientY }, from: position }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || !root.current) return
    setPosition(clamp({ x: d.from.x + event.clientX - d.pointer.x, y: d.from.y + event.clientY - d.pointer.y }, root.current.offsetWidth))
  }

  function endDrag() {
    drag.current = null
  }

  const button = (k: KeyDef) => (
    <button key={k.key} type="button"
      className={`pac-key pac-key-${k.kind} pac-key-${k.id}${pressed?.key === k.key ? ' pac-key-pressed' : ''}`}
      title={k.title} aria-label={k.name} onClick={() => pressAndShow(k.key)}>
      {k.text}
    </button>
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <div ref={root} className={`pac${className ? ` ${className}` : ''}`} role="dialog" aria-label={title} tabIndex={-1}
      hidden={!open} style={position ? { left: position.x, top: position.y } : { visibility: 'hidden' }}>
      <div className="pac-titlebar" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
        onPointerCancel={endDrag}>
        <span className="pac-title">{title}</span>
        <button type="button" className="pac-close" onClick={() => onOpenChange?.(false)} title="Close the calculator"
          aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
      <div className="pac-display">
        <div className="pac-eyebrow">
          <span className="pac-memory" title={screen.memory ? 'A number is in memory' : undefined}>
            {screen.memory ? 'M' : ''}
          </span>
          <span className="pac-expression">{screen.expression}</span>
        </div>
        <div className="pac-output-row">
          <output className={`pac-value${screen.isError ? ' pac-value-error' : ''}`} aria-live="polite">{screen.value}</output>
          <button type="button" className="pac-copy" disabled={screen.isError} onClick={copy}
            title={copied ?? 'Copy what the display shows'} aria-label={copied ?? 'Copy'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {copied === 'Copied'
                ? <path d="M5 12.5l4.5 4.5L19 7.5" />
                : <><rect x="9" y="9" width="11" height="11" rx="1" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></>}
            </svg>
          </button>
        </div>
      </div>
      <div className="pac-keys">
        <div className="pac-functions">{FUNCTION_KEYS.map(button)}</div>
        <div className="pac-pad">{padKeys(locale).map(button)}</div>
      </div>
    </div>,
    document.body,
  )
}
