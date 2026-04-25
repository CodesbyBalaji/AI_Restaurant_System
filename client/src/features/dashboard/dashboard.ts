import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {

  revenue: number = 0;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadRevenue();
    this.loadPeakHours();
    this.loadTopDishes();
  }

  loadRevenue() {
    this.api.getRevenue().subscribe((res: any) => {
      this.revenue = res.totalRevenue;
      this.cdr.detectChanges();
    });
  }

  loadPeakHours() {
    this.api.getPeakHours().subscribe((data: any[]) => {

      const labels = data.map(x => x.hour);
      const values = data.map(x => x.orderCount);

      new Chart("peakChart", {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Orders',
            data: values
          }]
        }
      });
    });
  }

  loadTopDishes() {
    this.api.getTopDishes().subscribe((data: any[]) => {

      const labels = data.map(x => x.menuItemName);
      const values = data.map(x => x.totalOrders);

      new Chart("dishChart", {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Orders',
            data: values
          }]
        }
      });
    });
  }
}