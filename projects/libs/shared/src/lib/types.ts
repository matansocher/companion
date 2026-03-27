// Chat message types
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

// Theme and settings types
export type Theme = 'dark' | 'light' | 'system';

export type SettingsState = {
  theme: Theme;
};

// API request/response types
export type ChatContext = {
  pageUrl?: string;
  pageTitle?: string;
  pageContent?: string;
};

export type SendMessageRequest = {
  content: string;
  context?: ChatContext;
};

export type SendMessageResponse = {
  message: Message;
};

export type GetMessagesResponse = {
  messages: Message[];
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Analytics types
export type PageVisit = {
  id: string;
  url: string;
  domain: string;
  title: string;
  startTime: number; // epoch ms
  endTime: number; // epoch ms
  duration: number; // ms (precomputed)
};

export type DomainCategory = 'Social Media' | 'Work' | 'News' | 'Entertainment' | 'Shopping' | 'Development' | 'Other';

export type DomainSummary = {
  domain: string;
  category: DomainCategory;
  totalDuration: number;
  visitCount: number;
};

export type TimeRange = 'today' | '7days' | '30days' | 'all';

export type AnalyticsSettings = {
  blocklist: string[];
  trackingEnabled: boolean;
  pinnedDomains: string[];
  customCategories: Record<string, DomainCategory>;
  idleTimeoutMs: number; // ms of inactivity before pausing timer (0 = disabled)
};

// Focus mode types
export type FocusBudget = {
  domain: string;
  dailyLimitMs: number; // daily budget in milliseconds
};

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

// Telegram types
export type TelegramChat = {
  peerId: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  avatarText: string; // initials fallback
  avatarUrl: string; // data URI of the avatar image
  isPinned: boolean;
  isMuted: boolean;
};

export type TelegramMessage = {
  id: string;
  text: string;
  time: string;
  isOwn: boolean;
  senderName: string;
};

// WhatsApp types
export type WhatsAppChat = {
  chatId: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  avatarText: string;
  avatarUrl: string;
  isPinned: boolean;
  isMuted: boolean;
};

export type WhatsAppMessage = {
  id: string;
  text: string;
  time: string;
  isOwn: boolean;
  senderName: string;
};

// Calendar types
export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  description: string;
};
