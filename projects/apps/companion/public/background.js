// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Set side panel behavior to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ============================================================
// Analytics: Passive Browsing Tracker
// ============================================================

const VISITS_KEY = 'analytics_visits';
const SETTINGS_KEY = 'analytics_settings';
const SESSION_KEY = 'analytics_active_session';
const TAB_COUNTS_KEY = 'analytics_tab_counts';
const HEARTBEAT_ALARM = 'analytics_heartbeat';
const TAB_COUNT_ALARM = 'analytics_tab_count';
const MIN_VISIT_DURATION = 2000; // ignore visits < 2 seconds
const MAX_TAB_COUNT_ENTRIES = 10000; // cap stored entries

let activeSession = null; // { tabId, url, domain, title, startTime }
let isIdle = false;
let idlePausedSession = null; // stashed session when user goes idle

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function isDomainBlocked(domain) {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = result[SETTINGS_KEY] || { blocklist: [], trackingEnabled: true };
  if (!settings.trackingEnabled) return true;
  return settings.blocklist.some((blocked) => domain === blocked || domain.endsWith('.' + blocked));
}

async function finalizeSession() {
  if (!activeSession) return;

  const endTime = Date.now();
  const duration = endTime - activeSession.startTime;

  if (duration >= MIN_VISIT_DURATION) {
    const visit = {
      id: `${activeSession.startTime}-${Math.random().toString(36).slice(2, 8)}`,
      url: activeSession.url,
      domain: activeSession.domain,
      title: activeSession.title,
      startTime: activeSession.startTime,
      endTime,
      duration,
    };

    const result = await chrome.storage.local.get(VISITS_KEY);
    const visits = result[VISITS_KEY] || [];
    visits.push(visit);
    await chrome.storage.local.set({ [VISITS_KEY]: visits });
  }

  activeSession = null;
  await chrome.storage.local.remove(SESSION_KEY);
}

async function startSession(tabId, url, title) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return;
  }

  const domain = extractDomain(url);
  if (!domain) return;

  if (await isDomainBlocked(domain)) return;

  activeSession = { tabId, url, domain, title: title || '', startTime: Date.now() };
  await chrome.storage.local.set({ [SESSION_KEY]: activeSession });
}

async function restoreSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const saved = result[SESSION_KEY];
  if (!saved) return;

  // Check if the tab still exists and is active
  try {
    const tab = await chrome.tabs.get(saved.tabId);
    if (tab && tab.active) {
      activeSession = saved;
    } else {
      // Tab is no longer active, finalize the saved session
      activeSession = saved;
      await finalizeSession();
    }
  } catch {
    // Tab no longer exists, finalize
    activeSession = saved;
    await finalizeSession();
  }
}

// --- Event listeners ---

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await finalizeSession();
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await startSession(tab.id, tab.url, tab.title);
  } catch {
    // Tab may have been closed between events
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.active) return;
  // Only restart if this is the currently tracked tab
  if (activeSession && activeSession.tabId === tabId) {
    await finalizeSession();
  }
  if (tab.active) {
    await startSession(tabId, tab.url, tab.title);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await finalizeSession();
    return;
  }
  await finalizeSession();
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      await startSession(tab.id, tab.url, tab.title);
    }
  } catch {
    // Ignore
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (activeSession && activeSession.tabId === tabId) {
    await finalizeSession();
  }
});

// --- Heartbeat alarm for SW resilience ---

chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
chrome.alarms.create(TAB_COUNT_ALARM, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    if (activeSession) {
      await chrome.storage.local.set({ [SESSION_KEY]: activeSession });
    }
    return;
  }

  if (alarm.name === TAB_COUNT_ALARM) {
    try {
      const tabs = await chrome.tabs.query({});
      const count = tabs.length;
      const result = await chrome.storage.local.get(TAB_COUNTS_KEY);
      const entries = result[TAB_COUNTS_KEY] || [];
      entries.push({ timestamp: Date.now(), count });
      // Trim old entries if exceeding cap
      const trimmed = entries.length > MAX_TAB_COUNT_ENTRIES
        ? entries.slice(entries.length - MAX_TAB_COUNT_ENTRIES)
        : entries;
      await chrome.storage.local.set({ [TAB_COUNTS_KEY]: trimmed });
    } catch {
      // Ignore tab count errors
    }
    return;
  }
});

// --- Idle detection ---

async function updateIdleTimeout() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = result[SETTINGS_KEY] || { idleTimeoutMs: 120000 };
  const seconds = Math.max(15, Math.round((settings.idleTimeoutMs || 120000) / 1000));
  chrome.idle.setDetectionInterval(seconds);
}

