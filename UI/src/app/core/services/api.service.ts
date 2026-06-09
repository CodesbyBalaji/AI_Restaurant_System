import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:5000/api';
  private dashboardCache: any = null;
  private demandPredictionCache: any = null;
  private aiSummaryCache: any = null;
  private menuInsightsCache: any = null;

  constructor(private http: HttpClient) { }

  getMenu(): Observable<any> {
    return this.http.get(`${this.baseUrl}/menu`);
  }

  getOrders(filter: string = 'week') {
    return this.http.get<any[]>(
      `${this.baseUrl}/orders?filter=${filter}`
    );
  }

  createOrder(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/orders`, data);
  }

  getPeakHours(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reports/peak-hours`);
  }

  getTopDishes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reports/top-dishes`);
  }

  getRevenue(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/revenue`);
  }

  getDemandPrediction(forceRefresh = false) {

  if (this.demandPredictionCache && !forceRefresh) {
    return of(this.demandPredictionCache);
  }

  return this.http
    .get<any[]>(`${this.baseUrl}/demand/predict`)
    .pipe(
      tap(data => {
        this.demandPredictionCache = data;
      })
    );
}

  getAISummary(forceRefresh = false) {

  if (this.aiSummaryCache && !forceRefresh) {
    return of(this.aiSummaryCache);
  }

  return this.http
    .get<any>(`${this.baseUrl}/insights/summary`)
    .pipe(
      tap(data => {
        this.aiSummaryCache = data;
      })
    );
}

  deleteOrder(id: number) {
    return this.http.delete(`${this.baseUrl}/orders/${id}`);
  }

  updateOrderStatus(id: number, status: string) {
    return this.http.put(
      `${this.baseUrl}/orders/${id}/status`,
      JSON.stringify(status),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  getMenuInsights(forceRefresh = false) {

  if (this.menuInsightsCache && !forceRefresh) {
    return of(this.menuInsightsCache);
  }

  return this.http
    .get<any[]>('http://localhost:5000/api/menu/optimize')
    .pipe(
      tap(data => {
        this.menuInsightsCache = data;
      })
    );
}

  updateMenuPrice(id: number, price: number) {
    return this.http.put(`http://localhost:5000/api/menu/${id}/price`, price);
  }

  getMarketSummary() {

  return this.http.get<any[]>(
    `${this.baseUrl}/priceintelligence/summary`
  );

}

getCityComparison(dish: string) {

  return this.http.get<any[]>(
    `${this.baseUrl}/priceintelligence/cities?dish=${dish}`
  );

}

getPremiumCompetitors(dish: string) {

  return this.http.get<any[]>(
    `${this.baseUrl}/priceintelligence/premium?dish=${dish}`
  );

}

getCheapestCompetitors(dish: string) {

  return this.http.get<any[]>(
    `${this.baseUrl}/priceintelligence/cheapest?dish=${dish}`
  );

}

getPriceComparison() {

  return this.http.get<any[]>(
    `${this.baseUrl}/priceintelligence/price-comparison`
  );

}

}