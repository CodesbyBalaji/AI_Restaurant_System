import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubConnection!: signalR.HubConnection;

  messages$ = new BehaviorSubject<any | null>(null);
  messageDelivered$ = new BehaviorSubject<string | null>(null);
  messageRead$ = new BehaviorSubject<string | null>(null);
  messageDeleted$ = new BehaviorSubject<string | null>(null);
  reconnect$ = new BehaviorSubject<boolean>(false);

  constructor(private zone: NgZone) {}

  startConnection() {
    if (
      this.hubConnection &&
      this.hubConnection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/chat', {
        accessTokenFactory: () => sessionStorage.getItem('token') || ''
      })
      .withAutomaticReconnect()
      .build();

    this.registerListeners();

    this.hubConnection.onreconnected(() => {
      this.zone.run(() => {
        this.reconnect$.next(true);
      });
    });

    this.hubConnection
      .start()
      .then(() => console.log('ChatHub connected'))
      .catch(err => console.log(err));
  }

  private registerListeners() {
    this.hubConnection.on('ReceiveMessage', (message: any) => {
      this.zone.run(() => {
        this.messages$.next(message);
      });
    });

    this.hubConnection.on('MessageDelivered', (messageId: string) => {
      this.zone.run(() => {
        this.messageDelivered$.next(messageId);
      });
    });

    this.hubConnection.on('MessageRead', (messageId: string) => {
      this.zone.run(() => {
        this.messageRead$.next(messageId);
      });
    });

    this.hubConnection.on('MessageDeleted', (messageId: string) => {
      this.zone.run(() => {
        this.messageDeleted$.next(messageId);
      });
    });
  }

  sendMessage(receiverId: string, content: string) {
    return this.hubConnection.invoke('SendMessage', receiverId, content);
  }

  markAsRead(messageId: string) {
    return this.hubConnection.invoke('MarkAsRead', messageId);
  }

  deleteMessage(messageId: string) {
    return this.hubConnection.invoke('DeleteMessage', messageId);
  }
}