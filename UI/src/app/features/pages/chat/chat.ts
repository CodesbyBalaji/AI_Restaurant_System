import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../core/services/chat.service';
import { ChatApiService } from '../../../core/services/chat-api.service';
import { PresenceService } from '../../../core/services/presence.service';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  username = '';
  role = '';
  messageText = '';
  selectedUser: any;
  onlineUsers: string[] = [];
  messages: ChatMessage[] = [];
  users: any[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private chatApi: ChatApiService,
    private presenceService: PresenceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.username = sessionStorage.getItem('username') || '';
    this.role = sessionStorage.getItem('role') || '';

    if (!this.username) {
      console.error('Username missing from session storage');
      return;
    }

    if (this.role === 'Admin') {
      this.users = [{ id: 'manager', name: 'Restaurant Manager', lastMessage: '' }];
    } else {
      this.users = [{ id: 'admin', name: 'Administrator', lastMessage: '' }];
    }

    this.selectedUser = this.users[0];

    this.chatService.startConnection();
    this.presenceService.startConnection();

    this.loadConversation();
    this.loadLastMessage();

    this.subscriptions.push(
      this.chatService.messages$.subscribe((message: ChatMessage | null) => {
        if (!message) return;

        const isCurrentConversation =
          (message.senderId === this.username && message.receiverId === this.selectedUser.id) ||
          (message.senderId === this.selectedUser.id && message.receiverId === this.username);

        if (!isCurrentConversation) return;

        const exists = this.messages.some(m => m.id === message.id);

        if (!exists) {
          this.messages = [...this.messages, message];
          this.updateLastMessage(message);
          this.markIncomingMessagesAsRead();
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 0);
        }
      })
    );

    this.subscriptions.push(
      this.chatService.messageDelivered$.subscribe((messageId: string | null) => {
        if (!messageId) return;
        const msg = this.messages.find(m => m.id === messageId);
        if (msg) {
          msg.deliveredAt = new Date().toISOString();
          this.messages = [...this.messages];
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.chatService.messageRead$.subscribe((messageId: string | null) => {
        if (!messageId) return;
        const msg = this.messages.find(m => m.id === messageId);
        if (msg) {
          msg.readAt = new Date().toISOString();
          this.messages = [...this.messages];
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.chatService.messageDeleted$.subscribe((messageId: string | null) => {
        if (!messageId) return;
        this.messages = this.messages.filter(m => m.id !== messageId);
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.presenceService.onlineUsers$.subscribe((users: string[]) => {
        this.onlineUsers = [...users];
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.chatService.reconnect$.subscribe((ok: boolean) => {
        if (ok) {
          this.loadConversation();
          this.loadLastMessage();
        }
      })
    );

    this.subscriptions.push(
      this.presenceService.reconnect$.subscribe((ok: boolean) => {
        if (ok) {
          this.loadConversation();
        }
      })
    );

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.loadConversation();
      this.loadLastMessage();
    }
  };

  loadConversation() {
    if (!this.username || !this.selectedUser?.id) return;

    this.chatApi.getConversation(this.username, this.selectedUser.id).subscribe({
      next: (messages: any) => {
        this.messages = [...(messages || [])];
        this.markIncomingMessagesAsRead();
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: err => console.error(err)
    });
  }

  loadLastMessage() {
    if (!this.username || !this.selectedUser?.id) return;

    this.chatApi.getLastMessage(this.username, this.selectedUser.id).subscribe({
      next: (message: any) => {
        if (message) {
          this.selectedUser.lastMessage = message.content;
          this.cdr.detectChanges();
        }
      },
      error: err => console.error(err)
    });
  }

  updateLastMessage(message: ChatMessage) {
    this.selectedUser.lastMessage = message.content;
  }

  markIncomingMessagesAsRead() {
    const unreadMessages = this.messages.filter(
      m =>
        m.receiverId?.toLowerCase() === this.username?.toLowerCase() &&
        !m.readAt
    );

    unreadMessages.forEach(msg => {
      this.chatApi.markAsRead(msg.id).subscribe();
      this.chatService.markAsRead(msg.id);
    });
  }

  sendMessage() {
    if (!this.messageText.trim()) return;

    const text = this.messageText.trim();

    this.chatService.sendMessage(this.selectedUser.id, text)
      .then(() => {
        this.messageText = '';
      })
      .catch(err => console.error(err));
  }

  deleteMessage(message: ChatMessage) {
    this.chatApi.deleteMessage(message.id).subscribe({
      next: () => {
        this.chatService.deleteMessage(message.id);
      },
      error: err => {
        console.error(err);
        this.loadConversation();
      }
    });
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.senderId?.toLowerCase() === this.username?.toLowerCase();
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.some(x => x.toLowerCase() === userId.toLowerCase());
  }

  scrollToBottom() {
    if (!this.scrollContainer) return;
    const element = this.scrollContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  selectUser(user: any) {
    this.selectedUser = user;
    this.loadConversation();
    this.loadLastMessage();
  }
}