import { Pipe, PipeTransform } from '@angular/core';
import { DecimalInput, formatVolume } from './number-format';

/** `{{ volume | volume }}` */
@Pipe({ name: 'volume' })
export class VolumePipe implements PipeTransform {
  transform(value: DecimalInput): string {
    return formatVolume(value);
  }
}
