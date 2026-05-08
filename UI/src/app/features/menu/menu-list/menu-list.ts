import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-list.html'
})
export class MenuListComponent implements OnInit {

  menu: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public auth: AuthService   
  ) {}

  ngOnInit() {
    this.loadMenu();
  }

  loadMenu() {
    this.api.getMenu().subscribe({
      next: (res: any) => {
        this.menu = res.map((item: any) => ({
          ...item,
          image: this.getImageByName(item.name)
        }));

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert("Failed to load menu");
      }
    });
  }

  getImageByName(name: string): string {
    const n = name.toLowerCase();

    const imageMap: any = {
      'biryani': 'assets/images/biryani.png',
      'fried rice': 'assets/images/fried rice.png',
      'noodles': 'assets/images/noodles.png',
      'burger': 'assets/images/burger.png',
      'pizza': 'assets/images/pizza.png'
    };

    return imageMap[n] || 'assets/images/default-food.png';
  }

  isManager(): boolean {
    return this.auth.getRole() === 'Manager';
  }

  goToOrder(item: any) {

    if (!this.isManager()) {
      alert("Only Manager can place orders");
      return;
    }

    this.router.navigate(['/create-order'], {
      queryParams: {
        name: item.name,
        price: item.price
      }
    });
  }


}