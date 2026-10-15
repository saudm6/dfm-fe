import { Pipe, PipeTransform } from '@angular/core';
import { changeDirection } from './number-format';

export type ChangeClass = 'change-up' | 'change-down' | 'change-flat';

/** The global class (see src/styles/_base.scss) that colors a change up, down, or flat. */
@Pipe({ name: 'changeClass' })
export class ChangeClassPipe implements PipeTransform {
  transform(value: number | null | undefined): ChangeClass {
    return `change-${changeDirection(value)}`;
  }
}
