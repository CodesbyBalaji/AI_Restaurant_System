import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubConnection: signalR.HubConnection | null = null;
  private listenersRegistered = false;
  private startingPromise: Promise<void> | null = null;

  messages$ = new BehaviorSubject<any | null>(null);
  messageDelivered$ = new BehaviorSubject<string | null>(null);
  messageRead$ = new BehaviorSubject<string | null>(null);
  messageDeleted$ = new BehaviorSubject<string | null>(null);
  reconnect$ = new BehaviorSubject<boolean>(false);
  aiTyping$ = new BehaviorSubject<boolean>(false);
  connectionState$ = new BehaviorSubject<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );

  constructor(private zone: NgZone) {}

  startConnection(): Promise<void> {
    if (
      this.hubConnection &&
      (
        this.hubConnection.state === signalR.HubConnectionState.Connected ||
        this.hubConnection.state === signalR.HubConnectionState.Connecting ||
        this.hubConnection.state === signalR.HubConnectionState.Reconnecting
      )
    ) {
      return Promise.resolve();
    }

    if (this.startingPromise) {
      return this.startingPromise;
    }

    if (!this.hubConnection) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:5000/hubs/chat', {
          accessTokenFactory: () => sessionStorage.getItem('token') || ''
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.registerListeners();
      this.registerConnectionLifecycleEvents();
    }

    this.connectionState$.next(this.hubConnection.state);

    this.startingPromise = this.hubConnection
      .start()
      .then(() => {
        this.zone.run(() => {
          this.connectionState$.next(this.hubConnection!.state);
          this.reconnect$.next(false);
        });
        console.log('ChatHub connected');
      })
      .catch(err => {
        this.zone.run(() => {
          this.connectionState$.next(signalR.HubConnectionState.Disconnected);
        });
        console.error('ChatHub connection error:', err);
        throw err;
      })
      .finally(() => {
        this.startingPromise = null;
      });

    return this.startingPromise;
  }

  private registerConnectionLifecycleEvents() {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting(error => {
      this.zone.run(() => {
        this.connectionState$.next(signalR.HubConnectionState.Reconnecting);
        this.reconnect$.next(false);
      });
      console.warn('ChatHub reconnecting...', error);
    });

    this.hubConnection.onreconnected(() => {
      this.zone.run(() => {
        this.connectionState$.next(this.hubConnection!.state);
        this.reconnect$.next(true);
      });
      console.log('ChatHub reconnected');
    });

    this.hubConnection.onclose(error => {
      this.zone.run(() => {
        this.connectionState$.next(signalR.HubConnectionState.Disconnected);
        this.reconnect$.next(false);
        this.aiTyping$.next(false);
      });
      console.warn('ChatHub closed', error);
    });
  }

  private registerListeners() {
    if (!this.hubConnection || this.listenersRegistered) return;

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

    this.hubConnection.on('AITyping', () => {
      this.zone.run(() => {
        this.aiTyping$.next(true);
      });
    });

    this.hubConnection.on('AIStoppedTyping', () => {
      this.zone.run(() => {
        this.aiTyping$.next(false);
      });
    });

    this.listenersRegistered = true;
  }

  async sendMessage(receiverId: string, content: string): Promise<void> {
    const text = content?.trim();
    if (!text) return;

    await this.ensureConnected();
    return this.hubConnection!.invoke('SendMessage', receiverId, text);
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!messageId) return;

    await this.ensureConnected();
    return this.hubConnection!.invoke('MarkAsRead', messageId);
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!messageId) return;

    await this.ensureConnected();
    return this.hubConnection!.invoke('DeleteMessage', messageId);
  }

  async stopConnection(): Promise<void> {
    if (!this.hubConnection) return;

    if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
      return;
    }

    await this.hubConnection.stop();

    this.zone.run(() => {
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);
      this.aiTyping$.next(false);
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.hubConnection) {
      await this.startConnection();
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Connecting) {
      if (this.startingPromise) {
        await this.startingPromise;
      }
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Reconnecting) {
      throw new Error('Chat connection is reconnecting. Please try again.');
    }

    await this.startConnection();
  }
}