updateIdleTimeout();

// Re-apply idle timeout when settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes[SETTINGS_KEY]) {
    updateIdleTimeout();
  }
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle' || state === 'locked') {
    if (activeSession && !isIdle) {
      isIdle = true;
      // Finalize the current session so idle time isn't counted
      idlePausedSession = { tabId: activeSession.tabId, url: activeSession.url, domain: activeSession.domain, title: activeSession.title };
      await finalizeSession();
    }
  } else if (state === 'active') {
    if (isIdle && idlePausedSession) {
      // Resume tracking the same tab
      isIdle = false;
      const paused = idlePausedSession;
      idlePausedSession = null;
      try {
        const tab = await chrome.tabs.get(paused.tabId);
        if (tab && tab.active) {
          await startSession(tab.id, tab.url, tab.title);
        }
      } catch {
        // Tab gone, don't resume
      }
    } else {
      isIdle = false;
      idlePausedSession = null;
    }
  }
});

// Restore session on SW startup
restoreSession();

// ============================================================
// Message handling
// ============================================================

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'GET_PAGE_CONTENT') {
    getPageContent()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error('[Background] Error getting page content:', error);
        sendResponse({ error: error.message });
      });

    return true;
  }

  if (request.type === 'GET_ACTIVE_SESSION') {
    sendResponse(activeSession);
    return false;
  }

  if (request.type === 'GET_TAB_COUNT') {
    chrome.tabs.query({}).then((tabs) => {
      sendResponse({ count: tabs.length });
    });
    return true;
  }

  if (request.type === 'GET_ANALYTICS_SETTINGS') {
    chrome.storage.local.get(SETTINGS_KEY).then((result) => {
      sendResponse(result[SETTINGS_KEY] || { blocklist: [], trackingEnabled: true });
    });
    return true;
  }

  if (request.type === 'SAVE_ANALYTICS_SETTINGS') {
    chrome.storage.local.set({ [SETTINGS_KEY]: request.settings }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'GET_TELEGRAM_CHATS') {
    getTelegramChats()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting Telegram chats:', error);
        sendResponse({ error: error.message, chats: [] });
      });
    return true;
  }

  if (request.type === 'GET_TELEGRAM_MESSAGES') {
    getTelegramMessages(request.peerId)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting Telegram messages:', error);
        sendResponse({ error: error.message, messages: [] });
      });
    return true;
  }

  if (request.type === 'GET_WHATSAPP_CHATS') {
    getWhatsAppChats()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting WhatsApp chats:', error);
        sendResponse({ error: error.message, chats: [] });
      });
    return true;
  }

  if (request.type === 'GET_WHATSAPP_MESSAGES') {
    getWhatsAppMessages(request.chatId)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting WhatsApp messages:', error);
        sendResponse({ error: error.message, messages: [] });
      });
    return true;
  }

  if (request.type === 'GET_GMAIL_EMAILS') {
    getGmailEmails()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting Gmail emails:', error);
        sendResponse({ error: error.message, emails: [] });
      });
    return true;
  }

  if (request.type === 'GET_GMAIL_EMAIL_CONTENT') {
    getGmailEmailContent(request.emailId)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting Gmail email content:', error);
        sendResponse({ error: error.message, content: null });
      });
    return true;
  }

  if (request.type === 'GET_USER_PROFILE') {
    chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
      sendResponse({ email: userInfo?.email || '', id: userInfo?.id || '' });
    });
    return true;
  }
});

// Get content from the active tab
async function getPageContent() {
  console.log('[Background] Getting page content...');

  try {
    // Get the active tab in the current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[Background] Found tabs:', tabs.length);

    const tab = tabs[0];

    if (!tab) {
      console.log('[Background] No active tab found');
      return { error: 'No active tab found', pageUrl: '', pageTitle: '', pageContent: '' };
    }

    console.log('[Background] Active tab:', { id: tab.id, url: tab.url, title: tab.title });

    if (!tab.id) {
      return { error: 'Tab has no ID', pageUrl: tab.url || '', pageTitle: tab.title || '', pageContent: '' };
    }

    // Check if we can inject scripts into this tab
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      console.log('[Background] Cannot access Chrome internal pages');
      return {
        pageUrl: tab.url || '',
        pageTitle: tab.title || '',
        pageContent: '',
        error: 'Cannot access content on Chrome internal pages'
      };
    }

    // Execute script to get page content
    console.log('[Background] Executing script in tab:', tab.id);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    });

    console.log('[Background] Script execution results:', results);

    const pageContent = results?.[0]?.result || '';

    return {
      pageUrl: tab.url || '',
      pageTitle: tab.title || '',
      pageContent: pageContent
    };
  } catch (error) {
    console.error('[Background] Error in getPageContent:', error);
    return {
      pageUrl: '',
      pageTitle: '',
      pageContent: '',
      error: error.message
    };
  }
}

