/** Shown in place of a number that is missing, not finite, or not a decimal. */
export const NO_VALUE = '—';

export type CurrencyCode = 'AED' | 'USD';

export type ChangeDirection = 'up' | 'down' | 'flat';

/**
 * A number as the backend or a caller may hold it. The backend sends decimals as JSON strings
 * with trailing zeros trimmed (`"11.4"`), so a string is formatted exactly, digit for digit.
 */
export type DecimalInput = number | string | null | undefined;

type Numeric = number | `${number}`;

const DECIMAL_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;

const MAX_DECIMALS = 20;

function toNumeric(value: DecimalInput): Numeric | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && DECIMAL_PATTERN.test(value)) {
    return value as `${number}`;
  }
  return undefined;
}

function isDecimals(decimals: number | null | undefined): decimals is number {
  return (
    typeof decimals === 'number' &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= MAX_DECIMALS
  );
}

// Locale is fixed so a trader's browser settings never change separators in the grid.
// 'negative' keeps a minus off anything that rounds to zero, including -0.
function cached(
  cache: Map<number, Intl.NumberFormat>,
  decimals: number,
  signDisplay: 'negative' | 'exceptZero',
): Intl.NumberFormat {
  let formatter = cache.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay,
    });
    cache.set(decimals, formatter);
  }
  return formatter;
}

const fixedFormatters = new Map<number, Intl.NumberFormat>();
const signedFormatters = new Map<number, Intl.NumberFormat>();

function fixed(decimals: number): Intl.NumberFormat {
  return cached(fixedFormatters, decimals, 'negative');
}

/** `+` above zero and `-` below, judged on the rounded value, so `0.00` never carries a sign. */
function signed(decimals: number): Intl.NumberFormat {
  return cached(signedFormatters, decimals, 'exceptZero');
}

const upToTwoDecimals = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  signDisplay: 'negative',
});

/**
 * A price with the instrument's number of decimals, e.g. `formatPrice("11.4", 2)` is `11.40`.
 * An invalid `decimals` (not an integer from 0 to 20) prints `—`.
 */
export function formatPrice(value: DecimalInput, decimals: number | null | undefined): string {
  const numeric = toNumeric(value);
  return numeric !== undefined && isDecimals(decimals) ? fixed(decimals).format(numeric) : NO_VALUE;
}

/**
 * A percent change with an explicit sign, e.g. `formatPercentChange(1.234)` is `+1.23%`.
 * `value` is already in percent: 1.5 means 1.5%. The sign comes from the value rounded to
 * `decimals`, so `0.001` prints `0.00%` and agrees with {@link changeDirection}.
 */
export function formatPercentChange(value: DecimalInput, decimals: number | null = 2): string {
  const numeric = toNumeric(value);
  return numeric !== undefined && isDecimals(decimals)
    ? `${signed(decimals).format(numeric)}%`
    : NO_VALUE;
}

const volumeUnits = [
  { power: 3, suffix: 'K' },
  { power: 6, suffix: 'M' },
  { power: 9, suffix: 'B' },
];

function toNumber(formatted: string): number {
  return Number(formatted.replaceAll(',', ''));
}

/** Divides by 10^power; a decimal string is shifted rather than divided, so it stays exact. */
function scaleDown(value: Numeric, power: number): Numeric {
  if (typeof value === 'number') {
    return value / 10 ** power;
  }
  const sign = /^[+-]/.test(value) ? value[0] : '';
  const [whole, fraction = ''] = value.slice(sign.length).split('.');
  const padded = whole.padStart(power + 1, '0');
  const cut = padded.length - power;
  return `${sign}${padded.slice(0, cut)}.${padded.slice(cut)}${fraction}` as `${number}`;
}

/**
 * A volume or value abbreviated to K, M, or B with two decimals,
 * e.g. `formatVolume("164267392.04")` is `164.27M`. Below 1,000 it prints up to two decimals.
 */
export function formatVolume(value: DecimalInput): string {
  const numeric = toNumeric(value);
  if (numeric === undefined) {
    return NO_VALUE;
  }
  let text = upToTwoDecimals.format(numeric);
  // Step up a unit while the rounded figure reaches 1,000: 999,999 is 1.00M, not 1,000.00K.
  for (const { power, suffix } of volumeUnits) {
    if (Math.abs(toNumber(text.replace(/[KMB]$/, ''))) < 1000) {
      break;
    }
    text = `${fixed(2).format(scaleDown(numeric, power))}${suffix}`;
  }
  return text;
}

/**
 * An amount with its ISO currency code, e.g. `formatCurrency("1234.5", 'AED')` is `AED 1,234.50`.
 * The code and the number are joined by a no-break space so they never wrap apart.
 */
export function formatCurrency(
  value: DecimalInput,
  currency: CurrencyCode,
  decimals: number | null = 2,
): string {
  const numeric = toNumeric(value);
  return numeric !== undefined && isDecimals(decimals)
    ? `${currency}\u00a0${fixed(decimals).format(numeric)}`
    : NO_VALUE;
}

/**
 * Whether a change is up, down, or flat at the displayed precision: with the default 2 decimals,
 * `-0.004` is flat because it shows as `0.00%`. Missing values and invalid decimals are flat.
 */
export function changeDirection(value: DecimalInput, decimals: number | null = 2): ChangeDirection {
  const numeric = toNumeric(value);
  if (numeric === undefined || !isDecimals(decimals)) {
    return 'flat';
  }
  const sign = signed(decimals).format(numeric)[0];
  return sign === '+' ? 'up' : sign === '-' ? 'down' : 'flat';
}
