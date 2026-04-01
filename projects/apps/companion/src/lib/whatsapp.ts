import type { WhatsAppChat, WhatsAppMessage } from '@companion/shared';
import { isExtensionContext } from './chrome';

type WhatsAppChatsResponse = {
  chats: WhatsAppChat[];
  error?: string;
};

type WhatsAppMessagesResponse = {
  messages: WhatsAppMessage[];
  error?: string;
};

export async function getWhatsAppChats(): Promise<WhatsAppChatsResponse> {
  if (!isExtensionContext()) {
    return { chats: [], error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_WHATSAPP_CHATS' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ chats: [], error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { chats: [], error: 'no_response' });
    });
  });
}

export async function getWhatsAppMessages(chatId: string, chatName: string): Promise<WhatsAppMessagesResponse> {
  if (!isExtensionContext()) {
    return { messages: [], error: 'not_extension' };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_WHATSAPP_MESSAGES', chatId, chatName }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ messages: [], error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { messages: [], error: 'no_response' });
    });
  });
}