// ============================================================
// Telegram: Extract chats from web.telegram.org
// ============================================================

async function getTelegramChats() {
  const tabs = await chrome.tabs.query({ url: '*://web.telegram.org/*' });

  if (tabs.length === 0) {
    return { error: 'no_tab', chats: [] };
  }

  const tab = tabs[0];

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractTelegramChats,
  });

  const data = results?.[0]?.result;
  if (!data || data.error) {
    return { error: data?.error || 'extraction_failed', chats: [] };
  }

  return { chats: data.chats };
}

// Runs in the context of the Telegram Web page
function extractTelegramChats() {
  try {
    // Convert an <img> or <canvas> element to a data URI
    function getAvatarDataUri(container) {
      if (!container) return '';
      // Try img first
      const img = container.querySelector('img');
      if (img && img.naturalWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.7);
        } catch { /* CORS or tainted canvas */ }
      }
      // Try canvas element directly
      const canvasEl = container.querySelector('canvas');
      if (canvasEl) {
        try {
          return canvasEl.toDataURL('image/jpeg', 0.7);
        } catch { /* tainted */ }
      }
      return '';
    }

    const chats = [];

    // --- Telegram Web K (web.telegram.org/k/) ---
    const kItems = document.querySelectorAll('.chatlist-chat');
    if (kItems.length > 0) {
      kItems.forEach((item) => {
        const nameEl = item.querySelector('.peer-title');
        const lastMsgEl = item.querySelector('.tgico-pinnedchat')
          ? item.querySelector('.message-subtitles')
          : item.querySelector('.subtitle-text');
        const timeEl = item.querySelector('.message-time');
        const unreadEl = item.querySelector('.unread-count');
        const avatarContainer = item.querySelector('.avatar-container, .Avatar, .dialog-avatar');
        const avatarTextEl = item.querySelector('.avatar-text');
        const isPinned = !!item.querySelector('.tgico-pinnedchat');
        const isMuted = !!item.querySelector('.tgico-mute');

        const name = nameEl?.textContent?.trim() || '';
        if (!name) return;

        chats.push({
          name,
          lastMessage: lastMsgEl?.textContent?.trim() || '',
          time: timeEl?.textContent?.trim() || '',
          unreadCount: parseInt(unreadEl?.textContent?.trim() || '0', 10) || 0,
          avatarText: avatarTextEl?.textContent?.trim() || name.charAt(0).toUpperCase(),
          avatarUrl: getAvatarDataUri(avatarContainer),
          isPinned,
          isMuted,
        });
      });

      return { chats };
    }

    // --- Telegram Web A (web.telegram.org/a/) ---
    const aItems = document.querySelectorAll('.ListItem.chat-item-clickable');
    if (aItems.length > 0) {
      aItems.forEach((item) => {
        const linkEl = item.querySelector('a[href^="#"]');
        const peerId = linkEl?.getAttribute('href')?.replace('#', '') || '';
        const nameEl = item.querySelector('.fullName');
        const lastMsgEl = item.querySelector('.last-message-summary');
        const timeEl = item.querySelector('.LastMessageMeta .time');
        const avatarContainer = item.querySelector('.Avatar');
        const isPinned = !!item.querySelector('.icon-pinned-chat');
        const isMuted = !!item.querySelector('.icon-muted');

        // Unread badge: look for a numeric badge inside chat-badge-transition
        const badgeEls = item.querySelectorAll('.chat-badge-transition');
        let unreadCount = 0;
        badgeEls.forEach((b) => {
          const text = b.textContent?.trim();
          const num = parseInt(text, 10);
          if (num > 0) unreadCount = num;
        });

        const name = nameEl?.textContent?.trim() || '';
        if (!name) return;
        if (name === 'Archived Chats') return;

        chats.push({
          peerId,
          name,
          lastMessage: lastMsgEl?.textContent?.trim() || '',
          time: timeEl?.textContent?.trim() || '',
          unreadCount,
          avatarText: name.charAt(0).toUpperCase(),
          avatarUrl: getAvatarDataUri(avatarContainer),
          isPinned,
          isMuted,
        });
      });

      return { chats };
    }

    // --- Fallback: generic scraping ---
    return { error: 'unrecognized_dom', chats: [] };
  } catch (error) {
    return { error: error.message, chats: [] };
  }
}

