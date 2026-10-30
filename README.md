# Accountant's Calculator

[![Package](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/actions/workflows/package.yml/badge.svg)](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/actions/workflows/package.yml)

A floating calculator component for React that computes in decimal money. Demo:
[calc.pluperfect.dev](https://calc.pluperfect.dev).

## Contents

- [Features](#features)
- [Install](#install)
- [Usage](#usage)
- [Props](#props)
- [Window](#window)
- [Keyboard](#keyboard)
- [Arithmetic](#arithmetic)
- [Memory](#memory)
- [Display](#display)
- [Clipboard](#clipboard)
- [Styling](#styling)
- [API](#api)
- [Development](#development)
- [License](#license)

## Features

- Decimal arithmetic on `BigInt`, no floating point. Results round to 2 places, half away from zero.
- Operator precedence, parentheses, powers, square roots, and accounting percent (`100 + 5%` is `105.00`).
- Memory: MS, MR, M+, M−, and MC.
- Keyboard input anywhere on the page, numpad included, except in editable elements.
- Copy and paste through the system clipboard.
- A floating window: portaled to `document.body`, draggable, resizable, and stacked above the page.
- Themed with CSS custom properties. No runtime dependencies.

## Install

The package is not on a registry. Each [release](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/releases)
attaches it in two formats with identical contents:

| File | Contents | Install command |
|---|---|---|
| `pluperfect-react-accountant-calculator-<version>.zip` | One folder, `react-accountant-calculator/` | `npm install ./vendor/react-accountant-calculator` |
| `pluperfect-react-accountant-calculator-<version>.tgz` | An npm tarball | `npm install ./vendor/pluperfect-react-accountant-calculator-<version>.tgz` |

1. Put the download in a `vendor/` folder beside your project's `package.json`, unzipping the `.zip` there.
2. Run the install command from the project folder. It adds a `file:` dependency to `package.json`.
3. Commit `vendor/`. If `.gitignore` excludes `dist/`, re-include the package's:

   ```gitignore
   dist/
   !vendor/react-accountant-calculator/dist/
   ```

To upgrade, install the newer file and delete the old one.

| Requirement | |
|---|---|
| Peer dependencies | `react` and `react-dom` 18 or later |
| Runtime dependencies | None |
| Module format | ES modules, with TypeScript declarations |

## Usage

```tsx
import { useState } from 'react'
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
}
```

Visibility is controlled by the host. Closing hides the window without unmounting it, so the value, memory, position,
and size persist across toggles.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | Required | Whether the window shows. |
| `onOpenChange` | `(open: boolean) => void` | | Called with `false` when the close button is pressed. |
| `title` | `string` | `'Calculator'` | Title bar text and the dialog's accessible name. |
| `defaultPosition` | `{ x: number; y: number }` | Top right, 16px inset | Initial top-left corner, in viewport pixels. |
| `locale` | `string` | The browser's | Grouping and decimal separator, for display and paste. |
| `onResult` | `(value: string, expression: string) => void` | | Called on each `=`. |
| `className` | `string` | | Added to the root element. |

`onResult` arguments:

| Argument | Format | Example |
|---|---|---|
| `value` | Fixed 2 places, no grouping, `.` as the separator | `"-1234.50"` |
| `expression` | As the display writes it, in `locale` | `"100.00 + 5.00"` |

`value` is a string so it reaches the host without passing through a `number`.

## Window

| Behavior | Detail |
|---|---|
| Move | Drag the title bar with a mouse, pen, or touch. At least 80px stays on screen. |
| Resize | Drag the bottom-right corner. Minimum 15rem × 26rem, maximum the viewport less 1rem. Keys scale with the window. |
| Close | The × in the title bar calls `onOpenChange(false)`. |
| Stacking | `z-index: var(--pac-z)`, `2147483000` by default. |
| Pressed state | A clicked or typed key carries `.pac-key-pressed` for 150 ms. |

Layout:

```
MS  MR  M+  M−      function keys
MC  CE  (   )
√   xʸ  %   ±

C   ÷   ×   −       number pad
7   8   9   +
4   5   6   +
1   2   3   =
0   0   .   =
```

## Keyboard

While the window is open, `keydown` on `window` is captured unless the target is a text-like `<input>`, a
`<textarea>`, a `<select>`, or a `contenteditable` element. Keys held with Ctrl, Alt, or ⌘ are not captured, apart from
copy and paste ([Clipboard](#clipboard)).

| Key | Action |
|---|---|
| `0`–`9`, `.` | Digits and the decimal point |
| `+` `-` `*` `/` | Operators. `x` also multiplies. |
| `^` | Power |
| `@` | Square root |
| `(` `)` | Parentheses |
| `%` | Percent |
| `Enter`, `=` | Evaluate |
| `Backspace` | Delete the last digit typed |
| `Escape` | C |
| `F9` | Change sign |
| `M` held with `S`, `R`, `+`, `-`, or `C` | MS, MR, M+, M−, or MC |

The numpad is read by `event.code`, so it works with Num Lock off, and its decimal key enters a decimal point in any
locale. CE and Delete have no binding.

## Arithmetic

| Rule | Behavior | Example |
|---|---|---|
| Precision | 20 decimal places within a calculation | `0.1 + 0.2 =` → `0.30` |
| Rounding | Each result rounds to 2 places, half away from zero | `1 ÷ 8 =` → `0.13`, `-1 ÷ 8 =` → `-0.13` |
| Chaining | A calculation continues from the rounded result | `10 ÷ 3 =` then `× 3 =` → `9.99` |
| Entry limits | 2 decimal places, 15 integer digits | |
| Precedence | `( )`, then `^`, then `×` `÷`, then `+` `−` | `2 + 3 × 4 =` → `14.00` |
| Associativity | `^` is right-associative | `2 ^ 3 ^ 2 =` → `512.00` |
| Powers | Integer exponents only; negatives allowed | `2 ^ -1 =` → `0.50` |
| Percent after `+` or `−` | That percent of the total to its left | `100 + 5% =` → `105.00` |
| Percent otherwise | Divides by 100 | `100 × 5% =` → `5.00` |
| Square root | Applies at once to the entry, a closed group, or a result | `9 √` → `3.00` |
| Repeated `=` | Reapplies the last operator and operand | `100 + 5 = = =` → `115.00` |
| After a result | A digit starts a new calculation; an operator continues it | |
| Implicit multiplication | A number beside a parenthesis | `2(3) =` → `6.00` |
| Unclosed parentheses | Closed on `=` | `(2 + 3 =` → `5.00` |
| Repeated operator | The second replaces the first | `5 + × 2 =` → `10.00` |

| Error | Cause |
|---|---|
| `Cannot divide by zero` | A division by zero, or a negative power of zero |
| `Invalid input` | The square root of a negative number |
| `Powers must be whole numbers` | A fractional exponent |
| `Result is too large` | More than 15 integer digits |

An error replaces the value until the next key, which starts a new calculation. Memory is kept.

## Memory

| Button | Keys | Effect |
|---|---|---|
| MS | M + S | Store the value |
| MR | M + R | Recall the memory as the entry; the next digit replaces it |
| M+ | M + `+` | Add the value to the memory |
| M− | M + `-` | Subtract the value from the memory |
| MC | M + C | Clear the memory |

MS, M+, and M− evaluate a pending expression first, as `=` would. C and errors leave the memory intact. `.pac-memory`
shows `M` while the memory holds a value.

## Display

| Line | Content |
|---|---|
| Value | The entry, result, or error. Money format: 2 places with the locale's grouping. `0.00` when nothing is entered. |
| Expression | The pending expression, or the evaluated one followed by `=`, in the same format |

## Clipboard

| Action | Trigger | Behavior |
|---|---|---|
| Copy | The copy button, Ctrl+C, or ⌘C | Writes the value as displayed, such as `1,234.50`, as `text/plain` |
| Paste | Ctrl+V or ⌘V | Parses one number with `parseMoney` and enters it as MR would |

Ctrl+C and Ctrl+V are handled only while focus is outside editable elements and no text is selected, so the page's
own copy and paste keep working.

Paste accepts the locale's grouping, which must be the locale's own or groups of three, and its decimal separator. It
also accepts a currency symbol before or after the number, and a minus sign or accounting parentheses. Values round
to 2 places. Anything else, or more than 15 integer digits, is ignored.

| Clipboard | Locale | Entered |
|---|---|---|
| `1,234.567` | `en-US` | `1,234.57` |
| `$1,234.56` | `en-US` | `1,234.56` |
| `(1,234.56)` | `en-US` | `-1,234.56` |
| `-$5` | `en-US` | `-5.00` |
| `1.234,56 €` | `de-DE` | `1.234,56` |
| `12,34` | `en-US` | Ignored |

## Styling

`styles.css` is the entire default theme. Override its custom properties on `.pac` or an ancestor:

```css
.my-calculator {
  --pac-font: inherit;
  --pac-body: #ffffff;
  --pac-screen: #f4f5f7;
  --pac-screen-text: #222222;
  --pac-equals-key: #0066cc;
}
```

| Property | Applies to |
|---|---|
| `--pac-font` | Every font in the window |
| `--pac-body`, `--pac-body-edge` | Window background and border |
| `--pac-titlebar`, `--pac-titlebar-text` | Title bar |
| `--pac-close`, `--pac-close-text` | Close button |
| `--pac-screen`, `--pac-screen-text`, `--pac-screen-muted`, `--pac-screen-edge` | Display |
| `--pac-key`, `--pac-key-text` | Digits and the decimal point |
| `--pac-function-key`, `--pac-function-key-text` | Memory keys, C, CE, parentheses, √, xʸ, %, ± |
| `--pac-operator-key`, `--pac-operator-key-text` | ÷ × − + |
| `--pac-equals-key`, `--pac-equals-key-text` | = |
| `--pac-key-edge` | Raised edge under every key |
| `--pac-pressed-highlight` | Pressed-key glow |
| `--pac-radius`, `--pac-gap` | Corner radius and spacing |
| `--pac-z` | Stacking order |

| Class | Element |
|---|---|
| `pac` | Root, with `className` appended |
| `pac-titlebar`, `pac-title`, `pac-close` | Title bar, its text, the close button |
| `pac-display`, `pac-eyebrow`, `pac-memory`, `pac-expression` | Display, its top line, the memory indicator, the expression |
| `pac-output-row`, `pac-value`, `pac-value-error`, `pac-copy` | Value row, the value, the value in an error, the copy button |
| `pac-keys`, `pac-functions`, `pac-pad` | Both key blocks, the function block, the number pad |
| `pac-key` | Every key |
| `pac-key-function`, `pac-key-pad`, `pac-key-operator`, `pac-key-equals` | A key's kind |
| `pac-key-<id>` | One key: `ms`, `mr`, `m-plus`, `m-minus`, `mc`, `clear-entry`, `open`, `close`, `sqrt`, `power`, `percent`, `sign`, `clear`, `divide`, `multiply`, `subtract`, `add`, `equals`, `decimal`, `0`–`9` |
| `pac-key-pressed` | A key showing as pressed |

Leave out `styles.css` to start unstyled.

## API

Everything is exported from `@pluperfect/react-accountant-calculator`.

| Export | Signature | Notes |
|---|---|---|
| `AccountantCalculator` | `(props: AccountantCalculatorProps) => ReactPortal \| null` | The window, portaled to `document.body`. `null` without a DOM. |
| `useAccountantCalculator` | `(options?: { onResult?, locale? }) => { state, press, enter }` | State for custom UIs. `press(key: CalculatorKey)`, `enter(value: Decimal)`. |
| `pressKey` | `(state: CalculatorState, key: CalculatorKey) => CalculatorState` | The engine: a pure reducer. |
| `enterValue` | `(state: CalculatorState, value: Decimal) => CalculatorState` | Enters a whole value as MR does, rounded to 2 places. |
| `evaluate` | `(tokens: Token[]) => Decimal` | Unrounded. Throws on an error. |
| `initialCalculatorState` | `CalculatorState` | |
| `MONEY_PLACES` | `2` | |
| `screenOf` | `(state: CalculatorState, locale?: string) => Screen` | `{ expression, value, isError, memory }` |
| `formatMoney` | `(value: Decimal, locale?: string) => string` | |
| `parseMoney` | `(text: string, locale?: string) => Decimal \| null` | Paste parsing, rounded to 2 places. |
| `keyFromEvent` | `(event: Pick<KeyboardEvent, 'key' \| 'code' \| 'ctrlKey' \| 'metaKey' \| 'altKey'>, memoryHeld?: boolean) => CalculatorKey \| null` | |
| `isMemoryHold` | `(event: Pick<KeyboardEvent, 'key'>) => boolean` | Whether the key is M. |
| `Decimal` | class | See below. |

```ts
type CalculatorKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.'
  | '+' | '-' | '*' | '/' | '^' | '(' | ')' | '=' | '%' | 'sqrt' | '+/-'
  | 'MS' | 'MR' | 'M+' | 'M-' | 'MC' | 'backspace' | 'C' | 'CE'
```

`Decimal` is immutable: `units × 10^-scale`, with `units` a `bigint`.

| Member | |
|---|---|
| `Decimal.parse(text)`, `Decimal.of(units, scale?)` | Construction. `parse` takes `-?\d*(\.\d*)?` and throws `RangeError` otherwise. |
| `Decimal.ZERO`, `Decimal.ONE`, `Decimal.HUNDRED` | Constants |
| `plus`, `minus`, `times`, `dividedBy`, `negated()` | Arithmetic. `times` and `dividedBy` round to 20 places; `dividedBy` throws `RangeError` on zero. |
| `squareRoot()`, `toPower(exponent: bigint)` | 20 places. `squareRoot` throws `RangeError` on a negative. |
| `roundTo(places)` | Half away from zero |
| `isZero()`, `isNegative()`, `isWhole()`, `integerDigits()` | Queries |
| `toFixed(places)`, `toString()` | Text without grouping |

Also exported as types: `AccountantCalculatorProps`, `Position`, `UseAccountantCalculatorOptions`, `CalculatorState`,
`Digit`, `MemoryKey`, `Operator`, `Token`, and `Screen`.

## Development

Node 24.

| Command | Does |
|---|---|
| `npm install` | Install dependencies |
| `npm test` | Vitest, on jsdom |
| `npm run typecheck` | `tsc` over the source, tests, and demo |
| `npm run build` | `dist/`: ES modules, declarations, and `styles.css` |
| `npm run demo` | The demo page, on Vite's dev server |

## License

[MIT](LICENSE)
