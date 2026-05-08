import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-insights',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-insights.html'
})
export class MenuInsightsComponent implements OnInit {

  insights: any[] = [];
  loading = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadInsights();
  }

  loadInsights() {
    this.loading = true;

    this.api.getMenuInsights().subscribe({
      next: (data: any[]) => {
        this.insights = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Menu Insights Error:', err);
        alert('Failed to load menu insights');
        this.loading = false;
      }
    });
  }

  apply(item: any) {
    if (!confirm(`Apply new price ₹${item.suggestedPrice} for ${item.name}?`)) {
      return;
    }

    this.api.updateMenuPrice(item.id, item.suggestedPrice)
      .subscribe({
        next: () => {
          alert('Price updated successfully!');
          this.loadInsights();
        },
        error: (err) => {
          console.error('Update Error:', err);
          alert('Failed to update price');
        }
      });
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'Increase Price': return 'text-green-600';
      case 'Reduce Price': return 'text-red-500';
      case 'Review Cost': return 'text-yellow-500';
      default: return 'text-gray-600';
    }
  }
}