async function getTelegramMessages(peerId) {
  const tabs = await chrome.tabs.query({ url: '*://web.telegram.org/*' });
  if (tabs.length === 0) {
    return { error: 'no_tab', messages: [] };
  }

  const tab = tabs[0];

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractTelegramMessagesFromDB,
    args: [peerId],
  });

  const data = results?.[0]?.result;
  if (!data || data.error) {
    return { error: data?.error || 'extraction_failed', messages: [] };
  }

  return { messages: data.messages };
}

// Runs in the context of the Telegram Web page — reads from IndexedDB
function extractTelegramMessagesFromDB(peerId) {
  return new Promise((resolve) => {
    const req = indexedDB.open('tt-data');
    req.onerror = () => resolve({ error: 'db_open_failed', messages: [] });
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction('store', 'readonly');
        const store = tx.objectStore('store');
        const getReq = store.get('tt-global-state');
        getReq.onerror = () => { db.close(); resolve({ error: 'read_failed', messages: [] }); };
        getReq.onsuccess = () => {
          const state = getReq.result;
          db.close();
          if (!state) { resolve({ error: 'no_state', messages: [] }); return; }

          const chatMessages = state.messages?.byChatId?.[peerId];
          if (!chatMessages?.byId) { resolve({ error: 'no_messages_for_chat', messages: [] }); return; }

          const users = state.users?.byId || {};
          const currentUserId = state.currentUserId;

          const msgList = Object.values(chatMessages.byId);
          // Sort by date ascending
          msgList.sort((a, b) => a.date - b.date);

          // Take last 50 messages
          const recent = msgList.slice(-50);

          const messages = recent.map((msg) => {
            let text = msg.content?.text?.text || '';

            // Handle non-text messages
            if (!text) {
              if (msg.content?.sticker) text = msg.content.sticker.emoji || '[Sticker]';
              else if (msg.content?.photo) text = msg.content.photo.caption || '[Photo]';
              else if (msg.content?.video) text = '[Video]';
              else if (msg.content?.document) text = '[File] ' + (msg.content.document.fileName || '');
              else if (msg.content?.voice) text = '[Voice message]';
              else if (msg.content?.audio) text = '[Audio]';
              else if (msg.content?.contact) text = '[Contact]';
              else if (msg.content?.location) text = '[Location]';
              else if (msg.content?.poll) text = '[Poll] ' + (msg.content.poll.summary?.question || '');
              else if (msg.content?.action) text = '[Action]';
              else text = '[Message]';
            }

            // Get sender name for group chats
            let senderName = '';
            const senderId = msg.senderId;
            if (senderId && senderId !== currentUserId && !msg.isOutgoing) {
              const user = users[senderId];
              if (user) {
                senderName = [user.firstName, user.lastName].filter(Boolean).join(' ');
              }
            }

            // Format time
            const d = new Date(msg.date * 1000);
            const now = new Date();
            let time;
            if (d.toDateString() === now.toDateString()) {
              time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
              time = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return {
              id: String(msg.id),
              text,
              time,
              isOwn: !!msg.isOutgoing,
              senderName,
            };
          });

          resolve({ messages });
        };
      } catch (e) {
        resolve({ error: e.message, messages: [] });
      }
    };
  });
}

// ============================================================
// WhatsApp: Extract chats and messages from web.whatsapp.com
// ============================================================

