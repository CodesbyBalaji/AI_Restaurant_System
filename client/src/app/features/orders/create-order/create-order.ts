import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-order.html'
})
export class CreateOrderComponent implements OnInit {

  menu: any[] = [];
  selectedItemId: number = 0;
  quantity: number = 1;

  constructor(
    private api: ApiService,
    public auth: AuthService 
  ) {}

  ngOnInit() {
    this.loadMenu();
  }

  loadMenu() {
    this.api.getMenu().subscribe({
      next: (res: any) => {
        this.menu = res;
      },
      error: (err) => {
        console.error(err);
        alert("Failed to load menu");
      }
    });
  }

  isManager(): boolean {
    return this.auth.getRole() === 'Manager';
  }

  placeOrder() {

    if (!this.isManager()) {
      alert("Only Manager can place orders");
      return;
    }

    if (this.selectedItemId === 0) {
      alert("Please select an item");
      return;
    }

    if (this.quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    const order = {
      menuItemId: this.selectedItemId,
      quantity: this.quantity
    };

    this.api.createOrder(order).subscribe({
      next: (res) => {
        alert("Order placed successfully!");
        console.log(res);

        this.selectedItemId = 0;
        this.quantity = 1;
      },
      error: (err) => {
        console.error(err);
        alert("Error placing order");
      }
    });
  }
}