import { useEffect, useState } from 'react';
import { isExtensionContext } from './chrome';

export type UserProfile = {
  name: string;
  email: string;
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>({ name: 'Anonymous', email: '' });

  useEffect(() => {
    if (!isExtensionContext()) return;

    chrome.runtime.sendMessage({ type: 'GET_USER_PROFILE' }, (response) => {
      if (chrome.runtime.lastError || !response?.email) return;
      // Extract name from email (before @)
      const name = response.email
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      setProfile({ name, email: response.email });
    });
  }, []);

  return profile;
}
