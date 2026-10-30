/** Decimal places carried through a calculation; what the calculator shows rounds to two. */
export const PRECISION = 20

const pow10 = (n: number) => 10n ** BigInt(n)
const abs = (n: bigint) => (n < 0n ? -n : n)

/** n ÷ d, rounded half away from zero. */
function divideRounded(n: bigint, d: bigint): bigint {
  const quotient = n / d
  const remainder = n % d
  if (2n * abs(remainder) < abs(d)) return quotient
  return quotient + ((n < 0n) !== (d < 0n) ? -1n : 1n)
}

function integerSquareRoot(n: bigint): bigint {
  if (n < 2n) return n
  let x = n
  let y = (x + 1n) / 2n
  while (y < x) {
    x = y
    y = (x + n / x) / 2n
  }
  return x
}

/**
 * A base-ten number held as a whole count of units and a scale, so 12.50 is 1250 units at scale 2. Every operation is
 * exact except division and square roots, which carry PRECISION places, rounded half away from zero.
 */
export class Decimal {
  private constructor(
    readonly units: bigint,
    readonly scale: number,
  ) {}

  static of(units: bigint, scale = 0): Decimal {
    while (scale > 0 && units % 10n === 0n) {
      units /= 10n
      scale--
    }
    return new Decimal(units, scale)
  }

  /** Reads text such as "-12.5" or "12." */
  static parse(text: string): Decimal {
    const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(text)
    if (!match || (!match[2] && !match[3])) throw new RangeError(`Not a number: "${text}"`)
    const fraction = match[3] ?? ''
    const units = BigInt(`${match[2] || '0'}${fraction}`)
    return Decimal.of(match[1] ? -units : units, fraction.length)
  }

  static readonly ZERO = Decimal.of(0n)
  static readonly ONE = Decimal.of(1n)
  static readonly HUNDRED = Decimal.of(100n)

  plus(other: Decimal): Decimal {
    const scale = Math.max(this.scale, other.scale)
    return Decimal.of(this.units * pow10(scale - this.scale) + other.units * pow10(scale - other.scale), scale)
  }

  minus(other: Decimal): Decimal {
    return this.plus(other.negated())
  }

  times(other: Decimal): Decimal {
    return Decimal.of(this.units * other.units, this.scale + other.scale).roundTo(PRECISION)
  }

  /** The quotient to PRECISION places. Dividing by zero throws a RangeError. */
  dividedBy(other: Decimal): Decimal {
    if (other.isZero()) throw new RangeError('Division by zero')
    const shift = PRECISION + other.scale - this.scale
    const n = shift >= 0 ? this.units * pow10(shift) : this.units
    const d = shift >= 0 ? other.units : other.units * pow10(-shift)
    return Decimal.of(divideRounded(n, d), PRECISION)
  }

  /** The square root to PRECISION places. A negative number throws a RangeError. */
  squareRoot(): Decimal {
    if (this.isNegative()) throw new RangeError('Square root of a negative number')
    return Decimal.of(integerSquareRoot(this.units * pow10(2 * PRECISION - this.scale)), PRECISION)
  }

  /**
   * This raised to a whole power. `check` sees each partial product, so a power too large to show can stop before it
   * grows any larger. A negative power of zero throws a RangeError.
   */
  toPower(exponent: bigint, check: (value: Decimal) => Decimal = (v) => v): Decimal {
    let result = Decimal.ONE
    let base: Decimal = this
    let remaining = abs(exponent)
    while (remaining > 0n) {
      if (remaining & 1n) result = check(result.times(base))
      remaining >>= 1n
      if (remaining > 0n) base = check(base.times(base))
    }
    return exponent < 0n ? Decimal.ONE.dividedBy(result) : result
  }

  /** Rounded half away from zero to at most `places` decimal places. */
  roundTo(places: number): Decimal {
    if (this.scale <= places) return this
    return Decimal.of(divideRounded(this.units, pow10(this.scale - places)), places)
  }

  negated(): Decimal {
    return Decimal.of(-this.units, this.scale)
  }

  isZero(): boolean {
    return this.units === 0n
  }

  isNegative(): boolean {
    return this.units < 0n
  }

  isWhole(): boolean {
    return this.scale === 0
  }

  /** How many digits come before the decimal point; 0.5 has one. */
  integerDigits(): number {
    return (abs(this.units) / pow10(this.scale)).toString().length
  }

  /** Fixed-point text with no grouping, such as "-1234.50". */
  toFixed(places: number): string {
    const rounded = this.roundTo(places)
    const units = rounded.units * pow10(places - rounded.scale)
    const digits = abs(units).toString().padStart(places + 1, '0')
    const sign = units < 0n ? '-' : ''
    return places ? `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}` : `${sign}${digits}`
  }

  toString(): string {
    return this.toFixed(this.scale)
  }
}
