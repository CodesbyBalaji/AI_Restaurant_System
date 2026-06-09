import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { LottieComponent } from "ngx-lottie";

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LottieComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {

  isLoading = true;
  revenue: number = 0;
  demandData: any[] = [];
  aiInsight: string = '';
  peakHoursLoaded = false;

  private peakChart: Chart | null = null;
  private dishChart: Chart | null = null;
  private demandChart: Chart | null = null;
  peakHour: string = '';
  peakOrders: number = 0;

  quietHour: string = '';
  quietOrders: number = 0;

  revenuePeakHour: string = '';
  peakRevenue: number = 0;

  lunchPeakHour: string = '';
  lunchPeakOrders: number = 0;

  @ViewChild('peakChartCanvas') peakChartRef!: ElementRef;
  @ViewChild('dishChartCanvas') dishChartRef!: ElementRef;
  @ViewChild('demandChartCanvas') demandChartRef!: ElementRef;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {

    this.isLoading = true;

    this.loadRevenue();

    this.loadPeakHours();

    this.loadTopDishes();

    this.loadDashboard();
  }

  formatHour(hour: number): string {

    const start = new Date(2000, 0, 1, hour);
    const end = new Date(2000, 0, 1, hour + 1);

    return `${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    })}`;
  }

  loadingOptions = {
    path: '/assets/loading.json'
  };

  aiLoaded = false;
  demandLoaded = false;

  loadDashboard() {

    this.api.getDemandPrediction()
      .subscribe({

        next: (data) => {

          this.demandData = data;

          this.cdr.detectChanges();

          this.renderDemandChart(data);

          this.isLoading = false;
        },

        error: () => {

          this.isLoading = false;
        }
      });

    this.api.getAISummary()
      .subscribe({

        next: (res: any) => {

          this.aiInsight = res.insight;

          this.cdr.detectChanges();
        }
      });
  }

  refreshDashboard() {

    this.isLoading = true;
    this.cdr.detectChanges();

    this.api.getDemandPrediction(true)
      .subscribe({

        next: (data) => {

          this.demandData = data;

          this.renderDemandChart(data);

          this.isLoading = false;

          this.cdr.detectChanges();
        },

        error: () => {

          this.isLoading = false;

          this.cdr.detectChanges();
        }
      });

    this.api.getAISummary(true)
      .subscribe({

        next: (res: any) => {

          this.aiInsight = res.insight;
          this.cdr.detectChanges();
        }
      });
  }

  loadRevenue() {
    this.api.getRevenue().subscribe((res: any) => {
      this.revenue = res.totalRevenue;
      this.cdr.detectChanges();
    });
  }

  loadPeakHours() {

    this.api.getPeakHours().subscribe((data: any[]) => {

      if (!data || data.length === 0) {
        return;
      }

      const labels = data.map(x => `${x.hour}:00`);
      const values = data.map(x => x.orderCount);

      const peakOrdersData = [...data]
        .sort((a, b) => b.orderCount - a.orderCount)[0];

      this.peakHour =
        this.formatHour(peakOrdersData.hour);

      this.peakOrders =
        peakOrdersData.orderCount;

      const quietHourData = [...data]
        .filter(x => x.orderCount > 50)
        .sort((a, b) => a.orderCount - b.orderCount)[0];

      const lunchHours = data.filter(
        x => x.hour >= 12 && x.hour <= 14
      );

      const lunchPeak = [...lunchHours]
        .sort((a, b) => b.orderCount - a.orderCount)[0];

      this.lunchPeakHour =
        this.formatHour(lunchPeak.hour);

      this.lunchPeakOrders =
        lunchPeak.orderCount;

      if (quietHourData) {

        this.quietHour =
          this.formatHour(quietHourData.hour);

        this.quietOrders =
          quietHourData.orderCount;
      }

      this.peakHoursLoaded = true;

      this.cdr.detectChanges();

      const maxOrders = Math.max(...values);

      const lunchPeakValue =
        lunchPeak.orderCount;

      const barColors = values.map(v => {

        if (v === maxOrders) {
          return '#2563EB';
        }

        if (v === lunchPeakValue) {
          return '#93C5FD';
        }

        return '#CBD5E1';
      });

      if (this.peakChart) {
        this.peakChart.destroy();
      }

      setTimeout(() => {

        this.peakChart = new Chart(
          this.peakChartRef.nativeElement,
          {
            type: 'bar',

            data: {
              labels,

              datasets: [
                {
                  label: 'Orders',
                  data: values,
                  backgroundColor: barColors,
                  borderRadius: 8
                }
              ]
            },

            options: {

              responsive: true,
              maintainAspectRatio: false,

              plugins: {

                legend: {
                  display: false
                },

                tooltip: {

                  callbacks: {

                    afterLabel: (context) => {

                      const item = data[context.dataIndex];

                      return [
                        `Revenue: ₹${item.revenue.toLocaleString()}`
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
                },

                x: {
                  title: {
                    display: true,
                    text: 'Hour of Day'
                  }
                }
              }
            }
          }
        );

      }, 0);
    });
  };

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