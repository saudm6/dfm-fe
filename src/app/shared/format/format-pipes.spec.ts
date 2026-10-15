import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChangeClassPipe } from './change-class-pipe';
import { MoneyPipe } from './money-pipe';
import { PercentChangePipe } from './percent-change-pipe';
import { PricePipe } from './price-pipe';
import { VolumePipe } from './volume-pipe';

@Component({
  imports: [ChangeClassPipe, MoneyPipe, PercentChangePipe, PricePipe, VolumePipe],
  template: `
    <span id="price">{{ 5.4 | price: 3 }}</span>
    <span id="up" [class]="1.2345 | changeClass">{{ 1.2345 | percentChange }}</span>
    <span id="down" [class]="-0.456 | changeClass">{{ -0.456 | percentChange }}</span>
    <span id="flat" [class]="0 | changeClass">{{ 0 | percentChange }}</span>
    <span id="volume">{{ 164267392.04 | volume }}</span>
    <span id="aed">{{ 1234.5 | money: 'AED' }}</span>
    <span id="usd">{{ 1234.5 | money: 'USD' }}</span>
    <span id="missing">{{ null | price: 3 }}</span>
    <span id="wire-price">{{ '11.4' | price: 2 }}</span>
    <span id="wire-down" [class]="'-0.25' | changeClass">{{ '-0.25' | percentChange }}</span>
    <span id="rounded-flat" [class]="-0.004 | changeClass">{{ -0.004 | percentChange }}</span>
    <span id="rounded-3" [class]="-0.004 | changeClass: 3">{{ -0.004 | percentChange: 3 }}</span>
    <span id="wire-volume">{{ '164267392.04' | volume }}</span>
    <span id="wire-aed">{{ '1234.5' | money: 'AED' }}</span>
    <span id="bad-decimals">{{ 5.4 | price: -1 }}</span>
  `,
})
class PipesHost {}

describe('format pipes', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(PipesHost);
    await fixture.whenStable();
    root = fixture.nativeElement as HTMLElement;
  });

  function text(id: string): string | null | undefined {
    return root.querySelector(`#${id}`)?.textContent;
  }

  function className(id: string): string | undefined {
    return root.querySelector(`#${id}`)?.className;
  }

  it('renders a price with the instrument decimals', () => {
    expect(text('price')).toBe('5.400');
  });

  it('renders a percent change with its sign and color class', () => {
    expect(text('up')).toBe('+1.23%');
    expect(className('up')).toBe('change-up');
    expect(text('down')).toBe('-0.46%');
    expect(className('down')).toBe('change-down');
    expect(text('flat')).toBe('0.00%');
    expect(className('flat')).toBe('change-flat');
  });

  it('renders a volume with a unit', () => {
    expect(text('volume')).toBe('164.27M');
  });

  it('renders an amount in AED or USD', () => {
    expect(text('aed')).toBe('AED 1,234.50');
    expect(text('usd')).toBe('USD 1,234.50');
  });

  it('renders a dash for a missing number', () => {
    expect(text('missing')).toBe('—');
  });

  it('renders decimal strings from the backend', () => {
    expect(text('wire-price')).toBe('11.40');
    expect(text('wire-down')).toBe('-0.25%');
    expect(className('wire-down')).toBe('change-down');
    expect(text('wire-volume')).toBe('164.27M');
    expect(text('wire-aed')).toBe('AED 1,234.50');
  });

  it('colors a change by the value it prints', () => {
    expect(text('rounded-flat')).toBe('0.00%');
    expect(className('rounded-flat')).toBe('change-flat');
    expect(text('rounded-3')).toBe('-0.004%');
    expect(className('rounded-3')).toBe('change-down');
  });

  it('renders a dash for invalid decimals', () => {
    expect(text('bad-decimals')).toBe('—');
  });
});
