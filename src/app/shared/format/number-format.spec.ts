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

  it.each([
    ['11.4', 2, '11.40'],
    ['5.4', 3, '5.400'],
    ['0', 2, '0.00'],
    ['7', 0, '7'],
    ['-0.25', 3, '-0.250'],
    ['+3.1', 1, '3.1'],
    ['1.005', 2, '1.01'],
    ['1234.5678', 3, '1,234.568'],
    ['9007199254740993', 2, '9,007,199,254,740,993.00'],
    ['0.123456789012345678901', 20, '0.12345678901234567890'],
  ])(
    'formats the decimal string %s with %i decimals exactly as %s',
    (value, decimals, expected) => {
      expect(formatPrice(value, decimals)).toBe(expected);
    },
  );

  it.each([
    '',
    ' 11.4',
    '11.4 ',
    '1e3',
    '.5',
    '5.',
    '1,234.5',
    'NaN',
    'Infinity',
    '0x10',
    '--1',
    'abc',
  ])('prints a dash for the non-decimal string %j', (value) => {
    expect(formatPrice(value, 2)).toBe('—');
  });

  it.each([
    [-0, 2, '0.00'],
    ['-0', 2, '0.00'],
    ['-0.00', 2, '0.00'],
    [-1e-7, 3, '0.000'],
    ['-0.0004', 3, '0.000'],
  ])('never prints a minus on zero: %s at %i is %s', (value, decimals, expected) => {
    expect(formatPrice(value, decimals)).toBe(expected);
  });

  it.each([-1, 21, 1.5, Number.NaN, null, undefined])(
    'prints a dash for the invalid decimals %s',
    (decimals) => {
      expect(formatPrice(5.4, decimals)).toBe('—');
      expect(formatPrice('5.4', decimals)).toBe('—');
    },
  );
});

describe('formatPercentChange', () => {
  it.each([
    [1.2345, '+1.23%'],
    [-0.456, '-0.46%'],
    [0, '0.00%'],
    [12.5, '+12.50%'],
    [-100, '-100.00%'],
    [1234.5, '+1,234.50%'],
    ['1.2345', '+1.23%'],
    ['-0.25', '-0.25%'],
    ['0', '0.00%'],
    [null, '—'],
    [Number.NaN, '—'],
    ['1.2.3', '—'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatPercentChange(value)).toBe(expected);
  });

  it.each([
    [0.001, '0.00%'],
    [-0.004, '0.00%'],
    [-1.1e-14, '0.00%'],
    [-0, '0.00%'],
    ['-0.004', '0.00%'],
    ['-0', '0.00%'],
    [0.005, '+0.01%'],
    ['-0.005', '-0.01%'],
  ])('signs %s by its rounded value: %s', (value, expected) => {
    expect(formatPercentChange(value)).toBe(expected);
  });

  it('takes the number of decimals', () => {
    expect(formatPercentChange(1.23456, 3)).toBe('+1.235%');
    expect(formatPercentChange('0.004', 3)).toBe('+0.004%');
  });

  it.each([-1, 21, 2.5, Number.NaN, null])(
    'prints a dash for the invalid decimals %s',
    (decimals) => {
      expect(formatPercentChange(1.5, decimals)).toBe('—');
    },
  );
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
    [-0.001, '0'],
    [-0, '0'],
    [null, '—'],
    [Number.NaN, '—'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatVolume(value)).toBe(expected);
  });

  it.each([
    ['164267392.04', '164.27M'],
    ['0', '0'],
    ['12.5', '12.5'],
    ['999.999', '1.00K'],
    ['1000', '1.00K'],
    ['12345', '12.35K'],
    ['999994', '999.99K'],
    ['999999', '1.00M'],
    ['-2500000', '-2.50M'],
    ['-0.001', '0'],
    ['3210000000', '3.21B'],
    ['9007199254740993', '9,007,199.25B'],
    ['1e6', '—'],
  ])('formats the decimal string %s as %s', (value, expected) => {
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
    ['1234.5', 'AED', 'AED 1,234.50'],
    ['-42.125', 'USD', 'USD -42.13'],
    ['164267392.04', 'AED', 'AED 164,267,392.04'],
    [-0.004, 'AED', 'AED 0.00'],
    ['-0', 'USD', 'USD 0.00'],
    [null, 'AED', '—'],
    ['AED 5', 'AED', '—'],
  ] as const)('formats %s %s as %s', (value, currency, expected) => {
    expect(formatCurrency(value, currency)).toBe(expected);
  });

  it('takes the number of decimals', () => {
    expect(formatCurrency(5.4321, 'AED', 3)).toBe('AED 5.432');
  });

  it.each([-1, 21, Number.NaN, null])('prints a dash for the invalid decimals %s', (decimals) => {
    expect(formatCurrency(5.4, 'AED', decimals)).toBe('—');
  });
});

describe('changeDirection', () => {
  it.each([
    [0.01, 'up'],
    [-0.01, 'down'],
    [0, 'flat'],
    ['0.01', 'up'],
    ['-0.25', 'down'],
    ['0', 'flat'],
    ['abc', 'flat'],
    [null, 'flat'],
    [undefined, 'flat'],
    [Number.NaN, 'flat'],
  ])('calls %s %s', (value, expected) => {
    expect(changeDirection(value)).toBe(expected);
  });

  it.each([
    [0.001, 'flat'],
    [-0.004, 'flat'],
    [-1.1e-14, 'flat'],
    [-0, 'flat'],
    ['-0', 'flat'],
    ['-0.004', 'flat'],
    [0.005, 'up'],
    ['-0.005', 'down'],
  ])('calls %s %s at the displayed 2 decimals', (value, expected) => {
    expect(changeDirection(value)).toBe(expected);
  });

  it('rounds to the given decimals', () => {
    expect(changeDirection(-0.004, 3)).toBe('down');
    expect(changeDirection('0.0004', 3)).toBe('flat');
  });

  it.each([-1, 21, Number.NaN, null])(
    'calls a change flat for the invalid decimals %s',
    (decimals) => {
      expect(changeDirection(5, decimals)).toBe('flat');
    },
  );
});
