import type { TelegramChat, TelegramMessage } from '@companion/shared';
import { isExtensionContext } from './chrome';

type TelegramChatsResponse = {
  chats: TelegramChat[];
  error?: string;
};

type TelegramMessagesResponse = {
  messages: TelegramMessage[];
  error?: string;
};

export async function getTelegramChats(): Promise<TelegramChatsResponse> {
  if (!isExtensionContext()) {
    return { chats: [], error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TELEGRAM_CHATS' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ chats: [], error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { chats: [], error: 'no_response' });
    });
  });
}

export async function getTelegramMessages(peerId: string): Promise<TelegramMessagesResponse> {
  if (!isExtensionContext()) {
    return { messages: [], error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TELEGRAM_MESSAGES', peerId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ messages: [], error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { messages: [], error: 'no_response' });
    });
  });
}
