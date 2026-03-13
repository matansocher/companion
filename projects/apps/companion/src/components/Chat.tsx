import { Bot, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage, type Message } from './ChatMessage';
import { Skeleton } from './ui/skeleton';

type ChatProps = {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
};

export function Chat({ messages, onSendMessage, isLoading = false }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-foreground">How can I help you?</h2>
            <p className="text-sm text-muted-foreground">Ask me anything about the current page</p>
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
  );
}