async function getWhatsAppChats() {
  const tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
  if (tabs.length === 0) {
    return { error: 'no_tab', chats: [] };
  }

  const tab = tabs[0];

  // Step 1: Get chat list from IndexedDB (reliable JIDs + metadata)
  const dbResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractWhatsAppChatsFromDB,
  });

  const dbData = dbResults?.[0]?.result;
  if (!dbData || dbData.error) {
    return { error: dbData?.error || 'extraction_failed', chats: [] };
  }

  // Step 2: Get avatars + display names from DOM
  const domResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractWhatsAppDomAvatars,
  });

  const domMap = domResults?.[0]?.result || {};

  // Step 3: Merge — enrich DB chats with DOM avatars and display names
  // Build a phone-number lookup from DOM names (for names that start with +)
  const phoneToDom = {};
  for (const [domName, info] of Object.entries(domMap)) {
    // WhatsApp DOM may show "+972 54-212-1614" — strip to digits for matching
    const digits = domName.replace(/\D/g, '');
    if (digits.length >= 7) {
      phoneToDom[digits] = info;
    }
  }

  const chats = dbData.chats.map((chat) => {
    // Try exact name match first
    let domInfo = domMap[chat.name];
    // Try matching by bare phone number from JID
    if (!domInfo) {
      const bare = chat.chatId.replace(/@.*/, '');
      domInfo = domMap[bare];
      // Try digit-based match (DOM may show formatted phone like "+972 54-212-1614")
      if (!domInfo && bare.length >= 7) {
        domInfo = phoneToDom[bare];
      }
    }
    if (domInfo) {
      return {
        ...chat,
        avatarUrl: domInfo.avatarUrl || chat.avatarUrl,
        // Use DOM display name if the DB name looks like a phone number
        name: (/^\d+$/.test(chat.name) && domInfo.displayName) ? domInfo.displayName : chat.name,
      };
    }
    return chat;
  });

  return { chats };
}

// Extracts avatar images and display names from WhatsApp DOM, keyed by name
function extractWhatsAppDomAvatars() {
  try {
    function getAvatarDataUri(container) {
      if (!container) return '';
      const img = container.querySelector('img');
      if (img && img.naturalWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.7);
        } catch { /* CORS */ }
      }
      return '';
    }

    const result = {};
    const sidePane = document.querySelector('#pane-side');
    if (!sidePane) return result;

    const rows = sidePane.querySelectorAll('[role="row"]');
    rows.forEach((row) => {
      const nameEl = row.querySelector('span[title][dir="auto"]');
      const displayName = nameEl?.getAttribute('title')?.trim() || '';
      if (!displayName) return;

      const avatarImg = row.querySelector('img[draggable="false"]');
      const avatarContainer = avatarImg?.closest('div');
      const avatarUrl = getAvatarDataUri(avatarContainer);

      // Key by display name so we can match against DB chat names
      result[displayName] = { displayName, avatarUrl };
    });

    return result;
  } catch {
    return {};
  }
}

// Reads the full chat list from WhatsApp's IndexedDB — gives us reliable JIDs
function extractWhatsAppChatsFromDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open('model-storage');
    req.onerror = () => resolve({ error: 'db_open_failed', chats: [] });
    req.onsuccess = () => {
      try {
        const db = req.result;

        // Step 1: Read contacts for name resolution
        const contactMap = {};
        const contactTx = db.transaction('contact', 'readonly');
        const contactStore = contactTx.objectStore('contact');
        const contactReq = contactStore.getAll();
        contactReq.onsuccess = () => {
          (contactReq.result || []).forEach((c) => {
            if (c.id) {
              // Prefer saved contact name > pushname (WhatsApp profile name) > formattedName
              contactMap[c.id] = c.name || c.pushname || c.formattedName || c.shortName || '';
              // Also store under the bare number for fallback matching
              const bare = c.id.replace(/@.*/, '');
              if (bare && !contactMap[bare]) {
                contactMap[bare] = contactMap[c.id];
              }
            }
          });

          // Step 2: Read chats
          const chatTx = db.transaction('chat', 'readonly');
          const chatStore = chatTx.objectStore('chat');
          const chatReq = chatStore.getAll();
          chatReq.onsuccess = () => {
            const rawChats = chatReq.result || [];
            db.close();

            const chats = rawChats
              .filter((c) => {
                // Skip status broadcast and system chats
                if (!c.id) return false;
                if (c.id === 'status@broadcast') return false;
                if (c.id === '0@c.us') return false;
                return true;
              })
              .map((c) => {
                // Resolve name: chat.name > contact name (by JID) > contact name (by bare number) > phone number
                const bare = c.id.replace(/@.*/, '');
                const name = c.name || contactMap[c.id] || contactMap[bare] || bare;

                // Last message time
                let time = '';
                const ts = c.t || c.conversationTimestamp;
                if (ts) {
                  const d = new Date(ts * 1000);
                  const now = new Date();
                  if (d.toDateString() === now.toDateString()) {
                    time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } else {
                    time = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  }
                }

                // Unread count
                const unreadCount = c.unreadCount || 0;

                // Pinned (pin field is a timestamp if pinned, 0/undefined if not)
                const isPinned = !!(c.pin);

                // Muted (muteExpiration is a timestamp if muted)
                const isMuted = !!(c.muteExpiration && c.muteExpiration > Date.now() / 1000);

                // Last message preview
                let lastMessage = '';
                if (c.lastMessage) {
                  lastMessage = c.lastMessage.body || c.lastMessage.caption || '';
                  if (!lastMessage && c.lastMessage.type && c.lastMessage.type !== 'chat') {
                    lastMessage = '[' + c.lastMessage.type + ']';
                  }
                }

                return {
                  chatId: c.id,
                  name,
                  lastMessage,
                  time,
                  unreadCount,
                  avatarText: name.charAt(0).toUpperCase(),
                  avatarUrl: '',
                  isPinned,
                  isMuted,
                  _ts: ts || 0, // raw timestamp for sorting
                };
              })
              // Sort: pinned first (by timestamp), then non-pinned by timestamp descending
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b._ts - a._ts;
              });

            resolve({ chats });
          };
          chatReq.onerror = () => { db.close(); resolve({ error: 'chat_read_failed', chats: [] }); };
        };
        contactReq.onerror = () => { db.close(); resolve({ error: 'contact_read_failed', chats: [] }); };
      } catch (e) {
        resolve({ error: e.message, chats: [] });
      }
    };
  });
}

