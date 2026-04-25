import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
    private router: Router  
  ) {}

  ngOnInit() {
    this.api.getMenu().subscribe(res => {

      this.menu = res.map((item: any) => ({
        ...item,
        image: this.getImageByName(item.name)
      }));

      this.cdr.detectChanges();
    });
  }

  getImageByName(name: string): string {
    const n = name.toLowerCase();

    const imageMap: any = {
      'biryani': 'images/biryani.png',
      'fried rice': 'images/fried rice.png',
      'noodles': 'images/noodles.png',
      'burger': 'images/burger.png',
      'pizza': 'images/pizza.png'
    };

    return imageMap[n] || 'images/default-food.jpg';
  }

  goToOrder(item: any) {
  this.router.navigate(['/create-order'], {
    queryParams: {
      name: item.name,
      price: item.price
    }
  });
}
}