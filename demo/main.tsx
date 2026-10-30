import { StrictMode, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { version } from '../package.json'
import { AccountantCalculator, Decimal, formatMoney, type Position } from '../src/index.ts'
import '../src/styles.css'
import './demo.css'

const SOURCE = 'https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator'
/** Redirects to the newest release, so it needs no rebuild when one ships. */
const LATEST = `${SOURCE}/releases/latest`
/** Read when the page loads, for the download links, which name a tag. Unauthenticated: 60 requests an hour per IP. */
const LATEST_API = 'https://api.github.com/repos/mnwachukwu/Pluperfect.ReactAccountantCalculator/releases/latest'

type Asset = { name: string; browser_download_url: string }
type Release = { tag_name: string; assets: Asset[] }

// 'none' is a repository with no release yet; 'unavailable' is a question that could not be asked (a rate limit, an
// outage, offline), which must not claim there is no release.
type Latest =
  | { status: 'loading' }
  | { status: 'ready'; tag: string; zip: Asset | undefined; tgz: Asset | undefined }
  | { status: 'none' }
  | { status: 'unavailable' }

function useLatestRelease(): Latest {
  const [latest, setLatest] = useState<Latest>({ status: 'loading' })
  useEffect(() => {
    let canceled = false
    fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => {
        if (response.status === 404) return null
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<Release>
      })
      .then((release) => {
        if (canceled) return
        if (!release) {
          setLatest({ status: 'none' })
          return
        }
        const find = (extension: string) => release.assets.find((a) => a.name.endsWith(extension))
        setLatest({ status: 'ready', tag: release.tag_name, zip: find('.zip'), tgz: find('.tgz') })
      })
      .catch(() => {
        if (!canceled) setLatest({ status: 'unavailable' })
      })
    return () => {
      canceled = true
    }
  }, [])
  return latest
}

/** Where the calculator starts docked beside the hero; narrower screens hide the dock. */
const WIDE = '(min-width: 64rem)'

const FEATURES = [
  { glyph: '0.30', title: 'Money, not floats', text: 'Every number is decimal, so 0.1 + 0.2 is 0.30. Results round to cents, half away from zero.' },
  { glyph: '+5%', title: 'Accounting percent', text: '100 + 5% is 105.00 and 100 − 5% is 95.00, as on an adding machine.' },
  { glyph: 'M+', title: 'Memory', text: 'MS, MR, M+, M−, and MC, from the buttons or by holding M and pressing a key.' },
  { glyph: '789', title: 'The keyboard, anywhere', text: 'While it is open, the numpad and keys work anywhere on the page except text fields.' },
  { glyph: '⌃V', title: 'Copy and paste', text: 'Ctrl+C copies the value. Ctrl+V takes a number with its currency symbol and grouping, rounded to cents.' },
  { glyph: '--pac', title: 'Yours to style', text: 'It floats on top, moves, and resizes. Every color is a CSS variable.' },
]

const KEYS: { keys: ReactNode; does: string }[] = [
  { keys: <><kbd>0</kbd>–<kbd>9</kbd> <kbd>.</kbd></>, does: 'Enter a number' },
  { keys: <><kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd></>, does: 'Add, subtract, multiply, divide' },
  { keys: <><kbd>^</kbd> <kbd>@</kbd></>, does: 'Power, square root' },
  { keys: <><kbd>(</kbd> <kbd>)</kbd></>, does: 'Parentheses' },
  { keys: <kbd>%</kbd>, does: 'Percent' },
  { keys: <><kbd>Enter</kbd> <kbd>=</kbd></>, does: 'Work it out' },
  { keys: <kbd>Backspace</kbd>, does: 'Delete the last digit' },
  { keys: <kbd>Esc</kbd>, does: 'Clear everything but the memory' },
  { keys: <kbd>F9</kbd>, does: 'Change the sign' },
  { keys: <>Hold <kbd>M</kbd>, then <kbd>S</kbd> <kbd>R</kbd> <kbd>+</kbd> <kbd>-</kbd> <kbd>C</kbd></>, does: 'MS, MR, M+, M−, MC' },
  { keys: <><kbd>Ctrl</kbd>+<kbd>C</kbd></>, does: 'Copy the value' },
  { keys: <><kbd>Ctrl</kbd>+<kbd>V</kbd></>, does: 'Paste a number' },
]

const install = (tarball: string) => `# Your project's folder, the one with package.json in it
cd path/to/your-app

# The .zip, unzipped into its vendor folder
npm install ./vendor/react-accountant-calculator

# Or the .tgz, saved in its vendor folder
npm install ./vendor/${tarball}`

const USAGE = `import { useState } from 'react'
import { AccountantCalculator } from '@pluperfect/react-accountant-calculator'
import '@pluperfect/react-accountant-calculator/styles.css'

export function Toolbar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)}>Calculator</button>
      <AccountantCalculator open={open} onOpenChange={setOpen} />
    </>
  )
}`

function Code({ name, children }: { name: string; children: string }) {
  return (
    <figure className="code">
      <figcaption className="code-bar">
        <span className="code-name">{name}</span>
        <span className="code-controls" aria-hidden="true">
          <span><svg viewBox="0 0 10 10"><path d="M0 5.5h10" /></svg></span>
          <span><svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" /></svg></span>
          <span className="code-close"><svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" /></svg></span>
        </span>
      </figcaption>
      <pre><code>{children}</code></pre>
    </figure>
  )
}

