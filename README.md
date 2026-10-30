# Accountant's Calculator

[![Package](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/actions/workflows/package.yml/badge.svg)](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/actions/workflows/package.yml)
[![Site](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/actions/workflows/site.yml/badge.svg)](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/actions/workflows/site.yml)

Accountant's Calculator is a floating calculator for React that works in money. Every number is decimal, never
floating point, and every result rounds to cents. It works out expressions with operator precedence and parentheses,
does accounting percent (100 + 5% is 105.00), keeps a memory, takes the numpad and keyboard anywhere on the page, and
copies what its display shows.

It ships with a plain, retro look meant to be restyled. Every color and size is a CSS variable.

Try it at [calc.pluperfect.dev](https://calc.pluperfect.dev).

## Install

The package is `@pluperfect/react-accountant-calculator`, and it is not on a registry. Each
[release](https://github.com/mnwachukwu/Pluperfect.ReactAccountantCalculator/releases) carries it twice, as a `.zip`
and as a `.tgz` holding the same files. Download either one into a `vendor` folder in your project's folder, the one
with `package.json` in it, which keeps downloaded packages apart from your own files. Then run the install from the
project's folder.

The `.zip` holds one folder, `react-accountant-calculator`. Unzip it into `vendor`, then:

```bash
npm install ./vendor/react-accountant-calculator
```

Or save the `.tgz` in `vendor`, then:

```bash
npm install ./vendor/pluperfect-react-accountant-calculator-1.0.0.tgz
```

Either adds it to `package.json` as a `file:` dependency, so commit the `vendor` folder with your project. If your
`.gitignore` ignores `dist/`, make an exception for the unzipped folder's, or a fresh clone installs it without its
code. To upgrade, install the newer download the same way and delete the old one.

React and React DOM 18 or later are peer dependencies. It has no other dependencies.

## Use

The host owns whether it shows. Pass `open`, and a setter as `onOpenChange` so its close button can hide it:

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

The calculator renders into `document.body`, so it sits above everything on the page. Closing it hides it without
unmounting it, so its number, memory, place, and size are the same when it opens again.

| Prop | | |
|---|---|---|
| `open` | `boolean` | Whether it shows. Required. |
| `onOpenChange` | `(open: boolean) => void` | Called with `false` when its close button is pressed. |
| `title` | `string` | The title bar's text and the window's accessible name. `Calculator` by default. |
| `defaultPosition` | `{ x, y }` | Where its top-left corner first appears, in pixels. The top-right of the viewport by default. |
| `locale` | `string` | The locale numbers are grouped in, and its decimal separator. The browser's own by default. |
| `onResult` | `(value: string, expression: string) => void` | Called with each value `=` works out, and the expression it came from. |
| `className` | `string` | Added to the window, for styling. |

`onResult`'s value is decimal text with two places and no grouping, such as `-1234.50`. It is text rather than a
`number` so the value reaches the host exactly; parse it with whatever decimal type the host uses. The expression is
written as the display writes it, such as `100.00 + 5.00`.

## The window

- **Move it** by dragging its title bar, with a mouse or a finger. At least part of it always stays on screen.
- **Resize it** from its bottom-right corner. The keys and the display grow and shrink with it, and every key stays
  on screen at the smallest size.
- **Close it** with the red × in its title bar.

The keys sit in two blocks. Above are the function keys: MS, MR, M+, and M− in the top row, then MC and CE side by
side, parentheses, √, xʸ, %, and ±. Below is a number pad laid out like a computer's, with C where Num Lock sits, a
two-wide 0, and a two-tall + and =.

A key shows as pressed, with a highlight, whether it was clicked or typed.

## Keys

While it is open, it takes key presses anywhere on the page, except while focus is in a text field, a text area, a
select, or anything editable. Other than copy and paste, it ignores any key held with Ctrl, Alt, or ⌘.

| Key | Does |
|---|---|
| `0`–`9`, `.` | Enter a number. The numpad works with Num Lock on or off, and its decimal key works in comma locales. |
| `+` `-` `*` `/` | Add, subtract, multiply, divide. `x` also multiplies. |
| `^` | Raise to a power. |
| `@` | Square root. |
| `(` `)` | Parentheses. |
| `%` | Percent. |
| `Enter`, `=` | Work it out. |
| `Backspace` | Delete the last digit typed. |
| `Escape` | C: clear everything but the memory. |
| `F9` | Change the sign. |
| `M` held, then `+`, `-`, `S`, `R`, or `C` | M+, M−, MS, MR, or MC. Other keys work as usual while M is held. |
| `Ctrl`+`C`, `⌘`+`C` | Copy the value, as the copy button does. |
| `Ctrl`+`V`, `⌘`+`V` | Paste a number into the calculator. |

CE, which clears the whole number being entered, is a button only.

Copy and paste go to the calculator only while no field has focus and no text on the page is selected, so copying
text from the page still works. A paste takes one number, rounded to cents, as MR would recall it: the locale's
grouping and decimal point, a currency symbol before or after, and a minus sign or accounting parentheses are all
read, so `$1,234.567` pastes as 1,234.57 and `(1,234.56)` as −1,234.56. Anything else, or a number with more than 15
digits before the point, is ignored.

## How it calculates

- **Money.** Numbers are decimal, so `0.1 + 0.2` is 0.30 exactly. An entry takes up to two decimal places and 15
  digits before the point. Within one calculation it works to 20 decimal places, then rounds the result to cents, half
  away from zero: `1 ÷ 8` is 0.13 and `−1 ÷ 8` is −0.13. The next calculation continues from the cents shown, so
  `10 ÷ 3 × 3 =` is 10.00, but `10 ÷ 3 =` followed by `× 3 =` is 9.99.
- **Precedence.** Parentheses first, then powers, then × and ÷, then + and −. `2 + 3 × 4` is 14.00. Powers group
  right to left: `2 ^ 3 ^ 2` is 512.00.
- **Powers** must be whole numbers, negative ones included: `2 ^ −1` is 0.50. `1000 × (1 + 0.05) ^ 3` is 1,157.63.
- **Accounting percent.** Preceded by + or −, a percent is of everything ahead of that operator: `100 + 5%` is 105.00,
  `100 − 5%` is 95.00, and `50 + 50 + 10%` is 110.00. Preceded by ×, ÷, or a power, or by nothing, it is the number
  divided by 100: `100 × 5%` is 5.00. The display shows the amount the percent worked out to.
- **Square root** applies at once to the number just entered, a parenthesis group just closed, or a result.
- **Equals again** repeats the last operation: `100 + 5 = = =` is 115.00.
- **Following a result**, a digit starts a new calculation and an operator continues from the result.
- **Shortcuts.** A number beside a parenthesis multiplies: `2(3)` is 6.00. Unclosed parentheses close on `=`. A second
  operator replaces the first.
- **Errors.** Dividing by zero, the square root of a negative number, a power that is not whole, and a result with
  more than 15 digits before the point show a message until the next key.

## Memory

| Button | Keys | Does |
|---|---|---|
| MS | M with S | Store the value in the memory, replacing what was there. |
| MR | M with R | Recall the memory as the number being entered. A digit typed next replaces it. |
| M+ | M with + | Add the value to the memory. |
| M− | M with - | Subtract the value from the memory. |
| MC | M with C | Clear the memory. |

M+, M−, and MS first work out an unfinished expression, as `=` would, and use its result. An M on the display shows
that the memory holds a number. C and errors leave the memory alone.

## The display

Every number shows as money, with two decimal places and the locale's grouping, starting at 0.00. A number being typed
shows the same way: typing `12` shows 12.00. While no number is being entered, such as just after an operator, the value
shows 0.00. The line above shows the expression, in the same format. The copy button
beside the value copies exactly what the value shows, such as `1,234.50`.

## Styling

`styles.css` is the whole look. Override its variables on `.pac`, or on any ancestor, to restyle it:

```css
.my-calculator {
  --pac-font: inherit;
  --pac-body: #ffffff;
  --pac-screen: #f4f5f7;
  --pac-screen-text: #222222;
  --pac-equals-key: #0066cc;
}
```

| Variable | Styles |
|---|---|
| `--pac-font` | Every font in the window |
| `--pac-body`, `--pac-body-edge` | The window and its border |
| `--pac-titlebar`, `--pac-titlebar-text` | The title bar |
| `--pac-close`, `--pac-close-text` | The close button |
| `--pac-screen`, `--pac-screen-text`, `--pac-screen-muted`, `--pac-screen-edge` | The display |
| `--pac-key`, `--pac-key-text` | Digits and the decimal point |
| `--pac-function-key`, `--pac-function-key-text` | Memory keys, C, CE, parentheses, √, xʸ, %, ± |
| `--pac-operator-key`, `--pac-operator-key-text` | ÷ × − + |
| `--pac-equals-key`, `--pac-equals-key-text` | = |
| `--pac-key-edge` | The raised edge under every key |
| `--pac-pressed-highlight` | The glow on a key being pressed |
| `--pac-radius`, `--pac-gap` | Corner rounding and spacing |
| `--pac-z` | The window's stacking order |

For more than colors, style the classes: `pac`, `pac-titlebar`, `pac-title`, `pac-close`, `pac-display`,
`pac-eyebrow`, `pac-memory`, `pac-expression`, `pac-output-row`, `pac-value`, `pac-value-error`, `pac-copy`,
`pac-keys`, `pac-functions`, `pac-pad`, and `pac-key`. Each key also has `pac-key-function`, `pac-key-pad`,
`pac-key-operator`, or `pac-key-equals`, a class naming it such as `pac-key-add` or `pac-key-7`, and
`pac-key-pressed` while it shows as pressed. Leave `styles.css` out to start from no styling at all.

## Without the window

`useAccountantCalculator()` returns the state, a `press(key)` function, and an `enter(value)` function for a whole
value such as a pasted one, for a calculator with your own buttons. `pressKey(state, key)` and
`enterValue(state, value)` are the engine itself, pure functions with no React in them, and `screenOf(state, locale)`
turns a state into the text a display shows. `Decimal` is the number type the engine works in; `formatMoney(value,
locale)` shows one as money, and `parseMoney(text, locale)` reads one back from pasted text, or gives `null`.
`keyFromEvent(event, memoryHeld)` turns a key press into a calculator key, and `isMemoryHold(event)` says whether a
key is the M that turns on the memory keys.

## Develop

```bash
npm install
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

`npm run demo` serves a page to try it on, and `npm run demo:build` builds that page into `demo/dist` as a static
site. The Site workflow deploys it to calc.pluperfect.dev, and runs only from its Run workflow button in the Actions
tab. `npm pack` makes the same file a release carries, to try in another project before releasing.

## Release

Set `version` in `package.json`, then push a tag for it:

```bash
git tag v1.0.0
```

```bash
git push origin v1.0.0
```

The Package workflow checks that the tag matches the version, tests and builds, packs the tarball, checks it holds the
package and its source and nothing else, zips the same files, and attaches both to a GitHub Release for the tag.

## License

MIT
