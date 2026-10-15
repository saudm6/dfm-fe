import { Pipe, PipeTransform } from '@angular/core';
import { changeDirection, DecimalInput } from './number-format';

export type ChangeClass = 'change-up' | 'change-down' | 'change-flat';

/**
 * The global class (see src/styles/_base.scss) that colors a change up, down, or flat.
 * Pass the same decimals as `percentChange` so the color matches the printed sign.
 */
@Pipe({ name: 'changeClass' })
export class ChangeClassPipe implements PipeTransform {
  transform(value: DecimalInput, decimals?: number | null): ChangeClass {
    return `change-${changeDirection(value, decimals)}`;
  }
}
