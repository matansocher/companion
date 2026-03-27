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

  if (request.type === 'GET_CALENDAR_EVENTS') {
    getCalendarEvents()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('[Background] Error getting calendar events:', error);
        sendResponse({ error: error.message, events: [] });
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

// ─── Google Calendar ─────────────────────────────────────────

async function getCalendarEvents() {
  const tabs = await chrome.tabs.query({ url: '*://calendar.google.com/*' });

  if (tabs.length === 0) {
    return { error: 'no_tab', events: [] };
  }

  const tab = tabs[0];

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractCalendarEvents,
  });

  const data = results?.[0]?.result;
  if (!data || data.error) {
    return { error: data?.error || 'extraction_failed', events: [] };
  }

  return { events: data.events };
}

// Runs in the context of the Google Calendar page
function extractCalendarEvents() {
  try {
    function rgbToHex(rgb) {
      if (!rgb) return '#4285f4';
      const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return '#4285f4';
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    function parseDateLabel(dateStr) {
      // Try to parse a date string like "Friday, March 27" into YYYY-MM-DD
      try {
        const now = new Date();
        const year = now.getFullYear();
        const parsed = new Date(`${dateStr}, ${year}`);
        if (!isNaN(parsed.getTime())) {
          // If the parsed date is more than 2 months in the past, try next year
          if (parsed < new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) {
            parsed.setFullYear(year + 1);
          }
          return parsed.toISOString().split('T')[0];
        }
      } catch {}
      return new Date().toISOString().split('T')[0];
    }

    function parseAriaLabel(ariaLabel) {
      // Common formats:
      // "Title, March 27, 10:00 AM to 11:00 AM"
      // "Title, Friday, March 27, 10:00 AM to 11:00 AM, Location"
      // "Title, March 27" (all-day)
      const result = {
        title: '',
        startTime: '',
        endTime: '',
        dateLabel: '',
        location: '',
        isAllDay: false,
      };

      if (!ariaLabel) return result;

      // Try to match time range pattern: "HH:MM AM/PM to HH:MM AM/PM"
      const timeMatch = ariaLabel.match(
        /(\d{1,2}:\d{2}\s*[APap][Mm])\s+to\s+(\d{1,2}:\d{2}\s*[APap][Mm])/
      );
      // Also try format without space before AM/PM and with unicode narrow no-break space
      const timeMatch2 = !timeMatch
        ? ariaLabel.match(
            /(\d{1,2}:\d{2}\s*[APap][Mm])\s*[\u2013\u2014–-]\s*(\d{1,2}:\d{2}\s*[APap][Mm])/
          )
        : null;
      const tm = timeMatch || timeMatch2;

      if (tm) {
        result.startTime = tm[1].trim();
        result.endTime = tm[2].trim();
      } else {
        result.isAllDay = true;
      }

      // Try to extract date: look for month name patterns
      const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
      const dateMatch = ariaLabel.match(
        new RegExp(`(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\\s*)?((?:${months})\\s+\\d{1,2})`)
      );
      if (dateMatch) {
        result.dateLabel = parseDateLabel(dateMatch[1]);
      } else {
        result.dateLabel = new Date().toISOString().split('T')[0];
      }

      // Title: everything before the first date or time pattern
      // Find the position of the date match in the string
      if (dateMatch) {
        const dateIdx = ariaLabel.indexOf(dateMatch[0]);
        if (dateIdx > 0) {
          result.title = ariaLabel.substring(0, dateIdx).replace(/,\s*$/, '').trim();
        }
      }

      // If no title extracted from date position, try before time
      if (!result.title && tm) {
        const timeIdx = ariaLabel.indexOf(tm[0]);
        if (timeIdx > 0) {
          result.title = ariaLabel.substring(0, timeIdx).replace(/,\s*$/, '').trim();
        }
      }

      // Fallback: first segment before comma
      if (!result.title) {
        const commaIdx = ariaLabel.indexOf(',');
        result.title = commaIdx > 0 ? ariaLabel.substring(0, commaIdx).trim() : ariaLabel.trim();
      }

      // Location: anything after the time range (or after the date for all-day events)
      if (tm) {
        const afterTime = ariaLabel.substring(ariaLabel.indexOf(tm[0]) + tm[0].length);
        const locPart = afterTime.replace(/^[,\s]+/, '').trim();
        if (locPart && locPart.length > 0) {
          result.location = locPart.replace(/,\s*$/, '');
        }
      }

      return result;
    }

    const events = [];
    const seen = new Set();

    // Query all event elements with data-eventid
    const eventEls = document.querySelectorAll('[data-eventid]');

    eventEls.forEach((el) => {
      const eventId = el.getAttribute('data-eventid') || '';
      if (!eventId || seen.has(eventId)) return;
      seen.add(eventId);

      const ariaLabel = el.getAttribute('aria-label') || '';
      const parsed = parseAriaLabel(ariaLabel);

      // Get color from the event chip
      let color = '#4285f4';
      // Try finding a colored element inside the chip
      const colorEl =
        el.querySelector('[style*="background-color"]') ||
        el.querySelector('[style*="border-color"]') ||
        el;
      try {
        const bg = getComputedStyle(colorEl).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          color = rgbToHex(bg);
        } else {
          // Try border-left-color or border-color
          const bc = getComputedStyle(colorEl).borderLeftColor || getComputedStyle(el).borderLeftColor;
          if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') {
            color = rgbToHex(bc);
          }
        }
      } catch {}

      // Detect all-day: check if the element is in an all-day area
      const isAllDay =
        parsed.isAllDay ||
        !!el.closest('[data-allday]') ||
        !!el.closest('[class*="allDay"]');

      if (parsed.title) {
        events.push({
          eventId,
          title: parsed.title,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          dateLabel: parsed.dateLabel,
          location: parsed.location,
          color,
          calendarName: '',
          isAllDay,
        });
      }
    });

    // Sort by date then time
    events.sort((a, b) => {
      if (a.dateLabel !== b.dateLabel) return a.dateLabel.localeCompare(b.dateLabel);
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.startTime.localeCompare(b.startTime);
    });

    return { events };
  } catch (e) {
    return { error: e.message || 'extraction_error', events: [] };
  }
}
