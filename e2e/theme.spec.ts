import { expect, test, type Page } from '@playwright/test';

type Rgb = [number, number, number];

const backgrounds = ['--color-bg', '--color-surface', '--color-surface-raised'];
const foregrounds = [
  '--color-text',
  '--color-text-strong',
  '--color-text-muted',
  '--color-accent',
  '--color-up',
  '--color-down',
  '--color-flat',
  '--color-fresh-realtime',
  '--color-fresh-delayed',
  '--color-fresh-eod',
];

// WCAG 2.2 relative luminance and contrast ratio.
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

async function tokenColors(page: Page, tokens: string[]): Promise<Record<string, Rgb>> {
  return page.evaluate((names) => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const colors: Record<string, [number, number, number]> = {};
    for (const name of names) {
      probe.style.color = `var(${name})`;
      const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g)!.map(Number);
      colors[name] = [r, g, b];
    }
    probe.remove();
    return colors;
  }, tokens);
}

async function useTheme(page: Page, theme: 'dark' | 'light'): Promise<void> {
  await page.evaluate((name) => {
    if (name === 'light') {
      document.documentElement.dataset['theme'] = 'light';
    } else {
      delete document.documentElement.dataset['theme'];
    }
  }, theme);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('defaults to amber on black', async ({ page }) => {
  const colors = await tokenColors(page, ['--color-bg', '--color-text']);
  expect(colors['--color-bg']).toEqual([0, 0, 0]);
  expect(colors['--color-text']).toEqual([255, 176, 0]);
  const html = await page.evaluate(() => getComputedStyle(document.documentElement).color);
  expect(html).toBe('rgb(255, 176, 0)');
});

test('switches to the light theme', async ({ page }) => {
  await useTheme(page, 'light');
  const colors = await tokenColors(page, ['--color-bg', '--color-text']);
  expect(colors['--color-bg']).toEqual([255, 255, 255]);
  expect(colors['--color-text']).toEqual([28, 26, 23]);
});

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} theme text, up, and down colors reach 4.5:1 on every background`, async ({
    page,
  }) => {
    await useTheme(page, theme);
    const colors = await tokenColors(page, [...backgrounds, ...foregrounds]);
    const failures: string[] = [];
    for (const fg of foregrounds) {
      for (const bg of backgrounds) {
        const ratio = contrast(colors[fg], colors[bg]);
        if (ratio < 4.5) {
          failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
}

test('sets numbers in a monospace face with tabular figures', async ({ page }) => {
  const style = await page.evaluate(() => {
    const computed = getComputedStyle(document.querySelector('h1')!);
    return { family: computed.fontFamily, numeric: computed.fontVariantNumeric };
  });
  expect(style.family).toContain('monospace');
  expect(style.numeric).toBe('tabular-nums');
});
