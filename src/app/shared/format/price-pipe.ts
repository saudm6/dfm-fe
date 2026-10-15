import { Pipe, PipeTransform } from '@angular/core';
import { DecimalInput, formatPrice } from './number-format';

/** `{{ last | price: instrument.decimals }}` */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(value: DecimalInput, decimals: number | null | undefined): string {
    return formatPrice(value, decimals);
  }
}
