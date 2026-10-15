/** Shown in place of a number that is missing or not finite. */
export const NO_VALUE = '—';

export type CurrencyCode = 'AED' | 'USD';

export type ChangeDirection = 'up' | 'down' | 'flat';

const formatters = new Map<number, Intl.NumberFormat>();

// Locale is fixed so a trader's browser settings never change separators in the grid.
function fixed(decimals: number): Intl.NumberFormat {
  let formatter = formatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, formatter);
  }
  return formatter;
}

const upToTwoDecimals = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** A price with the instrument's number of decimals, e.g. `formatPrice(5.4, 3)` is `5.400`. */
export function formatPrice(value: number | null | undefined, decimals: number): string {
  return isNumber(value) ? fixed(decimals).format(value) : NO_VALUE;
}

/**
 * A percent change with an explicit sign, e.g. `formatPercentChange(1.234)` is `+1.23%`.
 * `value` is already in percent: 1.5 means 1.5%. The sign follows the unrounded value so it
 * always agrees with {@link changeDirection}.
 */
export function formatPercentChange(value: number | null | undefined, decimals = 2): string {
  if (!isNumber(value)) {
    return NO_VALUE;
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${fixed(decimals).format(Math.abs(value))}%`;
}

const volumeUnits = [
  { size: 1e3, suffix: 'K' },
  { size: 1e6, suffix: 'M' },
  { size: 1e9, suffix: 'B' },
];

function toNumber(formatted: string): number {
  return Number(formatted.replaceAll(',', ''));
}

/**
 * A volume or value abbreviated to K, M, or B with two decimals,
 * e.g. `formatVolume(164267392.04)` is `164.27M`. Below 1,000 it prints up to two decimals.
 */
export function formatVolume(value: number | null | undefined): string {
  if (!isNumber(value)) {
    return NO_VALUE;
  }
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  let text = upToTwoDecimals.format(abs);
  // Step up a unit while the rounded figure reaches 1,000: 999,999 is 1.00M, not 1,000.00K.
  for (const { size, suffix } of volumeUnits) {
    if (toNumber(text.replace(/[KMB]$/, '')) < 1000) {
      break;
    }
    text = `${fixed(2).format(abs / size)}${suffix}`;
  }
  return `${sign}${text}`;
}

/**
 * An amount with its ISO currency code, e.g. `formatCurrency(1234.5, 'AED')` is `AED 1,234.50`.
 * The code and the number are joined by a no-break space so they never wrap apart.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: CurrencyCode,
  decimals = 2,
): string {
  return isNumber(value) ? `${currency}\u00a0${fixed(decimals).format(value)}` : NO_VALUE;
}

/** Whether a change is up, down, or flat; missing values are flat. */
export function changeDirection(value: number | null | undefined): ChangeDirection {
  if (!isNumber(value) || value === 0) {
    return 'flat';
  }
  return value > 0 ? 'up' : 'down';
}
