import { CalendarDays, Plus, X } from 'lucide-react';
import type { CalendarEvent } from '@companion/shared';

type CalendarProps = {
  events: CalendarEvent[];
  onNewEvent: () => void;
  onDelete: (id: string) => void;
};

function formatEventDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeRange(start: string, end: string): string {
  if (!start && !end) return '';
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function Calendar({ events, onNewEvent, onDelete }: CalendarProps) {
  const sorted = [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4">
      {/* New event button */}
      <button
        onClick={onNewEvent}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        New Event
      </button>

      {/* Event list */}
      {sorted.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Events ({sorted.length})
          </h3>
          {sorted.map((event) => (
            <div key={event.id} className="rounded-xl bg-secondary p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatEventDate(event.date)}</p>
                  {(event.startTime || event.endTime) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatTimeRange(event.startTime, event.endTime)}</p>
                  )}
                  {event.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(event.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No events yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap "New Event" to create one</p>
        </div>
      )}
    </div>
  );
}
