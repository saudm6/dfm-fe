import { Pipe, PipeTransform } from '@angular/core';
import { formatPrice } from './number-format';

/** `{{ last | price: instrument.decimals }}` */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined, decimals: number): string {
    return formatPrice(value, decimals);
  }
}
