import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutoDir } from './auto-dir';

@Component({
  imports: [AutoDir],
  template: `<p>EMAAR <span appAutoDir>إعمار العقارية</span> 5.430</p>`,
})
class NameHost {}

describe('AutoDir', () => {
  it('lets an Arabic name inside English text pick its own direction', async () => {
    const fixture = TestBed.createComponent(NameHost);
    await fixture.whenStable();
    const name = (fixture.nativeElement as HTMLElement).querySelector('span');
    expect(name?.getAttribute('dir')).toBe('auto');
    expect(name?.textContent).toBe('إعمار العقارية');
  });
});
