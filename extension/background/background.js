// Extension Background Service Worker (Manifest V3 - Direct API URL Connection)

let cachedProfileList = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for profile list picker

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      serverUrl: 'http://localhost:8000',
      apiKey: 'ats_live_default_key_1234567890'
    }, (items) => {
      resolve(items);
    });
  });
}

// Fetch lightweight profile list for popup dropdown picker
async function fetchProfileList() {
  const { serverUrl, apiKey } = await getSettings();
  const now = Date.now();
  if (cachedProfileList && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedProfileList;
  }

  const cleanServerUrl = serverUrl.replace(/\/+$/, '');
  const response = await fetch(`${cleanServerUrl}/extension/profiles`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (response.status === 401) {
    throw new Error('401 Unauthorized: Invalid or missing API key. Please check extension Settings.');
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch profiles from ${cleanServerUrl}: ${response.statusText}`);
  }

  const data = await response.json();
  cachedProfileList = data;
  lastCacheTime = now;
  return data;
}

// Fetch JIT full profile for active fill execution
async function fetchFullProfileJIT(profileId) {
  const { serverUrl, apiKey } = await getSettings();
  const cleanServerUrl = serverUrl.replace(/\/+$/, '');
  const response = await fetch(`${cleanServerUrl}/extension/profiles/${profileId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (response.status === 401) {
    throw new Error('401 Unauthorized: Invalid or missing API key. Please check extension Settings.');
  }
  if (!response.ok) {
    throw new Error('Failed to load profile details from server');
  }

  const profileData = await response.json();
  return { profileData, serverUrl: cleanServerUrl, apiKey };
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
        let { profileData, serverUrl, apiKey } = await fetchFullProfileJIT(profileId);

        // 2. Query active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          throw new Error('No active browser tab found');
        }

        // 3. Send message to content script in active tab
        const result = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'START_AUTOFILL',
            profile: profileData,
            serverUrl,
            apiKey
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Could not communicate with page content script. Try refreshing the job page.'));
            } else if (response && response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });

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
