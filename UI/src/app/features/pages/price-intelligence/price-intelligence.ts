import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

import {
  Chart,
  registerables
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-price-intelligence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-intelligence.html',
  styleUrl: './price-intelligence.css'
})
export class PriceIntelligenceComponent implements OnInit {
  loading = true;
  dishLoading = false;

  summary: any[] = [];
  cityComparison: any[] = [];
  premiumCompetitors: any[] = [];
  cheapestCompetitors: any[] = [];
  priceComparison: any[] = [];

  pricingInsight = '';
  selectedDish = 'Fried Rice';
  activeSection: 'cities' | 'premium' | 'affordable' | 'insight' = 'cities';

  private priceChart: Chart | null = null;
  private cityChart: Chart | null = null;

  @ViewChild('priceComparisonChart')
  priceChartRef!: ElementRef;

  @ViewChild('cityPricingChart')
  cityChartRef!: ElementRef;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;

    forkJoin({
      summary: this.api.getMarketSummary(),
      comparison: this.api.getPriceComparison()
    }).subscribe({
      next: (result) => {
        this.summary = result.summary;
        this.priceComparison = result.comparison;

        const selectedPriceData =
          this.priceComparison.find(
            x => x.dish?.toLowerCase() === this.selectedDish.toLowerCase()
          );

        this.pricingInsight =
          selectedPriceData?.aiInsight ?? 'No pricing insight available';

        this.loading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.renderPriceComparisonChart();
        }, 0);

        this.loadDishData();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadDishData(): void {
    this.dishLoading = true;

    forkJoin({
      cities: this.api.getCityComparison(this.selectedDish),
      premium: this.api.getPremiumCompetitors(this.selectedDish),
      cheapest: this.api.getCheapestCompetitors(this.selectedDish)
    }).subscribe({
      next: (result) => {
        this.cityComparison = result.cities;
        this.premiumCompetitors = result.premium;
        this.cheapestCompetitors = result.cheapest;

        const selectedPriceData =
          this.priceComparison.find(
            x => x.dish?.toLowerCase() === this.selectedDish.toLowerCase()
          );

        this.pricingInsight =
          selectedPriceData?.aiInsight ?? 'No pricing insight available';

        this.dishLoading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.renderCityPricingChart();
        }, 0);
      },
      error: (err) => {
        console.error(err);
        this.dishLoading = false;
      }
    });
  }

  selectDish(dish: string): void {
    if (this.selectedDish === dish) return;

    this.selectedDish = dish;
    this.activeSection = 'cities';
    this.loadDishData();
  }

  setSection(section: 'cities' | 'premium' | 'affordable' | 'insight'): void {
    this.activeSection = section;

    if (section === 'cities') {
      setTimeout(() => {
        this.renderCityPricingChart();
      }, 0);
    }
  }

  getSelectedDishSummary(): any {
    return this.summary.find(
      x => x.dish?.toLowerCase() === this.selectedDish.toLowerCase()
    );
  }

  getSelectedDishComparison(): any {
    return this.priceComparison.find(
      x => x.dish?.toLowerCase() === this.selectedDish.toLowerCase()
    );
  }

  private renderPriceComparisonChart(): void {
    if (!this.priceComparison || this.priceComparison.length === 0) return;

    const labels = this.priceComparison.map(x => x.dish);
    const yourPrices = this.priceComparison.map(x => x.yourPrice);
    const marketPrices = this.priceComparison.map(x => x.marketAverage);

    if (this.priceChart) {
      this.priceChart.destroy();
    }

    setTimeout(() => {
      this.priceChart = new Chart(this.priceChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Your Price',
              data: yourPrices,
              backgroundColor: '#3B82F6',
              borderRadius: 8,
              barThickness: 28
            },
            {
              label: 'Market Average',
              data: marketPrices,
              backgroundColor: '#10B981',
              borderRadius: 8,
              barThickness: 28
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top'
            },
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  const item = this.priceComparison[ctx.dataIndex];
                  return [
                    `Min Market Price: ₹${item.minMarketPrice}`,
                    `Max Market Price: ₹${item.maxMarketPrice}`,
                    `Difference: ${item.differencePercent}%`
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
                text: 'Price (₹)'
              }
            }
          }
        }
      });
    }, 100);
  }

  private renderCityPricingChart(): void {
    if (!this.cityComparison || this.cityComparison.length === 0 || !this.cityChartRef) return;

    const labels = this.cityComparison.map(x => x.city);
    const values = this.cityComparison.map(x => x.averagePrice);

    if (this.cityChart) {
      this.cityChart.destroy();
    }

    this.cityChart = new Chart(this.cityChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#3B82F6',
              '#6366F1',
              '#8B5CF6',
              '#06B6D4',
              '#10B981',
              '#F59E0B'
            ],
            borderColor: '#ffffff',
            borderWidth: 3,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 18
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ₹${value}`;
              }
            }
          }
        }
      }
    });
  }

  getDishEmoji(dish: string): string {
    switch (dish.toLowerCase()) {
      case 'biriyani':
        return '🍛';
      case 'pizza':
        return '🍕';
      case 'burger':
        return '🍔';
      case 'noodles':
        return '🍜';
      case 'fried rice':
        return '🍚';
      default:
        return '🍽️';
    }
  }
}