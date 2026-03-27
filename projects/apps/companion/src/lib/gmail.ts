import type { GmailEmail, GmailEmailContent } from '@companion/shared';
import { isExtensionContext } from './chrome';

type GmailEmailsResponse = {
  emails: GmailEmail[];
  error?: string;
};

type GmailEmailContentResponse = {
  content: GmailEmailContent | null;
  error?: string;
};

export async function getGmailEmails(): Promise<GmailEmailsResponse> {
  if (!isExtensionContext()) {
    return { emails: [], error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_GMAIL_EMAILS' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ emails: [], error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { emails: [], error: 'no_response' });
    });
  });
}

export async function getGmailEmailContent(emailId: string): Promise<GmailEmailContentResponse> {
  if (!isExtensionContext()) {
    return { content: null, error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_GMAIL_EMAIL_CONTENT', emailId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ content: null, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { content: null, error: 'no_response' });
    });
  });
}
