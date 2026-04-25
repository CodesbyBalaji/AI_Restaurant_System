import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

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

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getMenu().subscribe(res => {
      this.menu = res;
    });
  }

  placeOrder() {
    if (this.selectedItemId === 0) {
      alert("Please select an item");
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

        // reset form
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