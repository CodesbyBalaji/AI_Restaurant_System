import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient) {}

  login(data: any) {
    return this.http.post(`${this.baseUrl}/login`, data);
  }

  saveAuth(res: any) {
    sessionStorage.setItem('token', res.token);
    sessionStorage.setItem('role', res.role);
    sessionStorage.setItem('username', res.username);

    this.startAutoLogout(); 
  }

  getToken() {
    return sessionStorage.getItem('token');
  }

  getRole() {
    return sessionStorage.getItem('role');
  }

  getTokenExpiry(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; 
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const expiry = this.getTokenExpiry();
    if (!expiry) return true;

    return Date.now() > expiry;
  }

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;

    if (this.isTokenExpired()) {
      this.logout();
      return false;
    }

    return true;
  }

  startAutoLogout() {
    const expiry = this.getTokenExpiry();
    if (!expiry) return;

    const timeout = expiry - Date.now();

    if (timeout <= 0) {
      this.logout();
      return;
    }

    setTimeout(() => {
      this.logout();
      alert('Session expired. Please login again.');
      window.location.href = '/login';
    }, timeout);
  }

  logout() {
    sessionStorage.clear();
  }
}