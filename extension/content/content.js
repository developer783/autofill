// Main Content Script Dispatcher & Part 4 Bidirectional Sync Engine (Case A & Case B)

(function () {
  console.log('[Smart Autofill] Content script initialized with Bidirectional Sync');

  let activeProfileId = null;
  let activeProfileSlug = '';
  let activeServerUrl = 'https://smart-autofill-api.onrender.com';
  let syncTimeoutMap = new Map();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_AUTOFILL') {
      const { profile, serverUrl } = message;

      activeProfileId = profile.id;
      activeProfileSlug = profile.profile_slug || 'active profile';
      activeServerUrl = serverUrl;

      (async () => {
        try {
          const currentUrl = window.location.href;
          let matchedAdapter = null;

          const allAdapters = [
            window.ATSGreenhouse,
            window.ATSLever,
            window.ATSWorkday,
            window.ATSiCIMS,
            window.ATSSmartRecruiters,
            window.ATSAshby
          ].filter(Boolean);

          for (const adapter of allAdapters) {
            if (adapter && typeof adapter.detect === 'function' && adapter.detect(currentUrl, document)) {
              matchedAdapter = adapter;
              break;
            }
          }

          let stats = null;
          if (matchedAdapter) {
            console.log(`[Smart Autofill] Executing Tier 1 Adapter: ${matchedAdapter.atsName}`);
            stats = await matchedAdapter.fill(profile, serverUrl);
          } else {
            console.log('[Smart Autofill] Executing Tier 2 Heuristic Fallback Engine...');
            stats = await window.ATSHeuristic.run(profile, serverUrl);
          }

          // Enable Part 4 Bidirectional Sync Listeners
          attachBidirectionalSyncListener();

          sendResponse({ success: true, stats });
        } catch (err) {
          console.error('[Smart Autofill] Execution error:', err);
          sendResponse({ success: false, error: err.message });
        }
      })();

      return true;
    }
  });

  // Part 4 Bidirectional Sync Listener (Case A & Case B)
  function attachBidirectionalSyncListener() {
    if (window._atsSyncListenerAttached) return;
    window._atsSyncListenerAttached = true;

    const handleInputSync = (e) => {
      const el = e.target;
      if (!el || !activeProfileId) return;
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') return;
      if (el.type === 'hidden' || el.type === 'password' || el.type === 'submit') return;

      const val = (el.value || '').trim();
      if (!val) return;

      // Case A: Recognized structured field tagged with data-ats-field-key
      const structuredKey = el.getAttribute('data-ats-field-key');
      if (structuredKey) {
        debounceSync(el, () => performCaseASync(structuredKey, val));
        return;
      }

      // Case B: Unrecognized field -> Learned Field Flow
      const labelText = window.ATSHelpers.getElementLabelText(el);
      if (labelText) {
        debounceSync(el, () => showLearnedToast(labelText, val));
      }
    };

    document.addEventListener('change', handleInputSync, true);
    document.addEventListener('blur', handleInputSync, true);
  }

  function debounceSync(element, callback) {
    if (syncTimeoutMap.has(element)) {
      clearTimeout(syncTimeoutMap.get(element));
    }
    const timer = setTimeout(() => {
      callback();
      syncTimeoutMap.delete(element);
    }, 400); // 400ms debounce
    syncTimeoutMap.set(element, timer);
  }

  // Case A: PATCH /extension/profiles/{id}/field (Single Structured Column Sync)
  async function performCaseASync(fieldKey, value) {
    try {
      const res = await fetch(`${activeServerUrl}/extension/profiles/${activeProfileId}/field`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field_key: fieldKey,
          value: value
        })
      });

      if (res.ok) {
        showInlineSyncNotification(`✓ Saved ${fieldKey} to ${activeProfileSlug}`);
      }
    } catch (e) {
      console.error('[Smart Autofill] Case A sync failed:', e);
    }
  }

  // Case B: POST /extension/profiles/{id}/learned-fields (Upsert Learned Fields)
  function showLearnedToast(labelText, fieldValue) {
    const existing = document.getElementById('ats-learned-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ats-learned-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #0d9488;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    toast.innerHTML = `
      <div style="font-weight: 700; color: #0d9488;">Save as Learned Field?</div>
      <div style="color: #475569;">"<strong>${escapeHtml(labelText)}</strong>": <em>${escapeHtml(fieldValue)}</em></div>
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button id="ats-toast-yes" style="background: #0d9488; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; flex: 1;">Save to ${escapeHtml(activeProfileSlug)}</button>
        <button id="ats-toast-no" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer;">Dismiss</button>
      </div>
    `;

    document.body.appendChild(toast);

    document.getElementById('ats-toast-no').onclick = () => toast.remove();
    document.getElementById('ats-toast-yes').onclick = async () => {
      toast.innerHTML = `<div style="color: #0d9488; font-weight: 600;">Saving to ${escapeHtml(activeProfileSlug)}...</div>`;
      try {
        const domain = window.location.hostname;
        const res = await fetch(`${activeServerUrl}/extension/profiles/${activeProfileId}/learned-fields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ats_domain: domain,
            field_label_text: labelText,
            field_value: fieldValue
          })
        });

        if (res.ok) {
          toast.innerHTML = `<div style="color: #166534; font-weight: 600;">✓ Saved to ${escapeHtml(activeProfileSlug)}!</div>`;
          setTimeout(() => toast.remove(), 2000);
        } else {
          toast.innerHTML = '<div style="color: #991b1b; font-weight: 600;">Failed to save.</div>';
          setTimeout(() => toast.remove(), 2000);
        }
      } catch (e) {
        toast.remove();
      }
    };
  }

  // Small Inline Notification Toast for Case A
  function showInlineSyncNotification(message) {
    const existing = document.getElementById('ats-inline-sync-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ats-inline-sync-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 999999;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 8px 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
})();
