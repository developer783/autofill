// Extension Background Service Worker (Manifest V3 - Server URL Connection)

let cachedProfileList = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache for profile picker

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      serverUrl: ''
    }, (items) => {
      resolve(items);
    });
  });
}

// Fetch profile list for popup dropdown picker
async function fetchProfileList() {
  const { serverUrl } = await getSettings();
  if (!serverUrl || !serverUrl.trim()) {
    throw new Error("Can't reach server — check the URL in Settings");
  }

  const now = Date.now();
  if (cachedProfileList && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedProfileList;
  }

  const cleanServerUrl = serverUrl.replace(/\/+$/, '');
  try {
    const response = await fetch(`${cleanServerUrl}/extension/profiles`);
    if (!response.ok) {
      throw new Error(`Can't reach server — check the URL in Settings`);
    }
    const data = await response.json();
    cachedProfileList = data;
    lastCacheTime = now;
    return data;
  } catch (err) {
    throw new Error("Can't reach server — check the URL in Settings");
  }
}

// Fetch JIT full profile for active fill execution
async function fetchFullProfileJIT(profileId) {
  const { serverUrl } = await getSettings();
  if (!serverUrl || !serverUrl.trim()) {
    throw new Error("Can't reach server — check the URL in Settings");
  }

  const cleanServerUrl = serverUrl.replace(/\/+$/, '');
  try {
    const response = await fetch(`${cleanServerUrl}/extension/profiles/${profileId}`);
    if (!response.ok) {
      throw new Error('Failed to load candidate profile details from server');
    }
    const profileData = await response.json();
    return { profileData, serverUrl: cleanServerUrl };
  } catch (err) {
    throw new Error("Can't reach server — check the URL in Settings");
  }
}

// Helper to send message to active tab with programmatic script injection fallback if content script is not yet attached
async function sendMessageToTabWithFallback(tabId, message) {
  const attemptSend = () => new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });

  try {
    return await attemptSend();
  } catch (err) {
    console.log('[Smart Autofill Background] Connection error, attempting programmatic script injection:', err.message);

    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: [
          "content/engine/utils.js",
          "content/engine/heuristic.js",
          "content/adapters/greenhouse.js",
          "content/adapters/lever.js",
          "content/adapters/workday.js",
          "content/adapters/icims.js",
          "content/adapters/smartrecruiters.js",
          "content/adapters/ashby.js",
          "content/content.js"
        ]
      });

      // Small delay for content script listeners to settle
      await new Promise(r => setTimeout(r, 150));

      return await attemptSend();
    } catch (injErr) {
      throw new Error('Could not communicate with page content script. Please refresh the tab and try again.');
    }
  }
}

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PROFILES') {
    fetchProfileList()
      .then(profiles => sendResponse({ success: true, profiles }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'EXECUTE_AUTOFILL') {
    const { profileId } = message;

    (async () => {
      try {
        // 1. Fetch full profile just-in-time
        let { profileData, serverUrl } = await fetchFullProfileJIT(profileId);

        // 2. Query active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          throw new Error('No active browser tab found');
        }

        // 3. Send message to content script in active tab (with auto-injection fallback)
        const result = await sendMessageToTabWithFallback(tab.id, {
          type: 'START_AUTOFILL',
          profile: profileData,
          serverUrl
        });

        if (result && result.error) {
          throw new Error(result.error);
        }

        // 4. Wipe full candidate PII from service worker memory immediately!
        profileData = null;

        sendResponse({ success: true, stats: result ? result.stats : null });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  }
});
