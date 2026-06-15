import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { ApiService } from '../../core/services/api.service';

import { CommonModule } from '@angular/common';
import { LottieComponent } from 'ngx-lottie';

@Component({
  selector: 'app-menu-insights',
  standalone: true,
  imports: [CommonModule, LottieComponent],
  templateUrl: './menu-insights.html'
})

export class MenuInsightsComponent implements OnInit {

  insights: any[] = [];

  loading = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  loadingOptions = {
  path: '/assets/insight.json'
};
 loadingText = 'Generating AI Menu Insights...';

  ngOnInit(): void {
  if (this.insights.length > 0) {
      return;
    }
    this.loadInsights();
  }

  refreshInsights(): void {

  this.loading = true;

  this.cdr.detectChanges();

  this.api.getMenuInsights(true)
    .subscribe({

      next: (data: any[]) => {

        this.insights = data;

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (err) => {

        console.error(
          'Menu Insights Error:',
          err
        );

        this.loading = false;

        this.cdr.detectChanges();
      }
    });
}

  loadInsights(): void {

    this.loading = true;

    this.cdr.detectChanges();

    this.api.getMenuInsights()
      .subscribe({

        next: (data: any[]) => {

          this.insights = data;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (err) => {

          console.error(
            'Menu Insights Error:',
            err
          );

          this.loading = false;

          this.cdr.detectChanges();
        }
      });
  }

  activeTabs: { [key: number]: string } = {};

  setTab(itemId: number, tab: string): void {
    this.activeTabs[itemId] = tab;
  }

  getActiveTab(itemId: number): string {
    return this.activeTabs[itemId] || 'overview';
  }

  apply(item: any): void {

    const confirmed = confirm(
      `Apply optimized price ₹${item.optimizedPrice} for ${item.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.loading = true;

    this.cdr.detectChanges();

    this.api.updateMenuPrice(
      item.id,
      item.optimizedPrice
    )
    .subscribe({

      next: () => {

        item.currentPrice = item.optimizedPrice;

        item.optimizedPrice = item.currentPrice;

        item.priceChangePercent = 0;

        this.loading = false;

        this.cdr.detectChanges();

        setTimeout(() => {

          alert('Price updated successfully!');

        }, 100);

      },

      error: (err) => {

        console.error(
          'Update Error:',
          err
        );

        alert('Failed to update price');

        this.loading = false;

        this.cdr.detectChanges();
      }
    });
  }

  getTrendColor(value: number): string {

    if (value > 5) {
      return 'text-green-600';
    }

    if (value < -5) {
      return 'text-red-500';
    }

    return 'text-yellow-500';
  }

  getCategoryColor(category: string): string {

    if (category.includes('Star')) {
      return 'bg-green-100 text-green-700';
    }

    if (category.includes('Popular')) {
      return 'bg-orange-100 text-orange-700';
    }

    if (category.includes('Premium')) {
      return 'bg-blue-100 text-blue-700';
    }

    return 'bg-red-100 text-red-700';
  }

  trackById(index: number, item: any): number {

    return item.id;
  }
}