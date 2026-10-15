import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyCode, DecimalInput, formatCurrency } from './number-format';

/** `{{ amount | money: 'AED' }}`. Named `money` so it never shadows Angular's `currency` pipe. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: DecimalInput, currency: CurrencyCode, decimals?: number | null): string {
    return formatCurrency(value, currency, decimals);
  }
}
