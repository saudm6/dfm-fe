import { Pipe, PipeTransform } from '@angular/core';
import { DecimalInput, formatPercentChange } from './number-format';

/** `<span [class]="pct | changeClass">{{ pct | percentChange }}</span>` */
@Pipe({ name: 'percentChange' })
export class PercentChangePipe implements PipeTransform {
  transform(value: DecimalInput, decimals?: number | null): string {
    return formatPercentChange(value, decimals);
  }
}
