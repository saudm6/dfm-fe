import { TestBed } from '@angular/core/testing';
import { Freshness, FreshnessBadge } from './freshness-badge';

describe('FreshnessBadge', () => {
  async function render(freshness: Freshness) {
    const fixture = TestBed.createComponent(FreshnessBadge);
    fixture.componentRef.setInput('freshness', freshness);
    await fixture.whenStable();
    return fixture;
  }

  it.each([
    ['realtime', 'RT', 'Real-time'],
    ['delayed', 'DLY', 'Delayed'],
    ['eod', 'EOD', 'End of day'],
  ] as const)('shows %s as %s, spelled out as %s', async (freshness, short, long) => {
    const host = (await render(freshness)).nativeElement as HTMLElement;
    expect(host.getAttribute('data-freshness')).toBe(freshness);
    expect(host.textContent).toBe(short);
    expect(host.querySelector('abbr')?.getAttribute('title')).toBe(long);
  });

  it('follows a change of freshness', async () => {
    const fixture = await render('delayed');
    fixture.componentRef.setInput('freshness', 'realtime');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-freshness')).toBe('realtime');
    expect(host.textContent).toBe('RT');
  });
});
