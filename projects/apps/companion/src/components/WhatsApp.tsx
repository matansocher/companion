import { ArrowLeft, MessageCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WhatsAppChat, WhatsAppMessage } from '@companion/shared';
import { getWhatsAppChats, getWhatsAppMessages } from '../lib/whatsapp';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

type WhatsAppView = { screen: 'list' } | { screen: 'chat'; chat: WhatsAppChat };

type ListState = { status: 'loading' } | { status: 'no_tab' } | { status: 'error'; message: string } | { status: 'ok'; chats: WhatsAppChat[] };

type ChatState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; messages: WhatsAppMessage[] };

export function WhatsApp() {
  const [view, setView] = useState<WhatsAppView>({ screen: 'list' });

  if (view.screen === 'chat') {
    return <ConversationView chat={view.chat} onBack={() => setView({ screen: 'list' })} />;
  }

  return <ChatListView onSelectChat={(chat) => setView({ screen: 'chat', chat })} />;
}

// ─── Skeletons ───────────────────────────────────────────────

function ChatListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  const widths = ['w-48', 'w-32', 'w-56', 'w-40', 'w-36', 'w-52', 'w-44', 'w-28'];
  const isOwn = [false, true, false, false, true, true, false, true];

  return (
    <div className="space-y-2 px-3 py-2">
      {widths.map((w, i) => (
        <div key={i} className={cn('flex', isOwn[i] ? 'justify-end' : 'justify-start')}>
          <div className={cn('rounded-2xl px-3 py-2', isOwn[i] ? 'rounded-br-sm bg-primary/10' : 'rounded-bl-sm bg-secondary')}>
            <Skeleton className={cn('h-3.5 mb-1', w)} />
            <Skeleton className="h-2.5 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chat List ───────────────────────────────────────────────

function ChatListView({ onSelectChat }: { onSelectChat: (chat: WhatsAppChat) => void }) {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  const loadChats = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getWhatsAppChats();

    if (result.error === 'no_tab') {
      setState({ status: 'no_tab' });
    } else if (result.error) {
      setState({ status: 'error', message: result.error });
    } else {
      setState({ status: 'ok', chats: result.chats });
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  if (state.status === 'loading') {
    return <ChatListSkeleton />;
  }

  if (state.status === 'no_tab') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-medium text-foreground">WhatsApp Not Open</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Open{' '}
          <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="text-primary underline">
            web.whatsapp.com
          </a>{' '}
          in a tab to see your conversations
        </p>
        <button onClick={loadChats} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-medium text-foreground">Could not read chats</h2>
        <p className="mb-4 text-xs text-muted-foreground">{state.message}</p>
        <button onClick={loadChats} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const { chats } = state;

  if (chats.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">No conversations found</p>
        <button onClick={loadChats} className="mt-3 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{chats.length} conversations</span>
        <button onClick={loadChats} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.map((chat, i) => (
          <ChatRow key={`${chat.chatId}-${i}`} chat={chat} onClick={() => onSelectChat(chat)} />
        ))}
      </div>
    </div>
  );
}

function ChatRow({ chat, onClick }: { chat: WhatsAppChat; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-muted/30">
      {chat.avatarUrl ? (
        <img src={chat.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/20 text-sm font-semibold text-[#25D366]">{chat.avatarText}</div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm font-medium', chat.unreadCount > 0 ? 'text-foreground' : 'text-foreground/80')}>{chat.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{chat.time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{chat.lastMessage}</span>
          <div className="flex shrink-0 items-center gap-1">
            {chat.isPinned && !chat.unreadCount && <span className="text-[10px] text-muted-foreground/60">📌</span>}
            {chat.isMuted && <span className="text-[10px] text-muted-foreground/60">🔇</span>}
            {chat.unreadCount > 0 && (
              <span className={cn('flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white', chat.isMuted ? 'bg-muted-foreground/50' : 'bg-[#25D366]')}>
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Conversation View ───────────────────────────────────────

function ConversationView({ chat, onBack }: { chat: WhatsAppChat; onBack: () => void }) {
  const [state, setState] = useState<ChatState>({ status: 'loading' });
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getWhatsAppMessages(chat.chatId, chat.name);

    if (result.error) {
      setState({ status: 'error', message: result.error });
    } else {
      setState({ status: 'ok', messages: result.messages });
    }
  }, [chat.chatId, chat.name]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (state.status === 'ok') {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [state]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        {chat.avatarUrl ? (
          <img src={chat.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/20 text-xs font-semibold text-[#25D366]">{chat.avatarText}</div>
        )}
        <span className="truncate text-sm font-medium text-foreground">{chat.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.status === 'loading' && <MessagesSkeleton />}

        {state.status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">{state.message}</p>
            <button onClick={loadMessages} className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {state.status === 'ok' && (
          <div className="px-3 py-2">
            {state.messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: WhatsAppMessage }) {
  return (
    <div className={cn('mb-1.5 flex', message.isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] rounded-2xl px-3 py-1.5', message.isOwn ? 'rounded-br-sm bg-[#25D366]/15' : 'rounded-bl-sm bg-secondary')}>
        {message.senderName && !message.isOwn && <p className="mb-0.5 text-[10px] font-semibold text-[#25D366]">{message.senderName}</p>}
        <p className="text-sm text-foreground" dir="auto">
          {message.text}
        </p>
        <p className={cn('mt-0.5 text-[10px]', message.isOwn ? 'text-right text-muted-foreground/70' : 'text-muted-foreground')}>{message.time}</p>
      </div>
    </div>
  );
}
