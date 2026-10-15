import {
  changeDirection,
  formatCurrency,
  formatPercentChange,
  formatPrice,
  formatVolume,
} from './number-format';

describe('formatPrice', () => {
  it.each([
    [5.4, 3, '5.400'],
    [12.35, 2, '12.35'],
    [1234.5678, 3, '1,234.568'],
    [1.005, 2, '1.01'],
    [0.0005, 3, '0.001'],
    [7, 0, '7'],
    [-0.25, 3, '-0.250'],
    [null, 3, '—'],
    [undefined, 3, '—'],
    [Number.NaN, 3, '—'],
    [Number.POSITIVE_INFINITY, 3, '—'],
  ])('formats %s with %i decimals as %s', (value, decimals, expected) => {
    expect(formatPrice(value, decimals)).toBe(expected);
  });
});

describe('formatPercentChange', () => {
  it.each([
    [1.2345, '+1.23%'],
    [-0.456, '-0.46%'],
    [0, '0.00%'],
    [12.5, '+12.50%'],
    [-100, '-100.00%'],
    [0.001, '+0.00%'],
    [-0.004, '-0.00%'],
    [1234.5, '+1,234.50%'],
    [null, '—'],
    [Number.NaN, '—'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatPercentChange(value)).toBe(expected);
  });

  it('takes the number of decimals', () => {
    expect(formatPercentChange(1.23456, 3)).toBe('+1.235%');
  });
});

describe('formatVolume', () => {
  it.each([
    [164267392.04, '164.27M'],
    [0, '0'],
    [950, '950'],
    [12.5, '12.5'],
    [999.999, '1.00K'],
    [1000, '1.00K'],
    [1500, '1.50K'],
    [12345, '12.35K'],
    [999994, '999.99K'],
    [999999, '1.00M'],
    [2500000, '2.50M'],
    [3210000000, '3.21B'],
    [1500000000000, '1,500.00B'],
    [-2500000, '-2.50M'],
    [null, '—'],
    [Number.NaN, '—'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatVolume(value)).toBe(expected);
  });
});

describe('formatCurrency', () => {
  it.each([
    [1234.5, 'AED', 'AED 1,234.50'],
    [1234.5, 'USD', 'USD 1,234.50'],
    [0, 'AED', 'AED 0.00'],
    [-42.125, 'USD', 'USD -42.13'],
    [164267392.04, 'AED', 'AED 164,267,392.04'],
    [null, 'AED', '—'],
  ] as const)('formats %s %s as %s', (value, currency, expected) => {
    expect(formatCurrency(value, currency)).toBe(expected);
  });

  it('takes the number of decimals', () => {
    expect(formatCurrency(5.4321, 'AED', 3)).toBe('AED 5.432');
  });
});

describe('changeDirection', () => {
  it.each([
    [0.01, 'up'],
    [-0.01, 'down'],
    [0, 'flat'],
    [null, 'flat'],
    [undefined, 'flat'],
    [Number.NaN, 'flat'],
  ])('calls %s %s', (value, expected) => {
    expect(changeDirection(value)).toBe(expected);
  });
});
