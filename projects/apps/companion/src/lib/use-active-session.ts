import { useEffect, useState } from 'react';

export type ActiveSession = {
  tabId: number;
  url: string;
  domain: string;
  title: string;
  startTime: number;
};

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const result = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SESSION' });
        if (mounted) setSession(result || null);
      } catch {
        if (mounted) setSession(null);
      }
    };

    // Poll active session every second and tick `now` for live timer
    poll();
    const interval = setInterval(() => {
      poll();
      if (mounted) setNow(Date.now());
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const liveElapsed = session ? now - session.startTime : 0;

  return { session, liveElapsed };
}
