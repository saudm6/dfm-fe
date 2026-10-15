import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LOGIN_URL } from '../../api/api-interceptor';
import { Session } from '../../core/auth/session';

/** The signed-in terminal: who is signed in, sign out, and what the role may use. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly user = this.session.user;
  protected readonly role = this.session.role;
  protected readonly canSeeMarketData = this.session.canSeeMarketData;

  protected async signOut(): Promise<void> {
    await this.session.logout();
    await this.router.navigateByUrl(LOGIN_URL);
  }
}