async function getWhatsAppMessages(chatId) {
  const tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
  if (tabs.length === 0) {
    return { error: 'no_tab', messages: [] };
  }

  const tab = tabs[0];

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractWhatsAppMessagesFromDB,
    args: [chatId],
  });

  const data = results?.[0]?.result;
  if (!data || data.error) {
    return { error: data?.error || 'extraction_failed', messages: [] };
  }

  return { messages: data.messages };
}

// Reads messages from WhatsApp's IndexedDB filtered by chat JID
function extractWhatsAppMessagesFromDB(chatJid) {
  return new Promise((resolve) => {
    const req = indexedDB.open('model-storage');
    req.onerror = () => resolve({ error: 'db_open_failed', messages: [] });
    req.onsuccess = () => {
      try {
        const db = req.result;

        // Also load contacts for sender name resolution
        const contactMap = {};
        const contactTx = db.transaction('contact', 'readonly');
        const contactStore = contactTx.objectStore('contact');
        const contactReq = contactStore.getAll();
        contactReq.onsuccess = () => {
          (contactReq.result || []).forEach(c => {
            if (c.id) contactMap[c.id] = c.name || c.pushname || c.shortName || '';
          });

          // Now read messages
          const tx = db.transaction('message', 'readonly');
          const store = tx.objectStore('message');
          const messages = [];
          const cursor = store.openCursor(null, 'prev');

          cursor.onsuccess = () => {
            const result = cursor.result;
            if (!result || messages.length >= 50) {
              db.close();
              // Sort ascending (we collected in reverse)
              messages.reverse();
              resolve({ messages });
              return;
            }

            const msg = result.value;
            // Check if this message belongs to the target chat
            const msgId = msg.id || '';
            const belongsToChat = msgId.includes('_' + chatJid + '_') || msgId.startsWith('true_' + chatJid) || msgId.startsWith('false_' + chatJid);

            if (belongsToChat && msg.type !== 'revoked' && msg.type !== 'e2e_notification' && msg.type !== 'notification_template') {
              const isOwn = msgId.startsWith('true_');

              let text = '';
              if (msg.type === 'chat' || msg.type === 'text') {
                text = msg.body || '';
              } else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'gif') {
                text = msg.caption || '[' + (msg.type === 'image' ? 'Photo' : 'Video') + ']';
              } else if (msg.type === 'ptt' || msg.type === 'audio') {
                text = '[Voice message]';
              } else if (msg.type === 'document') {
                text = '[File] ' + (msg.filename || '');
              } else if (msg.type === 'sticker') {
                text = '[Sticker]';
              } else if (msg.type === 'vcard' || msg.type === 'multi_vcard') {
                text = '[Contact]';
              } else if (msg.type === 'location' || msg.type === 'liveLocation') {
                text = '[Location]';
              } else if (msg.type === 'poll_creation') {
                text = '[Poll]';
              } else if (msg.type === 'notification') {
                result.continue();
                return;
              } else {
                text = msg.body || '[' + msg.type + ']';
              }

              // Time
              const d = new Date(msg.t * 1000);
              const now = new Date();
              let time;
              if (d.toDateString() === now.toDateString()) {
                time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } else {
                time = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }

              // Sender name for group chats
              let senderName = '';
              if (!isOwn && msg.from) {
                senderName = contactMap[msg.from] || msg.from.replace(/@.*/, '');
              }

              messages.push({ id: msgId, text, time, isOwn, senderName });
            }

            result.continue();
          };
          cursor.onerror = () => { db.close(); resolve({ error: 'cursor_error', messages: [] }); };
        };
        contactReq.onerror = () => { db.close(); resolve({ error: 'contact_read_failed', messages: [] }); };
      } catch (e) {
        resolve({ error: e.message, messages: [] });
      }
    };
  });
}

