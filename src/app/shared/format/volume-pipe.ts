import { Pipe, PipeTransform } from '@angular/core';
import { formatVolume } from './number-format';

/** `{{ volume | volume }}` */
@Pipe({ name: 'volume' })
export class VolumePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatVolume(value);
  }
}
