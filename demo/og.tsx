import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { AccountantCalculator } from '../src/index.ts'
import '../src/styles.css'
import './demo.css'
import './og.css'

// Typed into the real calculator once it is listening, so the card shows it working: 1,000 at 5% for 3 years.
const KEYS = ['1', '0', '0', '0', '*', '(', '1', '+', '0', '.', '0', '5', ')', '^', '3', 'Enter']

// No StrictMode: it runs effects twice in development, which would type every key twice.
function Card() {
  // React runs a child's effects first, so the calculator's keyboard listener is in place for these keys.
  useEffect(() => {
    for (const key of KEYS) window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  }, [])

  return (
    <div className="og">
      <p className="chip"><span className="chip-dot" aria-hidden="true" />React 18+ · MIT</p>
      <h1>Accountant's <span className="shine">Calculator</span></h1>
      <p className="og-lede">A floating calculator component for React tuned to the needs of accountants.</p>
      <p className="og-url">calc.pluperfect.dev</p>
      <AccountantCalculator open className="og-calc" defaultPosition={{ x: 780, y: 43 }} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Card />)
