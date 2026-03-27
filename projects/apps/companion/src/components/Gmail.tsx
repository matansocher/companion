import { ArrowLeft, Mail, PenSquare, RefreshCw, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { GmailComposeData } from '@companion/shared';
import { checkGmailTab, sendGmailCompose } from '../lib/gmail';
import { Skeleton } from './ui/skeleton';

type GmailView = { screen: 'main' } | { screen: 'compose' };

type TabState = { status: 'loading' } | { status: 'no_tab' } | { status: 'error'; message: string } | { status: 'ready' };

export function Gmail() {
  const [view, setView] = useState<GmailView>({ screen: 'main' });

  if (view.screen === 'compose') {
    return <ComposeView onBack={() => setView({ screen: 'main' })} />;
  }

  return <MainView onCompose={() => setView({ screen: 'compose' })} />;
}

// ─── Skeleton ───────────────────────────────────────────────

function MainSkeleton() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-40 rounded-lg" />
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────

function MainView({ onCompose }: { onCompose: () => void }) {
  const [state, setState] = useState<TabState>({ status: 'loading' });

  const checkTab = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await checkGmailTab();

    if (result.error === 'not_extension') {
      setState({ status: 'error', message: 'Not running as extension' });
    } else if (!result.available) {
      setState({ status: 'no_tab' });
    } else {
      setState({ status: 'ready' });
    }
  }, []);

  useEffect(() => {
    checkTab();
  }, [checkTab]);

  if (state.status === 'loading') {
    return <MainSkeleton />;
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
          in a tab to send emails
        </p>
        <button onClick={checkTab} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
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
        <h2 className="mb-2 text-lg font-medium text-foreground">Something went wrong</h2>
        <p className="mb-4 text-xs text-muted-foreground">{state.message}</p>
        <button onClick={checkTab} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mb-2 text-lg font-medium text-foreground">Gmail</h2>
      <p className="mb-6 text-sm text-muted-foreground">Compose and send emails from here</p>
      <button
        onClick={onCompose}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <PenSquare className="h-4 w-4" />
        New Email
      </button>
    </div>
  );
}

// ─── Compose View ───────────────────────────────────────────

type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'sent' } | { status: 'error'; message: string };

function ComposeView({ onBack }: { onBack: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendState, setSendState] = useState<SendState>({ status: 'idle' });

  const handleSend = async () => {
    if (!to.trim()) return;

    setSendState({ status: 'sending' });

    const data: GmailComposeData = {
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
    };

    const result = await sendGmailCompose(data);

    if (result.error === 'no_tab') {
      setSendState({ status: 'error', message: 'Gmail tab not found. Please open mail.google.com first.' });
    } else if (result.error) {
      setSendState({ status: 'error', message: result.error });
    } else {
      setSendState({ status: 'sent' });
    }
  };

  const handleReset = () => {
    setTo('');
    setSubject('');
    setBody('');
    setSendState({ status: 'idle' });
  };

  if (sendState.status === 'sent') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border px-3 py-2">
          <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground">New Email</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Send className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-medium text-foreground">Email Composed</h2>
          <p className="mb-6 text-sm text-muted-foreground">Switch to the Gmail tab to review and send</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PenSquare className="h-4 w-4" />
            Compose Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">New Email</span>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col gap-0 overflow-y-auto">
        <div className="flex items-center border-b border-border/50 px-4 py-2">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">To</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center border-b border-border/50 px-4 py-2">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email..."
          className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>

      {/* Error */}
      {sendState.status === 'error' && (
        <div className="border-t border-border/50 px-4 py-2">
          <p className="text-xs text-red-500">{sendState.message}</p>
        </div>
      )}

      {/* Send Button */}
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={handleSend}
          disabled={!to.trim() || sendState.status === 'sending'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {sendState.status === 'sending' ? 'Opening in Gmail...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