function Demo() {
  const [open, setOpen] = useState(() => window.matchMedia(WIDE).matches)
  const [last, setLast] = useState<{ value: string; expression: string } | null>(null)
  const [sample, setSample] = useState('Copy $1,234.567 to paste in')
  const latest = useLatestRelease()
  const dock = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  // Undefined until measured, so the calculator mounts once, already in place: in the dock on a wide screen, and just
  // below the toggle on a narrow one, where its usual top-right corner would cover it.
  const [start, setStart] = useState<Position>()

  useLayoutEffect(() => {
    const docked = dock.current?.getBoundingClientRect()
    if (docked && docked.width > 0) {
      setStart({ x: docked.left, y: Math.max(16, docked.top) })
      return
    }
    // The calculator's width is 18rem in styles.css.
    const width = 18 * parseFloat(getComputedStyle(document.documentElement).fontSize)
    const below = toggle.current?.getBoundingClientRect().bottom ?? 0
    setStart({ x: Math.max(8, window.innerWidth - width - 16), y: below + 12 })
  }, [])

  async function copySample() {
    try {
      await navigator.clipboard.writeText('$1,234.567')
      setSample('Copied. Now press Ctrl+V')
    } catch {
      setSample('This browser would not copy it')
    }
  }

  return (
    <div className="page">
      <button ref={toggle} type="button" className="toggle" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
          <path d="M5 4.5h6M5.5 8h1M7.5 8h1M9.5 8h1M5.5 11h1M7.5 11h1M9.5 11h1" />
        </svg>
        {open ? 'Hide the calculator' : 'Show the calculator'}
      </button>

      <header className="hero">
        <div className="hero-text">
          <p className="chip"><span className="chip-dot" aria-hidden="true" />React component · v{version} · MIT</p>
          <h1>Accountant's <span className="shine">Calculator</span></h1>
          <p className="lede">
            A floating calculator for React that works in money. Every number is decimal, never floating point, and
            every result rounds to cents.
          </p>
          <div className="actions">
            <a className="button button-primary" href="#install">Add it to your app</a>
            <a className="button button-ghost" href={SOURCE}>Source on GitHub</a>
          </div>

          <section className="readout" aria-labelledby="readout-label" aria-live="polite">
            <h2 id="readout-label" className="readout-label">Last calculation</h2>
            <p className="readout-expression">{last ? `${last.expression} =` : 'Press = on the calculator'}</p>
            <p className={`readout-value${last ? '' : ' readout-empty'}`}>
              {last ? formatMoney(Decimal.parse(last.value)) : formatMoney(Decimal.ZERO)}
            </p>
          </section>
        </div>
        <div ref={dock} className="dock" aria-hidden="true">
          <span>Drag it anywhere. It stays on top.</span>
        </div>
      </header>

      <section className="section" aria-labelledby="features">
        <h2 id="features">Main features</h2>
        <div className="features">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature">
              <span className="glyph" aria-hidden="true">{f.glyph}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="try">
        <h2 id="try">Try it</h2>
        <div className="try">
          <ul className="examples">
            <li><code>100 + 5% =</code><span>105.00</span></li>
            <li><code>1000 × (1 + 0.05) ^ 3 =</code><span>1,157.63</span></li>
            <li><code>0.1 + 0.2 =</code><span>0.30</span></li>
            <li><code>10 ÷ 3 =</code> then <code>× 3 =</code><span>9.99</span></li>
          </ul>
          <div className="panel">
            <button type="button" className="button button-ghost" onClick={copySample}>{sample}</button>
            <label className="field">
              <span>A text field, which keeps its own keypresses</span>
              <input type="text" placeholder="Type here" />
            </label>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="keys">
        <h2 id="keys">Keys</h2>
        <dl className="keys">
          {KEYS.map((k) => (
            <div key={k.does} className="key-row">
              <dt>{k.keys}</dt>
              <dd>{k.does}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="install" className="section" aria-labelledby="use">
        <h2 id="use">Add it to your app</h2>
        <p className="muted">
          Download the package as a .zip or a .tgz into a <code>vendor</code> folder in your project, beside
          package.json, which keeps downloaded packages apart from your own files. Then install it from the project's
          folder. That adds it as a <code>file:</code> dependency, so commit it with your project. React 18 or later.
        </p>
        <div className="actions">
          {latest.status === 'ready' ? (
            <>
              {latest.zip && (
                <a className="button button-primary" href={latest.zip.browser_download_url}>Download {latest.tag} .zip</a>
              )}
              {latest.tgz && (
                <a className="button button-primary" href={latest.tgz.browser_download_url}>Download {latest.tag} .tgz</a>
              )}
            </>
          ) : latest.status !== 'none' && (
            <a className="button button-primary" href={LATEST}>Latest release</a>
          )}
          <a className="button button-ghost" href={`${SOURCE}/releases`}>Every release</a>
        </div>
        {latest.status === 'none' && <p className="muted">No release has been published yet.</p>}
        {latest.status === 'unavailable' && (
          <p className="muted">GitHub did not answer for the download links, so the button opens the latest release.</p>
        )}
        <Code name="Terminal">
          {install(latest.status === 'ready' && latest.tgz ? latest.tgz.name : 'pluperfect-react-accountant-calculator-<version>.tgz')}
        </Code>
        <Code name="Toolbar.tsx">{USAGE}</Code>
      </section>

      <footer className="footer">
        <a href={`${SOURCE}/blob/main/LICENSE`}>MIT License</a>
        <a href={SOURCE}>Source on GitHub</a>
        <a href="https://pluperfect.dev">Pluperfect Development</a>
        <span className="footer-name">Created by Matt Nwachukwu</span>
      </footer>

      {start !== undefined && (
        <AccountantCalculator
          open={open}
          onOpenChange={setOpen}
          onResult={(value, expression) => setLast({ value, expression })}
          defaultPosition={start}
        />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)
