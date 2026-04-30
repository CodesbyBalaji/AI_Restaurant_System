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
  demandData: any[] = [];
  dishChart: any;
  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadRevenue();
    this.loadPeakHours();
    this.loadTopDishes();
    this.loadDemandPrediction();  
    this.loadDemandChart();       
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

    const colors = [
      '#3B82F6', '#10B981', '#F59E0B',
      '#EF4444', '#8B5CF6', '#14B8A6'
    ];

    const backgroundColors = labels.map((_, i) => colors[i % colors.length]);

    if (this.dishChart) {
      this.dishChart.destroy();
    }
    
    this.dishChart = new Chart("dishChart", {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Orders',
          data: values,
          backgroundColor: backgroundColors,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  });
}

  loadDemandPrediction() {
    this.api.getDemandPrediction().subscribe({
      next: (res: any) => {
        this.demandData = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  loadDemandChart() {
    this.api.getDemandPrediction().subscribe((data: any[]) => {

      const labels = data.map(x => x.dishName);
      const values = data.map(x => x.predictedNextWeek);

      new Chart("demandChart", {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            label: 'Predicted Demand',
            data: values
          }]
        }
      });
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
}