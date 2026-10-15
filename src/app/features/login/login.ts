import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError, NETWORK_ERROR } from '../../api/api-error';
import { RETURN_URL_PARAM } from '../../api/api-interceptor';
import { Session } from '../../core/auth/session';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.error.set('Enter your username and password.');
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.session.login(username, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM);
        void this.router.navigateByUrl(inAppPath(returnUrl) ? returnUrl : '/');
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.error.set(failureMessage(error));
        this.form.controls.password.reset();
      },
    });
  }
}

/** Only a path on this app: one leading slash, not a protocol-relative '//host' or '/\host'. */
function inAppPath(url: string | null): url is string {
  return url !== null && /^\/(?![/\\])/.test(url);
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'unauthorized') {
      return 'Wrong username or password.';
    }
    if (error.code === NETWORK_ERROR) {
      return 'The server could not be reached. Try again.';
    }
    return `Sign-in failed: ${error.message}`;
  }
  return 'Sign-in failed. Try again.';
}
