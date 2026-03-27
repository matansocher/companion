import { ArrowLeft, CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import type { CalendarEvent } from '@companion/shared';

type CalendarEventFormProps = {
  onSave: (event: CalendarEvent) => void;
  onBack: () => void;
};

export function CalendarEventForm({ onSave, onBack }: CalendarEventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !date) return;

    onSave({
      id: Date.now().toString(),
      title: trimmedTitle,
      date,
      startTime,
      endTime,
      description: description.trim(),
    });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
          <CalendarDays className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">New Event</h1>
          <p className="text-xs text-muted-foreground">Create a calendar event</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Form */}
        <div className="rounded-xl bg-secondary p-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full resize-none rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !date}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>
    </div>
  );
}