// ============================================================
// Gmail: Extract emails from mail.google.com
// ============================================================

async function getGmailEmails() {
  const tabs = await chrome.tabs.query({ url: '*://mail.google.com/*' });
  if (tabs.length === 0) {
    return { error: 'no_tab', emails: [] };
  }

  const tab = tabs[0];

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractGmailEmails,
  });

  const data = results?.[0]?.result;
  if (!data || data.error) {
    return { error: data?.error || 'extraction_failed', emails: [] };
  }

  return { emails: data.emails };
}

// Runs in the context of the Gmail page
function extractGmailEmails() {
  try {
    const emails = [];

    // Gmail email rows: tr.zA (read) and tr.zE (unread)
    const mainArea = document.querySelector('div[role="main"]');
    if (!mainArea) {
      return { error: 'no_main_area', emails: [] };
    }

    let rows = mainArea.querySelectorAll('tr.zA, tr.zE');

    // Fallback: try table rows within the main area
    if (rows.length === 0) {
      rows = mainArea.querySelectorAll('table tbody tr');
    }

    if (rows.length === 0) {
      return { error: 'no_email_rows', emails: [] };
    }

    rows.forEach((row) => {
      try {
        // Thread ID
        const emailId = row.dataset.legacyThreadId || '';
        if (!emailId) {
          const threadEl = row.querySelector('[data-thread-id]');
          if (!threadEl) return;
        }
        const finalEmailId = emailId || row.querySelector('[data-thread-id]')?.getAttribute('data-thread-id') || '';
        if (!finalEmailId) return;

        // Sender
        const senderEl = row.querySelector('span.yP, span.zF, span.bA4 span[email]');
        const sender = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || '';
        const senderEmail = senderEl?.getAttribute('email') || '';

        // Subject
        const subjectEl = row.querySelector('span.bog span, span.bqe, [data-thread-id] span');
        const subject = subjectEl?.textContent?.trim() || '';

        // Snippet
        const snippetEl = row.querySelector('span.y2');
        let snippet = snippetEl?.textContent?.trim() || '';
        // Strip leading " - " from snippet
        snippet = snippet.replace(/^\s*[-–—]\s*/, '');

        // Date
        const dateTd = row.querySelector('td.xW');
        const dateSpan = dateTd?.querySelector('span') || row.querySelector('td:last-child span[title]');
        const date = dateSpan?.getAttribute('title') || dateSpan?.textContent?.trim() || '';

        // Unread
        const isUnread = row.classList.contains('zE');

        // Starred
        const starEl = row.querySelector('td.apU img, td.apU span, [aria-label*="Starred"], [aria-label*="starred"]');
        const isStarred = starEl ? (starEl.getAttribute('aria-label') || '').toLowerCase().includes('starred') : false;

        // Attachment
        const hasAttachment = !!row.querySelector('div.yf, span.brc, [aria-label*="attachment"], [aria-label*="Attachment"]');

        if (sender || subject) {
          emails.push({
            emailId: finalEmailId,
            sender,
            senderEmail,
            subject,
            snippet,
            date,
            isUnread,
            isStarred,
            hasAttachment,
          });
        }
      } catch {
        // Skip this row on error
      }
    });

    return { emails };
  } catch (error) {
    return { error: error.message, emails: [] };
  }
}

async function getGmailEmailContent(emailId) {
  const tabs = await chrome.tabs.query({ url: '*://mail.google.com/*' });
  if (tabs.length === 0) {
    return { error: 'no_tab', content: null };
  }

  const tab = tabs[0];

  // Navigate Gmail to the thread
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (threadId) => {
      window.location.hash = '#inbox/' + threadId;
    },
    args: [emailId],
  });

  // Poll for rendered content (every 200ms, up to 3s)
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractGmailEmailContent,
    });

    const data = results?.[0]?.result;
    if (data && !data.error && data.content && data.content.bodyText) {
      return data;
    }
    // If we got a definitive error (not just "not ready"), stop polling
    if (data?.error && data.error !== 'not_rendered') {
      return data;
    }
  }

  // Final attempt
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractGmailEmailContent,
  });

  const data = results?.[0]?.result;
  if (data && !data.error) {
    return data;
  }

  return { error: 'timeout', content: null };
}

