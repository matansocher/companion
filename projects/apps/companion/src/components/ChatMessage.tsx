import { Bot, User } from 'lucide-react';
import type { Message } from '@companion/shared';
import { cn } from '../lib/utils';

export type { Message };

type ChatMessageProps = {
  message: Message;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', isUser ? 'bg-primary' : 'bg-muted')}>
        {isUser ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div
        className={cn('flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2', isUser ? 'bg-user-bubble text-primary-foreground rounded-tr-sm' : 'bg-assistant-bubble text-foreground rounded-tl-sm')}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.timestamp && (
          <span className="text-xs opacity-60">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
