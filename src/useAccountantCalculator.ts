import { useCallback, useEffect, useRef, useState } from 'react'
import type { Decimal } from './decimal.js'
import {
  MONEY_PLACES, enterValue, initialCalculatorState, pressKey, type CalculatorKey, type CalculatorState,
} from './engine.js'
import { formatExpression } from './format.js'

export type UseAccountantCalculatorOptions = {
  /**
   * Called with each value = works out, as decimal text with two places and no grouping, such as "-1234.50", and the
   * expression it came from as the display writes it, such as "100.00 + 5.00".
   */
  onResult?: ((value: string, expression: string) => void) | undefined
  /** The locale the expression given to onResult is written in; the browser's own when left out. */
  locale?: string | undefined
}

/** The calculator's state, a press function, and an enter function for whole values such as pasted ones. */
export function useAccountantCalculator({ onResult, locale }: UseAccountantCalculatorOptions = {}) {
  const [state, setState] = useState<CalculatorState>(initialCalculatorState)
  const press = useCallback((key: CalculatorKey) => setState((s) => pressKey(s, key)), [])
  const enter = useCallback((value: Decimal) => setState((s) => enterValue(s, value)), [])

  const latest = useRef({ onResult, locale })
  useEffect(() => {
    latest.current = { onResult, locale }
  })
  const reported = useRef(state.evaluated)
  useEffect(() => {
    const { evaluated } = state
    if (evaluated && evaluated !== reported.current) {
      latest.current.onResult?.(evaluated.value.toFixed(MONEY_PLACES), formatExpression(evaluated.tokens, latest.current.locale))
    }
    reported.current = evaluated
  }, [state.evaluated])

  return { state, press, enter }
}
