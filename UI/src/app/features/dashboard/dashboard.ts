import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

  private peakChart: Chart | null = null;
  private dishChart: Chart | null = null;
  private demandChart: Chart | null = null;

  @ViewChild('peakChartCanvas') peakChartRef!: ElementRef;
  @ViewChild('dishChartCanvas') dishChartRef!: ElementRef;
  @ViewChild('demandChartCanvas') demandChartRef!: ElementRef;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadRevenue();
    this.loadPeakHours();
    this.loadTopDishes();
    this.loadDemandData();
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

      if (this.peakChart) this.peakChart.destroy();

      setTimeout(() => {
        this.peakChart = new Chart(this.peakChartRef.nativeElement, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Orders',
              data: values,
              backgroundColor: '#3B82F6',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
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

      if (this.dishChart) this.dishChart.destroy();

      setTimeout(() => {
        this.dishChart = new Chart(this.dishChartRef.nativeElement, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Orders',
              data: values,
              backgroundColor: labels.map((_, i) => colors[i % colors.length]),
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      });
    });
  }

  loadDemandData() {
    this.api.getDemandPrediction().subscribe({
      next: (data: any[]) => {
        this.demandData = data;
        this.cdr.detectChanges();
        this.renderDemandChart(data);
      },
      error: (err) => console.error('Demand prediction failed:', err)
    });
  }

  private renderDemandChart(data: any[]) {

    const labels = data.map(x => x.dishName);

    const current = data.map(x => x.thisWeek);
    const predicted = data.map(x => x.predictedNextWeek);

    if (this.demandChart) this.demandChart.destroy();

    setTimeout(() => {
      this.demandChart = new Chart(this.demandChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Current Week',
              data: current,
              backgroundColor: '#3B82F6',
              borderRadius: 6
            },
            {
              label: 'Predicted Next Week',
              data: predicted,
              backgroundColor: '#10B981',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  const item = data[ctx.dataIndex];
                  return [
                    `Trend: ${item.trendPercent}%`,
                    `Confidence: ${item.confidencePercent}%`,
                    `Action: ${item.recommendation}`
                  ];
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Orders'
              }
            }
          }
        }
      });
    });
  }

  getTrendArrow(trend: number): string {
    if (trend > 10) return '▲';
    if (trend < -10) return '▼';
    return '→';
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return '#10B981';
    if (confidence >= 65) return '#F59E0B';
    return '#EF4444';
  }

  getImageByName(name: string): string {
    const imageMap: Record<string, string> = {
      'biryani': 'assets/images/biryani.png',
      'fried rice': 'assets/images/fried rice.png',
      'noodles': 'assets/images/noodles.png',
      'burger': 'assets/images/burger.png',
      'pizza': 'assets/images/pizza.png'
    };
    return imageMap[name.toLowerCase()] || 'assets/images/default-food.png';
  }
}