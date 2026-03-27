import type { GmailComposeData, GmailSendResult } from '@companion/shared';
import { isExtensionContext } from './chrome';

type GmailTabResponse = {
  available: boolean;
  error?: string;
};

export async function checkGmailTab(): Promise<GmailTabResponse> {
  if (!isExtensionContext()) {
    return { available: false, error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CHECK_GMAIL_TAB' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ available: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { available: false, error: 'no_response' });
    });
  });
}

export async function sendGmailCompose(data: GmailComposeData): Promise<GmailSendResult> {
  if (!isExtensionContext()) {
    return { success: false, error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GMAIL_COMPOSE', data }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { success: false, error: 'no_response' });
    });
  });
}
