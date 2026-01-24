import { useRef, useEffect } from "react"
import { ChatMessage, type Message } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { SettingsDropdown } from "./SettingsDropdown"
import { Skeleton } from "./ui/skeleton"
import { Bot, Loader2 } from "lucide-react"
import type { Theme } from "./Settings"

interface ChatProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  onOpenSettings: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  isLoading?: boolean
}

export function Chat({
  messages,
  onSendMessage,
  onOpenSettings,
  theme,
  onThemeChange,
  isLoading = false,
}: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-foreground">Companion</h1>
          <p className="text-xs text-muted-foreground">Your page assistant</p>
        </div>
        <SettingsDropdown
          theme={theme}
          onThemeChange={onThemeChange}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              How can I help you?
            </h2>
            <p className="text-sm text-muted-foreground">
              Ask me anything about the current page
            </p>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                </div>
                <div className="flex max-w-[80%] flex-col gap-2 rounded-2xl rounded-tl-sm bg-assistant-bubble px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-32 bg-muted/50" />
                    <Skeleton className="h-3 w-20 bg-muted/50" />
                  </div>
                  <Skeleton className="h-3 w-48 bg-muted/50" />
                  <div className="flex items-center gap-1 pt-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={onSendMessage} disabled={isLoading} />
    </div>
  )
}
