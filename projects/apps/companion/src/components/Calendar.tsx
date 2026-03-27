import { ArrowLeft, CalendarDays, Clock, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { CalendarEvent } from '@companion/shared';
import { getCalendarEvents } from '../lib/calendar';
import { Skeleton } from './ui/skeleton';

type CalendarView = { screen: 'list' } | { screen: 'detail'; event: CalendarEvent };

type ListState = { status: 'loading' } | { status: 'no_tab' } | { status: 'error'; message: string } | { status: 'ok'; events: CalendarEvent[] };

export function Calendar() {
  const [view, setView] = useState<CalendarView>({ screen: 'list' });

  if (view.screen === 'detail') {
    return <EventDetailView event={view.event} onBack={() => setView({ screen: 'list' })} />;
  }

  return <EventListView onSelectEvent={(event) => setView({ screen: 'detail', event })} />;
}

// ─── Skeletons ───────────────────────────────────────────────

function EventListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <Skeleton className="h-3.5 w-16" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
            <Skeleton className="h-10 w-1 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Event List ──────────────────────────────────────────────

function formatDateHeader(dateLabel: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateLabel === todayStr) return 'Today';
  if (dateLabel === tomorrowStr) return 'Tomorrow';

  try {
    const [year, month, day] = dateLabel.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateLabel;
  }
}

function groupByDate(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = event.dateLabel;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return Array.from(groups.entries());
}

function EventListView({ onSelectEvent }: { onSelectEvent: (event: CalendarEvent) => void }) {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  const loadEvents = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getCalendarEvents();

    if (result.error === 'no_tab') {
      setState({ status: 'no_tab' });
    } else if (result.error) {
      setState({ status: 'error', message: result.error });
    } else {
      setState({ status: 'ok', events: result.events });
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  if (state.status === 'loading') {
    return <EventListSkeleton />;
  }

  if (state.status === 'no_tab') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-medium text-foreground">Google Calendar Not Open</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Open{' '}
          <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-primary underline">
            calendar.google.com
          </a>{' '}
          in a tab to see your events
        </p>
        <button onClick={loadEvents} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
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
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-medium text-foreground">Could not read events</h2>
        <p className="mb-4 text-xs text-muted-foreground">{state.message}</p>
        <button onClick={loadEvents} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const { events } = state;

  if (events.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">No events found</p>
        <button onClick={loadEvents} className="mt-3 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    );
  }

  const grouped = groupByDate(events);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{events.length} events</span>
        <button onClick={loadEvents} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.map(([dateLabel, dateEvents]) => (
          <div key={dateLabel}>
            <div className="sticky top-0 z-10 bg-background/95 px-4 pt-3 pb-1 backdrop-blur-sm">
              <span className="text-xs font-semibold text-muted-foreground">{formatDateHeader(dateLabel)}</span>
            </div>
            {dateEvents.map((event, i) => (
              <EventRow key={`${event.eventId}-${i}`} event={event} onClick={() => onSelectEvent(event)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-muted/30">
      {/* Color bar */}
      <div className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{event.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {event.isAllDay ? 'All day' : `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}`}
          </span>
          {event.location && (
            <span className="truncate text-xs text-muted-foreground/70">· {event.location}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Event Detail ────────────────────────────────────────────

function EventDetailView({ event, onBack }: { event: CalendarEvent; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="truncate text-sm font-medium text-foreground">Event Details</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Color accent bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: event.color }} />

        <div className="space-y-4 px-4 py-4">
          {/* Title */}
          <h2 className="text-lg font-semibold text-foreground">{event.title}</h2>

          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-sm text-foreground">
              <p>{formatDateHeader(event.dateLabel)}</p>
              {event.isAllDay ? (
                <p className="text-muted-foreground">All day</p>
              ) : (
                <p className="text-muted-foreground">
                  {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-foreground">{event.location}</p>
            </div>
          )}

          {/* Calendar */}
          {event.calendarName && (
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: event.color }} />
                <p className="text-sm text-foreground">{event.calendarName}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
