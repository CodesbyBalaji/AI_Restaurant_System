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

  readonly aiUserId = 'RestaurantAI';

  username = '';
  role = '';
  messageText = '';
  selectedUser: any;
  onlineUsers: string[] = [];
  messages: ChatMessage[] = [];
  users: any[] = [];
  aiTyping = false;

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

    const humanChat =
      this.role === 'Admin'
        ? { id: 'manager', name: 'Restaurant Manager', lastMessage: '', isAI: false }
        : { id: 'admin', name: 'Administrator', lastMessage: '', isAI: false };

    const aiChat = {
      id: this.aiUserId,
      name: 'Restaurant AI',
      lastMessage: '',
      isAI: true
    };

    this.users = [humanChat, aiChat];
    this.selectedUser = this.users[0];

    this.chatService.startConnection();
    this.presenceService.startConnection();

    this.loadConversation();
    this.loadAllLastMessages();

    this.subscriptions.push(
      this.chatService.messages$.subscribe((message: ChatMessage | null) => {
        if (!message) return;

        const normalizedMessage = this.normalizeMessageDates(message);

        this.updateSidebarLastMessage(normalizedMessage);

        if (!this.isMessageForSelectedConversation(normalizedMessage)) {
          this.cdr.detectChanges();
          return;
        }

        const existingIndex = this.messages.findIndex(m => m.id === normalizedMessage.id);

        if (existingIndex === -1) {
          this.messages = [...this.messages, normalizedMessage];
        } else {
          const updatedMessages = [...this.messages];
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            ...normalizedMessage
          };
          this.messages = updatedMessages;
        }

        if (
          normalizedMessage.receiverId?.toLowerCase() === this.username?.toLowerCase() &&
          !normalizedMessage.readAt
        ) {
          this.chatApi.markAsRead(normalizedMessage.id).subscribe({
            error: err => console.error(err)
          });

          this.chatService.markAsRead(normalizedMessage.id).catch(err => console.error(err));
        }

        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      })
    );

    this.subscriptions.push(
      this.chatService.messageDelivered$.subscribe((messageId: string | null) => {
        if (!messageId) return;

        const index = this.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[index] = {
            ...updatedMessages[index],
            deliveredAt: new Date().toISOString()
          };
          this.messages = updatedMessages;
          this.cdr.detectChanges();
        }
      })
    );

    this.subscriptions.push(
      this.chatService.messageRead$.subscribe((messageId: string | null) => {
        if (!messageId) return;

        const index = this.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          const updatedMessages = [...this.messages];
          updatedMessages[index] = {
            ...updatedMessages[index],
            readAt: new Date().toISOString()
          };
          this.messages = updatedMessages;
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
      this.chatService.aiTyping$.subscribe((typing: boolean) => {
        this.aiTyping = this.selectedUser?.id === this.aiUserId ? typing : false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      })
    );

    this.subscriptions.push(
      this.chatService.reconnect$.subscribe((ok: boolean) => {
        if (ok) {
          this.loadConversation();
          this.loadAllLastMessages();
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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private isMessageForSelectedConversation(message: ChatMessage): boolean {
    if (!this.selectedUser?.id) return false;

    return (
      (message.senderId === this.username && message.receiverId === this.selectedUser.id) ||
      (message.senderId === this.selectedUser.id && message.receiverId === this.username)
    );
  }

  loadConversation() {
    if (!this.username || !this.selectedUser?.id) return;

    this.aiTyping = false;

    this.chatApi.getConversation(this.selectedUser.id).subscribe({
      next: (messages: ChatMessage[]) => {
        this.messages = (messages || []).map(m => this.normalizeMessageDates(m));
        this.markIncomingMessagesAsRead();
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: err => console.error(err)
    });
  }

  loadAllLastMessages() {
    this.users.forEach(user => {
      this.chatApi.getLastMessage(user.id).subscribe({
        next: (message: ChatMessage | null) => {
          user.lastMessage = message?.content || '';
          this.cdr.detectChanges();
        },
        error: err => console.error(err)
      });
    });
  }

  updateSidebarLastMessage(message: ChatMessage) {
    const peerId =
      message.senderId === this.username ? message.receiverId : message.senderId;

    const user = this.users.find(u => u.id === peerId);
    if (user) {
      user.lastMessage = message.content;
    }
  }

  markIncomingMessagesAsRead() {
    const unreadMessages = this.messages.filter(
      m =>
        m.receiverId?.toLowerCase() === this.username?.toLowerCase() &&
        !m.readAt
    );

    unreadMessages.forEach(msg => {
      this.chatApi.markAsRead(msg.id).subscribe({
        error: err => console.error(err)
      });

      this.chatService.markAsRead(msg.id).catch(err => console.error(err));
    });
  }

  async sendMessage() {
    const text = this.messageText.trim();
    if (!text || !this.selectedUser?.id) return;

    this.messageText = '';
    this.cdr.detectChanges();

    try {
      await this.chatService.sendMessage(this.selectedUser.id, text);
      setTimeout(() => this.scrollToBottom(), 0);
    } catch (err) {
      console.error(err);
      this.messageText = text;
      this.cdr.detectChanges();
    }
  }

  deleteMessage(message: ChatMessage) {
    this.chatApi.deleteMessage(message.id).subscribe({
      next: () => {
        this.chatService.deleteMessage(message.id).catch(err => console.error(err));
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

  isAIMessage(message: ChatMessage): boolean {
    return message.senderId === this.aiUserId;
  }

  isOnline(userId: string): boolean {
    if (userId === this.aiUserId) return true;
    return this.onlineUsers.some(x => x.toLowerCase() === userId.toLowerCase());
  }

  scrollToBottom() {
    if (!this.scrollContainer) return;

    const element = this.scrollContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  selectUser(user: any) {
    this.selectedUser = user;
    this.aiTyping = false;
    this.loadConversation();
  }

  private normalizeMessageDates(message: ChatMessage): ChatMessage {
    return {
      ...message,
      sentAt: this.toUtcString(message.sentAt),
      deliveredAt: message.deliveredAt ? this.toUtcString(message.deliveredAt) : undefined,
      readAt: message.readAt ? this.toUtcString(message.readAt) : undefined
    };
  }

  private toUtcString(value: string): string {
    if (!value) return value;

    const trimmed = value.trim();

    if (
      trimmed.endsWith('Z') ||
      /[+-]\d{2}:\d{2}$/.test(trimmed)
    ) {
      return trimmed;
    }

    return `${trimmed}Z`;
  }
}