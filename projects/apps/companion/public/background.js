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
