// Chat message types
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: Date
}

// Theme and settings types
export type Theme = "dark" | "light" | "system"

export interface SettingsState {
  theme: Theme
}

// API request/response types
export interface ChatContext {
  pageUrl?: string
  pageTitle?: string
  pageContent?: string
}

export interface SendMessageRequest {
  content: string
  context?: ChatContext
}

export interface SendMessageResponse {
  message: Message
}

export interface GetMessagesResponse {
  messages: Message[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
