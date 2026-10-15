import { Directive } from '@angular/core';

/**
 * Sets `dir="auto"` so text such as an Arabic instrument name takes its direction from its
 * first strong character and reads right to left inside an English screen.
 * `<td appAutoDir>{{ instrument.nameAr }}</td>`
 */
@Directive({
  selector: '[appAutoDir]',
  host: { dir: 'auto' },
})
export class AutoDir {}
