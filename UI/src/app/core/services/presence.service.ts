import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private hubConnection!: signalR.HubConnection;

  onlineUsers$ = new BehaviorSubject<string[]>([]);
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
      .withUrl('http://localhost:5000/hubs/presence', {
        accessTokenFactory: () => sessionStorage.getItem('token') || ''
      })
      .withAutomaticReconnect()
      .build();

    this.registerListeners();

    this.hubConnection.onreconnected(() => {
      this.zone.run(() => {
        this.hubConnection.invoke('GetOnlineUsers');
        this.reconnect$.next(true);
      });
    });

    this.hubConnection
      .start()
      .then(() => {
        console.log('PresenceHub connected');
        this.hubConnection.invoke('GetOnlineUsers');
      })
      .catch(err => console.log(err));
  }

  private registerListeners() {
    this.hubConnection.on('UserOnline', (userId: string) => {
      this.zone.run(() => {
        const users = this.onlineUsers$.value;
        if (!users.includes(userId)) {
          this.onlineUsers$.next([...users, userId]);
        }
      });
    });

    this.hubConnection.on('UserOffline', (userId: string) => {
      this.zone.run(() => {
        const users = this.onlineUsers$.value.filter(x => x !== userId);
        this.onlineUsers$.next(users);
      });
    });

    this.hubConnection.on('GetOnlineUsers', (users: string[]) => {
      this.zone.run(() => {
        this.onlineUsers$.next(users);
      });
    });
  }
}