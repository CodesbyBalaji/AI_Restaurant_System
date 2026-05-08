import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  protected readonly title = signal('client');

  constructor(public auth: AuthService, private router: Router) {}

  confirmLogout() {
    const confirmAction = confirm("Are you sure you want to logout?");

    if (confirmAction) {
      this.logout();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}