// Runs in the context of the Gmail page — extracts opened email content
function extractGmailEmailContent() {
  try {
    const mainArea = document.querySelector('div[role="main"]');
    if (!mainArea) {
      return { error: 'no_main_area', content: null };
    }

    // Check if an email thread is open by looking for subject heading
    const subjectEl = mainArea.querySelector('h2.hP') || mainArea.querySelector('h2[data-thread-perm-id]');
    if (!subjectEl) {
      return { error: 'not_rendered', content: null };
    }

    const subject = subjectEl.textContent?.trim() || '';

    // Find the most recent message in the thread (last expanded message)
    const messages = mainArea.querySelectorAll('div.adn, div.gs');
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : mainArea;

    // From
    const fromEl = lastMessage.querySelector('span.gD[email], span[email]');
    const fromName = fromEl?.getAttribute('name') || fromEl?.textContent?.trim() || '';
    const fromEmail = fromEl?.getAttribute('email') || '';
    const from = fromEmail ? (fromName ? fromName + ' <' + fromEmail + '>' : fromEmail) : fromName;

    // To
    const toContainer = lastMessage.querySelector('span.g2');
    let to = '';
    if (toContainer) {
      const toSpans = toContainer.querySelectorAll('span[email]');
      to = Array.from(toSpans).map((s) => {
        const name = s.getAttribute('name') || s.textContent?.trim() || '';
        const email = s.getAttribute('email') || '';
        return name && email ? name + ' <' + email + '>' : email || name;
      }).join(', ');
    }
    if (!to) {
      // Fallback: look for "to" text in header area
      const headerRows = lastMessage.querySelectorAll('tr.acZ, span.hb');
      headerRows.forEach((row) => {
        const text = row.textContent || '';
        if (text.toLowerCase().startsWith('to')) {
          to = text.replace(/^to:?\s*/i, '').trim();
        }
      });
    }

    // CC
    let cc = '';
    const ccContainer = lastMessage.querySelector('span.g2 + span.g2');
    if (ccContainer) {
      const ccSpans = ccContainer.querySelectorAll('span[email]');
      cc = Array.from(ccSpans).map((s) => {
        const name = s.getAttribute('name') || s.textContent?.trim() || '';
        const email = s.getAttribute('email') || '';
        return name && email ? name + ' <' + email + '>' : email || name;
      }).join(', ');
    }

    // Date
    const dateEl = lastMessage.querySelector('span.g3') || lastMessage.querySelector('span[title]');
    const date = dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || '';

    // Body
    const bodyEl = lastMessage.querySelector('div.a3s.aiL') || lastMessage.querySelector('div.a3s') || lastMessage.querySelector('div[dir="ltr"]');
    const bodyText = bodyEl?.textContent?.trim() || '';

    // Get emailId from URL hash
    const hash = window.location.hash || '';
    const emailId = hash.replace(/^#[^/]*\//, '');

    return {
      content: {
        emailId,
        subject,
        from,
        to,
        cc,
        date,
        bodyText,
      },
    };
  } catch (error) {
    return { error: error.message, content: null };
  }
}

// This function runs in the context of the web page
function extractPageContent() {
  try {
    const body = document.body;
    if (!body) return '';

    // Clone the body to avoid modifying the actual page
    const clone = body.cloneNode(true);

    // Remove script, style, and other non-content elements
    const elementsToRemove = clone.querySelectorAll(
      'script, style, noscript, iframe, svg, img, video, audio, canvas, ' +
      'nav, footer, header, aside, [role="navigation"], [role="banner"], ' +
      '[role="complementary"], [aria-hidden="true"], .ad, .advertisement, ' +
      '.sidebar, .menu, .nav, .footer, .header'
    );
    elementsToRemove.forEach(el => el.remove());

    // Get text content and clean it up
    let text = clone.textContent || clone.innerText || '';

    // Clean up whitespace - replace multiple spaces/newlines with single space
    text = text.replace(/[\s\n\r\t]+/g, ' ').trim();

    // Limit the content length to avoid huge payloads (100KB max)
    const maxLength = 100000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... [content truncated]';
    }

    console.log('[Page Script] Extracted content length:', text.length);
    return text;
  } catch (error) {
    console.error('[Page Script] Error extracting content:', error);
    return '';
  }
}
