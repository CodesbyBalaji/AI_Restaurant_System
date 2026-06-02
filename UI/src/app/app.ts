import { Component, signal, ElementRef, HostListener, ViewChild  } from '@angular/core';
import { Router, RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CommonModule } from '@angular/common';
import { LottieComponent } from "ngx-lottie";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, RouterModule, LottieComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {

  protected readonly title = signal('client');

  showProfileMenu = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

toggleProfileMenu() {
  this.showProfileMenu = !this.showProfileMenu;
}

@HostListener('document:click')
closeMenu() {
  this.showProfileMenu = false;
}

  get role() {
    return sessionStorage.getItem('role');
  }

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