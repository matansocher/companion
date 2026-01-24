// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Set side panel behavior to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request);

  if (request.type === 'GET_PAGE_CONTENT') {
    console.log('[Background] Processing GET_PAGE_CONTENT request...');

    getPageContent()
      .then((result) => {
        console.log('[Background] Sending response:', {
          url: result.pageUrl,
          title: result.pageTitle,
          contentLength: result.pageContent?.length || 0
        });
        sendResponse(result);
      })
      .catch((error) => {
        console.error('[Background] Error getting page content:', error);
        sendResponse({ error: error.message });
      });

    // Return true to indicate we'll send response asynchronously
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
