import type { ChatContext } from '@companion/shared'

interface PageContentResponse {
  pageUrl?: string
  pageTitle?: string
  pageContent?: string
  error?: string
}

/**
 * Check if we're running in a Chrome extension context
 */
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' &&
         typeof chrome.runtime !== 'undefined' &&
         typeof chrome.runtime.sendMessage === 'function'
}

/**
 * Get the current page content from the active tab
 * This sends a message to the background script which executes
 * a script in the page context to extract the content
 */
export async function getPageContext(): Promise<ChatContext> {
  // If not in extension context (e.g., dev server), return empty context
  console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
  if (!isExtensionContext()) {
    console.log('[Companion] Not in extension context, returning empty page context')
    return {
      pageUrl: window.location.href,
      pageTitle: document.title,
      pageContent: ''
    }
  }

  console.log('[Companion] Requesting page content from background script...')

  try {
    // Use Promise wrapper for chrome.runtime.sendMessage for better compatibility
    const response = await new Promise<PageContentResponse>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'GET_PAGE_CONTENT' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Companion] Chrome runtime error:', chrome.runtime.lastError)
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          console.log('[Companion] Received response from background:', response)
          resolve(response || {})
        }
      )
    })

    if (response?.error) {
      console.warn('[Companion] Error in response:', response.error)
    }

    return {
      pageUrl: response?.pageUrl || '',
      pageTitle: response?.pageTitle || '',
      pageContent: response?.pageContent || ''
    }
  } catch (error) {
    console.error('[Companion] Failed to get page content:', error)
    return {
      pageUrl: '',
      pageTitle: '',
      pageContent: ''
    }
  }
}
