import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyCode, formatCurrency } from './number-format';

/** `{{ amount | money: 'AED' }}`. Named `money` so it never shadows Angular's `currency` pipe. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: CurrencyCode, decimals?: number): string {
    return formatCurrency(value, currency, decimals);
  }
}
