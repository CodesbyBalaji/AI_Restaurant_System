import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  getMenu(): Observable<any> {
    return this.http.get(`${this.baseUrl}/menu`);
  }

  getOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders`);
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

  getDemandPrediction() {
  return this.http.get<any[]>(`${this.baseUrl}/demand/predict`);
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
}