import { Pipe, PipeTransform } from '@angular/core';
import { formatPercentChange } from './number-format';

/** `<span [class]="pct | changeClass">{{ pct | percentChange }}</span>` */
@Pipe({ name: 'percentChange' })
export class PercentChangePipe implements PipeTransform {
  transform(value: number | null | undefined, decimals?: number): string {
    return formatPercentChange(value, decimals);
  }
}
