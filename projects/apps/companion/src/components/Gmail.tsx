import { ArrowLeft, Mail, Paperclip, RefreshCw, Star } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GmailEmail, GmailEmailContent } from '@companion/shared';
import { getGmailEmails, getGmailEmailContent } from '../lib/gmail';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

type GmailView = { screen: 'list' } | { screen: 'email'; email: GmailEmail };

type ListState = { status: 'loading' } | { status: 'no_tab' } | { status: 'error'; message: string } | { status: 'ok'; emails: GmailEmail[] };

type DetailState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; content: GmailEmailContent };

export function Gmail() {
  const [view, setView] = useState<GmailView>({ screen: 'list' });

  if (view.screen === 'email') {
    return <EmailDetailView email={view.email} onBack={() => setView({ screen: 'list' })} />;
  }

  return <EmailListView onSelectEmail={(email) => setView({ screen: 'email', email })} />;
}

// ─── Skeletons ───────────────────────────────────────────────

function EmailListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-14" />
              </div>
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-2.5 w-56" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailContentSkeleton() {
  return (
    <div className="space-y-4 px-4 py-3">
      <Skeleton className="h-5 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3', i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/6')} />
        ))}
      </div>
    </div>
  );
}

// ─── Email List ──────────────────────────────────────────────

function EmailListView({ onSelectEmail }: { onSelectEmail: (email: GmailEmail) => void }) {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  const loadEmails = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getGmailEmails();

    if (result.error === 'no_tab') {
      setState({ status: 'no_tab' });
    } else if (result.error) {
      setState({ status: 'error', message: result.error });
    } else {
      setState({ status: 'ok', emails: result.emails });
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  if (state.status === 'loading') {
    return <EmailListSkeleton />;
  }

  if (state.status === 'no_tab') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-medium text-foreground">Gmail Not Open</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Open{' '}
          <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="text-primary underline">
            mail.google.com
          </a>{' '}
          in a tab to see your emails
        </p>
        <button onClick={loadEmails} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
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
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-medium text-foreground">Could not read emails</h2>
        <p className="mb-4 text-xs text-muted-foreground">{state.message}</p>
        <button onClick={loadEmails} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const { emails } = state;

  if (emails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">No emails found</p>
        <button onClick={loadEmails} className="mt-3 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{emails.length} emails</span>
        <button onClick={loadEmails} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {emails.map((email, i) => (
          <EmailRow key={`${email.emailId}-${i}`} email={email} onClick={() => onSelectEmail(email)} />
        ))}
      </div>
    </div>
  );
}

function EmailRow({ email, onClick }: { email: GmailEmail; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-muted/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EA4335]/15 text-sm font-semibold text-[#EA4335]">
        {email.sender.charAt(0).toUpperCase() || '?'}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm', email.isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>{email.sender}</span>
          <div className="flex shrink-0 items-center gap-1">
            {email.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
            {email.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground/60" />}
            <span className="text-[10px] text-muted-foreground">{email.date}</span>
          </div>
        </div>
        <span className={cn('truncate text-xs', email.isUnread ? 'font-medium text-foreground/90' : 'text-muted-foreground')}>{email.subject}</span>
        <span className="truncate text-[11px] text-muted-foreground/70">{email.snippet}</span>
      </div>

      {email.isUnread && <div className="h-2 w-2 shrink-0 rounded-full bg-[#EA4335]" />}
    </button>
  );
}

// ─── Email Detail View ───────────────────────────────────────

function EmailDetailView({ email, onBack }: { email: GmailEmail; onBack: () => void }) {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const contentRef = useRef<HTMLDivElement>(null);

  const loadContent = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getGmailEmailContent(email.emailId);

    if (result.error || !result.content) {
      setState({ status: 'error', message: result.error || 'Could not load email content' });
    } else {
      setState({ status: 'ok', content: result.content });
    }
  }, [email.emailId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (state.status === 'ok') {
      contentRef.current?.scrollTo(0, 0);
    }
  }, [state]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="truncate text-sm font-medium text-foreground">{email.subject || '(no subject)'}</span>
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {state.status === 'loading' && <EmailContentSkeleton />}

        {state.status === 'error' && (
          <div className="px-4 py-3">
            {/* Fallback: show list metadata */}
            <div className="mb-4 space-y-2">
              <h3 className={cn('text-base font-medium text-foreground', email.isUnread && 'font-semibold')}>{email.subject || '(no subject)'}</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground/80">From:</span> {email.sender}{email.senderEmail ? ` <${email.senderEmail}>` : ''}</p>
                <p><span className="font-medium text-foreground/80">Date:</span> {email.date}</p>
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-sm text-foreground" dir="auto">{email.snippet}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground">Could not load full content</p>
              <button onClick={loadContent} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-foreground">
                <RefreshCw className="h-2.5 w-2.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {state.status === 'ok' && (
          <div className="px-4 py-3">
            <h3 className="mb-3 text-base font-medium text-foreground">{state.content.subject || email.subject || '(no subject)'}</h3>
            <div className="mb-4 space-y-1 border-b border-border pb-3 text-xs text-muted-foreground">
              {state.content.from && <p><span className="font-medium text-foreground/80">From:</span> {state.content.from}</p>}
              {state.content.to && <p><span className="font-medium text-foreground/80">To:</span> {state.content.to}</p>}
              {state.content.cc && <p><span className="font-medium text-foreground/80">Cc:</span> {state.content.cc}</p>}
              {state.content.date && <p><span className="font-medium text-foreground/80">Date:</span> {state.content.date}</p>}
            </div>
            <div className="text-sm text-foreground" dir="auto">
              <p className="whitespace-pre-wrap">{state.content.bodyText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
