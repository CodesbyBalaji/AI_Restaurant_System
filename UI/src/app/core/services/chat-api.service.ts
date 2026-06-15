import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private baseUrl = 'http://localhost:5000/api/chat';

  constructor(private http: HttpClient) {}

  getConversation(currentUserId: string, otherUserId: string) {
    return this.http.get(
      `${this.baseUrl}/conversation?currentUserId=${currentUserId}&otherUserId=${otherUserId}`
    );
  }

  markAsRead(messageId: string) {
    return this.http.post(
      `${this.baseUrl}/mark-read/${messageId}`,
      {}
    );
  }

  getLastMessage(currentUserId: string, otherUserId: string) {
    return this.http.get(
      `${this.baseUrl}/last-message?currentUserId=${currentUserId}&otherUserId=${otherUserId}`
    );
  }

  deleteMessage(messageId: string) {
    return this.http.delete(`${this.baseUrl}/${messageId}`);
  }
}