import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private baseUrl = 'http://localhost:5000/api/chat';

  constructor(private http: HttpClient) {}

  getConversation(otherUserId: string): Observable<any> {
    const params = new HttpParams().set('otherUserId', otherUserId);
    return this.http.get(`${this.baseUrl}/conversation`, { params });
  }

  markAsRead(messageId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/mark-read/${messageId}`, {});
  }

  getLastMessage(otherUserId: string): Observable<any> {
    const params = new HttpParams().set('otherUserId', otherUserId);
    return this.http.get(`${this.baseUrl}/last-message`, { params });
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${messageId}`);
  }
}