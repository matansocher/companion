import type { CalendarEvent } from '@companion/shared';
import { isExtensionContext } from './chrome';

type CalendarEventsResponse = {
  events: CalendarEvent[];
  error?: string;
};

export async function getCalendarEvents(): Promise<CalendarEventsResponse> {
  if (!isExtensionContext()) {
    return { events: [], error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CALENDAR_EVENTS' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ events: [], error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { events: [], error: 'no_response' });
    });
  });
}
