import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-list.html'
})
export class OrdersListComponent implements OnInit {

  orders: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.api.getOrders().subscribe(res => {
      this.orders = res;
      this.cdr.detectChanges();
    });
  }

  isAdmin(): boolean {
    return this.auth.getRole() === 'Admin';
  }

  isManagerOrAdmin(): boolean {
    const role = this.auth.getRole();
    return role === 'Admin' || role === 'Manager';
  }

  deleteOrder(id: number) {
    if (!this.isAdmin()) {
      alert("Only Admin can delete orders");
      return;
    }

    if (!confirm("Are you sure you want to delete this order?")) return;

    this.api.deleteOrder(id).subscribe({
      next: () => {
        alert("Order deleted");
        this.loadOrders();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  updateStatus(id: number, status: string) {
    this.api.updateOrderStatus(id, status).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }
}