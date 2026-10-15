import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** How current a number is, as the backend reports it on every quote. */
export type Freshness = 'realtime' | 'delayed' | 'eod';

const labels: Record<Freshness, { short: string; long: string }> = {
  realtime: { short: 'RT', long: 'Real-time' },
  delayed: { short: 'DLY', long: 'Delayed' },
  eod: { short: 'EOD', long: 'End of day' },
};

/** `<dfm-freshness [freshness]="quote.freshness" />` */
@Component({
  // The issue fixes this element name for every panel that shows a freshness badge.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'dfm-freshness',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-freshness]': 'freshness()' },
  template: `<abbr [title]="label().long">{{ label().short }}</abbr>`,
  styles: `
    :host {
      display: inline-block;
      padding: 0 var(--space-2);
      border: 1px solid currentColor;
      border-radius: var(--radius);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height);
      white-space: nowrap;
    }

    abbr {
      text-decoration: none;
    }

    :host([data-freshness='realtime']) {
      color: var(--color-fresh-realtime);
    }

    :host([data-freshness='delayed']) {
      color: var(--color-fresh-delayed);
    }

    :host([data-freshness='eod']) {
      color: var(--color-fresh-eod);
    }
  `,
})
export class FreshnessBadge {
  readonly freshness = input.required<Freshness>();

  protected readonly label = computed(() => labels[this.freshness()]);
}
